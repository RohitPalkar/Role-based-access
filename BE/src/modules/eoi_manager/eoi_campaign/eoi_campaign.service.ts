import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { EoiCampaign } from './entities/eoi_campaign.entity';
import { CreateEoiCampaignDto } from './dto/create-eoi-campaign.dto';
import {
  CampaignDetailsDto,
  ListCampaignBankDetailsDto,
  ListCampaignsQueryDto,
} from './dto/campaign-list.dto';
import {
  VoucherFormType,
  CampaignStatusEnum,
  VoucherAmountType,
  UnitSourceType,
  EOITypeEnum,
  VoucherIdFieldNameEnum,
  EoiFormType,
} from 'src/enums/eoi-form.enums';
import { logger } from 'src/logger/logger';
import { formatDate } from 'src/utils';
import {
  BRAND_PURAVANKARA,
  DATE_FORMAT_DD_MM_YYYY,
  IST_TIME_ZONE,
  SUCCESS,
} from 'src/config/constants';
import {
  DevelopmentType,
  InventoryType,
  CityMaster,
  Brands,
  Users,
} from 'src/entities';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { endOfDay, startOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { updateEoiCampaignStatuses } from 'src/helpers/updateCampaignStatus.helper';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { CustomConfigService } from '../../../config/custom-config.service';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ComposeEmailEvent } from 'src/events/email.events';
import { VoucherForm } from '../../eoi_manager/voucher_forms/entities/voucher_form.entity';
import {
  calculatePaymentMetrics,
  computeIdToAssign,
  determineVoucherChronology,
  generateAndAssignTieredQueueId,
  resolveThresholds,
  shouldGenerateQueueId,
  allocateCampaignTierCounter,
} from 'src/helpers/eoi.helper';
import { VoucherFormsService } from '../../eoi_manager/voucher_forms/voucher_form.service';
import { generateUniqueReferenceId } from 'src/utils/generateRandomNumber';
import { RolesEnum } from 'src/enums/roles.enum';
import { EoiManagementService } from '../eoi_management/eoi_management.service';
import { safeNumber } from 'src/helpers/number-transform';
import { safeString } from 'src/helpers';

@Injectable()
export class EoiCampaignService {
  constructor(
    @InjectRepository(EoiCampaign)
    private readonly eoiCampaignRepository: Repository<EoiCampaign>,

    @InjectRepository(DevelopmentType)
    private readonly developmentTypeRepo: Repository<DevelopmentType>,

    @InjectRepository(InventoryType)
    private readonly inventoryTypeRepo: Repository<InventoryType>,

    @InjectRepository(VoucherForm)
    private readonly voucherFormRepository: Repository<VoucherForm>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,

    private readonly configService: CustomConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly voucherFormsService: VoucherFormsService,
    private readonly eoiManagementService: EoiManagementService,
  ) {}

  /**
   * True when `date` and “now” share the same calendar day in `Asia/Kolkata` (`IST_TIME_ZONE`).
   * Avoids UTC-vs-IST skew (e.g. `2026-03-30T18:30:00.000Z` is 31 Mar in India).
   */
  private isDateToday(date: Date | null | undefined): boolean {
    if (!date) return false;
    const now = new Date();
    return (
      formatInTimeZone(date, IST_TIME_ZONE, 'yyyy-MM-dd') ===
      formatInTimeZone(now, IST_TIME_ZONE, 'yyyy-MM-dd')
    );
  }

  /** Converts a nullable EOI type array into a Set for O(1) membership checks. */
  private normalizeEoiTypeSet(types?: EOITypeEnum[] | null): Set<EOITypeEnum> {
    return new Set(types || []);
  }

  /**
   * Determines which EOI tier IDs should be bulk-assigned as part of a phase launch.
   *
   * Called from two places:
   * 1. The daily cron (`backfillCase5ForLaunchingCampaigns`) — no baseline; returns all
   *    tiers whose eoiType is configured and eoiStartDate is today.
   * 2. The `updateCampaign` API — compares the saved campaign against the pre-update
   *    snapshot (`baselineForTierLaunch`) and returns only tiers that were newly enabled.
   *
   * @param campaign - The current (saved) campaign state
   * @param baselineForTierLaunch - Pre-update `phase` / `eoiType` only (omitted for cron path).
   *   Must be captured **before** `repository.merge`, because merge mutates the loaded entity.
   * @returns Array of tier field names (STD_EOI_ID / PRE_EOI_ID) to backfill
   */
  private getLaunchableTiersFromCampaign(
    campaign: EoiCampaign,
    baselineForTierLaunch?: Pick<EoiCampaign, 'phase' | 'eoiType'>,
  ): VoucherIdFieldNameEnum[] {
    // Only run on the day the EOI phase actually launches
    const launchDateIsToday = this.isDateToday(campaign.eoiStartDate);
    if (!launchDateIsToday || !campaign.phase?.includes(VoucherFormType.EOI)) {
      return [];
    }

    // Cron path: no baseline to diff against — return all configured EOI tiers
    if (!baselineForTierLaunch) {
      const all: VoucherIdFieldNameEnum[] = [];
      if (campaign.eoiType?.includes(EOITypeEnum.STANDARD)) {
        all.push(VoucherIdFieldNameEnum.STD_EOI_ID);
      }
      if (campaign.eoiType?.includes(EOITypeEnum.PREFERENTIAL)) {
        all.push(VoucherIdFieldNameEnum.PRE_EOI_ID);
      }
      return all;
    }

    // Update-campaign path: only return tiers that were just added
    const oldPhase = baselineForTierLaunch.phase || [];
    const newPhase = campaign.phase || [];
    const oldEoiTypeSet = this.normalizeEoiTypeSet(
      baselineForTierLaunch.eoiType,
    );
    const newEoiTypeSet = this.normalizeEoiTypeSet(campaign.eoiType);
    const eoiPhaseNewlyEnabled =
      !oldPhase.includes(VoucherFormType.EOI) &&
      newPhase.includes(VoucherFormType.EOI);

    const launchable: VoucherIdFieldNameEnum[] = [];
    // Standard is launchable if EOI phase was just enabled OR Standard type was just added
    if (
      (eoiPhaseNewlyEnabled || !oldEoiTypeSet.has(EOITypeEnum.STANDARD)) &&
      newEoiTypeSet.has(EOITypeEnum.STANDARD)
    ) {
      launchable.push(VoucherIdFieldNameEnum.STD_EOI_ID);
    }

    // Preferential is launchable if EOI phase was just enabled OR Preferential type was just added
    if (
      (eoiPhaseNewlyEnabled || !oldEoiTypeSet.has(EOITypeEnum.PREFERENTIAL)) &&
      newEoiTypeSet.has(EOITypeEnum.PREFERENTIAL)
    ) {
      launchable.push(VoucherIdFieldNameEnum.PRE_EOI_ID);
    }

    return launchable;
  }

  /**
   * Maps tier field names back to EOITypeEnum values so that `computeIdToAssign`
   * can filter by which EOI types are actually being launched in this event.
   */
  private getCampaignEoiTypesForBackfill(
    launchableTiers: VoucherIdFieldNameEnum[],
  ): EOITypeEnum[] {
    const types: EOITypeEnum[] = [];
    if (launchableTiers.includes(VoucherIdFieldNameEnum.STD_EOI_ID)) {
      types.push(EOITypeEnum.STANDARD);
    }
    if (launchableTiers.includes(VoucherIdFieldNameEnum.PRE_EOI_ID)) {
      types.push(EOITypeEnum.PREFERENTIAL);
    }
    return types;
  }

  /**
   * Scans every non-deleted voucher belonging to a campaign and assigns
   * the highest qualifying deferred tier ID to each eligible voucher.
   *
   * This implements "Case 5" — when an EOI phase (Standard / Preferential) goes
   * live, customers who already paid enough during the Voucher-only period get
   * their tier IDs auto-assigned in bulk.
   *
   * Flow:
   * 1. Convert launchable tiers to the corresponding EOITypeEnum set.
   * 2. Fetch all vouchers for the campaign (with payments loaded).
   * 3. For each voucher, delegate to `backfillSingleVoucher` which decides
   *    eligibility and assigns at most one tier ID (the highest qualifying one).
   *
   * @param campaign - The campaign whose EOI phase(s) just launched
   * @param launchableTiers - The specific tier(s) being launched today
   * @returns Count of vouchers scanned and actually updated
   */
  private async backfillDeferredTierIdsForCampaign(
    campaign: EoiCampaign,
    launchableTiers: VoucherIdFieldNameEnum[],
  ): Promise<{ scanned: number; updated: number }> {
    if (!launchableTiers.length) {
      return { scanned: 0, updated: 0 };
    }

    const campaignEoiTypes =
      this.getCampaignEoiTypesForBackfill(launchableTiers);

    // Load all vouchers with their payment history for metric calculation
    const vouchers = await this.voucherFormRepository.find({
      where: {
        campaign: { id: campaign.id },
        isDeleted: false,
      },
      relations: ['campaign', 'payments'],
    });

    let updated = 0;
    for (const voucher of vouchers) {
      const wasUpdated = await this.backfillSingleVoucher(
        campaign,
        voucher,
        launchableTiers,
        campaignEoiTypes,
      );
      if (wasUpdated) updated += 1;
    }

    return { scanned: vouchers.length, updated };
  }

  /**
   * Processes a single voucher during a phase-launch backfill (Case 5).
   *
   * Assigns the **single highest qualifying** tier ID to the voucher based on
   * its cumulative paid amount. Priority: Preferential > Standard — if both
   * phases launch on the same day and the customer paid enough for Preferential,
   * Standard is intentionally skipped.
   *
   * Step-by-step flow:
   * 1. Resolve EOI-phase thresholds (Standard/Preferential amounts) from the
   *    campaign config for this voucher's typology (BHK). These replace the
   *    stale Voucher-phase amountPayable sitting on the voucher record.
   * 2. Calculate raw payment metrics (validPaidAmount, verifiedAmount, etc.)
   *    from the voucher's payment history — passing 0 as amountPayable since
   *    the derived booleans will be recalculated later with the correct threshold.
   * 3. Early-exit if no valid payments exist (nothing to backfill).
   * 4. Use `computeIdToAssign` to determine the highest tier the customer
   *    qualifies for, scoped to only the EOI types being launched.
   * 5. Early-exit if the computed tier isn't part of the current launch event.
   * 6. Recalculate payment metrics using the assigned tier's EOI threshold so that
   *    `isFullyPaidForQueueId` and `isAllVerified` reflect the correct amount.
   * 7. Atomically allocate the next counter value using `allocateCampaignTierCounter`
   *    (MySQL `LAST_INSERT_ID()` trick) to prevent duplicate IDs under concurrency.
   * 8. Generate the human-readable tier ID (e.g., "PETE-0117") from the campaign
   *    initials and the allocated counter.
   * 9. Write the generated ID and issuance timestamp onto the voucher entity.
   * 10. Promote the voucher's `formPhase` from VOUCHER → EOI if still in Voucher phase.
   * 11. Update `paymentDetails.amountPayable` to the EOI tier threshold so that all
   *     downstream logic (payment status, finance verification, masking) uses the
   *     correct phase amount instead of the stale Voucher-phase value.
   * 12. Recalculate the voucher's chronology (ordering metadata).
   * 13. Fire-and-forget an email notifying the customer of the newly assigned ID.
   * 14. If the voucher qualifies for a queue ID (checked against EOI threshold),
   *     generate and assign it.
   * 15. Persist the updated voucher to the database.
   *
   * @param campaign - The campaign whose phase just launched
   * @param voucher - The individual voucher being evaluated
   * @param launchableTiers - Tier field names that are part of today's launch
   * @param campaignEoiTypes - Corresponding EOITypeEnum values for `computeIdToAssign`
   * @returns `true` if the voucher was modified and saved; `false` if skipped
   */
  private async backfillSingleVoucher(
    campaign: EoiCampaign,
    voucher: VoucherForm,
    launchableTiers: VoucherIdFieldNameEnum[],
    campaignEoiTypes: EOITypeEnum[],
  ): Promise<boolean> {
    // Step 1: Resolve the EOI-phase thresholds for this voucher's typology (BHK).
    // These are the actual Standard / Preferential amounts from the campaign config,
    // NOT the old voucher-phase amountPayable sitting on the voucher record.
    const thresholds = resolveThresholds(campaign, voucher);

    // Step 2: Aggregate payments to derive validPaidAmount.
    // Pass 0 as amountPayable: inside calculatePaymentMetrics that value sets isFullyPaid* and unverifiedAmount,
    // which must not use the voucher record’s Voucher-phase amountPayable (wrong target for EOI).
    // This pass only needs validPaidAmount for tier selection; Step 6 recomputes with eoiThreshold.
    const rawPaymentMetrics = calculatePaymentMetrics(
      voucher.payments || [],
      0,
    );

    // Step 3: Skip vouchers with no valid payments
    if (rawPaymentMetrics.validPaidAmount <= 0) return false;

    // Step 4: Determine the single highest qualifying tier using EOI thresholds
    const tierConfig = computeIdToAssign(
      thresholds,
      rawPaymentMetrics.validPaidAmount,
      {
        paidVoucherId: voucher.paidVoucherId || null,
        stdEoiId: voucher.stdEoiId || null,
        preEoiId: voucher.preEoiId || null,
      },
      [VoucherFormType.EOI],
      campaignEoiTypes,
    );

    // Step 5: Skip if no tier qualifies or the tier isn't part of this launch event
    if (!tierConfig || !launchableTiers.includes(tierConfig.tier)) return false;

    // Step 6: Recalculate queue-eligibility metrics using the correct EOI tier threshold.
    // The voucher's paymentDetails.amountPayable still reflects the Voucher phase,
    // so we must use the assigned tier's threshold for accurate fully-paid checks.
    const eoiThreshold = thresholds[tierConfig.thresholdKey] || 0;
    const paymentMetrics = calculatePaymentMetrics(
      voucher.payments || [],
      eoiThreshold,
    );

    // Step 7: Atomic counter allocation — safe under concurrent backfill/payment processing
    const nextCounter = await allocateCampaignTierCounter(
      this.eoiCampaignRepository,
      campaign.id,
      tierConfig.counterField as keyof EoiCampaign,
    );
    // Sync in-memory campaign object so subsequent vouchers see the latest counter
    (campaign as any)[tierConfig.counterField] = nextCounter;

    // Step 8: Generate human-readable ID (e.g., "PETE-0117")
    const generatedId = generateUniqueReferenceId(
      (campaign as any)[tierConfig.initialsField],
      nextCounter,
    );

    // Step 9: Write ID and issuance timestamp onto the voucher
    (voucher as any)[tierConfig.existingKey] = generatedId;
    (voucher as any)[tierConfig.issuedAtField] = new Date();

    // Step 10: Promote formPhase from VOUCHER → EOI
    if (voucher.formPhase === VoucherFormType.VOUCHER) {
      voucher.formPhase = VoucherFormType.EOI;
    }

    // Step 11: Update amountPayable to the EOI tier threshold so that all
    // downstream logic (payment status, finance verification, masking, etc.)
    // uses the correct phase amount instead of the stale Voucher-phase value.
    if (eoiThreshold > 0) {
      voucher.paymentDetails = {
        ...voucher.paymentDetails,
        amountPayable: eoiThreshold,
      };
    }

    // Step 12: Recalculate chronology based on the newly assigned tier
    voucher.chronology = determineVoucherChronology(voucher);

    // Step 13: Send ID assignment email (fire-and-forget; errors are logged, not thrown)
    this.voucherFormsService
      .sendQueueIdAssignmentEmail(voucher, generatedId)
      .catch((err) =>
        logger.error(
          `Failed to send ID assignment email for ${voucher.voucherId}`,
          err,
        ),
      );

    // Step 14: Generate queue ID if the voucher qualifies — now checked against
    // the EOI threshold (not the old Voucher-phase amount)
    if (shouldGenerateQueueId(voucher, paymentMetrics)) {
      await generateAndAssignTieredQueueId(
        voucher,
        tierConfig,
        (campaignId, queueType) =>
          this.voucherFormsService.generateQueueId(campaignId, queueType),
      );
    }

    // Step 15: Persist all changes to the database
    await this.voucherFormRepository.save(voucher);
    return true;
  }

  /**
   * Case 5 cron entry-point — runs daily to auto-assign deferred tier IDs
   * for campaigns whose EOI phase launches today.
   *
   * Scenario: A customer paid during the Voucher-only period but the Standard
   * or Preferential EOI phase wasn't live yet. Once the phase goes live
   * (eoiStartDate = today), this method scans all qualifying vouchers and
   * assigns the highest eligible tier ID in bulk.
   *
   * Flow:
   * 1. Find all campaigns whose `eoiStartDate` is today AND whose `phase`
   *    JSON column includes the EOI phase.
   * 2. For each campaign, compute which tiers are launchable today.
   * 3. Delegate to `backfillDeferredTierIdsForCampaign` which iterates
   *    every voucher and assigns the single highest qualifying tier ID.
   *
   * @returns Per-campaign report of vouchers scanned and updated
   */
  async backfillCase5ForLaunchingCampaigns(): Promise<
    Array<{ campaignId: number; scanned: number; updated: number }>
  > {
    // Step 1: Build today's date range in India — matches isDateToday / how eoi_start_date is stored (IST wall clock as UTC instant)
    const zonedNow = toZonedTime(new Date(), IST_TIME_ZONE);
    const start = fromZonedTime(startOfDay(zonedNow), IST_TIME_ZONE);
    const end = fromZonedTime(endOfDay(zonedNow), IST_TIME_ZONE);

    // Step 2: Query campaigns launching their EOI phase today
    const campaigns = await this.eoiCampaignRepository
      .createQueryBuilder('campaign')
      .where('campaign.eoi_start_date BETWEEN :start AND :end', { start, end })
      .andWhere('JSON_CONTAINS(campaign.phase, :eoiPhaseJson)', {
        eoiPhaseJson: JSON.stringify(VoucherFormType.EOI),
      })
      .getMany();

    // Step 3: Process each campaign — determine launchable tiers and backfill
    const results: Array<{
      campaignId: number;
      scanned: number;
      updated: number;
    }> = [];
    for (const campaign of campaigns) {
      const launchableTiers = this.getLaunchableTiersFromCampaign(campaign);
      if (!launchableTiers.length) continue;
      const outcome = await this.backfillDeferredTierIdsForCampaign(
        campaign,
        launchableTiers,
      );
      results.push({
        campaignId: campaign.id,
        scanned: outcome.scanned,
        updated: outcome.updated,
      });
    }
    return results;
  }

  /**
   * Helper to validate campaign dates
   */
  private validateCampaignDates(
    phase: VoucherFormType[],
    voucherStartDate?: string,
    voucherEndDate?: string,
    eoiStartDate?: string,
    eoiEndDate?: string,
  ): void {
    let startDate: Date;
    let endDate: Date;
    // Validate voucher dates only if phase includes VOUCHER
    if (
      phase?.includes(VoucherFormType.VOUCHER) &&
      voucherStartDate &&
      voucherEndDate
    ) {
      startDate = new Date(voucherStartDate);
      endDate = new Date(voucherEndDate);
      if (endDate <= startDate) {
        throw new BadRequestException(
          'Voucher end date must be after Voucher start date',
        );
      }
    }

    // Validate EOI dates if phase includes EOI
    if (phase?.includes(VoucherFormType.EOI) && eoiStartDate && eoiEndDate) {
      startDate = new Date(eoiStartDate);
      endDate = new Date(eoiEndDate);
      if (endDate <= startDate) {
        throw new BadRequestException(
          'EOI end date must be after EOI start date',
        );
      }
    }
  }

  /**
   * Helper to check if a campaign with given field value already exists
   */
  private async checkFieldUniqueness(
    field: string,
    value: string,
    errorMessage: string,
    excludeId?: number,
  ): Promise<void> {
    const whereClause: any = { [field]: value };
    if (excludeId) {
      whereClause.id = Not(excludeId);
    }

    const existingCampaign = await this.eoiCampaignRepository.findOne({
      where: whereClause,
    });

    if (existingCampaign) {
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Helper to check campaign uniqueness for initials
   */
  private async checkInitialsUniqueness(
    phase: VoucherFormType[],
    voucherIdInitials: string,
    stdEoiInitials: string | undefined,
    preEoiInitials: string | undefined,
    eoiType: EOITypeEnum[] | undefined,
    excludeId?: number,
  ): Promise<void> {
    // Check voucherIdInitials for VOUCHER phase
    if (phase?.includes(VoucherFormType.VOUCHER) && voucherIdInitials) {
      await this.checkFieldUniqueness(
        'voucherIdInitials',
        voucherIdInitials,
        `campaign with voucher id initials "${voucherIdInitials}" already exists`,
        excludeId,
      );
    }

    // Check stdEoiInitials for EOI phase when Standard type is included
    if (
      phase?.includes(VoucherFormType.EOI) &&
      eoiType?.includes(EOITypeEnum.STANDARD) &&
      stdEoiInitials
    ) {
      await this.checkFieldUniqueness(
        'stdEoiInitials',
        stdEoiInitials,
        `campaign with standard EOI initials "${stdEoiInitials}" already exists`,
        excludeId,
      );
    }

    // Check preEoiInitials for EOI phase when Preferential type is included
    if (
      phase?.includes(VoucherFormType.EOI) &&
      eoiType?.includes(EOITypeEnum.PREFERENTIAL) &&
      preEoiInitials
    ) {
      await this.checkFieldUniqueness(
        'preEoiInitials',
        preEoiInitials,
        `campaign with preferential EOI initials "${preEoiInitials}" already exists`,
        excludeId,
      );
    }
  }

  /**
   * Helper to check campaign uniqueness
   */
  private async validateCampaignUniqueness(
    campaignName: string,
    voucherIdInitials: string,
    phase: VoucherFormType[],
    stdEoiInitials?: string,
    preEoiInitials?: string,
    eoiType?: EOITypeEnum[],
  ): Promise<void> {
    const existingCampaign = await this.eoiCampaignRepository.findOne({
      where: { campaignName },
    });

    if (existingCampaign) {
      throw new BadRequestException(
        `campaign with name "${campaignName}" already exists`,
      );
    }

    await this.checkInitialsUniqueness(
      phase,
      voucherIdInitials,
      stdEoiInitials,
      preEoiInitials,
      eoiType,
    );
  }

  private async validateCampaignUniquenessWhileUpdate(
    campaignName: string,
    voucherIdInitials: string,
    id: number,
    phase: VoucherFormType[],
    stdEoiInitials?: string,
    preEoiInitials?: string,
    eoiType?: EOITypeEnum[],
  ): Promise<void> {
    const existingCampaign = await this.eoiCampaignRepository.findOne({
      where: { campaignName, id: Not(id) },
    });

    if (existingCampaign) {
      throw new BadRequestException(
        `campaign with name "${campaignName}" already exists`,
      );
    }

    await this.checkInitialsUniqueness(
      phase,
      voucherIdInitials,
      stdEoiInitials,
      preEoiInitials,
      eoiType,
      id,
    );
  }

  /**
   * Helper to build campaign data based on phase
   */
  private buildCampaignData(
    dto: CreateEoiCampaignDto,
    existingCampaign?: EoiCampaign,
  ): any {
    const campaignData = this.buildBaseCampaignData(dto, existingCampaign);

    const { phase } = dto;

    this.applyVoucherPhaseData(phase, dto, campaignData);
    this.applyEoiPhaseData(phase, dto, campaignData);
    this.applyStatusFromPhase(phase, campaignData);
    this.applyAmountsFromTypes(dto, campaignData);
    this.applyInventoryMappingAndTypes(dto, campaignData);
    this.applyUnitBlockingConfig(dto, campaignData);

    return campaignData;
  }

  /**
   * Apply voucher-phase-specific fields to campaign data
   */
  private applyVoucherPhaseData(
    phase: VoucherFormType[] | undefined,
    dto: CreateEoiCampaignDto,
    campaignData: any,
  ): void {
    if (!phase?.includes(VoucherFormType.VOUCHER)) {
      return;
    }

    const {
      voucherFormType,
      voucherTermsAndCondition,
      voucherStartDate,
      voucherEndDate,
    } = dto;

    campaignData.voucherFormType = voucherFormType;
    campaignData.voucherTermsAndCondition = voucherTermsAndCondition || null;
    campaignData.voucherStartDate = voucherStartDate
      ? startOfDay(voucherStartDate)
      : null;
    campaignData.voucherEndDate = voucherEndDate
      ? endOfDay(voucherEndDate)
      : null;
  }

  /**
   * Apply EOI-phase-specific fields to campaign data
   */
  private applyEoiPhaseData(
    phase: VoucherFormType[] | undefined,
    dto: CreateEoiCampaignDto,
    campaignData: any,
  ): void {
    if (!phase?.includes(VoucherFormType.EOI)) {
      return;
    }

    const {
      eoiFormType,
      eoiTermsAndCondition,
      eoiStartDate,
      eoiEndDate,
      eoiType,
    } = dto;

    campaignData.eoiFormType = eoiFormType;
    campaignData.eoiTermsAndCondition = eoiTermsAndCondition || null;
    campaignData.eoiStartDate = eoiStartDate ? startOfDay(eoiStartDate) : null;
    campaignData.eoiEndDate = eoiEndDate ? endOfDay(eoiEndDate) : null;
    campaignData.eoiType = eoiType || null;
  }

  /**
   * Set status based purely on the phase array
   */
  private applyStatusFromPhase(
    phase: VoucherFormType[] | undefined,
    campaignData: any,
  ): void {
    if (
      phase?.length === 2 &&
      phase.includes(VoucherFormType.VOUCHER) &&
      phase.includes(VoucherFormType.EOI)
    ) {
      campaignData.status = CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI;
      return;
    }

    if (phase?.includes(VoucherFormType.VOUCHER)) {
      campaignData.status = CampaignStatusEnum.ACTIVE_VOUCHER;
      return;
    }

    if (phase?.includes(VoucherFormType.EOI)) {
      campaignData.status = CampaignStatusEnum.ACTIVE_EOI;
    }
  }

  /**
   * Set amounts based on their respective amount types.
   * If BHK Wise, amounts will be calculated from inventoryDetails later.
   * Otherwise (FIXED or undefined), set amounts from DTO.
   */
  private applyAmountsFromTypes(
    dto: CreateEoiCampaignDto,
    campaignData: any,
  ): void {
    const {
      voucherAmountType,
      stdEoiAmountType,
      preEoiAmountType,
      voucherAmount,
      stdEoiAmount,
      preEoiAmount,
    } = dto;

    if (voucherAmountType !== VoucherAmountType.BHK_WISE) {
      campaignData.voucherAmount = voucherAmount || null;
    }
    if (stdEoiAmountType !== VoucherAmountType.BHK_WISE) {
      campaignData.stdEoiAmount = stdEoiAmount || null;
    }
    if (preEoiAmountType !== VoucherAmountType.BHK_WISE) {
      campaignData.preEoiAmount = preEoiAmount || null;
    }
  }

  private applyUnitBlockingConfig(
    dto: CreateEoiCampaignDto,
    campaignData: any,
  ): void {
    const {
      thresholdAmount,
      unitBlockDuration,
      timerExtension,
      approvalWindowHours,
      unitApproverId,
      additionalApprovers,
      displayUnitType,
    } = dto;
    if (thresholdAmount !== undefined) {
      campaignData.thresholdAmount = thresholdAmount;
    }

    if (unitBlockDuration !== undefined) {
      campaignData.unitBlockDuration = unitBlockDuration;
    }

    if (timerExtension !== undefined) {
      campaignData.timerExtension = timerExtension;
    }

    if (approvalWindowHours !== undefined) {
      campaignData.approvalWindowHours = approvalWindowHours;
    }

    if (unitApproverId !== undefined) {
      campaignData.unitApproverId = unitApproverId
        ? { id: unitApproverId }
        : null;
    }

    if (additionalApprovers !== undefined) {
      campaignData.additionalApprovers = additionalApprovers;
    }
    if (displayUnitType !== undefined) {
      campaignData.displayUnitType = displayUnitType;
    }
  }

  /**
   * Apply inventory mapping and amount type fields
   */
  private applyInventoryMappingAndTypes(
    dto: CreateEoiCampaignDto,
    campaignData: any,
  ): void {
    const {
      unitPrefStaticContent,
      isInventoryMapped,
      unitSourceType,
      voucherAmountType,
      stdEoiAmountType,
      preEoiAmountType,
    } = dto;

    campaignData.unitPrefStaticContent = unitPrefStaticContent || null;
    campaignData.isInventoryMapped = isInventoryMapped;
    campaignData.unitSourceType = isInventoryMapped
      ? unitSourceType
      : UnitSourceType.SFDC;

    campaignData.voucherAmountType = voucherAmountType || null;
    campaignData.stdEoiAmountType = stdEoiAmountType || null;
    campaignData.preEoiAmountType = preEoiAmountType || null;
  }

  private validateCounterUpdate(
    existingInitials: string,
    newInitials: string | undefined,
    existingCounter: number,
    newCounter: number | undefined,
    errorMessage: string,
  ) {
    const isInitialsUnchanged = existingInitials === newInitials;
    const isCounterDecreased =
      newCounter !== undefined && newCounter < existingCounter;

    if (isInitialsUnchanged && isCounterDecreased) {
      throw new BadRequestException(errorMessage);
    }
  }

  private buildBaseCampaignData(
    dto: CreateEoiCampaignDto,
    existingCampaign?: EoiCampaign,
  ): any {
    const {
      campaignName,
      enquiryInitials,
      phase,
      brandId,
      pushToSfdc = false,
      sfdcProjectName,
      indicativeBasePrice,
      accountDetails,
      queueAfterVerified,
      enquiryCounter,
      displayQueueId,
      voucherIdInitials,
      voucherIdCounter,
      stdEoiInitials,
      stdEoiCounter,
      preEoiInitials,
      preEoiCounter,
      stage,
      enableEOIsAllRms,
      availableGateways,
      projectId,
      showAgreementValue,
      venueName,
      venueMapLink,
      agreementDocLink,
    } = dto;

    // Validate counter update rules
    if (existingCampaign) {
      // Enquiry
      this.validateCounterUpdate(
        existingCampaign.enquiryInitials,
        enquiryInitials,
        existingCampaign.enquiryCounter,
        enquiryCounter,
        'Updated Payment ref Id series starting value cannot be less than the existing series starting value',
      );

      // Voucher
      this.validateCounterUpdate(
        existingCampaign.voucherIdInitials,
        voucherIdInitials,
        existingCampaign.voucherIdCounter,
        voucherIdCounter,
        'Updated Voucher Id series starting value cannot be less than the existing series starting value',
      );

      //  Standard EOI
      this.validateCounterUpdate(
        existingCampaign.stdEoiInitials,
        stdEoiInitials,
        existingCampaign.stdEoiCounter,
        stdEoiCounter,
        'Updated Standard EOI Id series starting value cannot be less than the existing series starting value',
      );

      // Preferential EOI
      this.validateCounterUpdate(
        existingCampaign.preEoiInitials,
        preEoiInitials,
        existingCampaign.preEoiCounter,
        preEoiCounter,
        'Updated Preferential EOI Id series starting value cannot be less than the existing series starting value',
      );
    }

    return {
      campaignName,
      enquiryInitials,
      vqiCounter: safeNumber(existingCampaign?.vqiCounter, 0),
      stdCounter: safeNumber(existingCampaign?.stdCounter, 0),
      preCounter: safeNumber(existingCampaign?.preCounter, 0),
      enquiryCounter,
      phase,
      stage: safeString(stage, null),
      brand: { id: brandId },
      pushToSfdc,
      sfdcProjectName: safeString(sfdcProjectName, null),
      accountDetails: accountDetails || null,
      indicativeBasePrice,
      queueAfterVerified,
      displayQueueId,
      voucherIdInitials:
        voucherIdInitials ?? existingCampaign?.voucherIdInitials,
      voucherIdCounter: voucherIdCounter ?? existingCampaign?.voucherIdCounter,
      stdEoiInitials: stdEoiInitials ?? existingCampaign?.stdEoiInitials,
      stdEoiCounter: stdEoiCounter ?? existingCampaign?.stdEoiCounter,
      preEoiInitials: preEoiInitials ?? existingCampaign?.preEoiInitials,
      preEoiCounter: preEoiCounter ?? existingCampaign?.preEoiCounter,
      enableEOIsAllRms:
        enableEOIsAllRms ?? existingCampaign?.enableEOIsAllRms ?? false,
      availableGateways,
      project: projectId ? { id: projectId } : existingCampaign?.project,
      showAgreementValue:
        showAgreementValue ?? existingCampaign?.showAgreementValue ?? false,
      venueName: safeString(venueName, null),
      venueMapLink: safeString(venueMapLink, null),
      agreementDocLink: safeString(agreementDocLink, null),

      ...this.buildCampaignGatewayData(dto),
    };
  }

  private buildCampaignGatewayData(dto: CreateEoiCampaignDto): {
    easebuzzKey: string | false | undefined;
    easebuzzSalt: string | false | undefined;
    subMerchantId: string | false | undefined;
    razorpayKey: string | false | undefined;
    razorpaySecret: string | false | undefined;
  } {
    const {
      easebuzzKey,
      easebuzzSalt,
      subMerchantId,
      razorpayKey,
      razorpaySecret,
    } = dto;

    return {
      easebuzzKey: easebuzzKey && this.configService.encryptData(easebuzzKey),

      easebuzzSalt:
        easebuzzSalt && this.configService.encryptData(easebuzzSalt),

      subMerchantId:
        subMerchantId && this.configService.encryptData(subMerchantId),

      razorpayKey: razorpayKey && this.configService.encryptData(razorpayKey),

      razorpaySecret:
        razorpaySecret && this.configService.encryptData(razorpaySecret),
    };
  }

  /**
   * Function to create a new EOI campaign with configurable parameters.
   * Validates campaign dates, ensures unique campaign names and enquiry initials.
   * Supports both VOUCHER and EOI phases with conditional field requirements.
   *
   * @param createEoiCampaignDto - DTO containing campaign creation parameters
   * @returns Success response with the newly created campaign
   */
  async createEoiCampaign(
    createEoiCampaignDto: CreateEoiCampaignDto,
  ): Promise<any> {
    try {
      const { campaignName, voucherIdInitials, cityIds } = createEoiCampaignDto;

      // Validate dates
      this.validateCampaignDates(
        createEoiCampaignDto.phase,
        createEoiCampaignDto.voucherStartDate,
        createEoiCampaignDto.voucherEndDate,
        createEoiCampaignDto.eoiStartDate,
        createEoiCampaignDto.eoiEndDate,
      );

      // Check uniqueness
      await this.validateCampaignUniqueness(
        campaignName,
        voucherIdInitials,
        createEoiCampaignDto.phase,
        createEoiCampaignDto.stdEoiInitials,
        createEoiCampaignDto.preEoiInitials,
        createEoiCampaignDto.eoiType,
      );

      // Build campaign data
      const campaignData = this.buildCampaignData(createEoiCampaignDto);

      if (createEoiCampaignDto.inventoryDetails?.length > 0) {
        const { mappedInventoryDetails } = this.processInventoryDetails(
          createEoiCampaignDto.inventoryDetails,
          createEoiCampaignDto.voucherAmountType,
          createEoiCampaignDto.stdEoiAmountType,
          createEoiCampaignDto.preEoiAmountType,
        );
        campaignData.inventoryDetails = mappedInventoryDetails;

        this.nullifyFixedAmountsWhenBhkWise(createEoiCampaignDto, campaignData);
      }

      // Handle ManyToMany relationships
      if (cityIds && cityIds.length > 0) {
        campaignData.cities = cityIds.map((id) => ({ id }) as any);
      }

      if (
        createEoiCampaignDto.developmentTypeIds &&
        createEoiCampaignDto.developmentTypeIds?.length > 0
      ) {
        campaignData.developmentTypes =
          createEoiCampaignDto.developmentTypeIds.map((id) => ({ id }) as any);
      }

      if (
        createEoiCampaignDto.inventoryTypeIds &&
        createEoiCampaignDto.inventoryTypeIds?.length > 0
      ) {
        campaignData.inventoryTypes = createEoiCampaignDto.inventoryTypeIds.map(
          (id) => ({ id }) as any,
        );
      }

      const campaign = this.eoiCampaignRepository.create(campaignData);
      const savedCampaign = await this.eoiCampaignRepository.save(campaign);

      return {
        success: true,
        message: 'EOI Campaign created successfully',
        data: savedCampaign,
      };
    } catch (error) {
      logger.error('Error creating EOI campaign:', error);
      throw error;
    }
  }

  /**
   * Function to retrieve a master list of EOI campaigns for dropdown selection.
   * Returns only essential campaign information (ID and name) sorted alphabetically.
   *
   * @returns List of campaigns with ID and name for dropdown population
   */
  async getEoiCampaignsMaster(
    user: any,
    showAll: boolean = false,
    showBuddyCampaigns: boolean = false,
  ): Promise<any> {
    try {
      await updateEoiCampaignStatuses(this.eoiCampaignRepository);
      const activeStatuses = [
        CampaignStatusEnum.ACTIVE_VOUCHER,
        CampaignStatusEnum.ACTIVE_EOI,
        CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI,
      ];

      const findOptions: any = {
        select: ['id', 'campaignName', 'sfdcProjectName', 'createdAt'],
        order: { createdAt: 'DESC' },
      };

      // Only apply status filter if showAll is false
      if (!showAll) {
        findOptions.where = { status: In(activeStatuses) };
      }

      if (
        showBuddyCampaigns &&
        [RolesEnum.SALES_TL, RolesEnum.PROJECT_HEAD].includes(user?.role)
      ) {
        const buddyCampaignIds =
          await this.eoiManagementService.getBuddyRMCampaignIds(user.dbId);

        if (!buddyCampaignIds.length) {
          return {
            statusCode: SUCCESS,
            message: 'EOI campaigns retrieved successfully',
            data: [],
          };
        }

        findOptions.where.id = In(buddyCampaignIds);
      }

      const campaigns = await this.eoiCampaignRepository.find(findOptions);

      return {
        statusCode: SUCCESS,
        message: 'EOI campaigns retrieved successfully',
        data: campaigns,
      };
    } catch (error) {
      logger.error('Error retrieving EOI campaigns for dropdown:', error);
      throw new InternalServerErrorException('Failed to fetch EOI campaigns');
    }
  }

  /**
   * Function to retrieve a paginated list of campaigns with filtering capabilities.
   * Supports filtering by campaign name and city IDs.
   * Includes city names, phase label, date ranges, and voucher collection counts.
   *
   * @param q - Query DTO containing search, cityIds, page, and limit
   * @returns Paginated list of campaigns with metadata
   */
  async listCampaigns(q: ListCampaignsQueryDto) {
    try {
      await updateEoiCampaignStatuses(this.eoiCampaignRepository);

      const { search, cityIds = [], status = [], page = 1, limit = 10 } = q;
      const offset = (page - 1) * limit;

      const base = this.eoiCampaignRepository.createQueryBuilder('c');

      if (search?.trim()) {
        base.andWhere('c.campaign_name LIKE :search', {
          search: `%${search.trim()}%`,
        });
      }
      if (status.length > 0) {
        base.andWhere('c.status IN (:...status)', { status });
      }
      if (cityIds.length > 0) {
        base.andWhere(
          `EXISTS (
          SELECT 1
          FROM eoi_campaign_cities cc
          WHERE cc.campaign_id = c.id
            AND cc.city_id IN (:...cityIds)
        )`,
          { cityIds },
        );
      }

      // 1) ROWS query (with scalar subqueries; no GROUP BY)
      const rowsQb = base
        .clone()
        .select([
          'c.id AS id',
          'c.campaign_name AS campaignName',
          'c.status AS status',
          'c.voucher_start_date AS voucherStartDate',
          'c.voucher_end_date AS voucherEndDate',
          'c.eoi_start_date AS eoiStartDate',
          'c.eoi_end_date AS eoiEndDate',
          'c.phase AS phase',
          'c.push_to_sfdc AS pushToSfdc',
          'c.sfdc_project_name AS sfdcProjectName',
          'c.enable_eois_all_rms AS enableEOIsAllRms',
        ])

        .addSelect(
          `(SELECT GROUP_CONCAT(DISTINCT cm.name ORDER BY cm.name SEPARATOR ', ')
        FROM eoi_campaign_cities cc2
        JOIN city_master cm ON cm.id = cc2.city_id
        WHERE cc2.campaign_id = c.id)`,
          'cityNames',
        )
        .addSelect(
          `(SELECT COUNT(1) FROM vouchers v WHERE v.campaign_id = c.id AND v.is_deleted = false)`,
          'countCollected',
        )
        .orderBy('c.created_at', 'DESC')
        .addOrderBy('c.id', 'DESC')
        .offset(offset)
        .limit(limit);

      const rows = await rowsQb.getRawMany<{
        id: number;
        campaignName: string;
        status: string;
        cityNames: string | null;
        phase: string;
        pushToSfdc: boolean;
        sfdcProjectName: string;
        voucherStartDate: Date | null;
        voucherEndDate: Date | null;
        countCollected: string | number;
        eoiStartDate: Date | null;
        eoiEndDate: Date | null;
        enableEOIsAllRms: boolean;
      }>();

      // 2) TOTAL query (same filters, COUNT only)
      const total = await base
        .clone()
        .select('COUNT(DISTINCT c.id)', 'cnt')
        .getRawOne<{ cnt: string }>()
        .then((r) => Number(r?.cnt ?? 0));

      const items = rows.map((r) => {
        const now = new Date();

        const hasEoiDates = r.eoiStartDate && r.eoiEndDate;
        const hasVoucherDates = r.voucherStartDate && r.voucherEndDate;
        const isVoucherStillActive =
          hasVoucherDates && new Date(r.voucherEndDate) >= now;

        let startDate: Date | null = null;
        let endDate: Date | null = null;

        // 1) If EOI dates exist and voucher is still active → use voucher dates
        // 2) Else if EOI dates exist → use EOI dates
        // 3) Else (no EOI)
        if (hasEoiDates) {
          if (isVoucherStillActive) {
            startDate = r.voucherStartDate;
            endDate = r.voucherEndDate;
          } else {
            startDate = r.eoiStartDate;
            endDate = r.eoiEndDate;
          }
        } else if (hasVoucherDates) {
          startDate = r.voucherStartDate;
          endDate = r.voucherEndDate;
        }

        const phaseLabel = r.phase;

        return {
          id: r.id,
          campaignName: r.campaignName,
          status: r.status,
          city: r.cityNames ?? '',
          pushToSfdc: !!r.pushToSfdc,
          sfdcProjectName: r.sfdcProjectName ?? '',
          phaseLabel,
          countCollected:
            typeof r.countCollected === 'string'
              ? Number.parseInt(r.countCollected, 10)
              : Number(r.countCollected || 0),
          startDate: startDate
            ? formatDate(
                new Date(startDate).toISOString(),
                DATE_FORMAT_DD_MM_YYYY,
              )
            : null,
          endDate: endDate
            ? formatDate(
                endDate.toLocaleDateString('en-GB'),
                DATE_FORMAT_DD_MM_YYYY,
              )
            : null,
          enableEOIsAllRms: !!r.enableEOIsAllRms,
        };
      });

      return {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: items,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch campaigns', error);
      logsAndErrorHandling('eoiCampaignService - listCampaigns', error, {
        q,
      });
    }
  }

  async getAllDevelopmentTypes() {
    const cacheKey = 'all-development-types';

    const cachedData = await this.cacheService.get<any[]>(cacheKey);
    if (cachedData) {
      return {
        message: 'Development types fetched successfully.',
        data: cachedData,
      };
    }

    const result = await this.developmentTypeRepo.find({
      where: { isDeleted: false },
      order: { name: 'ASC' },
      select: ['id', 'name'],
    });

    // Store in cache for 2 weeks
    if (result && result.length > 0) {
      await this.cacheService.set(cacheKey, result, 14 * 24 * 60 * 60 * 1000);
    }

    return {
      message: 'Development types fetched successfully.',
      data: result,
    };
  }

  private parseIds(departmentIds: string | undefined | null): number[] {
    if (!departmentIds) return [];
    return Array.from(
      new Set(
        departmentIds
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ).sort((a, b) => a - b);
  }

  private async getDevTypesCached(): Promise<
    Array<{ id: number; name: string }>
  > {
    let devTypes = await this.cacheService.get<
      Array<{ id: number; name: string }>
    >('all-development-types');

    if (!devTypes) {
      devTypes = await this.developmentTypeRepo.find({
        where: { isDeleted: false },
        order: { name: 'ASC' },
        select: ['id', 'name'],
      });
      await this.cacheService.set(
        'all-development-types',
        devTypes,
        14 * 24 * 60 * 60 * 1000,
      );
    }
    return devTypes;
  }

  private validateIdsAgainstDevTypes(
    ids: number[],
    devTypes: Array<{ id: number }>,
  ): void {
    const validSet = new Set(devTypes.map((d) => d.id));
    const invalid = ids.filter((id) => !validSet.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        `Invalid departmentIds: ${invalid.join(', ')}`,
      );
    }
  }

  private groupInventoriesByDept(inventories: any[]): any[] {
    const groupedMap = new Map<number, any>();

    for (const inv of inventories) {
      const devs = inv.developmentTypes ?? [];
      for (const dev of devs) {
        const existing = groupedMap.get(dev.id);
        if (existing) {
          existing.inventories.push({ id: inv.id, name: inv.name });
        } else {
          groupedMap.set(dev.id, {
            departmentId: dev.id,
            departmentName: dev.name,
            inventories: [{ id: inv.id, name: inv.name }],
          });
        }
      }
    }

    for (const g of groupedMap.values()) {
      g.inventories.sort((a, b) => a.name.localeCompare(b.name));
    }
    return Array.from(groupedMap.values());
  }

  private async fetchInventoriesByIds(ids: number[]): Promise<any> {
    return this.inventoryTypeRepo
      .createQueryBuilder('inventory')
      .innerJoinAndSelect('inventory.developmentTypes', 'dev')
      .where('dev.id IN (:...ids)', { ids })
      .andWhere('inventory.isDeleted = false')
      .orderBy('dev.name', 'ASC')
      .addOrderBy('inventory.name', 'ASC')
      .getMany();
  }
  private async fetchAllInventories(): Promise<any[]> {
    return this.inventoryTypeRepo.find({
      where: { isDeleted: false },
      relations: ['developmentTypes'],
      order: { name: 'ASC' },
    });
  }

  async getInventories(departmentIds: string) {
    const ids = this.parseIds(departmentIds);
    const hasParam = Boolean(departmentIds);

    if (hasParam) {
      if (ids.length === 0) {
        throw new BadRequestException(
          'Invalid departmentIds. Provide comma-separated positive integers.',
        );
      }

      const devTypes = await this.getDevTypesCached();
      this.validateIdsAgainstDevTypes(ids, devTypes);

      const key = `inventories:deptcombo:${ids.join(',')}`;
      const cachedCombo = await this.cacheService.get<[]>(key);
      if (cachedCombo) {
        return {
          message: 'Inventories fetched successfully.',
          data: cachedCombo,
        };
      }

      const inventories = await this.fetchInventoriesByIds(ids);
      const grouped = this.groupInventoriesByDept(inventories);

      await this.cacheService.set(key, grouped, 14 * 24 * 60 * 60 * 1000);
      return {
        message: 'Inventories fetched successfully.',
        data: grouped ?? [],
      };
    }

    // No param: use "all" cache, else DB and group
    const cachedAll = await this.cacheService.get<[]>('inventories:all-active');
    if (cachedAll) {
      return { message: 'Inventories fetched successfully.', data: cachedAll };
    }

    const inventories = await this.fetchAllInventories();
    const grouped = this.groupInventoriesByDept(inventories);

    await this.cacheService.set(
      'inventories:all-active',
      grouped,
      14 * 24 * 60 * 60 * 1000,
    );
    return {
      message: 'Inventories fetched successfully.',
      data: grouped ?? [],
    };
  }

  private brief<T extends { id: number; name: string }>(
    list?: T[],
  ): Array<{ id: number; name: string }> {
    return list?.map(({ id, name }) => ({ id, name })) ?? [];
  }

  private brandBrief(
    brand?: Brands | null,
  ): { id: number; name: string } | null {
    return brand ? { id: brand.id, name: brand.name } : null;
  }

  private briefOne<T extends { id: number; name: string }>(
    obj?: T | null,
  ): { id: number; name: string } | null {
    return obj ? { id: obj.id, name: obj.name } : null;
  }

  private safeParse<T>(value: unknown): T | null {
    if (value == null) return null;
    if (typeof value === 'object') return value as T;
    try {
      if (typeof value === 'string') return JSON.parse(value) as T;
      return value as T;
    } catch {
      return null;
    }
  }

  private toInventoryDetails(raw: unknown): Array<{
    type: string;
    minSBA?: number;
    maxSBA?: number;
    minPrice?: number;
    maxPrice?: number;
    voucherAmt?: number;
    standardEOIAmt?: number;
    preferentialEOIAmt?: number;
  }> | null {
    type InventoryDetailRaw = {
      type: string;
      minSBA?: number | string;
      maxSBA?: number | string;
      minPrice?: number | string;
      maxPrice?: number | string;
      voucherAmt?: number | string;
      standardEOIAmt?: number | string;
      preferentialEOIAmt?: number | string;
    };

    const parsed =
      this.safeParse<InventoryDetailRaw[]>(raw) ??
      (raw as InventoryDetailRaw[] | null) ??
      null;

    if (!parsed) {
      return null;
    }

    const mapped = parsed.map((d) => ({
      type: d.type,
      minSBA: this.convertToNumberOrNull(d.minSBA),
      maxSBA: this.convertToNumberOrNull(d.maxSBA),
      minPrice: this.convertToNumberOrNull(d.minPrice),
      maxPrice: this.convertToNumberOrNull(d.maxPrice),
      voucherAmt: this.convertToNumberOrNull(d.voucherAmt),
      standardEOIAmt: this.convertToNumberOrNull(d.standardEOIAmt),
      preferentialEOIAmt: this.convertToNumberOrNull(d.preferentialEOIAmt),
    }));

    // Sort by type: extract numeric value from type string (e.g., "2 BHK" -> 2, "2.5 BHK" -> 2.5)
    return mapped.sort((a, b) => {
      const numA = this.extractNumericValueFromType(a.type);
      const numB = this.extractNumericValueFromType(b.type);
      return numA - numB;
    });
  }

  /**
   * Extracts the numeric value from a type string (e.g., "2 BHK" -> 2, "2.5 BHK" -> 2.5)
   * Returns Infinity if no number is found to push non-numeric types to the end
   */
  private extractNumericValueFromType(type: string): number {
    if (!type) {
      return Infinity;
    }
    // Match the first number (including decimals) at the start of the string
    const leadingNumericPrefix = /^(\d+(?:\.\d+)?)/;
    const match = leadingNumericPrefix.exec(type);
    return match ? Number.parseFloat(match[1]) : Infinity;
  }

  private convertToNumberOrNull(
    value: number | string | null | undefined,
  ): number | null {
    if (value == null || value === '') {
      return null;
    }
    const numValue = Number(value);
    return numValue === 0 ? null : numValue;
  }

  /**
   * Process inventoryDetails: map fields and calculate amounts based on respective amount types
   */
  private processInventoryDetails(
    inventoryDetails: CreateEoiCampaignDto['inventoryDetails'],
    voucherAmountType: VoucherAmountType | undefined,
    stdEoiAmountType: VoucherAmountType | undefined,
    preEoiAmountType: VoucherAmountType | undefined,
  ): {
    mappedInventoryDetails: any[];
  } {
    if (!inventoryDetails || inventoryDetails.length === 0) {
      return {
        mappedInventoryDetails: [],
      };
    }

    const isVoucherBHKWise = voucherAmountType === VoucherAmountType.BHK_WISE;
    const isStdEoiBHKWise = stdEoiAmountType === VoucherAmountType.BHK_WISE;
    const isPreEoiBHKWise = preEoiAmountType === VoucherAmountType.BHK_WISE;

    const mappedInventoryDetails = inventoryDetails.map((inv) => {
      const inventoryDetail: any = {
        type: inv.type,
        minSBA: this.convertToNumberOrNull(inv.minSBA),
        maxSBA: this.convertToNumberOrNull(inv.maxSBA),
        minPrice: this.convertToNumberOrNull(inv.minPrice),
        maxPrice: this.convertToNumberOrNull(inv.maxPrice),
      };

      // Include amount fields based on their respective amount types
      if (isVoucherBHKWise) {
        inventoryDetail.voucherAmt = this.convertToNumberOrNull(inv.voucherAmt);
      }
      if (isStdEoiBHKWise) {
        inventoryDetail.standardEOIAmt = this.convertToNumberOrNull(
          inv.standardEOIAmt,
        );
      }
      if (isPreEoiBHKWise) {
        inventoryDetail.preferentialEOIAmt = this.convertToNumberOrNull(
          inv.preferentialEOIAmt,
        );
      }

      return inventoryDetail;
    });

    return {
      mappedInventoryDetails,
    };
  }

  /**
   * When amounts are per-BHK, clear fixed campaign-level amount fields.
   */
  private nullifyFixedAmountsWhenBhkWise(
    dto: CreateEoiCampaignDto,
    campaignData: any,
  ): void {
    if (dto.voucherAmountType === VoucherAmountType.BHK_WISE) {
      campaignData.voucherAmount = null;
    }
    if (dto.stdEoiAmountType === VoucherAmountType.BHK_WISE) {
      campaignData.stdEoiAmount = null;
    }
    if (dto.preEoiAmountType === VoucherAmountType.BHK_WISE) {
      campaignData.preEoiAmount = null;
    }
  }

  private formatDateOrNull(date: Date | null | undefined): string | null {
    return date ? formatDate(date.toISOString(), DATE_FORMAT_DD_MM_YYYY) : null;
  }

  private buildCampaignDetailsDto(
    campaign: EoiCampaign,
    inventoryDetails: any,
    additionalApproverUsers: Users[],
  ): CampaignDetailsDto {
    return {
      id: campaign.id,
      campaignName: campaign.campaignName,
      enquiryInitials: campaign.enquiryInitials,
      enquiryCounter: campaign.enquiryCounter,
      voucherIdInitials: campaign.voucherIdInitials,
      voucherIdCounter: campaign.voucherIdCounter,
      stdEoiInitials: campaign.stdEoiInitials,
      preEoiInitials: campaign.preEoiInitials,
      stdEoiCounter: campaign.stdEoiCounter,
      preEoiCounter: campaign.preEoiCounter,
      phase: campaign.phase,
      stage: campaign.stage,
      status: campaign.status,
      queueAfterVerified: campaign.queueAfterVerified,
      displayQueueId: campaign.displayQueueId,
      brandId: this.brandBrief(campaign.brand),
      cityIds: this.brief<CityMaster>(campaign.cities),
      developmentTypeIds: this.brief<DevelopmentType>(
        campaign.developmentTypes,
      ),
      inventoryTypeIds: this.brief<InventoryType>(campaign.inventoryTypes),
      indicativeBasePrice: campaign.indicativeBasePrice,
      pushToSfdc: campaign.pushToSfdc,
      sfdcProjectName: campaign.sfdcProjectName ?? null,
      inventoryDetails,
      accountDetails: campaign.accountDetails ?? null,
      eoiFormType: campaign.eoiFormType,
      eoiStartDate: this.formatDateOrNull(campaign.eoiStartDate),
      eoiEndDate: campaign?.eoiEndDate
        ? formatDate(
            campaign.eoiEndDate.toLocaleDateString('en-GB'),
            DATE_FORMAT_DD_MM_YYYY,
          )
        : null,
      eoiType: campaign.eoiType ?? [],
      stdEoiAmount: safeNumber(campaign.stdEoiAmount, null),
      preEoiAmount: safeNumber(campaign.preEoiAmount, null),
      eoiTermsAndCondition: safeString(campaign.eoiTermsAndCondition, null),
      unitPrefStaticContent: safeString(campaign.unitPrefStaticContent, null),
      voucherFormType: safeString(
        campaign?.voucherFormType,
        null,
      ) as EoiFormType | null,
      voucherAmount: safeNumber(campaign?.voucherAmount, null),
      voucherStartDate: this.formatDateOrNull(campaign?.voucherStartDate),
      voucherEndDate: campaign?.voucherEndDate
        ? formatDate(
            campaign.voucherEndDate.toLocaleDateString('en-GB'),
            DATE_FORMAT_DD_MM_YYYY,
          )
        : null,
      voucherTermsAndCondition: safeString(
        campaign?.voucherTermsAndCondition,
        null,
      ),
      isInventoryMapped: campaign.isInventoryMapped ?? false,
      unitSourceType: (campaign.unitSourceType as UnitSourceType) ?? null,
      voucherAmountType: safeString(
        campaign.voucherAmountType,
        null,
      ) as VoucherAmountType | null,
      stdEoiAmountType: safeString(
        campaign.stdEoiAmountType,
        null,
      ) as VoucherAmountType | null,
      preEoiAmountType: safeString(
        campaign.preEoiAmountType,
        null,
      ) as VoucherAmountType | null,
      enableEOIsAllRms: campaign.enableEOIsAllRms ?? false,

      ...this.buildCampaignAdditionalDetails(campaign, additionalApproverUsers),
    };
  }

  private buildCampaignAdditionalDetails(
    campaign: EoiCampaign,
    additionalApproverUsers: Users[],
  ) {
    return {
      easebuzzKey: campaign.easebuzzKey
        ? this.configService.decryptData(campaign.easebuzzKey)
        : null,

      easebuzzSalt: campaign.easebuzzSalt
        ? this.configService.decryptData(campaign.easebuzzSalt)
        : null,

      subMerchantId: campaign.subMerchantId
        ? this.configService.decryptData(campaign.subMerchantId)
        : null,

      availableGateways: campaign.availableGateways,

      razorpayKey: campaign?.razorpayKey
        ? this.configService.decryptData(campaign.razorpayKey)
        : null,

      razorpaySecret: campaign?.razorpaySecret
        ? this.configService.decryptData(campaign.razorpaySecret)
        : null,

      thresholdAmount: campaign.thresholdAmount ?? null,
      unitBlockDuration: campaign.unitBlockDuration ?? null,
      timerExtension: campaign.timerExtension ?? null,
      approvalWindowHours: campaign.approvalWindowHours ?? null,

      unitApproverId: this.briefOne(campaign.unitApprover),
      additionalApprovers: this.brief(additionalApproverUsers),

      displayUnitType: campaign.displayUnitType ?? null,
      project: this.briefOne(campaign.project),

      showAgreementValue: campaign.showAgreementValue,

      venueName: campaign.venueName ?? null,
      venueMapLink: campaign.venueMapLink ?? null,
      agreementDocLink: campaign.agreementDocLink ?? null,
    };
  }

  async getById(
    id: number,
  ): Promise<{ message: string; data: CampaignDetailsDto }> {
    try {
      const campaign = await this.eoiCampaignRepository.findOne({
        where: { id },
        relations: [
          'brand',
          'cities',
          'developmentTypes',
          'inventoryTypes',
          'project',
          'unitApprover',
        ],
      });

      if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

      const additionalApproverUsers = campaign.additionalApprovers?.length
        ? await this.userRepository.findBy({
            id: In(campaign.additionalApprovers),
          })
        : [];

      const inventoryDetails = this.toInventoryDetails(
        (campaign as any).inventoryDetails,
      );

      const dto: CampaignDetailsDto = this.buildCampaignDetailsDto(
        campaign,
        inventoryDetails,
        additionalApproverUsers,
      );

      return { message: 'Campaign details fetched.', data: dto };
    } catch (error) {
      logsAndErrorHandling('eoiCampaignService - getById', error, {
        id,
      });
    }
  }

  async updateEoiCampaign(
    id: number,
    createEoiCampaignDto: CreateEoiCampaignDto,
  ): Promise<any> {
    try {
      const existingCampaign = await this.eoiCampaignRepository.findOne({
        where: { id },
      });
      if (!existingCampaign) {
        throw new NotFoundException('Campaign not found for the given id');
      }
      const { campaignName, voucherIdInitials, cityIds } = createEoiCampaignDto;
      // Validate dates
      this.validateCampaignDates(
        createEoiCampaignDto.phase,
        createEoiCampaignDto.voucherStartDate,
        createEoiCampaignDto.voucherEndDate,
        createEoiCampaignDto.eoiStartDate,
        createEoiCampaignDto.eoiEndDate,
      );

      // Check uniqueness
      await this.validateCampaignUniquenessWhileUpdate(
        campaignName,
        voucherIdInitials,
        id,
        createEoiCampaignDto.phase,
        createEoiCampaignDto.stdEoiInitials,
        createEoiCampaignDto.preEoiInitials,
        createEoiCampaignDto.eoiType,
      );
      const campaignStatus = await this.decideCampaignStatus(
        createEoiCampaignDto.phase,
        existingCampaign.status,
      );
      // Build campaign data
      const campaignData = this.buildCampaignData(
        createEoiCampaignDto,
        existingCampaign,
      );
      if (createEoiCampaignDto.inventoryDetails?.length > 0) {
        const { mappedInventoryDetails } = this.processInventoryDetails(
          createEoiCampaignDto.inventoryDetails,
          createEoiCampaignDto.voucherAmountType,
          createEoiCampaignDto.stdEoiAmountType,
          createEoiCampaignDto.preEoiAmountType,
        );
        campaignData.inventoryDetails = mappedInventoryDetails;

        this.nullifyFixedAmountsWhenBhkWise(createEoiCampaignDto, campaignData);
      }
      campaignData.status = campaignStatus;
      // Handle ManyToMany relationships
      if (cityIds && cityIds.length > 0) {
        campaignData.cities = cityIds.map((id) => ({ id }) as any);
      }

      if (
        createEoiCampaignDto.developmentTypeIds &&
        createEoiCampaignDto.developmentTypeIds?.length > 0
      ) {
        campaignData.developmentTypes =
          createEoiCampaignDto.developmentTypeIds.map((id) => ({ id }) as any);
      }

      if (
        createEoiCampaignDto.inventoryTypeIds &&
        createEoiCampaignDto.inventoryTypeIds?.length > 0
      ) {
        campaignData.inventoryTypes = createEoiCampaignDto.inventoryTypeIds.map(
          (id) => ({ id }) as any,
        );
      }

      // Snapshot before merge: `merge` mutates `existingCampaign`, so we must
      // compare against copies or Case 5 would see no phase/eoiType change.
      const phaseBeforeUpdate = existingCampaign.phase
        ? [...existingCampaign.phase]
        : [];
      const eoiTypesBeforeUpdate = existingCampaign.eoiType
        ? [...existingCampaign.eoiType]
        : [];
      const launchDiffBaseline: Pick<EoiCampaign, 'phase' | 'eoiType'> = {
        phase: phaseBeforeUpdate,
        eoiType: eoiTypesBeforeUpdate,
      };

      const campaign = this.eoiCampaignRepository.merge(
        existingCampaign,
        campaignData,
      );
      const savedCampaign = await this.eoiCampaignRepository.save(campaign);

      // Case 5 backfill: if the update just enabled a new EOI tier whose
      // eoiStartDate is today, auto-assign tier IDs to vouchers that already
      // paid enough during the Voucher-only period.
      const launchableTiers = this.getLaunchableTiersFromCampaign(
        savedCampaign,
        launchDiffBaseline,
      );
      if (launchableTiers.length) {
        await this.backfillDeferredTierIdsForCampaign(
          savedCampaign,
          launchableTiers,
        );
      }

      return {
        success: true,
        message: 'EOI Campaign updated successfully',
        data: savedCampaign,
      };
    } catch (error) {
      logger.error('Error updating EOI campaign:', error);
      throw error;
    }
  }

  /**
   * Converts a status enum to a phase array
   */
  private statusEnumToPhaseArray(
    status: CampaignStatusEnum,
  ): VoucherFormType[] {
    if (
      status === CampaignStatusEnum.ACTIVE_VOUCHER ||
      status === CampaignStatusEnum.INACTIVE_VOUCHER
    ) {
      return [VoucherFormType.VOUCHER];
    }
    if (
      status === CampaignStatusEnum.ACTIVE_EOI ||
      status === CampaignStatusEnum.INACTIVE_EOI
    ) {
      return [VoucherFormType.EOI];
    }
    if (
      status === CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI ||
      status === CampaignStatusEnum.INACTIVE_VOUCHER_AND_EOI
    ) {
      return [VoucherFormType.VOUCHER, VoucherFormType.EOI];
    }
    return [VoucherFormType.VOUCHER];
  }

  /**
   * Converts oldPhase (array or status enum) to a phase array
   */
  private normalizePhaseToArray(
    oldPhase: VoucherFormType[] | CampaignStatusEnum,
  ): VoucherFormType[] {
    if (Array.isArray(oldPhase)) {
      return oldPhase;
    }
    return this.statusEnumToPhaseArray(oldPhase);
  }

  /**
   * Determines campaign status based on phase array
   */
  private getStatusFromPhase(phase: VoucherFormType[]): CampaignStatusEnum {
    const hasVoucher = phase.includes(VoucherFormType.VOUCHER);
    const hasEoi = phase.includes(VoucherFormType.EOI);

    if (hasVoucher && hasEoi) {
      return CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI;
    }
    if (hasVoucher) {
      return CampaignStatusEnum.ACTIVE_VOUCHER;
    }
    if (hasEoi) {
      return CampaignStatusEnum.ACTIVE_EOI;
    }
    return CampaignStatusEnum.ACTIVE_VOUCHER;
  }

  /**
   * Checks if two phase arrays are equivalent (same elements, order-independent)
   */
  private arePhasesEqual(
    phase1: VoucherFormType[],
    phase2: VoucherFormType[],
  ): boolean {
    const sorted1 = [...phase1].sort((a, b) => a.localeCompare(b));
    const sorted2 = [...phase2].sort((a, b) => a.localeCompare(b));
    return JSON.stringify(sorted1) === JSON.stringify(sorted2);
  }

  /**
   * Validates phase transition rules
   */
  private validatePhaseTransition(
    oldPhaseArray: VoucherFormType[],
    newPhase: VoucherFormType[],
  ): void {
    const isRemovingEoiFromEoiOnly =
      oldPhaseArray.includes(VoucherFormType.EOI) &&
      !oldPhaseArray.includes(VoucherFormType.VOUCHER) &&
      !newPhase.includes(VoucherFormType.EOI);

    if (isRemovingEoiFromEoiOnly) {
      throw new BadRequestException(
        'Campaign cannot be shifted from EOI to Voucher phase.',
      );
    }
  }

  async decideCampaignStatus(
    newPhase: VoucherFormType[],
    oldPhase: VoucherFormType[] | CampaignStatusEnum,
  ): Promise<CampaignStatusEnum> {
    try {
      const oldPhaseArray = this.normalizePhaseToArray(oldPhase);

      // If phases are unchanged, return status based on new phase
      if (this.arePhasesEqual(newPhase, oldPhaseArray)) {
        return this.getStatusFromPhase(newPhase);
      }

      // Validate phase transition rules
      this.validatePhaseTransition(oldPhaseArray, newPhase);

      // Determine and return new status
      return this.getStatusFromPhase(newPhase);
    } catch (error) {
      logger.error('Error deciding campaign status:', error);
      throw error;
    }
  }

  async listCampaignBankDetails(dto: ListCampaignBankDetailsDto) {
    try {
      const { page = 1, limit = 10, campaignIds, search } = dto;
      const activeStatuses = [
        CampaignStatusEnum.ACTIVE_VOUCHER,
        CampaignStatusEnum.ACTIVE_EOI,
        CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI,
      ];

      const query = this.eoiCampaignRepository
        .createQueryBuilder('campaign')
        .select([
          'campaign.id',
          'campaign.campaignName',
          'campaign.accountDetails',
        ])
        .where('campaign.status IN (:...activeStatuses)', { activeStatuses })
        .orderBy('campaign.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      //  Filter by campaignId
      if (campaignIds?.length) {
        query.andWhere('campaign.id IN (:...campaignIds)', { campaignIds });
      }

      //  Search by campaign name OR bank details
      if (search) {
        query.andWhere(
          `(
            LOWER(campaign.campaign_name) LIKE :search
            OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(campaign.account_details, '$.bankName'))) LIKE :search
          )`,
          { search: `%${search.toLowerCase()}%` },
        );
      }
      const [data, total] = await query.getManyAndCount();
      const campaigns = data.map((c) => ({
        campaignId: c.id,
        campaignName: c.campaignName,
        accountName: c.accountDetails?.accountName || null,
        bankName: c.accountDetails?.bankName || null,
        accountNumber: c.accountDetails?.accountNumber || null,
        ifscCode: c.accountDetails?.ifscCode || null,
        swiftCode: c.accountDetails?.swiftCode || null,
      }));

      return {
        statusCode: SUCCESS,
        message: 'Campaign bank details list',
        data: {
          campaigns,
          total,
          page,
          pageSize: limit,
          pageCount: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch campaign bank details', error);
      logsAndErrorHandling(
        'eoiCampaignService - listCampaignBankDetails',
        error,
      );
    }
  }

  async sendEOIBankDetailEmail(
    user: any,
    campaignId: number,
    emailIds: string[],
  ): Promise<any> {
    try {
      logger.info(`sendEOIBankDetailEmail called: ${campaignId}`);
      const campaignDetails = await this.getById(campaignId);

      const composeResponses = await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.EOI_BANK_DETAIL_EMAIL,
          {
            CAMPAIGN_NAME: campaignDetails?.data?.campaignName,
            ACCOUNT_NAME: campaignDetails?.data?.accountDetails?.accountName,
            BANK_NAME: campaignDetails?.data?.accountDetails?.bankName,
            ACCOUNT_NUMBER:
              campaignDetails?.data?.accountDetails?.accountNumber,
            IFSC_CODE: campaignDetails?.data?.accountDetails?.ifscCode,
            SWIFT_CODE:
              campaignDetails?.data?.accountDetails?.swiftCode ?? 'N/A',
            BRAND_NAME:
              campaignDetails?.data?.brandId.name ?? BRAND_PURAVANKARA,
          },
          campaignDetails?.data?.brandId.name ?? BRAND_PURAVANKARA,
          {
            to: emailIds,
          },
        ),
      );

      const composeResult = composeResponses?.find(
        (r: any) =>
          r && (r.data?.subject || r.subject) && (r.data?.body || r.body),
      );

      if (!composeResult) {
        throw new InternalServerErrorException('Failed to send email');
      }

      return {
        success: true,
        statusCode: SUCCESS,
        message: 'Bank detail email sent successfully.',
        data: {
          id: campaignId,
        },
      };
    } catch (error) {
      logger.error(`Failed to send bank detail email:`, error);

      logsAndErrorHandling('campaignService - sendEOIBankDetailEmail', error, {
        user,
        campaignId,
        emailIds,
      });
    }
  }

  async deleteEoiCampaign(id: number, user: any): Promise<any> {
    try {
      const campaign = await this.eoiCampaignRepository.findOne({
        where: { id },
      });

      if (!campaign) {
        throw new NotFoundException('EOI Campaign not found');
      }

      campaign.deletedBy = user.dbId;

      await this.eoiCampaignRepository.save(campaign);
      await this.eoiCampaignRepository.softRemove(campaign);

      return {
        message: 'EOI Campaign deleted successfully',
      };
    } catch (error) {
      logger.error(`Error deleting EoiCampaign with ID ${id}:`, error);
      logsAndErrorHandling('campaignService - deleteEoiCampaign', error, {
        user,
        campaignId: id,
      });
    }
  }
}
