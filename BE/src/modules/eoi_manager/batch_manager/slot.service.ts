import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  Not,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { createHash } from 'crypto';
import { lastValueFrom } from 'rxjs';
import { EoiBatchSlot } from './entities/slot.entity';
import { EoiBatch } from './entities/batch.entity';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { logger } from 'src/logger/logger';
import {
  ListSlotsDto,
  SlotDropdownDto,
  UpdateSlotStatusDto,
} from './dto/list-slot.dto';
import {
  IST_TIME_ZONE,
  OTP_EXPIRY_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESEND_COUNT,
  OTP_RESEND_TTL_MS,
  SUCCESS,
} from 'src/config/constants';
import { minutesToTime, timeToMinutes } from 'src/helpers/date.helper';
import { AddBatchSlotsDto, UpdateBatchSlotDto } from './dto/add-slot.dto';
import { EoiBatchVoucher } from 'src/entities';
import {
  BatchStatus,
  BatchVoucherStatus,
  SlotStatusEnum,
} from 'src/enums/batch-manager.enums';
import {
  ListViewRecordsDto,
  ReceptionCheckInDto,
} from './dto/reception-desk.dto';
import { generateOtp } from 'src/utils/generateRandomNumber';
import { getBrandCfg } from 'src/helpers/customerCheck.helper';
import { Users } from 'src/entities';
import { PassThrough } from 'stream';
import * as ExcelJS from 'exceljs';
import { AwsService } from 'src/modules/aws/aws.service';
import { buildSlotExcelSheet } from 'src/helpers/batchSlotExport.helper';
import { format, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const GRE_ELIGIBLE_SLOT_STATUSES = [SlotStatusEnum.OPEN, SlotStatusEnum.ACTIVE];
const receptionOtpKey = (batchVoucherId: string) =>
  `reception_otp:${batchVoucherId}`;
const receptionOtpVerifiedKey = (batchVoucherId: string) =>
  `reception_otp_verified:${batchVoucherId}`;
const receptionOtpAttemptsKey = (batchVoucherId: string) =>
  `reception_otp_attempts:${batchVoucherId}`;
const receptionOtpSendCountKey = (batchVoucherId: string) =>
  `reception_otp_send_count:${batchVoucherId}`;

@Injectable()
export class SlotService {
  constructor(
    @InjectRepository(EoiBatchSlot)
    private readonly slotRepo: Repository<EoiBatchSlot>,
    @InjectRepository(EoiBatch)
    private readonly batchRepo: Repository<EoiBatch>,
    @InjectRepository(EoiBatchVoucher)
    private readonly batchVoucherRepo: Repository<EoiBatchVoucher>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    private readonly awsService: AwsService,
    private readonly dataSource: DataSource,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}

  /** Fetch slots with below filters:
   * - batchId (optional): filter slots for a specific batch
   * - date (optional): filter slots for a specific date
   * pagination and sorting by createdAt, startTime or endTime
   */
  async listSlots(queryDto: ListSlotsDto, user?: any): Promise<any> {
    logger.info('Fetching slot listing', user?.name);

    try {
      const {
        page = 1,
        limit = 10,
        batchId,
        startDate,
        endDate,
        sortBy,
        search,
      } = queryDto;

      // Validate date range pair
      if ((startDate && !endDate) || (!startDate && endDate)) {
        throw new BadRequestException(
          'Both startDate and endDate are required together',
        );
      }

      const batch = await this.batchRepo.findOne({
        where: { id: batchId },
        relations: ['campaign'],
        select: {
          id: true,
          name: true,
          isUserMapped: true,
          status: true,
          campaign: {
            campaignName: true,
          },
        },
      });

      const offset = (page - 1) * limit;

      const allowedSortFields = {
        createdAt: 'slot.createdAt',
        startTime: 'slot.startTime',
        endTime: 'slot.endTime',
        sequence: 'slot.sequence',
        date: 'slot.date',
      };

      let orderByField = 'slot.sequence';
      let orderDirection: 'ASC' | 'DESC' = 'ASC';

      if (sortBy) {
        const [field, direction] = sortBy.split(':');

        if (allowedSortFields[field]) {
          orderByField = allowedSortFields[field];
        }

        if (direction && ['ASC', 'DESC'].includes(direction.toUpperCase())) {
          orderDirection = direction.toUpperCase() as 'ASC' | 'DESC';
        }
      }

      const query = this.slotRepo
        .createQueryBuilder('slot')
        .leftJoin('slot.batchVouchers', 'bv')
        .leftJoin('bv.voucher', 'voucher')
        .select([
          'slot.id AS id',
          'slot.name AS name',
          'slot.batchId AS batchId',
          'slot.capacity AS capacity',
          'slot.sequence AS sequence',
          'slot.startTime AS startTime',
          'slot.endTime AS endTime',
          'slot.status AS status',
          'slot.filledCount AS filledCount',
          'slot.createdAt AS createdAt',
        ])
        .addSelect("DATE_FORMAT(slot.date, '%Y-%m-%d')", 'formattedDate')
        .addSelect('COALESCE(SUM(bv.headCount), 0)', 'headCount')
        .addSelect(
          `
          COUNT(
            CASE
              WHEN bv.status = '${BatchVoucherStatus.ATTENDED}'
              THEN 1
            END
          )
          `,
          'attended',
        )
        .groupBy('slot.id');

      // Batch filter
      if (batchId) {
        query.andWhere('slot.batchId = :batchId', {
          batchId,
        });
      }

      // Date range filter
      if (startDate && endDate) {
        query.andWhere('slot.date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      if (search) {
        query.andWhere(
          `(
            slot.name LIKE :search
            OR bv.customerName LIKE :search
            OR bv.phone LIKE :search
            OR voucher.voucherId LIKE :search
            OR voucher.paidVoucherId LIKE :search
            OR voucher.stdEoiId LIKE :search
            OR voucher.preEoiId LIKE :search
            OR voucher.uniqueReferenceId LIKE :search
          )`,
          {
            search: `%${search}%`,
          },
        );
      }

      query.orderBy(orderByField, orderDirection).offset(offset).limit(limit);

      const total = await query.getCount();

      const slots = await query
        .orderBy(orderByField, orderDirection)
        .offset(offset)
        .limit(limit)
        .getRawMany();

      const result = slots.map((slot) => ({
        id: slot.id,
        name: slot.name,
        batchId: slot.batchId,
        capacity: slot.capacity,
        sequence: slot.sequence,
        startTime: slot.startTime,
        endTime: slot.endTime,
        date: slot.formattedDate,
        status: slot.status,
        filledCount: slot?.filledCount || 0,
        isVoucherMapped: slot.filledCount > 0,
        attended: Number(slot.attended || 0),
        headCount: Number(slot.headCount || 0),
      }));

      return {
        statusCode: SUCCESS,
        message: 'Slots fetched successfully.',
        data: {
          result,
          campaignName: batch.campaign.campaignName,
          batchName: batch.name,
          isUserMapped: batch.isUserMapped,
          batchStatus: batch.status,
          total,
          page,
          limit,
        },
      };
    } catch (e) {
      logger.error('Error occurred while fetching slots', e);

      return logsAndErrorHandling('SlotService - listSlots', e, {
        queryDto,
      });
    }
  }

  /** Add slots with below rules:
   * - Slots can only be added to existing batch day and at the end of existing slots for that day
   * - Slot timings are calculated based on last slot end time and provided duration
   * - Batch day end time is not exceeded after adding new slots
   * - Number of slots added are based on provided numberOfSlots and slotDuration
   * - Slots cannot be added if users are already mapped to the batch
   */
  async addSlots(user: any, dto: AddBatchSlotsDto): Promise<any> {
    return await this.batchRepo.manager.transaction(
      async (manager: EntityManager) => {
        const { batchId } = dto;
        logger.info(`${user?.name} adding slot for ${batchId}`);

        const batch = await manager.findOne(EoiBatch, {
          where: { id: batchId },
          relations: ['days'],
        });

        if (!batch) {
          throw new NotFoundException(`Batch with id '${batchId}' not found.`);
        }

        if (batch.isUserMapped) {
          throw new BadRequestException(
            'Cannot modify slots because users are already mapped.',
          );
        }

        const batchDay = batch.days.find((d) => d.date === dto.date);
        if (!batchDay) {
          throw new BadRequestException(
            `No batch day configuration found for date '${dto.date}'.`,
          );
        }

        const existingSlots = await manager.find(EoiBatchSlot, {
          where: {
            batchId,
            date: dto.date,
          },
          order: {
            startTime: 'ASC',
          },
        });

        if (existingSlots.length === 0) {
          throw new BadRequestException(
            `No slots exist for date '${dto.date}'.`,
          );
        }

        const lastSlot = existingSlots[existingSlots.length - 1];
        const dayEndMins = timeToMinutes(batchDay.endTime);
        let currentStartMins = timeToMinutes(lastSlot.endTime);
        const requiredMinutes = dto.numberOfSlots * dto.slotDuration;
        if (currentStartMins + requiredMinutes > dayEndMins) {
          throw new BadRequestException(
            `Cannot create ${dto.numberOfSlots} slots. Day end time exceeded.`,
          );
        }

        const currentMaxSequence = await manager.maximum(
          EoiBatchSlot,
          'sequence',
          {
            batchId,
          },
        );

        let nextSequence = (currentMaxSequence || 0) + 1;
        const slots: Partial<EoiBatchSlot>[] = [];

        for (let i = 0; i < dto.numberOfSlots; i++) {
          const endMins = currentStartMins + dto.slotDuration;

          slots.push({
            batchId,
            date: dto.date,
            sequence: nextSequence,
            name: `Batch ${nextSequence}`,
            startTime: minutesToTime(currentStartMins),
            endTime: minutesToTime(endMins),
            duration: dto.slotDuration,
            capacity: dto.capacityPerSlot,
          });

          currentStartMins = endMins;
          nextSequence++;
        }
        await manager.insert(EoiBatchSlot, slots);

        // rearrange slot names
        await this.reSequenceBatchSlots(manager, batchId);
        return {
          statusCode: SUCCESS,
          message: `${slots.length} slots added successfully.`,
          data: {
            id: batchId,
            slotsCreated: slots.length,
          },
        };
      },
    );
  }

  private async reSequenceBatchSlots(
    manager: EntityManager,
    batchId: string,
  ): Promise<void> {
    const slots = await manager.find(EoiBatchSlot, {
      where: { batchId },
      order: {
        date: 'ASC',
        startTime: 'ASC',
      },
    });

    for (let index = 0; index < slots.length; index++) {
      const sequence = index + 1;

      slots[index].sequence = sequence;
      slots[index].name = `Batch ${sequence}`;
    }
    await manager.save(EoiBatchSlot, slots);
  }

  /** Update slot end time and capacity with below checks:
   * - Slot end time can only be updated within the same day and must be greater than start time
   * - Subsequent slots on the same day will be shifted accordingly
   * - Update rejected if any slot exceeds batch day end time
   * - Capacity can be updated with rebalance of other slots in the batch
   * - Updates rejected if users are already mapped to the batch
   */
  async updateSlot(slotId: string, dto: UpdateBatchSlotDto): Promise<any> {
    return await this.slotRepo.manager.transaction(
      async (manager: EntityManager) => {
        const slot = await manager.findOne(EoiBatchSlot, {
          where: { id: slotId },
        });

        if (!slot) {
          throw new NotFoundException(`Slot with id '${slotId}' not found.`);
        }

        const batch = await manager.findOne(EoiBatch, {
          where: { id: slot.batchId },
          relations: ['days'],
        });

        if (!batch) {
          throw new NotFoundException('Batch not found.');
        }

        if (batch.isUserMapped) {
          throw new BadRequestException(
            'Cannot modify slots because users are already mapped.',
          );
        }

        const batchDay = batch.days.find((d) => d.date === slot.date);

        if (!batchDay) {
          throw new BadRequestException(
            `Batch day configuration not found for date '${slot.date}'.`,
          );
        }

        // Timing update
        await this.shiftDaySlots(manager, batch, slot, dto.endTime);

        // Capacity update
        if (dto.capacity !== undefined) {
          await this.rebalanceSlotCapacity(
            manager,
            batch.id,
            slot.id,
            dto.capacity,
          );
        }

        return {
          statusCode: SUCCESS,
          data: {
            id: slotId,
          },
          message: 'Slot updated successfully.',
        };
      },
    );
  }

  private async shiftDaySlots(
    manager: EntityManager,
    batch: EoiBatch,
    targetSlot: EoiBatchSlot,
    newEndTime: string,
  ): Promise<void> {
    const slots = await manager.find(EoiBatchSlot, {
      where: {
        batchId: batch.id,
        date: targetSlot.date,
      },
      order: {
        sequence: 'ASC',
      },
    });

    const targetIndex = slots.findIndex((s) => s.id === targetSlot.id);
    if (targetIndex === -1) {
      throw new BadRequestException('Target slot not found in sequence.');
    }

    const batchDay = batch.days.find((d) => d.date === targetSlot.date);
    if (!batchDay) {
      throw new BadRequestException('Batch day configuration not found.');
    }

    const dayStartMins = timeToMinutes(batchDay.startTime);
    const dayEndMins = timeToMinutes(batchDay.endTime);
    const updatedStartMins = timeToMinutes(targetSlot.startTime);
    const updatedEndMins = timeToMinutes(newEndTime);

    if (updatedEndMins <= updatedStartMins) {
      throw new BadRequestException(
        'End time must be greater than start time.',
      );
    }

    if (updatedStartMins < dayStartMins) {
      throw new BadRequestException(
        `Slot cannot start before batch day start time '${batchDay.startTime}'.`,
      );
    }

    if (updatedEndMins > dayEndMins) {
      throw new BadRequestException(
        `Slot cannot exceed batch day end time '${batchDay.endTime}'.`,
      );
    }

    const updatedSlots: EoiBatchSlot[] = [];
    let currentStartMins = updatedStartMins;

    for (let i = targetIndex; i < slots.length; i++) {
      const slot = slots[i];

      const duration =
        i === targetIndex ? updatedEndMins - updatedStartMins : slot.duration;

      const calculatedEndMins = currentStartMins + duration;
      updatedSlots.push({
        ...slot,
        startTime: minutesToTime(currentStartMins),
        endTime: minutesToTime(calculatedEndMins),
        duration,
      });
      currentStartMins = calculatedEndMins;
    }

    // Final boundary validation
    const lastUpdatedSlot = updatedSlots[updatedSlots.length - 1];
    const finalEndMins = timeToMinutes(lastUpdatedSlot.endTime);

    if (finalEndMins > dayEndMins) {
      throw new BadRequestException(
        `Updated slot timings exceed configured day end time '${batchDay.endTime}'.`,
      );
    }

    await manager.save(EoiBatchSlot, updatedSlots);
  }

  private async rebalanceSlotCapacity(
    manager: EntityManager,
    batchId: string,
    slotId: string,
    newCapacity: number,
  ): Promise<void> {
    const slots = await manager.find(EoiBatchSlot, {
      where: { batchId },
      order: {
        date: 'ASC',
        sequence: 'ASC',
      },
    });

    const targetSlot = slots.find((s) => s.id === slotId);
    if (!targetSlot) {
      throw new NotFoundException('Target slot not found.');
    }

    const diff = newCapacity - targetSlot.capacity;
    if (diff === 0) {
      return;
    }

    targetSlot.capacity = newCapacity;
    // Increase capacity
    if (diff > 0) {
      let remainingToRemove = diff;

      for (let i = slots.length - 1; i >= 0; i--) {
        const slot = slots[i];
        if (slot.id === targetSlot.id) {
          continue;
        }

        if (remainingToRemove <= 0) {
          break;
        }

        const removable = Math.min(slot.capacity, remainingToRemove);
        slot.capacity -= removable;
        remainingToRemove -= removable;
      }

      if (remainingToRemove > 0) {
        throw new BadRequestException(
          'Insufficient slot capacity available for redistribution.',
        );
      }
    } else {
      // Decrease capacity
      const lastSlot = slots[slots.length - 1];
      lastSlot.capacity += Math.abs(diff);
    }
    await manager.save(EoiBatchSlot, slots);
  }

  /** Delete slot with below checks:
   *  - Only last slot of the day can be deleted
   *  - Slot with mapped vouchers cannot be deleted
   *  - Slots cannot be deleted if users are already mapped to the batch
   */
  async deleteSlot(user: any, slotId: string): Promise<any> {
    return await this.slotRepo.manager.transaction(
      async (manager: EntityManager) => {
        logger.info(`${user?.name} deleting slot ${slotId}`);

        const slotRepository = manager.getRepository(EoiBatchSlot);
        const batchVoucherRepository = manager.getRepository(EoiBatchVoucher);

        const slot = await slotRepository.findOne({
          where: { id: slotId },
          relations: {
            batch: true,
          },
        });

        if (!slot) {
          throw new NotFoundException('Slot not found');
        }

        // Prevent delete after mapping
        if (slot?.batch?.isUserMapped) {
          throw new BadRequestException(
            'Slots cannot be deleted after voucher mapping',
          );
        }

        // Check mapped vouchers
        const mappedVoucherCount = await batchVoucherRepository.count({
          where: {
            slotId: slot.id,
          },
        });

        if (mappedVoucherCount > 0) {
          throw new BadRequestException(
            'Cannot delete slot with mapped vouchers',
          );
        }

        // Find last slot of same day
        const lastSlot = await slotRepository.findOne({
          where: {
            batchId: slot.batchId,
            date: slot.date,
          },
          order: {
            sequence: 'DESC',
          },
        });

        if (!lastSlot) {
          throw new BadRequestException('Last slot not found');
        }

        // Only last slot can be deleted
        if (lastSlot.id !== slot.id) {
          throw new BadRequestException(
            'Only the last slot of the day can be deleted',
          );
        }

        await slotRepository.delete(slot.id);
        return {
          statusCode: SUCCESS,
          data: {
            id: slotId,
          },
          message: 'Slot deleted successfully',
        };
      },
    );
  }

  /** Fetch slot dropdown for a batch with below rules:
   * - Only active slots are fetched
   * - Slots can be filtered by batchId and optionally by excluding a slotId
   * - Used for voucher mapping to show available slots in a batch excluding the already mapped slot
   */
  async getSlotDropdown(
    batchId: string,
    queryDto: SlotDropdownDto,
  ): Promise<any> {
    try {
      const { excludeSlotId } = queryDto;
      const where: FindOptionsWhere<EoiBatchSlot> = {};

      if (batchId) {
        where.batchId = batchId;
      }

      if (excludeSlotId) {
        where.id = Not(excludeSlotId);
      }

      const slots = await this.slotRepo.find({
        select: {
          id: true,
          name: true,
        },
        where,
        order: {
          sequence: 'ASC',
        },
      });

      return {
        statusCode: SUCCESS,
        message: 'Slot dropdown fetched successfully.',
        data: slots,
      };
    } catch (e) {
      logger.error('Error occurred while fetching slot dropdown', e);

      return logsAndErrorHandling('SlotService - getSlotDropdown', e, {
        queryDto,
      });
    }
  }

  /** Update slot status with below rules:
   * - Slot status can be updated to LOCKED, ACTIVE, OPEN, RELEASED, COMPLETED or ELAPSED
   * - Status transition rules are enforced (e.g. cannot move from LOCKED to OPEN directly)
   * - Slot cannot be moved back to previous statuses (e.g. from RELEASED back to ACTIVE)
   * - Updates rejected if users are already mapped to the batch
   */
  async updateSlotStatus(
    slotId: string,
    body: UpdateSlotStatusDto,
    user?: any,
  ): Promise<any> {
    logger.info(`Updating slot status for slotId: ${slotId}`, user?.name);

    try {
      const { status } = body;

      const slot = await this.slotRepo.findOne({
        where: {
          id: slotId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!slot) {
        throw new NotFoundException('Slot not found');
      }

      // Prevent unnecessary update
      if (slot.status === status) {
        throw new BadRequestException(`Slot is already in ${status} status`);
      }

      await this.slotRepo.update({ id: slotId }, { status });
      return {
        statusCode: SUCCESS,
        data: {
          id: slotId,
          status,
        },
        message: 'Slot status updated successfully.',
      };
    } catch (e) {
      logger.error('Error occurred while updating slot status', e);

      return logsAndErrorHandling('SlotService - updateSlotStatus', e, {
        slotId,
        body,
      });
    }
  }

  async getSlotStatistics(batchId: string): Promise<any> {
    try {
      logger.info(`Fetching slot statistics for batchId: ${batchId}`);
      // Total mapped users across all slots
      const totalEoiRecords =
        (await this.slotRepo.sum('filledCount', {
          batchId,
        })) || 0;

      // Total mapped users in processed slots - (Active, Completed, Elapsed)
      const proratedWalkin =
        (await this.slotRepo.sum('filledCount', {
          batchId,
          status: In([
            SlotStatusEnum.ACTIVE,
            SlotStatusEnum.COMPLETED,
            SlotStatusEnum.ELAPSED,
          ]),
        })) || 0;

      const attended = await this.batchVoucherRepo.count({
        where: {
          batchId,
          status: BatchVoucherStatus.ATTENDED,
        },
      });

      const data = {
        expectedWalkin: totalEoiRecords,
        proratedWalkin,
        attended,
      };

      return {
        statusCode: SUCCESS,
        message: 'Slot statistics fetched successfully.',
        data,
      };
    } catch (e) {
      logger.error('Error occurred while fetching slot statistics', e);
      return logsAndErrorHandling('SlotService - getSlotStatistics', e);
    }
  }

  async exportSlotsExcel(queryDto: ListSlotsDto): Promise<any> {
    try {
      logger.info('Exporting slots excel');
      const slotListResult = await this.listSlots(queryDto);
      const slotList = slotListResult?.data?.result ?? [];
      if (!slotList || slotList.length === 0) {
        return {
          message: 'No slots found to export.',
          data: [],
        };
      }

      const workbook = new ExcelJS.Workbook();
      buildSlotExcelSheet(workbook, { slotList });
      const buffer = await workbook.xlsx.writeBuffer();

      const timeStamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const s3Key = `exports/slots/Batch_Slots-${timeStamp}.xlsx`;

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(s3Key, stream, true);
      return {
        message: 'Slots exported successfully.',
        data: { filePath: s3Key },
      };
    } catch (e) {
      logger.error('Error occurred while exporting slots', e);
      return logsAndErrorHandling('SlotService - exportSlotsExcel', e, {
        queryDto,
      });
    }
  }

  // --- Reception Desk (GRE) ---

  private buildGreVisibilityJoin(
    qb: SelectQueryBuilder<EoiBatchVoucher>,
    slotAlias = 'slot',
  ): SelectQueryBuilder<EoiBatchVoucher> {
    return qb
      .andWhere(`${slotAlias}.status IN (:...greEligibleStatuses)`, {
        greEligibleStatuses: GRE_ELIGIBLE_SLOT_STATUSES,
      })
      .andWhere(`${slotAlias}.deletedAt IS NULL`);
  }

  private async assertGreEligibleBatchVoucher(
    batchVoucherId: string,
    relations: string[] = ['slot', 'voucher', 'batch'],
  ): Promise<EoiBatchVoucher> {
    const mapping = await this.batchVoucherRepo.findOne({
      where: { id: batchVoucherId },
      relations,
    });

    if (!mapping) {
      throw new NotFoundException('Customer record not found');
    }

    if (
      !mapping.slot ||
      !GRE_ELIGIBLE_SLOT_STATUSES.includes(mapping.slot.status) ||
      mapping.slot.deletedAt
    ) {
      throw new BadRequestException(
        'This record is not in an eligible slot for reception operations.',
      );
    }

    return mapping;
  }

  private resolveDisplayMobile(batchVoucher: EoiBatchVoucher): string | null {
    if (batchVoucher.phone?.trim()) {
      return batchVoucher.phone.trim();
    }

    const mobile =
      batchVoucher.voucher?.applicant1?.personalDetails?.mobile ??
      batchVoucher.voucher?.applicant1?.personalDetails?.mobileNumber;

    return mobile ? String(mobile) : null;
  }

  private resolveRegisteredMobile(batchVoucher: EoiBatchVoucher): string {
    const display = this.resolveDisplayMobile(batchVoucher);
    if (display) {
      return display.replace(/\D/g, '');
    }

    throw new BadRequestException(
      'No registered mobile number found for this customer record.',
    );
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private async validateReceptionOtp(
    batchVoucherId: string,
    otp: string,
  ): Promise<void> {
    const key = receptionOtpKey(batchVoucherId);
    const cached = await this.cacheService.get<{
      otpHash: string;
      expireAt: string;
    }>(key);

    const now = Date.now();
    const expireAtTs = cached?.expireAt
      ? new Date(cached.expireAt).getTime()
      : 0;

    if (!cached?.otpHash || !expireAtTs || now >= expireAtTs) {
      throw new BadRequestException('OTP expired. Please request a new OTP.');
    }

    if (cached.otpHash !== this.hashOtp(otp)) {
      const attemptKey = receptionOtpAttemptsKey(batchVoucherId);
      const attempts = (await this.cacheService.get<number>(attemptKey)) ?? 0;
      const nextAttempts = attempts + 1;
      await this.cacheService.set(attemptKey, nextAttempts, OTP_EXPIRY_TTL_MS);

      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        await this.cacheService.del(key);
        throw new BadRequestException(
          'Too many invalid OTP attempts. Please request a new OTP.',
        );
      }

      const remaining = OTP_MAX_ATTEMPTS - nextAttempts;
      throw new BadRequestException(
        `Invalid OTP. (${remaining} attempt${remaining === 1 ? '' : 's'} left)`,
      );
    }
  }

  private createViewRecordsQuery(
    batchId?: string,
    slotId?: string,
    search?: string,
  ): SelectQueryBuilder<EoiBatchVoucher> {
    const qb = this.batchVoucherRepo
      .createQueryBuilder('bv')
      .innerJoinAndSelect('bv.slot', 'slot')
      .innerJoinAndSelect('bv.batch', 'batch')
      .innerJoinAndSelect('bv.voucher', 'voucher')
      .leftJoinAndSelect('voucher.closingRm', 'closingRm')
      .leftJoinAndSelect('voucher.createdBy', 'createdBy')
      .where('voucher.isDeleted = :isDeleted', { isDeleted: false });

    this.buildGreVisibilityJoin(qb);

    if (batchId) {
      qb.andWhere('bv.batchId = :batchId', { batchId });
    }

    if (slotId) {
      qb.andWhere('bv.slotId = :slotId', { slotId });
    }

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        `(voucher.uniqueReferenceId LIKE :term
          OR voucher.paidVoucherId LIKE :term
          OR voucher.stdEoiId LIKE :term
          OR voucher.preEoiId LIKE :term
          OR bv.customerName LIKE :term
          OR bv.phone LIKE :term
          OR JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.mobile')) LIKE :term
          OR JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.mobileNumber')) LIKE :term
          OR JSON_UNQUOTE(JSON_EXTRACT(voucher.applicant1, '$.personalDetails.contactNumber')) LIKE :term
          OR slot.name LIKE :term)`,
        { term },
      );
    }

    return qb;
  }

  private mapViewRecordRow(row: EoiBatchVoucher) {
    return {
      id: row.id,
      uniqueReferenceId: row.voucher?.uniqueReferenceId ?? null,
      paidVoucherId: row.voucher?.paidVoucherId ?? null,
      stdEoiId: row.voucher?.stdEoiId ?? null,
      preEoiId: row.voucher?.preEoiId ?? null,
      customerName: row.customerName ?? null,
      mobileNumber: this.resolveDisplayMobile(row),
      batchId: row.batchId,
      slotId: row.slotId,
      slotName: row.slot?.name ?? null,
      date: row.slot?.date ?? null,
      startTime: row.slot?.startTime ?? null,
      attendanceStatus: row.status,
      headCount: row.headCount ?? null,
      closingRm: row.voucher?.closingRm?.name ?? null,
      sourcingRm: row.voucher?.createdBy?.name ?? null,
      checkedInAt: row.checkedInAt ?? null,
    };
  }

  async listViewRecords(queryDto: ListViewRecordsDto): Promise<any> {
    try {
      const {
        page = 1,
        limit = 10,
        batchId,
        slotId,
        sortBy,
        search,
      } = queryDto;
      const offset = (page - 1) * limit;

      const qb = this.createViewRecordsQuery(batchId, slotId, search);

      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        const sortMap: Record<string, string> = {
          customerName: 'bv.customerName',
          assignedAt: 'bv.assignedAt',
          checkedInAt: 'bv.checkedInAt',
          date: 'slot.date',
          startTime: 'slot.startTime',
        };
        if (sortMap[field]) {
          qb.orderBy(
            sortMap[field],
            (direction || 'DESC').toUpperCase() as 'ASC' | 'DESC',
          );
        }
      } else {
        qb.addSelect(
          `
          CASE
            WHEN bv.status = '${BatchVoucherStatus.INVITED}' THEN 1
            WHEN bv.status = '${BatchVoucherStatus.ATTENDED}' THEN 2
            ELSE 3
          END
          `,
          'statusPriority',
        )
          .orderBy('statusPriority', 'ASC')
          .addOrderBy('bv.assignedAt', 'DESC');
      }

      qb.skip(offset).take(limit);

      const [rows, total] = await qb.getManyAndCount();

      return {
        statusCode: SUCCESS,
        message: 'View records fetched successfully.',
        data: {
          result: rows.map((row) => this.mapViewRecordRow(row)),
          total,
          page,
          limit,
        },
      };
    } catch (e) {
      return logsAndErrorHandling('SlotService - listViewRecords', e, {
        queryDto,
      });
    }
  }

  async getReceptionDashboard(batchId: string): Promise<any> {
    try {
      const batch = await this.batchRepo.findOne({
        where: { id: batchId, status: BatchStatus.ACTIVE },
      });

      if (!batch) {
        throw new NotFoundException('Batch not found or not active');
      }

      const expectedWalkin =
        (
          await this.slotRepo
            .createQueryBuilder('slot')
            .select('COALESCE(SUM(slot.filledCount), 0)', 'total')
            .where('slot.batchId = :batchId', { batchId })
            .andWhere('slot.status IN (:...greEligibleStatuses)', {
              greEligibleStatuses: GRE_ELIGIBLE_SLOT_STATUSES,
            })
            .andWhere('slot.deletedAt IS NULL')
            .getRawOne()
        )?.total ?? 0;

      const proratedInvites =
        (
          await this.slotRepo
            .createQueryBuilder('slot')
            .select('COALESCE(SUM(slot.filledCount), 0)', 'total')
            .where('slot.batchId = :batchId', { batchId })
            .andWhere('slot.status = :activeStatus', {
              activeStatus: SlotStatusEnum.ACTIVE,
            })
            .andWhere('slot.deletedAt IS NULL')
            .getRawOne()
        )?.total ?? 0;

      const attended = await this.batchVoucherRepo.count({
        where: { batchId, status: BatchVoucherStatus.ATTENDED },
      });

      const totalHeadcount =
        (
          await this.batchVoucherRepo
            .createQueryBuilder('bv')
            .select('COALESCE(SUM(bv.headCount), 0)', 'total')
            .innerJoin('bv.slot', 'slot')
            .where('bv.batchId = :batchId', { batchId })
            .andWhere('bv.status = :attended', {
              attended: BatchVoucherStatus.ATTENDED,
            })
            .andWhere('slot.status IN (:...greEligibleStatuses)', {
              greEligibleStatuses: GRE_ELIGIBLE_SLOT_STATUSES,
            })
            .andWhere('slot.deletedAt IS NULL')
            .getRawOne()
        )?.total ?? 0;

      const istNow = toZonedTime(new Date(), IST_TIME_ZONE);
      const startOfDayUtc = fromZonedTime(startOfDay(istNow), IST_TIME_ZONE);

      const attendedToday = await this.batchVoucherRepo
        .createQueryBuilder('bv')
        .innerJoin('bv.slot', 'slot')
        .where('bv.batchId = :batchId', { batchId })
        .andWhere('bv.status = :attended', {
          attended: BatchVoucherStatus.ATTENDED,
        })
        .andWhere('bv.checkedInAt >= :startOfDay', {
          startOfDay: startOfDayUtc,
        })
        .andWhere('slot.status IN (:...greEligibleStatuses)', {
          greEligibleStatuses: GRE_ELIGIBLE_SLOT_STATUSES,
        })
        .andWhere('slot.deletedAt IS NULL')
        .getCount();

      return {
        statusCode: SUCCESS,
        message: 'Reception dashboard fetched successfully.',
        data: {
          invited: Number(expectedWalkin),
          attended,
          proratedInvites: Number(proratedInvites),
          totalHeadcount: Number(totalHeadcount),
          liveAttendanceCounters: {
            attendedToday,
          },
        },
      };
    } catch (e) {
      return logsAndErrorHandling('SlotService - getReceptionDashboard', e, {
        batchId,
      });
    }
  }

  async getAttendanceDetail(batchVoucherId: string): Promise<any> {
    try {
      const mapping = await this.assertGreEligibleBatchVoucher(batchVoucherId, [
        'slot',
        'voucher',
        'batch',
      ]);

      let checkedInByName: string | null = null;
      if (mapping.checkedInBy) {
        const user = await this.userRepo.findOne({
          where: { id: Number(mapping.checkedInBy) },
          select: { id: true, name: true },
        });
        checkedInByName = user?.name ?? null;
      }

      return {
        statusCode: SUCCESS,
        message: 'Attendance detail fetched successfully.',
        data: {
          batchVoucherId: mapping.id,
          attendanceStatus: mapping.status,
          headCount: mapping.headCount ?? null,
          checkedInAt: mapping.checkedInAt ?? null,
          checkedInBy: mapping.checkedInBy ?? null,
          checkedInByName,
          customerName: mapping.customerName,
          mobileNumber: mapping.phone,
          batchNo: mapping.batch?.name,
          slotName: mapping.slot?.name,
        },
      };
    } catch (e) {
      return logsAndErrorHandling('SlotService - getAttendanceDetail', e, {
        batchVoucherId,
      });
    }
  }

  async sendReceptionOtp(batchVoucherId: string, user?: any): Promise<any> {
    try {
      const mapping = await this.assertGreEligibleBatchVoucher(batchVoucherId);
      if (mapping.status === BatchVoucherStatus.ATTENDED) {
        throw new BadRequestException('Customer has already checked in.');
      }

      const mobile = this.resolveRegisteredMobile(mapping);
      await this.issueReceptionOtp(mobile, batchVoucherId);

      logger.info('Reception OTP sent', {
        batchVoucherId,
        greUserId: user?.dbId,
      });

      return {
        statusCode: SUCCESS,
        message: 'OTP sent successfully to registered mobile.',
        data: { batchVoucherId },
      };
    } catch (e) {
      return logsAndErrorHandling('SlotService - sendReceptionOtp', e, {
        batchVoucherId,
      });
    }
  }

  async resendReceptionOtp(batchVoucherId: string, user?: any): Promise<any> {
    try {
      const mapping = await this.assertGreEligibleBatchVoucher(batchVoucherId);
      if (mapping.status === BatchVoucherStatus.ATTENDED) {
        throw new BadRequestException('Customer has already checked in.');
      }

      const key = receptionOtpKey(batchVoucherId);
      const existing = await this.cacheService.get<{
        otpHash: string;
        windowStart: string;
        resendCount: number;
        lastSentAt: string;
        expireAt: string;
      }>(key);

      const now = Date.now();
      let resendPatch: { windowStart?: string; resendCount?: number };

      if (existing?.lastSentAt) {
        const lastSentAt = new Date(existing.lastSentAt).getTime();
        if (now - lastSentAt < OTP_RESEND_TTL_MS) {
          throw new BadRequestException(
            'Please wait before requesting a new OTP.',
          );
        }

        const windowStart = new Date(existing.windowStart).getTime();
        const withinWindow = now - windowStart < OTP_EXPIRY_TTL_MS;
        const resendCount = withinWindow ? (existing.resendCount ?? 0) + 1 : 1;

        if (withinWindow && resendCount > OTP_MAX_RESEND_COUNT) {
          throw new BadRequestException(
            'Too many OTP resend requests. Please try again later.',
          );
        }

        resendPatch = {
          windowStart: withinWindow
            ? existing.windowStart
            : new Date(now).toISOString(),
          resendCount,
        };
      }

      const mobile = this.resolveRegisteredMobile(mapping);
      await this.issueReceptionOtp(mobile, batchVoucherId, resendPatch);

      logger.info('Reception OTP resent', {
        batchVoucherId,
        greUserId: user?.dbId,
      });

      return {
        statusCode: SUCCESS,
        message: 'OTP resent successfully.',
        data: { batchVoucherId },
      };
    } catch (e) {
      return logsAndErrorHandling('SlotService - resendReceptionOtp', e, {
        batchVoucherId,
      });
    }
  }

  async markAttendance(dto: ReceptionCheckInDto, user: any): Promise<any> {
    try {
      const { batchVoucherId, headCount, otp } = dto;

      const mapping = await this.assertGreEligibleBatchVoucher(batchVoucherId);
      if (mapping.status === BatchVoucherStatus.ATTENDED) {
        throw new BadRequestException('Customer has already checked in.');
      }

      await this.validateReceptionOtp(batchVoucherId, otp);

      const result = await this.dataSource.transaction(async (manager) => {
        const voucherRepo = manager.getRepository(EoiBatchVoucher);
        const mapping = await voucherRepo.findOne({
          where: { id: batchVoucherId },
          relations: ['slot'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!mapping) {
          throw new NotFoundException('Customer record not found');
        }

        if (mapping.status === BatchVoucherStatus.ATTENDED) {
          throw new BadRequestException(
            'Attendance has already been recorded for this customer.',
          );
        }

        if (
          !mapping.slot ||
          !GRE_ELIGIBLE_SLOT_STATUSES.includes(mapping.slot.status) ||
          mapping.slot.deletedAt
        ) {
          throw new BadRequestException(
            'This record is not in an eligible slot for check-in.',
          );
        }

        mapping.status = BatchVoucherStatus.ATTENDED;
        mapping.headCount = headCount;
        mapping.checkedInAt = new Date();
        mapping.checkedInBy = user?.dbId ? String(user.dbId) : null;

        await voucherRepo.save(mapping);

        await this.cacheService.del(receptionOtpKey(batchVoucherId));
        await this.cacheService.del(receptionOtpVerifiedKey(batchVoucherId));
        await this.cacheService.del(receptionOtpAttemptsKey(batchVoucherId));

        return {
          batchVoucherId: mapping.id,
          attendanceStatus: mapping.status,
          headCount: mapping.headCount,
          checkedInAt: mapping.checkedInAt,
          checkedInBy: mapping.checkedInBy,
        };
      });

      logger.info('Reception check-in completed', {
        batchVoucherId,
        greUserId: user?.dbId,
      });

      return {
        statusCode: SUCCESS,
        message: 'Attendance marked successfully.',
        data: result,
      };
    } catch (e) {
      return logsAndErrorHandling('SlotService - markAttendance', e, { dto });
    }
  }

  private async issueReceptionOtp(
    mobile: string,
    batchVoucherId: string,
    existing?: {
      windowStart?: string;
      resendCount?: number;
      lastSentAt?: string;
    },
  ): Promise<void> {
    const staticOTP = this.config.get<string>('STATIC_LOGIN_OTP');
    const otp = staticOTP || generateOtp();
    const now = new Date();
    const key = receptionOtpKey(batchVoucherId);

    // SEND + RESEND LIMIT CHECK
    const sendCountKey = receptionOtpSendCountKey(batchVoucherId);
    const sendCount = (await this.cacheService.get<number>(sendCountKey)) ?? 0;
    if (sendCount >= 5) {
      throw new BadRequestException(
        'Maximum OTP request limit reached. Please try again after 10 minutes.',
      );
    }
    // increment count with 10 min ttl
    await this.cacheService.set(sendCountKey, sendCount + 1, OTP_EXPIRY_TTL_MS);

    await this.cacheService.set(
      key,
      {
        otpHash: this.hashOtp(otp),
        windowStart: existing?.windowStart ?? now.toISOString(),
        resendCount: existing?.resendCount ?? 1,
        lastSentAt: now.toISOString(),
        expireAt: new Date(now.getTime() + OTP_EXPIRY_TTL_MS).toISOString(),
      },
      OTP_EXPIRY_TTL_MS,
    );

    const cfg = getBrandCfg(this.config);
    const smsUrl =
      this.config.get<string>('SMS_URL') ??
      'https://sms.versatilesmshub.com/api/smsservices.php';
    const campaignId = this.config.get<string>('SMS_CAMPAIGN_ID') || 'otp';
    const channel = this.config.get<string>('SMS_CHANNEL') || 'otp';

    const message =
      `Reception Check-In: ${otp} is the one-time password for authentication. ` +
      `OTP expires in 30 seconds. Please do not share it with anyone. ${cfg.signature}`;

    await this.sendReceptionSms({
      url: smsUrl,
      api: cfg.api,
      senderId: cfg.senderId,
      templateId: cfg.templateId,
      countryCode: cfg.country,
      number: mobile,
      message,
      campaignId,
      channel,
    });
  }

  private async sendReceptionSms(args: {
    url: string;
    api: string;
    senderId: string;
    templateId: string;
    countryCode: string;
    number: string;
    message: string;
    campaignId?: string;
    channel?: string;
  }): Promise<void> {
    try {
      const code = (args.countryCode || '91').replaceAll(/\D/g, '');
      const mobile = (args.number || '').replaceAll(/\D/g, '');
      const body = {
        api: args.api,
        senderid: args.senderId,
        campaignid: args.campaignId ?? 'otp',
        channel: args.channel ?? 'otp',
        templateid: args.templateId,
        dcs: '0',
        shorturl: 'NO',
        data: [
          {
            international: 'NO',
            countrycode: code,
            number: mobile,
            message: args.message,
            url: '',
          },
        ],
      };

      const { status, statusText } = await lastValueFrom(
        this.http.post(args.url, body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000,
        }),
      );

      if (status < 200 || status >= 300) {
        throw new Error(`SMS provider non-2xx: ${status} ${statusText}`);
      }
    } catch (e) {
      throw new InternalServerErrorException(
        `Failed to send OTP SMS: ${e?.message ?? e}`,
      );
    }
  }
}
