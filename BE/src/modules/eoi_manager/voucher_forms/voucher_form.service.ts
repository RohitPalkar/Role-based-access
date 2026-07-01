import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { VoucherForm } from './entities/voucher_form.entity';
import { VoucherPayment } from './entities/voucher_payments.entity';
import { VoucherUnitMapping } from './entities/voucher_unit_mappings.entity';
import { VoucherUnitBlocking } from '../../inventory-unit/entities/voucher_unit_blocking.entity';
import { deriveVoucherTransactionIdFromPaymentDetails } from 'src/utils/voucher-payment-transaction-id.util';
import { EntityManager, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ApplicantDto,
  EoiDetailsDto,
  PaymentDetailsDto,
  ThirdFourthApplicantDto,
  DeletePaymentsDto,
} from './dto/update-voucher-form.dto';
import {
  EOITypeEnum,
  VoucherFormStatusEnum,
  VoucherFormType,
  VoucherPaymentStatus,
  VoucherChronologyEnum,
  VoucherPaymentType,
  QueueTypeEnum,
  QueueCounterEnum,
  ReasonActorEnum,
  SecondarySourceEnum,
  VoucherIdFieldNameEnum,
  BlockingStatus,
  MappingStatus,
  EmailActionsEnum,
} from '../../../enums/eoi-form.enums';
import { logger } from '../../../logger/logger';
import { SameAddressEnum } from 'src/enums/same-address.enum';
import {
  VERIFICATION_TIMEOUT_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESEND_COUNT,
  OTP_EXPIRY_TTL_MS,
  OTP_RESEND_TTL_MS,
  SUCCESS,
  OTP_CACHE_TTL,
  OTP_REGEX,
  BRAND_PURAVANKARA,
  DATE_LOCALE,
  VOUCHER_FORM_URL,
  MASKED_QUEUE_ID,
  DISPLAY_DATE_FORMAT,
  ADULT_AGE,
} from '../../../config/constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { generateOtp } from '../../../utils/generateRandomNumber';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from '../../../enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import * as crypto from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { EoiCampaign } from '../../eoi_manager/eoi_campaign/entities/eoi_campaign.entity';
import {
  generateVqiQueueId,
  generateStdQueueId,
  generatePreQueueId,
} from 'src/utils/generateRandomNumber';
import {
  shouldGenerateQueueId,
  determineVoucherChronology,
  buildCancellationUpdate,
  calculatePaymentMetrics,
  determinePaymentStatus,
  validateTransactionAmounts,
  determineVoucherQueueId,
  validatePaymentUniqueness,
  getTermsAndCondition,
  resolveAndAssignTieredId,
  generateAndAssignTieredQueueId,
  mergeEoiDetailsWithoutDowngrade,
  allocateCampaignTierCounter,
  applyAssignedTierThresholdAmountAndRecomputeMetrics,
  markFormSubmittedOnTierChange,
  reconcileTierIdsForCurrentEligibility,
  maskEmailAddress,
  maskMobileNumber,
  resolveThresholds,
} from '../../../helpers/eoi.helper';
import {
  PaymentMethodEnum,
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { RequestCancellationDto } from './dto/request-cancellation.dto';
import { attachFullAddress } from 'src/helpers/bookings.helper';
import { toDisplayDate } from 'src/helpers/customerCheck.helper';
import { ConfigService } from '@nestjs/config';
import { generateVoucherFormUrl } from 'src/helpers/eoi.helper';
import { ProjectInventoryUnit, Users } from 'src/entities';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { OccupationEnum } from 'src/enums/booking-form-status.enum';
import { PdfService } from '../../pdf/pdf.service';
import { PassThrough } from 'node:stream';
import { AwsService } from '../../aws/aws.service';
import { BookingsService } from '../../bookings/bookings.service';
import { v4 as uuid } from 'uuid';
import { formatIndianAmount, safeString } from 'src/helpers';
import { format } from 'date-fns';
@Injectable()
export class VoucherFormsService {
  constructor(
    @InjectRepository(VoucherForm)
    private readonly voucherFormRepository: Repository<VoucherForm>,
    @InjectRepository(EoiCampaign)
    private readonly eoiCampaignRepository: Repository<EoiCampaign>,
    @InjectRepository(VoucherUnitMapping)
    private readonly voucherUnitMappingRepository: Repository<VoucherUnitMapping>,
    @InjectRepository(VoucherUnitBlocking)
    private readonly voucherUnitBlockingRepository: Repository<VoucherUnitBlocking>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
    private readonly awsService: AwsService,
    private readonly bookingsService: BookingsService,
  ) {}

  /**
   * Allocates the next sequence for a queue type and bumps the matching campaign counter.
   * Passed as the `generateQueueIdFn` callback into `generateAndAssignTieredQueueId` (eoi.helper)
   * so VQI/STD/PRE matches whichever tier ID was just minted.
   *
   * @param campaignId - The campaign ID to update
   * @param queueType - The type of queue to generate ('VQI', 'STD', 'PRE')
   * @returns Object containing the generated queue ID and updated counter
   */
  async generateQueueId(
    campaignId: number,
    queueType: QueueTypeEnum,
    manager?: EntityManager,
  ): Promise<{
    queueId: string;
    counter: number;
    counterType: string;
  }> {
    const execute = async (transactionalEntityManager: EntityManager) => {
      const campaign = await transactionalEntityManager.findOne(EoiCampaign, {
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      // Map queue type to counter field and generator function
      const queueConfig = {
        [QueueTypeEnum.VQI]: {
          counterField: QueueCounterEnum.VQI_COUNTER,
          generator: generateVqiQueueId,
          counterName: 'vqiCounter',
        },
        [QueueTypeEnum.STD]: {
          counterField: QueueCounterEnum.STD_COUNTER,
          generator: generateStdQueueId,
          counterName: 'stdCounter',
        },
        [QueueTypeEnum.PRE]: {
          counterField: QueueCounterEnum.PRE_COUNTER,
          generator: generatePreQueueId,
          counterName: 'preCounter',
        },
      };

      const config = queueConfig[queueType];
      const updatedCounter = await this.updateCampaignQueueCounter(
        campaign,
        config.counterField,
        transactionalEntityManager,
      );

      const queueId = config.generator(updatedCounter);

      return {
        queueId,
        counter: updatedCounter,
        counterType: config.counterName,
      };
    };

    if (manager) {
      return execute(manager);
    }

    return this.eoiCampaignRepository.manager.transaction(execute);
  }

  /**
   * Private helper method to update campaign queue counter.
   * Increments the specified counter field and saves the campaign.
   *
   * @param campaign - The campaign entity to update
   * @param counterType - The counter field to increment
   * @param transactionalEntityManager - The transactional entity manager
   * @returns The updated counter value
   */
  private async updateCampaignQueueCounter(
    campaign: EoiCampaign,
    counterType: QueueCounterEnum,
    transactionalEntityManager: any,
  ): Promise<number> {
    campaign[counterType] += 1;
    await transactionalEntityManager.save(campaign);
    return campaign[counterType];
  }

  /**
   * Function to retrieve a voucher form by its voucher ID.
   * Checks if the campaign's end date has passed and returns the voucher form's isUpgradableToEOI flag accordingly.
   * Also calculates the toBeVerified flag based on voucher status and customer update timestamp.
   *
   * @param voucherId - The unique voucher ID string
   * @returns Voucher form details including campaign name, isUpgradableToEOI, and toBeVerified flags
   */
  /**
   * Determines if a voucher form needs verification based on timeout
   *
   * @param voucherForm - The voucher form to check
   * @param lastVerificationTime - The last verification time in milliseconds
   * @returns true if the voucher needs verification, false otherwise
   */
  private shouldBeVerified(
    voucherForm: VoucherForm,
    lastVerificationTime: number,
  ): boolean {
    if (
      voucherForm.voucherFormStatus !== VoucherFormStatusEnum.UNVERIFIED ||
      !voucherForm.customerLastUpdatedAt
    ) {
      return false;
    }

    const currentTime = new Date();
    const timeDifference =
      currentTime.getTime() - new Date(lastVerificationTime).getTime();
    const minutesDifference = timeDifference / (1000 * 60); // Convert milliseconds to minutes
    return minutesDifference > VERIFICATION_TIMEOUT_MINUTES;
  }

  async getVoucherFormByVoucherId(
    voucherId: string,
    skipMasking: boolean = false,
    maskApplicantEmailMobile: boolean = false,
  ): Promise<any> {
    try {
      const voucherForm = await this.voucherFormRepository
        .createQueryBuilder('voucher')
        .leftJoinAndSelect(
          'voucher.payments',
          'payment',
          'payment.paymentType != :refunded',
          { refunded: VoucherPaymentType.REFUND },
        )
        .leftJoinAndSelect('voucher.campaign', 'campaign')
        .leftJoinAndSelect('voucher.createdBy', 'sourcingRm')
        .leftJoinAndSelect('voucher.closingRm', 'closingRm')
        .leftJoinAndSelect('voucher.mappedUnit', 'mappedUnit')
        .leftJoinAndSelect(
          'voucher.blockings',
          'blocking',
          'blocking.deletedAt IS NULL',
        )
        .leftJoinAndSelect('mappedUnit.inventoryUnit', 'inventoryUnit')
        .where('voucher.voucherId = :voucherId', { voucherId })
        .andWhere('voucher.isDeleted = false')
        .getOne();

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      const paymentMetrics = calculatePaymentMetrics(
        voucherForm.payments,
        voucherForm.paymentDetails?.amountPayable,
      );

      if (!skipMasking) {
        // Resolve BHK-aware thresholds so IDs are masked when the customer's typology changes
        const thresholds = resolveThresholds(voucherForm.campaign, voucherForm);

        const realizedPaidAmount = paymentMetrics.realizedAmount; // // Amount that has been actually realized

        // Mask each tier ID if finance is unverified OR the current BHK threshold is no longer met
        voucherForm.paidVoucherId = this.maskTierIdIfNeeded(
          voucherForm.paidVoucherId,
          thresholds.voucher,
          realizedPaidAmount,
        );
        voucherForm.stdEoiId = this.maskTierIdIfNeeded(
          voucherForm.stdEoiId,
          thresholds.standard,
          realizedPaidAmount,
        );
        voucherForm.preEoiId = this.maskTierIdIfNeeded(
          voucherForm.preEoiId,
          thresholds.preferential,
          realizedPaidAmount,
        );
      }

      voucherForm.queueId = determineVoucherQueueId(
        voucherForm,
        paymentMetrics,
        voucherForm.financeStatus,
      );
      if (maskApplicantEmailMobile) {
        this.maskApplicantDetails(voucherForm);
      }
      const otpRedisKey = `voucher_otp:${voucherForm?.userVoucherTrackingId.toLowerCase()}`;
      const existingOtpCache = await this.cacheService.get<any>(otpRedisKey);
      const lastVerificationTime =
        new Date(existingOtpCache?.lastVerifiedAt).getTime() || 0;

      const isUpgradableToEOI = this.canUpgradeToEOI(voucherForm);

      const toBeVerified = this.shouldBeVerified(
        voucherForm,
        lastVerificationTime,
      );

      const { campaign, createdBy, closingRm, ...voucherWithoutCampaign } =
        voucherForm;
      const campaignData = this.extractCampaignData(campaign);
      const rmNames = this.extractRmNames(createdBy, closingRm);
      const relatedVouchers = await this.fetchRelatedVouchers(
        voucherForm,
        voucherId,
      );
      const terms = getTermsAndCondition(voucherForm?.formPhase, campaign);

      // Fetch inventory unit details from ProjectInventoryUnit through VoucherUnitMapping
      let unitMapping = null;
      if (voucherForm.mappedUnit?.inventoryUnit) {
        const inventoryUnit = voucherForm.mappedUnit.inventoryUnit;
        unitMapping = {
          unitNumber: inventoryUnit?.unitNumber,
          towerName: inventoryUnit?.towerName,
          floor: inventoryUnit?.floor,
          unitType: inventoryUnit?.configuration,
          areaSBA: inventoryUnit?.areaSba,
        };
      }

      let blockedUnit = null;
      if (voucherForm?.blockings?.[0]) {
        blockedUnit = {
          id: voucherForm.blockings[0].id,
          status: voucherForm.blockings[0].status,
          unitBlockExpiry: voucherForm.blockings[0].unitBlockExpiry,
          inventoryUnit: voucherForm.blockings[0].inventoryUnit,
          createdAt: voucherForm.blockings[0].createdAt,
          unitBlockDuration: voucherForm.campaign?.unitBlockDuration,
          timerExtension: voucherForm.campaign?.timerExtension,
        };
      }
      delete voucherWithoutCampaign.blockings;
      return {
        success: true,
        message: 'Voucher form retrieved successfully',
        data: {
          ...voucherWithoutCampaign,
          ...campaignData,
          ...rmNames,
          unitMapping,
          blockedUnit,
          isUpgradableToEOI,
          toBeVerified,
          relatedVouchers,
          termsAndCondition: terms,
        },
      };
    } catch (error) {
      logger.error('Error retrieving voucher form:', error);
      throw error;
    }
  }
  maskApplicantDetails(voucherForm: any) {
    if (voucherForm?.applicant1?.personalDetails) {
      voucherForm.applicant1.personalDetails.emailAddress = maskEmailAddress(
        voucherForm.applicant1.personalDetails.emailAddress,
      );

      voucherForm.applicant1.personalDetails.contactNumber = maskMobileNumber(
        voucherForm.applicant1.personalDetails.contactNumber,
      );
      if (voucherForm.applicant1.personalDetails.alternateContactNumber) {
        voucherForm.applicant1.personalDetails.alternateContactNumber =
          maskMobileNumber(
            voucherForm.applicant1.personalDetails.alternateContactNumber,
          );
      }
    }
    if (voucherForm?.applicant2?.personalDetails) {
      voucherForm.applicant2.personalDetails.emailAddress = maskEmailAddress(
        voucherForm.applicant2.personalDetails.emailAddress,
      );

      voucherForm.applicant2.personalDetails.contactNumber = maskMobileNumber(
        voucherForm.applicant2.personalDetails.contactNumber,
      );

      if (voucherForm.applicant2.personalDetails.alternateContactNumber) {
        voucherForm.applicant2.personalDetails.alternateContactNumber =
          maskMobileNumber(
            voucherForm.applicant2.personalDetails.alternateContactNumber,
          );
      }
    }

    if (voucherForm?.applicant3?.contactDetails) {
      voucherForm.applicant3.contactDetails.emailAddress = maskEmailAddress(
        voucherForm.applicant3.contactDetails.emailAddress,
      );

      voucherForm.applicant3.contactDetails.contactNumber = maskMobileNumber(
        voucherForm.applicant3.contactDetails.contactNumber,
      );
    }

    if (voucherForm?.applicant4?.contactDetails) {
      voucherForm.applicant4.contactDetails.emailAddress = maskEmailAddress(
        voucherForm.applicant4.contactDetails.emailAddress,
      );

      voucherForm.applicant4.contactDetails.contactNumber = maskMobileNumber(
        voucherForm.applicant4.contactDetails.contactNumber,
      );
    }
  }

  /**
   * Returns MASKED_QUEUE_ID when the tier ID should be hidden from the customer:
   * - finance is unverified, OR
   * - the customer changed typology (BHK) and validPaidAmount no longer meets the threshold.
   */
  private maskTierIdIfNeeded(
    tierId: string | null,
    threshold: number | null,
    validPaidAmount: number, //realizedPaidAmount
  ): string | null {
    if (!tierId) return null;
    // Mask if a threshold exists and the paid amount no longer satisfies it
    if (threshold && validPaidAmount < threshold) return MASKED_QUEUE_ID;
    return tierId;
  }

  private extractCampaignData(campaign: any): {
    campaignId: number | null;
    campaignName: string | null;
    stage: string | null;
    unitPrefStaticContent: string | null;
  } {
    return {
      campaignId: campaign?.id ?? null,
      campaignName: campaign?.campaignName ?? null,
      stage: campaign?.stage ?? null,
      unitPrefStaticContent: campaign?.unitPrefStaticContent ?? null,
    };
  }

  private extractRmNames(
    createdBy: any,
    closingRm: any,
  ): { sourcingRm: string | null; closingRm: string | null } {
    return {
      sourcingRm: createdBy?.name ?? null,
      closingRm: closingRm?.name ?? null,
    };
  }

  private async fetchRelatedVouchers(
    voucherForm: VoucherForm,
    voucherId: string,
  ): Promise<VoucherForm[]> {
    const contactNumber =
      voucherForm.applicant1?.personalDetails?.contactNumber;

    if (!contactNumber || !voucherForm.campaign?.id) {
      return [];
    }

    return await this.voucherFormRepository
      .createQueryBuilder('voucher')
      .select([
        'voucher.voucherId as voucherId',
        'voucher.queueId as queueId',
        'voucher.uniqueReferenceId as uniqueReferenceId',
        'voucher.eoiDetails as eoiDetails',
      ])
      .leftJoin('voucher.campaign', 'campaign')
      .where('campaign.id = :campaignId', {
        campaignId: voucherForm.campaign.id,
      })
      .andWhere('voucher.isDeleted = false')
      .andWhere(
        "JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.contactNumber')) = :contactNumber",
        { contactNumber },
      )
      .andWhere('voucher.voucherId != :voucherId', { voucherId })
      .getRawMany();
  }

  private canUpgradeToEOI(voucherForm: VoucherForm): boolean {
    const { campaign, eoiDetails } = voucherForm;

    if (!campaign.phase?.includes(VoucherFormType.EOI)) return false;

    const allowedTypes = campaign.eoiType ?? [];
    const currentType = eoiDetails?.eoiType;

    // No EOI yet → allow
    if (!currentType || currentType === EOITypeEnum.VOUCHER) return true;

    // Already highest → no upgrade
    if (currentType === EOITypeEnum.PREFERENTIAL) return false;

    // Current is STANDARD
    if (
      currentType === EOITypeEnum.STANDARD &&
      allowedTypes.includes(EOITypeEnum.PREFERENTIAL)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Function to update applicant details for a voucher form.
   * Handles address synchronization between applicants and updates the voucher form status.
   * Sets customerLastUpdatedAt timestamp when customer makes changes.
   *
   * @param voucherId - The unique voucher ID string
   * @param applicantDto - DTO containing applicant information to update
   * @returns Success message and updated data
   * @throws BadRequestException when voucher form is already completed
   */
  async updateVoucherFormApplicant(
    voucherId: string,
    applicantDto: ApplicantDto | ThirdFourthApplicantDto,
  ): Promise<any> {
    try {
      const { data: voucherForm } =
        await this.getVoucherFormByVoucherId(voucherId);

      //Save same address for applicant 1 or 2, if select same as applicant 1
      if (
        applicantDto.contactDetails &&
        'isSameAddress' in applicantDto.contactDetails &&
        applicantDto?.contactDetails?.isSameAddress === SameAddressEnum.YES
      ) {
        applicantDto.contactDetails.permanentAddress =
          applicantDto?.contactDetails?.communicationAddress;

        if (applicantDto?.applicantNumber == 2) {
          applicantDto.contactDetails.permanentAddress =
            voucherForm?.applicant1?.contactDetails?.communicationAddress;
        }
      }

      if (applicantDto?.contactDetails) {
        applicantDto.contactDetails = attachFullAddress(
          applicantDto.contactDetails,
        );
      }

      const {
        lastStep,
        applicantNumber,
        isApplicantsUpdated,
        ...cleanedApplicantDto
      } = applicantDto;
      delete cleanedApplicantDto.saveForLater;

      const noOfApplicants = Math.max(
        voucherForm.noOfApplicants,
        applicantNumber,
      );

      const applicantKey = `applicant${applicantNumber}`;
      const updateData: Record<string, any> = {
        [applicantKey]: {
          ...voucherForm[applicantKey],
          ...cleanedApplicantDto,
        },
        ...(lastStep && { lastStep }),
        noOfApplicants,

        ...(applicantNumber === 1 && {
          residentStatus: (applicantDto.personalDetails as any)?.residentStatus,
        }),

        voucherFormStatus:
          voucherForm.voucherFormStatus === VoucherFormStatusEnum.CREATED
            ? VoucherFormStatusEnum.IN_PROGRESS
            : voucherForm.voucherFormStatus,
        customerLastUpdatedAt: new Date(),
        ...(isApplicantsUpdated === true && {
          isApplicantsUpdated: true,
          applicantsUpdatedAt: new Date(),
        }),
      };

      await this.voucherFormRepository.update({ voucherId }, updateData);
      await this.refreshCacheToken(voucherForm.userVoucherTrackingId);
      return {
        message: 'Applicant details updated successfully.',
        data: updateData,
      };
    } catch (error) {
      logger.error('Error updating applicant details:', error);
      throw error;
    }
  }

  /**
   * Function to update EOI details for a voucher form.
   * Updates unit selection and project details while maintaining form progress.
   * Sets customerLastUpdatedAt timestamp when customer makes changes.
   *
   * @param voucherId - The unique voucher ID string
   * @param eoiDetailsDto - DTO containing EOI details to update
   * @returns Success message and updated data
   * @throws BadRequestException when voucher form is already completed
   */
  async updateEoiDetails(
    voucherId: string,
    eoiDetailsDto: EoiDetailsDto,
  ): Promise<any> {
    try {
      // Fetch the raw voucher entity with campaign relation for internal updates
      const voucherEntity = await this.voucherFormRepository.findOne({
        where: { voucherId, isDeleted: false },
        relations: ['campaign'],
      });

      if (!voucherEntity) {
        throw new NotFoundException('Voucher form not found');
      }

      // Compute isUpgradableToEOI using existing business logic
      const voucherForm: any = {
        ...voucherEntity,
        isUpgradableToEOI: this.canUpgradeToEOI(voucherEntity),
      };

      // Extract and clean DTO data
      const { lastStep, ...eoiDetails } = eoiDetailsDto;
      delete eoiDetails.saveForLater;

      if (
        voucherForm.formPhase === VoucherFormType.EOI &&
        eoiDetails.eoiType === EOITypeEnum.VOUCHER
      ) {
        throw new BadRequestException(
          'The Voucher is already in EOI phase, hence you cannot change it to Voucher Phase',
        );
      }

      // Merge new eoiDetails with existing eoiDetails
      const mergedEoiDetails = mergeEoiDetailsWithoutDowngrade(
        voucherForm.eoiDetails,
        eoiDetails,
      );

      // Build base update data
      const updateData: Partial<VoucherForm> = {
        eoiDetails: mergedEoiDetails,
        customerLastUpdatedAt: new Date(),
        ...(lastStep && { lastStep }),
      };

      if (
        voucherForm?.voucherFormStatus ===
          VoucherFormStatusEnum.MIS_REQUESTED_CHANGES ||
        voucherForm.voucherFormStatus === VoucherFormStatusEnum.MIS_UPDATED
      ) {
        updateData.voucherFormStatus = VoucherFormStatusEnum.MIS_UPDATED;
      } else if (
        voucherForm?.voucherFormStatus ===
          VoucherFormStatusEnum.CRM_REQUESTED_CHANGES ||
        voucherForm.voucherFormStatus === VoucherFormStatusEnum.CRM_UPDATED
      ) {
        updateData.voucherFormStatus = VoucherFormStatusEnum.CRM_UPDATED;
      } else {
        updateData.voucherFormStatus = VoucherFormStatusEnum.IN_PROGRESS;
      }

      // If customer selects Standard/Preferential while still in Voucher phase,
      // switch formPhase to EOI for the next EOI journey screens.
      const switchingToEoi =
        eoiDetails?.eoiType === EOITypeEnum.STANDARD ||
        eoiDetails?.eoiType === EOITypeEnum.PREFERENTIAL;
      if (voucherForm.formPhase === VoucherFormType.VOUCHER && switchingToEoi) {
        updateData.formPhase = VoucherFormType.EOI;
      }

      // Check if campaign phase includes both VOUCHER and EOI, and update form phase and amountPayable
      this.handleDualPhaseCampaignUpdate(
        updateData,
        eoiDetails,
        voucherEntity.campaign,
        voucherEntity.paymentDetails,
      );

      // Apply business logic for phase transitions and status updates
      this.applyEoiBusinessLogic(updateData, eoiDetails, voucherForm);
      await this.voucherFormRepository.update({ voucherId }, updateData);
      await this.refreshCacheToken(voucherForm.userVoucherTrackingId);
      return {
        message: 'Unit details updated successfully.',
        data: updateData,
      };
    } catch (error) {
      logger.error('Error updating unit details:', error);
      throw error;
    }
  }

  /**
   * Private helper function to handle dual-phase campaign updates.
   * Updates form phase to EOI and amountPayable when campaign supports both VOUCHER and EOI phases
   * and the user selects Preferential or Standard EOI type.
   *
   * @param updateData - The update data object to modify
   * @param eoiDetails - The new EOI details from DTO
   * @param campaign - The campaign entity
   * @param currentPaymentDetails - The existing payment details
   */
  private handleDualPhaseCampaignUpdate(
    updateData: Partial<VoucherForm>,
    eoiDetails: any,
    campaign: any,
    currentPaymentDetails: any,
  ): void {
    if (
      campaign?.phase &&
      Array.isArray(campaign.phase) &&
      campaign.phase.includes(VoucherFormType.VOUCHER) &&
      campaign.phase.includes(VoucherFormType.EOI) &&
      (eoiDetails.eoiType === EOITypeEnum.PREFERENTIAL ||
        eoiDetails.eoiType === EOITypeEnum.STANDARD)
    ) {
      // Update form phase to EOI
      updateData.formPhase = VoucherFormType.EOI;

      // Update amountPayable based on EOI type
      const paymentDetails = currentPaymentDetails || {};
      let newAmountPayable: number | null = null;

      if (eoiDetails.eoiType === EOITypeEnum.PREFERENTIAL) {
        newAmountPayable = campaign.preEoiAmount ?? null;
      } else if (eoiDetails.eoiType === EOITypeEnum.STANDARD) {
        newAmountPayable = campaign.stdEoiAmount ?? null;
      }

      // Update paymentDetails with new amountPayable
      if (newAmountPayable !== null) {
        updateData.paymentDetails = {
          ...paymentDetails,
          amountPayable: newAmountPayable,
        };
      }
    }
  }

  /**
   * Private helper function to apply EOI business logic for phase transitions and status updates.
   * Handles voucher to EOI phase upgrade and standard to preferential EOI upgrade.
   *
   * @param updateData - The update data object to modify
   * @param eoiDetails - The new EOI details from DTO
   * @param voucherForm - The existing voucher form data
   */
  private applyEoiBusinessLogic(
    updateData: Partial<VoucherForm>,
    eoiDetails: any,
    voucherForm: any,
  ): void {
    // Case 1: Voucher phase to EOI phase upgrade
    if (this.shouldUpgradeToEoiPhase(eoiDetails, voucherForm)) {
      updateData.formPhase = VoucherFormType.EOI;

      // If payment status is already partially paid, update all fields
      if (
        voucherForm.paymentStatus === VoucherPaymentStatus.PARTIALLY_PAID ||
        voucherForm.paymentStatus === VoucherPaymentStatus.PAID
      ) {
        updateData.voucherFormStatus = VoucherFormStatusEnum.UPGRADING;
        updateData.paymentStatus = VoucherPaymentStatus.PARTIALLY_PAID;
        updateData.chronology = VoucherChronologyEnum.V_E;
      } else if (voucherForm.paymentStatus === VoucherPaymentStatus.PENDING) {
        // If payment status is pending, only update formPhase and chronology
        updateData.chronology = VoucherChronologyEnum.E;
      }
    } else if (this.shouldUpgradeToPreferentialEoi(eoiDetails, voucherForm)) {
      updateData.voucherFormStatus = VoucherFormStatusEnum.UPGRADING;
      updateData.paymentStatus = VoucherPaymentStatus.PARTIALLY_PAID;
    } // Case 2: Standard EOI to Preferential EOI upgrade
  }

  /**
   * Private helper function to check if voucher should be upgraded to EOI phase.
   *
   * @param eoiDetails - The new EOI details
   * @param voucherForm - The existing voucher form
   * @returns True if should upgrade to EOI phase
   */
  private shouldUpgradeToEoiPhase(eoiDetails: any, voucherForm: any): boolean {
    return (
      eoiDetails?.eoiType !== EOITypeEnum.VOUCHER &&
      voucherForm?.formPhase === VoucherFormType.VOUCHER &&
      voucherForm?.isUpgradableToEOI
    );
  }

  /**
   * Private helper function to check if EOI should be upgraded to preferential.
   *
   * @param eoiDetails - The new EOI details
   * @param voucherForm - The existing voucher form
   * @returns True if should upgrade to preferential EOI
   */
  private shouldUpgradeToPreferentialEoi(
    eoiDetails: any,
    voucherForm: any,
  ): boolean {
    return (
      eoiDetails?.eoiType === EOITypeEnum.PREFERENTIAL &&
      voucherForm?.formPhase === VoucherFormType.EOI &&
      voucherForm?.eoiDetails?.eoiType === EOITypeEnum.STANDARD
    );
  }

  /**
   * Function to update payment details for a voucher form.
   * Merges existing gateway transactions with new offline transactions.
   * Calculates payment status and marks form as completed when fully paid.
   * Sets customerLastUpdatedAt timestamp when customer makes changes.
   *
   * @param voucherId - The unique voucher ID string
   * @param paymentDetailsDto - DTO containing payment information to update
   * @returns Success message and updated voucher form data
   * @throws BadRequestException when voucher form is already paid
   * @throws NotFoundException when voucher form is not found
   *
   * PE-476 path (when not `saveForLater`): `calculatePaymentMetrics` → `applyPostPaymentBusinessRules`
   * (`resolveAndAssignTieredId`, optional `generateAndAssignTieredQueueId` via `generateQueueId`).
   */
  async updatePaymentDetails(
    voucherId: string,
    paymentDetailsDto: PaymentDetailsDto,
    user?: any,
  ): Promise<any> {
    try {
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { voucherId, isDeleted: false },
        relations: ['campaign', 'closingRm', 'createdBy'],
      });

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      const {
        lastStep,
        isAgreedOnTerms,
        saveForLater = false,
        payments = [],
        ...restDetails
      } = paymentDetailsDto;

      const existingPayments = await this.voucherFormRepository.manager
        .createQueryBuilder(VoucherPayment, 'payment')
        .where('payment.voucher = :voucherId', { voucherId: voucherForm.id })
        .getMany();

      const existingPaymentIds = new Set(
        existingPayments.map((p) => p.id).filter((id) => id != null),
      );

      const newPayments = payments.filter(
        (payment) => !payment.id || !existingPaymentIds.has(payment.id),
      );

      logger.info(
        `Updating payment details for voucher ${voucherId}. Existing payments: ${existingPayments.length}, New payments: ${newPayments.length}`,
      );

      const existingGatewayTx = existingPayments.filter(
        (p) => p.paymentMode === PaymentModeEnum.GATEWAY,
      );

      // Validate that payments have unique transactionNumber and chequeNumber
      validatePaymentUniqueness(payments, existingGatewayTx);

      const nonGatewayTx = payments.filter(
        (tx) => tx.paymentMode !== PaymentModeEnum.GATEWAY,
      );

      const mergedTransactions = [...existingGatewayTx, ...nonGatewayTx];

      validateTransactionAmounts(mergedTransactions);

      // `validPaidAmount` inside metrics feeds tier crossing in `applyPostPaymentBusinessRules`.
      const paymentMetrics = calculatePaymentMetrics(
        mergedTransactions,
        paymentDetailsDto.amountPayable,
      );

      Object.assign(voucherForm, {
        paymentDetails: {
          ...restDetails,
          totalAmountPaid: paymentMetrics.totalPaidAmount,
        },
        lastStep: user ? voucherForm.lastStep || 0 : Math.max(lastStep || 0, 3),
        isAgreedOnTerms: user ? voucherForm.isAgreedOnTerms : isAgreedOnTerms,
        customerLastUpdatedAt: new Date(),
      });

      // Defer post-payment business rules into the DB transaction so counter allocation
      // and queue-id generation run under the same EntityManager.

      // Create a map of existing payments by ID for quick lookup
      const existingPaymentsMap = new Map(
        existingPayments.map((p) => [p.id, p]),
      );

      const deferredEvents: any[] = [];
      const updatedVoucherForm =
        await this.voucherFormRepository.manager.transaction(
          async (manager) => {
            await this.syncVoucherPaymentsInTransaction(
              manager,
              voucherForm,
              payments,
              existingPaymentsMap,
              user,
              deferredEvents,
            );

            // Run post-payment business rules inside the same transaction so all
            // counter allocations and queue-id generation use the same manager.
            if (!saveForLater) {
              await this.applyPostPaymentBusinessRules(
                voucherForm,
                paymentMetrics,
                mergedTransactions,
                user,
                manager,
                deferredEvents,
              );
            }

            const hasUnverifiedPayments = payments.some(
              (p) => p.status === PaymentTxStatusEnum.UNVERIFIED,
            );

            const hasRejectedPayments = payments.some(
              (p) => p.status === PaymentTxStatusEnum.REJECTED,
            );

            if (
              hasUnverifiedPayments &&
              !hasRejectedPayments &&
              (voucherForm.financeStatus === PaymentTxStatusEnum.VERIFIED ||
                voucherForm.financeStatus === PaymentTxStatusEnum.REJECTED)
            ) {
              voucherForm.financeStatus = PaymentTxStatusEnum.UNVERIFIED;
            }

            if (
              hasRejectedPayments &&
              voucherForm.financeStatus !== PaymentTxStatusEnum.REJECTED &&
              voucherForm.paymentStatus !== VoucherPaymentStatus.PAID
            ) {
              voucherForm.financeStatus = PaymentTxStatusEnum.REJECTED;
            }

            return manager.save(voucherForm);
          },
        );

      await this.refreshCacheToken(voucherForm.userVoucherTrackingId);

      // Emit any deferred email events that were collected inside the transaction.
      try {
        if (deferredEvents && deferredEvents.length > 0) {
          for (const ev of deferredEvents) {
            this.eventEmitter.emit(EventMessagesEnum.COMPOSE_EMAIL, ev);
          }
        }
      } catch (e) {
        logger.error(
          'Failed to emit deferred events after voucher payment transaction',
          e,
        );
      }

      if (!saveForLater && !user) {
        const voucherFormForEmail = await this.voucherFormRepository.findOne({
          where: { id: updatedVoucherForm.id, isDeleted: false },
          relations: ['campaign', 'createdBy', 'closingRm', 'misChecker'],
        });

        if (voucherFormForEmail) {
          this.sendVoucherSubmissionEmail(voucherFormForEmail).catch(() => {});
          this.sendFormSubmittedNotificationToRmMis(
            voucherFormForEmail,
            'Customer',
          ).catch(() => {});
        }
      }

      return {
        success: true,
        message: 'Payment details updated successfully',
        data: updatedVoucherForm,
      };
    } catch (error) {
      logger.error('Error updating payment details:', error);
      throw error;
    }
  }

  /**
   * Fetch payment data for a voucher from voucher_payments.
   * Sums amounts where status is 'Pending Reco' (UNVERIFIED) or 'Realized' (VERIFIED).
   * Checks if any transaction is via OFFLINE mode (cheque, etc.).
   */
  private async fetchVoucherPaymentData(
    manager: any,
    voucherId: number,
  ): Promise<{
    amountPaid: number;
    blockingPayment: number;
    hasChequePayment: boolean;
    txHtml: string;
  }> {
    const payments = await manager.find(VoucherPayment, {
      where: [
        {
          voucherId,
          status: PaymentTxStatusEnum.UNVERIFIED, // 'Pending Reco'
        },
        {
          voucherId,
          status: PaymentTxStatusEnum.VERIFIED, // 'Realized'
        },
      ],
      order: {
        date: 'DESC',
      },
    });

    let amountPaid = 0;
    let blockingPayment = 0;
    let hasChequePayment = false;

    let txHtml = '';
    for (const payment of payments) {
      const paymentModeDisplay =
        payment.paymentMode === PaymentModeEnum.GATEWAY
          ? 'Payment Gateway'
          : payment.paymentDetails?.method;
      txHtml += `<tr><td> ${format(payment.date, 'dd/MM/yyyy')} </td><td> ₹${formatIndianAmount(payment.paidAmount)} </td><td> ${paymentModeDisplay} </td><td> ${payment.status} </td></tr>`;

      amountPaid += Number(payment.paidAmount) || 0;
      if (payment.isUnitMapped) {
        blockingPayment += Number(payment.paidAmount) || 0;
      }
      // Check if payment mode is OFFLINE (includes cheque, dd, etc.)
      if (payment?.paymentDetails?.method === PaymentMethodEnum.CHEQUE_DD) {
        hasChequePayment = true;
      }
    }

    return {
      amountPaid: parseFloat(amountPaid.toFixed(2)),
      hasChequePayment,
      txHtml,
      blockingPayment,
    };
  }

  /**
   * HELPER: Determine why approval is required
   */
  private determineApprovalReason(
    thresholdMet: boolean,
    onlinePaymentOnly: boolean,
  ): string | null {
    if (!thresholdMet && !onlinePaymentOnly) {
      return 'OFFLINE_PAYMENT_BELOW_THRESHOLD';
    }
    if (!onlinePaymentOnly) {
      return 'OFFLINE_PAYMENT';
    }
    if (!thresholdMet) {
      return 'BELOW_THRESHOLD';
    }
    return null;
  }

  /**
   * Core function to process unit blocking, approval, and mapping after payment updates.
   * - Checks for existing blocking record in BLOCKED status with valid expiry.
   * - Determines if approval is required based on amount paid, threshold, and payment mode.
   * - Creates or updates VoucherUnitMapping and VoucherUnitBlocking records accordingly.
   */
  async processUnitApprovalAndMapping(
    manager: any,
    voucher: VoucherForm,
    user?: any,
    deferredEvents?: any[],
  ) {
    const { amountPaid, hasChequePayment, txHtml } =
      await this.fetchVoucherPaymentData(manager, voucher.id);

    const blocking = await manager.findOne(VoucherUnitBlocking, {
      where: {
        voucherId: voucher.id,
        status: BlockingStatus.BLOCKED,
        unitBlockExpiry: MoreThan(new Date()),
      },
      relations: ['campaign', 'campaign.unitApprover', 'inventoryUnit'],
    });

    if (!blocking) {
      logger.info(
        `No active blocking record found for Voucher ${voucher.voucherId}, skipping approval and mapping process.`,
      );
      return;
    }

    const amountPayable = voucher.paymentDetails?.amountPayable || 0;
    const preferentialAmt =
      resolveThresholds(
        blocking.campaign,
        voucher,
        blocking.inventoryUnit.configuration,
      ).preferential ?? amountPayable;

    const fullyPaid = amountPaid >= preferentialAmt;
    const onlinePaymentOnly = !hasChequePayment;
    const approvalRequired = !fullyPaid || !onlinePaymentOnly;

    if (!fullyPaid && !user) {
      logger.info(
        `Voucher ${voucher.voucherId} has not met the preferential amount. Amount paid: ${amountPaid}, Preferential amount: ${preferentialAmt}. Skipping mapping and sending for approval until preferential amount is met.`,
      );
      return;
    }

    let approvalExpiry: Date | null = null;
    if (approvalRequired) {
      approvalExpiry = new Date();
      approvalExpiry.setHours(
        approvalExpiry.getHours() + blocking?.campaign?.approvalWindowHours,
      );
    }

    const mapping = await manager.save(VoucherUnitMapping, {
      voucherId: voucher.id,
      inventoryUnitId: blocking.inventoryUnit.id,
      status: approvalRequired
        ? MappingStatus.PENDING_APPROVAL
        : MappingStatus.APPROVED,
      source: onlinePaymentOnly
        ? 'BLOCKED_ONLINE_PAYMENT'
        : 'BLOCKED_OFFLINE_PAYMENT',
      unitNumber: blocking.inventoryUnit.unitNumber,
    });

    blocking.inventoryUnit.isMapped = true;
    await manager.save(ProjectInventoryUnit, blocking.inventoryUnit);

    blocking.mappingId = mapping?.id ?? null;

    const { approveLink, rejectLink } = this.handleApprovalAndTokens(
      blocking,
      voucher,
      amountPaid,
      hasChequePayment,
      approvalRequired,
      approvalExpiry,
    );

    await manager.save(VoucherUnitBlocking, blocking);

    const customerName =
      voucher.applicant1?.personalDetails?.firstName +
      ' ' +
      voucher.applicant1?.personalDetails?.lastName;

    const composeEvent = new ComposeEmailEvent(
      ComposeEmailsEnum.UNIT_APPROVAL_REQUEST,
      {
        APPROVER_NAME: safeString(blocking?.campaign?.unitApprover?.name),
        PROJECT_NAME: safeString(blocking?.campaign?.campaignName),
        CUSTOMER_NAME: customerName,
        PRID: safeString(voucher?.uniqueReferenceId),
        UNIT_NUMBER: blocking?.inventoryUnit?.unitNumber,
        TOWER: blocking?.inventoryUnit?.towerName,
        FLOOR: blocking?.inventoryUnit?.floor,
        TYPOLOGY: blocking?.inventoryUnit?.configuration,
        AMOUNT_PAYABLE: formatIndianAmount(preferentialAmt),
        THRESHOLD_AMOUNT: formatIndianAmount(
          blocking?.campaign?.thresholdAmount,
        ),
        AMOUNT_PAID: formatIndianAmount(
          voucher.paymentDetails?.totalAmountPaid,
        ),
        PAYMENT_MODE: blocking.paymentMode,
        TRANSACTION_DATE: format(new Date(), 'dd MMM yyyy'),
        RM_NAME: safeString(user?.name),
        APPROVE_LINK: approveLink,
        REJECT_LINK: rejectLink,
        TX_ROWS: txHtml,
      },
      BRAND_PURAVANKARA,
      { to: blocking?.campaign?.unitApprover?.email },
    );

    if (Array.isArray(deferredEvents)) {
      deferredEvents.push(composeEvent);
    } else {
      this.eventEmitter.emit(EventMessagesEnum.COMPOSE_EMAIL, composeEvent);
    }

    return {
      statusCode: SUCCESS,
      message: approvalRequired
        ? 'Unit mapped and sent for approval'
        : 'Unit mapped successfully (auto-approved)',
      data: {
        id: blocking.id,
        mappingId: mapping?.id ?? null,
        approvalExpiry,
      },
    };
  }

  private handleApprovalAndTokens(
    blocking,
    voucher,
    amountPaid,
    hasChequePayment,
    approvalRequired,
    approvalExpiry,
  ) {
    const thresholdMet = amountPaid >= blocking?.campaign?.thresholdAmount;

    const onlinePaymentOnly = !hasChequePayment;

    const approvalReason = this.determineApprovalReason(
      thresholdMet,
      onlinePaymentOnly,
    );
    logger.info(
      `Approval reason determined: ${approvalReason} for voucher ${voucher.voucherId}`,
    );
    const sentForApproval = blocking.status === BlockingStatus.PENDING;

    let blockingStatus: BlockingStatus = BlockingStatus.APPROVED;
    if (approvalRequired) {
      blockingStatus = BlockingStatus.PENDING;
    } else if (sentForApproval) {
      blockingStatus = BlockingStatus.QUALIFIED;
    }

    blocking.amountPaid = amountPaid;
    blocking.paymentMode = hasChequePayment ? 'OFFLINE' : 'ONLINE';
    blocking.status = blockingStatus;
    blocking.approvalRequired = approvalRequired;
    blocking.approvalReason = approvalReason;
    blocking.approvalExpiry = approvalExpiry;
    blocking.approvalSource = approvalRequired
      ? 'PENDING_APPROVER'
      : 'AUTOMATIC_ONLINE';

    let approveToken = null;
    let approveLink = null;
    let rejectToken = null;
    let rejectLink = null;

    if (approvalRequired) {
      const approveJti = uuid();
      const rejectJti = uuid();

      const approverId = Number(blocking.campaign?.unitApproverId);
      if (!approverId) throw new Error('Invalid approver');

      const secret =
        this.configService.get<string>('JWT_SECRET') || 'fallback_secret';
      const expiresIn = (this.configService.get<string>('JWT_EXPIRY') ||
        '24h') as any;

      approveToken = jwt.sign(
        {
          blockingId: blocking.id,
          approverId,
          action: EmailActionsEnum.APPROVE,
          jti: approveJti,
        },
        secret,
        { expiresIn },
      );

      rejectToken = jwt.sign(
        {
          blockingId: blocking.id,
          approverId,
          action: EmailActionsEnum.REJECT,
          jti: rejectJti,
        },
        secret,
        { expiresIn },
      );

      blocking.approveJti = approveJti;
      blocking.rejectJti = rejectJti;
      blocking.approveTokenUsed = false;
      blocking.rejectTokenUsed = false;
      blocking.tokenExpiry = approvalExpiry;
    } else {
      blocking.approveJti = null;
      blocking.rejectJti = null;
      blocking.approveTokenUsed = false;
      blocking.rejectTokenUsed = false;
      blocking.tokenExpiry = null;
    }
    const baseUrl = this.configService.get<string>('API_BASE_URL');
    approveLink = `${baseUrl}inventory-unit/blocking-action?token=${approveToken}`;
    rejectLink = `${baseUrl}inventory-unit/blocking-action?token=${rejectToken}`;
    return { approveToken, rejectToken, approveLink, rejectLink };
  }

  private async applyPostPaymentBusinessRules(
    voucherForm: VoucherForm,
    paymentMetrics: any,
    mergedTransactions: any[],
    user?: any,
    manager?: EntityManager,
    deferredEvents?: any[],
  ): Promise<void> {
    let newVoucherFormStatus: VoucherFormStatusEnum;

    if (!user) {
      newVoucherFormStatus =
        this.resolvePostPaymentVoucherFormStatus(voucherForm);
    }

    reconcileTierIdsForCurrentEligibility(
      voucherForm,
      voucherForm.campaign,
      paymentMetrics.validPaidAmount,
    );

    reconcileTierIdsForCurrentEligibility(
      voucherForm,
      voucherForm.campaign,
      paymentMetrics.validPaidAmount,
    );

    const tierConfig = await resolveAndAssignTieredId(
      voucherForm,
      voucherForm.campaign,
      paymentMetrics.validPaidAmount,
      (voucher, id) =>
        this.sendQueueIdAssignmentEmail(voucher, id, deferredEvents),
      (counterField) =>
        allocateCampaignTierCounter(
          manager ?? this.eoiCampaignRepository.manager,
          voucherForm.campaign.id,
          counterField,
        ),
    );

    let metricsForStatusAndQueue = paymentMetrics;
    const recomputedMetrics =
      applyAssignedTierThresholdAmountAndRecomputeMetrics(
        voucherForm,
        voucherForm.campaign,
        tierConfig,
        mergedTransactions,
      );
    if (
      tierConfig &&
      (tierConfig.tier === VoucherIdFieldNameEnum.STD_EOI_ID ||
        tierConfig.tier === VoucherIdFieldNameEnum.PRE_EOI_ID)
    ) {
      markFormSubmittedOnTierChange(voucherForm, tierConfig);
    }
    if (recomputedMetrics) {
      metricsForStatusAndQueue = recomputedMetrics;
    }

    Object.assign(voucherForm, {
      voucherFormStatus: user
        ? voucherForm.voucherFormStatus
        : newVoucherFormStatus,
      paymentStatus: determinePaymentStatus(metricsForStatusAndQueue),
      chronology:
        voucherForm.chronology || determineVoucherChronology(voucherForm),
    });

    if (
      tierConfig &&
      shouldGenerateQueueId(voucherForm, metricsForStatusAndQueue)
    ) {
      await generateAndAssignTieredQueueId(
        voucherForm,
        tierConfig,
        (campaignId, queueType) =>
          this.generateQueueId(campaignId, queueType, manager),
      );
    }
  }

  private resolvePostPaymentVoucherFormStatus(
    voucherForm: VoucherForm,
  ): VoucherFormStatusEnum {
    if (
      voucherForm.voucherFormStatus ===
        VoucherFormStatusEnum.MIS_REQUESTED_CHANGES ||
      voucherForm.voucherFormStatus === VoucherFormStatusEnum.MIS_UPDATED
    ) {
      return VoucherFormStatusEnum.MIS_UPDATED;
    }

    if (
      voucherForm.voucherFormStatus ===
        VoucherFormStatusEnum.CRM_REQUESTED_CHANGES ||
      voucherForm.voucherFormStatus === VoucherFormStatusEnum.CRM_UPDATED
    ) {
      return VoucherFormStatusEnum.CRM_UPDATED;
    }

    if (
      voucherForm.voucherFormStatus === VoucherFormStatusEnum.CREATED ||
      voucherForm.voucherFormStatus === VoucherFormStatusEnum.IN_PROGRESS
    ) {
      voucherForm.submittedAt = new Date();

      return VoucherFormStatusEnum.UNVERIFIED;
    }

    return undefined;
  }

  /**
   * Helper to update existing non-gateway payments and create new ones within a transaction.
   * Updates payments with existing IDs, creates new ones without IDs.
   * Preserves existing chequeDepositSlip for existing payments if not provided in the update.
   *
   * @param manager - The entity manager for the transaction
   * @param voucherForm - The voucher form entity
   * @param payments - Array of payment transactions from DTO
   * @param existingPaymentsMap - Map of existing payments by ID (already fetched)
   */
  async syncVoucherPaymentsInTransaction(
    manager: any,
    voucherForm: VoucherForm,
    payments: any[],
    existingPaymentsMap: Map<number, VoucherPayment>,
    user?: any,
    deferredEvents?: any[],
  ): Promise<void> {
    try {
      // Gateway payments are written elsewhere; this path is RM/offline (cheque, etc.) only.
      const nonGatewayPayments = payments.filter(
        (payment) => payment.paymentMode !== PaymentModeEnum.GATEWAY,
      );

      if (nonGatewayPayments.length === 0) {
        await this.processUnitApprovalAndMapping(
          manager,
          voucherForm,
          user,
          deferredEvents,
        );
        return;
      }

      // Check if voucher has a unit mapping
      const unitBlocking = await manager.findOne(VoucherUnitBlocking, {
        where: { voucherId: voucherForm.id },
      });
      const isUnitMapped = !!unitBlocking;

      const paymentsToUpsert = nonGatewayPayments.map((paymentDto) => {
        const existingPayment = paymentDto.id
          ? existingPaymentsMap.get(paymentDto.id)
          : null;

        const existingChequeDepositSlip =
          existingPayment?.paymentDetails?.chequeDepositSlip;
        const newChequeDepositSlip =
          paymentDto.paymentDetails?.chequeDepositSlip ?? null;

        // Partial PATCH from RM shouldn't wipe an already-uploaded slip.
        const chequeDepositSlip =
          newChequeDepositSlip ?? existingChequeDepositSlip;

        // Final JSON blob written to `payment_details` (used to derive `voucher_transaction_id`).
        const paymentDetails = {
          ...paymentDto.paymentDetails,
          paymentProof: paymentDto.paymentDetails?.paymentProof || [],
          isPhysicalPaymentProof:
            paymentDto.paymentDetails?.isPhysicalPaymentProof || false,
          ...(chequeDepositSlip !== undefined && {
            chequeDepositSlip,
          }),
        };

        return {
          id: paymentDto.id || undefined,
          voucher: voucherForm,
          paidAmount: paymentDto.paidAmount,
          paymentMode: paymentDto.paymentMode,
          method: paymentDto.method,
          date: paymentDto.date || new Date().toISOString().split('T')[0],
          status: paymentDto.status || PaymentTxStatusEnum.UNVERIFIED,
          paymentDetails,
          // TypeORM `upsert` does not run entity @BeforeInsert/@BeforeUpdate hooks — set explicitly.
          voucherTransactionId:
            deriveVoucherTransactionIdFromPaymentDetails(paymentDetails),
          isUnitMapped,
        };
      });

      // One round-trip for inserts + updates on this voucher's non-gateway rows.
      await manager.upsert(VoucherPayment, paymentsToUpsert, {
        conflictPaths: ['id', 'voucher'],
        skipUpdateIfNoValuesChanged: true,
      });

      // After syncing payments, re-fetch the voucher form to get updated relations for unit approval and mapping.
      await this.processUnitApprovalAndMapping(
        manager,
        voucherForm,
        user,
        deferredEvents,
      );
    } catch (error) {
      logger.error('Error syncing voucher payments:', error);
      throw error;
    }
  }

  /**
   * Function to delete applicant details from a voucher form.
   * Removes applicant data and decrements the total applicant count.
   * Sets customerLastUpdatedAt timestamp when customer makes changes.
   *
   * @param voucherId - The unique voucher ID string
   * @param applicantNumber - The applicant number to delete (2-4)
   * @returns Success message and updated voucher form data
   * @throws BadRequestException when applicant number is invalid or applicant doesn't exist
   * @throws NotFoundException when voucher form is not found
   */
  async deleteApplicantDetails(
    voucherId: string,
    applicantNumber: number,
  ): Promise<any> {
    try {
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { voucherId, isDeleted: false },
      });

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      if (applicantNumber < 2 || applicantNumber > 4) {
        throw new BadRequestException(
          'Applicant number must be between 2 and 4',
        );
      }

      const applicantKey = `applicant${applicantNumber}`;
      if (!voucherForm[applicantKey]) {
        throw new BadRequestException(
          `Applicant ${applicantNumber} does not exist`,
        );
      }

      voucherForm[applicantKey] = null;
      voucherForm.noOfApplicants -= 1;
      voucherForm.customerLastUpdatedAt = new Date();

      const updatedVoucherForm =
        await this.voucherFormRepository.save(voucherForm);
      await this.refreshCacheToken(voucherForm.userVoucherTrackingId);
      return {
        success: true,
        message: `Applicant ${applicantNumber} details deleted successfully`,
        data: updatedVoucherForm,
      };
    } catch (error) {
      logger.error('Error deleting applicant details:', error);
      throw error;
    }
  }

  /**
   * Function to reset a voucher form to its initial state.
   * Clears all applicant, unit, payment, and source details.
   * Resets form status to IN_PROGRESS and step counter to 0.
   * Sets customerLastUpdatedAt timestamp when customer makes changes.
   *
   * @param voucherId - The unique voucher ID string
   * @returns Success message and reset voucher form data
   * @throws NotFoundException when voucher form is not found
   */
  async resetVoucherForm(voucherId: string): Promise<any> {
    try {
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { voucherId, isDeleted: false },
      });

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      voucherForm.applicant1 = null;
      voucherForm.applicant2 = null;
      voucherForm.applicant3 = null;
      voucherForm.applicant4 = null;
      voucherForm.unitDetails = null;
      voucherForm.paymentDetails = null;
      voucherForm.sourceDetails = null;
      voucherForm.isAgreedOnTerms = null;
      voucherForm.voucherFormStatus = VoucherFormStatusEnum.IN_PROGRESS;
      voucherForm.lastStep = 0;
      voucherForm.customerLastUpdatedAt = new Date();

      const updatedVoucherForm =
        await this.voucherFormRepository.save(voucherForm);
      await this.refreshCacheToken(voucherForm.userVoucherTrackingId);
      return {
        success: true,
        message: 'Voucher form reset successfully',
        data: updatedVoucherForm,
      };
    } catch (error) {
      logger.error('Error resetting voucher form:', error);
      throw error;
    }
  }

  /**
   * Function to enable editing of a voucher form.
   * Updates the voucher form status and last step to allow customer modifications.
   * Sets customerLastUpdatedAt timestamp when customer makes changes.
   *
   * @param voucherId - The unique voucher ID string
   * @param voucherStatus - The new voucher form status to set
   * @param lastStep - The last completed step number
   * @returns Success message and updated voucher form data
   * @throws NotFoundException when voucher form is not found
   */
  async enableEditForm(
    voucherId: string,
    voucherStatus: VoucherFormStatusEnum,
    lastStep: number,
  ): Promise<any> {
    try {
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { voucherId, isDeleted: false },
      });

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      // Update the voucher form status and last step
      voucherForm.voucherFormStatus =
        voucherStatus ?? voucherForm.voucherFormStatus;
      voucherForm.lastStep = lastStep ?? voucherForm.lastStep;
      voucherForm.customerLastUpdatedAt = new Date();

      const updatedVoucherForm =
        await this.voucherFormRepository.save(voucherForm);
      await this.refreshCacheToken(voucherForm.userVoucherTrackingId);
      return {
        success: true,
        message: 'Voucher form edit enabled successfully',
        data: updatedVoucherForm,
      };
    } catch (error) {
      logger.error('Error enabling voucher form edit:', error);
      throw error;
    }
  }

  /**
   * Function to send OTP for voucher form verification.
   * Generates a 6-digit OTP and sends it to the applicant's email address.
   * Implements rate limiting and prevents spam by enforcing delays between requests.
   *
   * @param voucherId - The unique voucher ID string
   * @returns Success message indicating OTP has been sent
   * @throws BadRequestException when voucher form is not in SUBMITTED status or email not found
   * @throws NotFoundException when voucher form is not found
   * @throws InternalServerErrorException when OTP generation or email sending fails
   */
  async sendOtp(voucherId: string): Promise<any> {
    try {
      const { email, name, userVoucherTrackingId } =
        await this.validateVoucherForOtp(voucherId);

      await this.processOtpRequest(
        voucherId,
        name,
        email,
        false,
        userVoucherTrackingId,
      );

      return {
        statusCode: SUCCESS,
        message:
          "We've sent a 6-digit confirmation code to your email. Please enter the code below to verify your email address. The code is valid for 10 minutes.",
        data: null,
      };
    } catch (error) {
      logger.error('Error in sending voucher OTP', error?.message || error);
      logsAndErrorHandling('VoucherFormsService - sendOtp', error, {
        voucherId,
      });
    }
  }

  /**
   * Private helper function to check if the user has exceeded the maximum allowed OTP attempts.
   * Implements a sliding window approach to track failed attempts within a 10-minute period.
   * Throws BadRequestException if the limit is reached.
   *
   * @param voucherId - The voucher ID to check attempts for
   * @throws BadRequestException when maximum OTP attempts are exceeded
   */
  private async checkOtpAttemptLimit(
    userVoucherTrackingId: string,
  ): Promise<void> {
    const maxOtpAttemptsRedisKey = `voucher_otp_attempts:${userVoucherTrackingId.toLowerCase()}`;
    // Check how many failed attempts were made

    const attemptCount = (await this.cacheService.get<any>(
      maxOtpAttemptsRedisKey,
    )) || {
      attemptCount: 0,
      expiresAt: new Date(),
    };

    // Ensure we have a valid object structure
    if (!attemptCount || typeof attemptCount !== 'object') {
      return;
    }

    const currentTime = new Date();
    const expiresAt = attemptCount.expiresAt
      ? new Date(attemptCount.expiresAt)
      : new Date();
    const windowAge = currentTime.getTime() - expiresAt.getTime();

    // Reset attempt count if the window expired (10 minutes)
    if (windowAge >= OTP_EXPIRY_TTL_MS) {
      return;
    }

    if (attemptCount.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Too many failed OTP attempts. Please try again later.',
      );
    }
  }

  /**
   * Private helper function to generate and send OTP for voucher verification.
   * Creates a secure hashed OTP, stores it in Redis with expiration, and triggers email dispatch.
   * Handles resend tracking and implements proper error handling for email failures.
   *
   * @param voucherId - The voucher ID
   * @param name - The applicant's name for email personalization
   * @param email - The applicant's email address
   * @param resendData - Optional resend tracking data for rate limiting
   * @returns True on successful OTP generation and email dispatch
   * @throws InternalServerErrorException when OTP generation or email sending fails
   */
  private async generateAndSendVoucherOtp(
    voucherId: string,
    name: string,
    email: string,
    userVoucherTrackingId: string,
    resendData?: { resendCount: number; windowStart: Date; lastSentAt: Date },
  ): Promise<any> {
    try {
      const otpRedisKey = `voucher_otp:${userVoucherTrackingId.toLowerCase()}`;
      const otp = generateOtp();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + OTP_EXPIRY_TTL_MS); // 10 minutes validity

      const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

      const otpCache = {
        otp: hashedOtp,
        expiresAt,
        resendCount: resendData?.resendCount ?? 0,
        windowStart: resendData?.windowStart ?? now,
        lastSentAt: resendData?.lastSentAt ?? now,
        voucherId, // Store voucherId for verification
      };

      // Save OTP data to Redis
      await this.cacheService.set(otpRedisKey, otpCache, OTP_CACHE_TTL); // 10 min TTL

      const composeResponses = await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.VOUCHER_OTP,
          { NAME: name, OTP: otp },
          BRAND_PURAVANKARA,
          { to: email },
        ),
      );
      if (composeResponses.some((r) => r instanceof Error)) {
        logger.error('Email dispatch error', composeResponses);
        throw new InternalServerErrorException(
          composeResponses[0]?.message ||
            'Failed to send OTP. Please try again later.',
        );
      }

      return true;
    } catch (error) {
      logger.error(
        'Error generating/sending voucher OTP',
        error?.message || error,
      );
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException(
            'An error occurred while generating or sending the OTP.',
          );
    }
  }

  /**
   * Function to verify OTP for voucher form verification.
   * Validates the provided OTP against the stored hashed value in Redis.
   * Implements attempt tracking and prevents brute force attacks.
   * Cleans up OTP cache on successful verification.
   *
   * @param voucherId - The unique voucher ID string
   * @param otp - The 6-digit OTP to verify
   * @returns Success message and verification confirmation
   * @throws BadRequestException when OTP format is invalid, OTP is expired, or maximum attempts exceeded
   * @throws NotFoundException when voucher form is not found
   * @throws UnauthorizedException when OTP is incorrect
   * @throws InternalServerErrorException when unexpected errors occur during verification
   */
  async verifyOtp(voucherId: string, otp: string): Promise<any> {
    try {
      // Validate OTP format
      if (!OTP_REGEX.test(otp)) {
        throw new BadRequestException(
          'Invalid OTP format. OTP must be a 6-digit number.',
        );
      }

      // First, get the voucher form and validate it
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { voucherId, isDeleted: false },
      });

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      // Check if the voucher form is in SUBMITTED status
      if (voucherForm.voucherFormStatus !== VoucherFormStatusEnum.UNVERIFIED) {
        throw new BadRequestException(
          'Verification is required only for submitted voucher forms',
        );
      }

      // Get redis keys for otp and max otp attempts
      const otpRedisKey = `voucher_otp:${voucherForm?.userVoucherTrackingId.toLowerCase()}`;
      const maxOtpAttemptsRedisKey = `voucher_otp_attempts:${voucherForm?.userVoucherTrackingId.toLowerCase()}`;

      const hashedInputOtp = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

      // Check how many failed attempts were made
      await this.checkOtpAttemptLimit(voucherForm?.userVoucherTrackingId);

      // Get OTP cache from Redis
      const cached = await this.cacheService.get<any>(otpRedisKey);
      if (!cached) {
        throw new BadRequestException(
          'This OTP is invalid. Please request a new one to continue.',
        );
      }

      // Check OTP expiry
      if (new Date() > new Date(cached.expiresAt)) {
        await this.cacheService.del(otpRedisKey);
        throw new BadRequestException(
          'This OTP has expired. Please request a new one to continue.',
        );
      }

      // Validate OTP match
      if (cached.otp !== hashedInputOtp) {
        // Retrieve current attempt count and cache value
        let cacheValue = await this.cacheService.get<any>(
          maxOtpAttemptsRedisKey,
        );
        const now = new Date();
        if (
          !cacheValue ||
          (cacheValue.expiresAt && new Date() > new Date(cacheValue.expiresAt))
        ) {
          // First time or expired: reset attemptCount and expiresAt
          cacheValue = {
            attemptCount: 1,
            expiresAt: new Date(now.getTime() + OTP_EXPIRY_TTL_MS),
          };
        } else {
          // Increment attemptCount, keep original expiresAt
          cacheValue = {
            ...cacheValue,
            attemptCount: (cacheValue.attemptCount || 0) + 1,
          };
        }
        await this.cacheService.set(
          maxOtpAttemptsRedisKey,
          cacheValue,
          OTP_CACHE_TTL,
        ); // 10 min TTL
        if (cacheValue.attemptCount >= OTP_MAX_ATTEMPTS) {
          throw new BadRequestException(
            'You have exceeded the maximum number of incorrect OTP attempts. Please request a new OTP after some time to continue.',
          );
        }
        throw new UnauthorizedException(
          'The OTP you entered is incorrect. Please try again.',
        );
      }
      await this.cacheService.del(maxOtpAttemptsRedisKey); // delete attempts on success

      // Mark the voucher form as verified by updating a customerLastUpdatedAt timestamp
      await this.voucherFormRepository.update(
        { voucherId },
        { customerLastUpdatedAt: new Date() },
      );
      await this.refreshCacheToken(voucherForm.userVoucherTrackingId);
      return {
        statusCode: SUCCESS,
        message:
          'OTP verified successfully. Your voucher form has been verified.',
        data: {
          voucherId: voucherForm.voucherId,
          verified: true,
        },
      };
    } catch (error) {
      logger.error('Error in verifying voucher OTP', error?.message || error);
      logsAndErrorHandling('VoucherFormsService - verifyOtp', error, {
        voucherId,
      });
    }
  }

  /**
   * Function to resend OTP for voucher form verification.
   * Implements rate limiting to prevent spam and abuse.
   * Enforces minimum delays between resend requests and tracks resend attempts.
   *
   * @param voucherId - The unique voucher ID string
   * @returns Success message indicating OTP has been resent
   * @throws BadRequestException when voucher form is not in SUBMITTED status, email not found, or rate limits exceeded
   * @throws NotFoundException when voucher form is not found
   * @throws InternalServerErrorException when OTP generation or email sending fails
   */
  async resendOtp(voucherId: string): Promise<any> {
    try {
      const { email, name, userVoucherTrackingId } =
        await this.validateVoucherForOtp(voucherId);

      await this.processOtpRequest(
        voucherId,
        name,
        email,
        true,
        userVoucherTrackingId,
      );

      return {
        statusCode: SUCCESS,
        message: 'OTP has been resent to your email address.',
        data: null,
      };
    } catch (error) {
      logger.error('Error in resending voucher OTP', error?.message || error);
      logsAndErrorHandling('VoucherFormsService - resendOtp', error, {
        voucherId,
      });
    }
  }

  /**
   * Private helper function to validate voucher form for OTP operations.
   * Ensures the voucher form exists and is in SUBMITTED status.
   * Extracts email address and applicant name for OTP processing.
   *
   * @param voucherId - The voucher ID to validate
   * @returns Object containing email address and applicant name
   * @throws NotFoundException when voucher form is not found
   * @throws BadRequestException when voucher form is not in SUBMITTED status or email address is missing
   */
  private async validateVoucherForOtp(voucherId: string): Promise<{
    email: string;
    name: string;
    userVoucherTrackingId: string;
  }> {
    // Get the voucher form and validate it
    const voucherForm = await this.voucherFormRepository.findOne({
      where: { voucherId, isDeleted: false },
    });

    if (!voucherForm) {
      throw new NotFoundException('Voucher form not found');
    }

    // Check if the voucher form is in SUBMITTED status
    if (voucherForm.voucherFormStatus !== VoucherFormStatusEnum.UNVERIFIED) {
      throw new BadRequestException(
        'Verification is required only for submitted voucher forms',
      );
    }

    // Get the email from applicant1
    const email = voucherForm.applicant1?.personalDetails?.emailAddress;
    if (!email) {
      throw new BadRequestException(
        'No email address found for the primary applicant',
      );
    }

    // Get the name from applicant1
    const firstName = voucherForm.applicant1?.personalDetails?.firstName || '';
    const lastName = voucherForm.applicant1?.personalDetails?.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || 'Customer';
    const userVoucherTrackingId = voucherForm?.userVoucherTrackingId || null;
    return { email, name, userVoucherTrackingId };
  }

  /**
   * Private helper function to process OTP requests with comprehensive rate limiting.
   * Implements resend logic with configurable delays and attempt limits.
   * Prevents abuse by enforcing minimum delays between requests and maximum resend attempts.
   *
   * @param voucherId - The voucher ID
   * @param name - The applicant's name
   * @param email - The applicant's email address
   * @param isResend - Whether this is a resend request (affects error messages and rate limiting)
   * @throws BadRequestException when rate limits are exceeded or delays are not respected
   */
  private async processOtpRequest(
    voucherId: string,
    name: string,
    email: string,
    isResend: boolean,
    userVoucherTrackingId: string,
  ): Promise<void> {
    const otpRedisKey = `voucher_otp:${userVoucherTrackingId.toLowerCase()}`;
    // Check how many failed attempts were made
    await this.checkOtpAttemptLimit(userVoucherTrackingId);

    const now = new Date();
    const existingOtpCache = await this.cacheService.get<any>(otpRedisKey);

    if (existingOtpCache) {
      const { resendCount, windowStart, lastSentAt } = existingOtpCache;
      const lastSentTime = new Date(lastSentAt);
      const milisecondsSinceLastSend = now.getTime() - lastSentTime.getTime();

      // Enforce minimum delay between requests
      if (milisecondsSinceLastSend < OTP_RESEND_TTL_MS) {
        const message = isResend
          ? 'You must wait at least 60 seconds before resending the OTP.'
          : 'Please wait at least 60 seconds before requesting a new OTP. This helps keep your account secure and prevents spam.';

        throw new BadRequestException(message);
      }

      // Check how long the resend window has been open
      const windowAge = now.getTime() - new Date(windowStart).getTime();

      // Reset resend count if window expired, else increment
      const updatedCache = {
        userVoucherTrackingId,
        resendCount: windowAge >= OTP_EXPIRY_TTL_MS ? 1 : resendCount + 1,
        windowStart:
          windowAge >= OTP_EXPIRY_TTL_MS ? now : new Date(windowStart),
        lastSentAt: now,
      };

      // Prevent excessive resends within the same time window
      if (
        windowAge < OTP_EXPIRY_TTL_MS &&
        updatedCache.resendCount > OTP_MAX_RESEND_COUNT
      ) {
        throw new BadRequestException(
          'You have reached the maximum number of OTP resend attempts. Please try again later.',
        );
      }

      // Generate the OTP with updated cache
      await this.generateAndSendVoucherOtp(
        voucherId,
        name,
        email,
        userVoucherTrackingId,
        updatedCache,
      );
    } else {
      // No existing cache, treat as fresh OTP request
      await this.generateAndSendVoucherOtp(
        voucherId,
        name,
        email,
        userVoucherTrackingId,
      );
    }
  }

  /**
   * Function to delete a specific payment from a voucher form.
   * Validates that the payment exists and belongs to the specified voucher.
   * Updates payment metrics and voucher status after deletion.
   *
   * @param deletePaymentsDto - DTO containing paymentId and voucherId
   * @returns Success message and updated voucher form data
   * @throws NotFoundException when voucher form or payment not found
   * @throws BadRequestException when payment doesn't belong to the voucher
   */
  async deletePaymentDetails(
    deletePaymentsDto: DeletePaymentsDto,
  ): Promise<any> {
    try {
      const { paymentId, voucherId } = deletePaymentsDto;

      // First, verify the voucher form exists
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { voucherId, isDeleted: false },
        relations: ['campaign'],
      });

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      // Find the specific payment
      const payment = await this.voucherFormRepository.manager.findOne(
        VoucherPayment,
        {
          where: {
            id: paymentId,
            voucher: { id: voucherForm.id },
          },
        },
      );

      if (!payment) {
        throw new NotFoundException(
          'Payment not found or does not belong to this voucher',
        );
      }

      // Delete the payment
      await this.voucherFormRepository.manager.remove(payment);

      // Get all remaining payments for this voucher to recalculate metrics
      const remainingPayments = await this.voucherFormRepository.manager
        .createQueryBuilder(VoucherPayment, 'payment')
        .where('payment.voucher = :voucherId', { voucherId: voucherForm.id })
        .getMany();

      // Recalculate payment metrics
      const paymentMetrics = calculatePaymentMetrics(
        remainingPayments,
        voucherForm.paymentDetails?.amountPayable || 0,
      );

      // Update voucher form payment details and status
      voucherForm.paymentDetails = {
        ...voucherForm.paymentDetails,
        totalAmountPaid: paymentMetrics.totalPaidAmount,
      };
      voucherForm.paymentStatus = determinePaymentStatus(paymentMetrics);
      voucherForm.customerLastUpdatedAt = new Date();

      // Save the updated voucher form
      const updatedVoucherForm =
        await this.voucherFormRepository.save(voucherForm);

      return {
        success: true,
        message: 'Payment deleted successfully',
        data: updatedVoucherForm,
      };
    } catch (error) {
      logger.error('Error deleting payment details:', error);
      throw error;
    }
  }

  async requestCancellation(
    requestCancellationDto: RequestCancellationDto,
  ): Promise<any> {
    try {
      const { voucherId, cancelReason } = requestCancellationDto;

      const voucherForm = await this.voucherFormRepository.findOne({
        where: { voucherId, isDeleted: false },
        relations: ['createdBy'],
      });

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      const nonCancellableStatuses = new Set([
        VoucherFormStatusEnum.CANCEL_REQUESTED,
        VoucherFormStatusEnum.CANCEL_ACCEPTED,
        VoucherFormStatusEnum.CANCEL_APPROVED,
        VoucherFormStatusEnum.REFUND_INITIATED,
        VoucherFormStatusEnum.CANCELLED,
      ]);

      if (nonCancellableStatuses.has(voucherForm.voucherFormStatus)) {
        throw new BadRequestException(
          'The voucher has already been sent for cancellation',
        );
      }

      const { updateFields } = buildCancellationUpdate(voucherForm, {
        status: VoucherFormStatusEnum.CANCEL_REQUESTED,
        cancelReason,
        reasonActor: ReasonActorEnum.CUSTOMER,
      });

      await this.voucherFormRepository.update(
        { voucherId },
        { ...updateFields, cancelledFrom: voucherForm.voucherFormStatus },
      );

      // Get customer email and name
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;
      const customerName =
        `${voucherForm.applicant1?.personalDetails?.firstName || ''} ${voucherForm.applicant1?.personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      // Send email to customer about cancellation request
      if (customerEmail) {
        void this.eventEmitter
          .emitAsync(
            EventMessagesEnum.COMPOSE_EMAIL,
            new ComposeEmailEvent(
              ComposeEmailsEnum.CUSTOMER_REQUESTED_CANCELLATION,
              {
                CUSTOMER_NAME: customerName,
              },
              BRAND_PURAVANKARA,
              { to: customerEmail },
            ),
          )
          .catch((error) => {
            logger.error(
              'Failed to send cancellation request email to customer',
              error,
            );
          });
      }

      // Notify RM via email
      const rmEmail = (voucherForm as any)?.createdBy?.email || null;
      const rmName = (voucherForm as any)?.createdBy?.name || null;
      const uniqueRefNumber = voucherForm.uniqueReferenceId;

      if (rmEmail) {
        void this.eventEmitter
          .emitAsync(
            EventMessagesEnum.COMPOSE_EMAIL,
            new ComposeEmailEvent(
              ComposeEmailsEnum.RM_REQUESTED_CANCELLATION,
              {
                rmName,
                customerName,
                uniqueRefNumber,
                cancellationReason: cancelReason,
              },
              BRAND_PURAVANKARA,
              { to: rmEmail },
            ),
          )
          .catch((err) => logger.error('Email dispatch error', err));
      }

      return {
        success: true,
        message: 'Cancellation requested successfully',
        data: null,
      };
    } catch (error) {
      logger.error('Error requesting cancellation:', error);
      throw error;
    }
  }

  async myVoucherslisting(id: string): Promise<{
    data: {
      vouchers: { voucherId: string; uniqueReferenceId: string | null }[];
      count: number;
    };
  }> {
    // 1) Get userVoucherTrackingId using provided id
    const baseRaw = await this.voucherFormRepository
      .createQueryBuilder('v')
      .select('v.user_voucher_tracking_id', 'userVoucherTrackingId')
      .where('v.voucher_id = :id', { id })
      .andWhere('v.is_deleted = false')
      .getRawOne<{ userVoucherTrackingId: string | null }>();

    if (!baseRaw) throw new NotFoundException('Voucher record not found');

    const { userVoucherTrackingId } = baseRaw;

    if (!userVoucherTrackingId)
      throw new BadRequestException(
        'Record is missing user voucher tracking information',
      );

    // 2) Fetch all vouchers with the same userVoucherTrackingId
    const vouchers = await this.voucherFormRepository
      .createQueryBuilder('v')
      .select('v.voucher_id', 'voucherId')
      .addSelect('v.unique_reference_id', 'uniqueReferenceId')
      .where('v.user_voucher_tracking_id = :userVoucherTrackingId', {
        userVoucherTrackingId,
      })
      .andWhere('v.is_deleted = false')
      .andWhere('v.voucher_id <> :id', { id }) // exclude the original record
      .getRawMany<{ voucherId: string; uniqueReferenceId: string | null }>();
    // 3) Return response in same structure
    return { data: { vouchers, count: vouchers.length } };
  }

  async refreshCacheToken(unqueId: string) {
    const otpRedisKey = `voucher_otp:${unqueId.toLowerCase()}`;
    await this.cacheService.set(otpRedisKey, { lastVerifiedAt: new Date() });
  }

  /**
   * Private helper method to send payment confirmation emails for new payments.
   * Sends email to customer when a new payment is added (not existing in voucherPayments table).
   * Non-blocking - errors are logged but don't affect the API response.
   *
   * @param voucherForm - The voucher form entity
   * @param newPayments - Array of new payment objects that were just created
   */
  // eslint-disable-next-line
  async sendPaymentConfirmationEmails(
    voucherForm: VoucherForm,
    newPayments: any[],
    deferredEvents?: any[],
  ): Promise<void> {
    try {
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;
      if (!customerEmail) {
        logger.warn(
          `No email address found for voucher ${voucherForm.voucherId} - skipping payment confirmation email`,
        );
        return;
      }

      const firstName =
        voucherForm.applicant1?.personalDetails?.firstName || '';
      const lastName = voucherForm.applicant1?.personalDetails?.lastName || '';
      const customerName = `${firstName} ${lastName}`.trim() || 'Customer';

      // One composed mail per *new* payment row (RM often appends several cheques in one update).
      for (const payment of newPayments) {
        let paymentModeDisplay = '';
        if (payment.paymentMode === PaymentModeEnum.GATEWAY) {
          paymentModeDisplay =
            payment.paymentDetails?.method || PaymentModeEnum.GATEWAY;
        } else {
          paymentModeDisplay =
            payment.paymentDetails?.method || PaymentModeEnum.OFFLINE;
        }

        const amount = `${Number(payment.paidAmount || 0).toLocaleString(DATE_LOCALE)}`;

        // Whatever ref the customer would recognise — gateway id, cheque no, or fallback to row id.
        const transactionId =
          payment.paymentDetails?.transactionNumber ||
          payment.paymentDetails?.gatewayPaymentId ||
          payment.paymentDetails?.chequeNumber ||
          payment.id?.toString() ||
          'N/A';

        const paymentDate = toDisplayDate(payment.date || new Date());

        const ev = new ComposeEmailEvent(
          ComposeEmailsEnum.PAYMENT_CONFIRMATION,
          {
            CUSTOMER_NAME: customerName,
            AMOUNT: amount,
            PAYMENT_MODE: paymentModeDisplay,
            TRANSACTION_ID: transactionId,
            DATE: paymentDate,
          },
          BRAND_PURAVANKARA,
          { to: customerEmail },
        );
        if (Array.isArray(deferredEvents)) deferredEvents.push(ev);
        else this.eventEmitter.emit(EventMessagesEnum.COMPOSE_EMAIL, ev);
      }

      logger.info(
        `Payment confirmation emails sent for ${newPayments.length} new payment(s) for voucher ${voucherForm.voucherId}`,
      );
    } catch (error) {
      logger.error('Error sending payment confirmation emails', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Customer email when a tier reference id is minted — passed as `sendEmailCallback` into
   * `resolveAndAssignTieredId` (eoi.helper); `paidVoucherId` param is the generated id string for that tier.
   */
  async sendQueueIdAssignmentEmail(
    voucherForm: VoucherForm,
    paidVoucherId: string,
    deferredEvents?: any[],
  ): Promise<void> {
    try {
      const voucherId =
        voucherForm.financeStatus === PaymentTxStatusEnum.VERIFIED
          ? paidVoucherId
          : MASKED_QUEUE_ID;
      // Get customer email and name
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;
      if (!customerEmail) {
        logger.warn(
          `No email address found for voucher ${voucherForm.voucherId} - skipping queue ID assignment email`,
        );
        return;
      }

      const firstName =
        voucherForm.applicant1?.personalDetails?.firstName || '';
      const lastName = voucherForm.applicant1?.personalDetails?.lastName || '';
      const customerName = `${firstName} ${lastName}`.trim() || 'Customer';

      // Get thank you page link (placeholder - to be configured)
      const thankYouPageLink = '#';

      const rmUserId = voucherForm?.closingRm?.id ?? voucherForm?.createdBy?.id;
      const user = await this.userRepository.findOne({
        where: { id: rmUserId },
        select: { id: true, email: true },
      });

      const ev = new ComposeEmailEvent(
        ComposeEmailsEnum.QUEUE_ID_ASSIGNED,
        {
          CUSTOMER_NAME: customerName,
          VOUCHER_ID: voucherId,
          THANK_YOU_PAGE_LINK: thankYouPageLink,
          RM_EMAIL: user?.email ?? '',
          UNIQUE_REFERENCE_ID: voucherForm.uniqueReferenceId,
        },
        BRAND_PURAVANKARA,
        { to: customerEmail },
      );
      if (Array.isArray(deferredEvents)) deferredEvents.push(ev);
      else this.eventEmitter.emit(EventMessagesEnum.COMPOSE_EMAIL, ev);

      logger.info(
        `Voucher ID assignment email sent for voucher ${voucherForm.voucherId}`,
      );
    } catch (error) {
      logger.error('Error sending queue ID assignment email', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Private helper method to send voucher submission confirmation email.
   * Sends email to customer when voucher form is submitted (saveForLater is false).
   * Non-blocking - errors are logged but don't affect the API response.
   *
   * @param voucherForm - The voucher form entity
   */
  async sendVoucherSubmissionEmail(voucherForm: VoucherForm): Promise<void> {
    try {
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;

      if (!customerEmail) {
        logger.warn(
          `No email address found for voucher ${voucherForm.voucherId} - skipping voucher submission email`,
        );
        return;
      }

      const firstName =
        voucherForm.applicant1?.personalDetails?.firstName || '';
      const lastName = voucherForm.applicant1?.personalDetails?.lastName || '';
      const customerName = `${firstName} ${lastName}`.trim() || 'Customer';

      const puravankaraBaseUrl = this.configService.get<string>(
        'PURAVANKARA_BASE_URL',
      );

      const configOptions = {
        voucherFormUrl: `${puravankaraBaseUrl}/${VOUCHER_FORM_URL}`,
        nodeEnv: this.configService.get<string>('NODE_ENV'),
        formType: voucherForm.formPhase,
      };

      // Resume / view link — phase in config drives which journey URL helper builds.
      const customerPageLink = generateVoucherFormUrl(
        voucherForm.voucherId,
        configOptions,
      );

      const queueIdMessage = this.buildQueueIdMessage(voucherForm);
      const rmUserId = voucherForm?.closingRm?.id ?? voucherForm?.createdBy?.id;
      const user = await this.userRepository.findOne({
        where: { id: rmUserId },
        select: { id: true, email: true },
      });
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.VOUCHER_SUBMITTED,
          {
            CUSTOMER_NAME: customerName,
            QUEUE_ID_MESSAGE: queueIdMessage,
            CUSTOMER_PAGE_LINK: customerPageLink,
            RM_EMAIL: user?.email ?? '',
            UNIQUE_REFERENCE_ID: voucherForm.uniqueReferenceId,
          },
          BRAND_PURAVANKARA,
          { to: customerEmail },
        ),
      );

      logger.info(
        `Voucher submission email sent for voucher ${voucherForm.voucherId}`,
      );
    } catch (error) {
      logger.error('Error sending voucher submission email', error);
    }
  }

  private buildQueueIdMessage(voucherForm: VoucherForm): string {
    if (voucherForm.paidVoucherId) {
      // Paid voucher ID already on file — wording shifts to realisation / next steps, not "pending full amount".
      return `Your Voucher ID will be shared post realisation of the payment. `;
    }

    const campaign = voucherForm.campaign;
    let amount: number | null = null;

    if (voucherForm.formPhase === VoucherFormType.VOUCHER) {
      amount = campaign?.voucherAmount ?? null;
    } else if (voucherForm.formPhase === VoucherFormType.EOI) {
      // Amount that "complete payment" refers to depends on which EOI band they're on.
      if (voucherForm.eoiDetails?.eoiType === EOITypeEnum.PREFERENTIAL) {
        amount = campaign?.preEoiAmount ?? null;
      } else if (voucherForm.eoiDetails?.eoiType === EOITypeEnum.STANDARD) {
        amount = campaign?.stdEoiAmount ?? null;
      }
    }

    const formattedAmount =
      amount && amount > 0
        ? `₹ ${Number(amount).toLocaleString(DATE_LOCALE)}`
        : 'the complete amount';

    return `Voucher ID Assignment Pending! Final Voucher ID will be assigned once the complete amount of ${formattedAmount} is received.`;
  }

  /**
   * Private helper method to send form submitted notification to RM and MIS.
   * Sends email to createdBy (RM) and misChecker (MIS) when form is submitted.
   * Non-blocking - errors are logged but don't affect the API response.
   *
   * @param voucherForm - The voucher form entity with relations
   * @param submittedBy - Name of who submitted the form ('Customer' or RM name)
   */
  async sendFormSubmittedNotificationToRmMis(
    voucherForm: VoucherForm,
    submittedBy: string,
  ): Promise<void> {
    try {
      const recipientEmails: string[] = [];

      if (voucherForm.createdBy?.email) {
        recipientEmails.push(voucherForm.createdBy.email);
      }

      if (voucherForm.misChecker?.email) {
        recipientEmails.push(voucherForm.misChecker.email);
      }

      if (recipientEmails.length === 0) {
        logger.warn(
          `No recipient emails found for form submitted notification (voucher: ${voucherForm.voucherId})`,
        );
        return;
      }

      const customerName =
        `${voucherForm.applicant1?.personalDetails?.firstName || ''} ${voucherForm.applicant1?.personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      const uniqueReferenceId = voucherForm.uniqueReferenceId || 'N/A';

      // One shot to everyone who needs visibility ops-side (same payload per address).
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.FORM_SUBMITTED_TO_RM_MIS,
          {
            SUBMITTED_BY: submittedBy,
            CUSTOMER_NAME: customerName,
            UNIQUE_REFERENCE_ID: uniqueReferenceId,
          },
          BRAND_PURAVANKARA,
          { to: recipientEmails },
        ),
      );

      logger.info(
        `Form submitted notification sent to RM/MIS for voucher ${voucherForm.voucherId} (recipients: ${recipientEmails.length})`,
      );
    } catch (error) {
      logger.error(
        'Error sending form submitted notification to RM/MIS',
        error,
      );
      // Don't throw - this is a non-critical operation
    }
  }

  async renderVoucherPreview(
    voucherId: string,
    hideEmailMobile: boolean,
    skipMasking?: boolean,
    maskApplicantEmailMobile?: boolean,
  ): Promise<any> {
    try {
      logger.info(`VoucherFormsService service called: ${voucherId}`);
      const { data: voucher } = await this.getVoucherFormByVoucherId(
        voucherId,
        skipMasking,
        maskApplicantEmailMobile,
      );

      return {
        voucher,
        termsCondition: {},
        pickListData: {},
        paymentModeEnum: PaymentModeEnum,
        SecondarySourceEnum: SecondarySourceEnum,
        occupationEnum: OccupationEnum,
        voucherFormType: VoucherFormType,
        DISPLAY_DATE_FORMAT: DISPLAY_DATE_FORMAT,
        IMAGE_BASE_URL: this.configService.get<string>('AWS_S3_ACCESS_URL'),
        PROJECT_IMAGES_URL:
          this.configService.get<string>('PROJECT_IMAGES_URL'),
        hideEmailMobile,
      };
    } catch (error) {
      logger.error('error', error);
      logsAndErrorHandling(
        'VoucherFormsService - renderVoucherPreview',
        error,
        {
          voucherId,
        },
      );
    }
  }

  async downloadVoucherFormPDF(
    voucherId: string,
    hideEmailMobile?: boolean,
    skipMasking?: boolean,
    maskApplicantEmailMobile?: boolean,
  ): Promise<any> {
    try {
      logger.info(`downloadVoucherFormPDF service called: ${voucherId}`);
      const { data: voucher } = await this.getVoucherFormByVoucherId(
        voucherId,
        skipMasking,
      );
      if (!voucher) throw new NotFoundException('Voucher not found.');

      const chequePDF = [];
      if (
        voucher.paymentDetails?.recoveryAccountDetails?.cancelledCheque[0]
          ?.toLowerCase()
          ?.endsWith('.pdf')
      ) {
        chequePDF.push(
          voucher.paymentDetails?.recoveryAccountDetails?.cancelledCheque[0],
        );
      }

      const pdfBuffer = await this.pdfService.generateVoucherFormPDF(
        voucherId,
        chequePDF,
        hideEmailMobile,
        skipMasking,
        maskApplicantEmailMobile,
      );
      const stream = new PassThrough();
      stream.end(pdfBuffer);
      const formType =
        voucher.formPhase === VoucherFormType.EOI ? 'eoi-form' : 'voucher-form';
      const s3Key = `export/${voucherId}/${formType}-${voucher?.uniqueReferenceId}.pdf`;
      await this.awsService.uploadToS3(s3Key, stream);
      return {
        message: 'PDF exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Error downloading voucher PDF:', error);
      logsAndErrorHandling(
        'VoucherFormsService - downloadVoucherFormPDF',
        error,
        {
          voucherId,
        },
      );
    }
  }

  /**
   * Calculates age from date of birth
   * @param dob - Date of birth (Date object or string)
   * @returns Age in years, or null if dob is invalid
   */
  private calculateAge(dob: Date | string | null): number | null {
    if (!dob) {
      return null;
    }

    try {
      const birthDate = typeof dob === 'string' ? new Date(dob) : dob;

      if (Number.isNaN(birthDate.getTime())) {
        return null;
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age;
    } catch (error) {
      logger.error('Error calculating age:', error);
      return null;
    }
  }

  /**
   * Fetches applicants for a given voucher ID
   * Returns applicant details in the format: value, name, isMinor
   *
   * @param voucherId - The unique voucher ID string
   * @returns Response with applicants array
   * @throws NotFoundException when voucher form is not found
   */
  async getVoucherApplicants(opportunityId: string): Promise<any> {
    try {
      const voucherForm = await this.voucherFormRepository
        .createQueryBuilder('voucher')
        .select([
          'voucher.voucherId',
          'voucher.applicant1',
          'voucher.applicant2',
          'voucher.applicant3',
          'voucher.applicant4',
          'voucher.paidVoucherId',
          'voucher.stdEoiId',
          'voucher.preEoiId',
        ])
        .where('voucher.isDeleted = false')
        .andWhere('voucher.opportunityId = :opportunityId', { opportunityId })
        .getOne();

      if (!voucherForm) {
        throw new NotFoundException(
          'No voucher form found for the given opportunity ID',
        );
      }

      const paidVoucherId =
        voucherForm?.paidVoucherId ||
        voucherForm?.stdEoiId ||
        voucherForm?.preEoiId;
      const applicants = [];

      // Process each applicant (1-4)
      for (let i = 1; i <= 4; i++) {
        const applicant = voucherForm[`applicant${i}`];

        if (applicant?.personalDetails) {
          const firstName = applicant.personalDetails?.firstName || '';
          const lastName = applicant.personalDetails?.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          const dob = applicant.personalDetails?.dob || null;
          const age = this.calculateAge(dob);
          const isMinor = age !== null && age < ADULT_AGE;

          applicants.push({
            value: `${voucherForm?.voucherId}/${i}`,
            name: fullName,
            isMinor,
          });
        }
      }

      return {
        statusCode: 200,
        message: 'Voucher applicants fetched successfully.',
        data: {
          applicants,
          voucherId: voucherForm?.voucherId,
          voucherNumberEOI: paidVoucherId,
        },
      };
    } catch (error) {
      logger.error('Error fetching voucher applicants:', error);
      logsAndErrorHandling(
        'VoucherFormsService - getVoucherApplicants',
        error,
        {
          opportunityId,
        },
      );
    }
  }
}
