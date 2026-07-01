import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, UnrecoverableError } from 'bullmq';

import {
  Brackets,
  EntityManager,
  In,
  IsNull,
  Not,
  Raw,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateVoucherFormDto } from './dto/create-voucher-form.dto';
import {
  UpdateVoucherDetailsDto,
  ApplicantsDto,
} from './dto/update-voucher-details.dto';
import { ListVouchersFilterDto } from './dto/list-vouchers-filter.dto';
import { ListTransactionsFilterDto } from './dto/list-transactions-filter.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { DeleteRestoreVoucherDto } from './dto/delete-restore-voucher.dto';
import {
  VoucherFormStatusEnum,
  VoucherFormType,
  VoucherPaymentStatus,
  PrimarySourceEnum,
  SecondarySourceEnum,
  VoucherChronologyEnum,
  VoucherPaymentType,
  EOITypeEnum,
  QueueTypeEnum,
  ReasonActorEnum,
  CancellationActionEnum,
  CampaignStatusEnum,
  VoucherDeletionStatusEnum,
  SfdcLeadStatusEnum,
  EoiLeaderboardView,
  EoiLeaderboardSortBy,
  UnitSourceType,
  VoucherChangeRequestStatus,
  InventoryUnitStatusEnum,
  VoucherIdFieldNameEnum,
  BlockingStatus,
  EoiCampaignStageType,
} from '../../../enums/eoi-form.enums';
import { logger } from '../../../logger/logger';
import { ConfigService } from '@nestjs/config';
import { SfdcService } from '../../sfdc/sfdc.service';
import { CustomConfigService } from '../../../config/custom-config.service';
import {
  generateVoucherFormUrl,
  determineVoucherChronology,
  maskMobileNumber,
  maskEmailAddress,
  buildCancellationUpdate,
  shouldGenerateQueueId,
  calculatePaymentMetrics,
  determinePaymentStatus,
  generateAndAssignQueueId,
  generateAndAssignTieredQueueId,
  convertNumberToShortForm,
  resolveAndAssignTieredId,
  resolveThresholds,
  validatePaymentUniqueness,
  chunkArray,
  sleep,
  getTermsAndCondition,
  mergeEoiDetailsWithoutDowngrade,
  allocateCampaignTierCounter,
  reconcileTierIdsForCurrentEligibility,
  applyAssignedTierThresholdAmountAndRecomputeMetrics,
  markFormSubmittedOnTierChange,
  TIER_CONFIG,
} from 'src/helpers/eoi.helper';
import {
  generateUniqueReferenceId,
  generateRandomId,
  generateQueueCode,
} from 'src/utils/generateRandomNumber';
import { deriveVoucherTransactionIdFromPaymentDetails } from 'src/utils/voucher-payment-transaction-id.util';
import {
  ChannelPartner,
  EoiCampaign,
  Users,
  Projects,
  SfdcLogs,
  Booking,
  VoucherUnitBlocking,
  VoucherForm,
  VoucherPayment,
  VoucherUnitMapping,
  ProjectUserMapping,
  BookingOfficeUse,
} from 'src/entities';
import {
  BRAND_PURAVANKARA,
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DISPLAY_DATE_TIME_FORMAT,
  SUCCESS,
  UPCOMING_ESTATES_NAME,
  VOUCHER_FORM_URL,
  CHEQUE_DEPOSIT_SLIP_MISSING_MESSAGE,
  SFDC_BATCH_DELAY_MS,
  SFDC_BATCH_SIZE,
  SFDC_MAX_RETRIES,
  BULK_TRANSACTION_UPDATE_QUEUE,
  MASKED_QUEUE_ID,
  RM_BUDDY_ALLOWED_ROLES,
} from 'src/config/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
  WhatsAppEventsEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import { CancelEoiDto } from './dto/cancel-eoi.dto';
import { WhatsappNotifyEvent } from 'src/events/whatsapp.events';
import { AssignClosingRmDto } from './dto/assign-closing-rm.dto';
import {
  GetFloorDropdownDto,
  GetInventoryByFloorDto,
  GetUnitByUnitNumberDto,
} from './dto/get-floor-dropdown.dto';
import { RolesEnum } from 'src/enums/roles.enum';
import { PassThrough } from 'node:stream';
import * as ExcelJS from 'exceljs';
import { AwsService } from '../../aws/aws.service';
import { VoucherFormsService } from 'src/modules/eoi_manager/voucher_forms/voucher_form.service';
import { CheckerUpdatesDto } from './dto/checker-updates.dto';
import {
  filterVoucherList,
  filterDashboardData,
} from 'src/utils/role-based-filter.utils';
import { RefundEOIPaymentDto } from './dto/refund-eoi-payment.dto';
import { fromZonedTime } from 'date-fns-tz';
import {
  PaymentMethodEnum,
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ApproveCancelRequestDTO } from './dto/approve-cancel-request.dto';
import {
  buildExcelSheet,
  buildTxExcelSheet,
} from 'src/helpers/voucherEcelBuilder.helper';
import { RmDashboardFilterDto } from './dto/rm-dashboard-filter.dto';
import { buildRmDashboardExcelSheet } from 'src/helpers/rmDashboardExport.helper';
import { buildEoiLeaderboardExcelSheet } from 'src/helpers/eoiLeaderboardExport.helper';
import { InventoryWiseSplitQueryDto } from './dto/inventory-wise-split.dto';
import { DailyTrackerQueryDto } from './dto/daily-tracker-query.dto';
import { EoiLeaderboardFilterDto } from './dto/eoi-leaderboard-filter.dto';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GetVoucherByEnquiryIdDto } from './dto/get-voucher-by-enquiry.dto';
import {
  SfdcLeadPayload,
  SfdcLeadResult,
} from '../../sfdc/interfaces/create-lead-payload.interface';
import { safeString } from 'src/helpers';
import { MapAndConvertDto } from './dto/map-and-converted.dto';
import { FetchVoucherForMappingDto } from './dto/fetch-voucher-for-mapping.dto';
import { BulkUpdateTransactionsDto } from './dto/bulk-update-transactions.dto';
import { BulkTransactionUpdateJobPayload } from './interfaces/bulk-transaction-update-job-payload.interface';
import { QueueJobAuditService } from 'src/modules/queue_audit/queue-job-audit.service';
import { QUEUE_JOB_AUDIT_EVENT } from 'src/modules/queue_audit/queue-job-audit.constants';
import {
  bulkAmountMatchesDb,
  parseBulkTransactionsWorkbook,
  validateBulkRowFields,
  type BulkExcelRow,
} from 'src/helpers/bulk-transaction-upload.helper';
import { ProjectInventoryUnit } from '../../inventory-unit/entities/project_inventory_units.entity';
import { SfdcInventory } from './interfaces/sfdc-inventory.interface';
import { SFDCLogEvent } from 'src/events/sfdc.events';
import { VoucherBookingStatusEnum } from 'src/enums/booking-form-status.enum';
import { VoucherChangeRequest } from './entities/source-change-request.entity';
import { CreateVoucherChangeRequestDto } from './dto/create-source-change-request.dto';
import { GetVoucherChangeRequestDto } from './dto/get-source-change-request.dto';
import { ApproveVoucherChangeRequestDto } from './dto/approve-source-change-request.dto';
import { GetVoucherByPridDto } from './dto/get-voucher-by-prid.dto';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { UploadReceiptDto } from './dto/upload-receipt.dto';
import { formatDate } from 'src/helpers/date.helper';
import { CreateCpVoucherFormDto } from '../voucher_forms/dto/create-cp-voucher-form.dto';
import { VoucherDeletionRemarks } from '../voucher_forms/entities/voucher_form.entity';
import { SaveAgreementDetailsDto } from './dto/save-agreement-details.dto';
import { BatchStage } from 'src/enums/batch-manager.enums';

@Injectable()
export class EoiManagementService {
  constructor(
    @InjectRepository(VoucherForm)
    private readonly voucherFormRepository: Repository<VoucherForm>,

    @InjectRepository(VoucherPayment)
    private readonly voucherPaymentRepository: Repository<VoucherPayment>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(EoiCampaign)
    private readonly eoiCampaignRepository: Repository<EoiCampaign>,

    @InjectRepository(ChannelPartner)
    private readonly channelPartnerRepository: Repository<ChannelPartner>,

    @InjectRepository(VoucherUnitMapping)
    private readonly unitMappingRepo: Repository<VoucherUnitMapping>,

    @InjectRepository(ProjectInventoryUnit)
    private readonly inventoryUnitRepo: Repository<ProjectInventoryUnit>,

    @InjectRepository(Projects)
    private readonly projectsRepository: Repository<Projects>,

    @InjectRepository(VoucherChangeRequest)
    private readonly voucherChangeRequestRepository: Repository<VoucherChangeRequest>,

    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,

    @InjectRepository(VoucherUnitBlocking)
    private readonly blockingRepo: Repository<VoucherUnitBlocking>,

    private readonly configService: ConfigService,

    private readonly customConfigService: CustomConfigService,

    private readonly eventEmitter: EventEmitter2,

    private readonly awsService: AwsService,

    @InjectQueue(BULK_TRANSACTION_UPDATE_QUEUE)
    private readonly bulkTransactionUpdateQueue: Queue,

    private readonly queueJobAuditService: QueueJobAuditService,

    private readonly voucherFormsService: VoucherFormsService,

    private readonly sfdcService: SfdcService,

    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepository: Repository<ProjectUserMapping>,

    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,

    @InjectRepository(BookingOfficeUse)
    private readonly bookingOfficeUseRepository: Repository<BookingOfficeUse>,
  ) {}

  /**
   * Retrieves referred voucher applicant details by campaign ID and unique reference ID.
   * Extracts only essential applicant information for display purposes.
   *
   * @param campaignId - The ID of the campaign to filter by
   * @param uniqueReferenceId - The unique reference ID of the voucher
   * @returns Promise<any> Object containing applicant details (customer name, contact, email)
   * @throws NotFoundException when voucher is not found
   */
  async getReferredVoucher(
    campaignId: number,
    uniqueReferenceId: string,
  ): Promise<any> {
    try {
      const voucherForm = await this.voucherFormRepository
        .createQueryBuilder('voucher')
        .innerJoin('voucher.campaign', 'campaign')
        .select(['voucher.id', 'voucher.applicant1', 'campaign.id'])
        .where('campaign.id = :campaignId', { campaignId })
        .andWhere('voucher.uniqueReferenceId = :uniqueReferenceId', {
          uniqueReferenceId,
        })
        .andWhere('voucher.isDeleted = false')
        .getOne();

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      const applicant1 = voucherForm.applicant1 || {};
      const personalDetails = applicant1?.personalDetails || {};

      const firstName = personalDetails?.firstName || '';
      const lastName = personalDetails?.lastName || '';
      const customerName = `${firstName} ${lastName}`.trim() || null;

      return {
        statusCode: SUCCESS,
        message: 'Voucher applicant details retrieved successfully',
        data: {
          customerName,
          countryCode: personalDetails?.countryCode || null,
          contactNumber: personalDetails?.contactNumber || null,
          email: personalDetails?.emailAddress || null,
        },
      };
    } catch (error) {
      logger.error('Error retrieving voucher applicant details:', error);
      throw error;
    }
  }

  /**
   * Determines if a voucher is eligible for upgrade to EOI based on campaign phase dates.
   * Checks if voucher phase has ended and EOI phase is currently active.
   *
   * @param voucherEndDate - End date of the voucher phase
   * @param eoiStartDate - Start date of the EOI phase
   * @param eoiEndDate - End date of the EOI phase
   * @param now - Current date to compare against
   * @returns boolean True if voucher can be upgraded to EOI, false otherwise
   */
  private checkIsUpgradableToEOI(
    voucherEndDate: Date | null,
    eoiStartDate: Date | null,
    eoiEndDate: Date | null,
    now: Date,
  ): boolean {
    if (!voucherEndDate || !eoiStartDate || !eoiEndDate) {
      return false;
    }
    return voucherEndDate < now && eoiStartDate < now && eoiEndDate > now;
  }

  /**
   * Retrieves a complete voucher form by ID with all associated data and campaign information.
   * Enriches response with campaign details, project names, and EOI upgrade eligibility status.
   *
   * @param id - The ID of the voucher form to retrieve
   * @returns Promise<any> Complete voucher form with campaign info and upgrade eligibility flag
   * @throws NotFoundException when voucher form is not found
   */
  async getVoucherFormById(
    id: number,
    maskEmailMobile: boolean = false,
  ): Promise<any> {
    try {
      const voucherForm = await this.getVoucherWithRelations(id);

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }
      // Check if campaign's end date has passed (eligible for EOI phase)

      const isUpgradableToEOI = this.getEOIEligibility(voucherForm);

      const { campaign, createdBy, closingRm, ...voucherWithoutCampaign } =
        voucherForm;
      const campaignName = campaign?.campaignName ?? null;
      const stage = campaign?.stage ?? null;
      const campaignId = campaign?.id ?? null;
      const unitPrefStaticContent = campaign?.unitPrefStaticContent ?? null;

      // Extract only names from the relations
      const sourcingRm = createdBy?.name ?? null;
      const closingRmName = closingRm?.name ?? null;

      // Fetch project name if projectId exists in sourceDetails
      const projectId = voucherForm?.sourceDetails?.project;
      if (projectId) {
        const project = await this.projectsRepository.findOne({
          where: { id: projectId },
          select: ['id', 'name'],
        });
        voucherForm.sourceDetails.projectName = project?.name ?? null;
      }

      const referralCampaignId = voucherForm.sourceDetails?.campaignId;
      if (referralCampaignId) {
        const referralCampaign = await this.eoiCampaignRepository.findOne({
          where: {
            id: referralCampaignId,
          },
          select: ['campaignName'],
        });
        voucherForm.sourceDetails.campaignName = referralCampaign.campaignName;
      }

      const terms = getTermsAndCondition(voucherForm?.formPhase, campaign);
      if (maskEmailMobile) {
        this.voucherFormsService.maskApplicantDetails(voucherForm);
      }
      return {
        statusCode: SUCCESS,
        message: 'Voucher form retrieved successfully',
        data: {
          ...voucherWithoutCampaign,
          campaignName,
          stage,
          campaignId,
          unitPrefStaticContent,
          isUpgradableToEOI,
          sourcingRm,
          closingRm: closingRmName,
          termsAndCondition: terms,
        },
      };
    } catch (error) {
      logger.error('Error retrieving voucher form:', error);
      throw error;
    }
  }
  private async getVoucherWithRelations(id: number) {
    return this.voucherFormRepository
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
      .where('voucher.id = :id', { id })
      .getOne();
  }

  private getEOIEligibility(voucherForm: any): boolean {
    if (!voucherForm?.campaign) return false;

    // Check if campaign's end date has passed (eligible for EOI phase)
    const now = new Date();
    const voucherEndDate = voucherForm.campaign?.voucherEndDate
      ? new Date(voucherForm.campaign.voucherEndDate)
      : null;
    const eoiStartDate = voucherForm.campaign?.eoiStartDate
      ? new Date(voucherForm.campaign?.eoiStartDate)
      : null;
    const eoiEndDate = voucherForm.campaign?.eoiEndDate
      ? new Date(voucherForm.campaign?.eoiEndDate)
      : null;

    // True only if:
    // 1. voucherEndDate has passed
    // 2. eoiStartDate has passed
    // 3. eoiEndDate is in the future

    return this.checkIsUpgradableToEOI(
      voucherEndDate,
      eoiStartDate,
      eoiEndDate,
      now,
    );
  }

  /**
   * Retrieves an array of all active campaign status enums.
   * These statuses indicate campaigns that are currently operational for voucher/EOI creation.
   *
   * @returns string[] Array containing active campaign status enum values
   */
  private getActiveCampaignStatuses(): string[] {
    return [
      CampaignStatusEnum.ACTIVE_VOUCHER,
      CampaignStatusEnum.ACTIVE_EOI,
      CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI,
    ];
  }

  /**
   * Retrieves an array of all cancellation-related voucher form statuses.
   * Used for filtering out cancelled vouchers from various queries and aggregations.
   *
   * @returns string[] Array containing cancellation status enum values
   */
  private getCancellationStatuses(): string[] {
    return [
      VoucherFormStatusEnum.CANCELLED_NOT_REALISED,
      VoucherFormStatusEnum.CANCELLED,
    ];
  }

  /**
   * Counts the total number of distinct active campaigns that have vouchers.
   * Optionally filters by voucher creation date range.
   *
   * @param startDate - Optional start date to filter vouchers by creation time
   * @param endDate - Optional end date to filter vouchers by creation time
   * @returns Promise<number> Count of active campaigns with at least one voucher
   */
  private async getTotalCampaignsCount(
    startDate?: string,
    endDate?: string,
  ): Promise<number> {
    const activeStatuses = this.getActiveCampaignStatuses();

    if (startDate && endDate) {
      return this.voucherFormRepository
        .createQueryBuilder('voucher')
        .innerJoin('voucher.campaign', 'campaign')
        .where('campaign.status In (:...statuses)', {
          statuses: activeStatuses,
        })
        .andWhere('voucher.isDeleted = false')
        .andWhere('voucher.createdAt >= :startDate', { startDate })
        .andWhere('voucher.createdAt <= :endDate', { endDate })
        .select('COUNT(DISTINCT campaign.id)', 'count')
        .getRawOne()
        .then((result) => Number(result?.count || 0));
    }

    // When no date range, count campaigns that have at least one voucher
    return this.voucherFormRepository
      .createQueryBuilder('voucher')
      .innerJoin('voucher.campaign', 'campaign')
      .where('campaign.status In (:...statuses)', {
        statuses: activeStatuses,
      })
      .andWhere('voucher.isDeleted = false')
      .select('COUNT(DISTINCT campaign.id)', 'count')
      .getRawOne()
      .then((result) => Number(result?.count || 0));
  }

  /**
   * Aggregates comprehensive voucher metrics in a single optimized query using conditional aggregation.
   * Calculates counts and amounts for collected, in-progress, and created vouchers.
   *
   * @param startDate - Optional start date to filter vouchers by creation time
   * @param endDate - Optional end date to filter vouchers by creation time
   * @param campaign - Optional campaign ID to filter by specific campaign
   * @param isReport - Optional flag indicating if this is for a report
   * @returns Promise<Object> Object containing voucher counts and payment amounts
   */
  private async getVoucherMetrics(
    startDate?: string,
    endDate?: string,
    campaign?: string,
    isReport?: boolean,
  ): Promise<{
    vouchersCollected: number;
    vouchersInProgress: number;
    vouchersCreated: number;
    totalAmountCollected: string | null;
    totalAmountPayable: string | null;
  }> {
    const activeStatuses = this.getActiveCampaignStatuses();
    const cancellationStatuses = this.getCancellationStatuses();
    const cancellationStatusesStr = cancellationStatuses
      .map((s) => `'${s}'`)
      .join(', ');

    const qb = this.voucherFormRepository
      .createQueryBuilder('voucher')
      .innerJoin('voucher.campaign', 'campaign')
      .select(
        `COUNT(DISTINCT CASE
          WHEN voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
            OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
            OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}')
          THEN voucher.id
          ELSE NULL
        END)`,
        'vouchersCollected',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
            AND voucher.paymentStatus NOT IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}')
          THEN voucher.id
          ELSE NULL
        END)`,
        'vouchersInProgress',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN voucher.voucherFormStatus = '${VoucherFormStatusEnum.CREATED}'
          THEN voucher.id
          ELSE NULL
        END)`,
        'vouchersCreated',
      )
      .addSelect(
        `SUM(CASE
          WHEN (voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}')
              AND voucher.voucherFormStatus NOT IN (${cancellationStatusesStr})
            OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}'))
          THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(voucher.paymentDetails, '$.totalAmountPaid')) AS DECIMAL(15,2))
          ELSE 0
        END)`,
        'totalAmountCollected',
      )
      .addSelect(
        `SUM(CASE
          WHEN voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
            OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
              AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
            OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}')
          THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(voucher.paymentDetails, '$.amountPayable')) AS DECIMAL(15,2))
          ELSE 0
        END)`,
        'totalAmountPayable',
      )
      .where('campaign.status IN (:...statuses)', {
        statuses: activeStatuses,
      })
      .andWhere('voucher.isDeleted = false');

    if (campaign && isReport) {
      qb.andWhere('campaign.id = :campaignId', {
        campaignId: campaign,
      });
    }

    if (startDate && endDate) {
      qb.andWhere('voucher.createdAt >= :startDate', { startDate }).andWhere(
        'voucher.createdAt <= :endDate',
        { endDate },
      );
    }

    const result = await qb.getRawOne<{
      vouchersCollected: string;
      vouchersInProgress: string;
      vouchersCreated: string;
      totalAmountCollected: string | null;
      totalAmountPayable: string | null;
    }>();

    return {
      vouchersCollected: result ? Number(result.vouchersCollected) : 0,
      vouchersInProgress: result ? Number(result.vouchersInProgress) : 0,
      vouchersCreated: result ? Number(result.vouchersCreated) : 0,
      totalAmountCollected: result?.totalAmountCollected || null,
      totalAmountPayable: result?.totalAmountPayable || null,
    };
  }

  /**
   * Retrieves aggregated refund data including total refunded amount and unit count.
   * Filters cancelled vouchers with refunded payment transactions.
   *
   * @param startDate - Optional start date to filter vouchers by creation time
   * @param endDate - Optional end date to filter vouchers by creation time
   * @returns Promise<Object | null> Object with refundedAmount and refundedUnits, or null if no data
   */
  private async getRefundedData(
    startDate?: string,
    endDate?: string,
  ): Promise<{ refundedAmount: string; refundedUnits: string } | null> {
    const activeStatuses = this.getActiveCampaignStatuses();

    const qb = this.voucherPaymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.voucher', 'voucher')
      .innerJoin('voucher.campaign', 'campaign')
      .select('SUM(payment.paidAmount)', 'refundedAmount')
      .addSelect('COUNT(DISTINCT voucher.id)', 'refundedUnits')
      .where('voucher.voucherFormStatus = :cancelledStatus', {
        cancelledStatus: VoucherFormStatusEnum.CANCELLED,
      })
      .andWhere('payment.status = :refundedStatus', {
        refundedStatus: PaymentTxStatusEnum.REFUNDED,
      })
      .andWhere('campaign.status IN (:...statuses)', {
        statuses: activeStatuses,
      })
      .andWhere('voucher.isDeleted = false');

    if (startDate && endDate) {
      qb.andWhere('voucher.createdAt >= :startDate', { startDate }).andWhere(
        'voucher.createdAt <= :endDate',
        { endDate },
      );
    }

    return qb.getRawOne<{ refundedAmount: string; refundedUnits: string }>();
  }

  /**
   * Constructs a payload object for the rm_dashboard_listing stored procedure.
   * Maps DTO fields to SP parameter names and handles conditional inclusion of filters.
   *
   * @param dto - Dashboard filter DTO with view, pagination, and filter parameters
   * @param skipPagination - Whether to skip pagination in the stored procedure call
   * @returns Object Properly formatted payload for stored procedure execution
   */
  private buildSpPayload(
    dto: RmDashboardFilterDto,
    skipPagination: boolean,
  ): any {
    const {
      view,
      page,
      limit,
      viewBy,
      unitType,
      sortBy,
      campaign,
      startDate,
      endDate,
    } = dto;
    const spPayload: any = { view, page, limit };

    if (skipPagination) spPayload.skipPagination = 1;
    if (viewBy) spPayload.viewBy = viewBy;
    if (unitType) spPayload.unitType = unitType;
    if (sortBy) {
      const [sort_column, sort_order] = sortBy.split(':');
      spPayload.sort_column = sort_column;
      spPayload.sort_order = sort_order;
    }
    if (campaign) spPayload.campaignId = campaign;
    if (startDate) spPayload.startDate = startDate;
    if (endDate) spPayload.endDate = endDate;

    return spPayload;
  }

  /**
   * Retrieves comprehensive RM dashboard metrics and campaign data with role-based filtering.
   * Executes multiple metric queries in parallel for optimal performance.
   * Applies role-specific visibility filters to dashboard data.
   *
   * @param dto - Dashboard filter DTO containing view, pagination, date range, and campaign filters
   * @param user - Current user object for role-based filtering of sensitive data
   * @returns Promise<any> Dashboard object with cards, metrics, and paginated campaign listings
   * @throws InternalServerErrorException when dashboard data fetching fails
   */
  async getDashboardData(dto?: RmDashboardFilterDto, user?: any): Promise<any> {
    try {
      const { startDate, endDate, campaign, isReport, isExcel, page, limit } =
        dto;
      const skipPagination = !!isExcel || page == null || limit == null;

      // Execute dashboard queries in parallel
      // Note: getVoucherMetrics combines 3 queries into one for better performance
      const [totalCompaigns, voucherMetrics, refundedData] = await Promise.all([
        this.getTotalCampaignsCount(startDate, endDate),
        this.getVoucherMetrics(startDate, endDate, campaign, isReport),
        this.getRefundedData(startDate, endDate),
      ]);

      const vouchersCollected = voucherMetrics.vouchersCollected;
      const vouchersInProgress = voucherMetrics.vouchersInProgress;
      const vouchersCreated = voucherMetrics.vouchersCreated;
      const totalAmountCollected = voucherMetrics.totalAmountCollected;
      const totalAmountPayable = voucherMetrics.totalAmountPayable;
      const spPayload = this.buildSpPayload(dto, skipPagination);
      const result = await this.voucherFormRepository.query(
        `CALL rm_dashboard_listing(?);`,
        [JSON.stringify(spPayload)],
      );
      const spResponse = result?.[0]?.[0]?.resp;
      const dashboardData = {
        page,
        limit,
        totalCount: spResponse?.totalcount,
        campaigns: spResponse?.data,
        cards: this.buildDashboardCards(
          totalCompaigns,
          vouchersCollected,
          vouchersInProgress,
          vouchersCreated,
          totalAmountPayable,
          totalAmountCollected,
          refundedData,
        ),
      };

      // Apply role-based filtering
      const filteredData = user?.role
        ? filterDashboardData(dashboardData, user.role)
        : dashboardData;

      return {
        statusCode: SUCCESS,
        message: 'Dashboard data fetched successfully',
        data: filteredData,
      };
    } catch (error) {
      logger.error('Error fetching dashboard data', {
        error: error.message,
        stack: error.stack,
      });
      throw new InternalServerErrorException('Failed to fetch dashboard data');
    }
  }

  /**
   * Constructs the dashboard cards object containing key metrics and KPIs.
   * Calculates refund-related metrics and formats amounts for display.
   *
   * @param totalCompaigns - Total number of active campaigns
   * @param vouchersCollected - Count of vouchers with collected payments
   * @param vouchersInProgress - Count of vouchers in progress
   * @param vouchersCreated - Count of newly created vouchers
   * @param totalAmountPayable - Total amount payable across all vouchers
   * @param totalAmountCollected - Total amount collected from payments
   * @param refundedData - Refund data object containing amount and unit counts
   * @returns Object Dashboard cards with formatted metrics
   */
  private buildDashboardCards(
    totalCompaigns: number,
    vouchersCollected: number,
    vouchersInProgress: number,
    vouchersCreated: number,
    totalAmountPayable: string | null,
    totalAmountCollected: string | null,
    refundedData: { refundedAmount: string; refundedUnits: string } | null,
  ) {
    return {
      totalCompaigns,
      vouchersCollected,
      vouchersInProgress,
      vouchersCreated,
      totalAmountPayable: totalAmountPayable ? Number(totalAmountPayable) : 0,
      amountCollected: totalAmountCollected ? Number(totalAmountCollected) : 0,
      amountRefunded: refundedData?.refundedAmount
        ? Number(refundedData.refundedAmount)
        : 0,
      unitsRefunded: refundedData?.refundedUnits
        ? Number(refundedData.refundedUnits)
        : 0,
    };
  }

  /**
   * Creates a new voucher form with comprehensive validation and enrichment.
   * Handles both RM-initiated (with campaign ID) and CP-initiated flows (via channel partner link).
   * Validates duplicate prevention, generates unique identifiers, and sends customer notifications.
   *
   * @param createVoucherFormDto - DTO containing all voucher form creation details
   * @param user - User object containing dbId, name, and role information
   * @returns Promise<any> Response with created voucher form and form URL
   * @throws BadRequestException for duplicate leads or source validation failures
   * @throws NotFoundException when campaign or channel partner cannot be resolved
   */
  async createVoucherForm(
    createVoucherFormDto: CreateVoucherFormDto | CreateCpVoucherFormDto,
    user?: any,
  ): Promise<any> {
    try {
      const createdBy = user?.dbId || null;
      let creator: string | null;
      const rmName = user?.name || 'Purva Team';
      let rmUserId = createdBy;

      const result = await this.voucherFormRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Resolve campaign and channel partner (if CP flow) based on creation type
          const { campaign, campaignPhase, channelPartner, createdByEmail } =
            await this.resolveCampaignForVoucher(
              createVoucherFormDto,
              createdBy,
              transactionalEntityManager,
            );

          // Check if same voucher has been created in last 45 days for same mobile number with same campaignId
          // Exclude cancelled statuses and only check vouchers with at least 1 payment
          const fortyFiveDaysAgo = new Date();
          fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

          const cancelledStatuses = [
            VoucherFormStatusEnum.CANCEL_REQUESTED,
            VoucherFormStatusEnum.CANCEL_ACCEPTED,
            VoucherFormStatusEnum.CANCEL_APPROVED,
            VoucherFormStatusEnum.REFUND_INITIATED,
            VoucherFormStatusEnum.CANCELLED,
          ];

          const existingVoucherInLast45Days = await transactionalEntityManager
            .createQueryBuilder(VoucherForm, 'voucher')
            .innerJoin('voucher.payments', 'payment')
            .where('voucher.campaign = :campaignId', {
              campaignId: campaign.id,
            })
            .andWhere(
              `JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.contactNumber')) = :mobile`,
              {
                mobile: createVoucherFormDto.contactNumber,
              },
            )
            .andWhere('voucher.createdAt >= :fortyFiveDaysAgo', {
              fortyFiveDaysAgo,
            })
            .andWhere(
              'voucher.voucherFormStatus NOT IN (:...cancelledStatuses)',
              {
                cancelledStatuses,
              },
            )
            .getOne();

          if (existingVoucherInLast45Days) {
            throw new BadRequestException('Duplicate lead exists');
          }

          // Generate common voucher identifiers
          const { voucherId, uniqueReferenceId, enquiryNumber } =
            this.generateVoucherIdentifiers(campaign);

          // Build applicant details
          const applicantDetails =
            this.buildApplicantDetails(createVoucherFormDto);

          // Fetch channel partner if RM flow with Channel Partner as primary source
          // When RM creates a voucher with primarySource = "Channel Partner", they provide channelPartnerId
          // This CP ID is then mapped to the voucher's cpLinkId field (see line 785)
          // Note: This is separate from the CP flow which uses channelPartnerLinkId (string) instead
          let rmChannelPartner: ChannelPartner | undefined;
          if (
            createdBy &&
            createVoucherFormDto.primarySource ===
              PrimarySourceEnum.CHANNEL_PARTNER &&
            createVoucherFormDto.cpLinkId
          ) {
            rmChannelPartner = await transactionalEntityManager.findOne(
              ChannelPartner,
              {
                where: { id: createVoucherFormDto.cpLinkId },
              },
            );
            if (!rmChannelPartner) {
              throw new NotFoundException('Channel partner not found');
            }
          }

          // Build source-specific data
          const {
            primarySource,
            secondarySource,
            sourceDetails,
            cpCreatedBy,
            cpId,
          } = this.buildSourceData(
            createVoucherFormDto,
            createdBy,
            channelPartner || rmChannelPartner,
          );
          const userVoucherTrackingId = generateRandomId();
          rmUserId = createdBy || cpCreatedBy;

          // Create voucher form entity
          const voucherForm = transactionalEntityManager.create(VoucherForm, {
            voucherId,
            uniqueReferenceId,
            userVoucherTrackingId,
            campaign,
            primarySource,
            secondarySource,
            sourceDetails,
            applicant1: applicantDetails,
            voucherFormStatus: VoucherFormStatusEnum.CREATED,
            residentStatus: createVoucherFormDto.residentStatus,
            formPhase: campaignPhase,
            createdBy: { id: rmUserId },
            cpLinkId: cpId || null,
            sfdcEnquiryId: createVoucherFormDto?.sfdcEnquiryId || null,
            sfdcLeadStatus: createVoucherFormDto?.sfdcLeadStatus || null,
            isLeadCreated: !!createVoucherFormDto?.sfdcEnquiryId,
            chronology:
              campaignPhase === VoucherFormType.EOI
                ? VoucherChronologyEnum.E
                : VoucherChronologyEnum.V,
          });

          const savedVoucherForm =
            await transactionalEntityManager.save(voucherForm);

          // Update campaign enquiry counter
          await this.updateCampaignEnquiryCounter(
            campaign,
            enquiryNumber,
            transactionalEntityManager,
          );
          creator = user?.email ?? createdByEmail;

          creator = user?.email ?? createdByEmail;

          return savedVoucherForm;
        },
      );

      // Format and return response
      const response = this.formatVoucherResponse(result);

      // Send email to customer with voucher form link
      try {
        const customerEmail = createVoucherFormDto.emailId;
        const customerMobile = createVoucherFormDto.contactNumber;
        const customerName =
          `${createVoucherFormDto.firstName || ''} ${createVoucherFormDto.lastName || ''}`.trim() ||
          'Customer';
        const campaignName = result.campaign?.campaignName;

        if (customerEmail) {
          await this.sendVoucherFormEmail(
            customerEmail,
            customerName,
            response?.data?.voucherFormUrl ?? '',
            creator,
            campaignName,
            result.voucherId,
            rmUserId,
            'creation',
          );
        }
        if (customerMobile && rmName) {
          this.eventEmitter.emit(
            WhatsAppEventsEnum.SEND_VOUCHER_LINK,
            new WhatsappNotifyEvent(
              customerMobile,
              customerName,
              rmName,
              response?.data?.voucherFormUrl ?? '',
            ),
          );
        }
      } catch (error) {
        // Log error but don't fail the voucher creation
        logger.error('Failed to send voucher creation email', error);
      }

      return response;
    } catch (error) {
      logger.error('Error creating voucher form:', error);
      logsAndErrorHandling('EoiManagementService - createVoucherForm', error, {
        createVoucherFormDto,
        user,
      });
    }
  }

  /**
   * Creates a new voucher based on an existing one with updated campaign phase detection.
   * Preserves applicant details and source information while generating new voucher identifiers.
   * Detects if campaign has transitioned from VOUCHER to EOI phase.
   *
   * @param oldVoucherId - ID of the existing voucher to duplicate
   * @returns Promise<any> Response with newly created voucher form and URL
   * @throws NotFoundException when existing voucher or campaign cannot be found
   */
  async buyNewVoucher(oldVoucherId: number): Promise<any> {
    try {
      const result = await this.voucherFormRepository.manager.transaction(
        async (transactionalManager) => {
          // Resolve campaign based on creation type (RM vs CP)
          const existingVoucher = await transactionalManager.findOne(
            VoucherForm,
            {
              where: { id: oldVoucherId },
              relations: ['campaign', 'createdBy'],
            },
          );

          const hasAnotherVoucher = await this.findDuplicateVoucher(
            transactionalManager,
            oldVoucherId,
            existingVoucher,
          );

          if (hasAnotherVoucher) return hasAnotherVoucher;

          const campaign = existingVoucher?.campaign ?? null;
          let campaignPhase = VoucherFormType.VOUCHER;
          if (
            (!campaign?.voucherEndDate ||
              campaign?.voucherEndDate < new Date()) &&
            campaign?.eoiStartDate <= new Date()
          ) {
            campaignPhase = VoucherFormType.EOI;
          }

          // Generate common voucher identifiers
          const { voucherId, uniqueReferenceId, enquiryNumber } =
            this.generateVoucherIdentifiers(campaign);

          const updatedPaymentDetails = existingVoucher?.paymentDetails
            ? {
                ...existingVoucher?.paymentDetails,
                totalAmountPaid: 0,
              }
            : {};

          // Create voucher form entity
          const voucherForm = transactionalManager.create(VoucherForm, {
            voucherId,
            uniqueReferenceId,
            campaign,
            userVoucherTrackingId:
              existingVoucher?.userVoucherTrackingId || generateRandomId(),
            paymentDetails: updatedPaymentDetails,
            noOfApplicants: existingVoucher?.noOfApplicants,
            lastStep: existingVoucher?.noOfApplicants,
            primarySource: existingVoucher?.primarySource,
            secondarySource: existingVoucher?.secondarySource,
            sourceDetails: existingVoucher?.sourceDetails,
            applicant1: existingVoucher?.applicant1,
            applicant2: existingVoucher?.applicant2,
            applicant3: existingVoucher?.applicant3,
            applicant4: existingVoucher?.applicant4,
            leadStatus: existingVoucher.leadStatus,
            voucherFormStatus: VoucherFormStatusEnum.IN_PROGRESS,
            formPhase: campaignPhase,
            createdBy: { id: existingVoucher?.createdBy?.id },
            cpLinkId: existingVoucher?.cpLinkId ?? null,
            customerLastUpdatedAt: new Date(),
            chronology:
              campaignPhase === VoucherFormType.EOI
                ? VoucherChronologyEnum.E
                : VoucherChronologyEnum.V,
          });

          const savedVoucherForm = await transactionalManager.save(voucherForm);
          await this.refreshCacheToken(voucherForm.userVoucherTrackingId);
          // Update campaign enquiry counter
          await this.updateCampaignEnquiryCounter(
            campaign,
            enquiryNumber,
            transactionalManager,
          );

          return savedVoucherForm;
        },
      );

      // Format and return response
      return this.formatVoucherResponse(result);
    } catch (error) {
      logger.error('Error creating voucher form:', error);
      logsAndErrorHandling('EoiManagementService - buyNewVoucher', error, {
        oldVoucherId,
      });
    }
  }

  /**
   * Searches for existing active vouchers with identical contact details in the same campaign.
   * Used to prevent creation of duplicate voucher forms for the same customer.
   *
   * @param transactionalManager - Entity manager for database transaction
   * @param oldVoucherId - ID of current voucher to exclude from search results
   * @param existingVoucher - Reference voucher containing campaign and applicant details
   * @returns Promise<VoucherForm | null> Duplicate voucher if found, null if no duplicates exist
   */
  private async findDuplicateVoucher(
    transactionalManager: EntityManager,
    oldVoucherId: number,
    existingVoucher: VoucherForm,
  ): Promise<VoucherForm | null> {
    return transactionalManager.findOne(VoucherForm, {
      where: {
        id: Not(oldVoucherId),
        voucherFormStatus: In([
          VoucherFormStatusEnum.CREATED,
          VoucherFormStatusEnum.IN_PROGRESS,
        ]),
        campaign: { id: existingVoucher?.campaign?.id },
        applicant1: Raw(
          (alias) =>
            `JSON_EXTRACT(${alias}, '$.personalDetails.emailAddress') = :email
           AND JSON_EXTRACT(${alias}, '$.personalDetails.contactNumber') = :mobile`,
          {
            email: existingVoucher?.applicant1?.personalDetails?.emailAddress,
            mobile: existingVoucher?.applicant1?.personalDetails?.contactNumber,
          },
        ),
      },
      relations: ['campaign'],
    });
  }

  /**
   * Updates voucher form with EOI preferences, payment information, and KYC details.
   * Payment block: `prepareVoucherUpdate` uses `calculatePaymentMetrics` + `resolveAndAssignTieredId`
   * (eoi.helper — tiered paidVoucherId/stdEoiId/preEoiId). `persistVoucherUpdate` saves rows + emails.
   *
   * @param voucherId - ID of the voucher to update
   * @param updateVoucherDetailsDto - DTO containing EOI, payment, and KYC details
   * @returns Promise<any> Success response with updated voucher details
   * @throws NotFoundException when voucher is not found
   * @throws BadRequestException for invalid payment data or status transitions
   */
  async updateVoucherDetails(
    voucherId: number,
    // Payload carries EOI/payment/KYC edits from RM screen
    updateVoucherDetailsDto: UpdateVoucherDetailsDto,
  ) {
    // Keep this wrapper clean: prep + persist + response
    try {
      // Step 1: validate inputs and prepare a fully-updated in-memory voucher object
      const prepared = await this.prepareVoucherUpdate(
        voucherId,
        updateVoucherDetailsDto,
      );

      // Step 2: write all updates (voucher + payments) in a transaction
      const updatedVoucherForm = await this.persistVoucherUpdate(prepared);

      return {
        statusCode: SUCCESS,
        message: 'Voucher details updated successfully',
        data: updatedVoucherForm,
      };
    } catch (error) {
      logger.error('Error updating voucher details:', error);
      logsAndErrorHandling(
        'EoiManagementService- updateVoucherDetails',
        error,
        { voucherId, updateVoucherDetailsDto },
      );
    }
  }

  /**
   * Merges new KYC information into existing applicant contact details.
   * Converts physical document flags to false when digital documents are uploaded.
   *
   * @param existingContactDetails - Current contact details object to update
   * @param newKycDetails - New KYC data (PAN, Aadhaar documents) to merge
   * @returns void - Updates object in place
   */
  private updateApplicantKycDetails(
    existingContactDetails: any,
    newKycDetails: any,
  ): void {
    if (
      newKycDetails.panImage?.length > 0 &&
      existingContactDetails?.isPhysicalPan
    ) {
      existingContactDetails.isPhysicalPan = false;
    }
    if (
      newKycDetails.aadhaarImage?.length > 0 &&
      existingContactDetails?.isPhysicalAadhaar
    ) {
      existingContactDetails.isPhysicalAadhaar = false;
    }
    // Merge rest of KYC fields in one go (PAN number, Aadhaar number, etc.)
    Object.assign(existingContactDetails, newKycDetails);
  }

  /**
   * Applies KYC document updates to applicant1 and applicant2 in a voucher form.
   * Only updates applicants that have existing contact details.
   *
   * @param voucherForm - The voucher form entity to update
   * @param kycDetails - Optional DTO containing KYC data for applicants
   * @returns void - Updates voucher in place
   */
  private updateVoucherKycDetails(
    voucherForm: VoucherForm,
    kycDetails?: ApplicantsDto,
  ): void {
    // Nothing to merge if KYC block is absent in request.
    if (!kycDetails) {
      return;
    }

    // Update applicant1 only when both payload + target object exist.
    if (kycDetails.applicant1 && voucherForm.applicant1?.contactDetails) {
      this.updateApplicantKycDetails(
        voucherForm.applicant1.contactDetails,
        kycDetails.applicant1,
      );
    }

    // Same guarded merge for applicant2 (optional in many records).
    if (kycDetails.applicant2 && voucherForm.applicant2?.contactDetails) {
      this.updateApplicantKycDetails(
        voucherForm.applicant2.contactDetails,
        kycDetails.applicant2,
      );
    }
  }

  /**
   * Stages RM edits on the voucher before the transaction in `persistVoucherUpdate`.
   * When `paymentDetails` is present: metrics → `resolveAndAssignTieredId` (same helper as customer flow).
   * Chronology: `determineVoucherChronology` after tier logic may have set `voucherForm.chronology`.
   *
   * @param voucherId - ID of voucher to update
   * @param updateVoucherDetailsDto - DTO with updates to apply
   * @returns Promise<Object> Prepared update object with voucherForm and payment data
   * @throws NotFoundException when voucher not found
   * @throws BadRequestException for invalid payment data
   */
  private async prepareVoucherUpdate(
    voucherId: number,
    updateVoucherDetailsDto: UpdateVoucherDetailsDto,
  ) {
    // Pull campaign as well since tiered ID generation depends on campaign thresholds/counters.
    const voucherForm = await this.voucherFormRepository.findOne({
      where: { id: voucherId, isDeleted: false },
      relations: ['campaign'],
    });

    if (!voucherForm) {
      throw new NotFoundException('Voucher form not found');
    }

    const existingGatewayTx = await this.voucherFormRepository.manager
      .createQueryBuilder(VoucherPayment, 'payment')
      .where('payment.voucher = :voucherId', { voucherId: voucherForm.id })
      .andWhere('payment.paymentMode = :paymentMode', {
        paymentMode: PaymentModeEnum.GATEWAY,
      })
      .getMany();

    const { eoiDetails, paymentDetails, kycDetails, residentStatus } =
      updateVoucherDetailsDto;
    const { payments = [], ...paymentDetailsWithoutPayments } =
      paymentDetails || {};

    // Validate that payments have unique transactionNumber and chequeNumber
    // Also check that they don't conflict with existing gateway payment IDs
    validatePaymentUniqueness(payments, existingGatewayTx);

    const existingPayments = await this.voucherFormRepository.manager
      .createQueryBuilder(VoucherPayment, 'payment')
      .where('payment.voucher = :voucherId', { voucherId: voucherForm.id })
      .getMany();

    const existingPaymentIds = new Set(
      existingPayments.map((p) => p.id).filter(Boolean),
    );

    // Used later for "new payment" emails to avoid notifying for already-saved rows.
    const newPayments = payments.filter(
      (payment) => !payment.id || !existingPaymentIds.has(payment.id),
    );

    // Recompute metrics on the complete picture: existing gateway tx + incoming payload.
    const mergedTransactions = [...existingGatewayTx, ...payments];

    voucherForm.eoiDetails = mergeEoiDetailsWithoutDowngrade(
      voucherForm.eoiDetails,
      eoiDetails,
    );

    // If RM sets EOI type to Standard/Preferential while the form is still in
    // Voucher phase, switch the UI/form journey to EOI.
    const switchingToEoi =
      eoiDetails?.eoiType === EOITypeEnum.STANDARD ||
      eoiDetails?.eoiType === EOITypeEnum.PREFERENTIAL;
    if (voucherForm.formPhase === VoucherFormType.VOUCHER && switchingToEoi) {
      voucherForm.formPhase = VoucherFormType.EOI;
    }

    this.updateVoucherKycDetails(voucherForm, kycDetails);

    if (paymentDetails) {
      // `validPaidAmount` handles cheque-age and is the source of truth for tier jumps.
      const paymentMetrics = calculatePaymentMetrics(
        mergedTransactions,
        paymentDetails.amountPayable,
      );

      voucherForm.paymentDetails = {
        ...paymentDetailsWithoutPayments,
        totalAmountPaid: paymentMetrics.totalPaidAmount,
      };

      voucherForm.paymentStatus = determinePaymentStatus(paymentMetrics);

      // Reconciles already-assigned tier IDs against current paid eligibility.
      reconcileTierIdsForCurrentEligibility(
        voucherForm,
        voucherForm.campaign,
        paymentMetrics.validPaidAmount,
      );

      // Single entry point for paidVoucherId/stdEoiId/preEoiId assignment + chronology/formPhase upgrades.
      const tierConfig = await resolveAndAssignTieredId(
        voucherForm,
        voucherForm.campaign,
        paymentMetrics.validPaidAmount,
        (voucher, id) =>
          this.voucherFormsService.sendQueueIdAssignmentEmail(voucher, id),
        // Atomic DB counter allocation to avoid duplicate tier IDs during concurrent RM updates
        (counterField) =>
          allocateCampaignTierCounter(
            this.eoiCampaignRepository,
            voucherForm.campaign.id,
            counterField,
          ),
      );

      const recomputedMetrics =
        applyAssignedTierThresholdAmountAndRecomputeMetrics(
          voucherForm,
          voucherForm.campaign,
          tierConfig,
          mergedTransactions,
        );
      let metricsForStatusAndQueue = paymentMetrics;

      if (recomputedMetrics) {
        metricsForStatusAndQueue = recomputedMetrics;
        voucherForm.paymentStatus = determinePaymentStatus(
          metricsForStatusAndQueue,
        );
        if (
          tierConfig &&
          (tierConfig.tier === VoucherIdFieldNameEnum.STD_EOI_ID ||
            tierConfig.tier === VoucherIdFieldNameEnum.PRE_EOI_ID)
        ) {
          markFormSubmittedOnTierChange(voucherForm, tierConfig);
        }
      }

      if (
        tierConfig &&
        shouldGenerateQueueId(voucherForm, metricsForStatusAndQueue)
      ) {
        await generateAndAssignTieredQueueId(
          voucherForm,
          tierConfig,
          (campaignId, queueType) =>
            this.voucherFormsService.generateQueueId(campaignId, queueType),
        );
      }
    }

    if (residentStatus) {
      voucherForm.residentStatus = residentStatus;
      voucherForm.applicant1.personalDetails.residentStatus = residentStatus;
    }
    this.updateVoucherFormStatus(voucherForm);

    // Final chronology recompute keeps status text aligned with latest IDs/cancellation state.
    voucherForm.chronology = determineVoucherChronology(voucherForm);

    return {
      voucherForm,
      payments,
      newPayments,
      paymentDetailsPresent: Boolean(paymentDetails),
      existingPayments,
    };
  }

  updateVoucherFormStatus(voucherForm: VoucherForm): void {
    const status = voucherForm.voucherFormStatus;

    if (
      status === VoucherFormStatusEnum.MIS_REQUESTED_CHANGES ||
      status === VoucherFormStatusEnum.MIS_UPDATED
    ) {
      voucherForm.voucherFormStatus = VoucherFormStatusEnum.MIS_UPDATED;
    } else if (
      status === VoucherFormStatusEnum.CRM_REQUESTED_CHANGES ||
      status === VoucherFormStatusEnum.CRM_UPDATED
    ) {
      voucherForm.voucherFormStatus = VoucherFormStatusEnum.CRM_UPDATED;
    } else if (
      status === VoucherFormStatusEnum.CREATED ||
      status === VoucherFormStatusEnum.IN_PROGRESS
    ) {
      voucherForm.voucherFormStatus = VoucherFormStatusEnum.IN_PROGRESS;
    }
  }

  /**
   * Commits what `prepareVoucherUpdate` staged (tier IDs already applied in memory there).
   * Transaction: `syncVoucherPaymentsInTransaction` + save voucher; campaign save when guard matches.
   * Post-commit: payment confirm + submission emails (not tier helpers — those ran in prepare).
   *
   * @param params - Object containing voucherForm, payments, and persistence flags
   * @returns Promise<VoucherForm> Updated voucher form entity
   */
  private async persistVoucherUpdate({
    voucherForm,
    payments,
    newPayments,
    paymentDetailsPresent,
    existingPayments,
  }: {
    voucherForm: VoucherForm;
    payments: any[];
    newPayments: any[];
    paymentDetailsPresent: boolean;
    existingPayments: VoucherPayment[];
  }) {
    // Snapshot DB rows by id so sync can merge DTO fields with what we already stored (e.g. deposit slip).
    const existingPaymentsMap = new Map(existingPayments.map((p) => [p.id, p]));

    // Keep voucher + payment sync atomic; either everything persists or nothing does.
    const updatedVoucherForm =
      await this.voucherFormRepository.manager.transaction(async (manager) => {
        if (payments.length > 0) {
          // Upsert non-gateway lines only; gateway tx stay out of this path by design.
          await this.voucherFormsService.syncVoucherPaymentsInTransaction(
            manager,
            voucherForm,
            payments,
            existingPaymentsMap,
          );

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
            // Any newly unverified payment should pull finance status back for re-check.
            voucherForm.financeStatus = PaymentTxStatusEnum.UNVERIFIED;
          }

          if (
            hasRejectedPayments &&
            voucherForm.financeStatus !== PaymentTxStatusEnum.REJECTED &&
            voucherForm.paymentStatus !== VoucherPaymentStatus.PAID
          ) {
            // Reject only while voucher is not fully paid; PAID should not regress.
            voucherForm.financeStatus = PaymentTxStatusEnum.REJECTED;
          }
        }

        // No need to save(campaign) here — counter already persisted by atomic UPDATE in allocateCampaignTierCounter

        // Persists voucher JSON columns + statuses computed in prepareVoucherUpdate (incl. tier IDs if any).
        return manager.save(voucherForm);
      });

    if (newPayments.length > 0 && paymentDetailsPresent) {
      // Fire-and-forget; failure must not undo a successful commit.
      this.voucherFormsService
        .sendPaymentConfirmationEmails(voucherForm, newPayments)
        .catch((error) =>
          logger.error('Failed to send payment confirmation emails', error),
        );
    }

    if (paymentDetailsPresent) {
      // Post-save entity from DB: relations are safer than the in-memory graph we mutated inside the tx.
      const voucherFormWithCampaign = await this.voucherFormRepository.findOne({
        where: { id: updatedVoucherForm.id },
        relations: ['campaign', 'createdBy', 'misChecker'],
      });

      if (voucherFormWithCampaign) {
        // Customer-facing summary (queue copy + link back to the form).
        this.voucherFormsService
          .sendVoucherSubmissionEmail(voucherFormWithCampaign)
          .catch((error) =>
            logger.error('Failed to send voucher submission email', error),
          );

        const rmName = voucherFormWithCampaign.createdBy?.name || 'RM';

        // Internal ping: same submit event, different template + RM/MIS recipients.
        this.voucherFormsService
          .sendFormSubmittedNotificationToRmMis(voucherFormWithCampaign, rmName)
          .catch((error) =>
            logger.error(
              'Failed to send form submitted notification to RM/MIS',
              error,
            ),
          );
      }
    }

    return updatedVoucherForm;
  }

  /**
   * Initiates cancellation of an EOI/voucher by RM with optional remarks.
   * Changes status to CANCEL_ACCEPTED and creates backend checker notification.
   *
   * @param user - Current user initiating the cancellation
   * @param cancelEoiDto - DTO containing voucherId and cancellation remarks
   * @returns Promise<any> Success response with updated voucher ID
   * @throws NotFoundException when voucher is not found
   * @throws BadRequestException when voucher is already in cancellation process
   */
  async cancelEOI(user: any, cancelEoiDto: CancelEoiDto): Promise<any> {
    try {
      const { voucherId, remarks } = cancelEoiDto;
      const notifications: any[] = [];
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { id: voucherId, isDeleted: false },
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
          'The voucher has already been initiated for cancellation',
        );
      }

      const { updateFields } = buildCancellationUpdate(voucherForm, {
        status: VoucherFormStatusEnum.CANCEL_REQUESTED,
        cancelReason: remarks,
        cancelledBy: user?.dbId,
        reasonActor: ReasonActorEnum.RM,
      });

      //email notification
      this.sendCancellationRequestedByRMEmail(voucherForm, remarks).catch(
        (error) => {
          logger.error('Failed to send cancellation revoked email', error);
        },
      );

      notifications.push({
        title: 'Voucher Cancellation Requested by RM',
        message: `A voucher with Unique Reference ID "${voucherForm.uniqueReferenceId}" has been requested for cancellation by ${user?.name} (${user?.role}).`,
        type: 'Voucher',
        isForAllAdmin: true,
      });

      this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
        notifications,
      });

      await this.voucherFormRepository.update(
        { id: voucherId },
        { ...updateFields, cancelledFrom: voucherForm.voucherFormStatus },
      );

      return {
        statusCode: SUCCESS,
        data: { id: voucherForm.id },
        message: 'Cancellation requested by RM successfully',
      };
    } catch (error) {
      logger.error('Error deleting voucher form:', error);
      throw error;
    }
  }

  /**
   * Soft-deletes or restores a voucher form with reason tracking.
   * Maintains deletion/restoration audit trail with remarks from the user.
   *
   * @param user - Current user performing the action
   * @param dto - DTO containing voucherId, action (delete/restore), and remarks
   * @returns Promise<any> Success response with deletion status and remarks
   * @throws NotFoundException when voucher is not found
   * @throws BadRequestException when remarks are empty
   */
  async deleteRestoreVoucher(
    user: any,
    dto: DeleteRestoreVoucherDto,
  ): Promise<any> {
    const { voucherId, action, remarks } = dto;

    try {
      logger.info(
        `Deletion status update requested by user ${user?.dbId ?? 'N/A'} for voucher ${voucherId}`,
      );

      const voucher = await this.voucherFormRepository.findOne({
        where: { id: voucherId },
        select: ['id', 'voucherFormStatus', 'isDeleted', 'deletionRemarks'],
      });

      if (!voucher) {
        throw new NotFoundException('Voucher form not found');
      }

      const trimmedRemarks =
        typeof remarks === 'string' ? remarks.trim() : undefined;

      if (!trimmedRemarks) {
        throw new BadRequestException('Remarks are required for this action');
      }

      const isDeleted = action === VoucherDeletionStatusEnum.DELETE;

      const existingDeletionRemarks = voucher.deletionRemarks ?? undefined;
      const deletionRemarks: VoucherDeletionRemarks = existingDeletionRemarks
        ? { ...existingDeletionRemarks }
        : {};

      if (isDeleted) {
        deletionRemarks.deletionReason = trimmedRemarks;
      } else {
        deletionRemarks.restoreReason = trimmedRemarks;
      }

      await this.voucherFormRepository.update(
        { id: voucherId },
        {
          isDeleted,
          deletionRemarks,
        },
      );

      return {
        statusCode: SUCCESS,
        message: `Voucher ${isDeleted ? 'deleted' : 'restored'} successfully`,
        data: {
          id: voucherId,
          isDeleted,
          deletionRemarks,
        },
      };
    } catch (error) {
      logger.error('Error updating voucher deletion status:', error);
      throw error;
    }
  }

  /**
   * Applies deletion status filter to query builder based on enum value.
   * Filters for deleted or active (non-deleted) vouchers.
   *
   * @param baseQb - Query builder to apply filter to
   * @param deletionStatus - Optional deletion status enum value
   * @returns void - Modifies builder in place
   */
  private applyDeletionStatusFilter(
    baseQb: SelectQueryBuilder<VoucherForm>,
    deletionStatus?: VoucherDeletionStatusEnum,
  ): void {
    const isDeleted = deletionStatus === VoucherDeletionStatusEnum.DELETE;
    baseQb.andWhere('voucher.isDeleted = :isDeleted', { isDeleted });
  }

  /**
   * Applies all available filters to the voucher query builder.
   * Delegates to specialized helper methods for different filter categories.
   *
   * @param baseQb - Query builder to apply filters to
   * @param filters - Filter DTO with all available filter options
   * @returns void - Modifies builder in place
   */
  private applyFilters(
    baseQb: SelectQueryBuilder<VoucherForm>,
    filters: ListVouchersFilterDto,
  ) {
    const {
      campaignId,
      primarySource,
      leadStatus,
      formStatus,
      paymentStatus,
      search,
      startDate,
      endDate,
      financeStatus,
      deletionStatus,
      rmUsers,
      cpLinkIds,
      isCancellationTab,
    } = filters;

    this.applyBaseVoucherFilters(baseQb, {
      campaignId,
      primarySource,
      leadStatus,
      formStatus,
      paymentStatus,
      search,
      startDate,
      endDate,
      financeStatus,
    });

    this.applyDeletionStatusFilter(baseQb, deletionStatus);

    if (isCancellationTab) {
      const cancellationStatuses = [
        VoucherFormStatusEnum.CANCEL_REQUESTED,
        VoucherFormStatusEnum.CANCEL_ACCEPTED,
        VoucherFormStatusEnum.CANCEL_APPROVED,
        VoucherFormStatusEnum.REFUND_INITIATED,
        VoucherFormStatusEnum.CANCELLED,
      ];
      baseQb.andWhere('voucher.voucher_status IN (:...cancellationStatuses)', {
        cancellationStatuses,
      });
    }

    if (rmUsers?.length > 0 && !filters.isEoiLeaderboard) {
      baseQb.andWhere(
        '(voucher.createdBy IN (:...rmUsers) OR voucher.closingRm IN (:...rmUsers))',
        { rmUsers },
      );
    }

    if (cpLinkIds?.length > 0) {
      baseQb.andWhere('voucher.cpLinkId IN (:...cpLinkIds)', { cpLinkIds });
    }
    // Move the more complex "eoi-dashboard" filters to a dedicated helper
    this.applyEOIDashboardFilters(baseQb, filters);
    this.applyEoiLeaderboardFilters(baseQb, filters);
  }

  /**
   * Applies fundamental voucher filters (campaign, status, payment, search, dates).
   * Used as the base filtering layer for all voucher queries.
   *
   * @param baseQb - Query builder instance
   * @param filters - Filter subset containing basic voucher criteria
   * @returns void - Modifies builder in place
   */
  private applyBaseVoucherFilters(
    baseQb: SelectQueryBuilder<VoucherForm>,
    filters: Pick<
      ListVouchersFilterDto,
      | 'campaignId'
      | 'primarySource'
      | 'leadStatus'
      | 'formStatus'
      | 'paymentStatus'
      | 'search'
      | 'startDate'
      | 'endDate'
      | 'financeStatus'
    >,
  ): void {
    const {
      campaignId,
      primarySource,
      leadStatus,
      formStatus,
      paymentStatus,
      search,
      startDate,
      endDate,
      financeStatus,
    } = filters;

    if (campaignId) {
      baseQb.andWhere('campaign.id = :campaignId', { campaignId });
    }

    if (primarySource) {
      baseQb.andWhere('voucher.primarySource = :primarySource', {
        primarySource,
      });
    }

    if (leadStatus) {
      baseQb.andWhere('voucher.leadStatus = :leadStatus', { leadStatus });
    }

    if (Array.isArray(formStatus) && formStatus.length) {
      baseQb.andWhere('voucher.voucherFormStatus IN (:...formStatus)', {
        formStatus,
      });
    }

    if (Array.isArray(paymentStatus) && paymentStatus.length) {
      baseQb.andWhere('voucher.paymentStatus IN (:...paymentStatus)', {
        paymentStatus,
      });
    }

    if (search) {
      baseQb.andWhere(
        `(
        LOWER(CONCAT(
          JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.firstName')), ' ',
          JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.lastName'))
        )) LIKE LOWER(:search)
        OR LOWER(voucher.uniqueReferenceId) LIKE LOWER(:search)
        OR LOWER(voucher.paidVoucherId) LIKE LOWER(:search)
        OR JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.contactNumber')) LIKE :search
        OR LOWER(voucher.sfdcEnquiryId) LIKE LOWER(:search)
        OR LOWER(voucher.stdEoiId) LIKE LOWER(:search)
        OR LOWER(voucher.preEoiId) LIKE LOWER(:search)
        OR LOWER(mappedUnit.unitNumber) LIKE LOWER(:search)
      )`,
        { search: `%${search}%` },
      );
    }

    if (startDate && endDate) {
      baseQb.andWhere('voucher.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (Array.isArray(financeStatus) && financeStatus.length) {
      baseQb.andWhere('voucher.financeStatus IN (:...financeStatus)', {
        financeStatus,
      });
    }
  }

  /**
   * Applies EOI leaderboard-specific filters for RM-wise performance metrics.
   * Filters vouchers that have collected payments and meet leaderboard criteria.
   *
   * @param baseQb - Query builder instance
   * @param filters - Filter DTO containing leaderboard-specific options
   * @returns void - Modifies builder in place
   */
  private applyEoiLeaderboardFilters(
    baseQb: SelectQueryBuilder<VoucherForm>,
    filters: ListVouchersFilterDto,
  ) {
    const { isEoiLeaderboard, rmUsers } = filters;

    const paymentStatuses = [
      VoucherPaymentStatus.PAID,
      VoucherPaymentStatus.PARTIALLY_PAID,
    ];

    const cancellationStatuses = this.getCancellationStatuses();
    const cancellationStatusesStr = cancellationStatuses
      .map((s) => `'${s}'`)
      .join(', ');

    if (isEoiLeaderboard) {
      if (rmUsers?.length > 0) {
        baseQb.andWhere('(voucher.createdBy IN (:...rmUsers))', { rmUsers });
      }

      baseQb.andWhere(
        `(voucher.voucher_status NOT IN('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr}) OR (voucher.voucher_status = '${VoucherFormStatusEnum.IN_PROGRESS}' AND voucher.payment_status IN (:...paymentStatuses)))`,
        { paymentStatuses },
      );
    }
  }

  /**
   * Applies EOI dashboard-specific filters for detailed analytics and pending tracking.
   * Handles complex multi-status filtering for various department pending workflows.
   *
   * @param baseQb - Query builder instance
   * @param filters - Filter DTO containing EOI dashboard-specific options
   * @returns void - Modifies builder in place
   */
  private applyEOIDashboardFilters(
    baseQb: SelectQueryBuilder<VoucherForm>,
    filters: ListVouchersFilterDto,
  ) {
    const {
      queueIdAllotted,
      eoiCollected,
      rmPending,
      misPending,
      crmPending,
      totalEoiAmount,
      unitType,
      eoiCollectedPartiallyPaid,
      totalEoiAmountCollected,
    } = filters;

    if (queueIdAllotted) {
      baseQb.andWhere(
        'voucher.paid_voucher_id IS NOT NULL AND voucher.finance_status != :rejectedStatus',
        { rejectedStatus: PaymentTxStatusEnum.REJECTED },
      );
    }

    if (unitType) {
      baseQb.andWhere(
        `JSON_UNQUOTE(JSON_EXTRACT(voucher.eoi_details, '$.typology')) = :unitType`,
        { unitType },
      );
    }

    const paymentStatuses = [
      VoucherPaymentStatus.PAID,
      VoucherPaymentStatus.PARTIALLY_PAID,
    ];

    const cancellationStatuses = this.getCancellationStatuses();
    const cancellationStatusesStr = cancellationStatuses
      .map((s) => `'${s}'`)
      .join(', ');

    if (eoiCollected) {
      baseQb.andWhere(
        `(voucher.voucher_status NOT IN('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr}) OR (voucher.voucher_status = '${VoucherFormStatusEnum.IN_PROGRESS}' AND voucher.payment_status IN (:...paymentStatuses))
        OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}')
        )`,
        { paymentStatuses },
      );
    }

    if (totalEoiAmount) {
      baseQb.andWhere(
        `(voucher.voucher_status NOT IN('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr}) OR (voucher.voucher_status = '${VoucherFormStatusEnum.IN_PROGRESS}' AND voucher.payment_status IN (:...paymentStatuses))
         OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}'))`,
        { paymentStatuses },
      );
    }

    if (totalEoiAmountCollected) {
      baseQb.andWhere(
        `((voucher.voucher_status NOT IN('${VoucherFormStatusEnum.CREATED}', ${cancellationStatusesStr}) AND voucher.payment_status IN (:...paymentStatuses))
         OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}'))`,
        { paymentStatuses },
      );
    }

    if (eoiCollectedPartiallyPaid) {
      baseQb.andWhere(
        `(voucher.voucher_status NOT IN ('${VoucherFormStatusEnum.CREATED}', ${cancellationStatusesStr}) OR voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}') AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}'`,
      );
    }

    if (rmPending) {
      const rmStatusesWithPaid = [
        VoucherFormStatusEnum.IN_PROGRESS,
        VoucherFormStatusEnum.MIS_REQUESTED_CHANGES,
        VoucherFormStatusEnum.CRM_REQUESTED_CHANGES,
        VoucherFormStatusEnum.CANCEL_REQUESTED,
      ];

      baseQb.andWhere(
        `(
          (voucher.voucher_status IN (:...rmStatusesWithPaid) AND voucher.payment_status = :paidStatus)
        )`,
        {
          rmStatusesWithPaid,
          paidStatus: VoucherPaymentStatus.PAID,
        },
      );
    }

    if (misPending) {
      const misStatuses = [
        VoucherFormStatusEnum.UNVERIFIED,
        VoucherFormStatusEnum.MIS_UPDATED,
      ];

      baseQb.andWhere(
        `(
          (voucher.voucher_status IN (:...misStatuses) AND voucher.payment_status = :paidStatus)
        )`,
        {
          misStatuses,
          paidStatus: VoucherPaymentStatus.PAID,
        },
      );
    }

    if (crmPending) {
      const crmStatuses = [
        VoucherFormStatusEnum.MIS_VERIFIED,
        VoucherFormStatusEnum.CRM_UPDATED,
        VoucherFormStatusEnum.CANCEL_ACCEPTED,
        VoucherFormStatusEnum.CANCEL_APPROVED,
        VoucherFormStatusEnum.REFUND_INITIATED,
      ];

      baseQb.andWhere(
        `(
          (voucher.voucher_status IN (:...crmStatuses) AND voucher.payment_status = :paidStatus) AND voucher.finance_status = :verifiedStatus
        )`,
        {
          crmStatuses,
          paidStatus: VoucherPaymentStatus.PAID,
          verifiedStatus: PaymentTxStatusEnum.VERIFIED,
        },
      );
    }
  }

  /**
   * Parses sort parameter string into field and direction components.
   * Handles mapping of user-friendly sort field names to database columns.
   *
   * @param sortBy - Sort string in 'field:direction' format
   * @returns Object with sortField (column name) and sortDirection (ASC/DESC)
   */
  private parseSort(sortBy?: string): {
    sortField: string;
    sortDirection: 'ASC' | 'DESC';
  } {
    let sortField = 'voucher.createdAt';
    let sortDirection: 'ASC' | 'DESC' = 'DESC';

    if (!sortBy) return { sortField, sortDirection };

    const [field, direction = 'DESC'] = sortBy.split(':');
    const dir = direction.toUpperCase() as 'ASC' | 'DESC';

    const sortFieldMap: Record<string, string> = {
      campaignName: 'campaign.campaignName',
      createdAt: 'voucher.createdAt',
      uniqueReferenceId: 'voucher.uniqueReferenceId',
      customerName: 'customerName',
      sequenceId: 'sequenceId',
      queueId: 'voucher.queueId',
      paidVoucherId: 'voucher.paidVoucherId',
      stdEoiId: 'voucher.stdEoiId',
      preEoiId: 'voucher.preEoiId',
    };

    if (field in sortFieldMap && (dir === 'ASC' || dir === 'DESC')) {
      sortField = sortFieldMap[field];
      sortDirection = dir;
    }
    return { sortField, sortDirection };
  }

  /**
   * Validates that date range parameters are properly provided and logically ordered.
   * Ensures both dates are present if any date filtering is intended.
   *
   * @param startDate - Optional start date string
   * @param endDate - Optional end date string
   * @throws BadRequestException when date range is invalid
   */
  private validateDateRange(startDate?: string, endDate?: string): void {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new BadRequestException('Start Date & End Date both required');
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('Start Date cannot be after End Date');
    }
  }

  /**
   * Saves agreement values and booking amount correspondence for vouchers
   * @param voucherId - Voucher ID
   * @param saveAgreementValuesDto - Agreement values and booking amount data
   * @param user - Current user performing the action
   * @returns Promise<any> - Response with saved data
   */
  async saveAgreementDetails(
    saveAgreementValuesDto: SaveAgreementDetailsDto,
    user: any,
  ): Promise<any> {
    try {
      const { opportunityId, agreementValue, bookingAmount, voucherId } =
        saveAgreementValuesDto;

      const bookingOfficeUse = await this.bookingOfficeUseRepository.findOne({
        where: { opportunityId },
      });

      if (!bookingOfficeUse) {
        throw new NotFoundException(
          `Booking office use record not found for opportunity ID ${opportunityId}`,
        );
      }
      // Update voucher with agreement values and booking amount

      bookingOfficeUse.agreementValue = agreementValue;
      bookingOfficeUse.voucherId = voucherId;
      if (bookingAmount !== undefined) {
        bookingOfficeUse.bookingAmount = bookingAmount;
      }

      await this.bookingOfficeUseRepository.save(bookingOfficeUse);

      // Log the action
      logger.info(
        `Agreement values and booking amount logged for voucher for - ${opportunityId}:`,
        {
          agreementValue: saveAgreementValuesDto.agreementValue,
          bookingAmount: saveAgreementValuesDto.bookingAmount,
          updatedBy: user.dbId,
        },
      );

      return {
        statusCode: SUCCESS,
        message: 'Agreement values and booking Amount saved successfully',
        data: bookingOfficeUse,
      };
    } catch (error) {
      logger.error('Failed to save agreement details:', error);
      logsAndErrorHandling(
        'EoiManagementService - saveAgreementDetails',
        error,
        {
          saveAgreementValuesDto,
          user,
        },
      );
    }
  }

  async getAgreementDetails(opportunityId: string): Promise<any> {
    const bookingOfficeUse = await this.bookingOfficeUseRepository.findOne({
      where: { opportunityId },
      select: ['opportunityId', 'agreementValue', 'bookingAmount'],
    });

    if (!bookingOfficeUse) {
      throw new NotFoundException(
        `Booking office use record not found for opportunity ID ${opportunityId}`,
      );
    }

    return {
      statusCode: SUCCESS,
      message: 'Agreement details fetched successfully',
      data: {
        opportunityId: bookingOfficeUse.opportunityId,
        agreementValue: bookingOfficeUse.agreementValue,
        bookingAmount: bookingOfficeUse.bookingAmount,
      },
    };
  }

  /**
   * Constructs base query builder with RM role-specific filtering for dashboard views.
   * Applies campaign launch stage OR created-by/closing RM filters for RM users.
   *
   * @param user - Current user object for role-based access control
   * @param isEoiDashboard - Whether this is for EOI dashboard vs regular listing
   * @returns SelectQueryBuilder<VoucherForm> Base query with role filters applied
   */
  private buildBaseQuery(): SelectQueryBuilder<VoucherForm> {
    const qb = this.voucherFormRepository
      .createQueryBuilder('voucher')
      .leftJoin('voucher.campaign', 'campaign')
      .leftJoin('voucher.channelPartner', 'cp')
      .leftJoin('voucher.mappedUnit', 'mappedUnit')
      .addSelect(['cp.id', 'cp.cpType', 'cp.cpName'])
      .addSelect('MAX(mappedUnit.unitNumber)', 'preferredUnit');
    return qb;
  }

  /**
   * Adds computed voucherCount field to query based on user_voucher_tracking_id grouping.
   * Counts related vouchers with collected payments (PAID or PARTIALLY_PAID status).
   *
   * @param qb - Query builder to augment
   * @returns void - Modifies builder in place
   */
  private addComputedVoucherCount(qb: any) {
    qb.leftJoin('voucher.createdBy', 'user')
      .leftJoin('voucher.closingRm', 'closingRm')
      .addSelect([
        'campaign.id',
        'campaign.campaignName',
        'campaign.pushToSfdc',
        'campaign.sfdcProjectName',
        'campaign.projectId',
        'campaign.enableEOIsAllRms',
        'user.id',
        'user.name',
        'closingRm.id',
        'closingRm.name',
      ])
      .leftJoin(
        VoucherForm,
        'v2',
        `
        v2.campaign_id = voucher.campaign_id
        AND v2.user_voucher_tracking_id = voucher.user_voucher_tracking_id
        AND v2.payment_status IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}')
      `,
      )
      .addSelect('COUNT(v2.id)', 'voucherCount')
      .groupBy('voucher.id');
  }

  /**
   * Applies pagination to query builder if skip flag is not set.
   * Calculates offset based on page number and page size.
   *
   * @param qb - Query builder to paginate
   * @param page - Current page number (1-indexed)
   * @param pageSize - Number of records per page
   * @param skip - Whether to skip pagination
   * @returns void - Modifies builder in place
   */
  private paginateIfNeeded(
    qb: any,
    page: number,
    pageSize: number,
    skip: boolean,
  ) {
    if (!skip) qb.skip((page - 1) * pageSize).take(pageSize);
  }

  /**
   * Attaches computed voucher count to each voucher entity from raw query results.
   * Used after executing getRawAndEntities() to sync counts with entities.
   *
   * @param entities - Array of voucher form entities
   * @param raw - Array of raw query results with voucherCount column
   * @returns void - Updates entities in place
   */
  private attachVoucherCounts(entities: any[], raw: any[]): void {
    for (const [i, v] of entities.entries()) {
      v.voucherCount = Number(raw[i]?.voucherCount ?? 0);
      v.preferredUnit = raw[i]?.preferredUnit ?? null;
    }
  }

  /**
   * Retrieves a filtered and paginated list of vouchers with role-based access control.
   * Includes transaction details and finance remarks with single query optimization.
   * Formats applicant information and applies sorting, pagination, and search filters.
   *
   * @param user - Current user for role-based filtering
   * @param filterDto - Optional DTO with filters, pagination, sorting, and date range
   * @param skipPagination - Skip pagination flag for exports (optional, default false)
   * @param includePayments - Include transaction details flag (optional, default false)
   * @returns Promise<any> Response with paginated vouchers and total count
   * @throws BadRequestException for invalid date ranges
   */
  async listVouchers(
    user: any,
    filterDto?: ListVouchersFilterDto,
    skipPagination: boolean = false,
    includePayments: boolean = false,
  ): Promise<any> {
    try {
      const {
        page = DEFAULT_PAGE,
        limit = DEFAULT_LIMIT,
        sortBy,
        startDate,
        endDate,
        isEoiDashboard,
      } = filterDto || {};

      this.validateDateRange(startDate, endDate);

      const pageNum = Math.max(1, Number(page) || 1);
      const pageSize = Math.max(1, Number(limit) || DEFAULT_LIMIT);
      const { sortField, sortDirection } = this.parseSort(sortBy);

      // Build + filter
      const qb = this.buildBaseQuery();
      await this.applyRMVisibilityFilter(qb, user, isEoiDashboard);

      this.applyFilters(qb, filterDto || {});

      // Count first
      const total = await qb.clone().getCount();

      // Compose the page query
      this.addComputedVoucherCount(qb);
      this.addBlockingData(qb);
      this.applyBatchSlotJoins(qb);
      this.applySortingToQuery(qb, sortField, sortDirection);
      this.paginateIfNeeded(qb, pageNum, pageSize, skipPagination);

      // Fetch and stitch computed counts
      const { raw, entities } = await qb.getRawAndEntities();
      this.attachVoucherCounts(entities, raw);
      this.attachBlockingIds(entities, raw);
      this.attachBatchSlotData(entities, raw);

      await Promise.all([
        this.fetchTransactionsData(entities, includePayments),
        this.mapReferralData(entities),
      ]);

      let formatted = this.formatListResponse(entities, { includePayments });
      // Fetch project ids where logged-in user has RM Buddy access
      if (RM_BUDDY_ALLOWED_ROLES.includes(user.role)) {
        const buddyRMProjectIdsSet = new Set(
          await this.hasBuddyRMPermission(user.dbId),
        );

        formatted = formatted.map((item) => {
          let hasBuddyRMPermission =
            buddyRMProjectIdsSet.has(item?.campaign?.projectId) &&
            item?.campaign?.enableEOIsAllRms === true;

          // For RM users, own created/assigned EOIs
          // should not be treated as RM Buddy access
          if (user.role === RolesEnum.RM) {
            const isOwnRecord =
              item?.createdBy === user.dbId || item?.closingRm === user.dbId;
            hasBuddyRMPermission = hasBuddyRMPermission && !isOwnRecord;
          }

          return {
            ...item,
            hasBuddyRMPermission,
          };
        });
      }

      return {
        statusCode: SUCCESS,
        message: 'Vouchers retrieved successfully',
        data: {
          result: filterVoucherList(formatted, user.role),
          total,
          page: pageNum,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      logger.error('Error retrieving vouchers:', error);
      logsAndErrorHandling('eoiManagementService - listVouchers', error, {
        user,
        filterDto,
        skipPagination,
      });
    }
  }

  private applyBatchSlotJoins(qb: SelectQueryBuilder<VoucherForm>) {
    qb.leftJoin(
      'eoi_batch_vouchers',
      'batchVoucher',
      `
        batchVoucher.voucher_id = voucher.id
        AND (
          (
            campaign.stage = :preFillStage
            AND batchVoucher.stage = :unitAllotmentStage
          )
          OR
          (
            campaign.stage = :launchCampaignStage
            AND batchVoucher.stage = :launchBatchStage
          )
        )
      `,
      {
        preFillStage: EoiCampaignStageType.PRE_FILL,
        unitAllotmentStage: BatchStage.UNIT_ALLOTMENT,

        launchCampaignStage: EoiCampaignStageType.LAUNCH,
        launchBatchStage: BatchStage.LAUNCH,
      },
    )
      .leftJoin('eoi_batch_slots', 'slot', 'slot.id = batchVoucher.slot_id')
      .leftJoin('eoi_batches', 'batch', 'batch.id = batchVoucher.batch_id')
      .addSelect('MAX(slot.name)', 'slotName')
      .addSelect("DATE_FORMAT(MAX(slot.date), '%Y-%m-%d')", 'slotDate')
      .addSelect('MAX(slot.startTime)', 'startTime')
      .addSelect('MAX(batch.stage)', 'batchStage')
      .addSelect('MAX(batchVoucher.status)', 'voucherBatchStatus');
  }

  private attachBlockingIds(entities: any[], raw: any[]): void {
    entities.forEach((entity, index) => {
      entity.blockingId = raw[index]?.blockingId || null;
      entity.inventoryUnitId = raw[index]?.inventoryUnitId || null;
    });
  }

  private attachBatchSlotData(entities: any[], raw: any[]): void {
    entities.forEach((entity, index) => {
      entity.slotName = raw[index]?.slotName || null;
      entity.slotDate = raw[index]?.slotDate || null;
      entity.startTime = raw[index]?.startTime || null;
      entity.batchStage = raw[index]?.batchStage || null;
      entity.voucherBatchStatus = raw[index]?.voucherBatchStatus || null;
    });
  }

  /**
   * Checks projects table for buddy RM assignments and returns matching project IDs.
   * @param user - Current user object with dbId and buddyRMs array
   * @returns Promise<number[]> - Array of project IDs where user is assigned as buddy RM
   */
  private async hasBuddyRMPermission(userId: number): Promise<number[]> {
    const projectsWithBuddyRM = await this.projectsRepository
      .createQueryBuilder('project')
      .select(['project.id'])
      .where('JSON_CONTAINS(project.buddy_rms, :userId)', {
        userId: JSON.stringify(userId),
      })
      .getRawMany();
    return projectsWithBuddyRM.map((p) => p.project_id);
  }

  /**
   * Applies RM and RM Buddy EOI visibility conditions.
   */
  private async applyRMVisibilityFilter(
    qb: SelectQueryBuilder<VoucherForm>,
    user: any,
    isEoiDashboard: boolean,
  ): Promise<void> {
    if (user.role !== RolesEnum.RM || isEoiDashboard) {
      return;
    }

    const buddyCampaignIds = await this.getBuddyRMCampaignIds(user.dbId);
    // Default RM visibility rules:
    //- when logged-in RM created the EOI
    // - OR when logged-in RM is assigned as closing RM
    let condition = `
    (
      voucher.createdBy = :id
      OR voucher.closingRm = :id
    `;
    // - Show EOIs when campaign allows all RMs Buddy acess with campaign flag true
    if (buddyCampaignIds.length) {
      condition += ` OR campaign.id IN (:...buddyCampaignIds)`;
    }

    condition += `)`;

    qb.andWhere(condition, {
      id: user.dbId,
      buddyCampaignIds,
    });
  }

  /**
   * Fetches all campaign IDs belonging to projects
   * where the logged-in user is assigned as RM Buddy.
   * Used to provide project-level EOI visibility access.
   */
  async getBuddyRMCampaignIds(userId: number): Promise<number[]> {
    const projectIds = await this.hasBuddyRMPermission(userId);
    if (!projectIds.length) {
      return [];
    }

    const campaigns = await this.eoiCampaignRepository
      .createQueryBuilder('campaign')
      .select(['campaign.id'])
      .where('campaign.projectId IN (:...projectIds)', {
        projectIds,
      })
      .andWhere('campaign.enableEOIsAllRms = :isEnabled', {
        isEnabled: true,
      })
      .getRawMany();

    return campaigns.map((c) => c.campaign_id);
  }

  private addBlockingData(qb: SelectQueryBuilder<VoucherForm>): void {
    qb.leftJoin('voucher.blockings', 'blocking', 'blocking.deleted_at IS NULL')
      .addSelect('MAX(blocking.id)', 'blockingId')
      .addSelect('MAX(blocking.inventory_unit_id)', 'inventoryUnitId');
  }

  /**
   * Refactored helper (≤15 complexity): attaches `transactionDetails` and `financeRemarks`.
   * - includePayments=true: group payments -> details + first non-empty comment (DESC date)
   * - includePayments=false: only latest non-empty comment; details is empty
   */
  // eslint-disable-next-line
  private async fetchTransactionsData(
    entities: any[],
    includePayments: boolean,
  ): Promise<void> {
    if (!entities.length) return;

    const voucherIds = entities.map((v) => v.id);

    // Run both queries in parallel for optimal performance
    const [paymentsForChequeAlerts, latest] = await Promise.all([
      // Query 1: Fetch all payments for cheque alerts (no comments filter)
      this.voucherPaymentRepository
        .createQueryBuilder('vp')
        .select([
          'vp.voucher_id AS voucherId',
          'vp.payment_mode AS paymentMode',
          'vp.payment_details AS paymentDetails',
        ])
        .where('vp.voucher_id IN (:...ids)', { ids: voucherIds })
        .orderBy('vp.voucher_id', 'ASC')
        .addOrderBy('vp.created_at', 'DESC')
        .getRawMany(),
      // Query 2: Fetch latest non-empty remarks (DESC by date)
      this.voucherPaymentRepository
        .createQueryBuilder('vp')
        .select([
          'vp.voucher_id AS voucherId',
          'vp.comments AS comments',
          'vp.date AS date',
        ])
        .where('vp.voucher_id IN (:...ids)', { ids: voucherIds })
        .andWhere("(vp.comments IS NOT NULL AND vp.comments <> '')")
        .orderBy('vp.voucher_id', 'ASC')
        .addOrderBy('vp.created_at', 'DESC')
        .getRawMany(),
    ]);

    // Check for cheque alerts using all payments
    const chequeAlertsByVoucher = new Map<number, string | null>();
    for (const row of paymentsForChequeAlerts) {
      const voucherId = Number(row.voucherId);
      if (!Number.isFinite(voucherId)) continue;

      // Skip if already flagged for this voucher
      if (chequeAlertsByVoucher.has(voucherId)) continue;

      const paymentMode = row.paymentMode;
      let paymentDetails = row.paymentDetails;

      // Parse JSON if it's a string
      if (typeof paymentDetails === 'string') {
        try {
          paymentDetails = JSON.parse(paymentDetails);
        } catch {
          // If parsing fails, default to empty object
          paymentDetails = {};
        }
      }
      paymentDetails = paymentDetails || {};

      const method = paymentDetails.method;
      const chequeDepositSlip = paymentDetails.chequeDepositSlip;

      const isChequeAlert =
        paymentMode === PaymentModeEnum.OFFLINE &&
        method === PaymentMethodEnum.CHEQUE_DD &&
        (chequeDepositSlip === null ||
          chequeDepositSlip === undefined ||
          (Array.isArray(chequeDepositSlip) && chequeDepositSlip.length === 0));

      if (isChequeAlert) {
        chequeAlertsByVoucher.set(
          voucherId,
          CHEQUE_DEPOSIT_SLIP_MISSING_MESSAGE,
        );
      }
    }

    // Optionally load payments
    let detailsByVoucher = new Map<number, any[]>();
    let remarksByVoucher = new Map<number, string>();

    if (includePayments) {
      const payments = await this.voucherPaymentRepository.find({
        where: { voucher: { id: In(voucherIds) } },
        loadRelationIds: { relations: ['voucher', 'processedBy'] },
        order: { date: 'DESC' },
      });
      ({ detailsByVoucher, remarksByVoucher } =
        this.buildPaymentMaps(payments));
    }

    // Fill any missing remarks from latest rows.
    this.mergeLatestRemarks(latest, remarksByVoucher);

    // Single assignment pass
    for (const v of entities) {
      v.transactionDetails = detailsByVoucher.get(v.id) ?? [];
      v.financeRemarks = remarksByVoucher.get(v.id) ?? null;
      v.chequeAlerts = chequeAlertsByVoucher.get(v.id) ?? null;
    }
  }

  private async mapReferralData(entities: any[]): Promise<Map<number, string>> {
    if (!entities?.length) return;

    const referralVouchers = entities.filter(
      (v) =>
        v.primarySource === PrimarySourceEnum.PURVA_PRIVILEGE &&
        v.secondarySource === SecondarySourceEnum.REFERRAL,
    );

    const projectIds = [
      ...new Set(
        referralVouchers.map((v) => v?.sourceDetails?.project).filter(Boolean),
      ),
    ];

    let projectMap = new Map<number, string>();

    if (projectIds.length) {
      const projects = await this.projectsRepository.find({
        where: { id: In(projectIds) },
        select: ['id', 'name'],
      });

      projectMap = new Map(projects.map((p) => [p.id, p.name]));
    }

    // ONLY assign for referral
    for (const v of referralVouchers) {
      const projectId = v?.sourceDetails?.project;

      v.referrerName = v?.sourceDetails?.name;
      v.projectName = projectMap.get(projectId);
      v.unitNumber = v?.sourceDetails?.unit;
    }
  }

  /**
   * Constructs maps of transaction details and remarks keyed by voucher ID.
   * Groups payment transactions per voucher and captures earliest non-empty comment.
   *
   * @param payments - Array of payment entities from database
   * @returns Object with detailsByVoucher and remarksByVoucher maps
   */
  private buildPaymentMaps(payments: any[]): {
    detailsByVoucher: Map<number, any[]>;
    remarksByVoucher: Map<number, string>;
  } {
    const detailsByVoucher = new Map<number, any[]>();
    const remarksByVoucher = new Map<number, string>();

    for (const p of payments) {
      const vidRaw = p.voucher;
      const vid = typeof vidRaw === 'number' ? vidRaw : Number.NaN;
      if (!Number.isFinite(vid)) continue;

      // transaction details
      let list = detailsByVoucher.get(vid);
      if (!list) {
        list = [];
        detailsByVoucher.set(vid, list);
      }
      list.push(this.mapPaymentToDto(p));

      // first non-empty comment wins (payments already DESC)
      const c = (p.comments ?? '').trim();
      if (c && !remarksByVoucher.has(vid)) remarksByVoucher.set(vid, c);
    }

    return { detailsByVoucher, remarksByVoucher };
  }

  /**
   * Merges latest remarks from explicitly queried rows into remarks map.
   * Only adds remarks for vouchers that don't already have one.
   *
   * @param latestRows - Array of rows with latest remarks sorted by date DESC
   * @param remarksByVoucher - Map to merge latest remarks into
   * @returns void - Updates map in place
   */
  private mergeLatestRemarks(
    latestRows: Array<{ voucherId: number | string; comments?: string }>,
    remarksByVoucher: Map<number, string>,
  ): void {
    for (const row of latestRows) {
      const vid = Number(row.voucherId);
      const c = (row.comments ?? '').trim();
      if (c && !remarksByVoucher.has(vid)) remarksByVoucher.set(vid, c);
    }
  }

  /**
   * Converts a VoucherPayment entity to a transaction DTO for API responses.
   * Includes all transaction details with processed-by user information.
   *
   * @param p - VoucherPayment entity to convert
   * @returns Object Transaction DTO with payment details and metadata
   */
  private mapPaymentToDto(p: VoucherPayment) {
    return {
      id: p.id,
      paidAmount: Number(p.paidAmount),
      paymentMode: p.paymentMode,
      status: p.status,
      paymentType: p.paymentType,
      date: p.date,
      realisationDate: p.realisationDate || null,
      receiptNo: p.receiptNo || null,
      comments: p.comments || null,
      processedBy: p.processedBy
        ? { id: p.processedBy.id, name: p.processedBy.name }
        : null,
      paymentDetails: p.paymentDetails ?? null,
      /** Denormalized txn ref (same as export “Transaction ID” when populated). */
      voucherTransactionId: p.voucherTransactionId ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  /**
   * Applies sort order to query builder with special handling for computed fields.
   * Handles customerName and sequenceId computations and standard column sorting.
   *
   * @param baseQb - Query builder to update
   * @param sortField - Database column or computed field to sort by
   * @param sortDirection - Sort order (ASC or DESC)
   * @returns void - Modifies builder in place
   */
  private applySortingToQuery(
    baseQb: SelectQueryBuilder<VoucherForm>,
    sortField: string,
    sortDirection: 'ASC' | 'DESC',
  ): void {
    if (sortField === 'customerName') {
      baseQb.addSelect(
        `CONCAT(JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.firstName')), ' ', JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.lastName')))`,
        'customerName',
      );
      baseQb.orderBy('customerName', sortDirection);
    } else if (sortField === 'sequenceId') {
      baseQb.addSelect(
        `COALESCE(voucher.preferentialSequenceId, voucher.standardSequenceId, voucher.voucherSequenceId)`,
        'sequenceId',
      );
      baseQb.orderBy('sequenceId', sortDirection);
    } else {
      baseQb.orderBy(`${sortField}`, sortDirection);
    }
  }

  /**
   * Determines the appropriate sequence number to display based on voucher type.
   * Priority: preferential > standard > voucher if multiple exist.
   *
   * @param voucher - Voucher form entity
   * @returns string | null - Sequence number to display or null if not set
   */
  private displaySequenceNo(voucher: VoucherForm): string | null {
    let sequenceNo: string | null = null;
    if (voucher.preferentialSequenceId) {
      sequenceNo = voucher.preferentialSequenceId;
    } else if (voucher.standardSequenceId) {
      sequenceNo = voucher.standardSequenceId;
    } else if (voucher?.voucherSequenceId) {
      sequenceNo = voucher.voucherSequenceId;
    }
    return sequenceNo;
  }

  /**
   * Formats an array of voucher entities for API list response.
   * Optionally includes payment transaction details.
   * Maps database fields to user-friendly DTO structure.
   *
   * @param vouchers - Array of voucher entities to format
   * @param optional - Options object with includePayments flag
   * @returns Array of formatted voucher DTOs
   */
  private formatListResponse(
    vouchers: any[],
    optional?: { includePayments?: boolean },
  ) {
    if (!vouchers?.length) return [];

    const includePayments = !!optional?.includePayments;
    return vouchers.map((voucher) =>
      this.formatVoucherItem(voucher, includePayments),
    );
  }

  /**
   * Formats a single voucher entity into API response DTO with all enriched fields.
   * Applies masking to sensitive data (email, phone) and formats complex objects.
   * Handles deletion remarks and optional transaction details.
   *
   * @param voucher - Voucher entity to format
   * @param includePayments - Whether to include transactionDetails array
   * @returns Object Formatted voucher DTO ready for API response
   */
  // eslint-disable-next-line
  private formatVoucherItem(voucher: any, includePayments: boolean) {
    const maskedIds = this.getMaskedEOIIds({
      preEoiId: voucher.preEoiId,
      stdEoiId: voucher.stdEoiId,
      paidVoucherId: voucher.paidVoucherId,
      paymentStatus: voucher.paymentStatus,
    });
    const applicant1 = voucher.applicant1 || {};
    const rawDeletionData = voucher.deletionRemarks || null;
    const deletionData =
      rawDeletionData && Object.keys(rawDeletionData).length > 0
        ? rawDeletionData
        : null;

    const resolveIndustry =
      voucher.applicant1.professionalDetails?.industry === 'Others'
        ? voucher.applicant1.professionalDetails?.industryIfOthers
        : voucher.applicant1.professionalDetails?.industry || null;
    const resolveDesignation =
      voucher.applicant1.professionalDetails?.designation === 'Others'
        ? voucher.applicant1.professionalDetails?.designationIfOthers
        : voucher.applicant1.professionalDetails?.designation || null;
    const voucherData: any = {
      id: voucher.id,
      voucherId: voucher.voucherId,
      sfdcEnquiryId: voucher.sfdcEnquiryId || null,
      sfdcLeadStatus: voucher.sfdcLeadStatus || null,
      uniqueReferenceId: voucher.uniqueReferenceId,
      paidVoucherId: maskedIds.paidVoucherId,
      stdEoiId: maskedIds.stdEoiId,
      preEoiId: maskedIds.preEoiId,
      queueId: voucher.queueId || null,
      sequenceNo: this.displaySequenceNo(voucher),
      customerName: this.extractApplicantNames(voucher.applicant1),
      email: maskEmailAddress(applicant1.personalDetails?.emailAddress),
      countryCode: voucher.applicant1?.personalDetails?.countryCode,
      mobile: maskMobileNumber(applicant1.personalDetails?.contactNumber),
      dob: voucher.applicant1?.personalDetails?.dob || null,
      residentStatus: voucher.applicant1?.personalDetails?.residentStatus,
      occupation: voucher.applicant1.professionalDetails?.occupation ?? '',
      industry: resolveIndustry ?? '',
      companyName: voucher.applicant1.professionalDetails?.companyName ?? '',
      designation: resolveDesignation ?? '',
      annualIncome: voucher.applicant1.professionalDetails?.annualIncome ?? '',
      companyAddress:
        voucher.applicant1.professionalDetails?.companyAddress ?? '',
      campaignName: voucher.campaign?.campaignName || null,
      campaign: {
        id: voucher?.campaign?.id,
        campaignName: voucher?.campaign?.campaignName,
        pushToSfdc: voucher?.campaign?.pushToSfdc ?? false,
        sfdcProjectName: voucher?.campaign?.sfdcProjectName ?? null,
        projectId: voucher?.campaign?.projectId ?? null,
        enableEOIsAllRms: voucher?.campaign?.enableEOIsAllRms ?? false,
      },
      primarySource: voucher.primarySource,
      cpName: voucher?.channelPartner?.cpName || null,
      cpType: voucher?.channelPartner?.cpType || null,
      typologyPreference: voucher?.eoiDetails?.typology || null,
      unitPreference: voucher?.eoiDetails?.preferences || null,
      voucherCount: voucher?.voucherCount || 1,
      formStatus: voucher.voucherFormStatus,
      paymentStatus: voucher.paymentStatus,
      financeStatus: voucher?.financeStatus || PaymentTxStatusEnum.UNVERIFIED,
      createdAt: voucher.createdAt,
      sourcingRm: voucher?.createdBy
        ? { id: voucher.createdBy.id, name: voucher.createdBy.name }
        : null,
      closingRm: voucher?.closingRm
        ? { id: voucher.closingRm.id, name: voucher.closingRm.name }
        : null,
      amountPayable: voucher?.paymentDetails?.amountPayable || 0,
      amountPaid: voucher?.paymentDetails?.totalAmountPaid || 0,
      finalPaidDate:
        voucher?.eoiQueueIssuedAt || voucher?.voucherQueueIssuedAt || null,
      chronology: voucher.chronology || null,
      checkerRemarks: voucher?.checkerRemarks ?? {},
      updatedAt: voucher.updatedAt,
      createdBy: voucher?.createdBy?.id ?? null,
      rmUniqueId: this.customConfigService.encryptData(voucher?.createdBy?.id),
      cancelReason: voucher.cancelReason || null,
      convertRemarks: voucher.convertRemarks || null,
      customerAddress:
        voucher.applicant1?.contactDetails?.permanentAddress?.fullAddress ||
        voucher.applicant1?.contactDetails?.communicationAddress?.fullAddress ||
        null,
      pinCode:
        voucher.applicant1?.contactDetails?.permanentAddress?.pinCode || null,
      financeRemarks: voucher.financeRemarks ?? null,
      deletionReason: deletionData?.deletionReason ?? null,
      restoreReason: deletionData?.restoreReason ?? null,
      isDeleted: voucher.isDeleted,
      chequeAlerts: voucher.chequeAlerts ?? null,
      bookingStatus: voucher.bookingStatus ?? null,
      isPreFillBookingForm:
        voucher.bookingStatus === VoucherBookingStatusEnum.PRE_FILLED
          ? 'Yes'
          : 'No',
      opportunityId: voucher.opportunityId ?? null,
      isUnitMapped: voucher?.isUnitMapped ?? false,
      preferredUnit: voucher?.preferredUnit ?? null,
      isChangeRequestPending: voucher?.isChangeRequestPending ?? null,
      referrerName: voucher.referrerName ?? null,
      projectName: voucher.projectName ?? null,
      unitNumber: voucher.unitNumber ?? null,
      blockingId: voucher.blockingId ?? null,
      inventoryUnitId: voucher.inventoryUnitId ?? null,
      isLeadCreated: voucher.isLeadCreated ?? false,
      slotName: voucher.slotName ?? null,
      slotDate: voucher.slotDate ?? null,
      slotStartTime: voucher.startTime ?? null,
      batchStage: voucher.batchStage ?? null,
      cxStatus: voucher.voucherBatchStatus ?? null,
    };

    if (includePayments) {
      voucherData.transactionDetails = voucher.transactionDetails ?? [];
    }

    return voucherData;
  }

  //   If the payment is partially paid, the highest EOI ID is hidden (masked).
  // This is done to restrict visibility on the RM side until full payment is done.
  private getMaskedEOIIds(data: {
    preEoiId?: string | null;
    stdEoiId?: string | null;
    paidVoucherId?: string | null;
    paymentStatus: VoucherPaymentStatus;
  }) {
    const { preEoiId, stdEoiId, paidVoucherId, paymentStatus } = data;
    if (paymentStatus !== VoucherPaymentStatus.PARTIALLY_PAID) {
      return {
        preEoiId,
        stdEoiId,
        paidVoucherId,
      };
    }
    return {
      preEoiId: preEoiId ? MASKED_QUEUE_ID : preEoiId || null,
      stdEoiId: !preEoiId && stdEoiId ? MASKED_QUEUE_ID : stdEoiId || null,
      paidVoucherId:
        !preEoiId && !stdEoiId && paidVoucherId
          ? MASKED_QUEUE_ID
          : paidVoucherId || null,
    };
  }
  /**
   * Retrieves available primary source options with metadata for form configuration.
   * Indicates which sources require secondary sources and additional data fields.
   *
   * @returns Promise<any> Response with primary source list and configuration metadata
   * @throws InternalServerErrorException if source retrieval fails
   */
  async getPrimarySourcesForDropdown(): Promise<any> {
    try {
      const primarySources = Object.values(PrimarySourceEnum).map((source) => ({
        value: source,
        hasSecondary: [
          PrimarySourceEnum.PURVA_PRIVILEGE,
          PrimarySourceEnum.PROVIDENT_PREMIER,
        ].includes(source),
        requiresAdditionalData: source === PrimarySourceEnum.PURVA_CHAMPION,
      }));

      return {
        statusCode: SUCCESS,
        message: 'Primary sources retrieved successfully',
        data: primarySources,
      };
    } catch (error) {
      logger.error('Error retrieving primary sources for dropdown:', error);
      throw new InternalServerErrorException('Failed to fetch primary sources');
    }
  }

  /**
   * Validates that primary and secondary source combinations follow business rules.
   * Ensures required secondary sources are provided and validates additional data.
   *
   * @param dto - Voucher creation DTO with source information
   * @throws BadRequestException for source hierarchy violations
   */
  private validateSourceHierarchy(dto: CreateVoucherFormDto): void {
    const requiresSecondary = [
      PrimarySourceEnum.PURVA_PRIVILEGE,
      PrimarySourceEnum.PROVIDENT_PREMIER,
    ].includes(dto.primarySource);

    if (requiresSecondary && !dto.secondarySource) {
      throw new BadRequestException(
        'Secondary source is required for Purva Privilege/Premier',
      );
    }

    if (!requiresSecondary && dto.secondarySource) {
      throw new BadRequestException(
        'Secondary source not allowed for this primary source',
      );
    }

    // Validate additional data requirements
    this.validateAdditionalDataRequirements(dto);
  }

  /**
   * Validates that required additional data fields are provided for selected source types.
   * Checks for employee names (Champion), source person details (Loyalty/Premier), etc.
   *
   * @param dto - Voucher creation DTO with source and additional data
   * @throws BadRequestException when required fields are missing
   */
  private validateAdditionalDataRequirements(dto: CreateVoucherFormDto): void {
    const { primarySource, secondarySource, sourceAdditionalData } = dto;

    // For Purva Champion, employee details are required
    if (primarySource === PrimarySourceEnum.PURVA_CHAMPION) {
      if (!sourceAdditionalData?.employeeName) {
        throw new BadRequestException(
          'Employee name is required for Purva Champion',
        );
      }
    }

    // For Loyalty/Referral, source person details are required
    if (
      [
        PrimarySourceEnum.PURVA_PRIVILEGE,
        PrimarySourceEnum.PROVIDENT_PREMIER,
      ].includes(primarySource) &&
      secondarySource !== SecondarySourceEnum.REFERRAL_OTHERS
    ) {
      if (
        !sourceAdditionalData?.name ||
        !sourceAdditionalData?.email ||
        !sourceAdditionalData?.contactNumber ||
        !sourceAdditionalData?.project ||
        !sourceAdditionalData?.unit
      ) {
        throw new BadRequestException(
          'Source person details (name, email, contact, project, unit) are required for Privilege/Premier sources',
        );
      }

      // For Referral, referredBy is also required
      if (
        secondarySource === SecondarySourceEnum.REFERRAL &&
        !sourceAdditionalData?.referredBy
      ) {
        throw new BadRequestException(
          'Referred by is required for Referral source',
        );
      }
    }

    // For Referral others, activity Name is required
    if (
      secondarySource === SecondarySourceEnum.REFERRAL_OTHERS &&
      !sourceAdditionalData?.activityName?.trim()
    ) {
      throw new BadRequestException(
        'Activity name is required for Referral others',
      );
    }
  }

  /**
   * Enriches source data with type metadata based on source hierarchy selection.
   * Categorizes sources for reporting and analytics (employee_referral, existing_customer, etc.)
   *
   * @param dto - Voucher creation DTO with source selection
   * @returns Object Enhanced source data with type field
   */
  private processSourceData(dto: CreateVoucherFormDto): any {
    const sourceData: any = dto.sourceAdditionalData || null;

    // Add source-specific metadata
    if (dto.primarySource === PrimarySourceEnum.PURVA_CHAMPION) {
      sourceData.type = 'employee_referral';
    } else if (
      [
        PrimarySourceEnum.PURVA_PRIVILEGE,
        PrimarySourceEnum.PROVIDENT_PREMIER,
      ].includes(dto.primarySource)
    ) {
      sourceData.type = null;
      if (dto.secondarySource === SecondarySourceEnum.LOYALTY) {
        sourceData.type = 'existing_customer';
      } else if (dto.secondarySource === SecondarySourceEnum.REFERRAL) {
        sourceData.type = 'customer_referral';
      } else if (dto.secondarySource === SecondarySourceEnum.REFERRAL_OTHERS) {
        sourceData.type = 'referral_others';
      }
    }

    return sourceData;
  }

  /**
   * Combines applicant names from multiple applicants into a display string.
   * Filters out empty/null values and handles missing applicant data.
   *
   * @param applicant1 - Primary applicant with personalDetails
   * @param applicant2 - Secondary applicant (optional) with personalDetails
   * @returns string Space-separated concatenation of applicant names
   */
  private extractApplicantNames(
    applicant1?: Record<string, any>,
    applicant2?: Record<string, any>,
  ): string {
    const names = [];
    if (applicant1?.personalDetails?.firstName) {
      names.push(applicant1.personalDetails.firstName);
    }
    if (applicant1?.personalDetails?.lastName) {
      names.push(applicant1.personalDetails.lastName);
    }
    if (applicant2?.personalDetails?.firstName) {
      names.push(applicant2.personalDetails.firstName);
    }
    if (applicant2?.personalDetails?.lastName) {
      names.push(applicant2.personalDetails.lastName);
    }
    return names.join(' ');
  }

  /**
   * Formats saved voucher form into API response with generated form URL and campaign details.
   * Constructs environment-specific URLs for voucher form access.
   *
   * @param savedVoucherForm - Newly created voucher form entity
   * @returns Object Response DTO with voucherFormUrl and formatted voucher data
   */
  private formatVoucherResponse(savedVoucherForm: VoucherForm): any {
    const puravankaraBaseUrl = this.configService.get<string>(
      'PURAVANKARA_BASE_URL',
    );
    const configOptions = {
      voucherFormUrl: `${puravankaraBaseUrl}/${VOUCHER_FORM_URL}`,
      nodeEnv: this.configService.get<string>('NODE_ENV'),
      formType: savedVoucherForm.formPhase,
    };

    const voucherFormUrl = generateVoucherFormUrl(
      savedVoucherForm.voucherId,
      configOptions,
    );

    const { campaign, ...voucherWithoutCampaign } = savedVoucherForm;
    const campaignName = campaign?.campaignName ?? null;
    const campaignId = campaign?.id ?? null;

    return {
      statusCode: SUCCESS,
      message: 'Voucher form created successfully',
      data: {
        id: savedVoucherForm?.id,
        voucherFormUrl,
        voucherForm: {
          ...voucherWithoutCampaign,
          campaignName,
          campaignId,
        },
      },
    };
  }

  /**
   * Type guard to differentiate CP voucher creation DTO from RM voucher creation DTO.
   * Checks presence of channelPartnerLinkId field.
   *
   * @param dto - Voucher creation DTO to check
   * @returns boolean True if DTO is CP flow, false if RM flow
   */
  private isCreateCpVoucherFormDto(
    dto: CreateVoucherFormDto | CreateCpVoucherFormDto,
  ): dto is CreateCpVoucherFormDto {
    return (
      'channelPartnerLinkId' in dto && dto.channelPartnerLinkId !== undefined
    );
  }

  /**
   * Resolves campaign entity for voucher creation based on creation flow (RM vs CP).
   * RM flow: Uses provided campaignId directly.
   * CP flow: Derives campaign from channel partner's linked campaign.
   *
   * @param form - Voucher creation form data
   * @param createdBy - User ID (presence indicates RM flow)
   * @param transactionalEntityManager - Transaction manager for database access
   * @returns Promise<Object> Campaign with active phase and optional channel partner
   * @throws NotFoundException/BadRequestException for invalid campaign or partner
   */
  private async resolveCampaignForVoucher(
    form: CreateVoucherFormDto | CreateCpVoucherFormDto,
    createdBy: number | undefined,
    transactionalEntityManager: any,
  ): Promise<{
    campaign: EoiCampaign;
    campaignPhase: VoucherFormType;
    channelPartner?: ChannelPartner;
    createdByEmail?: string;
  }> {
    // RM FLOW: campaignId is provided directly ---
    if (createdBy) {
      const campaign = await transactionalEntityManager.findOne(EoiCampaign, {
        where: { id: form.campaignId },
      });
      if (!campaign) throw new NotFoundException('campaign not found');

      return {
        campaign,
        campaignPhase: this.getActiveCampaignPhase(campaign),
      };
    }

    // CP FLOW: resolve via channel partner link ---
    if (!this.isCreateCpVoucherFormDto(form))
      throw new BadRequestException(
        'channelPartnerLinkId is required for CP flow',
      );

    const channelPartner = await this.channelPartnerRepository.findOne({
      where: { linkId: form.channelPartnerLinkId },
    });
    if (!channelPartner)
      throw new NotFoundException('Invalid channel partner link');

    const campaignId = channelPartner.campaignId;
    if (!campaignId)
      throw new NotFoundException('Channel partner campaign not found');

    const campaign = await transactionalEntityManager.findOne(EoiCampaign, {
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('campaign not found');

    const createdByEmail = await transactionalEntityManager.findOne(Users, {
      where: { id: channelPartner.createdBy },
      select: ['email'],
    });

    return {
      campaign,
      campaignPhase: this.getActiveCampaignPhase(campaign),
      channelPartner,
      createdByEmail: createdByEmail?.email,
    };
  }

  /**
   * Determines the currently active campaign phase (VOUCHER or EOI) based on date comparison.
   * Returns VOUCHER if within voucher phase, EOI if within EOI phase.
   *
   * @param campaign - Campaign entity with phase dates
   * @returns VoucherFormType The active phase for the campaign
   * @throws BadRequestException if campaign is currently inactive
   */
  private getActiveCampaignPhase(campaign: EoiCampaign): VoucherFormType {
    const now = new Date();
    let campaignPhases: VoucherFormType[];
    if (Array.isArray(campaign?.phase)) {
      campaignPhases = campaign.phase;
    } else if (campaign?.phase) {
      campaignPhases = [campaign.phase];
    } else {
      campaignPhases = [];
    }

    // Check if VOUCHER phase is active
    if (
      campaignPhases.includes(VoucherFormType.VOUCHER) &&
      campaign.voucherEndDate &&
      campaign.voucherEndDate >= now
    )
      return VoucherFormType.VOUCHER;

    // Check if EOI phase is active
    const eoiActive =
      campaignPhases.includes(VoucherFormType.EOI) &&
      campaign?.eoiStartDate &&
      campaign?.eoiEndDate &&
      campaign.eoiStartDate <= now &&
      campaign.eoiEndDate >= now &&
      (!campaign?.voucherEndDate || campaign.voucherEndDate <= now);

    if (eoiActive) return VoucherFormType.EOI;

    throw new BadRequestException('Campaign phase is currently Inactive');
  }

  /**
   * Generates unique identifiers for new vouchers (voucher ID, reference ID, enquiry number).
   * Creates randomized voucher ID and increments campaign enquiry counter for sequential IDs.
   *
   * @param campaign - Campaign entity with enquiry counter and initials
   * @returns Object with generated voucherId, uniqueReferenceId, and enquiryNumber
   */
  private generateVoucherIdentifiers(campaign: EoiCampaign): {
    voucherId: string;
    uniqueReferenceId: string;
    enquiryNumber: number;
  } {
    const voucherId = generateRandomId();
    const enquiryNumber = campaign.enquiryCounter + 1;
    const uniqueReferenceId = generateUniqueReferenceId(
      campaign.enquiryInitials,
      enquiryNumber,
    );

    return {
      voucherId,
      uniqueReferenceId,
      enquiryNumber,
    };
  }

  /**
   * Constructs applicant details object from voucher creation DTO.
   * Formats personal details with appropriate null defaults for empty fields.
   *
   * @param createVoucherFormDto - DTO with applicant name, contact, and email
   * @returns Object Structured applicant details for voucher form
   */
  private buildApplicantDetails(
    createVoucherFormDto: CreateVoucherFormDto,
  ): any {
    const {
      firstName,
      lastName,
      countryCode,
      contactNumber,
      emailId,
      residentStatus,
    } = createVoucherFormDto;

    return {
      personalDetails: {
        salutation: null,
        firstName: firstName || null,
        lastName: lastName || null,
        gender: null,
        residentStatus: residentStatus,
        relation: null,
        relativeName: null,
        dob: null,
        anniversaryDate: null,
        image: [],
        isPhysicalImage: false,
        maritalStatus: null,
        motherTongue: null,
        nriCountry: null,
        hasParentalConsent: false,
        isValid: false,
        countryCode: countryCode || '',
        contactNumber: contactNumber || '',
        emailAddress: emailId || '',
        alternateCountryCode: '',
        alternateContactNumber: '',
      },
    };
  }

  /**
   * Resolves channel partner display name with fallback logic.
   * Uses special project name if available, otherwise uses partner name.
   *
   * @param channelPartner - Channel partner entity
   * @returns string Display name for the channel partner
   */
  private getChannelPartnerName(channelPartner: ChannelPartner): string {
    return channelPartner.cpName === UPCOMING_ESTATES_NAME
      ? channelPartner.name
      : channelPartner.cpName;
  }

  /**
   * Builds source data object for CP-initiated voucher creation.
   * Extracts channel partner information and sets fixed source type.
   *
   * @param channelPartner - Channel partner entity
   * @returns Object Source data with primary source and partner details
   */
  private buildCpSourceData(channelPartner: ChannelPartner): {
    primarySource: string;
    secondarySource: string | null;
    sourceDetails: any;
    cpCreatedBy?: number;
    cpId?: number;
  } {
    return {
      primarySource: 'Channel Partner',
      secondarySource: null,
      sourceDetails: {
        channelPartner: this.getChannelPartnerName(channelPartner),
      },
      cpCreatedBy: channelPartner.createdBy || null,
      cpId: channelPartner.id || null,
    };
  }

  /**
   * Builds source data object for RM-initiated voucher creation.
   * Validates source hierarchy and processes additional source data.
   * Handles channel partner associations when applicable.
   *
   * @param createVoucherFormDto - DTO with source selection and additional data
   * @param sourceData - Processed source metadata
   * @param channelPartner - Optional channel partner if selected as source
   * @returns Object Source data with primary/secondary sources and details
   */
  private buildRmSourceData(
    createVoucherFormDto: CreateVoucherFormDto | CreateCpVoucherFormDto,
    sourceData: any,
    channelPartner?: ChannelPartner,
  ): {
    primarySource: string;
    secondarySource: string | null;
    sourceDetails: any;
    cpCreatedBy?: number;
    cpId?: number;
  } {
    const isChannelPartnerSource =
      createVoucherFormDto.primarySource ===
        PrimarySourceEnum.CHANNEL_PARTNER && channelPartner;

    if (isChannelPartnerSource) {
      const channelPartnerName = this.getChannelPartnerName(channelPartner);
      return {
        primarySource: createVoucherFormDto.primarySource,
        secondarySource: createVoucherFormDto.secondarySource || null,
        sourceDetails: sourceData
          ? { ...sourceData, channelPartner: channelPartnerName }
          : { channelPartner: channelPartnerName },
        cpCreatedBy: channelPartner.createdBy || null,
        cpId: channelPartner.id || null,
      };
    }

    return {
      primarySource: createVoucherFormDto.primarySource,
      secondarySource: createVoucherFormDto.secondarySource || null,
      sourceDetails: sourceData || null,
      cpCreatedBy: null,
      cpId: null,
    };
  }

  /**
   * Routes to appropriate source data builder based on creation flow (RM vs CP).
   * Delegates to RM or CP specific builders with proper validation.
   *
   * @param createVoucherFormDto - DTO with source and creation context
   * @param createdBy - User ID (presence indicates RM flow)
   * @param channelPartner - Optional channel partner entity
   * @returns Object Complete source data for voucher creation
   * @throws BadRequestException for missing required dependencies
   */
  private buildSourceData(
    createVoucherFormDto: CreateVoucherFormDto | CreateCpVoucherFormDto,
    createdBy: number | undefined,
    channelPartner?: ChannelPartner,
  ): {
    primarySource: string;
    secondarySource: string | null;
    sourceDetails: any;
    cpCreatedBy?: number;
    cpId?: number;
  } {
    if (!createdBy) {
      if (!channelPartner) {
        throw new BadRequestException(
          'Channel partner information is required for CP flow',
        );
      }
      return this.buildCpSourceData(channelPartner);
    }

    this.validateSourceHierarchy(createVoucherFormDto);
    const sourceData = this.processSourceData(createVoucherFormDto);
    return this.buildRmSourceData(
      createVoucherFormDto,
      sourceData,
      channelPartner,
    );
  }

  /**
   * Updates campaign enquiry counter and persists within transaction.
   * Increments counter for each new voucher creation within a campaign.
   *
   * @param campaign - Campaign entity to update
   * @param enquiryNumber - New enquiry counter value
   * @param transactionalEntityManager - Transaction manager for persistence
   * @returns Promise<void> - Returns when update is persisted
   */
  private async updateCampaignEnquiryCounter(
    campaign: EoiCampaign,
    enquiryNumber: number,
    transactionalEntityManager: any,
  ): Promise<void> {
    campaign.enquiryCounter = enquiryNumber;
    await transactionalEntityManager.save(campaign);
  }

  /**
   * Updates voucher queue IDs when payment is reversed or fully rejected.
   * Clears existing queue IDs and reassigns based on fallback sequence availability.
   * Handles both VOUCHER and EOI phase queue ID logic.
   *
   * @param voucherForm - Voucher form to update
   * @returns Promise<void> - Updates voucher in place
   */
  private async handlePaymentReversalQueueIdUpdate(
    voucherForm: VoucherForm,
  ): Promise<void> {
    const { formPhase, eoiDetails } = voucherForm;

    if (formPhase === VoucherFormType.VOUCHER) {
      // Clear voucher-specific queue IDs
      voucherForm.queueId = null;
      voucherForm.voucherSequenceId = null;
      return;
    }

    if (formPhase === VoucherFormType.EOI && eoiDetails?.eoiType) {
      // Clear EOI-specific fields
      voucherForm.eoiQueueIssuedAt = null;

      if (eoiDetails.eoiType === EOITypeEnum.PREFERENTIAL) {
        voucherForm.preferentialSequenceId = null;
      } else if (eoiDetails.eoiType === EOITypeEnum.STANDARD) {
        voucherForm.standardSequenceId = null;
      }

      // Determine fallback queue type and derive queue from already-issued lower tier sequence.
      const fallbackQueueType = this.determineFallbackQueueType(voucherForm);
      const fallbackSequence = fallbackQueueType
        ? this.getSequenceIdByQueueType(voucherForm, fallbackQueueType)
        : null;

      if (fallbackQueueType && fallbackSequence) {
        voucherForm.queueId = generateQueueCode(
          fallbackQueueType.slice(0, 1),
          fallbackSequence,
        );
      } else {
        voucherForm.queueId = null;
      }
    }
  }

  private getSequenceIdByQueueType(
    voucherForm: VoucherForm,
    queueType: QueueTypeEnum,
  ): string | null {
    if (queueType === QueueTypeEnum.VQI) {
      return voucherForm.voucherSequenceId || null;
    }
    if (queueType === QueueTypeEnum.STD) {
      return voucherForm.standardSequenceId || null;
    }
    if (queueType === QueueTypeEnum.PRE) {
      return voucherForm.preferentialSequenceId || null;
    }
    return null;
  }

  /**
   * Determines fallback queue type when primary queue is cleared.
   * Uses sequence IDs in priority order: standard, then voucher.
   *
   * @param voucherForm - Voucher form with sequence information
   * @returns QueueTypeEnum | null Queue type to revert to, or null if none available
   */
  private determineFallbackQueueType(
    voucherForm: VoucherForm,
  ): QueueTypeEnum | null {
    const { eoiDetails, standardSequenceId, voucherSequenceId } = voucherForm;

    if (eoiDetails?.eoiType === EOITypeEnum.PREFERENTIAL) {
      if (standardSequenceId) {
        return QueueTypeEnum.STD;
      }

      if (voucherSequenceId) {
        return QueueTypeEnum.VQI;
      }

      return null;
    }

    if (eoiDetails?.eoiType === EOITypeEnum.STANDARD) {
      // For standard EOI, only check voucher sequence
      return voucherSequenceId ? QueueTypeEnum.VQI : null;
    }

    return null;
  }

  /**
   * Sends voucher form creation email to customer with RM contact information.
   * Handles template rendering and SMTP delivery with error logging.
   *
   * @param customerEmail - Recipient email address
   * @param customerName - Recipient name for personalization
   * @param voucherFormUrl - Link to voucher form
   * @param campaignName - Campaign name for context
   * @param voucherId - Voucher ID for audit logging
   * @param rmUserId - RM user ID to fetch contact details
   * @param context - Event context ('creation', 'resend') for logging
   * @returns Promise<boolean> Success indicator
   */
  private async sendVoucherFormEmail(
    customerEmail: string,
    customerName: string,
    voucherFormUrl: string,
    creator: string,
    campaignName: string,
    voucherId: string,
    rmUserId: number,
    context: string = 'creation',
  ): Promise<boolean> {
    try {
      if (!customerEmail) {
        logger.warn(
          `No email address provided for voucher ${voucherId || 'unknown'}`,
        );
        return false;
      }

      const user = await this.userRepository.findOne({
        where: { id: rmUserId },
        select: { id: true, email: true },
      });

      const emailRecipients = creator
        ? { to: customerEmail, cc: creator }
        : { to: customerEmail };

      const responses = await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.VOUCHER_FORM_CREATION,
          {
            NAME: customerName,
            CAMPAIGN: campaignName || 'our project',
            VOUCHER_FORM_URL: voucherFormUrl,
            RM_EMAIL: user?.email ?? '',
          },
          'Puravankara',
          emailRecipients,
        ),
      );
      if (responses.some((res) => res instanceof Error)) {
        logger.error(
          `Voucher form email dispatch error for ${context}`,
          responses,
        );
        return false;
      }
      logger.info(
        `Voucher form email sent successfully to ${customerEmail} with cc as ${creator} for voucher ID: ${voucherId || 'unknown'} (${context})`,
      );
      return true;
    } catch (error) {
      logger.error(`Failed to send voucher form email for ${context}`, error);
      return false;
    }
  }

  /**
   * Retrieves voucher and sends form link email/WhatsApp to customer.
   * Extracts customer contact from applicant1 and generates form URL.
   * Sends notification via both email and WhatsApp channels.
   *
   * @param id - Voucher form ID to fetch and send link for
   * @returns Promise<any> Response with email delivery and voucher details
   * @throws NotFoundException when voucher not found or email missing
   */
  async sendFormLink(id: number): Promise<any> {
    try {
      // Fetch voucher form with campaign details
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { id, isDeleted: false },
        select: {
          id: true,
          createdAt: true,
          applicant1: true,
          formPhase: true,
          voucherId: true,
          campaign: {
            id: true,
            campaignName: true,
          },
          createdBy: {
            id: true,
            name: true,
            email: true,
          },
          closingRm: {
            id: true,
            name: true,
          },
        },
        relations: ['campaign', 'createdBy', 'closingRm'],
      });
      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      // Extract email from applicant1 personalDetails
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;
      const customerMobile =
        voucherForm.applicant1?.personalDetails?.contactNumber;

      if (!customerEmail) {
        throw new BadRequestException(
          'Customer email not found in voucher form',
        );
      }

      // Extract customer name
      const customerName =
        `${voucherForm.applicant1?.personalDetails?.firstName || ''} ${voucherForm.applicant1?.personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      const puravankaraBaseUrl = this.configService.get<string>(
        'PURAVANKARA_BASE_URL',
      );

      // Generate voucher form URL
      const configOptions = {
        voucherFormUrl: `${puravankaraBaseUrl}/${VOUCHER_FORM_URL}`,
        nodeEnv: this.configService.get<string>('NODE_ENV'),
        formType: voucherForm.formPhase,
      };

      const voucherFormUrl = generateVoucherFormUrl(
        voucherForm.voucherId,
        configOptions,
      );

      const campaignName = voucherForm.campaign?.campaignName;
      const rmDetails = voucherForm?.closingRm || voucherForm?.createdBy;
      const rmName = rmDetails?.name ?? '';

      // Emit WhatsApp event to send voucher link
      this.eventEmitter.emit(
        WhatsAppEventsEnum.SEND_VOUCHER_LINK,
        new WhatsappNotifyEvent(
          customerMobile,
          customerName,
          rmName,
          voucherFormUrl,
        ),
      );
      // Send email using helper method
      const emailSent = await this.sendVoucherFormEmail(
        customerEmail,
        customerName,
        voucherFormUrl,
        null,
        campaignName,
        voucherForm.voucherId,
        rmDetails?.id,
        'resend',
      );

      if (!emailSent) {
        throw new InternalServerErrorException('Failed to send email');
      }

      return {
        statusCode: SUCCESS,
        message: 'Voucher form email sent successfully',
        data: {
          voucherId: voucherForm.voucherId,
          customerEmail,
          customerName,
          campaignName,
        },
      };
    } catch (error) {
      logger.error('Error sending voucher form email:', error);
      throw error;
    }
  }

  /**
   * Assigns closing RM and optionally sourcing RM to a voucher form.
   * Validates RM role before assignment.
   *
   * @param assignClosingRmDto - DTO with voucher ID and RM IDs
   * @returns Promise<any> Success response with voucher ID
   * @throws NotFoundException when users not found
   * @throws BadRequestException when users don't have RM role
   */
  async assignClosingRm(assignClosingRmDto: AssignClosingRmDto): Promise<any> {
    try {
      const { id, closingRmId, sourcingRmId } = assignClosingRmDto;

      // 1. Validate user + role
      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.id = :closingRmId', { closingRmId })
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role?.name !== RolesEnum.RM) {
        throw new BadRequestException(
          'User must have RM role to be assigned as closing RM',
        );
      }

      if (sourcingRmId) {
        const sourcingRm = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.role', 'role')
          .where('user.id = :sourcingRmId', { sourcingRmId })
          .getOne();

        if (!sourcingRm) {
          throw new NotFoundException('Sourcing RM User not found');
        }
      }

      // 2. update voucher (relation assignment via FK)
      const payload = {
        closingRm: { id: closingRmId } as Users,
      };

      if (sourcingRmId) {
        Object.assign(payload, { createdBy: { id: sourcingRmId } as Users });
      }

      const result = await this.voucherFormRepository.update(id, payload);

      if (result.affected === 0) {
        throw new NotFoundException('Voucher form not found');
      }

      return {
        statusCode: SUCCESS,
        message: 'Closing RM assigned successfully',
        data: {
          id,
        },
      };
    } catch (error) {
      logger.error('Error assigning closing RM:', error);
      throw error;
    }
  }

  /**
   * Exports filtered voucher list to Excel workbook and uploads to S3.
   * Uses existing listVouchers logic to fetch and format data.
   * Generates timestamped S3 file path for downloads.
   *
   * @param user - Current user for role-based filtering
   * @param filterDto - Optional filter DTO for voucher selection
   * @returns Promise<any> Response with S3 file path
   * @throws InternalServerErrorException if export/upload fails
   */
  async exportVouchers(
    user: any,
    filterDto?: ListVouchersFilterDto,
  ): Promise<any> {
    try {
      // Get voucher data using existing listVouchers method with pagination skipped
      const result = await this.listVouchers(user, filterDto, true, true);
      const vouchers = result.data?.result || [];

      if (!vouchers.length) {
        return {
          message: 'No vouchers found to export',
          data: [],
        };
      }

      // Create Workbook
      const workbook = new ExcelJS.Workbook();
      buildExcelSheet(workbook, vouchers, DISPLAY_DATE_TIME_FORMAT);

      // Generate Buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Upload to S3
      const timeStamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const s3Key = `exports/vouchers/vouchers-${timeStamp}.xlsx`;
      const stream = new PassThrough();
      stream.end(buffer);
      await this.awsService.uploadToS3(s3Key, stream, true);

      return {
        message: 'Vouchers/EOIs exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Vouchers/EOIs export failed:', error);
      throw new InternalServerErrorException('Failed to export Vouchers/EOIs');
    }
  }

  async exportTransactions(
    user: any,
    filterDto?: ListVouchersFilterDto,
  ): Promise<any> {
    try {
      // Get voucher data using existing listVouchers method with pagination skipped
      const result = await this.listVouchers(user, filterDto, true, true);
      const vouchers = result.data?.result || [];

      if (!vouchers.length) {
        return {
          message: 'No vouchers found to export',
          data: [],
        };
      }

      // Create Workbook
      const workbook = new ExcelJS.Workbook();
      buildTxExcelSheet(workbook, vouchers, DISPLAY_DATE_TIME_FORMAT);

      // Generate Buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Upload to S3
      const timeStamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const s3Key = `exports/vouchers/transactions-${timeStamp}.xlsx`;
      const stream = new PassThrough();
      stream.end(buffer);
      await this.awsService.uploadToS3(s3Key, stream, true);

      return {
        message: 'Transactions exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Transactions export failed:', error);
      throw new InternalServerErrorException('Failed to export Transactions');
    }
  }

  /**
   * PE-483: Push one Bull job per request; worker runs `runBulkTransactionUpdateJob`.
   * Row identity: Payment Reference ID + Transaction ID → `updateTransaction` for **Pending Reco** lines only.
   * KT / sequence diagram: `docs/PE-483-bulk-transaction-api-flow.md`.
   */
  async bulkUpdateTransactions(
    userId: number,
    dto: BulkUpdateTransactionsDto,
  ): Promise<any> {
    try {
      if (!userId) {
        throw new BadRequestException('User context is required');
      }

      // Client uploads the workbook to S3 first; body carries bucket key + display name.
      const { key, fileName } = dto;

      // Align with worker: only `.xlsx` is parsed (`parseBulkTransactionsWorkbook`).
      if (!key.endsWith('.xlsx')) {
        throw new BadRequestException(
          `Only .xlsx files are allowed. ${fileName} has a different extension`,
        );
      }

      // New Bull job per request; `job.id` is monotonic per queue in Redis.
      const job = await this.bulkTransactionUpdateQueue.add(
        'process', // Processor method name; single job type on this queue.
        {
          userId,
          key,
          fileName,
        } satisfies BulkTransactionUpdateJobPayload,
        {
          attempts: 3, // Retry transient Redis/DB failures; `UnrecoverableError` skips retries.
          backoff: { type: 'exponential', delay: 10_000 }, // 10s base delay between attempts.
          removeOnComplete: 500, // Trim completed job records in Redis after 500 jobs.
          removeOnFail: 1_000, // Retain up to 1000 failed jobs for inspection.
        },
      );

      // DB timeline row: lets poll API show `enqueued` before worker `started`.
      await this.queueJobAuditService.append({
        queueName: BULK_TRANSACTION_UPDATE_QUEUE,
        jobId: String(job.id),
        jobName: 'process',
        event: QUEUE_JOB_AUDIT_EVENT.ENQUEUED,
        sourceModule: 'eoi_management',
        summary: `Bulk transaction job queued: ${fileName}`,
        context: { key, fileName },
        triggeredByUserId: userId,
      });

      // 202: work happens asynchronously; client polls with `data.jobId`.
      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'Bulk transaction job queued for processing.',
        data: { jobId: String(job.id) },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      logger.error('Bulk update transactions failed:', error);
      throw new InternalServerErrorException(
        'Failed to queue bulk transaction update',
      );
    }
  }

  /**
   * PE-483: Merge Bull job snapshot with `queue_job_audit_logs` timeline; 403 if not the enqueuing user.
   * Details: `docs/PE-483-bulk-transaction-api-flow.md`.
   */
  async getBulkTransactionJobStatus(
    requestUserId: number,
    jobId: string,
  ): Promise<any> {
    if (!requestUserId) {
      throw new BadRequestException('User context is required');
    }
    if (!jobId?.trim()) {
      throw new BadRequestException('jobId is required');
    }

    const job = await this.bulkTransactionUpdateQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const payload = job.data as BulkTransactionUpdateJobPayload;
    if (payload.userId !== requestUserId) {
      throw new ForbiddenException('You do not have access to this job');
    }

    const state = await job.getState();
    const auditTimeline = await this.queueJobAuditService.findTimelineForJob(
      BULK_TRANSACTION_UPDATE_QUEUE,
      jobId,
    );

    let message: string;

    if (state === 'completed') {
      const total = job.returnvalue?.totalRows || 0;
      const success = job.returnvalue?.successCount || 0;
      const failed = total - success;

      if (failed > 0) {
        message = `Transaction update completed with partial success. ${success} out of ${total} records were processed successfully. Failed records remain pending for reconciliation.`;
      } else {
        message = `Transaction update completed successfully. All ${total} records were processed successfully.`;
      }
    } else {
      const stateMessages: Record<string, string> = {
        waiting: 'Updates are queued and waiting to be processed',
        delayed: 'Updates are delayed and will be retried shortly',
        active: `Updates are in progress (${typeof job.progress === 'number' ? job.progress : 0}% complete)`,
        failed: 'Updates failed',
      };
      message = stateMessages[state] ?? `Bulk transaction job status: ${state}`;
    }

    return {
      statusCode: SUCCESS,
      message,
      data: {
        jobId: job.id,
        state,
        name: job.name,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn ?? null,
        finishedOn: job.finishedOn ?? null,
        fileName: payload.fileName,
        key: payload.key,
        returnvalue: job.returnvalue ?? null,
        failedReason: job.failedReason ?? null,
        auditTimeline,
      },
    };
  }

  /**
   * Worker entry: fetch workbook from S3, parse **Transactions** sheet, validate rows,
   * then call `updateTransaction` per valid row (PE-483).
   */
  async runBulkTransactionUpdateJob(
    job: Job<BulkTransactionUpdateJobPayload>,
  ): Promise<Record<string, unknown>> {
    const { key, fileName, userId } = job.data;

    // Fail the job without retries when the payload cannot succeed (bad extension / missing object).
    if (!key.endsWith('.xlsx')) {
      throw new UnrecoverableError(
        `Only .xlsx files are allowed. ${fileName} has a different extension`,
      );
    }

    // S3 download; will throw `UnrecoverableError` if missing or invalid.
    const fileBuffer = await this.awsService.fetchFileFromS3(key);
    if (!fileBuffer) {
      throw new UnrecoverableError(`File not found: ${fileName}`);
    }

    // Header-based parse of worksheet "Transactions" → one object per non-empty row.
    const parsed = await parseBulkTransactionsWorkbook(fileBuffer);
    if (parsed.ok === false) {
      throw new UnrecoverableError(parsed.error);
    }

    // Process all rows for one payment reference together: reduces interleaving of `processVoucherAfterTransaction` across vouchers.
    const rows = [...parsed.rows].sort((a, b) => {
      const byRef = a.paymentReferenceId.localeCompare(b.paymentReferenceId);
      if (byRef !== 0) return byRef;
      return a.txnId.localeCompare(b.txnId);
    });

    const failures: { row: number; reasons: string[] }[] = [];
    let successCount = 0;
    const totalRows = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const excelRow = rows[i];

      // for testing!! REMOVE THIS LATER
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      await job.updateProgress(
        totalRows > 0
          ? Math.min(100, Math.round(((i + 1) / totalRows) * 100))
          : 100,
      );

      const outcome = await this.tryProcessOneBulkTransactionRow(
        excelRow,
        userId,
      );
      if (outcome.ok === true) {
        successCount++;
      } else {
        // `excelRow.excelRow` is the sheet row number (not array index) for finance-facing error reports.
        failures.push({ row: excelRow.excelRow, reasons: outcome.reasons });
      }
    }

    logger.info(
      `Bulk transaction job ${job.id} (${fileName}): totalRows=${totalRows} success=${successCount} failed=${failures.length}`,
    );

    // Stored on the completed Bull job (`returnvalue`) for polling clients.
    return {
      totalRows,
      successCount,
      failureCount: failures.length,
      failures,
    };
  }

  /**
   * Validates one parsed Excel row, resolves payment, and runs `updateTransaction` when eligible.
   * Each step returns row-level failures without throwing so the job can finish with partial success.
   */
  private async tryProcessOneBulkTransactionRow(
    excelRow: BulkExcelRow,
    userId: number,
  ): Promise<{ ok: true } | { ok: false; reasons: string[] }> {
    const fieldVal = validateBulkRowFields(excelRow);
    if (fieldVal.ok === false) {
      return { ok: false, reasons: fieldVal.reasons };
    }
    if (fieldVal.ok === 'skip') {
      return { ok: true };
    }

    const resolved = await this.findVoucherPaymentForBulkRow(
      excelRow.paymentReferenceId,
      excelRow.txnId,
    );
    if ('reasons' in resolved) {
      return { ok: false, reasons: resolved.reasons };
    }

    const { payment } = resolved;

    if (payment.status === fieldVal.dto.status) {
      return { ok: true };
    }

    if (payment.status !== PaymentTxStatusEnum.UNVERIFIED) {
      return {
        ok: false,
        reasons: [
          `Not eligible for bulk update: current status is "${payment.status}" (only "${PaymentTxStatusEnum.UNVERIFIED}" can be updated)`,
        ],
      };
    }

    // Optional tamper check: if Amount is filled in the sheet it must match `paid_amount`.
    if (excelRow.txnAmountRaw?.trim()) {
      if (!bulkAmountMatchesDb(excelRow.txnAmountRaw, payment.paidAmount)) {
        return {
          ok: false,
          reasons: [
            `Amount mismatch: Excel value does not match recorded paid amount (₹${Number(payment.paidAmount).toFixed(2)})`,
          ],
        };
      }
    }

    // Same shape as PATCH `updateTransaction` — reuses DB transaction + `processVoucherAfterTransaction` + emails.
    const dto: UpdateTransactionDto = {
      status: fieldVal.dto.status,
      realisationDate: fieldVal.dto.realisationDate,
      comments: fieldVal.dto.comments,
      receiptNo: fieldVal.dto.receiptNo,
    };

    try {
      await this.updateTransaction(payment.id, dto, userId);
      return { ok: true };
    } catch (err: unknown) {
      // `updateTransaction` delegates to `logsAndErrorHandling`, which rethrows Nest HTTP exceptions.
      return {
        ok: false,
        reasons: [this.formatBulkTransactionUpdateError(err)],
      };
    }
  }

  /**
   * Resolves exactly one `VoucherPayment` by voucher **unique_reference_id** + **voucher_transaction_id**.
   * Transaction ID in Excel must match the denormalized column (same string as export / `mapTxnRow`).
   */
  private async findVoucherPaymentForBulkRow(
    paymentReferenceId: string,
    transactionId: string,
  ): Promise<{ payment: VoucherPayment } | { reasons: string[] }> {
    const ref = paymentReferenceId.trim();
    const txnId = transactionId.trim();

    const matches = await this.voucherPaymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.voucher', 'voucher')
      .where('voucher.uniqueReferenceId = :ref', { ref })
      .andWhere('voucher.isDeleted = false')
      .andWhere('payment.voucherTransactionId = :txnId', { txnId })
      .getMany();

    if (matches.length === 0) {
      return {
        reasons: [
          'No payment found for this Payment Reference ID and Transaction ID (check values match the export)',
        ],
      };
    }
    if (matches.length > 1) {
      // Should not happen per domain rule for Pending Reco rows; guard against bad data / drift.
      return {
        reasons: [
          `Ambiguous match: ${matches.length} payments found for the same reference and transaction id`,
        ],
      };
    }

    return { payment: matches[0] };
  }

  /** Turn Nest `HttpException` / validation errors into a single line for `failures[].reasons`. */
  private formatBulkTransactionUpdateError(err: unknown): string {
    if (err instanceof HttpException) {
      const res = err.getResponse();
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && 'message' in res) {
        const m = (res as { message?: string | string[] }).message;
        return Array.isArray(m) ? m.join('; ') : (m ?? err.message);
      }
      return err.message;
    }
    if (err instanceof Error) return err.message;
    return 'Update failed';
  }

  /**
   * Retrieves paginated transaction list for a voucher with optional search.
   * Searches transaction identifiers (reference numbers, cheque numbers, receipt numbers).
   *
   * @param id - Voucher form ID
   * @param filterDto - Optional pagination and search parameters
   * @returns Promise<any> Paginated transaction list with metadata
   * @throws NotFoundException when voucher not found
   */
  async listTransactions(
    id: number,
    filterDto?: ListTransactionsFilterDto,
  ): Promise<any> {
    try {
      const {
        page = DEFAULT_PAGE,
        limit = DEFAULT_LIMIT,
        sortBy = 'createdAt',
        search,
      } = filterDto || {};

      const pageNum = Math.max(1, Number(page) || DEFAULT_PAGE);
      const pageSize = Math.max(1, Number(limit) || DEFAULT_LIMIT);

      // Build query with search functionality
      const queryBuilder = this.voucherPaymentRepository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.voucher', 'voucher')
        .where('voucher.id = :voucherId', { voucherId: id });

      // Add search conditions if search term is provided
      if (search) {
        queryBuilder.andWhere(
          `(
            payment.voucherTransactionId LIKE :search
            OR JSON_UNQUOTE(JSON_EXTRACT(payment.paymentDetails, '$.transactionNumber')) LIKE :search
            OR JSON_UNQUOTE(JSON_EXTRACT(payment.paymentDetails, '$.gatewayPaymentId')) LIKE :search
            OR JSON_UNQUOTE(JSON_EXTRACT(payment.paymentDetails, '$.chequeNumber')) LIKE :search
            OR CAST(payment.receiptNo AS CHAR) LIKE :search
          )`,
          { search: `%${search}%` },
        );
      }

      // Apply ordering
      queryBuilder.orderBy(`payment.${sortBy}`, 'DESC');

      // Apply pagination
      queryBuilder.skip((pageNum - 1) * pageSize).take(pageSize);

      // Execute query
      const [transactions, total] = await queryBuilder.getManyAndCount();

      // If no transactions found, check if voucher exists
      if (total === 0) {
        const voucher = await this.voucherFormRepository.findOne({
          where: { id: id, isDeleted: false },
          select: ['id', 'uniqueReferenceId'],
        });

        if (!voucher) {
          throw new NotFoundException('Voucher not found');
        }

        return {
          statusCode: SUCCESS,
          message: 'Transactions retrieved successfully',
          data: {
            referenceId: voucher.uniqueReferenceId,
            result: [],
            total: 0,
            currentPage: pageNum,
            pageSize,
            totalPages: 0,
          },
        };
      }

      // Get voucher info from the first transaction
      const referenceId = transactions[0]?.voucher?.uniqueReferenceId || null;

      return {
        statusCode: SUCCESS,
        message: 'Transactions retrieved successfully',
        data: {
          referenceId,
          result: transactions.map((transaction, index) => ({
            srNo: `T${total - (pageNum - 1) * pageSize - index}`,
            id: transaction.id,
            paidAmount: transaction.paidAmount,
            paymentMode: transaction.paymentMode,
            date: transaction.date,
            status: transaction.status,
            transactionId:
              transaction.voucherTransactionId ??
              deriveVoucherTransactionIdFromPaymentDetails(
                transaction.paymentDetails,
              ) ??
              null,
            realisationDate: transaction.realisationDate || null,
            comments: transaction.comments || null,
            receiptNo: transaction.receiptNo || null,
            receiptImage: transaction.receiptImage || null,
            paymentProof: transaction.paymentDetails?.paymentProof || [],
            chequeDepositSlip:
              transaction.paymentDetails?.chequeDepositSlip || [],
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
          })),
          total,
          currentPage: pageNum,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      logger.error('Failed to retrieve transactions:', error);
      throw new InternalServerErrorException('Failed to retrieve transactions');
    }
  }

  /**
   * Updates transaction status (verification, rejection) and processes related voucher changes.
   * Handles queue ID regeneration when payments are reversed/rejected.
   * Sends status-specific notifications to customers.
   *
   * @param id - Transaction ID to update
   * @param updateTransactionDto - DTO with new status, date, comments, receipt
   * @param userId - Finance admin user ID for processing
   * @returns Promise<any> Response with updated transaction ID
   * @throws NotFoundException when transaction not found
   * @throws BadRequestException when status change is not allowed
   */
  async updateTransaction(
    id: number,
    updateTransactionDto: UpdateTransactionDto,
    userId: number,
  ): Promise<any> {
    try {
      const { status, realisationDate, comments, receiptNo } =
        updateTransactionDto;

      return await this.voucherPaymentRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // 1) find transaction and basic validation
          const transaction = await transactionalEntityManager.findOne(
            VoucherPayment,
            {
              where: { id },
              relations: ['voucher'],
            },
          );

          if (!transaction) {
            throw new NotFoundException('Transaction not found');
          }

          if (
            (transaction.status === PaymentTxStatusEnum.REJECTED &&
              status !== PaymentTxStatusEnum.REJECTED) ||
            (transaction.status === PaymentTxStatusEnum.VERIFIED &&
              status !== PaymentTxStatusEnum.VERIFIED)
          ) {
            throw new BadRequestException(
              `This transaction is already ${transaction.status}, so you cannot change the status of it!`,
            );
          }

          // 2) apply updates
          transaction.status = status;
          transaction.realisationDate = realisationDate
            ? new Date(realisationDate)
            : null;
          transaction.comments = comments || null;
          transaction.receiptNo = receiptNo || null;
          transaction.processedBy = { id: userId } as Users;

          // 3) save the updated transaction
          const updatedTransaction =
            await transactionalEntityManager.save(transaction);

          // 4) do the voucher/finance related work in a helper to keep this method small
          await this.processVoucherAfterTransaction(
            transactionalEntityManager,
            updatedTransaction,
          );

          return {
            statusCode: SUCCESS,
            message: 'Transaction updated successfully',
            data: { id: updatedTransaction.id },
          };
        },
      );
    } catch (error) {
      logger.error('Failed to update transaction:', error);
      logsAndErrorHandling('eoiManagementService - updateTransaction', error, {
        id,
        updateTransactionDto,
        userId,
      });
    }
  }

  /**
   * Processes all voucher-side effects when transaction status changes.
   * Calculates finance status, updates queue IDs, sends notifications.
   * Executes all updates within provided transaction context.
   *
   * @param transactionalEntityManager - Transaction context for atomicity
   * @param updatedTransaction - Modified transaction entity
   * @returns Promise<void> - All updates persisted within transaction
   * @throws NotFoundException when voucher not found
   */
  private async processVoucherAfterTransaction(
    transactionalEntityManager: EntityManager,
    updatedTransaction: VoucherPayment,
  ): Promise<void> {
    // 1) fetch all transactions for the voucher (single query)
    const transactions = await transactionalEntityManager
      .createQueryBuilder(VoucherPayment, 'payment')
      .select([
        'payment.status AS status',
        'payment.receipt_no AS receiptNo',
        'payment.paid_amount AS paidAmount',
      ])
      .where('payment.voucher = :voucherId', {
        voucherId: updatedTransaction.voucher.id,
      })
      .getRawMany();

    // 2) load voucher form (with relations needed)
    const voucherForm = await transactionalEntityManager.findOne(VoucherForm, {
      where: { id: updatedTransaction.voucher.id, isDeleted: false },
      relations: [
        'campaign',
        'createdBy',
        'closingRm',
        'misChecker',
        'crmChecker',
        'payments',
      ],
    });

    if (!voucherForm) {
      throw new NotFoundException('VoucherForm not found for transaction');
    }

    const previousStatus = voucherForm.voucherFormStatus;

    await this.updateVoucherPaymentState(
      transactionalEntityManager,
      voucherForm,
      transactions,
      updatedTransaction,
    );

    //if set formStatus Active then send email to customer for upload receipt
    if (
      previousStatus !== VoucherFormStatusEnum.ACTIVE &&
      voucherForm.voucherFormStatus === VoucherFormStatusEnum.ACTIVE
    ) {
      const transactions = voucherForm.payments || [];

      this.sendEmailForReceiptUpload(transactions, voucherForm).catch(
        (error) => {
          logger.error(
            `Failed to send receipt upload email for voucher ${voucherForm.id}`,
            error,
          );
        },
      );
    }

    // 8) async notifications (non-blocking)
    if (updatedTransaction.status === PaymentTxStatusEnum.REVERSED) {
      this.sendAmountReversedEmail(updatedTransaction, voucherForm).catch(
        (error) => {
          logger.error('Failed to send amount reversed email', error);
        },
      );
    }

    if (updatedTransaction.status === PaymentTxStatusEnum.VERIFIED) {
      this.sendTransactionVerifiedEmail(updatedTransaction, voucherForm).catch(
        (error) => {
          logger.error('Failed to send transaction verified email', error);
        },
      );
    }
  }

  private async updateVoucherPaymentState(
    transactionalEntityManager: EntityManager,
    voucherForm: VoucherForm,
    transactions: any[],
    updatedTransaction: VoucherPayment,
  ): Promise<void> {
    // 3) compute finance status
    const financeStatus = this.calculateFinanceStatus(
      transactions,
      voucherForm.paymentDetails.amountPayable,
    );

    // preserve REFUNDED state if already refunded
    voucherForm.financeStatus =
      voucherForm.financeStatus === PaymentTxStatusEnum.REFUNDED
        ? voucherForm.financeStatus
        : financeStatus;

    // move voucher form status to ACTIVE if conditions match
    if (
      voucherForm.voucherFormStatus === VoucherFormStatusEnum.CRM_VERIFIED &&
      voucherForm.paymentStatus === VoucherPaymentStatus.PAID &&
      financeStatus === PaymentTxStatusEnum.VERIFIED
    ) {
      voucherForm.voucherFormStatus = VoucherFormStatusEnum.ACTIVE;
      voucherForm.activatedAt = new Date();
    }

    // 4) calculate payment metrics and set paymentDetails
    const paymentMetrics = calculatePaymentMetrics(
      transactions,
      voucherForm.paymentDetails.amountPayable,
    );

    const reconcileResult = reconcileTierIdsForCurrentEligibility(
      voucherForm,
      voucherForm.campaign,
      paymentMetrics.validPaidAmount,
    );

    let tierConfig: {
      thresholdKey: 'voucher' | 'standard' | 'preferential';
    } | null = null;
    if (updatedTransaction.status === PaymentTxStatusEnum.VERIFIED) {
      tierConfig = (await resolveAndAssignTieredId(
        voucherForm,
        voucherForm.campaign,
        paymentMetrics.validPaidAmount,
        (voucher, id) =>
          this.voucherFormsService.sendQueueIdAssignmentEmail(voucher, id),
        (counterField) =>
          allocateCampaignTierCounter(
            transactionalEntityManager,
            voucherForm.campaign.id,
            counterField,
          ),
      )) as typeof tierConfig;
    }

    const recomputedMetrics =
      applyAssignedTierThresholdAmountAndRecomputeMetrics(
        voucherForm,
        voucherForm.campaign,
        tierConfig,
        transactions,
      );
    const metricsForVoucher = recomputedMetrics ?? paymentMetrics;

    voucherForm.paymentDetails.totalAmountPaid =
      metricsForVoucher.totalPaidAmount;
    const updatedPaymentStatus = determinePaymentStatus(metricsForVoucher);

    // 5) generate/assign queue id
    await this.assignQueueIdByLatestVerifiedThreshold(
      voucherForm,
      metricsForVoucher,
      transactions,
      transactionalEntityManager,
    );

    // 6) if reversal or rejection and voucher not fully paid any more, update queue id handling
    if (
      (updatedTransaction.status === PaymentTxStatusEnum.REVERSED ||
        updatedTransaction.status === PaymentTxStatusEnum.REJECTED) &&
      updatedPaymentStatus !== VoucherPaymentStatus.PAID
    ) {
      await this.handlePaymentReversalQueueIdUpdate(voucherForm);
    }

    if (!reconcileResult.eligibleTier) {
      voucherForm.queueId = null;
    }

    voucherForm.paymentStatus = updatedPaymentStatus;

    // 7) persist voucherForm changes inside the transaction
    await transactionalEntityManager.save(voucherForm);
  }

  /**
   * Determines overall finance status from collection of transaction statuses.
   * Priority: REJECTED > REVERSED > UNVERIFIED > VERIFIED based on payment state.
   *
   * @param transactions - Array of transaction records with status and amounts
   * @param amountPayable - Total amount that should be collected
   * @returns PaymentTxStatusEnum The aggregate finance status
   */
  private calculateFinanceStatus(
    transactions: Array<{
      status: string;
      receiptNo: string | null;
      paidAmount: number;
    }>,
    amountPayable: number,
  ): PaymentTxStatusEnum {
    const statuses = new Set(transactions.map((tx) => tx.status));

    const totalVerifiedAmount = transactions.reduce((sum, tx) => {
      if (tx.status === PaymentTxStatusEnum.VERIFIED) {
        sum += Number(tx.paidAmount);
      }
      return sum;
    }, 0);

    const isFullAmountVerified = totalVerifiedAmount >= amountPayable;

    if (statuses.has(PaymentTxStatusEnum.REJECTED) && !isFullAmountVerified) {
      return PaymentTxStatusEnum.REJECTED;
    }
    if (statuses.has(PaymentTxStatusEnum.REVERSED) && !isFullAmountVerified) {
      return PaymentTxStatusEnum.REVERSED;
    }
    if (statuses.has(PaymentTxStatusEnum.UNVERIFIED) && !isFullAmountVerified) {
      return PaymentTxStatusEnum.UNVERIFIED;
    }
    return PaymentTxStatusEnum.VERIFIED;
  }

  private async assignQueueIdByLatestVerifiedThreshold(
    voucherForm: VoucherForm,
    metricsForVoucher: ReturnType<typeof calculatePaymentMetrics>,
    transactions: VoucherPayment[],
    transactionalEntityManager: EntityManager,
  ): Promise<void> {
    const thresholds = resolveThresholds(voucherForm.campaign, voucherForm);
    let queueTierConfig: {
      tier:
        | VoucherIdFieldNameEnum.PAID_VOUCHER_ID
        | VoucherIdFieldNameEnum.STD_EOI_ID
        | VoucherIdFieldNameEnum.PRE_EOI_ID;
      thresholdKey: 'voucher' | 'standard' | 'preferential';
      existingKey: 'paidVoucherId' | 'stdEoiId' | 'preEoiId';
      requiredPhase: VoucherFormType.VOUCHER | VoucherFormType.EOI;
      queueType: QueueTypeEnum;
      sequenceField:
        | 'voucherSequenceId'
        | 'standardSequenceId'
        | 'preferentialSequenceId';
      issuedAtField: 'voucherIssuedAt' | 'stdEoiIssuedAt' | 'preEoiIssuedAt';
      counterField: 'voucherIdCounter' | 'stdEoiCounter' | 'preEoiCounter';
      initialsField: 'voucherIdInitials' | 'stdEoiInitials' | 'preEoiInitials';
    } | null = null;

    if (
      thresholds.preferential != null &&
      metricsForVoucher.verifiedAmount >= thresholds.preferential
    ) {
      queueTierConfig = {
        tier: VoucherIdFieldNameEnum.PRE_EOI_ID,
        thresholdKey: 'preferential',
        existingKey: 'preEoiId',
        requiredPhase: VoucherFormType.EOI,
        queueType: QueueTypeEnum.PRE,
        sequenceField: 'preferentialSequenceId',
        issuedAtField: 'preEoiIssuedAt',
        counterField: 'preEoiCounter',
        initialsField: 'preEoiInitials',
      };
    } else if (
      thresholds.standard != null &&
      metricsForVoucher.verifiedAmount >= thresholds.standard
    ) {
      queueTierConfig = {
        tier: VoucherIdFieldNameEnum.STD_EOI_ID,
        thresholdKey: 'standard',
        existingKey: 'stdEoiId',
        requiredPhase: VoucherFormType.EOI,
        queueType: QueueTypeEnum.STD,
        sequenceField: 'standardSequenceId',
        issuedAtField: 'stdEoiIssuedAt',
        counterField: 'stdEoiCounter',
        initialsField: 'stdEoiInitials',
      };
    } else if (
      thresholds.voucher != null &&
      metricsForVoucher.verifiedAmount >= thresholds.voucher
    ) {
      queueTierConfig = {
        tier: VoucherIdFieldNameEnum.PAID_VOUCHER_ID,
        thresholdKey: 'voucher',
        existingKey: 'paidVoucherId',
        requiredPhase: VoucherFormType.VOUCHER,
        queueType: QueueTypeEnum.VQI,
        sequenceField: 'voucherSequenceId',
        issuedAtField: 'voucherIssuedAt',
        counterField: 'voucherIdCounter',
        initialsField: 'voucherIdInitials',
      };
    }

    const queueThreshold = queueTierConfig
      ? thresholds[queueTierConfig.thresholdKey]
      : null;
    const queueGateAmount =
      queueThreshold ?? voucherForm.paymentDetails.amountPayable;

    const queueMetrics = calculatePaymentMetrics(transactions, queueGateAmount);

    if (!shouldGenerateQueueId(voucherForm, queueMetrics)) {
      return;
    }

    if (queueTierConfig) {
      await generateAndAssignTieredQueueId(
        voucherForm,
        queueTierConfig as Parameters<typeof generateAndAssignTieredQueueId>[1],
        (campaignId, queueType) =>
          this.voucherFormsService.generateQueueId(
            campaignId,
            queueType,
            transactionalEntityManager,
          ),
      );
      return;
    }

    await generateAndAssignQueueId(
      voucherForm,
      voucherForm.voucherId,
      (campaignId, queueType) =>
        this.voucherFormsService.generateQueueId(
          campaignId,
          queueType,
          transactionalEntityManager,
        ),
    );
  }

  /**
   * Updates voucher status based on backend checker (MIS/CRM) decision.
   * Routes to MIS or CRM specific update logic based on user role.
   * May auto-activate voucher when conditions are met.
   *
   * @param user - Current user (MIS or CRM checker)
   * @param checkerUpdates - DTO with new status and remarks
   * @returns Promise<any> Response with updated voucher ID
   * @throws NotFoundException when voucher not found
   * @throws BadRequestException for invalid status transitions
   */
  async updateBackendCheckerStatus(
    user: any,
    checkerUpdates: CheckerUpdatesDto,
  ): Promise<any> {
    try {
      const notifications: object[] = [];
      const voucherForm = await this.voucherFormRepository.findOne({
        where: { id: checkerUpdates?.voucherId, isDeleted: false },
        select: [
          'id',
          'financeStatus',
          'paymentStatus',
          'voucherFormStatus',
          'checkerRemarks',
          'uniqueReferenceId',
          'preEoiId',
          'stdEoiId',
          'paidVoucherId',
          'applicant1',
        ],
        relations: ['payments', 'createdBy', 'closingRm', 'campaign'],
      });

      if (!voucherForm) throw new NotFoundException('Voucher not found');
      if (voucherForm?.voucherFormStatus === VoucherFormStatusEnum.CANCELLED)
        throw new BadRequestException('Voucher is already cancelled');

      voucherForm.checkerRemarks ??= {};
      const previousStatus = voucherForm.voucherFormStatus;

      if (user.role === RolesEnum.MIS) {
        this.applyMisUpdate(user, voucherForm, checkerUpdates, notifications);
      } else if (user.role === RolesEnum.CRM) {
        this.applyCrmUpdate(user, voucherForm, checkerUpdates, notifications);
      }

      await this.voucherFormRepository.save(voucherForm);

      //  trigger email ONLY when status changes to ACTIVE
      if (
        previousStatus !== VoucherFormStatusEnum.ACTIVE &&
        voucherForm.voucherFormStatus === VoucherFormStatusEnum.ACTIVE
      ) {
        try {
          const transactions = voucherForm.payments || [];
          await this.sendEmailForReceiptUpload(transactions, voucherForm);
        } catch (error) {
          logger.error(
            `Failed to send receipt upload email for voucher ${voucherForm.id}`,
            error,
          );
        }
      }

      if (notifications.length > 0) {
        try {
          this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
            notifications,
          });
        } catch (e) {
          logger.error(
            'Error while creating notifications for Brand, City, or Phase',
            e,
          );
        }
      }

      return {
        statusCode: SUCCESS,
        data: { id: checkerUpdates?.voucherId },
        message: 'Voucher status updated successfully',
      };
    } catch (error) {
      logger.error('Error Verifying voucher form:', error);
      logsAndErrorHandling(
        'eoiManagementService - updateBackendCheckerStatus',
        error,
        {
          user,
          checkerUpdates,
        },
      );
    }
  }

  /**
   * Applies MIS checker updates to voucher status and remarks.
   * Transitions from UNVERIFIED to MIS_VERIFIED or MIS_REQUESTED_CHANGES.
   *
   * @param user - MIS user performing the check
   * @param voucherForm - Voucher to update
   * @param checkerUpdates - Status and remarks from checker
   * @param notifications - Array to accumulate notifications
   * @returns void - Updates voucher and notifications in place
   * @throws BadRequestException if CRM has already acted
   */
  private applyMisUpdate(
    user: any,
    voucherForm: any,
    checkerUpdates: CheckerUpdatesDto,
    notifications: object[],
  ): void {
    const { voucherStatus, checkerRemarks } = checkerUpdates;

    // Already approved by MIS if CRM has acted
    if (
      voucherForm.voucherFormStatus === VoucherFormStatusEnum.CRM_VERIFIED ||
      voucherForm.voucherFormStatus ===
        VoucherFormStatusEnum.CRM_REQUESTED_CHANGES
    )
      throw new BadRequestException('Request is Already approved by MIS');

    const nextStatus =
      voucherStatus ?? VoucherFormStatusEnum.MIS_REQUESTED_CHANGES;

    voucherForm.checkerRemarks.misRemark = checkerRemarks;

    if (voucherStatus === VoucherFormStatusEnum.MIS_VERIFIED) {
      notifications.push({
        title: 'Verification approval processed',
        message: `A voucher with Unique Reference ID "${voucherForm.uniqueReferenceId}", has been verified by ${user.name}(${user.role}).`,
        type: 'Voucher',
        isForAllCRM: true,
      });
    }

    voucherForm.voucherFormStatus = nextStatus;
    voucherForm.misChecker = user?.dbId;
    voucherForm.checkedAt = new Date();
  }

  /**
   * Applies CRM checker updates to voucher status and auto-activation logic.
   * Can transition to CRM_VERIFIED, UPGRADED, or ACTIVE based on finance status.
   *
   * @param user - CRM user performing the check
   * @param voucherForm - Voucher to update
   * @param checkerUpdates - Status and remarks from checker
   * @param notifications - Array to accumulate notifications
   * @returns void - Updates voucher and notifications in place
   * @throws BadRequestException for invalid status transitions
   */
  private applyCrmUpdate(
    user: any,
    voucherForm: any,
    checkerUpdates: CheckerUpdatesDto,
    notifications: object[],
  ): void {
    const { voucherStatus, checkerRemarks } = checkerUpdates;

    // CRM cannot set MIS-only statuses
    if (
      voucherStatus === VoucherFormStatusEnum.MIS_VERIFIED ||
      voucherStatus === VoucherFormStatusEnum.MIS_REQUESTED_CHANGES
    )
      throw new BadRequestException('Please select valid voucher status');

    // CRM can proceed only after MIS decision is present
    if (
      ![
        VoucherFormStatusEnum.MIS_VERIFIED,
        VoucherFormStatusEnum.CRM_REQUESTED_CHANGES,
        VoucherFormStatusEnum.CRM_UPDATED,
      ].includes(voucherForm.voucherFormStatus)
    )
      throw new BadRequestException(
        'You are not allowed to approve this form at this stage',
      );

    let nextStatus =
      voucherStatus ?? VoucherFormStatusEnum.CRM_REQUESTED_CHANGES;

    // Auto-activate when CRM verifies/upgrades and finance is already verified
    const wantsActivation =
      nextStatus === VoucherFormStatusEnum.CRM_VERIFIED ||
      nextStatus === VoucherFormStatusEnum.UPGRADED;
    let activationDate: Date | null = null;

    if (
      wantsActivation &&
      voucherForm.financeStatus === PaymentTxStatusEnum.VERIFIED &&
      voucherForm.paymentStatus == VoucherPaymentStatus.PAID
    ) {
      //  Check realized transactions
      const realizedTransactions = (voucherForm.payments || []).filter(
        (tx) => tx.status === PaymentTxStatusEnum.VERIFIED,
      );

      //  Check if any realized transaction does NOT have receipt
      const missingReceipt = realizedTransactions.some(
        (tx) => !tx.receiptImage || tx.receiptImage.trim() === '',
      );

      if (missingReceipt) {
        throw new BadRequestException(
          'Receipt image is required for all realized transactions before activating the voucher',
        );
      }
      nextStatus = VoucherFormStatusEnum.ACTIVE;
      activationDate = new Date();
    }

    voucherForm.checkerRemarks.crmRemark = checkerRemarks;

    if (voucherStatus === VoucherFormStatusEnum.CRM_VERIFIED.toString()) {
      notifications.push({
        title: 'Verification approval processed',
        message: `A voucher with Unique Reference ID "${voucherForm.uniqueReferenceId}", has been verified by ${user.name}(${user.role}).`,
        type: 'Voucher',
        isForAllFinanceAdmin: true,
      });
    }

    voucherForm.voucherFormStatus = nextStatus;
    voucherForm.crmChecker = user?.dbId;
    voucherForm.checkedAt = new Date();
    voucherForm.activatedAt = activationDate;
  }

  /**
   * Processes refund for a cancelled voucher that is pre-approved for refund.
   * Updates voucher status to CANCELLED with REFUNDED payment status.
   * Creates refund transaction record with refund details.
   *
   * @param user - Finance admin processing the refund
   * @param refundDetails - DTO with amount, date, and transaction IDs
   * @returns Promise<any> Response with refunded voucher ID
   * @throws NotFoundException when voucher not in REFUND_INITIATED status
   */
  async refundEOIPayment(
    user: any,
    refundDetails: RefundEOIPaymentDto,
  ): Promise<any> {
    return await this.eoiCampaignRepository.manager.transaction(
      async (transactionalEntityManager) => {
        try {
          const voucherForm = await transactionalEntityManager.findOne(
            VoucherForm,
            {
              where: {
                id: refundDetails?.voucherId,
                voucherFormStatus: VoucherFormStatusEnum.REFUND_INITIATED,
                isDeleted: false,
              },
            },
          );

          if (!voucherForm) {
            throw new NotFoundException(
              'Voucher not found or cancellation is not approved by admin',
            );
          }

          // Update voucherForm
          await transactionalEntityManager.update(
            VoucherForm,
            { id: refundDetails?.voucherId },
            {
              paymentStatus: VoucherPaymentStatus.REFUNDED,
              financeStatus: PaymentTxStatusEnum.REFUNDED,
              voucherFormStatus: VoucherFormStatusEnum.CANCELLED,
            },
          );

          // Create a new VoucherPayment record for refund
          const refundPayment = transactionalEntityManager.create(
            VoucherPayment,
            {
              voucher: { id: refundDetails?.voucherId },
              paidAmount: refundDetails.paidAmount ?? 0,
              paymentMode: PaymentModeEnum.OFFLINE,
              date: new Date(refundDetails.refundDate),
              paymentType: VoucherPaymentType.REFUND,
              paymentDetails: {
                transactionNumber: refundDetails?.refundTransactionId ?? null,
                internalRefNumber: refundDetails?.internalRefNumber ?? null,
              },
              status: PaymentTxStatusEnum.REFUNDED,
              comments: refundDetails?.comments ?? null,
              processedBy: user?.dbId,
            },
          );
          await transactionalEntityManager.save(VoucherPayment, refundPayment);

          return {
            statusCode: SUCCESS,
            data: { id: refundDetails?.voucherId },
            message: 'Voucher amount refunded successfully',
          };
        } catch (error) {
          logger.error('Error refunding voucher payment:', error);
          throw error;
        }
      },
    );
  }

  /**
   * Processes cancellation approval/revocation by RM, MIS, or Business Head.
   * Routes role-specific cancellation logic and creates notifications.
   *
   * @param user - Current user (RM, CRM, or SALES_SHH)
   * @param cancelDto - DTO with voucher ID, action, and remarks
   * @returns Promise<any> Response with updated voucher
   * @throws BadRequestException for invalid voucher state or status transitions
   */
  async approveCancelRequest(
    user: any,
    cancelDto?: ApproveCancelRequestDTO,
  ): Promise<any> {
    try {
      const notifications: any[] = [];

      const voucher = await this.voucherFormRepository.findOne({
        where: { id: cancelDto.voucherId, isDeleted: false },
        relations: ['campaign', 'createdBy'],
      });

      if (!voucher)
        throw new BadRequestException('This voucher does not exist.');

      voucher.cancelReason = voucher.cancelReason ?? {};

      await this.applyCancellationByRole(
        user,
        voucher,
        cancelDto,
        notifications,
      );

      await this.voucherFormRepository.save(voucher);
      if (notifications.length) {
        try {
          this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
            notifications,
          });
        } catch (e) {
          logger.error(
            'Error while creating notifications for cancellation approval/revocation',
            e,
          );
        }
      }

      return {
        statusCode: SUCCESS,
        message: `Cancel request ${cancelDto.action}d successfully`,
        data: {
          id: cancelDto.voucherId,
        },
      };
    } catch (error) {
      logger.error('approve-cancel-request failed:', error);
      return logsAndErrorHandling(
        'eoiManagementService - approveCancelRequest',
        error,
        {
          user,
          cancelDto,
        },
      );
    }
  }

  /**
   * Routes cancellation updates based on user role with role-specific validations.
   * Handles RM revocation/approval, MIS approval, and Business Head approval flows.
   *
   * @param user - Current user with role information
   * @param voucher - Voucher to update
   * @param cancelDto - Cancellation action and remarks
   * @param notifications - Array to accumulate role-specific notifications
   * @returns Promise<void> - Updates voucher in place
   * @throws BadRequestException for invalid role or status
   */
  private async applyCancellationByRole(
    user: any,
    voucher: any,
    cancelDto: ApproveCancelRequestDTO,
    notifications: any[],
  ): Promise<void> {
    const { role, name } = user;
    const { action, remarks } = cancelDto;

    switch (role) {
      case RolesEnum.RM: {
        logger.info(
          `RM ${name} is processing cancellation action "${action}" for voucher with reference ID "${voucher.uniqueReferenceId}" and current status "${voucher.voucherFormStatus}"`,
        );
        if (action === CancellationActionEnum.REVOKE) {
          voucher.voucherFormStatus = voucher.cancelledFrom;

          // Send email to customer when cancellation is revoked
          this.sendCancellationRevokedEmail(voucher).catch((error) => {
            logger.error('Failed to send cancellation revoked email', error);
          });
        }
        break;
      }

      case RolesEnum.SUPER_ADMIN:
      case RolesEnum.ADMIN:
      case RolesEnum.SALES_RSH: {
        logger.info(
          `${role} ${name} is processing cancellation action "${action}" for voucher with reference ID "${voucher.uniqueReferenceId}" and current status "${voucher.voucherFormStatus}"`,
        );
        await this.checkVoucherStatus(role, voucher.voucherFormStatus, action);
        if (action === CancellationActionEnum.REVOKE) {
          voucher.voucherFormStatus = voucher.cancelledFrom;
          voucher.cancelReason.rshRemark = remarks;

          // Send email to RM
          this.sendCancellationRevokedRMEmail(voucher).catch((error) => {
            logger.error(
              'Failed to send cancellation revoked email to RM',
              error,
            );
          });

          // Send email to customer when cancellation is revoked
          this.sendCancellationRevokedEmail(voucher).catch((error) => {
            logger.error('Failed to send cancellation revoked email', error);
          });
        } else if (action === CancellationActionEnum.APPROVE) {
          voucher.voucherFormStatus = VoucherFormStatusEnum.CANCEL_ACCEPTED;
          voucher.cancelReason.rshRemark = remarks;
          //email notification
          this.sendCancellationApprovedEmail(voucher, user).catch((error) => {
            logger.error('Failed to send cancellation revoked email', error);
          });

          //push notification
          notifications.push({
            title: 'Voucher cancellation Accepted',
            message: `A cancellation request with "${voucher.uniqueReferenceId}" has been accepted by ${name} (${role}). Please take necessary actions on your end.`,
            type: 'Voucher',
            isForAllCRM: true,
          });
        } else {
          throw new BadRequestException('Invalid action for Admin role');
        }
        break;
      }

      case RolesEnum.CRM: {
        logger.info(
          `CRM ${name} is processing cancellation action "${action}" for voucher with reference ID "${voucher.uniqueReferenceId}" and current status "${voucher.voucherFormStatus}"`,
        );
        await this.checkVoucherStatus(role, voucher.voucherFormStatus, action);
        if (action === CancellationActionEnum.CANCEL) {
          voucher.refundDocuments = cancelDto.refundDocuments ?? null;
          voucher.voucherFormStatus = VoucherFormStatusEnum.CANCELLED;
          voucher.cancelReason.crmRefundRemark = remarks;
          this.sendCancellationEmail(voucher).catch((error) => {
            logger.error('Failed to send cancellation revoked email', error);
          });
        } else if (action === CancellationActionEnum.APPROVE) {
          voucher.voucherFormStatus = VoucherFormStatusEnum.CANCEL_APPROVED;
          voucher.cancelReason.crmRemark = remarks;
          this.sendCancellationInitiatedEmail(voucher).catch((error) => {
            logger.error('Failed to send cancellation revoked email', error);
          });
        } else if (action === CancellationActionEnum.REVOKE) {
          voucher.voucherFormStatus = voucher.cancelledFrom;
          voucher.cancelReason.crmRemark = remarks;
          //send email to RM when cancellation is revoked -RM
          this.sendCancellationRevokedTORMRSHEmail(voucher).catch((error) => {
            logger.error('Failed to send cancellation revoked email', error);
          });
          // Send email to customer when cancellation is revoked
          this.sendCancellationRevokedEmail(voucher).catch((error) => {
            logger.error('Failed to send cancellation revoked email', error);
          });
        } else {
          throw new BadRequestException('Invalid action for CRM role');
        }
        break;
      }

      default:
        throw new BadRequestException(
          'Unsupported role for cancellation flow.',
        );
    }
  }

  /**
   * Validates voucher status transitions are allowed for cancellation workflows.
   * Enforces role-specific state machine rules for cancellation progression.
   *
   * @param role - User role performing the action
   * @param oldStatus - Current voucher status
   * @throws BadRequestException for invalid state transitions
   */
  async checkVoucherStatus(
    role: string,
    oldStatus: string,
    action: string,
  ): Promise<void> {
    try {
      if (
        [RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN, RolesEnum.SALES_RSH].includes(
          role as RolesEnum,
        )
      ) {
        if (
          [
            VoucherFormStatusEnum.CANCEL_APPROVED,
            VoucherFormStatusEnum.CANCELLED,
          ].includes(oldStatus as VoucherFormStatusEnum)
        ) {
          throw new BadRequestException(
            'Cancellation request is already approved by respective CRM.',
          );
        } else if (oldStatus !== VoucherFormStatusEnum.CANCEL_REQUESTED) {
          throw new BadRequestException(
            'No cancellation request initiated or you are not allowed take action.',
          );
        }
      } else if (role === RolesEnum.CRM) {
        if (
          oldStatus !== VoucherFormStatusEnum.CANCEL_ACCEPTED &&
          action === CancellationActionEnum.APPROVE
        ) {
          throw new BadRequestException(
            'Cancellation request is yet to be accepted by admin or cancellation request is already revoked by RM.',
          );
        } else if (
          oldStatus !== VoucherFormStatusEnum.CANCEL_APPROVED &&
          action === CancellationActionEnum.CANCEL
        ) {
          throw new BadRequestException(
            'You need to approve cancellation request before submitting the refund details.',
          );
        }
      }
    } catch (error) {
      logger.error('approve-cancel-request failed:', error);
      throw error;
    }
  }

  /**
   * Sends amount reversal notification email to customer and stakeholders.
   * Includes transaction details, amount, and date information.
   *
   * @param transaction - Reversed transaction entity
   * @param voucherForm - Associated voucher form
   * @returns Promise<void> - Non-blocking email dispatch
   */
  private async sendAmountReversedEmail(
    transaction: VoucherPayment,
    voucherForm: VoucherForm,
  ): Promise<void> {
    try {
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress ?? null;

      const ccEmails = [
        voucherForm.createdBy?.email,
        voucherForm.misChecker?.email,
        voucherForm.crmChecker?.email,
        voucherForm.closingRm?.email,
      ].filter(Boolean);

      const recipientEmails = customerEmail ? [customerEmail] : [];
      if (recipientEmails.length === 0) {
        logger.warn(
          `No recipient emails found for amount reversed notification (voucher: ${voucherForm.id})`,
        );
        return;
      }

      const personalDetails = voucherForm.applicant1?.personalDetails;
      const customerName =
        `${personalDetails?.firstName || ''} ${personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      const transactionId =
        transaction.paymentDetails?.transactionNumber ||
        transaction.paymentDetails?.gatewayPaymentId ||
        transaction.paymentDetails?.chequeNumber ||
        transaction.id.toString();

      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.AMOUNT_REVERSED,
          {
            CUSTOMER_NAME: customerName,
            RM_EMAIL_ID:
              voucherForm.closingRm?.email ||
              voucherForm.createdBy?.email ||
              '',
            UNIQUE_REF_ID: voucherForm.uniqueReferenceId || 'N/A',
            TRANSACTION_MODE: transaction.paymentMode || 'N/A',
            TRANSACTION_ID: transactionId,
            AMOUNT: `₹${Number(transaction.paidAmount).toFixed(2)}`,
            DATE: format(new Date(), 'dd/MM/yyyy'),
          },
          'Puravankara',
          {
            to: recipientEmails,
            cc: ccEmails,
          },
        ),
      );

      logger.info(
        `Amount reversed email notification sent for transaction ${transaction.id} (voucher: ${voucherForm.id}) to ${recipientEmails.length} recipients`,
      );
    } catch (error) {
      logger.error('Error sending amount reversed email notification', error);
    }
  }

  private async sendEmailForReceiptUpload(
    transaction: VoucherPayment[],
    voucherForm: VoucherForm,
  ): Promise<void> {
    try {
      const allReceiptsUploaded =
        transaction.length > 0 && transaction.every((txn) => txn.receiptImage);
      if (!allReceiptsUploaded) {
        logger.warn(
          `Email not triggered: Missing receipt for some transactions (voucher: ${voucherForm.id})`,
        );
        return;
      }
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;
      if (!customerEmail) {
        logger.warn(
          `No recipient email found for receipt upload email (voucher: ${voucherForm.id})`,
        );
        return;
      }

      const personalDetails = voucherForm.applicant1?.personalDetails;
      const customerName =
        `${personalDetails?.firstName || ''} ${personalDetails?.lastName || ''}`.trim() ||
        'Customer';
      let type = '';
      const baseUrl = this.configService.get<string>('AWS_S3_ACCESS_URL');

      if (voucherForm.preEoiId) {
        type = EOITypeEnum.PREFERENTIAL;
      } else if (voucherForm.stdEoiId) {
        type = EOITypeEnum.STANDARD;
      } else {
        type = EOITypeEnum.VOUCHER;
      }
      const eoiId =
        voucherForm.preEoiId ||
        voucherForm.stdEoiId ||
        voucherForm.paidVoucherId;

      const ccEmails = await this.getReceiptUploadCcEmails(voucherForm);

      const transactionRows = (transaction || [])
        .filter((txn) => txn.status === PaymentTxStatusEnum.VERIFIED) // only realized
        .map((txn, index) => {
          const paymentDetails = txn.paymentDetails || {};
          const mode = paymentDetails.method || txn.paymentMode || '-';

          const txnId =
            paymentDetails.transactionNumber ||
            paymentDetails.chequeNumber ||
            txn.voucherTransactionId ||
            txn.id;

          const date = txn.date ? formatDate(txn.date) : '-';

          const amount = txn.paidAmount
            ? `Rs. ${Number(txn.paidAmount).toLocaleString('en-IN')}`
            : '-';

          const receiptLink = txn.receiptImage
            ? `<a href="${baseUrl}${txn.receiptImage}" target="_blank">Link</a>`
            : '-';

          return `
            <tr>
              <td>${index + 1}</td>
              <td>${mode}</td>
              <td>${txnId}</td>
              <td>${date}</td>
              <td>${amount}</td>
              <td>${receiptLink}</td>
            </tr>
          `;
        })
        .join('');
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.RECEIPT_UPLOAD,
          {
            CUSTOMER_NAME: customerName,
            TRANSACTION_ROWS: transactionRows,
            TYPE: type,
            EOI_ID: eoiId,
          },
          'Puravankara',
          {
            to: customerEmail,
            cc: ccEmails,
          },
        ),
      );
    } catch (error) {
      logger.error(
        `Failed to send receipt upload email for voucher ${voucherForm.id}`,
        error,
      );
    }
  }

  private async getReceiptUploadCcEmails(
    voucherForm: VoucherForm,
  ): Promise<string[]> {
    const projectId = voucherForm.campaign?.projectId;

    if (!projectId) {
      return [];
    }

    const crmMappings = await this.projectUserMappingRepository.find({
      where: {
        project: { id: projectId },
        role: RolesEnum.CRM,
        removedAt: IsNull(),
      },
      relations: ['user'],
    });

    const ccEmails = [
      voucherForm.createdBy?.email,
      voucherForm.closingRm?.email,
      ...crmMappings.map((item) => item.user?.email),
    ];

    return [...new Set(ccEmails.filter(Boolean))];
  }

  /**
   * Sends transaction verification confirmation email to customer.
   * Includes payment amount and transaction reference.
   *
   * @param transaction - Verified transaction entity
   * @param voucherForm - Associated voucher form
   * @returns Promise<void> - Non-blocking email dispatch
   */
  private async sendTransactionVerifiedEmail(
    transaction: VoucherPayment,
    voucherForm: VoucherForm,
  ): Promise<void> {
    try {
      // Get customer email
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;

      if (!customerEmail) {
        logger.warn(
          `No customer email found for transaction verified notification (voucher: ${voucherForm.id})`,
        );
        return;
      }
      // Get customer name
      const customerName =
        `${voucherForm.applicant1?.personalDetails?.salutation || ''}${voucherForm.applicant1?.personalDetails?.firstName || ''} ${voucherForm.applicant1?.personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      // Format amount
      const amount = `₹ ${Number(transaction.paidAmount).toLocaleString('en-IN')}`;

      // Get transaction ID
      const transactionId =
        transaction.paymentDetails?.transactionNumber ||
        transaction.paymentDetails?.gatewayPaymentId ||
        transaction.paymentDetails?.chequeNumber ||
        transaction.id.toString();

      // Emit email event (non-blocking)
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.TRANSACTION_VERIFIED,
          {
            CUSTOMER_NAME: customerName,
            AMOUNT: amount,
            TRANSACTION_ID: transactionId,
          },
          'Puravankara',
          { to: customerEmail },
        ),
      );

      logger.info(
        `Transaction verified email notification sent for transaction ${transaction.id} (voucher: ${voucherForm.id}) to ${customerEmail}`,
      );
    } catch (error) {
      logger.error(
        'Error sending transaction verified email notification',
        error,
      );
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Sends cancellation revocation notification email to customer.
   * Provides link to resumed voucher form.
   *
   * @param voucherForm - Voucher with revoked cancellation
   * @returns Promise<void> - Non-blocking email dispatch
   */
  private async sendCancellationRevokedEmail(
    voucherForm: VoucherForm,
  ): Promise<void> {
    try {
      // Get customer email
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;

      if (!customerEmail) {
        logger.warn(
          `No customer email found for cancellation revoked notification (voucher: ${voucherForm.id})`,
        );
        return;
      }

      // Get customer name
      const customerName =
        `${voucherForm.applicant1?.personalDetails?.firstName || ''} ${voucherForm.applicant1?.personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      // Generate voucher form URL
      const puravankaraBaseUrl = this.configService.get<string>(
        'PURAVANKARA_BASE_URL',
      );
      const configOptions = {
        voucherFormUrl: `${puravankaraBaseUrl}/${VOUCHER_FORM_URL}`,
        nodeEnv: this.configService.get<string>('NODE_ENV'),
        formType: voucherForm.formPhase,
      };
      const voucherFormLink = generateVoucherFormUrl(
        voucherForm.voucherId,
        configOptions,
      );

      // Emit email event (non-blocking)
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.CANCELLATION_REVOKED,
          {
            CUSTOMER_NAME: customerName,
            VOUCHER_FORM_LINK: voucherFormLink,
          },
          BRAND_PURAVANKARA,
          { to: customerEmail },
        ),
      );

      logger.info(
        `Cancellation revoked email notification sent for voucher ${voucherForm.voucherId} to ${customerEmail}`,
      );
    } catch (error) {
      logger.error(
        'Error sending cancellation revoked email notification',
        error,
      );
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Sends cancellation notification email to customer.
   * RM (voucher createdBy) will be in CC.
   *
   * @param voucherForm - Cancelled voucher
   * @param remarks - Cancellation remarks
   * @returns Promise<void> - Non-blocking email dispatch
   */

  private async sendCancellationEmail(voucherForm: VoucherForm): Promise<void> {
    try {
      // Get customer email
      const customerEmail =
        voucherForm.applicant1?.personalDetails?.emailAddress;

      if (!customerEmail) {
        logger.warn(
          `No customer email found for cancellation notification (voucher: ${voucherForm.id})`,
        );
        return;
      }

      // Get customer name
      const customerName =
        `${voucherForm.applicant1?.personalDetails?.firstName || ''} ${voucherForm.applicant1?.personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      // Get RM Email (from createdBy)
      const rmEmail = voucherForm.createdBy?.email;
      const baseUrl = this.configService.get<string>('AWS_S3_ACCESS_URL');

      const refundChequeLink = `${baseUrl}${voucherForm.refundDocuments.refundChequeCopy[0]}`;
      const depositSlipLink = `${baseUrl}${voucherForm.refundDocuments.depositSlip[0]}`;
      const acknowledgementLink = `${baseUrl}${voucherForm.refundDocuments.acknowledgementForm[0]}`;
      const rshEmails = JSON.parse(
        this.configService.get<string>('RSH_NOTIFICATION_EMAIL') || '[]',
      );
      const ccEmails = [rmEmail, ...rshEmails].filter(Boolean);

      // Emit email event (non-blocking)
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.CRM_REQUESTED_CANCELLATION,
          {
            CUSTOMER_NAME: customerName,
            PRID: voucherForm.uniqueReferenceId,
            REFUND_AMOUNT: voucherForm?.paymentDetails?.totalAmountPaid || 0,
            REFUND_CHEQUE_LINK: refundChequeLink,
            DEPOSIT_SLIP_LINK: depositSlipLink,
            ACKNOWLEDGEMENT_LINK: acknowledgementLink,
          },
          BRAND_PURAVANKARA,
          { to: customerEmail, cc: ccEmails },
        ),
      );

      logger.info(
        `Cancellation email successfully queued for voucher ID: ${voucherForm.id}`,
      );
    } catch (error) {
      logger.error(
        `Error while sending cancellation email for voucher ID: ${voucherForm?.id}`,
        error,
      );
    }
  }

  /**
   * Sends cancellation initiated email notification to the Relationship Manager (RM).
   *
   * This method emits a CRM_CANCELLATION_INITIATED email event
   * when a cancellation request is first raised for a voucher.
   * The email includes RM name and voucher PRID details.
   *
   * @param voucherForm - Voucher form entity containing RM and reference details
   * @returns Promise<void>
   */
  private async sendCancellationInitiatedEmail(
    voucherForm: VoucherForm,
  ): Promise<void> {
    try {
      const rmEmail = voucherForm.createdBy?.email;
      if (!rmEmail) {
        logger.warn(
          `Cancellation initiated email not sent. RM email missing for voucher ID: ${voucherForm.id}`,
        );
        return;
      }
      const rshEmails = JSON.parse(
        this.configService.get<string>('RSH_NOTIFICATION_EMAIL') || '[]',
      );

      const rmName = voucherForm.createdBy?.name || 'RM';
      // Send email to RM
      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.CRM_CANCELLATION_INITIATED,
          {
            RM_NAME: rmName,
            PRID: voucherForm.uniqueReferenceId,
          },
          BRAND_PURAVANKARA,
          {
            to: rmEmail,
          },
        ),
      );

      // Send email to RSH
      if (rshEmails.length) {
        this.eventEmitter.emit(
          EventMessagesEnum.COMPOSE_EMAIL,
          new ComposeEmailEvent(
            ComposeEmailsEnum.CRM_CANCELLATION_INITIATED,
            {
              RM_NAME: 'RSH',
              PRID: voucherForm.uniqueReferenceId,
            },
            BRAND_PURAVANKARA,
            {
              to: rshEmails,
            },
          ),
        );
      }

      logger.info(
        `Cancellation initiated email sent to RM (${rmEmail}) for voucher ID: ${voucherForm.id}`,
      );
    } catch (error) {
      logger.error(
        `Error sending cancellation initiated email for voucher ID: ${voucherForm?.id}`,
        error,
      );
    }
  }

  /**
   * Sends cancellation revoked email notification to the Relationship Manager (RM).
   *
   * This method emits a CRM_CANCELLATION_REVOKED email event
   * when a previously raised cancellation request is revoked.
   * The email includes RM name and voucher PRID details.
   *
   * @param voucherForm - Voucher form entity containing RM and reference details
   * @returns Promise<void>
   */
  private async sendCancellationRevokedTORMRSHEmail(
    voucherForm: VoucherForm,
  ): Promise<void> {
    try {
      const rmEmail = voucherForm.createdBy?.email;
      if (!rmEmail) {
        logger.warn(
          `Cancellation revoked email not sent. RM email missing for voucher ID: ${voucherForm.id}`,
        );
        return;
      }
      const rshEmails = JSON.parse(
        this.configService.get<string>('RSH_NOTIFICATION_EMAIL') || '[]',
      );

      const recipients = [rmEmail, ...rshEmails].filter(Boolean);
      const rmName = voucherForm.createdBy?.name || 'RM';

      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.CRM_CANCELLATION_REVOKED,
          {
            RM_NAME: rmName,
            PRID: voucherForm.uniqueReferenceId,
          },
          BRAND_PURAVANKARA,
          {
            to: recipients,
          },
        ),
      );

      logger.info(
        `Cancellation revoked email sent to RM (${rmEmail}) for voucher ID: ${voucherForm.id}`,
      );
    } catch (error) {
      logger.error(
        `Error sending cancellation revoked email for voucher ID: ${voucherForm?.id}`,
        error,
      );
    }
  }

  /**
   * Sends cancellation approval email notification to the Relationship Manager (RM).
   *
   * This method composes and emits a CANCELLATION_APPROVED email event
   * including customer details, RM name, Admin (RSH) name, requested date,
   * approved date (current date), and payment status.
   *
   * Dates are formatted in DD/MM/YY format using 'en-GB' locale.
   *
   * @param voucherForm - Voucher form entity containing cancellation and applicant details
   * @param user - Admin (RSH) user who approved the cancellation
   * @returns Promise<void>
   */
  private async sendCancellationApprovedEmail(
    voucherForm: VoucherForm,
    user: Users,
  ): Promise<void> {
    try {
      const rmEmail = voucherForm.createdBy?.email;
      if (!rmEmail) {
        logger.warn(
          `Cancellation revoked email not sent. RM email missing for voucher ID: ${voucherForm.id}`,
        );
        return;
      }

      //Customer Name
      const customerName =
        `${voucherForm.applicant1?.personalDetails?.firstName || ''} ${voucherForm.applicant1?.personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      //RM Name (Requested By)
      const rmName = voucherForm.createdBy?.name?.trim() || 'RM';

      //ADMIN Name - RSH
      const rshName = user?.name || 'Admin';

      const paymentStatus = voucherForm?.paymentStatus || 'Pending';

      const approvedDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });

      const requestedDate = voucherForm?.cancelledAt
        ? new Date(voucherForm.cancelledAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          })
        : '';

      const crmEmails = JSON.parse(
        this.configService.get<string>('CRM_NOTIFICATION_EMAIL') || '[]',
      );
      const recipients = [rmEmail, ...crmEmails].filter(Boolean);

      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.CANCELLATION_APPROVED,
          {
            CUSTOMER_NAME: customerName,
            PRID: voucherForm.uniqueReferenceId,
            RSH_NAME: rshName, //admin name
            RM_NAME: rmName,
            REQUESTED_DATE: requestedDate,
            APPROVED_DATE: approvedDate, //current date
            PAYMENT_STATUS: paymentStatus,
          },
          BRAND_PURAVANKARA,
          {
            to: recipients,
          }, // RM + CRM
        ),
      );

      logger.info(
        `Cancellation approved email sent to Team for voucher ID: ${voucherForm.id}`,
      );
    } catch (error) {
      logger.error(
        `Error sending cancellation approved email for voucher ID: ${voucherForm?.id}`,
        error,
      );
    }
  }

  /**
   * Sends an email notification to RSH when RM initiates a cancellation request.
   * This email contains voucher details, customer information, cancellation reason,
   * and a link to view the record in the sales portal.
   */
  private async sendCancellationRequestedByRMEmail(
    voucherForm: VoucherForm,
    reason: string,
  ): Promise<void> {
    try {
      const rshEmails = JSON.parse(
        this.configService.get<string>('RSH_NOTIFICATION_EMAIL') || '[]',
      );

      if (!rshEmails.length) {
        logger.warn(
          `Cancellation request email not sent. RSH email missing for voucher ID: ${voucherForm.id}`,
        );
        return;
      }

      const rmName = voucherForm.createdBy?.name || 'RM';
      //Customer Name
      const customerName =
        `${voucherForm.applicant1?.personalDetails?.firstName || ''} ${voucherForm.applicant1?.personalDetails?.lastName || ''}`.trim() ||
        'Customer';

      const requestedDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });

      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.RM_CANCELLATION_REQUESTED,
          {
            RSH_NAME: 'RSH',
            PRID: voucherForm.uniqueReferenceId,
            CUSTOMER_NAME: customerName,
            REQUEST_DATE: requestedDate,
            CANCELLATION_REASON: reason || 'Not Provided',
            PAYMENT_STATUS: voucherForm.paymentStatus,
            RM_NAME: rmName,
            CANCELLATION_LINK: `${this.configService.get<string>('SALES_PORTAL_URL')}/admin/eoi-records`,
          },
          BRAND_PURAVANKARA,
          {
            to: rshEmails,
          },
        ),
      );

      logger.info(
        `Cancellation request email sent to RSH (${rshEmails}) for voucher ID: ${voucherForm.id}`,
      );
    } catch (error) {
      logger.error(
        `Error sending cancellation request email for voucher ID: ${voucherForm?.id}`,
        error,
      );
    }
  }

  private async sendCancellationRevokedRMEmail(
    voucherForm: VoucherForm,
  ): Promise<void> {
    try {
      const rmEmail = voucherForm.createdBy?.email;

      if (!rmEmail) {
        logger.warn(
          `Cancellation revoked email not sent. RM email missing for voucher ID: ${voucherForm.id}`,
        );
        return;
      }

      const rmName = voucherForm.createdBy?.name || 'RM';

      this.eventEmitter.emit(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.CRM_CANCELLATION_REVOKED, // Using the same template for Admin as well.
          {
            RM_NAME: rmName,
            PRID: voucherForm.uniqueReferenceId,
          },
          BRAND_PURAVANKARA,
          {
            to: rmEmail,
          },
        ),
      );

      logger.info(
        `Cancellation revoked email sent to RM (${rmEmail}) for voucher ID: ${voucherForm.id}`,
      );
    } catch (error) {
      logger.error(
        `Error sending cancellation revoked email to RM for voucher ID: ${voucherForm?.id}`,
        error,
      );
    }
  }

  /**
   * Retrieves inventory type options available for a campaign.
   * Formats as name-value pairs for dropdown UI components.
   *
   * @param campaignId - Campaign ID to fetch inventory types for
   * @returns Promise<any> Response with formatted inventory type list
   * @throws NotFoundException when campaign not found
   */
  async campaignInventoryDropdown(campaignId: number) {
    try {
      const campaign = await this.eoiCampaignRepository.findOne({
        where: {
          id: campaignId,
        },
        relations: ['inventoryTypes'],
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      // Format inventory types to the required format
      const inventoryTypes = (campaign.inventoryTypes || []).map((type) => ({
        name: type?.name,
        value: type?.name,
      }));

      return {
        statusCode: SUCCESS,
        message: 'Inventory types retrieved successfully',
        data: inventoryTypes,
      };
    } catch (error) {
      logger.error('campaignInventoryDropdown failed:', error);
      logsAndErrorHandling(
        'eoiManagementService - campaignInventoryDropdown',
        error,
        {
          campaignId,
        },
      );
    }
  }

  /**
   * Refreshes voucher OTP cache token with current timestamp.
   * Resets verification expiry for form submission.
   *
   * @param unqueId - Unique voucher tracking ID
   * @returns Promise<void> - Cache entry updated
   */
  async refreshCacheToken(unqueId: string) {
    const otpRedisKey = `voucher_otp:${unqueId.toLowerCase()}`;
    await this.cacheService.set(otpRedisKey, { lastVerifiedAt: new Date() });
  }

  /**
   * Aggregates voucher counts grouped by primary source categories.
   * Consolidates detailed sources into high-level categories (Direct, Loyalty, etc.)
   *
   * @param campaignId - Campaign to filter by
   * @returns Promise<Map> Source names mapped to voucher counts
   */
  private async buildSourceMap(
    campaignId: number,
  ): Promise<Map<string, number>> {
    const activeStatuses = this.getActiveCampaignStatuses();
    const sourceMap = new Map<string, number>();

    const sourceData = await this.voucherFormRepository
      .createQueryBuilder('voucher')
      .innerJoin('voucher.campaign', 'campaign')
      .select('voucher.primarySource', 'primarySource')
      .addSelect('COUNT(voucher.id)', 'count')
      .where('campaign.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('campaign.id = :campaignId', { campaignId })
      .andWhere('voucher.isDeleted = false')
      .andWhere(
        `(voucher.voucherFormStatus NOT IN (:...excludedStatuses)
        OR (voucher.voucherFormStatus = :inProgressStatus
            AND voucher.paymentStatus IN (:...paidStatuses)))`,
        {
          excludedStatuses: [
            VoucherFormStatusEnum.CREATED,
            VoucherFormStatusEnum.IN_PROGRESS,
          ],
          inProgressStatus: VoucherFormStatusEnum.IN_PROGRESS,
          paidStatuses: [
            VoucherPaymentStatus.PAID,
            VoucherPaymentStatus.PARTIALLY_PAID,
          ],
        },
      )
      .groupBy('voucher.primarySource')
      .getRawMany();

    const directSources = new Set([
      PrimarySourceEnum.DIRECT_WALKIN,
      PrimarySourceEnum.SITE_BRANDING,
      PrimarySourceEnum.WORD_OF_MOUTH,
      PrimarySourceEnum.EVENTS,
      PrimarySourceEnum.NEWS_PAPER,
      PrimarySourceEnum.HOARDINGS,
      PrimarySourceEnum.PRINT_MEDIA,
      PrimarySourceEnum.CORPORATE_ACTIVITY,
      PrimarySourceEnum.RADIO,
    ]);
    const loyaltySources = new Set([
      PrimarySourceEnum.PURVA_PRIVILEGE,
      PrimarySourceEnum.PROVIDENT_PREMIER,
      PrimarySourceEnum.REFERRAL_AT_EOI,
    ]);
    sourceData.forEach((row: any) => {
      let sourceName = row.primarySource || '';
      if (directSources.has(sourceName)) sourceName = 'Direct';
      if (loyaltySources.has(sourceName)) sourceName = 'Loyalty';

      if (sourceName) {
        sourceMap.set(
          sourceName,
          (sourceMap.get(sourceName) || 0) + Number(row.count),
        );
      }
    });

    return sourceMap;
  }

  /**
   * Aggregates voucher counts grouped by unit configuration/BHK type.
   * Fetches from inventory-wise split data.
   *
   * @param campaignId - Campaign to filter by
   * @returns Promise<Map> BHK/config types mapped to voucher counts
   */
  private async buildBhkMap(campaignId: number): Promise<Map<string, number>> {
    const bhkMap = new Map<string, number>();
    const inventoryData = await this.getInventoryWiseSplit({ campaignId });
    inventoryData?.data?.rows.forEach((row: any) => {
      const unitType = row.typology || 'Unknown';
      const count = Number(row.unitCount) || 0;
      if (count > 0) {
        bhkMap.set(unitType, count);
      }
    });
    return bhkMap;
  }

  /**
   * Sorts BHK entries by extracted numeric value in ascending order.
   * Handles entries like '2BHK', '3BHK+Study', etc.
   *
   * @param entries - Array of [name, count] tuples
   * @returns Sorted array by numeric BHK value
   */
  private sortBhkEntries(
    entries: Array<[string, number]>,
  ): Array<[string, number]> {
    return entries.sort((a, b) => {
      const aNum = Number.parseInt(a[0].replaceAll(/\D/g, ''), 10) || 0;
      const bNum = Number.parseInt(b[0].replaceAll(/\D/g, ''), 10) || 0;
      return aNum - bNum;
    });
  }

  /**
   * Counts EOIs with collected/verified payments for a campaign.
   * Uses same criteria as vouchersCollected metric.
   *
   * @param campaignId - Campaign to filter by
   * @returns Promise<number> Count of collected EOIs
   */
  private async getEoisCollectedCountForCampaign(
    campaignId: number,
  ): Promise<number> {
    const activeStatuses = this.getActiveCampaignStatuses();

    const result = await this.voucherFormRepository
      .createQueryBuilder('voucher')
      .innerJoin('voucher.campaign', 'campaign')
      .select(
        `COUNT(DISTINCT CASE
          WHEN voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}')
            OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
          THEN voucher.id
          ELSE NULL
        END)`,
        'eoisCollected',
      )
      .where('campaign.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('campaign.id = :campaignId', { campaignId })
      .andWhere('voucher.isDeleted = false')
      .getRawOne<{ eoisCollected: string }>();

    return result ? Number(result.eoisCollected) : 0;
  }

  /**
   * Aggregates EOI lifecycle and department workflow metrics.
   * Counts VIDs assigned, active EOIs, and pending items per department.
   *
   * @param campaigns - Campaign data from dashboard stored procedure
   * @param campaignId - Campaign to filter by
   * @returns Promise<Object> EOI status and department pending counts
   */
  private async fetchEoiStatusAndDeptPendingData(
    campaigns: any[],
    campaignId: number,
  ): Promise<{
    vidsAssignedCount: number;
    activeEoisCount: number;
    departmentPendingCounts: {
      rmPending: number;
      misPending: number;
      crmPending: number;
      finPending: number;
    };
  }> {
    const activeStatuses = this.getActiveCampaignStatuses();

    // Optimize: Combine two queries into one with conditional aggregation
    const baseQuery = this.voucherFormRepository
      .createQueryBuilder('voucher')
      .innerJoin('voucher.campaign', 'campaign')
      .select(
        `COUNT(DISTINCT CASE WHEN voucher.paid_voucher_id IS NOT NULL AND voucher.finance_status != :rejectedStatus THEN voucher.id ELSE NULL END)`,
        'vidsAssignedCount',
      )
      .addSelect(
        `COUNT(DISTINCT CASE WHEN voucher.voucher_status = :activeStatus THEN voucher.id ELSE NULL END)`,
        'activeEoisCount',
      )
      .where('campaign.status IN (:...statuses)', {
        statuses: activeStatuses,
      })
      .andWhere('voucher.isDeleted = false')
      .setParameter('activeStatus', VoucherFormStatusEnum.ACTIVE)
      .setParameter('rejectedStatus', PaymentTxStatusEnum.REJECTED)
      .andWhere('campaign.id = :campaignId', { campaignId });

    const result = await baseQuery.getRawOne<{
      vidsAssignedCount: string;
      activeEoisCount: string;
    }>();

    const vidsAssignedCount = result ? Number(result.vidsAssignedCount) : 0;
    const activeEoisCount = result ? Number(result.activeEoisCount) : 0;

    // Filter campaigns by campaignId
    const filteredCampaigns = campaigns.filter(
      (c) => c.campaignId === campaignId,
    );

    const departmentPendingCounts = {
      rmPending: filteredCampaigns.reduce(
        (sum, c) => sum + (c.pendingRMCount || 0),
        0,
      ),
      misPending: filteredCampaigns.reduce(
        (sum, c) => sum + (c.pendingMISCount || 0),
        0,
      ),
      crmPending: filteredCampaigns.reduce(
        (sum, c) => sum + (c.pendingCRMCount || 0),
        0,
      ),
      finPending: filteredCampaigns.reduce(
        (sum, c) => sum + (c.pendingFINCount || 0),
        0,
      ),
    };

    return {
      vidsAssignedCount,
      activeEoisCount,
      departmentPendingCounts,
    };
  }

  /**
   * Generates HTML table rows for source and BHK splits dashboard report.
   * Combines data into paired columns with percentage calculations.
   *
   * @param sourceMap - Map of source names to counts
   * @param bhkMap - Map of BHK types to counts
   * @param totalVouchers - Total vouchers for percentage calculation
   * @returns string HTML table rows markup
   */
  private buildSourceAndBhkRowsHtml(
    sourceMap: Map<string, number>,
    bhkMap: Map<string, number>,
    totalVouchers: number,
  ): string {
    const sourceEntries = Array.from(sourceMap.entries()).filter(
      ([, count]) => count > 0,
    );
    const bhkEntries = this.sortBhkEntries(
      Array.from(bhkMap.entries()).filter(([, count]) => count > 0),
    );

    let html = '';
    // Use the actual maximum of the two arrays, without forcing a minimum of 4
    const maxRows = Math.max(sourceEntries.length, bhkEntries.length);

    // Only generate rows if there's at least one entry
    if (maxRows <= 0) return html;
    for (let i = 0; i < maxRows; i++) {
      const sourceEntry = sourceEntries[i];
      const sourceName = sourceEntry?.[0] ?? '';
      const sourceCount = sourceEntry?.[1] ?? 0;
      const sourcePercentage = totalVouchers
        ? Math.round((sourceCount / totalVouchers) * 100)
        : 0;
      const unitPlural = sourceCount === 1 ? '' : 's';
      const sourceText = sourceEntry
        ? `${sourceCount} Unit${unitPlural} | ${sourcePercentage}%`
        : '';

      const bhkEntry = bhkEntries[i];
      const bhkName = bhkEntry?.[0] ?? '';
      const bhkCount = bhkEntry?.[1] ?? '';

      // Only add row if at least one side has data
      if (sourceEntry || bhkEntry) {
        html += `  <tr>
    <td>${sourceName}</td>
    <td>${sourceText}</td>
    <td colspan="2">${bhkName}</td>
    <td>${bhkCount}</td>
  </tr>
`;
      }
    }

    return html;
  }

  /**
   * Generates HTML table rows for daily tracker metrics report.
   * Shows 7-day activity breakdown by day.
   *
   * @param dailyTrackerData - Array of daily metric records
   * @returns string HTML table rows markup
   */
  private buildDailyTrackerRowsHtml(
    dailyTrackerData: {
      date: string;
      eoiLinkShared: number;
      formSubmitted: number;
      vouchersActivated: number;
      newCpLink: number;
    }[],
  ): string {
    let html = '';
    // Show previous 7 days (excluding current date)
    dailyTrackerData.sort((a, b) => b.date.localeCompare(a.date));
    dailyTrackerData.forEach((dayData) => {
      const dateStr = format(dayData?.date, 'dd-MM-yyyy');
      html += `  <tr>
          <td>${dateStr}</td>
          <td>${dayData.eoiLinkShared || 0}</td>
          <td>${dayData.formSubmitted || 0}</td>
          <td>${dayData.vouchersActivated || 0}</td>
          <td>${dayData.newCpLink || 0}</td>
        </tr>
      `;
    });
    return html;
  }

  /**
   * Generates and sends daily dashboard reports for all active campaigns.
   * Fetches metrics, builds HTML with charts and tables, sends via email.
   * Processes campaigns in parallel for performance.
   *
   * @param recipientEmail - Optional email list (uses config default if not provided)
   * @returns Promise<any> Response with processing status and counts
   * @throws InternalServerErrorException if batch processing fails
   */
  async sendDailyDashboardReport(recipientEmail?: string[]): Promise<any> {
    try {
      const recipients =
        JSON.parse(this.configService.get<string>('REPORT_RECIPIENTS')) ?? [];
      if (!recipientEmail?.length && recipients?.length)
        recipientEmail = recipients;
      if (!recipientEmail?.length) {
        return {
          statusCode: SUCCESS,
          message: 'No recipients provided',
        };
      }

      // Step 1: Fetch active campaigns
      const activeStatuses = this.getActiveCampaignStatuses();
      const activeCampaigns = await this.eoiCampaignRepository
        .createQueryBuilder('campaign')
        .select(['campaign.id', 'campaign.campaignName'])
        .where('campaign.status IN (:...statuses)', {
          statuses: activeStatuses,
        })
        .getMany();

      if (!activeCampaigns || activeCampaigns.length === 0) {
        logger.warn('No active campaigns found for daily report');
        return {
          statusCode: SUCCESS,
          message: 'No active campaigns found',
          data: {
            campaignsProcessed: 0,
            reportDate: format(new Date(), 'dd-MM-yyyy'),
          },
        };
      }

      logger.info(
        `Found ${activeCampaigns.length} active campaigns. Processing reports...`,
      );

      // Step 2: Process each campaign asynchronously using Promise.all
      const emailPromises = activeCampaigns.map(async (campaign) => {
        try {
          return await this.processCampaignReport(campaign, recipientEmail);
        } catch (error) {
          // Log error but don't fail the entire process
          logger.error(
            `Error processing report for campaign ${campaign.id} (${campaign.campaignName}):`,
            error,
          );
          return {
            campaignId: campaign.id,
            campaignName: campaign.campaignName,
            success: false,
            error: error.message,
          };
        }
      });

      // Step 3: Wait for all emails to be sent (non-blocking, fire-and-forget)
      const results = await Promise.allSettled(emailPromises);

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      logger.info(
        `Daily dashboard reports processed: ${successful} successful, ${failed} failed`,
      );

      return {
        statusCode: SUCCESS,
        message: 'Daily dashboard report emails processed',
        data: {
          totalCampaigns: activeCampaigns.length,
          successful,
          failed,
          reportDate: format(new Date(), 'dd-MM-yyyy'),
        },
      };
    } catch (error) {
      logger.error('Error sending daily dashboard report:', error);
      throw new InternalServerErrorException(
        'Failed to send daily dashboard report',
      );
    }
  }

  /**
   * Processes single campaign report generation with all metrics and sends email.
   * Aggregates data from multiple queries and builds HTML report.
   *
   * @param campaign - Campaign entity to report on
   * @param recipientEmail - Email recipient(s)
   * @returns Promise<Object> Processing result with success/error status
   */
  private async processCampaignReport(
    campaign: { id: number; campaignName: string },
    recipientEmail: string[],
  ): Promise<any> {
    const campaignId = campaign.id;

    // Fetch all data for this campaign in parallel
    const [dashboardResult, sourceMap, bhkMap] = await Promise.all([
      this.getDashboardData(
        {
          view: 'default',
          isExcel: true,
          campaign: String(campaignId),
          isReport: true,
        },
        null,
      ),
      this.buildSourceMap(campaignId),
      this.buildBhkMap(campaignId),
    ]);

    const dashboardData = dashboardResult?.data;
    if (!dashboardData?.cards?.vouchersCollected) {
      logger.warn(
        `No dashboard data available for campaign ${campaignId} (${campaign.campaignName})`,
      );
      return {
        campaignId,
        campaignName: campaign.campaignName,
        success: false,
        error: 'No dashboard data available',
      };
    }

    const cards = dashboardData.cards || {};
    const campaigns = dashboardData.campaigns || [];

    // Get pendingReconciliation from campaigns array (from SP)
    // Since we filter by campaignId, campaigns array should contain only one item
    const pendingReconciliationCount = campaigns[0]?.pendingReconciliation || 0;

    // Fetch remaining data in parallel, including EOIs collected count for this campaign
    const [eoiStatusData, dailyTrackerData, eoisCollectedCount] =
      await Promise.all([
        this.fetchEoiStatusAndDeptPendingData(campaigns, campaignId),
        this.getDailyTracker({ campaignId }),
        this.getEoisCollectedCountForCampaign(campaignId),
      ]);

    // Build HTML rows
    const sourceAndBhkRowsHtml = this.buildSourceAndBhkRowsHtml(
      sourceMap,
      bhkMap,
      cards.vouchersCollected || 0,
    );

    const dailyTrackerRowsHtml = this.buildDailyTrackerRowsHtml(
      dailyTrackerData?.data?.result,
    );
    const puravankaraBaseUrl =
      this.configService.get<string>('SALES_PORTAL_URL');
    const eoiDashboardURL = `${puravankaraBaseUrl}/admin/eoi-dashboard`;

    // Prepare email variables
    const emailVariables: Record<string, string> = {
      CAMPAIGN_NAME: campaign.campaignName,
      VOUCHERS_COLLECTED: String(cards.vouchersCollected || 0),
      VOUCHERS_SHARED: String(cards.vouchersCreated || 0),
      VOUCHERS_IN_PROGRESS: String(cards.vouchersInProgress || 0),
      VALUE_OF_EOIS: convertNumberToShortForm(cards.totalAmountPayable || 0),
      EOI_AMOUNT_COLLECTED: convertNumberToShortForm(
        cards.amountCollected || 0,
      ),
      CANCELLATIONS_REFUNDS: String(cards.unitsRefunded || 0),
      SOURCE_AND_BHK_ROWS: sourceAndBhkRowsHtml,
      EOIS_COLLECTED: String(eoisCollectedCount),
      VIDS_ASSIGNED: String(eoiStatusData.vidsAssignedCount),
      ACTIVE_EOIS: String(eoiStatusData.activeEoisCount),
      PENDING_RECONCILIATION: String(pendingReconciliationCount),
      RM_PENDING: String(eoiStatusData.departmentPendingCounts.rmPending),
      MIS_PENDING: String(eoiStatusData.departmentPendingCounts.misPending),
      CRM_PENDING: String(eoiStatusData.departmentPendingCounts.crmPending),
      FINANCE_PENDING: String(eoiStatusData.departmentPendingCounts.finPending),
      DAILY_TRACKER_ROWS: dailyTrackerRowsHtml,
      VOUCHER_LINK: eoiDashboardURL,
    };

    // Send email (non-blocking, fire-and-forget)
    this.eventEmitter.emit(
      EventMessagesEnum.COMPOSE_EMAIL,
      new ComposeEmailEvent(
        ComposeEmailsEnum.RM_DASHBOARD_DAILY_REPORT,
        emailVariables,
        BRAND_PURAVANKARA,
        { to: recipientEmail },
      ),
    );

    logger.info(
      `Daily dashboard report email queued for campaign ${campaignId} (${campaign.campaignName}) to ${recipientEmail}`,
    );

    return {
      campaignId,
      campaignName: campaign.campaignName,
      success: true,
    };
  }

  /**
   * Exports complete RM dashboard data to Excel workbook without pagination.
   * Uploads to S3 and returns download link.
   *
   * @param userId - Current user for role-based filtering
   * @param filterDto - Dashboard filter options
   * @returns Promise<any> Response with S3 file path
   * @throws InternalServerErrorException if export fails
   */
  async exportRmDashboard(
    userId: any,
    filterDto: RmDashboardFilterDto,
  ): Promise<any> {
    try {
      // drop page and limit to avoid pagination
      const exportFilter: RmDashboardFilterDto = { ...filterDto };
      delete (exportFilter as any).page;
      delete (exportFilter as any).limit;
      exportFilter.isExcel = true;

      // Get complete dashboard data for export
      const dashboardResult = await this.getDashboardData(exportFilter, userId);
      const dashboardResponse = dashboardResult?.data;

      const campaigns = dashboardResponse?.campaigns ?? [];

      if (!campaigns.length) {
        return {
          message: 'No RM dashboard data found to export',
          data: [],
        };
      }

      const workbook = new ExcelJS.Workbook();

      // Decide which view to export: default or source-wise.
      const viewMode: 'default' | 'source' =
        (exportFilter as any).view === 'source' ? 'source' : 'default';
      buildRmDashboardExcelSheet(workbook, {
        campaigns,
        viewMode,
      });

      const buffer = await workbook.xlsx.writeBuffer();

      const timeStamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const s3Key = `exports/eoi-management/rm-dashboard/rm-dashboard-${timeStamp}.xlsx`;

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(s3Key, stream, true);

      return {
        message: 'RM dashboard exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('RM dashboard export failed:', error);
      logsAndErrorHandling('eoiManagementService - exportRmDashboard', error, {
        userId,
        filterDto,
      });
    }
  }

  /**
   * Aggregates voucher counts by unit configuration/typology for pie chart display.
   * Applies same vouchersCollected filters and optional date range.
   *
   * @param dto - DTO with campaignId and optional date range
   * @returns Promise<any> Response with labels array and series array for charts
   */
  async getInventoryWiseSplit(dto: InventoryWiseSplitQueryDto) {
    try {
      const { campaignId, startDate, endDate } = dto;
      const cancellationStatuses = this.getCancellationStatuses();
      const cancellationStatusesStr = cancellationStatuses
        .map((s) => `'${s}'`)
        .join(', ');

      const qb = this.voucherFormRepository
        .createQueryBuilder('v')
        // Use typology column extract from JSON
        .select(
          `JSON_UNQUOTE(JSON_EXTRACT(v.eoi_details, '$.typology'))`,
          'typology',
        )
        .addSelect('COUNT(*)', 'unitCount')
        .where('v.eoi_details IS NOT NULL AND v.campaign_id = :campaignId', {
          campaignId,
        })
        .andWhere('v.isDeleted = false')
        // Apply same filter as vouchersCollected: exclude CREATED, IN_PROGRESS, and cancellation statuses
        // BUT include IN_PROGRESS if payment status is PAID or PARTIALLY_PAID
        .andWhere(
          `(v.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}',${cancellationStatusesStr})
            OR (v.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                AND v.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
                OR (v.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND v.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}'))`,
        );

      if (startDate) {
        qb.andWhere('v.created_at >= :startDate', { startDate });
      }
      if (endDate) {
        qb.andWhere('v.created_at <= :endDate', { endDate });
      }

      qb.groupBy('typology');
      qb.orderBy('unitCount', 'DESC');

      const rows = await qb.getRawMany<{
        typology: string;
        unitCount: string;
      }>();

      // Normalize and produce arrays for pie chart
      const labels: string[] = [];
      const series: number[] = [];

      for (const r of rows) {
        const typ = (r.typology ?? 'Unknown').trim();
        labels.push(typ || 'Unknown');
        series.push(Number(r.unitCount) || 0);
      }

      return {
        statusCode: SUCCESS,
        message: 'Inventory wise split fetched successfully',
        data: {
          labels,
          series,
          startDate,
          endDate,
          rows,
        },
      };
    } catch (error) {
      logger.error('getInventoryWiseSplit failed:', error);
      logsAndErrorHandling(
        'eoiManagementService - getInventoryWiseSplit',
        error,
        {
          dto,
        },
      );
    }
  }

  /**
   * Generates array of date strings in YYYY-MM-DD format between two dates.
   * Used for filling in daily tracker data with zero counts for missing days.
   *
   * @param start - Start date
   * @param end - End date (inclusive)
   * @returns Array of date strings in descending order
   */
  private buildDateArray(start: Date, end: Date): string[] {
    const res: string[] = [];
    const cur = new Date(start);
    const last = new Date(end);

    while (cur <= last) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      res.push(`${yyyy}-${mm}-${dd}`);
      cur.setDate(cur.getDate() + 1);
    }
    return res;
  }

  /**
   * Retrieves daily activity metrics for specified date range.
   * Returns per-day counts for form sharing, submissions, activations, and CP additions.
   * Defaults to last 7 days if date range not specified.
   *
   * @param dto - DTO with campaignId and optional date bounds
   * @returns Promise<any> Response with daily activity array
   */
  async getDailyTracker(dto: DailyTrackerQueryDto) {
    try {
      const { campaignId } = dto;
      let { startDate, endDate } = dto;

      if (!startDate) {
        startDate = fromZonedTime(startOfDay(subDays(new Date(), 7)), 'UTC');
      }

      if (!endDate) {
        endDate = fromZonedTime(endOfDay(subDays(new Date(), 1)), 'UTC');
      }

      // Format dates as strings for proper MySQL DATE() comparison
      // This ensures consistent date comparison across all queries
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // A. created_at counts
      const createdRows = await this.voucherFormRepository
        .createQueryBuilder('v')
        .select("DATE_FORMAT(v.created_at, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'cnt')
        .where('v.campaign_id = :campaignId', { campaignId })
        .andWhere('v.is_deleted = false')
        .andWhere('v.created_at IS NOT NULL')
        .andWhere('DATE(v.created_at) BETWEEN :startDateStr AND :endDateStr', {
          startDateStr,
          endDateStr,
        })
        .groupBy('date')
        .getRawMany<{ date: string; cnt: string }>();

      // B. submitted_at counts
      const submittedRows = await this.voucherFormRepository
        .createQueryBuilder('v')
        .select("DATE_FORMAT(v.submitted_at, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'cnt')
        .where('v.campaign_id = :campaignId', { campaignId })
        .andWhere('v.is_deleted = false')
        .andWhere('v.submitted_at IS NOT NULL')
        .andWhere(
          'DATE(v.submitted_at) BETWEEN :startDateStr AND :endDateStr',
          {
            startDateStr,
            endDateStr,
          },
        )
        .groupBy('date')
        .getRawMany<{ date: string; cnt: string }>();

      // C. activatedRows counts
      const activatedRows = await this.voucherFormRepository
        .createQueryBuilder('v')
        .select("DATE_FORMAT(v.activated_at,'%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'cnt')
        .where('v.campaign_id = :campaignId', { campaignId })
        .andWhere('v.is_deleted = false')
        .andWhere('v.activated_at IS NOT NULL')
        .andWhere(
          'DATE(v.activated_at) BETWEEN :startDateStr AND :endDateStr',
          { startDateStr, endDateStr },
        )
        .groupBy('date')
        .getRawMany<{ date: string; cnt: string }>();

      // 2) channel_partners aggregated query
      const cpRows = await this.channelPartnerRepository
        .createQueryBuilder('cp')
        .select("DATE_FORMAT(cp.created_at, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'cnt')
        .where('cp.campaign_id = :campaignId', { campaignId })
        .andWhere('cp.created_at IS NOT NULL')
        .andWhere('DATE(cp.created_at) BETWEEN :startDateStr AND :endDateStr', {
          startDateStr,
          endDateStr,
        })
        .groupBy('date')
        .getRawMany<{ date: string; cnt: string }>();

      // 3) build full date array and map counts
      const dateArr = this.buildDateArray(startDate, endDate);

      // convert arrays to maps for quick lookup
      const createdMap = new Map(
        createdRows.map((r) => [r.date.substring(0, 10), Number(r.cnt)]),
      );
      const submittedMap = new Map(
        submittedRows.map((r) => [r.date, Number(r.cnt)]),
      );
      const activatedMap = new Map(
        activatedRows.map((r) => [r.date, Number(r.cnt)]),
      );
      const cpMap = new Map(cpRows.map((r) => [r.date, Number(r.cnt)]));

      const result = dateArr.map((d) => ({
        date: d,
        eoiLinkShared: createdMap.get(d) ?? 0,
        formSubmitted: submittedMap.get(d) ?? 0,
        vouchersActivated: activatedMap.get(d) ?? 0,
        newCpLink: cpMap.get(d) ?? 0,
      }));

      return {
        statusCode: SUCCESS,
        message: 'Daily tracker data fetched successfully',
        data: {
          result,
          startDate: dateArr[0],
          endDate: dateArr.at(-1),
        },
      };
    } catch (error) {
      logger.error('getDailyTracker failed:', error);
      logsAndErrorHandling('eoiManagementService - getDailyTracker', error, {
        dto,
      });
    }
  }

  /**
   * Validates SFDC lead campaign matches selected campaign name.
   * Ensures data consistency across systems.
   *
   * @param campaignName - Selected campaign name
   * @param projectInterested - Campaign from SFDC lead
   * @throws BadRequestException when campaigns don't match
   */
  private validateCampaignMatch(
    campaignName: string | undefined,
    sfdcProjectName: string | undefined,
    projectInterested: string | undefined,
  ): void {
    if (
      campaignName?.toLowerCase() !== projectInterested?.toLowerCase() &&
      sfdcProjectName?.toLowerCase() !== projectInterested?.toLowerCase()
    ) {
      throw new BadRequestException(
        `Fetched Lead belongs to campaign '${projectInterested}', but '${campaignName}' was selected. Please verify enquiry id and campaign name.`,
      );
    }
  }

  /**
   * Fetches SFDC lead data by enquiry reference number.
   * Maps SFDC lead details to voucher creation DTO format.
   * Validates campaign name match.
   *
   * @param query - DTO with enquiry ref number and campaign name
   * @returns Promise<any> Response with extracted lead data
   * @throws BadRequestException when campaign doesn't match or lead not found
   */
  async getVoucherByEnquiryId(query: GetVoucherByEnquiryIdDto): Promise<any> {
    try {
      const { enqRefNo, campaignName, sfdcProjectName, isChangeRequest } =
        query;
      const sfdcData = await this.sfdcService.postToSiteVisit({ enqRefNo });
      // Extract required fields from SFDC response
      const leadData = sfdcData?.data?.[0];
      if (!leadData) {
        throw new NotFoundException(
          'No lead data found for the given enquiry reference number',
        );
      }

      if (!isChangeRequest) {
        this.validateCampaignMatch(
          campaignName,
          sfdcProjectName,
          leadData.projectInterested,
        );
      }

      let leadStatus = safeString(leadData?.leadStatus, null);
      if (leadData?.siteVisitHappend) {
        leadStatus = SfdcLeadStatusEnum.SITE_VISIT_HAPPENED;
      } else if (leadData?.videocalldone) {
        leadStatus = SfdcLeadStatusEnum.VIDEO_CALL_DONE;
      }
      const extractedData = {
        firstName: safeString(leadData.firstname, null),
        lastName: safeString(leadData.lastname, null),
        contactNumber: safeString(leadData.mobile, null),
        countryCode: leadData.countryCode || null,
        emailId: safeString(leadData.email, null),
        primarySource: safeString(leadData.primarySource, null),
        sfdcLeadStatus: leadStatus,
        channelpartnerId: leadData.channelpartnerId || null,
        channelpartnername: safeString(leadData.channelpartnername, null),
        residentStatus: safeString(leadData.rstatus, null),
      };

      return {
        statusCode: SUCCESS,
        message: 'Voucher data fetched successfully',
        data: extractedData,
      };
    } catch (error) {
      logger.error('getVoucherByEnquiryId failed:', error);
      if (error instanceof NotFoundException) {
        throw new BadRequestException(
          'Lead not found with the provided SFDC enquiry ID. Please verify the enquiry ID.',
        );
      }
      logsAndErrorHandling(
        'eoiManagementService - getVoucherByEnquiryId',
        error,
        {
          query,
        },
      );
    }
  }

  async getVoucherByPrid(query: GetVoucherByPridDto): Promise<any> {
    try {
      const { prid, campaignId } = query;
      const voucher = await this.voucherFormRepository.findOne({
        where: {
          uniqueReferenceId: prid,
          campaign: { id: campaignId },
          isDeleted: false,
        },
        relations: ['channelPartner'],
      });

      if (!voucher) {
        throw new NotFoundException(
          `Voucher not found for this PRID and Campaign`,
        );
      }

      const applicant1 = voucher.applicant1 as any;
      const personalDetails = applicant1?.personalDetails;

      const extractedData = {
        firstName: personalDetails?.firstName || null,
        lastName: personalDetails?.lastName || null,
        contactNumber: personalDetails?.contactNumber || null,
        countryCode: personalDetails?.countryCode || null,
        emailId: personalDetails?.emailAddress || null,
        primarySource: voucher.primarySource || null,
        channelpartnerId: voucher.channelPartner?.id || null,
        channelpartnername: voucher.channelPartner
          ? this.getChannelPartnerName(voucher.channelPartner)
          : null,
        secondarySource: voucher.secondarySource || null,
        sourceDetails: voucher.sourceDetails || null,
        amountPaid: voucher?.paymentDetails?.totalAmountPaid ?? 0,
      };

      return {
        statusCode: SUCCESS,
        message: 'Voucher data fetched successfully',
        data: extractedData,
      };
    } catch (error) {
      logger.error('getVoucherByPrid failed:', error);
      logsAndErrorHandling('eoiManagementService - getVoucherByPrid', error, {
        query,
      });
    }
  }

  /**
   * Retrieves list of projects from static JSON file, optionally filtered by search.
   * Used for primary source project selection dropdowns.
   *
   * @param search - Optional project name search filter
   * @returns Promise<any> Response with filtered project list
   */
  async getPrimarySourceProjects(search?: string): Promise<any> {
    try {
      const filePath = path.join(process.cwd(), 'assets', 'eoi-projects.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const projectData = JSON.parse(fileContent);

      let projects = (projectData.projects || []).map((project: any) => ({
        id: project.id,
        name: project['Project Name'],
      }));

      // Filter by project name if search term is provided
      if (search?.trim()) {
        const searchTerm = search.trim().toLowerCase();
        projects = projects.filter((project) =>
          project.name.toLowerCase().includes(searchTerm),
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'Project list fetched successfully',
        data: projects,
      };
    } catch (error) {
      logger.error('getPrimarySourceProjects failed:', error);
      logsAndErrorHandling(
        'eoiManagementService - getPrimarySourceProjects',
        error,
        {},
      );
    }
  }

  /**
   * Retrieves EOI leaderboard data for RMs or Channel Partners.
   * Executes stored procedure with filters and returns ranked results.
   * Includes cards with aggregated metrics.
   *
   * @param dto - Filter DTO with view type, sorting, date range, and entity filters
   * @returns Promise<any> Response with leaderboard entries and cards
   * @throws BadRequestException for invalid date ranges
   */
  async getEoiLeaderboard(dto: EoiLeaderboardFilterDto): Promise<any> {
    try {
      const { view, page = DEFAULT_PAGE, limit = 10, startDate, endDate } = dto;

      // Validate date range if provided
      this.validateDateRange(startDate, endDate);

      // Build SP payload
      const spPayload = this.buildEoiLeaderboardSpPayload(dto, page, limit);

      // Call stored procedure
      const result = await this.voucherFormRepository.query(
        `CALL eoi_leaderboard_listing(?);`,
        [JSON.stringify(spPayload)],
      );

      const spResponse = result?.[0]?.[0]?.resp;
      const leaderboardData = spResponse?.data || [];
      const total = spResponse?.total || 0;
      const pageCount = spResponse?.pageCount || 0;

      // Format results to match existing structure (round numbers, format dates)
      const formattedResults =
        view === EoiLeaderboardView.CHANNEL_PARTNER
          ? this.formatChannelPartnerLeaderboardResults(leaderboardData)
          : this.formatRelationshipManagerLeaderboardResults(leaderboardData);

      // Get cards data (with campaign and date range filters)
      let cardsData;
      if (view === EoiLeaderboardView.CHANNEL_PARTNER) {
        cardsData = await this.getChannelPartnerCards(dto);
      } else {
        // For RM view, fetch top 10 RMs separately (sorted by noOfVouchers) for cards calculation
        const top10SpPayload = this.buildEoiLeaderboardSpPayload(
          { ...dto, sortBy: EoiLeaderboardSortBy.NO_OF_VOUCHERS },
          1,
          10,
        );
        const top10Result = await this.voucherFormRepository.query(
          `CALL eoi_leaderboard_listing(?);`,
          [JSON.stringify(top10SpPayload)],
        );
        const top10SpResponse = top10Result?.[0]?.[0]?.resp;
        const top10LeaderboardData = top10SpResponse?.data || [];
        const top10FormattedResults =
          this.formatRelationshipManagerLeaderboardResults(
            top10LeaderboardData,
          );
        cardsData = await this.getRelationshipManagerCards(
          top10FormattedResults,
          dto,
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'EOI leaderboard fetched successfully',
        data: {
          result: formattedResults,
          cards: cardsData,
          page: spResponse?.page || page,
          total,
          pageSize: spResponse?.limit || limit,
          pageCount,
        },
      };
    } catch (error) {
      logger.error('getEoiLeaderboard failed:', error);
      logsAndErrorHandling('eoiManagementService - getEoiLeaderboard', error, {
        dto,
      });
    }
  }

  /**
   * Aggregates CP-specific leaderboard metrics (EOIs, amounts, CP count).
   * Uses single optimized query with conditional aggregation.
   *
   * @param dto - Filter DTO with campaign and date range
   * @returns Promise<Object> CP cards with metrics and percentages
   */
  private async getChannelPartnerCards(
    dto: EoiLeaderboardFilterDto,
  ): Promise<any> {
    const cancellationStatuses = this.getCancellationStatuses();
    const cancellationStatusesStr = cancellationStatuses
      .map((s) => `'${s}'`)
      .join(', ');
    const activeStatuses = [
      CampaignStatusEnum.ACTIVE_VOUCHER,
      CampaignStatusEnum.ACTIVE_EOI,
      CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI,
    ];

    // Execute voucher metrics and CP count queries in parallel
    const voucherMetricsQb = this.voucherFormRepository
      .createQueryBuilder('voucher')
      .leftJoin('voucher.channelPartner', 'cp')
      .leftJoin('voucher.campaign', 'campaign')
      .select(
        `COUNT(DISTINCT CASE
            WHEN voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
              OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                  AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
              OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}')
            THEN voucher.id
            ELSE NULL
          END)`,
        'totalEOIs',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
            WHEN voucher.cpLinkId IS NOT NULL
              AND (voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
                OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                    AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
                OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}'))
            THEN voucher.id
            ELSE NULL
          END)`,
        'cpEois',
      )
      .addSelect(
        `SUM(CASE
            WHEN voucher.cpLinkId IS NOT NULL
              AND (voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
                OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                    AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
                OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}'))
            THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(voucher.paymentDetails, '$.totalAmountPaid')) AS DECIMAL(15,2))
            ELSE 0
          END)`,
        'cpEoiCollected',
      )
      .addSelect(
        `SUM(CASE
            WHEN voucher.cpLinkId IS NOT NULL
              AND (voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
                OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                    AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
                OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}'))
            THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(voucher.paymentDetails, '$.amountPayable')) AS DECIMAL(15,2))
            ELSE 0
          END)`,
        'cpEoiValues',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN voucher.cpLinkId IS NOT NULL
            AND (
              voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
              OR (
                voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}')
              )
              OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}')
            )
          THEN cp.id
          ELSE NULL
        END)`,
        'activeCps',
      )
      .where('voucher.isDeleted = false');

    // Build onboardedCps query from channel_partners table
    // Query channel partners directly, filtered by campaign status or campaign ID
    const onboardedCpsQb = this.channelPartnerRepository
      .createQueryBuilder('cp')
      .leftJoin('cp.campaign', 'campaign')
      .select('COUNT(DISTINCT cp.id)', 'onboardedCps');

    // Apply campaign filter: if campaignId is provided, filter by it; otherwise apply active status filter
    if (dto.campaignId && dto.campaignId.length > 0) {
      voucherMetricsQb.andWhere('campaign.id IN (:...campaignIds)', {
        campaignIds: dto.campaignId,
      });
      onboardedCpsQb.andWhere('cp.campaignId IN (:...campaignIds)', {
        campaignIds: dto.campaignId,
      });
    } else {
      voucherMetricsQb.andWhere('campaign.status IN (:...activeStatuses)', {
        activeStatuses,
      });
      onboardedCpsQb.andWhere('campaign.status IN (:...activeStatuses)', {
        activeStatuses,
      });
    }

    // Apply date range filter
    if (dto.startDate && dto.endDate) {
      const startDateStr =
        typeof dto.startDate === 'string'
          ? dto.startDate
          : format(dto.startDate as Date, 'yyyy-MM-dd');
      const endDateStr =
        typeof dto.endDate === 'string'
          ? dto.endDate
          : format(dto.endDate as Date, 'yyyy-MM-dd');
      voucherMetricsQb.andWhere(
        'DATE(voucher.created_at) >= :startDate AND DATE(voucher.created_at) <= :endDate',
        {
          startDate: startDateStr,
          endDate: endDateStr,
        },
      );
      onboardedCpsQb.andWhere(
        'DATE(cp.created_at) >= :startDate AND DATE(cp.created_at) <= :endDate',
        {
          startDate: startDateStr,
          endDate: endDateStr,
        },
      );
    }

    const [voucherMetrics, onboardedCpsResult] = await Promise.all([
      voucherMetricsQb.getRawOne<{
        totalEOIs: string;
        cpEois: string;
        cpEoiCollected: string;
        cpEoiValues: string;
        activeCps: string;
      }>(),
      // Separate query for total CP count with same filters
      onboardedCpsQb.getRawOne<{ onboardedCps: string }>(),
    ]);

    const totalEOIs = Number(voucherMetrics?.totalEOIs || 0);
    const cpEois = Number(voucherMetrics?.cpEois || 0);
    const cpPercentage =
      totalEOIs > 0 ? Number(((cpEois / totalEOIs) * 100).toFixed(2)) : 0;

    return {
      totalEOIs,
      cpEois,
      cpEoiCollected: Number(
        Number(voucherMetrics?.cpEoiCollected || 0).toFixed(2),
      ),
      cpEoiValues: Number(Number(voucherMetrics?.cpEoiValues || 0).toFixed(2)),
      onboardedCps: Number(onboardedCpsResult?.onboardedCps || 0),
      activeCps: Number(voucherMetrics?.activeCps || 0),
      cpPercentage,
    };
  }

  /**
   * Aggregates RM-specific leaderboard metrics from top 10 RMs.
   * Calculates aggregate metrics and contribution percentages.
   *
   * @param topRmResults - Pre-fetched top RM leaderboard data
   * @param dto - Filter DTO with campaign and date range
   * @returns Promise<Object> RM cards with aggregated metrics
   */
  private async getRelationshipManagerCards(
    topRmResults: any[],
    dto: EoiLeaderboardFilterDto,
  ): Promise<any> {
    // Single query for all voucher-related metrics using conditional aggregation
    const cancellationStatusesStr = this.getCancellationStatusesStr();
    const activeStatuses = [
      CampaignStatusEnum.ACTIVE_VOUCHER,
      CampaignStatusEnum.ACTIVE_EOI,
      CampaignStatusEnum.ACTIVE_VOUCHER_AND_EOI,
    ];
    const metricsQb = this.voucherFormRepository
      .createQueryBuilder('voucher')
      .leftJoin('voucher.createdBy', 'rm')
      .leftJoin('voucher.campaign', 'campaign')
      .leftJoin('rm.group', 'userGroup')
      .select(
        `COUNT(DISTINCT CASE
          WHEN voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
            OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
            OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}')
          THEN voucher.id
          ELSE NULL
        END)`,
        'totalEOIs',
      )
      .addSelect(
        `SUM(CASE
          WHEN voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
            OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
            OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}')
          THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(voucher.paymentDetails, '$.amountPayable')) AS DECIMAL(15,2))
          ELSE 0
        END)`,
        'eoiValue',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN voucher.voucherFormStatus NOT IN ('${VoucherFormStatusEnum.CREATED}', '${VoucherFormStatusEnum.IN_PROGRESS}', ${cancellationStatusesStr})
            OR (voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
                AND voucher.paymentStatus IN ('${VoucherPaymentStatus.PAID}', '${VoucherPaymentStatus.PARTIALLY_PAID}'))
            OR (voucher.finance_status = '${PaymentTxStatusEnum.REJECTED}' AND voucher.payment_status = '${VoucherPaymentStatus.PARTIALLY_PAID}')
          THEN voucher.id
          ELSE NULL
        END)`,
        'eoisCollected',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN voucher.voucherFormStatus = '${VoucherFormStatusEnum.IN_PROGRESS}'
          THEN voucher.id
          ELSE NULL
        END)`,
        'formFillInProgress',
      )
      .addSelect(
        `COUNT(DISTINCT CASE
          WHEN voucher.voucherFormStatus = '${VoucherFormStatusEnum.CREATED}'
          THEN voucher.id
          ELSE NULL
        END)`,
        'formLinksShared',
      )
      .where('voucher.isDeleted = false');

    // Apply campaign filter: if campaignId is provided, filter by it; otherwise apply active status filter
    if (dto.campaignId && dto.campaignId.length > 0) {
      metricsQb.andWhere('campaign.id IN (:...campaignIds)', {
        campaignIds: dto.campaignId,
      });
    } else {
      metricsQb.andWhere('campaign.status IN (:...activeStatuses)', {
        activeStatuses,
      });
    }

    // Apply date range filter
    if (dto.startDate && dto.endDate) {
      const startDateStr =
        typeof dto.startDate === 'string'
          ? dto.startDate
          : format(dto.startDate as Date, 'yyyy-MM-dd');
      const endDateStr =
        typeof dto.endDate === 'string'
          ? dto.endDate
          : format(dto.endDate as Date, 'yyyy-MM-dd');
      metricsQb.andWhere(
        'DATE(voucher.created_at) >= :startDate AND DATE(voucher.created_at) <= :endDate',
        {
          startDate: startDateStr,
          endDate: endDateStr,
        },
      );
    }

    const metrics = await metricsQb.getRawOne<{
      totalEOIs: string;
      eoiValue: string;
      eoisCollected: string;
      formFillInProgress: string;
      formLinksShared: string;
    }>();

    // Calculate top 10 RM metrics from already fetched results (no additional query)
    const topRmEoisCollected = topRmResults.reduce(
      (sum, row) => sum + Number(row.noOfVouchers || 0),
      0,
    );
    const topRmValues = topRmResults.reduce(
      (sum, row) => sum + Number(row.voucherValue || 0),
      0,
    );
    const totalEOIs = Number(metrics?.totalEOIs || 0);
    const topRmContributions =
      totalEOIs > 0
        ? Number(((topRmEoisCollected / totalEOIs) * 100).toFixed(2))
        : 0;

    return {
      totalEOIs,
      eoiValue: Math.round(Number(metrics?.eoiValue || 0)),
      eoisCollected: topRmEoisCollected,
      topRmValues: Math.round(topRmValues),
      topRmContributions,
      formFillInProgress: Number(metrics?.formFillInProgress || 0),
      formLinksShared: Number(metrics?.formLinksShared || 0),
    };
  }

  /**
   * Converts cancellation status enums to comma-separated SQL-quoted string.
   * Used in raw SQL queries for status filtering.
   *
   * @returns string SQL-formatted cancellation status list
   */
  private getCancellationStatusesStr(): string {
    const cancellationStatuses = this.getCancellationStatuses();
    return cancellationStatuses.map((s) => `'${s}'`).join(', ');
  }

  /**
   * Constructs payload for eoi_leaderboard_listing stored procedure.
   * Maps DTO fields to SP parameter names and includes optional filters.
   *
   * @param dto - Filter DTO with view, sort, date, and entity filters
   * @param page - Page number for pagination
   * @param limit - Records per page
   * @returns Object SP payload with all parameters
   */
  private buildEoiLeaderboardSpPayload(
    dto: EoiLeaderboardFilterDto,
    page: number = 1,
    limit: number = 10,
  ): any {
    const {
      view,
      sortBy = EoiLeaderboardSortBy.NO_OF_VOUCHERS,
      startDate,
      endDate,
      campaignId,
      channelPartnerId,
      rmId,
      userGroupId,
    } = dto;

    const spPayload: any = {
      view,
      page,
      limit,
      sortBy,
    };

    if (startDate) spPayload.startDate = startDate;
    if (endDate) spPayload.endDate = endDate;
    if (campaignId && Array.isArray(campaignId) && campaignId.length > 0) {
      spPayload.campaignId = campaignId;
    }
    if (
      channelPartnerId &&
      Array.isArray(channelPartnerId) &&
      channelPartnerId.length > 0
    ) {
      spPayload.channelPartnerId = channelPartnerId;
    }
    if (rmId && Array.isArray(rmId) && rmId.length > 0) {
      spPayload.rmId = rmId;
    }
    if (userGroupId && Array.isArray(userGroupId) && userGroupId.length > 0) {
      spPayload.userGroupId = userGroupId;
    }

    return spPayload;
  }

  /**
   * Export EOI leaderboard data to Excel
   * Fetches all data without pagination and exports to Excel format
   * @param dto - Filter DTO containing view type and filters
   * @returns Success response with S3 file path
   */
  async exportEoiLeaderboard(dto: EoiLeaderboardFilterDto): Promise<any> {
    try {
      const { view, startDate, endDate } = dto;

      // Validate date range if provided
      this.validateDateRange(startDate, endDate);

      // Build SP payload with large limit for export (fetch all data)
      const spPayload = this.buildEoiLeaderboardSpPayload(dto, 1, 100000);

      // Call stored procedure
      const result = await this.voucherFormRepository.query(
        `CALL eoi_leaderboard_listing(?);`,
        [JSON.stringify(spPayload)],
      );

      const spResponse = result?.[0]?.[0]?.resp;
      const leaderboardDataRaw = spResponse?.data || [];

      // Format results
      const leaderboardData =
        view === EoiLeaderboardView.CHANNEL_PARTNER
          ? this.formatChannelPartnerLeaderboardResults(leaderboardDataRaw)
          : this.formatRelationshipManagerLeaderboardResults(
              leaderboardDataRaw,
            );

      if (!leaderboardData.length) {
        return {
          message: 'No leaderboard data found to export',
          data: [],
        };
      }

      // Create Workbook
      const workbook = new ExcelJS.Workbook();
      buildEoiLeaderboardExcelSheet(workbook, {
        viewType: view,
        channelPartnerData:
          view === EoiLeaderboardView.CHANNEL_PARTNER
            ? leaderboardData
            : undefined,
        relationshipManagerData:
          view === EoiLeaderboardView.RELATIONSHIP_MANAGER
            ? leaderboardData
            : undefined,
      });

      // Generate Buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Upload to S3
      const timeStamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const viewName =
        view === EoiLeaderboardView.CHANNEL_PARTNER ? 'cp' : 'rm';
      const s3Key = `exports/eoi-management/leaderboard/eoi-leaderboard-${viewName}-${timeStamp}.xlsx`;
      const stream = new PassThrough();
      stream.end(buffer);
      await this.awsService.uploadToS3(s3Key, stream, true);

      return {
        message: 'EOI leaderboard exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('EOI leaderboard export failed:', error);
      logsAndErrorHandling(
        'eoiManagementService - exportEoiLeaderboard',
        error,
        { dto },
      );
    }
  }

  /**
   * Formats raw SP results into CP leaderboard DTOs with proper type conversions.
   * Rounds numbers and parses dates for display.
   *
   * @param results - Raw results from SP
   * @returns Array of formatted CP leaderboard entries
   */
  private formatChannelPartnerLeaderboardResults(results: any[]): any[] {
    return results.map((row: any) => ({
      cpId: row.cpId,
      cpName: row.cpName,
      channelPartnerType: row.channelPartnerType || null,
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      noOfVouchers: Math.round(Number(row.noOfVouchers) || 0),
      voucherValue: Math.round(Number(row.voucherValue || 0)),
      amountCollected: Math.round(Number(row.amountCollected || 0)),
      cancellations: Math.round(Number(row.cancellations) || 0),
      createdByName: row.createdByName || null,
      createdById: row.createdById || null,
      lastCollectedDate: row.lastCollectedDate
        ? new Date(row.lastCollectedDate)
        : null,
    }));
  }

  /**
   * Formats raw SP results into RM leaderboard DTOs with proper type conversions.
   * Rounds numbers and parses dates for display.
   *
   * @param results - Raw results from SP
   * @returns Array of formatted RM leaderboard entries
   */
  private formatRelationshipManagerLeaderboardResults(results: any[]): any[] {
    return results.map((row: any) => ({
      rmId: row.rmId,
      rmName: row.rmName,
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      noOfVouchers: Math.round(Number(row.noOfVouchers) || 0),
      voucherValue: Math.round(Number(row.voucherValue || 0)),
      amountCollected: Math.round(Number(row.amountCollected || 0)),
      formFillingInProgress: Math.round(Number(row.formFillingInProgress) || 0),
      formLinksShared: Math.round(Number(row.formLinksShared) || 0),
      cancellations: Math.round(Number(row.cancellations) || 0),
      converted: Math.round(Number(row.converted) || 0),
      userGroup: row.userGroup || null,
      lastCollectedDate: row.lastCollectedDate
        ? new Date(row.lastCollectedDate)
        : null,
    }));
  }

  /**
   * Download EOI form PDF by voucher ID
   * @param voucherId - ID of the voucher
   * @returns PDF file stream or buffer
   */
  async downloadEoiFormPDF(voucherId: string): Promise<any> {
    try {
      return await this.voucherFormsService.downloadVoucherFormPDF(
        voucherId,
        false,
        true,
        true,
      );
    } catch (error) {
      logger.error('downloadEoiFormPDF failed:', error);
      logsAndErrorHandling('eoiManagementService - downloadEoiFormPDF', error, {
        voucherId,
      });
    }
  }

  /**
   * Push vouchers to Salesforce CRM system
   * Optimized for large data volumes with batching
   * @param user - Current logged-in user
   * @param campaignId - Campaign ID to push vouchers for
   * @param pushConverted - Whether to push only converted leads
   * @returns Job status with tracking information
   */
  async pushVouchersToSfdc(
    user: any,
    dto: { campaignId: number; voucherId?: number; pushConverted?: boolean },
  ): Promise<any> {
    const { campaignId, voucherId, pushConverted } = dto;

    const jobStartTime = Date.now();
    const jobBatchId = `SFDC-LEADS-${pushConverted ? 'CONVERT' : 'CREATE'}-${Date.now()}`;

    logger.info(`[${jobBatchId}] SFDC Lead Push Job started`, {
      userId: user?.dbId,
      userName: user?.name,
      campaignId,
      voucherId,
      pushConverted,
      mode: pushConverted ? 'Convert Leads' : 'Create Leads',
    });

    try {
      // Step 1: Validate campaign
      const campaign = await this.eoiCampaignRepository.findOne({
        where: { id: campaignId },
        select: ['id', 'campaignName', 'sfdcProjectName', 'pushToSfdc'],
      });

      if (!campaign) {
        const error = `Campaign ID ${campaignId} not found`;
        logger.error(`[${jobBatchId}] ${error}`);
        throw new BadRequestException(error);
      }

      if (!campaign.pushToSfdc || !campaign.sfdcProjectName) {
        const error = `SFDC push not enabled for campaign ${campaign.campaignName}`;
        logger.error(`[${jobBatchId}] ${error}`);
        throw new BadRequestException(error);
      }

      logger.info(
        `[${jobBatchId}] Campaign validated: ${campaign.campaignName}`,
      );

      // Step 2: Fetch vouchers (moved to helper)
      const finalVouchers = await this.getEligibleVouchersForSfdc(
        campaignId,
        voucherId,
        pushConverted,
        jobBatchId,
      );

      logger.info(
        `[${jobBatchId}] Query results: ${finalVouchers.length} vouchers found`,
        {
          totalVouchers: finalVouchers.length,
          campaignId,
        },
      );

      if (!finalVouchers.length) {
        let message = `No vouchers found to push for campaign ${campaign.campaignName}`;
        if (voucherId) {
          message = `Voucher is not eligible for SFDC push in campaign ${campaign.campaignName}`;
        }
        logger.warn(`[${jobBatchId}] [${voucherId}]: ${message}`);
        throw new BadRequestException(message);
      }

      // Step 3: Split into batches
      const batches = chunkArray(finalVouchers, SFDC_BATCH_SIZE);

      logger.info(
        `[${jobBatchId}] Created ${batches.length} batches of size ${SFDC_BATCH_SIZE}`,
        {
          totalBatches: batches.length,
          batchSize: SFDC_BATCH_SIZE,
        },
      );
      // Step 4: Process batches
      const batchResults = await this.processBatches(
        batches,
        campaign,
        jobBatchId,
      );

      // Step 5: Final response + notification
      const totalDuration = Date.now() - jobStartTime;
      const successMessage = this.buildSuccessMessage({
        batchResults,
        batchesLength: batches.length,
        finalVouchers,
        voucherId,
        pushConverted,
        campaignName: campaign.campaignName,
      });

      logger.info(`[${jobBatchId}] Job completed`, {
        totalDuration: `${totalDuration}ms`,
        successful: batchResults.successful,
        failed: batchResults.failed,
        totalBatches: batches.length,
        totalRecords: finalVouchers.length,
      });

      this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
        notifications: [
          {
            userIds: [user?.dbId],
            title: 'SFDC Lead Push Completed',
            message: successMessage,
            type: 'Leads Push Status',
          },
        ],
      });

      return {
        statusCode: SUCCESS,
        message: successMessage,
        data: {
          id: campaignId,
          jobBatchId,
          campaignId,
          campaignName: campaign.campaignName,
        },
      };
    } catch (error) {
      const totalDuration = Date.now() - jobStartTime;

      logger.error(`[${jobBatchId}] Job failed with error`, {
        error: error.message,
        stack: error.stack,
        durationMs: totalDuration,
        campaignId,
        userId: user?.dbId,
      });

      this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
        notifications: [
          {
            userIds: [user?.dbId],
            title: 'SFDC Lead Push Failed',
            message: `Lead push job failed: ${error.message}`,
            type: 'Error',
          },
        ],
      });

      return logsAndErrorHandling(
        'eoiManagementService - pushVouchersToSfdc',
        error,
        {
          campaignId,
          pushConverted,
          jobBatchId,
        },
      );
    }
  }

  private buildSuccessMessage({
    batchResults,
    batchesLength,
    finalVouchers,
    voucherId,
    pushConverted,
    campaignName,
  }: {
    batchResults: { successful: number };
    batchesLength: number;
    finalVouchers: any[];
    voucherId?: string | number;
    pushConverted: boolean;
    campaignName: string;
  }): string {
    const isSuccess = batchResults.successful > 0;
    const action = pushConverted ? 'convert' : 'create';

    // Case 1: Voucher-specific flow
    if (voucherId) {
      if (isSuccess) {
        return `Successfully ${action}ed lead for voucher ID ${finalVouchers[0]?.uniqueReferenceId}`;
      }
      return `Failed to ${action} lead for voucher ID ${voucherId}`;
    }

    // Case 2: Campaign flow (no voucherId)
    if (!isSuccess) {
      return `Failed to ${action} leads for campaign ${campaignName}`;
    }

    // Default case
    return `Successfully processed ${batchResults.successful}/${batchesLength} batches with ${finalVouchers.length} vouchers`;
  }

  private async processBatches(batches, campaign, jobBatchId) {
    const batchResults = {
      successful: 0,
      failed: 0,
      failedBatches: [],
    };

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchId = `${jobBatchId}-B${i + 1}`;
      const batchStartTime = Date.now();

      try {
        logger.info(
          `[${batchId}] Processing batch ${i + 1}/${batches.length}`,
          {
            recordCount: batch.length,
          },
        );

        const records = batch.map((v) => {
          try {
            return this.mapVoucherToSfdcPayload(campaign, v);
          } catch (err) {
            logger.error(`[${batchId}] Failed to map voucher ${v.id}`, {
              voucherId: v.id,
              error: err.message,
            });
            throw err;
          }
        });

        await this.processBatch(
          records,
          batchId,
          i + 1,
          batches.length,
          jobBatchId,
        );

        const batchDuration = Date.now() - batchStartTime;

        logger.info(`[${batchId}] Batch processed successfully`, {
          durationMs: batchDuration,
          recordsProcessed: batch.length,
        });

        batchResults.successful++;

        if (i < batches.length - 1) {
          await sleep(SFDC_BATCH_DELAY_MS);
        }
      } catch (batchError) {
        const batchDuration = Date.now() - batchStartTime;

        logger.error(`[${batchId}] Batch processing failed`, {
          error: batchError.message,
          durationMs: batchDuration,
          batch: batch.map((v) => v.id),
        });

        batchResults.failed++;
        batchResults.failedBatches.push({
          batchId,
          recordCount: batch.length,
          error: batchError.message,
        });
      }
    }
    return batchResults;
  }

  private async getEligibleVouchersForSfdc(
    campaignId: number,
    voucherId?: number,
    pushConverted?: boolean,
    jobBatchId?: string,
  ): Promise<any[]> {
    const qb = this.voucherFormRepository
      .createQueryBuilder('voucher')
      .leftJoin('voucher.closingRm', 'closingRm')
      .leftJoin('voucher.createdBy', 'createdBy')
      .where('voucher.campaign = :campaignId', { campaignId })
      .andWhere('voucher.paymentStatus IN (:...paymentStatus)', {
        paymentStatus: [
          VoucherPaymentStatus.PAID,
          VoucherPaymentStatus.PARTIALLY_PAID,
        ],
      })
      .andWhere('voucher.closingRm IS NOT NULL')
      .andWhere('voucher.createdBy IS NOT NULL');

    if (voucherId) {
      logger.info(
        `[${jobBatchId}] Filtering for specific voucher ID: ${voucherId}`,
      );
      qb.andWhere('voucher.id = :voucherId', { voucherId });
    }

    if (pushConverted) {
      logger.info(`[${jobBatchId}] Filter mode: CONVERTED leads only`);
      qb.andWhere('voucher.isLeadCreated = true').andWhere(
        'voucher.opportunityId IS NULL',
      );
    } else {
      logger.info(`[${jobBatchId}] Filter mode: New leads`);
      qb.andWhere('voucher.isLeadCreated = false').andWhere(
        'voucher.sfdcPushAttempted = false',
      );
    }

    logger.info(`[${jobBatchId}] Executing database query...`);

    const { entities, raw } = await qb
      .select([
        'voucher',
        'closingRm.id',
        'closingRm.userId',
        'createdBy.id',
        'createdBy.userId',
      ])
      .addSelect((subQb) => {
        return subQb
          .select('COUNT(*)')
          .from('vouchers', 'v2')
          .where('v2.userVoucherTrackingId = voucher.userVoucherTrackingId')
          .andWhere('v2.paymentStatus IN (:...subPaymentStatus)', {
            subPaymentStatus: [
              VoucherPaymentStatus.PAID,
              VoucherPaymentStatus.PARTIALLY_PAID,
            ],
          })
          .andWhere('v2.campaign_id = voucher.campaign_id');
      }, 'numberOfVouchers')
      .orderBy('voucher.id', 'ASC')
      .getRawAndEntities();

    if (entities.length !== raw.length) {
      logger.warn(
        `[${jobBatchId}] Entity-raw mismatch: ${entities.length} vs ${raw.length}`,
      );
    }

    return entities.map((v, i) => ({
      ...v,
      numberOfVouchers: Number(raw[i]?.numberOfVouchers || 1),
    }));
  }

  /**
   * Process a single batch of SFDC lead records with retry logic
   * @param batch - Array of lead records to push
   * @param batchId - Unique batch identifier
   * @param batchNo - Current batch number
   * @param totalBatches - Total number of batches
   * @param jobBatchId - Parent job batch ID for correlation
   * @throws Error if all retries are exhausted
   */
  private async processBatch(
    batch: SfdcLeadPayload[],
    batchId: string,
    batchNo: number,
    totalBatches: number,
    jobBatchId: string,
  ): Promise<void> {
    logger.info(`[${batchId}] Starting batch processing`, {
      batchNo,
      totalBatches,
      recordCount: batch.length,
      jobBatchId,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= SFDC_MAX_RETRIES; attempt++) {
      const attemptStartTime = Date.now();

      try {
        logger.info(`[${batchId}] Attempt ${attempt}/${SFDC_MAX_RETRIES}`, {
          recordCount: batch.length,
        });

        const results = await this.sfdcService.pushEOILeads(batchId, batch);
        const attemptDuration = Date.now() - attemptStartTime;
        logger.info(
          `[${batchId}] SFDC API call succeeded on attempt ${attempt}`,
          {
            durationMs: attemptDuration,
            responseCount: results?.length || 0,
          },
        );

        // Persist results - wrap in try-catch to prevent partial updates
        try {
          await this.persistBatchResults(
            batch,
            results,
            batchId,
            attempt,
            jobBatchId,
          );
          logger.info(`[${batchId}] Batch results persisted successfully`, {
            recordsPersisted: batch.length,
            attempt,
          });
        } catch (persistError) {
          logger.error(`[${batchId}] Failed to persist batch results`, {
            error: persistError.message,
            attempt,
            recordCount: batch.length,
          });
          throw persistError;
        }

        return; // Success - exit function
      } catch (err) {
        lastError = err;
        const attemptDuration = Date.now() - attemptStartTime;

        logger.warn(`[${batchId}] Attempt ${attempt} failed`, {
          error: err.message,
          durationMs: attemptDuration,
          attempt,
          maxRetries: SFDC_MAX_RETRIES,
          willRetry: attempt < SFDC_MAX_RETRIES,
        });

        // If this was the last attempt, log the final failure
        if (attempt === SFDC_MAX_RETRIES) {
          logger.error(`[${batchId}] All retries exhausted - batch FAILED`, {
            maxAttemppts: SFDC_MAX_RETRIES,
            finalError: err.message,
            recordsAffected: batch.length,
            recordIds: batch.map((r) => r.paymentRefId),
          });

          // Record failed batch for recovery/monitoring
          // await this.recordFailedBatch(batchId, batch, err, jobBatchId);
          throw new Error(
            `Batch ${batchId} failed after ${SFDC_MAX_RETRIES} attempts: ${err.message}`,
          );
        }

        // Wait before retry (exponential backoff)
        const waitTime = 1000 * attempt;
        logger.info(
          `[${batchId}] Waiting ${waitTime}ms before retry ${attempt + 1}...`,
        );
        await sleep(waitTime);
      }
    }

    // Fallback (should not reach here)
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Map voucher form to SFDC lead payload with enhanced validation
   * @param campaign - Campaign entity
   * @param voucher - Voucher form entity
   * @returns Formatted SFDC lead payload
   */
  private mapVoucherToSfdcPayload(
    campaign: EoiCampaign,
    voucher: VoucherForm,
  ): SfdcLeadPayload {
    try {
      // Validate required fields exist
      if (!voucher.applicant1?.personalDetails) {
        logger.warn(
          `Voucher ${voucher.id} missing applicant1.personalDetails`,
          {
            voucherId: voucher.id,
          },
        );
      }

      // Safely extract date of birth with fallback
      const dob = voucher?.applicant1?.personalDetails?.dob;
      const dobFormatted = dob ? dob.slice(0, 10) : null;
      const paidVoucherId =
        voucher?.paidVoucherId ??
        voucher?.preEoiId ??
        voucher?.stdEoiId ??
        null;
      return {
        firstName: safeString(voucher?.applicant1?.personalDetails?.firstName),
        lastName: safeString(voucher?.applicant1?.personalDetails?.lastName),
        email: safeString(voucher?.applicant1?.personalDetails?.emailAddress),
        mobile: safeString(voucher?.applicant1?.personalDetails?.contactNumber),
        countryCode: safeString(
          voucher?.applicant1?.personalDetails?.countryCode,
        ),
        dateOfBirth: dobFormatted,
        residentialStatus: safeString(
          voucher?.applicant1?.personalDetails?.residentStatus,
        ),
        gender: safeString(voucher?.applicant1?.personalDetails?.gender),
        maritalStatus: safeString(
          voucher?.applicant1?.personalDetails?.maritalStatus,
        ),
        callSummary: '',
        address: safeString(
          voucher?.applicant1?.contactDetails?.permanentAddress?.fullAddress,
        ),
        primarySource: safeString(voucher?.primarySource),
        projectInterested: safeString(campaign?.sfdcProjectName),
        primaryApartmentType: safeString(voucher?.eoiDetails?.typology),
        leadStatus: safeString(voucher?.sfdcLeadStatus, 'Site Visit Booked'),
        occupation: safeString(
          voucher?.applicant1?.professionalDetails?.occupation,
        ),
        designation: safeString(
          voucher?.applicant1?.professionalDetails?.designationIfOthers ||
            voucher?.applicant1?.professionalDetails?.designation,
        ),
        company:
          safeString(voucher?.applicant1?.professionalDetails?.companyName) ||
          'null',
        industry: safeString(
          voucher?.applicant1?.professionalDetails?.industryIfOthers ||
            voucher?.applicant1?.professionalDetails?.industry,
        ),
        siteVisitHappened:
          voucher?.sfdcLeadStatus !== SfdcLeadStatusEnum.VIDEO_CALL_DONE,
        annualRevenue: safeString(
          voucher?.applicant1?.professionalDetails?.annualIncome,
        ),
        campaignName: safeString(campaign?.campaignName),
        activityName: safeString(voucher?.sourceDetails?.activityName),
        paymentRefId: safeString(voucher?.uniqueReferenceId),
        voucherId: safeString(paidVoucherId),
        isConverted: Boolean(voucher?.isLeadCreated || voucher?.sfdcEnquiryId),
        numberOfVouchers: 1,
        videoCallDone:
          voucher?.sfdcLeadStatus === SfdcLeadStatusEnum.VIDEO_CALL_DONE,
        closingRM: safeString(voucher?.closingRm?.userId),
        sourcingRM: safeString(voucher?.createdBy?.userId),
      };
    } catch (err) {
      logger.error(`Error mapping voucher ${voucher?.id} to SFDC payload`, {
        voucherId: voucher?.id,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Persist SFDC API results to database in a transaction
   *
   * @param batch - Original batch of SFDC payloads
   * @param results - Results from SFDC API
   * @param batchId - Batch identifier
   * @param attemptNo - Attempt number
   * @param jobBatchId - Parent job ID
   */
  private async persistBatchResults(
    batch: SfdcLeadPayload[],
    results: SfdcLeadResult[],
    batchId: string,
    attemptNo: number,
    jobBatchId: string,
  ): Promise<void> {
    logger.info(`[${batchId}] Persisting batch results`, {
      recordCount: batch.length,
      resultCount: results?.length || 0,
      attempt: attemptNo,
    });

    const resultMap = new Map(
      (results || []).map((r, i) => [r.uniqueReferenceId ?? i, r]),
    );

    const persistStartTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
      await this.voucherFormRepository.manager.transaction(async (manager) => {
        let recordIndex = 0;
        for (const voucher of batch) {
          const paymentRefId = voucher?.paymentRefId;
          const res = resultMap.get(paymentRefId) || results[recordIndex];
          recordIndex++;

          try {
            if (!res?.success) {
              errorCount++;
              logger.warn(
                `[${batchId}] Record push failed for ${paymentRefId}`,
                {
                  paymentRefId,
                  response: res,
                  attempt: attemptNo,
                },
              );

              // Update voucher with SFDC details
              await manager.update(
                VoucherForm,
                { uniqueReferenceId: paymentRefId },
                {
                  sfdcPushAttempted: true,
                  sfdcSyncedAt: new Date(),
                },
              );

              // Log failed record
              await manager.insert(SfdcLogs, {
                entityType: 'Voucher',
                opportunityId: paymentRefId,
                batchId,
                logEvent: EventMessagesEnum.EOI_LEAD_PUSH,
                payload: voucher as any,
                response: (res || {}) as any,
                status: 'error',
                attemptNo,
              });
              continue;
            }

            // Update voucher with SFDC details
            await manager.update(
              VoucherForm,
              { uniqueReferenceId: paymentRefId },
              {
                isLeadCreated: true,
                opportunityId: res?.opportunityId ?? null,
                sfdcEnquiryId: res?.enquiryId ?? null,
                sfdcSyncedAt: new Date(),
              },
            );

            // Log successful record
            await manager.insert(SfdcLogs, {
              entityType: 'Voucher',
              opportunityId: paymentRefId,
              batchId,
              logEvent: EventMessagesEnum.EOI_LEAD_PUSH,
              payload: voucher as any,
              response: res as any,
              status: 'success',
              attemptNo,
            });

            successCount++;
          } catch (recordError) {
            errorCount++;
            logger.error(
              `[${batchId}] Error processing record ${paymentRefId}`,
              {
                paymentRefId,
                error: recordError.message,
                attempt: attemptNo,
              },
            );

            // Try to log the error even if record update failed
            try {
              await manager.insert(SfdcLogs, {
                entityType: 'Voucher',
                opportunityId: paymentRefId,
                batchId,
                logEvent: EventMessagesEnum.EOI_LEAD_PUSH,
                payload: voucher as any,
                response: { error: recordError.message } as any,
                status: 'error',
                attemptNo,
              });
            } catch (logError) {
              logger.error(
                `[${batchId}] Failed to log error for record ${paymentRefId}`,
                { error: logError.message },
              );
            }
          }
        }
      });

      const persistDuration = Date.now() - persistStartTime;
      logger.info(`[${batchId}] Batch results persisted successfully`, {
        successful: successCount,
        failed: errorCount,
        total: batch.length,
        durationMs: persistDuration,
        attempt: attemptNo,
        jobBatchId,
      });
    } catch (transactionError) {
      logger.error(`[${batchId}] Transaction failed`, {
        error: transactionError.message,
        stack: transactionError.stack,
        recordCount: batch.length,
        attempt: attemptNo,
      });
      throw new Error(
        `Failed to persist batch results: ${transactionError.message}`,
      );
    }
  }

  /**
   * Fetches inventory units from SFDC for a specific project and tower.
   * Returns empty array if API returns no data.
   *
   * @param projectName - SFDC project name
   * @param tower - Tower identifier in SFDC
   * @returns Promise<Array> Inventory units or empty array
   */
  private async fetchInventory(
    projectName: string,
    tower: string,
    campaignId?: number,
  ): Promise<SfdcInventory[]> {
    logger.info('Fetching inventory', {
      projectName,
      tower,
      campaignId,
    });

    let campaign = null;
    if (campaignId) {
      campaign = await this.eoiCampaignRepository.findOne({
        where: { id: campaignId },
        select: ['id', 'campaignName', 'sfdcProjectName', 'unitSourceType'],
      });
    }

    if (campaign?.unitSourceType === UnitSourceType.DATABASE) {
      // Fetch from ProjectInventoryUnit (Database)
      const dbUnits = await this.inventoryUnitRepo.find({
        where: {
          campaignId,
          towerName: tower,
          status: InventoryUnitStatusEnum.AVAILABLE,
        },
      });
      return dbUnits.map((unit) => ({
        floor: unit.floor,
        unitNumber: unit.unitNumber,
        sfdcTowerId: unit.towerId,
        preferredLocationUnit: undefined,
        numberOfCarParks:
          unit.numberOfCarParks != null
            ? String(unit.numberOfCarParks)
            : undefined,

        sfdcUnitId: undefined,
        facing: unit.facing,
        configuration: unit.configuration,
        carParkType: unit.carParkType,
        areaSBA: unit.areaSba,
        apartmentStatus: unit.status,
        inventoryUnitId: unit.id,
      }));
    } else {
      // Default: Fetch from SFDC
      const response = await this.sfdcService.getInventory(projectName, tower);
      if (!Array.isArray(response?.data)) {
        return [];
      }
      return response.data.map((item: any) => {
        const { tower, id, ...rest } = item;
        return {
          ...rest,
          sfdcTowerId: tower,
          sfdcUnitId: id,
        };
      });
    }
  }

  /**
   * Filters inventory array by floor and/or unit number criteria.
   * Case-insensitive unit number matching.
   *
   * @param data - Array of inventory records
   * @param filters - Filter object with optional floor and unitNumber
   * @returns Filtered inventory array
   */
  private filterInventory(
    data: SfdcInventory[],
    filters: { floor?: string | number; unitNumber?: string },
  ): SfdcInventory[] {
    return data.filter((item) => {
      if (
        filters.floor !== undefined &&
        filters.floor !== null &&
        Number(item.floor) !== Number(filters.floor)
      ) {
        return false;
      }

      if (
        filters.unitNumber &&
        (!item?.unitNumber ||
          item?.unitNumber.toLowerCase() !== filters?.unitNumber?.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get EOI to convert - fetches voucher by id with campaign relation
   * Returns campaignId and campaignName
   *
   * @param id - The voucher ID
   * @returns Response with campaignId and campaignName
   * @throws NotFoundException when voucher form is not found
   */
  async getEoiToConvert(id: number): Promise<any> {
    logger.info('Fetching EOI to convert', { voucherId: id });
    try {
      const voucherForm = await this.voucherFormRepository
        .createQueryBuilder('voucher')
        .leftJoinAndSelect('voucher.campaign', 'campaign')
        .leftJoinAndSelect('voucher.mappedUnit', 'mappedUnit')
        .where('voucher.id = :id', { id })
        .andWhere('voucher.isDeleted = false')
        .getOne();

      if (!voucherForm) {
        throw new NotFoundException('Voucher form not found');
      }

      const campaignId = voucherForm?.campaign?.id ?? null;
      const campaignName = voucherForm?.campaign?.campaignName ?? null;
      const sdfcProjectName = voucherForm?.campaign?.sfdcProjectName ?? null;

      let towers = [];
      if (campaignId) {
        const towerData = await this.inventoryUnitRepo.find({
          where: { campaignId },
          select: ['towerName'],
        });

        towers = [...new Set(towerData.map((t) => t.towerName))]
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({
            name,
            value: name,
          }));
      }

      // Call SFDC API to fetch tower dropdown for the given campaign (API pending from SFDC)
      return {
        statusCode: SUCCESS,
        message: 'Voucher campaign details retrieved successfully',
        data: {
          campaignId,
          campaignName,
          sdfcProjectName,
          mappedUnit: voucherForm?.mappedUnit ?? null,
          towers,
        },
      };
    } catch (error) {
      logger.error('Error retrieving voucher campaign details:', error);
      logsAndErrorHandling('eoiManagementService - getEoiToConvert', error, {
        id,
      });
    }
  }

  /**
   * Retrieves unique floor numbers for a project/tower from SFDC inventory.
   * Returns as name-value pairs for dropdown UI.
   *
   * @param dto - DTO with project and tower names
   * @returns Promise<any> Response with floor dropdown data
   */
  async getFloorDropdown(dto: GetFloorDropdownDto): Promise<any> {
    try {
      const { projectName, tower, campaignId } = dto;

      const inventory = await this.fetchInventory(
        projectName,
        tower,
        campaignId,
      );

      if (!inventory.length) {
        return {
          statusCode: SUCCESS,
          message: 'No inventory data found',
          data: [],
        };
      }

      const uniqueFloors = [
        ...new Set(
          inventory
            .map((item) => item?.floor)
            .filter(
              (floor) =>
                floor !== null &&
                floor !== undefined &&
                (typeof floor === 'string' ||
                  typeof floor === 'number' ||
                  typeof floor === 'boolean'),
            ),
        ),
      ].sort((a, b) => Number(a) - Number(b));

      const floors = uniqueFloors.map((floor) => ({
        name: floor,
        value: floor,
      }));

      return {
        statusCode: SUCCESS,
        message: 'Floor dropdown fetched successfully',
        data: floors,
      };
    } catch (error) {
      logger.error('Failed to get floor dropdown:', error);
      return logsAndErrorHandling(
        'eoiManagementService - getFloorDropdown',
        error,
        { dto },
      );
    }
  }

  /**
   * Retrieves inventory units for a specific floor with optional unit search.
   * Fetches from SFDC and filters by floor and unit number.
   *
   * @param dto - DTO with project, tower, floor, and optional unit search
   * @returns Promise<Object> Response with filtered inventory array
   */
  async getInventoryByFloor(dto: GetInventoryByFloorDto): Promise<{
    statusCode: number;
    message: string;
    data: SfdcInventory[];
  }> {
    try {
      const { projectName, tower, floor, search, campaignId } = dto;
      const inventory = await this.fetchInventory(
        projectName,
        tower,
        campaignId,
      );
      const filteredData = this.filterInventory(inventory, {
        floor,
        unitNumber: search,
      }).sort((a, b) => (a.unitNumber || '').localeCompare(b.unitNumber || ''));

      return {
        statusCode: SUCCESS,
        message: 'Inventory fetched successfully',
        data: filteredData,
      };
    } catch (error) {
      logger.error('Failed to get inventory by floor:', error);
      return logsAndErrorHandling(
        'eoiManagementService - getInventoryByFloor',
        error,
        { dto },
      );
    }
  }

  /**
   * Retrieves specific unit details by unit number.
   * Returns single unit record or null if not found.
   *
   * @param dto - DTO with project, tower, and unit number
   * @returns Promise<Object> Response with unit details or null
   * @throws BadRequestException when unitNumber not provided
   */
  async getUnitByUnitNumber(dto: GetUnitByUnitNumberDto): Promise<{
    statusCode: number;
    message: string;
    data: SfdcInventory | null;
  }> {
    try {
      const { projectName, tower, unitNumber } = dto;
      if (!unitNumber) {
        throw new BadRequestException('unitNumber is required');
      }

      const inventory = await this.fetchInventory(projectName, tower);
      const result = this.filterInventory(inventory, {
        unitNumber,
      });

      return {
        statusCode: SUCCESS,
        message: result.length ? 'Unit fetched successfully' : 'Unit not found',
        data: result[0] ?? null,
      };
    } catch (error) {
      logger.error('Failed to get unit by unitNumber:', error);
      return logsAndErrorHandling(
        'eoiManagementService - getUnitByUnitNumber',
        error,
        { dto },
      );
    }
  }

  /**
   * Looks up vouchers in a campaign using a free-text search
   * (voucher id, unique reference, pre-EOI id, primary applicant name or mobile).
   * Returns **all** matches (mapped and unmapped); each row includes `isMapped`.
   * Used by the inventory UI before submitting unit-to-voucher mapping.
   *
   * @param dto - From query: `campaignId` scopes results; `search` is the user input.
   */
  async fetchVoucherForMapping(dto: FetchVoucherForMappingDto): Promise<any> {
    logger.info('fetchVoucherForMapping called', { dto });
    try {
      const { campaignId, search } = dto;

      const trimmedSearch = search?.trim();
      if (!trimmedSearch) {
        throw new BadRequestException('Search term is required');
      }

      const vouchers = await this.joinVoucherCampaignAndMappedUnit(
        this.voucherFormRepository.createQueryBuilder('voucher'),
      )
        .where('voucher.campaign.id = :campaignId', { campaignId })
        .andWhere('voucher.isDeleted = false')
        .andWhere('mappedUnit.id IS NULL')
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM voucher_unit_blockings vub WHERE vub.voucher_id = voucher.id AND vub.deleted_at IS NULL)`,
        )
        .andWhere(this.buildVoucherSearchMatchBrackets(trimmedSearch))
        .select([
          'voucher.id',
          'voucher.voucherId',
          'voucher.uniqueReferenceId',
          'voucher.preEoiId',
          'voucher.stdEoiId',
          'voucher.paidVoucherId',
          'voucher.applicant1',
          'voucher.voucherFormStatus',
          'voucher.formPhase',
          'voucher.paymentStatus',
          'voucher.noOfApplicants',
          'campaign.id',
          'campaign.campaignName',
          'campaign.timerExtension',
          'campaign.unitBlockDuration',
          'mappedUnit.id',
          'voucher.paymentDetails',
        ])
        .orderBy('voucher.createdAt', 'DESC')
        .getMany();

      if (!vouchers.length) {
        throw new NotFoundException(
          'No voucher found matching the search criteria for this campaign',
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'Voucher(s) fetched successfully',
        data: {
          vouchers: vouchers.map((v) =>
            this.formatVoucherForMappingResponse(v),
          ),
          campaignDetails: {
            id: vouchers[0].campaign?.id,
            name: vouchers[0].campaign?.campaignName,
            timerExtension: vouchers[0].campaign?.timerExtension,
            unitBlockDuration: vouchers[0].campaign?.unitBlockDuration || null,
          },
        },
      };
    } catch (error) {
      logger.error('Error in fetchVoucherForMapping:', error);
      logsAndErrorHandling(
        'eoiManagementService - fetchVoucherForMapping',
        error,
        { dto },
      );
    }
  }

  private joinVoucherCampaignAndMappedUnit(
    qb: SelectQueryBuilder<VoucherForm>,
  ): SelectQueryBuilder<VoucherForm> {
    return qb
      .leftJoin('voucher.campaign', 'campaign')
      .leftJoin('voucher.mappedUnit', 'mappedUnit');
  }

  private buildVoucherSearchMatchBrackets(trimmedSearch: string): Brackets {
    const searchPattern = `%${trimmedSearch.toLowerCase()}%`;

    return new Brackets((qb) => {
      qb.where('LOWER(voucher.uniqueReferenceId) LIKE :search', {
        search: searchPattern,
      })
        .orWhere('LOWER(voucher.preEoiId) LIKE :search', {
          search: searchPattern,
        })
        .orWhere('LOWER(voucher.stdEoiId) LIKE :search', {
          search: searchPattern,
        })
        .orWhere('LOWER(voucher.paidVoucherId) LIKE :search', {
          search: searchPattern,
        })
        .orWhere(
          `LOWER(JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.firstName'))) LIKE :search`,
          { search: searchPattern },
        )
        .orWhere(
          `LOWER(JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.lastName'))) LIKE :search`,
          { search: searchPattern },
        )
        .orWhere(
          `LOWER(JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.contactNumber'))) LIKE :search`,
          { search: searchPattern },
        );
    });
  }

  private formatVoucherForMappingResponse(voucher: VoucherForm) {
    const applicant = voucher.applicant1;
    const mobileFromNested =
      (applicant?.personalDetails?.countryCode ?? '') +
        (applicant?.personalDetails?.contactNumber ?? '') || null;
    const customerName =
      applicant?.personalDetails?.firstName +
        ' ' +
        applicant?.personalDetails?.lastName || null;
    return {
      id: voucher.id,
      label: `${customerName} | ${voucher.uniqueReferenceId} | ${maskMobileNumber(applicant?.personalDetails?.contactNumber ?? '')}`,
      voucherId: voucher.voucherId,
      uniqueReferenceId: voucher.uniqueReferenceId,
      preEoiId: voucher.preEoiId,
      stdEoiId: voucher.stdEoiId,
      paidVoucherId: voucher.paidVoucherId,
      customerName: customerName,
      mobile: (mobileFromNested && String(mobileFromNested).trim()) || null,
      email: applicant?.personalDetails?.emailAddress || null,
      voucherFormStatus: voucher.voucherFormStatus,
      formPhase: voucher.formPhase,
      paymentStatus: voucher.paymentStatus,
      noOfApplicants: voucher.noOfApplicants,
      campaignId: voucher.campaign?.id,
      campaignName: voucher.campaign?.campaignName,
      isMapped: !!voucher.mappedUnit,
      amountPaid: voucher?.paymentDetails?.totalAmountPaid || 0,
      timerExtension: voucher?.campaign?.timerExtension || null,
      unitBlockDuration: voucher?.campaign?.unitBlockDuration || null,
    };
  }

  /**
   * Map inventory unit to a voucher and perform conversion.
   * This function handles both DATABASE and SFDC unit sources.
   *
   * For DATABASE source: Retrieves unit from internal inventory, validates availability,
   * and marks it as "Mapped" after successful association with the voucher.
   *
   * For SFDC source: Validates unit details from SFDC system and creates mapping record.
   *
   * @param user - Current logged-in user making the request
   * @param dto - MapAndConvertDto containing voucher ID, unit details, tower, floor, etc.
   * @returns Success response with mapped unit details
   * @throws NotFoundException when voucher or unit is not found
   * @throws BadRequestException when unit is already mapped or not available
   */
  async mapAndConvert(user: any, dto: MapAndConvertDto): Promise<any> {
    logger.info('Starting unit mapping flow', {
      userName: user?.name,
      voucherId: dto?.voucherId,
    });
    try {
      logger.info('Starting unit mapping flow', {
        userName: user?.name,
        dto,
      });

      const voucher = await this.voucherFormRepository
        .createQueryBuilder('voucher')
        .leftJoin('voucher.campaign', 'campaign')
        .where('voucher.id = :id', { id: dto?.voucherId })
        .andWhere('voucher.isDeleted = false')
        .select([
          'voucher.id',
          'voucher.paidVoucherId',
          'voucher.preEoiId',
          'voucher.stdEoiId',
          'voucher.opportunityId',
          'campaign.id',
          'campaign.sfdcProjectName',
          'campaign.unitSourceType',
        ])
        .getOne();
      if (!voucher) {
        throw new NotFoundException('Voucher not found');
      }

      if (dto.changeUnit) {
        logger.info('Change unit flow initiated for voucher', {
          voucherId: voucher.id,
        });
        return this.handleChangeUnitFlow(voucher, dto);
      }
      return this.handleCreateMappingFlow(voucher, dto);
    } catch (error) {
      logger.error('Failed in mapAndConvert:', error);
      return logsAndErrorHandling(
        'eoiManagementService - mapAndConvert',
        error,
        { dto },
      );
    }
  }

  /**
   * Handles initial unit mapping creation flow.
   * Pushes to SFDC if required and creates mapping record.
   *
   * @param voucher - Voucher entity to map to
   * @param dto - Mapping details DTO
   * @returns Promise<any> Success response
   */
  private async handleCreateMappingFlow(
    voucher: VoucherForm,
    dto: MapAndConvertDto,
  ) {
    const source = voucher.campaign?.unitSourceType ?? UnitSourceType.SFDC;
    logger.info('Creating unit mapping', { voucherId: voucher.id, source });

    await this.voucherFormRepository.manager.transaction(async (manager) => {
      // Prevent voucher duplicate mapping
      const existingVoucherMapping = await manager.findOne(VoucherUnitMapping, {
        where: { voucherId: voucher.id },
      });

      if (existingVoucherMapping) {
        throw new BadRequestException('Voucher already has a mapped unit');
      }

      // Prevent unit duplicate mapping
      const existingUnitMapping = await manager.findOne(VoucherUnitMapping, {
        where: {
          unitNumber: dto.unitNumber,
        },
      });

      if (existingUnitMapping) {
        throw new BadRequestException(
          'This unit is already mapped to another voucher',
        );
      }

      // If SFDC source → push first (outside DB mutation)
      if (source === UnitSourceType.SFDC) {
        if (!dto?.sfdcUnitId) {
          throw new BadRequestException(
            'sfdcUnitId is required when unit source type is SFDC',
          );
        }
        logger.info('Pushing to SFDC before mapping for voucher:', {
          voucherId: voucher.id,
        });
        await this.pushToSfdcOrThrow(voucher, dto);
      }

      // If DATABASE → reserve inventory
      let inventoryUnitId: string | null = null;

      if (source === UnitSourceType.DATABASE) {
        const inventoryUnit = await manager.findOne(ProjectInventoryUnit, {
          where: {
            unitNumber: dto.unitNumber,
            towerName: dto.towerName,
            floor: String(dto.floor),
            status: InventoryUnitStatusEnum.AVAILABLE,
            campaignId: voucher?.campaign?.id,
          },
        });

        if (!inventoryUnit) {
          throw new NotFoundException('Unit not available in inventory');
        }

        inventoryUnit.status = InventoryUnitStatusEnum.BLOCKED_BY_RM;
        inventoryUnit.isMapped = true;
        await manager.save(ProjectInventoryUnit, inventoryUnit);

        inventoryUnitId = inventoryUnit.id;
      }

      // Save mapping
      await manager.save(VoucherUnitMapping, {
        voucherId: voucher.id,
        inventoryUnitId,
        unitNumber: dto.unitNumber,
        source,
      });

      // Invalidate opportunity details cache for the voucher
      const cacheKey = `opportunity-details-${voucher?.opportunityId}`;
      await this.cacheService.del(cacheKey);
    });

    return {
      statusCode: SUCCESS,
      message: 'Unit mapped successfully',
      data: { id: dto.voucherId },
    };
  }

  /**
   * Handles unit change flow for existing mappings.
   * Reverts old inventory reservation and creates new mapping.
   *
   * @param voucher - Voucher with existing mapping
   * @param dto - New mapping details
   * @returns Promise<any> Success response
   */
  private async handleChangeUnitFlow(
    voucher: VoucherForm,
    dto: MapAndConvertDto,
  ) {
    logger.info('Changing unit mapping', { voucherId: voucher.id });
    const source = voucher.campaign?.unitSourceType ?? UnitSourceType.SFDC;

    await this.voucherFormRepository.manager.transaction(async (manager) => {
      const existingMapping = await manager.findOne(VoucherUnitMapping, {
        where: { voucherId: voucher.id },
      });

      if (!existingMapping) {
        throw new BadRequestException('No existing mapping found to change');
      }

      // Prevent changing to already-mapped unit
      const duplicateUnit = await manager.findOne(VoucherUnitMapping, {
        where: {
          unitNumber: dto.unitNumber,
        },
      });

      if (duplicateUnit && duplicateUnit.voucherId !== voucher.id) {
        throw new BadRequestException(
          'New unit is already mapped to another voucher',
        );
      }

      // Push to SFDC first if required
      if (source === UnitSourceType.SFDC) {
        await this.pushToSfdcOrThrow(voucher, dto);
      }

      // Revert old inventory if DATABASE
      if (
        source === UnitSourceType.DATABASE &&
        existingMapping.inventoryUnitId
      ) {
        await manager.update(
          ProjectInventoryUnit,
          { id: existingMapping.inventoryUnitId },
          { status: InventoryUnitStatusEnum.AVAILABLE, isMapped: false },
        );
      }

      // Reserve new inventory if DATABASE
      let newInventoryId: string | null = null;

      if (source === UnitSourceType.DATABASE) {
        const inventoryUnit = await manager.findOne(ProjectInventoryUnit, {
          where: {
            unitNumber: dto.unitNumber,
            towerName: dto.towerName,
            floor: String(dto.floor),
            status: InventoryUnitStatusEnum.AVAILABLE,
            campaignId: voucher?.campaign?.id,
          },
        });

        if (!inventoryUnit) {
          throw new NotFoundException('New unit not available in inventory');
        }

        inventoryUnit.status = InventoryUnitStatusEnum.BLOCKED_BY_RM;
        inventoryUnit.isMapped = true;
        await manager.save(ProjectInventoryUnit, inventoryUnit);

        newInventoryId = inventoryUnit.id;
      }

      // Update existing mapping instead of delete+insert
      existingMapping.inventoryUnitId = newInventoryId;
      existingMapping.unitNumber = dto.unitNumber;
      await manager.save(VoucherUnitMapping, existingMapping);
    });

    // Invalidate opportunity details cache for the voucher
    const cacheKey = `opportunity-details-${voucher?.opportunityId}`;
    await this.cacheService.del(cacheKey);
    return {
      statusCode: SUCCESS,
      message: 'Unit changed successfully',
      data: { id: dto.voucherId },
    };
  }

  /**
   * Handles reverting/removing unit mapping from EOI.
   * Releases inventory reservation and deletes mapping record.
   *
   * @param voucher - Voucher with mapping to revert
   * @param dto - Revert flow DTO
   * @returns Promise<any> Success response
   */
  async revertToEOI(user: any, dto: { voucherId: number }): Promise<any> {
    try {
      logger.info('Reverting unit mapping to EOI', {
        voucherId: dto?.voucherId,
      });
      logger.info('Starting revert to EOI flow', {
        userName: user?.name,
        dto,
      });

      const voucher = await this.voucherFormRepository
        .createQueryBuilder('voucher')
        .leftJoin('voucher.campaign', 'campaign')
        .leftJoin('voucher.mappedUnit', 'mappedUnit')
        .where('voucher.id = :id', { id: dto?.voucherId })
        .andWhere('voucher.isDeleted = false')
        .select([
          'voucher.id',
          'voucher.paidVoucherId',
          'voucher.preEoiId',
          'voucher.stdEoiId',
          'voucher.opportunityId',
          'campaign.id',
          'campaign.sfdcProjectName',
          'campaign.unitSourceType',
          'mappedUnit',
        ])
        .getOne();

      if (!voucher) {
        throw new NotFoundException('Voucher not found');
      }
      const source = voucher.campaign?.unitSourceType ?? UnitSourceType.SFDC;

      const existingMapping = voucher?.mappedUnit;
      if (!existingMapping) {
        throw new BadRequestException('No mapping found to revert');
      }

      await this.voucherFormRepository.manager.transaction(async (manager) => {
        if (
          source === UnitSourceType.DATABASE &&
          existingMapping.inventoryUnitId
        ) {
          await manager.update(
            ProjectInventoryUnit,
            { id: existingMapping.inventoryUnitId },
            { status: InventoryUnitStatusEnum.AVAILABLE, isMapped: false },
          );
        }

        await manager.delete(VoucherUnitMapping, {
          id: existingMapping.id,
        });
      });

      // Invalidate opportunity details cache for the voucher
      const cacheKey = `opportunity-details-${voucher?.opportunityId}`;
      await this.cacheService.del(cacheKey);
      return {
        statusCode: SUCCESS,
        message: 'Unit mapping reverted successfully',
        data: {
          id: dto.voucherId,
        },
      };
    } catch (error) {
      logger.error('Failed in revertToEOI:', error);
      return logsAndErrorHandling('eoiManagementService - revertToEOI', error, {
        dto,
      });
    }
  }

  /**
   * Pushes unit mapping to SFDC and throws on failure.
   * Updates opportunity with unit details and stage information.
   *
   * @param voucher - Voucher with opportunity ID
   * @param dto - Mapping (or revert) details
   * @throws BadRequestException if SFDC push fails
   */
  private async pushToSfdcOrThrow(voucher: VoucherForm, dto: MapAndConvertDto) {
    if (!voucher.opportunityId) {
      throw new BadRequestException('OpportunityId missing');
    }
    logger.info('Pushing unit mapping to SFDC', {
      voucherId: voucher.id,
      unitNumber: dto.unitNumber,
    });

    const paidVoucherId =
      voucher?.paidVoucherId ?? voucher?.preEoiId ?? voucher?.stdEoiId;
    const payload = [
      {
        voucherId: paidVoucherId,
        opportunityId: voucher.opportunityId,
        apartment: dto.sfdcUnitId,
        stageName: '2.Blocking',
      },
    ];
    const response = await this.sfdcService.pushUnitMappingToSFDC(payload);

    this.eventEmitter.emit(
      EventMessagesEnum.CREATE_SFDC_LOG,
      new SFDCLogEvent(
        voucher.opportunityId,
        EventMessagesEnum.MAP_AND_CONVERT,
        payload,
        response,
        response[0]?.success ? 'success' : 'error',
      ),
    );
    if (!response?.length || !response[0]?.success) {
      logger.error('Failed to push unit mapping to SFDC', {
        error: response?.[0]?.error || 'SFDC update failed',
      });

      throw new BadRequestException('Failed to update unit mapping in SFDC');
    }
  }

  /**
   * Builds email changes details from swappedFields, currentData, and newData.
   * @param swappedFields Array of field names that were changed
   * @param currentData Current data object
   * @param newData New data object
   * @returns HTML string with changes details
   */
  private buildEmailVariables(
    swappedFields: string[],
    currentData: Record<string, any>,
    newData: Record<string, any>,
  ): { changesDetails: string } {
    const changesDetails: string[] = [];

    // Check for customer name change (firstName or lastName)
    const hasNameChange =
      swappedFields.includes('firstName') || swappedFields.includes('lastName');
    if (hasNameChange) {
      const oldFirstName = safeString(currentData?.firstName);
      const oldLastName = safeString(currentData.lastName);
      const newFirstName = safeString(newData.firstName);
      const newLastName = safeString(newData.lastName);
      const oldName = `${oldFirstName} ${oldLastName}`.trim();
      const newName = `${newFirstName} ${newLastName}`.trim();

      changesDetails.push(
        `<p>• Customer Name</p><p>Current: ${oldName}</p><p>Requested: ${newName}</p>`,
      );
    }

    // Check for email change
    if (swappedFields.includes('emailId')) {
      const oldEmail = safeString(currentData.emailId, 'N/A');
      const newEmail = safeString(newData.emailId, 'N/A');
      changesDetails.push(
        `<p>• Email ID</p><p>Current: ${oldEmail}</p><p>Requested: ${newEmail}</p>`,
      );
    }

    // Check for contact number change
    if (
      swappedFields.includes('contactNumber') ||
      swappedFields.includes('countryCode')
    ) {
      const oldCountryCode = safeString(currentData.countryCode);
      const oldContact = safeString(currentData.contactNumber);
      const newCountryCode = safeString(newData.countryCode);
      const newContact = safeString(newData.contactNumber);
      const oldContactFull =
        oldCountryCode && oldContact
          ? `${oldCountryCode}${oldContact}`
          : oldContact || 'N/A';
      const newContactFull =
        newCountryCode && newContact
          ? `${newCountryCode}${newContact}`
          : newContact || 'N/A';

      changesDetails.push(
        `<p>• Contact Number</p><p>Current: ${oldContactFull}</p><p>Requested: ${newContactFull}</p>`,
      );
    }

    // Check for source change
    if (swappedFields.includes('primarySource')) {
      const oldSource = safeString(currentData.primarySource, 'N/A');
      const newSource = safeString(newData.primarySource, 'N/A');
      let dependentFieldValue = 'N/A';

      // If sourceDetails is present, just put the sourceDetails values
      if (newData.sourceDetails) {
        dependentFieldValue = JSON.stringify(newData.sourceDetails);
      }

      changesDetails.push(
        `<p>• Source Change</p><p>Current Source: ${oldSource}</p><p>Requested Source: ${newSource}</p><p>Additional Details (if applicable): ${dependentFieldValue}</p>`,
      );
    }

    return { changesDetails: changesDetails.join('') };
  }

  /**
   * Sends email notification to MIS users about Change request.
   * @param voucher Voucher form entity
   * @param dto Create Change request DTO
   * @param rmUser Current user (RM) who created the request
   */
  private async sendVoucherChangeRequestEmail(
    voucher: VoucherForm,
    dto: CreateVoucherChangeRequestDto,
    rmUser: any,
  ): Promise<void> {
    try {
      const misEmail = this.configService.get<string>('MIS_NOTIFICATION_EMAIL');
      if (!misEmail) {
        logger.warn('MIS user email not configured');
        return;
      }

      const { changesDetails } = this.buildEmailVariables(
        dto.swappedFields,
        dto.currentData,
        dto.newData,
      );

      const rmName = rmUser?.name || 'RM';
      const prid = voucher.uniqueReferenceId || 'N/A';
      const reason = dto.reason || 'N/A';

      const emailVariables = {
        PRID: prid,
        CHANGES_DETAILS: changesDetails,
        RM_REASON: reason,
        RM_NAME: rmName,
      };

      const responses = await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.VOUCHER_CHANGE_REQUEST_APPROVAL,
          emailVariables,
          BRAND_PURAVANKARA,
          { to: misEmail },
        ),
      );

      if (responses.some((res) => res instanceof Error)) {
        logger.error(
          'Failed to send Change request email',
          responses.find((res) => res instanceof Error),
        );
      } else {
        logger.info(
          `Change request email sent to MIS users for voucher ${voucher.id}`,
        );
      }
    } catch (error) {
      logger.error('Error sending Change request email:', error);
      // Don't throw error - email failure shouldn't break the request creation
    }
  }

  /**
   * Collects recipient email addresses from voucher's createdBy and closingRm.
   * @param voucher Voucher form entity with createdBy and closingRm relations
   * @returns Array of unique email addresses
   */
  private collectRmEmails(voucher: VoucherForm): string[] {
    const recipientEmails: string[] = [];

    if (voucher.createdBy?.email) {
      recipientEmails.push(voucher.createdBy.email);
    }

    if (voucher.closingRm?.email) {
      recipientEmails.push(voucher.closingRm.email);
    }

    return [...new Set(recipientEmails)];
  }

  /**
   * Extracts common voucher data for email templates.
   * @param voucher Voucher form entity
   * @returns Object with prid and customer_name
   */
  private extractVoucherEmailData(voucher: VoucherForm): {
    prid: string;
    customer_name: string;
  } {
    const firstName = voucher.applicant1?.personalDetails?.firstName || '';
    const lastName = voucher.applicant1?.personalDetails?.lastName || '';
    const customerName = `${firstName} ${lastName}`.trim() || 'N/A';
    const prid = voucher.uniqueReferenceId || 'N/A';

    return { prid, customer_name: customerName };
  }

  /**
   * Sends email notification to RM users about Change request.
   * @param voucher Voucher form entity with createdBy and closingRm relations
   * @param emailType Email template enum (VOUCHER_CHANGE_REJECTED or VOUCHER_CHANGE_APPROVED)
   * @param emailVariables Variables to be used in the email template
   * @param emailTypeLabel Label for logging (e.g., 'rejection', 'approval')
   */
  private async sendVoucherChangeEmail(
    voucher: VoucherForm,
    emailType: ComposeEmailsEnum,
    emailVariables: Record<string, any>,
    emailTypeLabel: string,
  ): Promise<void> {
    try {
      const uniqueEmails = this.collectRmEmails(voucher);

      if (uniqueEmails.length === 0) {
        logger.warn(
          `No RM email addresses found for voucher ${voucher.id} - skipping ${emailTypeLabel} email`,
        );
        return;
      }

      const responses = await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(emailType, emailVariables, BRAND_PURAVANKARA, {
          to: uniqueEmails,
        }),
      );

      if (responses.some((res) => res instanceof Error)) {
        logger.error(
          `Failed to send voucher change ${emailTypeLabel} email`,
          responses.find((res) => res instanceof Error),
        );
      } else {
        logger.info(
          `Voucher change ${emailTypeLabel} email sent to RM users for voucher ${voucher.id}`,
        );
      }
    } catch (error) {
      logger.error(
        `Error sending voucher change ${emailTypeLabel} email:`,
        error,
      );
      // Don't throw error - email failure shouldn't break the approval process
    }
  }

  /**
   * Sends email notification to RM users (createdBy and closingRm) about Change request rejection.
   * @param voucher Voucher form entity with createdBy and closingRm relations
   * @param misComments MIS reviewer's comments/remark
   */
  private async sendVoucherChangeRejectionEmail(
    voucher: VoucherForm,
    misComments: string | null,
  ): Promise<void> {
    const { prid, customer_name } = this.extractVoucherEmailData(voucher);
    const emailVariables = {
      prid,
      customer_name,
      mis_comments: misComments || 'N/A',
    };

    await this.sendVoucherChangeEmail(
      voucher,
      ComposeEmailsEnum.VOUCHER_CHANGE_REJECTED,
      emailVariables,
      'rejection',
    );
  }

  /**
   * Builds the approved changes HTML content for the approval email.
   * @param swappedFields Array of field names that were changed
   * @param currentData Current data before changes
   * @param newData New data after changes
   * @returns HTML string with approved changes details
   */
  private buildApprovedChangesContent(
    swappedFields: string[],
    currentData: Record<string, any>,
    newData: Record<string, any>,
  ): string {
    const changes: string[] = [];

    // Check for customer name change (firstName or lastName)
    const hasNameChange =
      swappedFields.includes('firstName') || swappedFields.includes('lastName');

    if (hasNameChange) {
      const oldFirstName = safeString(currentData.firstName, '');
      const oldLastName = safeString(currentData.lastName, '');
      const newFirstName = safeString(newData.firstName, '');
      const newLastName = safeString(newData.lastName, '');

      const oldName = `${oldFirstName} ${oldLastName}`.trim() || 'N/A';
      const newName = `${newFirstName} ${newLastName}`.trim() || 'N/A';

      changes.push(
        `<p><strong>Customer Name Updated</strong></p><p>Previous: ${oldName}</p><p>Updated: ${newName}</p>`,
      );
    }

    // Check for email change
    if (swappedFields.includes('emailId')) {
      const oldEmail = safeString(currentData.emailId, 'N/A');
      const newEmail = safeString(newData.emailId, 'N/A');

      changes.push(
        `<p><strong>Email ID Updated</strong></p><p>Previous: ${oldEmail}</p><p>Updated: ${newEmail}</p>`,
      );
    }

    // Check for contact number change
    if (
      swappedFields.includes('contactNumber') ||
      swappedFields.includes('countryCode')
    ) {
      const oldCountryCode = safeString(currentData.countryCode, '');
      const oldContact = safeString(currentData.contactNumber, '');
      const newCountryCode = safeString(newData.countryCode, '');
      const newContact = safeString(newData.contactNumber, '');

      const oldContactFull =
        oldCountryCode && oldContact
          ? `${oldCountryCode}${oldContact}`
          : oldContact || 'N/A';

      const newContactFull =
        newCountryCode && newContact
          ? `${newCountryCode}${newContact}`
          : newContact || 'N/A';

      changes.push(
        `<p><strong>Contact Number Updated</strong></p><p>Previous: ${oldContactFull}</p><p>Updated: ${newContactFull}</p>`,
      );
    }

    // Check for source change
    if (swappedFields.includes('primarySource')) {
      changes.push(this.buildSourceChangeContent(currentData, newData));
    }

    return changes.join('');
  }

  private buildSourceChangeContent(
    currentData: Record<string, any>,
    newData: Record<string, any>,
  ): string {
    const oldSource = safeString(currentData.primarySource, 'N/A');
    const newSource = safeString(newData.primarySource, 'N/A');

    let dependentFieldValue = 'N/A';

    // If sourceDetails is present, just put the sourceDetails values
    if (newData.sourceDetails) {
      dependentFieldValue = JSON.stringify(newData.sourceDetails);
    }

    return `<p><strong>Source Updated</strong></p><p>Previous Source: ${oldSource}</p><p>Updated Source: ${newSource}</p><p>Additional Details: ${dependentFieldValue}</p>`;
  }

  /**
   * Sends email notification to RM users (createdBy and closingRm) about Change request approval.
   * @param voucher Voucher form entity with createdBy and closingRm relations
   * @param voucherChangeRequest Change request entity with swappedFields, currentData, and newData
   * @param misComments MIS reviewer's comments/remark
   */
  private async sendVoucherChangeApprovalEmail(
    voucher: VoucherForm,
    voucherChangeRequest: any,
    misComments: string | null,
  ): Promise<void> {
    const { prid, customer_name } = this.extractVoucherEmailData(voucher);

    // Build approved changes content
    const swappedFields = voucherChangeRequest.swappedFields || [];
    const currentData = voucherChangeRequest.currentData || {};
    const newData = voucherChangeRequest.newData || {};
    const approvedChanges = this.buildApprovedChangesContent(
      swappedFields,
      currentData,
      newData,
    );

    const emailVariables = {
      prid,
      customer_name,
      APPROVED_CHANGES: approvedChanges,
      mis_comments: misComments || 'N/A',
    };

    await this.sendVoucherChangeEmail(
      voucher,
      ComposeEmailsEnum.VOUCHER_CHANGE_APPROVED,
      emailVariables,
      'approval',
    );
  }

  /**
   * Creates or updates a Change request for a voucher.
   * - If `id` is provided, updates the existing request (must belong to the voucher).
   * - If `id` is not provided, creates a new request.
   * - Validates that the voucher exists.
   * - Derives and assigns the associated campaign ID from the voucher.
   * - Persists the request with current/new data and metadata.
   */
  async createVoucherChangeRequest(
    user: any,
    dto: CreateVoucherChangeRequestDto,
  ): Promise<any> {
    try {
      const { voucher, campaignId } = await this.getVoucherWithCampaign(
        dto.voucherId,
      );

      // for Amount transfer
      const { swappedFields, targetPRID } = dto;
      const isAmountTransfer =
        Array.isArray(swappedFields) && swappedFields.includes('amountPaid');
      if (isAmountTransfer) {
        if (!targetPRID || targetPRID.trim() === '') {
          throw new BadRequestException(
            'targetPRID is required when transferring amount',
          );
        }

        const { payments } = await this.validateVoucherTransfer(targetPRID);
        const paymentIds = payments.map((p) => p.id);
        dto.newData = {
          ...dto.newData,
          paymentIds: paymentIds,
        };
      }

      const createdBy = user?.dbId ?? null;

      // Update existing request if ID is provided
      if (dto.id) {
        return await this.updateVoucherChangeRequest(dto);
      }

      // Create new request
      const entity = this.voucherChangeRequestRepository.create({
        voucherId: voucher.id,
        campaignId,
        targetPRID: dto.targetPRID ?? null,
        targetEnquiryId: dto.targetEnquiryId ?? null,
        changeSource: dto.changeSource,
        reason: dto.reason ?? null,
        currentData: dto.currentData,
        newData: dto.newData,
        swappedFields: dto.swappedFields,
        createdBy,
      });

      const saved = await this.voucherChangeRequestRepository.save(entity);

      // Update voucher to set isChangeRequestPending = true
      await this.voucherFormRepository.update(
        { id: voucher.id },
        { isChangeRequestPending: true },
      );

      // Send email notification to MIS users
      await this.sendVoucherChangeRequestEmail(voucher, dto, user);

      return {
        statusCode: SUCCESS,
        message: 'change request created successfully',
        data: saved,
      };
    } catch (error) {
      logger.error('createVoucherChangeRequest failed:', error);
      logsAndErrorHandling(
        'eoiManagementService - createVoucherChangeRequest',
        error,
        {
          dto,
          userId: user?.dbId,
        },
      );
    }
  }

  private async getVoucherWithCampaign(
    voucherId: number,
  ): Promise<{ voucher: VoucherForm; campaignId: number }> {
    const voucher = await this.voucherFormRepository.findOne({
      where: { id: voucherId, isDeleted: false },
      relations: ['campaign'],
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }
    const campaignId = voucher.campaign?.id;
    if (!voucher.campaign?.id) {
      throw new BadRequestException(
        'Associated campaign not found for this voucher',
      );
    }

    return { voucher, campaignId };
  }

  private async updateVoucherChangeRequest(
    dto: CreateVoucherChangeRequestDto,
  ): Promise<any> {
    const existingRequest = await this.voucherChangeRequestRepository.findOne({
      where: { id: dto.id, isDeleted: 0 },
    });

    if (!existingRequest) {
      throw new NotFoundException('Change request not found');
    }

    // Verify the request belongs to the provided voucher
    if (existingRequest.voucherId !== dto.voucherId) {
      throw new BadRequestException(
        'Change request does not belong to the provided voucher',
      );
    }

    // Only allow update if status is "Requested"
    if (existingRequest.status !== VoucherChangeRequestStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot update Change request. Current status is "${existingRequest.status}". Only requests with status "Requested" can be updated.`,
      );
    }

    // Update the existing request
    Object.assign(existingRequest, {
      targetPRID: dto.targetPRID ?? null,
      targetEnquiryId: dto.targetEnquiryId ?? null,
      changeSource: dto.changeSource,
      reason: dto.reason ?? null,
      currentData: dto.currentData,
      newData: dto.newData,
      swappedFields: dto.swappedFields,
      status: VoucherChangeRequestStatus.REQUESTED,
    });

    const updated =
      await this.voucherChangeRequestRepository.save(existingRequest);

    return {
      statusCode: SUCCESS,
      message: 'Change request updated successfully',
      data: updated,
    };
  }

  private async validateVoucherTransfer(
    targetPRID?: string,
    manager?: EntityManager,
  ): Promise<{ source: VoucherForm; payments: VoucherPayment[] }> {
    const repo = manager ?? this.voucherFormRepository.manager;

    const source = await repo.findOne(VoucherForm, {
      where: {
        uniqueReferenceId: targetPRID,
        isDeleted: false,
      },
      relations: ['campaign'],
    });

    if (!source) throw new NotFoundException('Source voucher not found');
    const allowedStatuses = [
      PaymentTxStatusEnum.UNVERIFIED,
      PaymentTxStatusEnum.VERIFIED,
    ];

    const validPayments = await repo.find(VoucherPayment, {
      where: {
        voucherId: source.id,
        status: In(allowedStatuses),
      },
    });

    if (!validPayments.length) {
      throw new BadRequestException(
        'No payments available for transfer. Only Pending Reco and Realized payments are allowed',
      );
    }

    return { source, payments: validPayments };
  }

  private async transferVoucherAmount(
    voucher: VoucherForm, // Target voucher where payments will be assigned
    targetPRID?: string, // Source PRID (alternative identifier for source voucher)
    paymentIds?: number[], // List of payment IDs selected for transfer
    manager?: EntityManager,
  ): Promise<VoucherForm> {
    // Fetch target (updatedVoucher) + source
    const { updatedVoucher, source } = await this.getVouchers(
      voucher.id,
      targetPRID,
      manager,
    );

    // Transfer payments
    await manager.update(
      VoucherPayment,
      { id: In(paymentIds) },
      { voucher: { id: voucher.id } },
    );

    // Reset source
    const remainingPayments = await manager.count(VoucherPayment, {
      where: { voucherId: source.id },
    });
    await this.resetSourceVoucher(manager, source, remainingPayments === 0);

    // Get updated transactions
    const updatedTransactions = await manager
      .createQueryBuilder(VoucherPayment, 'payment')
      .where('payment.voucher = :voucherId', { voucherId: updatedVoucher.id })
      .getMany();

    // set default if null
    if (!updatedVoucher.paymentDetails) {
      updatedVoucher.paymentDetails = {
        amountPayable: source.paymentDetails?.amountPayable || 0,
        totalAmountPaid: 0,
        isCreateForm: false,
        isAgreedOnTerms: false,
      };
    }
    // set default if null
    if (!updatedVoucher.eoiDetails) {
      updatedVoucher.eoiDetails = source?.eoiDetails;
    }

    //  payment Calculate payment metrics
    const paymentMetrics = calculatePaymentMetrics(
      updatedTransactions,
      updatedVoucher.paymentDetails.amountPayable,
      { useRealizedForVerified: true },
    );

    // Update payment details with new metrics
    updatedVoucher.paymentDetails.totalAmountPaid =
      paymentMetrics.totalPaidAmount;
    updatedVoucher.paymentStatus = determinePaymentStatus(paymentMetrics);

    // Sync tier eligibility
    reconcileTierIdsForCurrentEligibility(
      updatedVoucher,
      updatedVoucher.campaign,
      paymentMetrics.validPaidAmount,
    );

    // Generate EOI IDs based on new payment amount
    const tierConfig = await resolveAndAssignTieredId(
      updatedVoucher,
      updatedVoucher.campaign,
      paymentMetrics.validPaidAmount,
      (voucher, id) =>
        this.voucherFormsService.sendQueueIdAssignmentEmail(voucher, id),
      (counterField) =>
        allocateCampaignTierCounter(
          this.eoiCampaignRepository,
          updatedVoucher.campaign.id,
          counterField,
        ),
    );

    // Recompute metrics if new EOI was assigned
    const recomputedMetrics = tierConfig
      ? applyAssignedTierThresholdAmountAndRecomputeMetrics(
          updatedVoucher,
          updatedVoucher.campaign,
          tierConfig,
          updatedTransactions,
          { useRealizedForVerified: true },
        )
      : null;

    let metricsForStatusAndQueue = paymentMetrics;
    if (recomputedMetrics) {
      metricsForStatusAndQueue = recomputedMetrics;
      updatedVoucher.paymentStatus = determinePaymentStatus(
        metricsForStatusAndQueue,
      );

      // Update voucher status for Standard/Preferential EOI
      if (
        tierConfig.tier === VoucherIdFieldNameEnum.STD_EOI_ID ||
        tierConfig.tier === VoucherIdFieldNameEnum.PRE_EOI_ID
      ) {
        markFormSubmittedOnTierChange(updatedVoucher, tierConfig);
      }
    }

    // Generate queue ID if needed
    if (
      tierConfig &&
      shouldGenerateQueueId(updatedVoucher, metricsForStatusAndQueue)
    ) {
      await generateAndAssignTieredQueueId(
        updatedVoucher,
        tierConfig,
        (campaignId, queueType) =>
          this.voucherFormsService.generateQueueId(campaignId, queueType),
      );
    } else if (
      !tierConfig &&
      !updatedVoucher.queueId &&
      shouldGenerateQueueId(updatedVoucher, metricsForStatusAndQueue)
    ) {
      // if no tier is assigned and queueId is missing, resolve the correct tier using realized amount and thresholds, and generate queueId only for the qualifying tier
      const qualifiedTierConfig = this.getQualifiedTierForQueue(
        updatedVoucher,
        metricsForStatusAndQueue,
      );

      if (qualifiedTierConfig) {
        await generateAndAssignTieredQueueId(
          updatedVoucher,
          qualifiedTierConfig,
          (campaignId, queueType) =>
            this.voucherFormsService.generateQueueId(campaignId, queueType),
        );
      }
    }
    // compute finance status- update finance status based on payment transactions
    const financeStatus = this.calculateFinanceStatus(
      updatedTransactions,
      updatedVoucher.paymentDetails.amountPayable,
    );
    // preserve REFUNDED state if already refunded
    updatedVoucher.financeStatus =
      updatedVoucher.financeStatus === PaymentTxStatusEnum.REFUNDED
        ? updatedVoucher.financeStatus
        : financeStatus;

    // update vocher status
    this.updateVoucherStatus(updatedVoucher);

    // Update chronology
    updatedVoucher.chronology = determineVoucherChronology(updatedVoucher);

    // Save all changes
    await manager.save(updatedVoucher);
    return updatedVoucher;
  }

  private async getVouchers(
    id: number,
    targetPRID: string,
    manager: EntityManager,
  ) {
    const [updatedVoucher, source] = await Promise.all([
      manager.findOne(VoucherForm, {
        where: { id },
        relations: ['campaign'],
      }),
      manager.findOne(VoucherForm, {
        where: { uniqueReferenceId: targetPRID, isDeleted: false },
        relations: ['campaign'],
      }),
    ]);

    if (!source) throw new NotFoundException('Source voucher not found');

    return { updatedVoucher, source };
  }

  private getQualifiedTierForQueue(
    voucher: VoucherForm,
    metrics: ReturnType<typeof calculatePaymentMetrics>,
  ): (typeof TIER_CONFIG)[number] | null {
    const thresholds = resolveThresholds(voucher.campaign, voucher);
    const realized = metrics.realizedAmount;
    //  qualified tier
    if (
      thresholds.preferential != null &&
      realized >= thresholds.preferential &&
      voucher.preEoiId
    ) {
      return TIER_CONFIG.find(
        (t) => t.tier === VoucherIdFieldNameEnum.PRE_EOI_ID,
      );
    }

    if (
      thresholds.standard != null &&
      realized >= thresholds.standard &&
      voucher.stdEoiId
    ) {
      return TIER_CONFIG.find(
        (t) => t.tier === VoucherIdFieldNameEnum.STD_EOI_ID,
      );
    }

    if (
      thresholds.voucher != null &&
      realized >= thresholds.voucher &&
      voucher.paidVoucherId
    ) {
      return TIER_CONFIG.find(
        (t) => t.tier === VoucherIdFieldNameEnum.PAID_VOUCHER_ID,
      );
    }

    return null;
  }

  private updateVoucherStatus(voucher: VoucherForm): void {
    if (
      voucher.voucherFormStatus ===
        VoucherFormStatusEnum.MIS_REQUESTED_CHANGES ||
      voucher.voucherFormStatus === VoucherFormStatusEnum.MIS_UPDATED
    ) {
      voucher.voucherFormStatus = VoucherFormStatusEnum.MIS_UPDATED;
      return;
    }

    if (
      voucher.voucherFormStatus ===
        VoucherFormStatusEnum.CRM_REQUESTED_CHANGES ||
      voucher.voucherFormStatus === VoucherFormStatusEnum.CRM_UPDATED
    ) {
      voucher.voucherFormStatus = VoucherFormStatusEnum.CRM_UPDATED;
      return;
    }

    if (
      voucher.voucherFormStatus === VoucherFormStatusEnum.CREATED ||
      voucher.voucherFormStatus === VoucherFormStatusEnum.IN_PROGRESS
    ) {
      voucher.voucherFormStatus = VoucherFormStatusEnum.UNVERIFIED;
      voucher.submittedAt = new Date();
    }
  }

  private async resetSourceVoucher(
    manager: EntityManager,
    source: VoucherForm,
    isEmpty: boolean,
  ): Promise<void> {
    // JSON update
    source.paymentDetails = {
      ...(source.paymentDetails || {}),
      totalAmountPaid: 0,
    };

    // IDs
    source.stdEoiId = null;
    source.preEoiId = null;
    source.paidVoucherId = null;

    // timestamps
    source.stdEoiIssuedAt = null;
    source.preEoiIssuedAt = null;
    source.voucherIssuedAt = null;

    // queue
    source.queueId = null;
    source.voucherQueueIssuedAt = null;

    // sequence ids
    source.voucherSequenceId = null;
    source.standardSequenceId = null;
    source.preferentialSequenceId = null;

    if (isEmpty) {
      source.voucherFormStatus = VoucherFormStatusEnum.CREATED;
      source.financeStatus = PaymentTxStatusEnum.UNVERIFIED;
    }
    source.paymentStatus = VoucherPaymentStatus.PENDING;

    // save
    await manager.save(source);
  }

  /**
   * Retrieves Change request(s) for a voucher.
   * - If both id and voucherId are provided: returns the specific request and history (excluding current id)
   * - If only voucherId is provided: returns only history
   */
  async getVoucherChangeRequest(dto: GetVoucherChangeRequestDto): Promise<any> {
    try {
      const { voucherId, id } = dto;

      // Build history query - always fetch history for the voucher
      const historyWhere: any = {
        voucherId,
        isDeleted: 0,
      };

      // If id is provided, exclude it from history
      if (id) {
        historyWhere.id = Not(id);
      }

      const history = await this.voucherChangeRequestRepository.find({
        where: historyWhere,
        order: { createdAt: 'DESC' },
      });

      // If only voucherId is provided, return only history
      if (!id) {
        return {
          statusCode: SUCCESS,
          message: 'Change request history retrieved successfully',
          data: {
            history,
          },
        };
      }

      // If both id and voucherId are provided, fetch the specific request
      const request = await this.voucherChangeRequestRepository.findOne({
        where: { id, isDeleted: 0 },
      });

      if (!request) {
        throw new NotFoundException('Change request not found');
      }

      // Verify that the request belongs to the provided voucherId
      if (request.voucherId !== voucherId) {
        throw new BadRequestException(
          'Change request does not belong to the provided voucher',
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'Change request retrieved successfully',
        data: {
          ...request,
          history,
        },
      };
    } catch (error) {
      logger.error('getVoucherChangeRequest failed:', error);
      logsAndErrorHandling(
        'eoiManagementService - getVoucherChangeRequest',
        error,
        {
          dto,
        },
      );
    }
  }

  async listVoucherChangeRequests(dto: CommonFindAllQueryDto): Promise<any> {
    try {
      const {
        page = DEFAULT_PAGE,
        limit = DEFAULT_LIMIT,
        search,
        sortBy,
      } = dto;

      const skip = (page - 1) * limit;

      const qb = this.voucherChangeRequestRepository
        .createQueryBuilder('scr')
        .leftJoin('scr.voucher', 'voucher')
        .leftJoin('scr.campaign', 'campaign')
        .select([
          'scr.id',
          'scr.voucherId',
          'scr.status',
          'scr.currentData',
          'scr.createdAt',
          'scr.reviewedAt',
          'voucher.uniqueReferenceId',
          'voucher.paidVoucherId',
          'voucher.sfdcEnquiryId',
          'voucher.primarySource',
          'campaign.campaignName',
        ])
        .where('scr.isDeleted = :isDeleted', { isDeleted: 0 });

      // Apply search filter if provided
      if (search && search.trim().length > 0) {
        const searchTerm = `%${search.trim()}%`;
        qb.andWhere(
          '(voucher.uniqueReferenceId LIKE :search OR voucher.paidVoucherId LIKE :search OR voucher.sfdcEnquiryId LIKE :search)',
          { search: searchTerm },
        );
      }

      // Apply sorting - default to createdAt DESC
      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        const sortDirection =
          direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        if (field === 'uniqueReferenceId') {
          qb.orderBy('voucher.uniqueReferenceId', sortDirection);
        } else if (field === 'status') {
          qb.orderBy('scr.status', sortDirection);
        } else {
          qb.orderBy('scr.createdAt', 'DESC');
        }
      } else {
        qb.orderBy('scr.createdAt', 'DESC');
      }

      // Apply pagination
      qb.take(limit).skip(skip);

      const [data, total] = await qb.getManyAndCount();

      // Map the data to include only required fields and extract customer name
      const mappedData = data.map((item) => {
        const customerName =
          item.currentData?.firstName && item.currentData?.lastName
            ? `${item.currentData.firstName} ${item.currentData.lastName}`.trim()
            : null;

        return {
          id: item.id,
          uniqueReferenceId: item.voucher?.uniqueReferenceId || null,
          paidVoucherId: item.voucher?.paidVoucherId || null,
          voucherId: item?.voucherId,
          sfdcEnquiryId: item.voucher?.sfdcEnquiryId || null,
          primarySource: item.voucher?.primarySource || null,
          customerName,
          campaignName: item.campaign?.campaignName || null,
          requestedDate: item.createdAt,
          reviewedDate: item.reviewedAt,
          status: item.status,
        };
      });

      return {
        statusCode: SUCCESS,
        message: 'Change requests retrieved successfully',
        data: {
          requests: mappedData,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      logger.error('listVoucherChangeRequests failed:', error);
      logsAndErrorHandling(
        'eoiManagementService - listVoucherChangeRequests',
        error,
        { dto },
      );
    }
  }

  /**
   * Updates applicant1 personal details from newData based on field name
   */
  private updateApplicantPersonalDetail(
    voucher: VoucherForm,
    field: string,
    newData: Record<string, any>,
  ): void {
    if (!voucher.applicant1) {
      voucher.applicant1 = {};
    }
    if (!voucher.applicant1.personalDetails) {
      voucher.applicant1.personalDetails = {};
    }

    const personalDetails = voucher.applicant1.personalDetails;
    const fieldMapping: Record<string, string> = {
      firstName: 'firstName',
      lastName: 'lastName',
      countryCode: 'countryCode',
      contactNumber: 'contactNumber',
    };

    // Handle email field (can be emailId or emailAddress)
    if (field === 'emailId' && newData.emailId !== undefined) {
      personalDetails.emailAddress = newData.emailId;
      return;
    }

    // Handle other fields using mapping
    const targetField = fieldMapping[field];
    if (targetField && newData[targetField] !== undefined) {
      personalDetails[targetField] = newData[targetField];
    }
  }

  /**
   * Handles sourceDetails update with special logic for channelPartner
   */
  private handleSourceDetailsUpdate(
    newData: Record<string, any>,
    updateData: Partial<VoucherForm>,
  ): void {
    if (!newData.sourceDetails) {
      return;
    }

    const isChannelPartner =
      newData.primarySource === PrimarySourceEnum.CHANNEL_PARTNER;

    if (isChannelPartner) {
      const sourceDetails = newData.sourceDetails || {};
      const cpLinkId = sourceDetails.cp_link_id;

      updateData.sourceDetails = {
        channelPartner: sourceDetails.channelPartner,
      };

      if (cpLinkId !== undefined) {
        updateData.cpLinkId = cpLinkId;
      }
    } else {
      updateData.sourceDetails = newData.sourceDetails;
    }
  }

  /**
   * Updates source fields in updateData when primarySource is updated
   * Also updates secondarySource and sourceDetails if present in newData
   */
  private updateSourceFieldsInUpdateData(
    newData: Record<string, any>,
    oldData: Record<string, any>,
    updateData: Partial<VoucherForm>,
  ): void {
    // Update primarySource
    if (newData.primarySource !== undefined) {
      updateData.primarySource = newData.primarySource;
    }

    // Update secondarySource if present in newData
    if (newData.secondarySource !== undefined) {
      updateData.secondarySource = newData.secondarySource;
    }

    // Update sourceDetails if present in newData
    if (newData.sourceDetails !== undefined) {
      this.handleSourceDetailsUpdate(newData, updateData);
    }

    if (
      oldData.primarySource === PrimarySourceEnum.CHANNEL_PARTNER &&
      newData.primarySource !== PrimarySourceEnum.CHANNEL_PARTNER
    ) {
      updateData.cpLinkId = null;
    }
  }

  /**
   * Applies swapped fields to voucher update data
   */
  private applySwappedFieldsToVoucher(
    voucher: VoucherForm,
    swappedFields: string[],
    newData: Record<string, any>,
    oldData: Record<string, any>,
  ): Partial<VoucherForm> {
    const updateData: Partial<VoucherForm> = {
      isChangeRequestPending: false,
    };

    const personalDetailFields = new Set([
      'firstName',
      'lastName',
      'emailId',
      'countryCode',
      'contactNumber',
    ]);

    for (const field of swappedFields) {
      if (
        field === 'uniqueReferenceId' &&
        newData.uniqueReferenceId !== undefined
      ) {
        updateData.uniqueReferenceId = newData.uniqueReferenceId;
        continue;
      }
      if (field === 'sfdcEnquiryId' && newData.sfdcEnquiryId !== undefined) {
        updateData.sfdcEnquiryId = newData.sfdcEnquiryId;
        continue;
      }
      if (field === 'primarySource') {
        // Update primarySource, and also secondarySource and sourceDetails if present in newData
        this.updateSourceFieldsInUpdateData(newData, oldData, updateData);
        continue;
      }
      if (personalDetailFields.has(field)) {
        this.updateApplicantPersonalDetail(voucher, field, newData);
      }
    }

    updateData.applicant1 = voucher.applicant1;
    return updateData;
  }

  /**
   * Approves or rejects a Change request.
   * - If rejected: updates status and sets isChangeRequestPending = false
   * - If approved: updates status, reviewer fields, and applies swapped fields to voucher
   */
  async approveVoucherChangeRequest(
    user: any,
    dto: ApproveVoucherChangeRequestDto,
  ): Promise<any> {
    try {
      const { id, voucherId, status, approvalProof, remark } = dto;

      // Fetch the Change request with voucher and nested relations
      const voucherChangeRequest =
        await this.voucherChangeRequestRepository.findOne({
          where: { id: id, isDeleted: 0 },
          relations: ['voucher', 'voucher.createdBy', 'voucher.closingRm'],
        });

      if (!voucherChangeRequest) {
        throw new NotFoundException('Change request not found');
      }

      if (!voucherChangeRequest.voucher) {
        throw new NotFoundException('Voucher not found');
      }

      if (
        voucherChangeRequest.status === VoucherChangeRequestStatus.APPROVED ||
        voucherChangeRequest.status === VoucherChangeRequestStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Change request is already ${voucherChangeRequest.status}`,
        );
      }

      // Verify the request belongs to the provided voucher
      if (voucherChangeRequest.voucherId !== voucherId) {
        throw new BadRequestException(
          'Change request does not belong to the provided voucher',
        );
      }

      const voucher = voucherChangeRequest.voucher;

      const reviewedBy = user?.dbId;
      const reviewedAt = new Date();

      // Execute all updates within a transaction
      const result = await this.voucherFormRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Update Change request
          voucherChangeRequest.status = status;
          voucherChangeRequest.reviewedBy = reviewedBy;
          voucherChangeRequest.reviewedAt = reviewedAt;
          voucherChangeRequest.reviewerRemark = remark ?? null;
          voucherChangeRequest.approvalProof = approvalProof ?? null;

          await transactionalEntityManager.save(voucherChangeRequest);

          let message = 'Change request updated successfully';

          // If rejected, just set isChangeRequestPending = false
          if (status === VoucherChangeRequestStatus.REJECTED) {
            await transactionalEntityManager.update(
              VoucherForm,
              { id: voucherId },
              { isChangeRequestPending: false },
            );
            message = 'Change request rejected successfully';
          }

          // If approved, update voucher fields from swappedFields
          if (status === VoucherChangeRequestStatus.APPROVED) {
            const voucher = await transactionalEntityManager.findOne(
              VoucherForm,
              { where: { id: voucherId } },
            );

            if (!voucher) {
              throw new NotFoundException('Voucher not found');
            }

            const newData = voucherChangeRequest.newData || {};
            const oldData = voucherChangeRequest.currentData || {};
            const swappedFields = voucherChangeRequest.swappedFields || [];

            //amount transfer check
            const isAmountTransfer = swappedFields.includes('amountPaid');
            const paymentIds = voucherChangeRequest.newData?.paymentIds || [];
            if (isAmountTransfer && paymentIds.length > 0) {
              await this.transferVoucherAmount(
                voucher,
                voucherChangeRequest.targetPRID,
                paymentIds,
                transactionalEntityManager,
              );
            }

            const updateData = this.applySwappedFieldsToVoucher(
              voucher,
              swappedFields,
              newData,
              oldData,
            );

            // Update voucher with all changes
            await transactionalEntityManager.update(
              VoucherForm,
              { id: voucherId },
              updateData,
            );
            message =
              'Change request approved and voucher updated successfully';
          }

          return message;
        },
      );

      // Send rejection email if status is REJECTED
      if (status === VoucherChangeRequestStatus.REJECTED) {
        await this.sendVoucherChangeRejectionEmail(voucher, remark);
      }

      // Send approval email if status is APPROVED
      if (status === VoucherChangeRequestStatus.APPROVED) {
        await this.sendVoucherChangeApprovalEmail(
          voucher,
          voucherChangeRequest,
          remark,
        );
      }

      return {
        statusCode: SUCCESS,
        message: result,
        data: null,
      };
    } catch (error) {
      logger.error('approveVoucherChangeRequest failed:', error);
      logsAndErrorHandling(
        'eoiManagementService - approveVoucherChangeRequest',
        error,
        {
          dto,
          userId: user?.dbId,
        },
      );
    }
  }

  /**
   * Returns role-based pending counts for cancellation requests (from vouchers table)
   * and change requests (from voucher_change_requests). Read-only, status-driven.
   * - Cancellation: RSH/ADMIN = status 15; CRM = status 16 or 17 (never 19).
   * - Change requests: MIS = REQUESTED; CRM = APPROVED (pending CRM action).
   */
  async getTabCounts(user: any): Promise<any> {
    const role = user?.role;
    let cancellationCount = 0;
    let changeRequestCount = 0;
    let approveUnitCount = 0;

    // Cancellation counts from vouchers table (voucher_status)
    if (
      [
        RolesEnum.SUPER_ADMIN,
        RolesEnum.ADMIN,
        RolesEnum.SALES_RSH,
        RolesEnum.BIS,
      ].includes(role as RolesEnum)
    ) {
      cancellationCount = await this.voucherFormRepository.count({
        where: {
          voucherFormStatus: In([
            VoucherFormStatusEnum.CANCEL_REQUESTED,
            VoucherFormStatusEnum.CANCEL_ACCEPTED,
            VoucherFormStatusEnum.CANCEL_APPROVED,
          ]),
          isDeleted: false,
        },
      });
    } else if (role === RolesEnum.RM) {
      cancellationCount = await this.voucherFormRepository
        .createQueryBuilder('voucher')
        .where('voucher.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('voucher.voucherFormStatus IN (:...statuses)', {
          statuses: [
            VoucherFormStatusEnum.CANCEL_REQUESTED,
            VoucherFormStatusEnum.CANCEL_ACCEPTED,
            VoucherFormStatusEnum.CANCEL_APPROVED,
          ],
        })
        .andWhere(
          '(voucher.createdBy = :userId OR voucher.closingRm = :userId)',
          { userId: user.dbId },
        )
        .getCount();
    } else if (role === RolesEnum.CRM) {
      cancellationCount = await this.voucherFormRepository.count({
        where: {
          voucherFormStatus: In([
            VoucherFormStatusEnum.CANCEL_ACCEPTED,
            VoucherFormStatusEnum.CANCEL_APPROVED,
          ]),
          isDeleted: false,
        },
      });
    }

    // Change request counts from voucher_change_requests (status)
    if (
      role === RolesEnum.MIS ||
      role === RolesEnum.RM ||
      role === RolesEnum.BIS
    ) {
      changeRequestCount = await this.voucherChangeRequestRepository.count({
        where: {
          status: VoucherChangeRequestStatus.REQUESTED,
          isDeleted: 0,
        },
      });
    } else if (role === RolesEnum.CRM) {
      changeRequestCount = await this.voucherChangeRequestRepository.count({
        where: {
          status: VoucherChangeRequestStatus.APPROVED,
          isDeleted: 0,
        },
      });
    }

    const query = this.blockingRepo
      .createQueryBuilder('blocking')
      .innerJoin('blocking.campaign', 'campaign')
      .where('blocking.status = :status', { status: BlockingStatus.PENDING })
      .andWhere('blocking.approvalExpiry IS NOT NULL');

    if (role !== RolesEnum.SUPER_ADMIN) {
      query.andWhere(
        `(
          campaign.unit_approver_id = :userId
          OR JSON_CONTAINS(campaign.additional_approvers, JSON_ARRAY(:userId)) 
          OR blocking.blocking_initiated_by = :userId
        )`,
        { userId: user?.dbId },
      );
    }
    approveUnitCount = await query.getCount();

    return {
      statusCode: SUCCESS,
      message: 'Tab counts fetched successfully',
      data: {
        cancellationCount,
        changeRequestCount,
        approveUnitCount,
      },
    };
  }

  /**
   * Updates SFDC enquiry ID and/or opportunity ID for a voucher.
   * Ensures uniqueness across the entire vouchers table and validates request data.
   * Uses transactions to prevent race conditions and ensure data consistency.
   *
   * @param updateDto - DTO containing voucherId (required) and optional sfdcEnquiryId/opportunityId
   * @returns Promise<any> Response with updated voucher data
   * @throws NotFoundException if voucher with given voucherId is not found
   * @throws BadRequestException if neither optional field is provided, or if provided values are already in use
   * @throws InternalServerErrorException for database constraint violations or other errors
   */
  async updateSfdcIds(user: any, updateDto: any): Promise<any> {
    logger.info(
      `User ${user?.dbId} is updating SFDC IDs for voucher ${updateDto.voucherId}`,
    );
    return this.voucherFormRepository.manager.transaction(async (manager) => {
      const { voucherId, sfdcEnquiryId, opportunityId } = updateDto;

      const trimmedSfdcEnquiryId = sfdcEnquiryId?.trim();
      const trimmedOpportunityId = opportunityId?.trim();

      if (!trimmedSfdcEnquiryId && !trimmedOpportunityId) {
        throw new BadRequestException(
          'At least one of sfdcEnquiryId or opportunityId must be provided',
        );
      }

      const voucher = await manager.findOne(VoucherForm, {
        where: { id: voucherId, isDeleted: false },
      });

      if (!voucher) {
        throw new NotFoundException(
          `Voucher with ID ${voucherId} does not exist`,
        );
      }

      const duplicateVoucher = await manager.findOne(VoucherForm, {
        where: [
          ...(trimmedSfdcEnquiryId
            ? [
                {
                  sfdcEnquiryId: trimmedSfdcEnquiryId,
                  id: Not(voucherId),
                  isDeleted: false,
                },
              ]
            : []),
          ...(trimmedOpportunityId
            ? [
                {
                  opportunityId: trimmedOpportunityId,
                  id: Not(voucherId),
                  isDeleted: false,
                },
              ]
            : []),
        ],
      });

      if (duplicateVoucher) {
        if (
          trimmedSfdcEnquiryId &&
          duplicateVoucher.sfdcEnquiryId === trimmedSfdcEnquiryId
        ) {
          throw new BadRequestException(
            `sfdcEnquiryId "${trimmedSfdcEnquiryId}" already exists for voucher with Payment Ref ID "${duplicateVoucher.uniqueReferenceId}"`,
          );
        }

        if (
          trimmedOpportunityId &&
          duplicateVoucher.opportunityId === trimmedOpportunityId
        ) {
          throw new BadRequestException(
            `opportunityId "${trimmedOpportunityId}" already exists for voucher with Payment Ref ID "${duplicateVoucher.uniqueReferenceId}"`,
          );
        }
      }

      const updatePayload: Partial<VoucherForm> = {};
      if (trimmedSfdcEnquiryId) {
        updatePayload.sfdcEnquiryId = trimmedSfdcEnquiryId;
        updatePayload.isLeadCreated = true; // Assuming that setting sfdcEnquiryId means a lead has been created in SFDC
      }

      if (trimmedOpportunityId) {
        updatePayload.opportunityId = trimmedOpportunityId;
      }
      try {
        await manager.update(VoucherForm, { id: voucherId }, updatePayload);
      } catch (error: any) {
        logger.error('SFDC update failed', error);

        return logsAndErrorHandling(
          'eoiManagementService - updateSfdcIds',
          error,
          {
            updateDto,
          },
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'SFDC IDs updated successfully',
        data: {
          id: voucherId,
          sfdcEnquiryId: updateDto.sfdcEnquiryId,
          opportunityId: updateDto.opportunityId,
        },
      };
    });
  }
  async sampleExcel() {
    return {
      message: 'Sample File fetched successfully',
      data: {
        s3Path: 'vouchers/voucher_transaction_sample.xlsx',
      },
    };
  }

  async uploadReceipt(
    paymentId: number,
    uploadReceiptDto: UploadReceiptDto,
  ): Promise<any> {
    try {
      const payment = await this.voucherPaymentRepository.findOne({
        where: { id: paymentId, status: PaymentTxStatusEnum.VERIFIED },
      });

      if (!payment) {
        throw new NotFoundException('Transaction not found');
      }
      payment.receiptImage = uploadReceiptDto.receiptImage;

      await this.voucherPaymentRepository.save(payment);

      return {
        statusCode: SUCCESS,
        message: 'Receipt saved successfully',
        data: {
          id: paymentId,
        },
      };
    } catch (error) {
      logger.error('Failed to update receipt:', error);
      logsAndErrorHandling('eoiManagementService - uploadReceipt', error, {
        paymentId,
      });
    }
  }

  async getMappedTransactionsByVoucher(voucherId: number) {
    const payments = await this.voucherPaymentRepository
      .createQueryBuilder('vp')
      .where('vp.voucherId = :voucherId', { voucherId })
      .andWhere('vp.isUnitMapped = :isUnitMapped', { isUnitMapped: true })
      .orderBy('vp.createdAt', 'DESC')
      .getMany();

    return {
      statusCode: SUCCESS,
      message: 'Mapped transactions fetched successfully',
      data: payments,
    };
  }
}
