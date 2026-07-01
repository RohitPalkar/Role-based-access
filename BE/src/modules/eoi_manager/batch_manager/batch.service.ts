import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { EoiBatch } from './entities/batch.entity';
import { EoiBatchSlot } from './entities/slot.entity';
import { CreateUpdateBatchDto } from './dto/create-batch.dto';
import {
  BatchQueueJobs,
  BatchStage,
  BatchStatus,
  BatchVoucherStatus,
  SlotStatusEnum,
} from 'src/enums/batch-manager.enums';
import { logger } from 'src/logger/logger';
import {
  BATCH_NOTIFICATION_QUEUE,
  IST_TIME_ZONE,
  SUCCESS,
} from 'src/config/constants';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { ListBatchesDto } from './dto/list-batch.dto';
import { BatchDayConfigDto } from './dto/batch-days.dto';
import {
  Booking,
  EoiBatchDay,
  EoiBatchVoucher,
  EoiCampaign,
  InventoryType,
  VoucherForm,
} from 'src/entities';
import { minutesToTime, timeToMinutes } from 'src/helpers/date.helper';
import {
  EOITypeEnum,
  PreferenceType,
  VoucherFormType,
  VoucherPaymentStatus,
} from 'src/enums/eoi-form.enums';
import { GetUnmappedCountDto } from './dto/unMapped-count.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueJobAuditService } from 'src/modules/queue_audit/queue-job-audit.service';
import { QUEUE_JOB_AUDIT_EVENT } from 'src/modules/queue_audit/queue-job-audit.constants';
import { ConfigService } from '@nestjs/config';
import { fromZonedTime, format } from 'date-fns-tz';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { ResidentStatus } from 'src/enums/resident-status.enum';
import { PaymentStats } from './interface/batch-stats.interface';

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(EoiBatch)
    private readonly batchRepo: Repository<EoiBatch>,
    @InjectRepository(EoiBatchSlot)
    private readonly slotRepo: Repository<EoiBatchSlot>,

    @InjectRepository(VoucherForm)
    private readonly voucherRepo: Repository<VoucherForm>,
    @InjectRepository(InventoryType)
    private readonly inventoryTyperepo: Repository<InventoryType>,
    @InjectRepository(EoiBatchVoucher)
    private readonly batchVoucherRepo: Repository<EoiBatchVoucher>,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(BATCH_NOTIFICATION_QUEUE)
    private readonly batchNotificationQueue: Queue,
    private readonly queueJobAuditService: QueueJobAuditService,
    private readonly configService: ConfigService,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(EoiCampaign)
    private readonly eoiCampaignRepository: Repository<EoiCampaign>,
  ) {}

  private static extractBatchDates(
    days:
      | BatchDayConfigDto[]
      | { date: string; startTime: string; endTime: string }[],
  ): { startDate: Date; endDate: Date } {
    if (!days || days.length === 0) return { startDate: null, endDate: null };
    const sortedDays = [...days].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const firstDay = sortedDays[0];
    const lastDay = sortedDays[sortedDays.length - 1];

    return {
      startDate: new Date(`${firstDay.date}T${firstDay.startTime}:00`),
      endDate: new Date(`${lastDay.date}T${lastDay.endTime}:00`),
    };
  }

  /**
   * Core slot-generation algorithm (pure — no DB side effects).
   * Business rule #1: requiredSlots = ceil(totalUsers / capacityPerSlot)
   * Business rule #2: slotsPerDay  = floor((dayEnd - dayStart) / slotDuration)
   * Business rule #6: slots NEVER spill from one day into the next.
   */
  private static buildSlotsForBatch(
    batchId: string,
    capacityPerSlot: number,
    slotDuration: number,
    totalUsers: number,
    days:
      | BatchDayConfigDto[]
      | { date: string; startTime: string; endTime: string }[],
  ): Array<Partial<EoiBatchSlot>> {
    const requiredSlots = Math.ceil(totalUsers / capacityPerSlot);

    const result: Array<Partial<EoiBatchSlot>> = [];

    let created = 0;
    let totalPossible = 0;
    let globalSequence = 1;

    for (const day of days) {
      const dayStartMins = timeToMinutes(day.startTime);
      const dayEndMins = timeToMinutes(day.endTime);

      if (dayEndMins <= dayStartMins) {
        throw new BadRequestException(
          `Invalid time range: End Time must be later than Start Time for ${format(
            new Date(day.date),
            'dd-MMM-yyyy',
          )}.`,
        );
      }

      const slotsThisDayPossible = Math.floor(
        (dayEndMins - dayStartMins) / slotDuration,
      );

      totalPossible += slotsThisDayPossible;
    }

    if (totalPossible < requiredSlots) {
      throw new BadRequestException(
        `Only ${totalPossible} slots can be created with the current configuration, but ${requiredSlots} slots are required for ${totalUsers} users. Please add more days, extend the time range, or reduce slot duration.`,
      );
    }

    for (const day of days) {
      if (created >= requiredSlots) break;

      const dayStartMins = timeToMinutes(day.startTime);
      const dayEndMins = timeToMinutes(day.endTime);

      const slotsThisDayPossible = Math.floor(
        (dayEndMins - dayStartMins) / slotDuration,
      );

      const slotsThisDay = Math.min(
        slotsThisDayPossible,
        requiredSlots - created,
      );

      for (let seq = 0; seq < slotsThisDay; seq++) {
        const startMins = dayStartMins + seq * slotDuration;

        result.push({
          batchId,
          date: day.date,
          sequence: globalSequence,
          name: `Batch ${globalSequence}`,
          startTime: minutesToTime(startMins),
          endTime: minutesToTime(startMins + slotDuration),
          duration: slotDuration,
          capacity: capacityPerSlot,
        });

        created++;
        globalSequence++;
      }
    }
    return result;
  }

  /**
   * Fetches the paginated list of batches based on search/filters
   */
  async listBatches(queryDto: ListBatchesDto, user?: any): Promise<any> {
    logger.info('Fetching list of batches', user?.name);

    try {
      //update expired active batches to archived
      await this.updateExpiredBatchStatus();
      const { page, limit, sortBy } = queryDto;
      const skip = (page - 1) * limit;

      // Base query for filters (used in both queries)
      const baseQuery = this.batchRepo
        .createQueryBuilder('batch')
        .leftJoin('batch.campaign', 'campaign')
        .leftJoin('batch.slots', 'slots')
        .leftJoin('batch.batchVouchers', 'batchVouchers');

      this.applyBatchFilters(baseQuery, queryDto);
      // Sorting
      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        baseQuery.orderBy(
          `batch.${field}`,
          (direction || 'DESC').toUpperCase() as 'ASC' | 'DESC',
        );
      } else {
        baseQuery.orderBy('batch.createdAt', 'DESC');
      }

      // Data query (with aggregation)
      const dataQuery = baseQuery.clone();

      dataQuery
        .select([
          'batch.id AS batch_id',
          'batch.name AS batch_name',
          'batch.stage AS batch_stage',
          'batch.startDate AS batch_startDate',
          'batch.endDate AS batch_endDate',
          'batch.capacityPerSlot AS capacity_per_slot',
          'batch.slotDuration AS batch_slotDuration',
          'batch.createdAt AS batch_createdAt',
          'batch.isUserMapped AS is_user_mapped',
          'batch.isNotified AS is_Notified',
          'batch.notifyAt AS notify_at',
          'campaign.id AS campaign_id',
          'campaign.campaign_name AS campaign_name',
        ])
        .addSelect('COUNT(slots.id)', 'slotCount')
        .addSelect(
          `MAX(
            CASE 
              WHEN batchVouchers.status = '${BatchVoucherStatus.ATTENDED}' 
              THEN 1 
              ELSE 0 
            END
          )`,
          'isAttended',
        )
        .groupBy('batch.id')
        .addGroupBy('campaign.id')
        .offset(skip)
        .limit(limit);

      // Count query (NO joins to slots → avoid inflated count)
      const countQuery = this.batchRepo
        .createQueryBuilder('batch')
        .leftJoin('batch.campaign', 'campaign');

      this.applyBatchFilters(countQuery, queryDto);

      const [rawData, total] = await Promise.all([
        dataQuery.getRawMany(),
        countQuery.getCount(),
      ]);

      // 🔹 Final mapping (clean response)
      const result = rawData.map((r) => ({
        id: r.batch_id,
        name: r.batch_name,
        stage: r.batch_stage,
        createdAt: r.batch_createdAt,
        startDate: r.batch_startDate,
        endDate: r.batch_endDate,
        campaignName: r.campaign_name,
        campaignId: r.campaign_id,
        slotDuration: r.batch_slotDuration,
        capacityPerSlot: r.capacity_per_slot,
        isUserMapped: r.is_user_mapped,
        isNotified: r.is_Notified,
        notifyAt: r.notify_at,
        slotCount: Number(r.slotCount),
        isAttended: Number(r.isAttended) === 1,
      }));

      return {
        statusCode: SUCCESS,
        message: 'Batches fetched successfully.',
        data: {
          result,
          total,
        },
      };
    } catch (e) {
      logger.error('Error occurred while fetching batches');
      return logsAndErrorHandling('BatchService - listBatches', e, {
        queryDto,
      });
    }
  }

  async updateExpiredBatchStatus(): Promise<void> {
    await this.batchRepo
      .createQueryBuilder()
      .update(EoiBatch)
      .set({
        status: BatchStatus.ARCHIVED,
      })
      .where('status = :activeStatus', {
        activeStatus: BatchStatus.ACTIVE,
      })
      .andWhere('endDate < :currentDate', {
        currentDate: new Date(),
      })
      .execute();
  }

  private applyBatchFilters(
    query: SelectQueryBuilder<EoiBatch>,
    queryDto: ListBatchesDto,
  ) {
    const { campaignId, stage, status, search } = queryDto;

    if (campaignId) {
      query.andWhere('batch.campaignId = :campaignId', {
        campaignId,
      });
    }

    if (stage) {
      query.andWhere('batch.stage = :stage', {
        stage,
      });
    }

    if (status) {
      query.andWhere('batch.status = :status', {
        status,
      });
    }

    if (search) {
      query.andWhere('LOWER(campaign.campaignName) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    return query;
  }

  /**
   * Create a new batch with slots
   * @param dto as CreateUpdateBatchDto
   * @returns EoiBatch
   */
  async createBatch(dto: CreateUpdateBatchDto): Promise<any> {
    // Validate duplicate dates
    const uniqueDates = new Set<string>();

    for (const day of dto.days) {
      if (uniqueDates.has(day.date)) {
        throw new BadRequestException(
          `Duplicate day configuration found for date '${day.date}'.`,
        );
      }

      uniqueDates.add(day.date);
      const startMins = timeToMinutes(day.startTime);
      const endMins = timeToMinutes(day.endTime);

      if (endMins <= startMins) {
        throw new BadRequestException(
          `Invalid time range: End Time must be later than Start Time for ${format(
            new Date(day.date),
            'dd-MMM-yyyy',
          )}.`,
        );
      }
    }

    const existingBatch = await this.batchRepo.findOne({
      where: {
        name: dto.name.trim(),
        deletedAt: IsNull(),
      },
    });

    if (existingBatch) {
      throw new ConflictException(`Batch name '${dto.name}' already exists.`);
    }
    const totalRecords = await this.getEligibleVoucherCount({
      campaignId: dto.campaignId,
      residentialStatus: dto.residentialStatus,
      preferenceIds: dto.preferenceIds,
      typology: dto.typology,
      stage: dto.stage,
    });
    if (totalRecords === 0) {
      throw new BadRequestException(
        'No eligible vouchers found for the selected criteria.',
      );
    }

    const { startDate, endDate } = BatchService.extractBatchDates(dto.days);
    return await this.batchRepo.manager.transaction(
      async (manager: EntityManager) => {
        let batch = manager.create(EoiBatch, {
          campaignId: dto.campaignId,
          name: dto.name.trim(),
          stage: dto.stage,
          residentialStatus: dto.residentialStatus,
          preferenceIds: dto.preferenceIds,
          typology: dto.typology || [],
          slotDuration: dto.slotDuration,
          openBatchBefore: dto.openBatchBefore,
          capacityPerSlot: dto.capacityPerSlot,
          totalUsers: totalRecords,
          startDate,
          endDate,
          status: BatchStatus.ACTIVE,
        });

        batch = await manager.save(EoiBatch, batch);
        // Explicitly create days
        const days = dto.days.map((day) => ({
          batchId: batch.id,
          date: day.date,
          startTime: day.startTime,
          endTime: day.endTime,
        }));
        await manager.insert(EoiBatchDay, days);

        // Generate slots
        const slots = BatchService.buildSlotsForBatch(
          batch.id,
          dto.capacityPerSlot,
          dto.slotDuration,
          totalRecords,
          dto.days,
        );

        if (slots.length > 0) await manager.insert(EoiBatchSlot, slots);

        return {
          statusCode: SUCCESS,
          message: `Batch '${batch.name}' created successfully with ${slots.length} slots.`,
          data: {
            id: batch.id,
            name: batch.name,
            slotsGenerated: slots.length,
          },
        };
      },
    );
  }

  /**
   * Update batch fields and regenerate slots.
   * Business rule #7: only explicit APIs can add slots.
   * Business rule #5: regenerated slots must respect day boundaries.
   * Business rule #8: blocked if batch already MAPPED.
   * @param id batchId
   * @param dto UpdateBatchDto
   * @returns number of slots regenerated
   */
  async updateBatch(batchId: string, dto: CreateUpdateBatchDto): Promise<any> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['days'],
    });

    if (!batch) {
      throw new NotFoundException(`Batch with id '${batchId}' not found.`);
    }

    // Once users are mapped, batch should become immutable
    if (batch.isUserMapped) {
      throw new BadRequestException(
        'Batch cannot be updated because users are already mapped.',
      );
    }

    const totalRecords = await this.getEligibleVoucherCount({
      campaignId: dto.campaignId,
      residentialStatus: dto.residentialStatus,
      preferenceIds: dto.preferenceIds,
      typology: dto?.typology,
      stage: dto.stage,
    });
    if (totalRecords === 0) {
      throw new BadRequestException(
        'No eligible vouchers found for the selected criteria.',
      );
    }

    // Validate duplicate dates
    const uniqueDates = new Set<string>();
    for (const day of dto.days) {
      if (uniqueDates.has(day.date)) {
        throw new BadRequestException(
          `Duplicate day configuration found for date '${day.date}'.`,
        );
      }

      uniqueDates.add(day.date);

      const startMins = timeToMinutes(day.startTime);
      const endMins = timeToMinutes(day.endTime);

      if (endMins <= startMins) {
        throw new BadRequestException(
          `Invalid time range: End Time must be later than Start Time for ${format(
            new Date(day.date),
            'dd-MMM-yyyy',
          )}.`,
        );
      }
    }

    const { startDate, endDate } = BatchService.extractBatchDates(dto.days);

    // Explicit mapping
    batch.campaignId = dto.campaignId;
    batch.name = dto.name.trim();
    batch.stage = dto.stage;
    batch.residentialStatus = dto.residentialStatus;
    batch.preferenceIds = dto.preferenceIds;
    batch.typology = dto.typology || [];
    batch.slotDuration = dto.slotDuration;
    batch.openBatchBefore = dto.openBatchBefore;
    batch.capacityPerSlot = dto.capacityPerSlot;
    batch.totalUsers = totalRecords;
    batch.startDate = startDate;
    batch.endDate = endDate;

    const days = dto.days.map((day) => ({
      batchId: batch.id,
      date: day.date,
      startTime: day.startTime,
      endTime: day.endTime,
    }));

    const slots = BatchService.buildSlotsForBatch(
      batch.id,
      batch.capacityPerSlot,
      batch.slotDuration,
      batch.totalUsers,
      dto.days,
    );

    await this.batchRepo.manager.transaction(async (manager: EntityManager) => {
      await manager.save(EoiBatch, batch);

      await manager.delete(EoiBatchDay, {
        batchId: batch.id,
      });

      if (days.length > 0) {
        await manager.insert(EoiBatchDay, days);
      }

      await manager.delete(EoiBatchSlot, {
        batchId: batch.id,
      });

      if (slots.length > 0) {
        await manager.insert(EoiBatchSlot, slots);
      }
    });

    return {
      statusCode: SUCCESS,
      message: `Batch '${batch.name}' updated successfully.`,
      data: {
        id: batch.id,
        slotsRegenerated: slots.length,
      },
    };
  }

  /**
   * GET batch details including slots grouped by date.
   * Business rule #4: GET is always allowed, even if MAPPED.
   * Business rule #3: slots grouped by date for easy frontend rendering.
   * Business rule #10: robustly handle case where no slots exist yet.
   * @param id batchId
   * @returns batch info + slots grouped by date
   */
  async getBatchDetail(batchId: string): Promise<any> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['days'],
    });
    if (!batch) throw new NotFoundException(`Batch '${batchId}' not found.`);

    logger.info(`Fetched batch ${batchId} details.`);
    return {
      statusCode: SUCCESS,
      message: `Batch '${batch.name}' details fetched successfully.`,
      data: batch,
    };
  }

  async getBatchSlotSummary(batchId: string): Promise<any> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['days', 'slots'],
    });

    if (!batch) {
      throw new NotFoundException(`Batch with id '${batchId}' not found.`);
    }
    const totalRecords = await this.getEligibleVoucherCount({
      campaignId: batch.campaignId,
      residentialStatus: batch.residentialStatus,
      preferenceIds: batch.preferenceIds,
      typology: batch.typology || [],
      stage: batch.stage,
    });

    const alreadyBatched = await this.slotRepo
      .createQueryBuilder('slot')
      .select('COALESCE(SUM(slot.capacity), 0)', 'count')
      .where('slot.batchId = :batchId', { batchId })
      .getRawOne();

    const batchedCount = Number(alreadyBatched?.count || 0);

    const remainingRecords = totalRecords - batchedCount;

    const availableDates = await this.getDateWiseSlotAvailability(batch);

    return {
      statusCode: SUCCESS,
      message: 'Batch slot summary fetched successfully.',
      data: {
        totalRecords,
        alreadyBatched: batchedCount,
        slotDuration: batch.slotDuration,
        capacityPerSlot: batch.capacityPerSlot,
        remainingRecords: remainingRecords > 0 ? remainingRecords : 0,
        availableDates,
      },
    };
  }

  async getEligibleVoucherCount(batch: GetUnmappedCountDto): Promise<number> {
    const query = await this.buildVoucherEligibilityQuery(batch);
    return await query.getCount();
  }

  async getEligibleVouchers(batch: {
    campaignId: number;
    residentialStatus: string;
    preferenceIds: string[];
    typology?: string[];
    stage: string;
  }) {
    const query = await this.buildVoucherEligibilityQuery(batch);
    const vouchers = await query.getMany();
    return vouchers.map((voucher) => ({
      voucherId: voucher.id,
      firstName: voucher.applicant1?.personalDetails?.firstName,
      lastName: voucher.applicant1?.personalDetails?.lastName,
      contactNumber: voucher.applicant1?.personalDetails?.contactNumber,
      emailAddress: voucher.applicant1?.personalDetails?.emailAddress,
      countryCode: voucher.applicant1?.personalDetails?.countryCode,
    }));
  }

  private async buildVoucherEligibilityQuery(batch: {
    campaignId: number;
    residentialStatus: string;
    preferenceIds: string[];
    typology?: string[];
    stage: string;
  }) {
    const typologyIds = batch.typology?.map(Number) || [];
    const inventoryTypes = typologyIds.length
      ? await this.inventoryTyperepo.find({
          where: {
            id: In(typologyIds),
            isDeleted: false,
          },
          select: ['name'],
        })
      : [];

    const typologyNames = inventoryTypes.map((item) => item.name);

    const query = this.voucherRepo
      .createQueryBuilder('voucher')
      .where(
        'voucher.campaignId = :campaignId AND voucher.isDeleted = :isDeleted',
        {
          campaignId: batch.campaignId,
          isDeleted: false,
        },
      )
      //Exclude already mapped vouchers for current stage
      .leftJoin(
        EoiBatchVoucher,
        'mappedVoucher',
        'mappedVoucher.voucher_id = voucher.id AND mappedVoucher.stage = :stage',
        {
          stage: batch.stage,
        },
      )
      .andWhere('mappedVoucher.id IS NULL');

    //residentStatus
    if (batch.residentialStatus === ResidentStatus.INDIAN) {
      query.andWhere(`voucher.residentStatus = :residentStatus`, {
        residentStatus: ResidentStatus.INDIAN,
      });
    } else if (batch.residentialStatus === ResidentStatus.NRI) {
      query.andWhere(`voucher.residentStatus IN (:...residentStatuses)`, {
        residentStatuses: ['NRI', 'PIO/OCI'],
      });
    }

    // Typology applicable only for Indian
    if (
      batch.residentialStatus?.toUpperCase() === 'INDIAN' &&
      batch.typology?.length
    ) {
      query.andWhere(
        `
      JSON_UNQUOTE(
        JSON_EXTRACT(
          voucher.eoiDetails,
          '$.typology'
        )
      ) IN (:...typologies)
      `,
        {
          typologies: typologyNames,
        },
      );
    }

    const preferenceConditions: string[] = [];

    for (const preference of batch.preferenceIds) {
      switch (preference) {
        case PreferenceType.VOUCHER_FP:
          preferenceConditions.push(`
            (
              voucher.eoiDetails IS NULL
              OR JSON_EXTRACT(
                voucher.eoiDetails,
                '$.eoiType'
              ) IS NULL
              OR LOWER(
                JSON_UNQUOTE(
                  JSON_EXTRACT(
                    voucher.eoiDetails,
                    '$.eoiType'
                  )
                )
              ) = LOWER('${EOITypeEnum.VOUCHER}')
            )
            AND voucher.paymentStatus = '${VoucherPaymentStatus.PAID}'
        `);
          break;

        case PreferenceType.VOUCHER_PP:
          preferenceConditions.push(`
            (
              voucher.eoiDetails IS NULL
              OR JSON_EXTRACT(
                voucher.eoiDetails,
                '$.eoiType'
              ) IS NULL
              OR LOWER(
                JSON_UNQUOTE(
                  JSON_EXTRACT(
                    voucher.eoiDetails,
                    '$.eoiType'
                  )
                )
              ) = LOWER('${EOITypeEnum.VOUCHER}')
            )
            AND voucher.paymentStatus = '${VoucherPaymentStatus.PARTIALLY_PAID}'
          `);
          break;

        case PreferenceType.PRE_FP:
          preferenceConditions.push(`
          LOWER(
            JSON_UNQUOTE(
              JSON_EXTRACT(
                voucher.eoiDetails,
                '$.eoiType'
              )
            )
          ) = LOWER('${EOITypeEnum.PREFERENTIAL}')
          AND voucher.paymentStatus = '${VoucherPaymentStatus.PAID}'
        `);
          break;

        case PreferenceType.PRE_PP:
          preferenceConditions.push(`
          LOWER(
            JSON_UNQUOTE(
              JSON_EXTRACT(
                voucher.eoiDetails,
                '$.eoiType'
              )
            )
          ) = LOWER('${EOITypeEnum.PREFERENTIAL}')
          AND voucher.paymentStatus = '${VoucherPaymentStatus.PARTIALLY_PAID}'
        `);
          break;

        case PreferenceType.STD_FP:
          preferenceConditions.push(`
          LOWER(
            JSON_UNQUOTE(
              JSON_EXTRACT(
                voucher.eoiDetails,
                '$.eoiType'
              )
            )
          ) = LOWER('${EOITypeEnum.STANDARD}')
          AND voucher.paymentStatus = '${VoucherPaymentStatus.PAID}'
        `);
          break;

        case PreferenceType.STD_PP:
          preferenceConditions.push(`
          LOWER(
            JSON_UNQUOTE(
              JSON_EXTRACT(
                voucher.eoiDetails,
                '$.eoiType'
              )
            )
          ) = LOWER('${EOITypeEnum.STANDARD}')
          AND voucher.paymentStatus = '${VoucherPaymentStatus.PARTIALLY_PAID}'
        `);
          break;
      }
    }

    if (preferenceConditions.length > 0) {
      query.andWhere(`(${preferenceConditions.join(' OR ')})`);
    }
    return query;
  }

  private async getDateWiseSlotAvailability(batch: EoiBatch): Promise<any[]> {
    const result: any[] = [];

    for (const day of batch.days) {
      const slots = batch.slots
        .filter((s) => s.date === day.date)
        .sort((a, b) => a.sequence - b.sequence);

      const lastSlot = slots.length > 0 ? slots[slots.length - 1] : null;

      const dayEndMins = timeToMinutes(day.endTime);

      let remainingMinutes = 0;

      if (lastSlot) {
        remainingMinutes = dayEndMins - timeToMinutes(lastSlot.endTime);
      } else {
        remainingMinutes = dayEndMins - timeToMinutes(day.startTime);
      }

      result.push({
        date: day.date,
        canAddMoreSlots: remainingMinutes > 0,
        remainingMinutes,
        remainingPossibleSlots:
          remainingMinutes > 0
            ? Math.floor(remainingMinutes / batch.slotDuration)
            : 0,
      });
    }

    return result;
  }

  async deleteBatch(user: any, batchId: string): Promise<any> {
    let mappedUsersCount = 0;
    const response = await this.batchRepo.manager.transaction(
      async (manager: EntityManager) => {
        logger.info(`${user.name} is deleting the batch ${batchId}`);

        const batch = await manager.findOne(EoiBatch, {
          where: { id: batchId },
        });

        if (!batch) {
          throw new NotFoundException(`Batch with id '${batchId}' not found.`);
        }

        // Check mapped users count
        mappedUsersCount = await manager.count(EoiBatchVoucher, {
          where: { batchId },
        });

        // Soft delete slots
        await manager.softDelete(EoiBatchSlot, {
          batchId,
        });

        // Soft delete days
        await manager.softDelete(EoiBatchDay, {
          batchId,
        });

        await manager.update(
          EoiBatch,
          { id: batchId },
          {
            status: BatchStatus.DELETED,
          },
        );

        // Soft delete batch
        await manager.softDelete(EoiBatch, {
          id: batchId,
        });

        return {
          statusCode: SUCCESS,
          data: { id: batchId },
          message: `Batch '${batch.name}' deleted successfully.`,
        };
      },
    );

    // Queue background notification - notification for delete -  // Remove scheduled batch notification job
    if (mappedUsersCount > 0) {
      // Remove scheduled batch notification job
      await this.removeBatchNotificationJob(batchId);
      const job = await this.batchNotificationQueue.add(
        BatchQueueJobs.BATCH_DELETE_NOTIFICATION,
        { userId: user?.dbId, batchId },
        {
          attempts: 3, // Retry transient Redis/DB failures; `UnrecoverableError` skips retries.
          backoff: { type: 'exponential', delay: 10_000 }, // 10s base delay between attempts.
          removeOnComplete: 500, // Trim completed job records in Redis after 500 jobs.
          removeOnFail: 1_000, // Retain up to 1000 failed jobs for inspection.
        },
      );
      logger.info(`Batch delete notification job queued: ${job.id}`);
      await this.queueJobAuditService.append({
        queueName: BATCH_NOTIFICATION_QUEUE,
        jobId: String(job.id),
        jobName: BatchQueueJobs.BATCH_DELETE_NOTIFICATION,
        event: QUEUE_JOB_AUDIT_EVENT.ENQUEUED,
        sourceModule: 'batch_manager',
        summary: `Batch Delete notification queued`,
        context: {
          batchId,
        },
        triggeredByUserId: user?.dbId,
      });
    }

    return response;
  }
  /**
   * Generate batch statistics based on actual database data using optimized queries
   * @param campaignId - Campaign ID to generate stats for
   * @param nationality - Optional filter for NRI or Indian
   * @returns Batch statistics with payment status breakdowns
   */
  async getBatchStats(campaignId: number, stage: BatchStage) {
    try {
      const campaign = await this.eoiCampaignRepository.findOne({
        where: { id: campaignId },
        select: ['eoiType', 'phase'],
      });

      const enabledTypes = [
        ...(campaign?.eoiType || []),
        ...(campaign?.phase?.includes(VoucherFormType.VOUCHER)
          ? ['Voucher']
          : []),
      ];

      const emptyStats: PaymentStats = {
        fullyPaid: 0,
        partiallyPaid: 0,
        nriFullyPaid: 0,
        nriPartiallyPaid: 0,
        indianFullyPaid: 0,
        indianPartiallyPaid: 0,
      };

      const [voucher, standard, preferential, typology] = await Promise.all([
        enabledTypes.includes('Voucher')
          ? this.getVoucherCategoryStats(campaignId, stage)
          : Promise.resolve(emptyStats),
        enabledTypes.includes('Standard')
          ? this.getStandardEoiStats(campaignId, stage)
          : Promise.resolve(emptyStats),
        enabledTypes.includes('Preferential')
          ? this.getPreferentialEoiStats(campaignId, stage)
          : Promise.resolve(emptyStats),
        this.getTypologyStats(campaignId, stage),
      ]);
      const allRecords = this.buildAllRecordsResponse(
        voucher,
        standard,
        preferential,
        enabledTypes,
      );
      const nationalityRows = this.buildNationalityRowsResponse(
        voucher,
        standard,
        preferential,
        enabledTypes,
      );
      return {
        statusCode: SUCCESS,
        message: 'Batch stats fetched successfully',
        data: {
          campaignId,
          allRecords,
          rows: nationalityRows,
          typology,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch batchStats', error);
      logsAndErrorHandling('BatchService - batchStats', error);
    }
  }

  private buildNationalityRowsResponse(
    voucher: any,
    standard: any,
    preferential: any,
    enabledTypes: string[],
  ) {
    return [
      this.buildNationalityRow(
        'NRI',
        {
          fullyPaid: preferential.nriFullyPaid,
          partiallyPaid: preferential.nriPartiallyPaid,
        },
        {
          fullyPaid: standard.nriFullyPaid,
          partiallyPaid: standard.nriPartiallyPaid,
        },
        {
          fullyPaid: voucher.nriFullyPaid,
          partiallyPaid: voucher.nriPartiallyPaid,
        },
        enabledTypes,
      ),

      this.buildNationalityRow(
        'Indian',
        {
          fullyPaid: preferential.indianFullyPaid,
          partiallyPaid: preferential.indianPartiallyPaid,
        },
        {
          fullyPaid: standard.indianFullyPaid,
          partiallyPaid: standard.indianPartiallyPaid,
        },
        {
          fullyPaid: voucher.indianFullyPaid,
          partiallyPaid: voucher.indianPartiallyPaid,
        },
        enabledTypes,
      ),
    ];
  }
  private buildNationalityRow(
    label: string,
    preferential: any,
    standard: any,
    voucher: any,
    enabledTypes: string[],
  ) {
    const response: any = {
      label,
    };

    let rowTotal = 0;

    if (enabledTypes.includes('Preferential')) {
      response.preferential = {
        fullyPaid: Number(preferential?.fullyPaid || 0),
        partiallyPaid: Number(preferential?.partiallyPaid || 0),
      };

      rowTotal +=
        response.preferential.fullyPaid + response.preferential.partiallyPaid;
    }

    if (enabledTypes.includes('Standard')) {
      response.standard = {
        fullyPaid: Number(standard?.fullyPaid || 0),
        partiallyPaid: Number(standard?.partiallyPaid || 0),
      };

      rowTotal += response.standard.fullyPaid + response.standard.partiallyPaid;
    }

    if (enabledTypes.includes('Voucher')) {
      response.voucher = {
        fullyPaid: Number(voucher?.fullyPaid || 0),
        partiallyPaid: Number(voucher?.partiallyPaid || 0),
      };

      rowTotal += response.voucher.fullyPaid + response.voucher.partiallyPaid;
    }

    return {
      ...response,
      rowTotal,
    };
  }

  private buildAllRecordsResponse(
    voucher: any,
    standard: any,
    preferential: any,
    eoiTypes: string[],
  ) {
    const response: any = {
      label: 'All Records',
    };

    let rowTotal = 0;
    if (eoiTypes.includes('Preferential')) {
      response.preferential = {
        fullyPaid: Number(preferential?.fullyPaid || 0),
        partiallyPaid: Number(preferential?.partiallyPaid || 0),
      };

      rowTotal +=
        response.preferential.fullyPaid + response.preferential.partiallyPaid;
    }

    if (eoiTypes.includes('Standard')) {
      response.standard = {
        fullyPaid: Number(standard?.fullyPaid || 0),
        partiallyPaid: Number(standard?.partiallyPaid || 0),
      };

      rowTotal += response.standard.fullyPaid + response.standard.partiallyPaid;
    }

    if (eoiTypes.includes('Voucher')) {
      response.voucher = {
        fullyPaid: Number(voucher?.fullyPaid || 0),
        partiallyPaid: Number(voucher?.partiallyPaid || 0),
      };

      rowTotal += response.voucher.fullyPaid + response.voucher.partiallyPaid;
    }

    return {
      ...response,
      rowTotal,
    };
  }

  private async getVoucherCategoryStats(
    campaignId: number,
    stage: BatchStage,
  ): Promise<PaymentStats> {
    return await this.voucherRepo
      .createQueryBuilder('voucher')
      .leftJoin(
        EoiBatchVoucher,
        'mappedVoucher',
        `
          mappedVoucher.voucher_id = voucher.id
          AND mappedVoucher.stage = :stage
        `,
        { stage },
      )
      .select(this.getPaymentStatsSelect())
      .where('voucher.campaignId = :campaignId', {
        campaignId,
      })
      .andWhere('voucher.isDeleted = false')
      .andWhere('mappedVoucher.id IS NULL')
      .andWhere(
        `
          (
            voucher.eoiDetails IS NULL
            OR JSON_UNQUOTE(
                JSON_EXTRACT(
                  voucher.eoiDetails,
                  '$.eoiType'
                )
              ) = '${EOITypeEnum.VOUCHER}'
            OR JSON_EXTRACT(
            voucher.eoiDetails,
            '$.eoiType'
          ) IS NULL
          )
        `,
      )
      .getRawOne();
  }

  private async getStandardEoiStats(
    campaignId: number,
    stage: BatchStage,
  ): Promise<PaymentStats> {
    return await this.voucherRepo
      .createQueryBuilder('voucher')
      .leftJoin(
        EoiBatchVoucher,
        'mappedVoucher',
        `
          mappedVoucher.voucher_id = voucher.id
          AND mappedVoucher.stage = :stage
        `,
        { stage },
      )
      .select(this.getPaymentStatsSelect())
      .where('voucher.campaignId = :campaignId', {
        campaignId,
      })
      .andWhere('voucher.isDeleted = false')
      .andWhere('mappedVoucher.id IS NULL')
      .andWhere(
        `
          JSON_UNQUOTE(
            JSON_EXTRACT(
              voucher.eoiDetails,
              '$.eoiType'
            )
          ) = '${EOITypeEnum.STANDARD}'
        `,
      )

      .getRawOne();
  }

  private async getPreferentialEoiStats(
    campaignId: number,
    stage: BatchStage,
  ): Promise<PaymentStats> {
    return await this.voucherRepo
      .createQueryBuilder('voucher')
      .leftJoin(
        EoiBatchVoucher,
        'mappedVoucher',
        `
          mappedVoucher.voucher_id = voucher.id
          AND mappedVoucher.stage = :stage
        `,
        { stage },
      )
      .select(this.getPaymentStatsSelect())
      .where('voucher.campaignId = :campaignId', {
        campaignId,
      })
      .andWhere('voucher.isDeleted = false')
      .andWhere('mappedVoucher.id IS NULL')
      .andWhere(
        `
          JSON_UNQUOTE(
            JSON_EXTRACT(
              voucher.eoiDetails,
              '$.eoiType'
            )
          ) = '${EOITypeEnum.PREFERENTIAL}'
        `,
      )
      .getRawOne();
  }

  private async getTypologyStats(campaignId: number, stage: BatchStage) {
    return await this.voucherRepo
      .createQueryBuilder('voucher')
      .select(
        `
        JSON_UNQUOTE(
          JSON_EXTRACT(
            voucher.eoiDetails,
            '$.typology'
          )
        )
        `,
        'name',
      )
      .addSelect('COUNT(voucher.id)', 'count')
      .leftJoin(
        EoiBatchVoucher,
        'mappedVoucher',
        `
          mappedVoucher.voucher_id = voucher.id
          AND mappedVoucher.stage = :stage
        `,
        { stage },
      )
      .where('voucher.campaignId = :campaignId', {
        campaignId,
      })

      .andWhere('voucher.isDeleted = false')
      .andWhere('voucher.paymentStatus IN (:...paidStatuses)', {
        paidStatuses: [
          VoucherPaymentStatus.PAID,
          VoucherPaymentStatus.PARTIALLY_PAID,
        ],
      })
      .andWhere('mappedVoucher.id IS NULL')
      // eoiDetails should exist
      .andWhere('voucher.eoiDetails IS NOT NULL')

      // typology should exist
      .andWhere(
        `
      JSON_EXTRACT(
        voucher.eoiDetails,
        '$.typology'
      ) IS NOT NULL
    `,
      )
      .groupBy(
        `
        JSON_UNQUOTE(
          JSON_EXTRACT(
            voucher.eoiDetails,
            '$.typology'
          )
        )
        `,
      )
      .getRawMany();
  }

  private getPaymentStatsSelect() {
    return [
      // ALL RECORDS
      `
        COUNT(
          CASE
            WHEN voucher.paymentStatus = '${VoucherPaymentStatus.PAID}'
            THEN 1
          END
        ) as fullyPaid
      `,

      `
        COUNT(
          CASE
            WHEN voucher.paymentStatus = '${VoucherPaymentStatus.PARTIALLY_PAID}'
            THEN 1
          END
        ) as partiallyPaid
      `,

      // NRI
      `
        COUNT(
          CASE
            WHEN voucher.paymentStatus = '${VoucherPaymentStatus.PAID}'
           AND voucher.residentStatus IN ('NRI', 'PIO/OCI')
            THEN 1
          END
        ) as nriFullyPaid
      `,

      `
        COUNT(
          CASE
            WHEN voucher.paymentStatus = '${VoucherPaymentStatus.PARTIALLY_PAID}'
             AND voucher.residentStatus IN ('NRI', 'PIO/OCI')
            THEN 1
          END
        ) as nriPartiallyPaid
      `,

      // INDIAN
      `
        COUNT(
          CASE
            WHEN voucher.paymentStatus = '${VoucherPaymentStatus.PAID}'
            AND voucher.residentStatus = 'Indian'
            THEN 1
          END
        ) as indianFullyPaid
      `,

      `
        COUNT(
          CASE
            WHEN voucher.paymentStatus = '${VoucherPaymentStatus.PARTIALLY_PAID}'
            AND voucher.residentStatus = 'Indian'
            THEN 1
          END
        ) as indianPartiallyPaid
      `,
    ];
  }

  async notifyBatchUsers(
    user: any,
    body: {
      batchId?: string;
      mappedUserId?: string;
      notifyAt?: Date;
    },
  ) {
    try {
      const { batchId, mappedUserId, notifyAt } = body;

      // ================= DIRECT CUSTOMER NOTIFY =================
      if (mappedUserId) {
        await this.sendSingleCustomerNotification(mappedUserId);
        return {
          statusCode: SUCCESS,
          message: 'Customer notified successfully',
          data: null,
        };
      }
      if (!batchId) {
        throw new BadRequestException('batchId is required');
      }

      const batch = await this.batchRepo.findOne({
        where: { id: batchId },
        relations: ['campaign'],
      });

      if (!batch) {
        throw new NotFoundException('Batch not found');
      }

      if (batch.isNotified) {
        throw new BadRequestException('Users already notified for this batch');
      }

      if (!batch.campaign?.venueName.trim()) {
        throw new BadRequestException(
          'Please configure the venue name for this campaign before sending notifications.',
        );
      }

      // ================= BATCH RE-SCHEDULE notification time- =================
      if (notifyAt) {
        const notifyAtDate = new Date(notifyAt);
        logger.info(`================ NOTIFY DATE CHECK ================`);
        const batchStartUtc = fromZonedTime(
          format(batch.startDate, 'yyyy-MM-dd HH:mm:ss'),
          IST_TIME_ZONE,
        );
        logger.info(`notifyAt UTC: ${notifyAtDate.toISOString()}`);
        logger.info(`batchStart UTC: ${batchStartUtc.toISOString()}`);

        if (notifyAtDate.getTime() > batchStartUtc.getTime()) {
          throw new BadRequestException(
            'Notify date cannot be greater than batch start date',
          );
        }
        await this.batchRepo.update(
          { id: batchId },
          {
            notifyAt,
          },
        );
        await this.scheduleBatchNotification({
          batchId,
          notifyAt,
          stage: batch.stage,
          userId: user.dbId,
        });

        return {
          statusCode: SUCCESS,
          message: 'Notification time updated successfully',
        };
      }
      // Remove existing scheduled notification job
      await this.removeBatchNotificationJob(batchId);

      // ============ // SEND BULK NOTIFICATION NOW USING BULLMQ // ============
      // Queue background notification - customer batch notification
      const job = await this.batchNotificationQueue.add(
        BatchQueueJobs.BATCH_STAGE_NOTIFICATION,
        {
          userId: user?.dbId,
          batchId,
          stage: batch.stage,
        },
        {
          attempts: 3, // Retry transient Redis/DB failures; `UnrecoverableError` skips retries.
          backoff: { type: 'exponential', delay: 10_000 }, // 10s base delay between attempts.
          removeOnComplete: 500, // Trim completed job records in Redis after 500 jobs.
          removeOnFail: 1_000, // Retain up to 1000 failed jobs for inspection.
        },
      );

      logger.info(`Batch stage notification job queued: ${job.id}`);
      // ================= AUDIT - ENQUEUED =================
      await this.queueJobAuditService.append({
        queueName: BATCH_NOTIFICATION_QUEUE,
        jobId: String(job.id),
        jobName: BatchQueueJobs.BATCH_STAGE_NOTIFICATION,
        event: QUEUE_JOB_AUDIT_EVENT.ENQUEUED,
        sourceModule: 'batch_manager',
        summary: `Batch stage notification queued`,
        context: {
          batchId,
          stage: batch.stage,
        },
        triggeredByUserId: user?.dbId,
      });

      return {
        statusCode: HttpStatus.ACCEPTED,
        message: 'Bulk Notifications sent by job queued for processing.',
        data: { jobId: String(job.id) },
      };
    } catch (error) {
      logger.error('Failed to notify users', error);
      return logsAndErrorHandling('BatchService - notifyBatchUsers', error, {
        body,
      });
    }
  }

  async getUnmappedCount(body: GetUnmappedCountDto) {
    try {
      const count = await this.getEligibleVoucherCount(body);
      return {
        statusCode: SUCCESS,
        message: 'Unmapped voucher count fetched successfully',
        data: {
          count,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch unmapped count', error);
      logsAndErrorHandling('BatchService - getUnmappedCount', error);
    }
  }

  async sendSingleCustomerNotification(
    mappedUserId: string,
    isBatchMoveNotification = false,
  ): Promise<void> {
    const mappedUser = await this.batchVoucherRepo.findOne({
      where: { id: mappedUserId },
      relations: [
        'batch',
        'voucher',
        'batch.campaign',
        'slot',
        'voucher.campaign.project',
        'voucher.campaign.brand',
        'voucher.mappedUnit',
      ],
    });

    if (!mappedUser) {
      throw new NotFoundException('Mapped user not found');
    }

    if (!mappedUser.batch?.campaign?.venueName?.trim()) {
      throw new BadRequestException(
        'Please configure the venue name for this campaign before sending notifications.',
      );
    }

    const customerEmail = mappedUser?.email;
    if (!customerEmail) {
      return;
    }
    const showUnitShortlisting = isBatchMoveNotification
      ? false
      : !mappedUser?.voucher?.mappedUnit;

    const { emailEvent, placeholders } = this.getNotificationConfig(
      mappedUser.batch.stage,
      mappedUser,
      isBatchMoveNotification,
      showUnitShortlisting,
    );

    await this.eventEmitter.emitAsync(
      EventMessagesEnum.COMPOSE_EMAIL,
      new ComposeEmailEvent(emailEvent, placeholders, 'Puravankara', {
        to: customerEmail,
      }),
    );
  }

  private getNotificationConfig(
    stage: BatchStage,
    mappedUser: any,
    isBatchMoveNotification = false,
    showUnitShortlisting = false,
  ): {
    emailEvent: ComposeEmailsEnum;
    placeholders: Record<string, any>;
  } {
    switch (stage) {
      case BatchStage.UNIT_ALLOTMENT:
        return {
          emailEvent: isBatchMoveNotification
            ? ComposeEmailsEnum.BATCH_MOVE_NOTIFICATION
            : ComposeEmailsEnum.UNIT_ALLOTMENT_INVITATION,

          placeholders:
            this.buildUnitAllotmentOrMoveorDeletePayload(mappedUser),
        };

      case BatchStage.LAUNCH:
        return {
          emailEvent: isBatchMoveNotification
            ? ComposeEmailsEnum.BATCH_MOVE_NOTIFICATION
            : ComposeEmailsEnum.LAUNCH_EVENT_INVITATION,

          placeholders: isBatchMoveNotification
            ? this.buildUnitAllotmentOrMoveorDeletePayload(mappedUser)
            : this.buildLaunchPayload(mappedUser, showUnitShortlisting),
        };

      default:
        throw new BadRequestException('Invalid batch stage');
    }
  }

  private buildCommonPayload(mappedUser: any) {
    const EVENT_TYPE =
      mappedUser?.batch?.stage === BatchStage.LAUNCH
        ? 'Launch Event'
        : 'Preferential Allotment';
    const eoiId =
      mappedUser?.voucher?.preEoiId ||
      mappedUser?.voucher?.stdEoiId ||
      mappedUser?.voucher?.paidVoucherId;
    const locationLink = mappedUser?.voucher?.campaign?.venueMapLink;

    return {
      CUSTOMER_NAME: mappedUser?.customerName || 'Customer',
      EVENT_TYPE,
      PROJECT_NAME: mappedUser?.voucher?.campaign?.project?.name,
      COMPANY_NAME: mappedUser?.voucher?.campaign?.brand?.name,
      EOIID: eoiId ? `Voucher / EOI ID: ${eoiId}` : '',
      PRID: mappedUser?.voucher?.uniqueReferenceId,
      BATCH_NUMBER: mappedUser?.slot?.name,
      BATCH_DATE_TIME: `${mappedUser?.slot?.date} ${format(
        new Date(`${mappedUser?.slot?.date}T${mappedUser?.slot?.startTime}`),
        'hh:mm a',
      )} to ${format(
        new Date(`${mappedUser?.slot?.date}T${mappedUser?.slot?.endTime}`),
        'hh:mm a',
      )}`,
      VENUE_NAME: mappedUser?.voucher?.campaign?.venueName,
      LOCATION_LINK: locationLink
        ? `  <a
        href="${mappedUser?.voucher?.campaign?.venueMapLink}"
        target="_blank"
        style="font-weight:600;text-decoration:underline;color:#1A73E8;"
      >
        View Location
      </a>`
        : '',
      CONTACT_DETAILS: mappedUser?.batch?.contactDetails,
    };
  }

  private buildUnitAllotmentOrMoveorDeletePayload(mappedUser: any) {
    return {
      ...this.buildCommonPayload(mappedUser),
    };
  }
  private buildLaunchPayload(mappedUser: any, showUnitShortlisting: boolean) {
    const accountDetails = mappedUser?.voucher?.campaign?.accountDetails || {};
    const opportunityId = mappedUser?.voucher?.opportunityId;
    const agreementDocLink = mappedUser?.voucher?.campaign?.agreementDocLink;
    const projectName = mappedUser?.voucher?.campaign?.project?.name;
    const bookingFormUrl = this.configService.get<string>('BOOKING_FORM_URL');
    const base_url = this.configService.get<string>('PURAVANKARA_BASE_URL');
    return {
      ...this.buildCommonPayload(mappedUser),
      SHOW_UNIT_SHORTLISTING: showUnitShortlisting
        ? '<li>Unit shortlisting</li>'
        : '',
      AGREEMENT_DRAFT_LINK: agreementDocLink
        ? `
            <p>
              Agreement Draft:
              <a
                href="${agreementDocLink}"
                target="_blank"
                style="font-weight:600;text-decoration:underline;color:#1A73E8;"
              >
                View Agreement Draft
              </a>
            </p>
          `
        : '',

      APPLICANT_DETAILS_LINK: opportunityId
        ? `
            <p>
              Update Applicant Details:
              <a
                href="${bookingFormUrl}/${opportunityId}"
                target="_blank"
                style="font-weight:600;text-decoration:underline;color:#1A73E8;"
              >
                Applicant Details Update
              </a>
            </p>
          `
        : '',

      ACCOUNT_NAME: accountDetails.accountName ?? '-',
      BANK_NAME: accountDetails.bankName ?? '-',
      ACCOUNT_NUMBER: accountDetails.accountNumber ?? '-',
      IFSC_CODE: accountDetails.ifscCode ?? '-',
      TERMS_AND_CONDITIONS_LINK: `${base_url}/terms-and-conditions/${encodeURIComponent(projectName)}`,
    };
  }
  async sendBatchCustomerNotifications(batchId: string, stage: BatchStage) {
    const emailEvent =
      stage === BatchStage.LAUNCH
        ? ComposeEmailsEnum.LAUNCH_EVENT_INVITATION
        : ComposeEmailsEnum.UNIT_ALLOTMENT_INVITATION;

    const result = await this.processBatchNotifications(batchId, emailEvent);
    // Mark vouchers as invited after successful notification processing
    await this.markBatchVouchersAsInvited(batchId);
    // Mark batch as notified after successful notification processing
    await this.updateBatchNotificationStatus(batchId);
    return result;
  }

  async sendBatchDeleteNotifications(batchId: string) {
    const result = await this.processBatchNotifications(
      batchId,
      ComposeEmailsEnum.BATCH_CANCELLATION_NOTIFICATION,
      true,
    );
    // Delete mappings after notification processing completes
    await this.batchVoucherRepo.delete({
      batchId,
    });

    logger.info(`Batch voucher mappings deleted for batch ${batchId}`);
    return result;
  }

  private async processBatchNotifications(
    batchId: string,
    emailEvent: ComposeEmailsEnum,
    isDeleteNotification = false,
  ): Promise<{
    totalUsers: number;
    successCount: number;
    failureCount: number;
  }> {
    const mappedUsers = await this.batchVoucherRepo.find({
      where: {
        batchId,
        ...(!isDeleteNotification && {
          slot: {
            status: SlotStatusEnum.LOCKED,
          },
        }),
      },
      relations: [
        'batch',
        'voucher',
        'slot',
        'voucher.campaign.project',
        'voucher.campaign.brand',
        'voucher.mappedUnit',
      ],
      withDeleted: true,
    });

    if (!mappedUsers.length) {
      throw new NotFoundException('No mapped users found');
    }

    const stage = mappedUsers[0]?.batch?.stage;

    let successCount = 0;
    const failures = [];

    for (const mappedUser of mappedUsers) {
      try {
        const customerEmail = mappedUser?.email;
        if (!customerEmail) {
          failures.push({
            mappedUserId: mappedUser.id,
            reason: 'Customer email not found',
          });
          continue;
        }
        const showUnitShortlisting = !mappedUser?.voucher?.mappedUnit;

        const isUnitAllotmentPayload =
          isDeleteNotification || stage !== BatchStage.LAUNCH;

        const placeholders = isUnitAllotmentPayload
          ? this.buildUnitAllotmentOrMoveorDeletePayload(mappedUser)
          : this.buildLaunchPayload(mappedUser, showUnitShortlisting);

        await this.eventEmitter.emitAsync(
          EventMessagesEnum.COMPOSE_EMAIL,
          new ComposeEmailEvent(emailEvent, placeholders, 'Puravankara', {
            to: customerEmail,
          }),
        );

        successCount++;
      } catch (error) {
        logger.error(`Failed notification for ${mappedUser.id}`, error?.stack);
        failures.push({
          mappedUserId: mappedUser.id,
          reason: error?.message || 'Failed to send notification',
        });
      }
    }
    return {
      totalUsers: mappedUsers.length,
      successCount,
      failureCount: failures.length,
    };
  }

  /**
   * =====================================================
   * REMOVE SCHEDULED BATCH NOTIFICATION JOB
   * =====================================================
   */
  async removeBatchNotificationJob(batchId: string): Promise<void> {
    try {
      const jobId = `batch-schedule-${batchId}`;
      const existingJob = await this.batchNotificationQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
        logger.info(`Batch notification job removed: ${jobId}`);
      }
    } catch (error) {
      logger.error(
        `Failed to remove batch notification job for batchId: ${batchId}`,
        error,
      );
    }
  }

  /**
   * =====================================================
   * SCHEDULE BATCH NOTIFICATION
   * =====================================================
   */
  async scheduleBatchNotification({
    batchId,
    notifyAt,
    stage,
    userId,
  }: {
    batchId: string;
    notifyAt: Date;
    stage: BatchStage;
    userId: number;
  }): Promise<void> {
    try {
      // Remove existing scheduled job first
      await this.removeBatchNotificationJob(batchId);
      const scheduledAt = new Date(notifyAt);
      const delay = Math.max(scheduledAt.getTime() - Date.now(), 0);
      logger.info(`notifyAt: ${notifyAt}`);
      logger.info(`scheduledAt: ${scheduledAt.toISOString()}`);
      logger.info(`currentTime: ${new Date().toISOString()}`);
      logger.info(`delay: ${delay}`);

      logger.info(
        `[BatchSchedule] Calculated delay=${delay}ms (${(
          delay /
          1000 /
          60
        ).toFixed(2)} minutes)`,
      );
      const jobId = `batch-schedule-${batchId}`;
      const job = await this.batchNotificationQueue.add(
        BatchQueueJobs.BATCH_STAGE_NOTIFICATION,
        {
          userId,
          batchId,
          stage,
        },
        {
          jobId,
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential', // Retry delay increases after each failed attempt
            delay: 10_000, // Retry delay increases after each failed attempt
          },
          removeOnComplete: 500, // Keep only latest 500 completed jobs in Redis
          removeOnFail: 1000, // Keep only latest 1000 failed jobs for debugging
        },
      );

      logger.info(`Batch notification scheduled successfully: ${job.id}`);

      // ================= AUDIT - ENQUEUED =================
      await this.queueJobAuditService.append({
        queueName: BATCH_NOTIFICATION_QUEUE,
        jobId: String(job.id),
        jobName: BatchQueueJobs.BATCH_STAGE_NOTIFICATION,
        event: QUEUE_JOB_AUDIT_EVENT.ENQUEUED,
        sourceModule: 'batch_manager',
        summary: `Batch stage notification queued`,
        context: {
          batchId,
          stage,
          notifyAt,
        },
        triggeredByUserId: userId,
      });
    } catch (error) {
      logger.error(
        `Failed to schedule batch notification for batchId: ${batchId}`,
        error,
      );

      throw error;
    }
  }

  async updateBatchNotificationStatus(batchId: string): Promise<void> {
    await this.batchRepo.update(
      {
        id: batchId,
        isNotified: false,
      },
      {
        isNotified: true,
        notifyAt: new Date(),
      },
    );
  }

  async markBatchVouchersAsInvited(batchId: string): Promise<void> {
    await this.batchVoucherRepo.update(
      { batchId },
      { status: BatchVoucherStatus.INVITED },
    );
  }

  async updateVoucherStatusToBooked(
    voucherId: number,
    bookingId: number,
  ): Promise<void> {
    try {
      const voucher = await this.batchVoucherRepo.findOne({
        where: {
          voucherId: voucherId,
          stage: BatchStage.LAUNCH,
          status: BatchVoucherStatus.ATTENDED,
        },
        relations: ['voucher'],
      });
      if (!voucher) return;

      const booking = await this.bookingRepo.findOne({
        where: {
          voucherId,
        },
      });

      await this.batchVoucherRepo.update(
        { voucherId: voucherId, stage: BatchStage.LAUNCH },
        {
          status: BatchVoucherStatus.BOOKED,
          bookedAt: new Date(),
          bookingPaidAmount: booking?.unitDetails?.totalAgreementValue ?? 0,
          voucherPaidAmount:
            voucher.voucher?.paymentDetails?.totalAmountPaid ?? 0,
          bookingId,
        },
      );
    } catch (error) {
      logger.error(
        `Failed to update voucher status to BOOKED for voucherId: ${voucherId}`,
        error.stack,
      );
    }
  }

  async updateVoucherStatusToAgreementSigned(voucherId: number): Promise<void> {
    try {
      logger.info(
        `Updating voucher status to AGREEMENT_SIGNED for voucherId: ${voucherId}`,
      );
      const voucher = await this.batchVoucherRepo.findOne({
        where: {
          voucherId: voucherId,
          stage: BatchStage.LAUNCH,
          status: BatchVoucherStatus.BOOKED,
        },
      });

      // Update only if:
      // 1. Voucher exists
      // 2. Campaign stage is LAUNCH
      // 3. Current status is BOOKED
      if (!voucher) {
        logger.info(
          `Voucher not found or not eligible for update. voucherId: ${voucherId},`,
        );
        return;
      }
      await this.batchVoucherRepo.update(
        { voucherId: voucherId, stage: BatchStage.LAUNCH },
        {
          status: BatchVoucherStatus.AGREEMENT_SIGNED,
          agreementSignedAt: new Date(),
        },
      );
    } catch (error) {
      logger.error(
        `Failed to update voucher status to AGREEMENT_SIGNED for voucherId: ${voucherId}`,
        error.stack,
      );
    }
  }

  async getDashboardSummary(query: DashboardSummaryDto): Promise<any> {
    try {
      logger.info(
        `Fetching dashboard summary with query: ${JSON.stringify(query)}`,
      );

      const summaryQuery = this.batchVoucherRepo
        .createQueryBuilder('voucher')
        .innerJoin('voucher.slot', 'slot')
        .innerJoin('voucher.batch', 'batch')
        .select('COUNT(voucher.id)', 'invited')
        .addSelect(
          'COUNT(CASE WHEN voucher.status = :attendedStatus THEN 1 END)',
          'attended',
        )
        .addSelect(
          'COUNT(CASE WHEN voucher.status = :agreementSignedStatus THEN 1 END)',
          'agreementsSigned',
        )
        .addSelect(
          'COALESCE(SUM(voucher.bookingPaidAmount), 0)',
          'totalSalesValue',
        )
        .addSelect(
          'COALESCE(SUM(voucher.bookingPaidAmount + voucher.voucherPaidAmount), 0)',
          'agreementValueCollected',
        )
        .addSelect('COALESCE(SUM(voucher.headCount), 0)', 'totalHeadcount')
        .where('batch.campaignId = :campaignId', {
          campaignId: query.campaignId,
        })
        .andWhere('batch.stage = :stage', {
          stage: query.stage,
        })
        .andWhere('batch.status IN (:...batchStatuses)', {
          batchStatuses: [BatchStatus.ACTIVE, BatchStatus.ARCHIVED],
        })
        .setParameters({
          attendedStatus: BatchVoucherStatus.ATTENDED,
          agreementSignedStatus: BatchVoucherStatus.AGREEMENT_SIGNED,
        });

      const proratedInvitedQuery = this.slotRepo
        .createQueryBuilder('slot')
        .innerJoin('slot.batch', 'batch')
        .select('COALESCE(SUM(slot.filledCount), 0)', 'proratedInvites')
        .where('batch.campaignId = :campaignId', {
          campaignId: query.campaignId,
        })
        .andWhere('batch.stage = :stage', {
          stage: query.stage,
        })
        .andWhere('batch.status IN (:...batchStatuses)', {
          batchStatuses: [BatchStatus.ACTIVE, BatchStatus.ARCHIVED],
        })
        .andWhere('slot.status IN (:...statuses)', {
          statuses: [
            SlotStatusEnum.ACTIVE,
            SlotStatusEnum.COMPLETED,
            SlotStatusEnum.ELAPSED,
          ],
        });

      this.applyDashboardFilters(summaryQuery, query);
      this.applyDashboardFilters(proratedInvitedQuery, query);

      const [
        summaryData,
        proratedInvitedData,
        duringLaunchCollected,
        bookedCount,
      ] = await Promise.all([
        summaryQuery.getRawOne(),
        proratedInvitedQuery.getRawOne(),
        this.getDuringValueCollected(query.campaignId, query.stage),
        this.getBookedCount(query),
      ]);

      const invited = Number(summaryData?.invited ?? 0);
      const attended = Number(summaryData?.attended ?? 0);
      const agreementsSigned = Number(summaryData?.agreementsSigned ?? 0);
      const totalHeadcount = Number(summaryData?.totalHeadcount ?? 0);
      const proratedInvites = Number(proratedInvitedData?.proratedInvites ?? 0);
      const salesValue = Number(summaryData?.totalSalesValue ?? 0);
      const agreementCollected = Number(
        summaryData?.agreementValueCollected ?? 0,
      );
      const saleValueCollectedPercentage =
        salesValue > 0
          ? Number(((agreementCollected / salesValue) * 100).toFixed(2))
          : 0;
      const crmPushed = 0;
      const unitsBooked = bookedCount + crmPushed;
      const cxSigned = bookedCount;
      const cxSignedPercentage =
        unitsBooked > 0
          ? Number(((cxSigned / unitsBooked) * 100).toFixed(0))
          : 0;
      const batchSummary = {
        segment: 'Batch Active & Elaped',
        invited,
        attended,
        unitsBooked,
        agreementsSigned,
        salesValue,
        agreementCollected: {
          total: agreementCollected,
          duringLaunch: duringLaunchCollected,
        },
        saleValueCollectedPercentage,
        cxSigned: {
          count: bookedCount,
          percentage: cxSignedPercentage,
        },
        crmPushed: {
          count: crmPushed,
          percentage: 0,
        },
      };

      const freshWalkinsSummary = {
        segment: 'Fresh Walk-ins',
        invited: 0,
        attended: 0,
        unitsBooked: 0,
        agreementsSigned: 0,
        salesValue: 0,
        agreementCollected: {
          total: 0,
          duringLaunch: 0,
        },
        saleValueCollectedPercentage: 0,
        cxSigned: {
          count: 0,
          percentage: 0,
        },
        crmPushed: {
          count: 0,
          percentage: 0,
        },
      };

      const totalSummary = {
        segment: 'Total',
        invited: invited + freshWalkinsSummary.invited,
        attended: attended + freshWalkinsSummary.attended,
        unitsBooked: unitsBooked + freshWalkinsSummary.unitsBooked,
        agreementsSigned:
          agreementsSigned + freshWalkinsSummary.agreementsSigned,
        salesValue: salesValue + freshWalkinsSummary.salesValue,
        agreementCollected: {
          total:
            agreementCollected + freshWalkinsSummary.agreementCollected.total,
          duringLaunch:
            duringLaunchCollected +
            freshWalkinsSummary.agreementCollected.duringLaunch,
        },
        saleValueCollectedPercentage, // TODO: Recalculate when Fresh Walk-ins data is available
        cxSigned: {
          count: bookedCount + freshWalkinsSummary.cxSigned.count,
          percentage: cxSignedPercentage, // TODO: Recalculate when Fresh Walk-ins data is available
        },
        crmPushed: {
          count: crmPushed + freshWalkinsSummary.crmPushed.count,
          percentage: crmPushed > 0 ? 100 : 0, // TODO: Recalculate when Fresh Walk-ins data is available
        },
      };
      return {
        success: true,
        statusCode: 200,
        message: 'Dashboard summary fetched successfully',
        data: {
          summary: {
            invited,
            attended,
            proratedInvites,
            totalHeadcount,
            unitsBooked,
            totalSalesValue: salesValue,
            agreementValueCollected: agreementCollected,
          },
          overallSummary: [batchSummary, freshWalkinsSummary, totalSummary],
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch dashboard summary. Query: ${JSON.stringify(query)}`,
        error.stack,
      );
      logsAndErrorHandling('BatchService - dashboard summary', error);
    }
  }

  private async getBookedCount(query: DashboardSummaryDto): Promise<number> {
    const queryBuilder = this.batchVoucherRepo
      .createQueryBuilder('voucher')
      .innerJoin('voucher.batch', 'batch')
      .select('COUNT(voucher.id)', 'count')
      .where('voucher.bookedAt IS NOT NULL')
      .andWhere('batch.campaignId = :campaignId', {
        campaignId: query.campaignId,
      })
      .andWhere('batch.stage = :stage', {
        stage: query.stage,
      })
      .andWhere('batch.status IN (:...batchStatuses)', {
        batchStatuses: [BatchStatus.ACTIVE, BatchStatus.ARCHIVED],
      });

    if (query.residentStatus) {
      queryBuilder.andWhere('batch.residentialStatus = :residentStatus', {
        residentStatus: query.residentStatus,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere(
        'DATE(voucher.bookedAt) BETWEEN :startDate AND :endDate',
        {
          startDate: query.startDate,
          endDate: query.endDate,
        },
      );
    }

    const result = await queryBuilder.getRawOne();
    return Number(result?.count ?? 0);
  }

  async getDashboardChart(query: DashboardSummaryDto) {
    try {
      logger.info(
        `Fetching dashboard chart with query: ${JSON.stringify(query)}`,
      );

      const [invitedStats, bookedStats, agreementStats] = await Promise.all([
        this.getInvitedAndAttendedStats(query),
        this.getBookedStats(query),
        this.getAgreementStats(query),
      ]);

      const dateMap = new Map<
        string,
        {
          invited: number;
          attended: number;
          booked: number;
          agreementsSigned: number;
        }
      >();

      for (const row of invitedStats) {
        const dateKey = new Date(row.date).toISOString();

        dateMap.set(dateKey, {
          invited: Number(row.invited) || 0,
          attended: Number(row.attended) || 0,
          booked: 0,
          agreementsSigned: 0,
        });
      }

      this.updateChartMetric(dateMap, bookedStats, 'booked');
      this.updateChartMetric(dateMap, agreementStats, 'agreementsSigned');
      const dates = [...dateMap.keys()].sort();

      return {
        success: true,
        statusCode: 200,
        message: 'Dashboard Chart fetched successfully',
        data: {
          series: {
            invited: dates.map((d) => dateMap.get(d)?.invited ?? 0),
            attended: dates.map((d) => dateMap.get(d)?.attended ?? 0),
            booked: dates.map((d) => dateMap.get(d)?.booked ?? 0),
            agreementsSigned: dates.map(
              (d) => dateMap.get(d)?.agreementsSigned ?? 0,
            ),
          },
          days: dates.map((_, index) => `Day ${index + 1}`),
        },
      };
    } catch (error) {
      logger.error(
        `Failed to fetch dashboard chart. Query: ${JSON.stringify(query)}`,
        error.stack,
      );
      logsAndErrorHandling('BatchService - dashboard chart', error);
    }
  }

  private updateChartMetric(
    dateMap: Map<string, any>,
    rows: any[],
    metric: 'booked' | 'agreementsSigned',
  ) {
    for (const row of rows) {
      const dateKey = new Date(row.date).toISOString();
      const existing = dateMap.get(dateKey);
      if (!existing) {
        continue;
      }

      existing[metric] = Number(row[metric]) || 0;
    }
  }

  private async getInvitedAndAttendedStats(
    query: DashboardSummaryDto,
  ): Promise<any[]> {
    const queryBuilder = this.batchVoucherRepo
      .createQueryBuilder('voucher')
      .innerJoin('voucher.batch', 'batch')
      .innerJoin('voucher.slot', 'slot')
      .select('DATE(slot.date)', 'date')
      .addSelect('COUNT(voucher.id)', 'invited')
      .addSelect(
        'COUNT(CASE WHEN voucher.status = :attendedStatus THEN 1 END)',
        'attended',
      )
      .where('batch.campaignId = :campaignId', {
        campaignId: query.campaignId,
      })
      .andWhere('batch.stage = :stage', {
        stage: query.stage,
      })
      .andWhere('batch.status IN (:...batchStatuses)', {
        batchStatuses: [BatchStatus.ACTIVE, BatchStatus.ARCHIVED],
      })
      .groupBy('DATE(slot.date)')
      .orderBy('DATE(slot.date)', 'ASC')
      .setParameter('attendedStatus', BatchVoucherStatus.ATTENDED);

    this.applyDashboardFilters(queryBuilder, query);
    return queryBuilder.getRawMany();
  }

  private async getBookedStats(query: DashboardSummaryDto): Promise<any[]> {
    const queryBuilder = this.batchVoucherRepo
      .createQueryBuilder('voucher')
      .innerJoin('voucher.batch', 'batch')
      .select('DATE(voucher.bookedAt)', 'date')
      .addSelect('COUNT(voucher.id)', 'booked')
      .where('voucher.bookedAt IS NOT NULL')
      .andWhere('batch.campaignId = :campaignId', {
        campaignId: query.campaignId,
      })
      .andWhere('batch.stage = :stage', {
        stage: query.stage,
      })
      .andWhere('batch.status IN (:...batchStatuses)', {
        batchStatuses: [BatchStatus.ACTIVE, BatchStatus.ARCHIVED],
      });
    if (query.residentStatus) {
      queryBuilder.andWhere('batch.residentialStatus = :residentStatus', {
        residentStatus: query.residentStatus,
      });
    }
    queryBuilder
      .groupBy('DATE(voucher.bookedAt)')
      .orderBy('DATE(voucher.bookedAt)', 'ASC');
    return queryBuilder.getRawMany();
  }

  private async getAgreementStats(query: DashboardSummaryDto): Promise<any[]> {
    const queryBuilder = this.batchVoucherRepo
      .createQueryBuilder('voucher')
      .innerJoin('voucher.batch', 'batch')
      .select('DATE(voucher.agreementSignedAt)', 'date')
      .addSelect('COUNT(voucher.id)', 'agreementsSigned')
      .where('voucher.agreementSignedAt IS NOT NULL')
      .andWhere('batch.campaignId = :campaignId', {
        campaignId: query.campaignId,
      })
      .andWhere('batch.stage = :stage', {
        stage: query.stage,
      })
      .andWhere('batch.status IN (:...batchStatuses)', {
        batchStatuses: [BatchStatus.ACTIVE, BatchStatus.ARCHIVED],
      });

    if (query.residentStatus) {
      queryBuilder.andWhere('batch.residentialStatus = :residentStatus', {
        residentStatus: query.residentStatus,
      });
    }

    queryBuilder
      .groupBy('DATE(voucher.agreementSignedAt)')
      .orderBy('DATE(voucher.agreementSignedAt)', 'ASC');

    return queryBuilder.getRawMany();
  }

  private applyDashboardFilters<T>(
    queryBuilder: SelectQueryBuilder<T>,
    query: DashboardSummaryDto,
  ): void {
    if (query.residentStatus) {
      queryBuilder.andWhere('batch.residentialStatus = :residentStatus', {
        residentStatus: query.residentStatus,
      });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('slot.date BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    }
  }

  private async getBatchDateRange(
    campaignId: number,
    stage: BatchStage,
  ): Promise<{ minDate: Date | null; maxDate: Date | null }> {
    const result = await this.batchRepo
      .createQueryBuilder('batch')
      .select('MIN(batch.startDate)', 'minDate')
      .addSelect('MAX(batch.endDate)', 'maxDate')
      .where('batch.campaignId = :campaignId', { campaignId })
      .andWhere('batch.stage = :stage', { stage })
      .andWhere('batch.status IN (:...statuses)', {
        statuses: [BatchStatus.ACTIVE, BatchStatus.ARCHIVED],
      })
      .getRawOne();

    return {
      minDate: result?.minDate ?? null,
      maxDate: result?.maxDate ?? null,
    };
  }
  private async getDuringValueCollected(
    campaignId: number,
    stage: BatchStage,
  ): Promise<number> {
    const { minDate, maxDate } = await this.getBatchDateRange(
      campaignId,
      stage,
    );

    if (!minDate || !maxDate) {
      return 0;
    }

    const result = await this.batchVoucherRepo
      .createQueryBuilder('batchVoucher')
      .innerJoin(
        'booking_payments',
        'payment',
        'payment.booking_id = batchVoucher.bookingId',
      )
      .select(
        'COALESCE(SUM(payment.paid_amount), 0)',
        'duringLaunchValueCollected',
      )
      .where('payment.payment_date BETWEEN :minDate AND :maxDate', {
        minDate,
        maxDate,
      })
      .getRawOne();

    return Number(result?.duringLaunchValueCollected ?? 0);
  }
}
