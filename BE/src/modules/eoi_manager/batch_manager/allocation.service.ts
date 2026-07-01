import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { EoiBatch } from './entities/batch.entity';
import { EoiBatchSlot } from './entities/slot.entity';
import { EoiBatchVoucher } from './entities/batch_voucher.entity';
import { VoucherForm } from 'src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { logger } from 'src/logger/logger';
import {
  BATCH_NOTIFICATION_QUEUE,
  IST_TIME_ZONE,
  SUCCESS,
} from 'src/config/constants';
import { BatchService } from './batch.service';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { MoveVoucherToSlotDto } from './dto/list-slot.dto';
import {
  BatchQueueJobs,
  BatchStage,
  BatchVoucherStatus,
} from 'src/enums/batch-manager.enums';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueJobAuditService } from 'src/modules/queue_audit/queue-job-audit.service';
import { QUEUE_JOB_AUDIT_EVENT } from 'src/modules/queue_audit/queue-job-audit.constants';
import { fromZonedTime, format } from 'date-fns-tz';
@Injectable()
export class AllocationService {
  constructor(
    @InjectRepository(EoiBatch)
    private readonly batchRepo: Repository<EoiBatch>,
    @InjectRepository(EoiBatchSlot)
    private readonly slotRepo: Repository<EoiBatchSlot>,
    @InjectRepository(EoiBatchVoucher)
    private readonly batchVoucherRepo: Repository<EoiBatchVoucher>,
    @InjectRepository(VoucherForm)
    private readonly voucherRepo: Repository<VoucherForm>,
    private readonly dataSource: DataSource,
    private readonly batchService: BatchService,
    @InjectQueue(BATCH_NOTIFICATION_QUEUE)
    private readonly batchNotificationQueue: Queue,
    private readonly queueJobAuditService: QueueJobAuditService,
  ) {}

  /**
   * POST /batch/:id/map-vouchers
   *
   * Business rules enforced:
   *  Fetches vouchers by campaignId filtered to PAID / PARTIALLY_PAID only.
   *  Sorts by 6-tier priority (Pref Full → Voucher Partial).
   *  Assigns sequentially to slots respecting per-slot capacity.
   *  Business rule #9: overflow vouchers are silently ignored — no error.
   *  Business rule #8: rejects if batch already MAPPED.
   *  Wraps insert + status update in a single transaction.
   */
  async mapVouchersToSlots(
    batchId: string,
    user?: any,
    notifyAt?: Date,
  ): Promise<any> {
    logger.info(
      `Starting voucher allocation for batchId: ${batchId}`,
      user?.name,
    );

    try {
      let batchStage: BatchStage;
      const response = await this.dataSource.transaction(async (manager) => {
        const batchRepo = manager.getRepository(EoiBatch);
        const slotRepo = manager.getRepository(EoiBatchSlot);
        const batchVoucherRepo = manager.getRepository(EoiBatchVoucher);

        /**
         * -------------------------------------------------
         * STEP 1
         * Validate batch
         * -------------------------------------------------
         */
        const batch = await batchRepo.findOne({
          where: {
            id: batchId,
          },
          relations: {
            campaign: true,
          },
          select: {
            id: true,
            stage: true,
            isUserMapped: true,
            status: true,
            campaignId: true,
            preferenceIds: true,
            typology: true,
            residentialStatus: true,
            startDate: true,
            campaign: {
              id: true,
              venueName: true,
            },
          },
        });

        if (!batch) {
          throw new NotFoundException('Batch not found');
        }

        batchStage = batch.stage;

        /**
         * Prevent remapping
         */
        if (batch.isUserMapped) {
          throw new BadRequestException(
            'Vouchers already mapped for this batch',
          );
        }

        if (!batch?.campaign?.venueName?.trim()) {
          throw new BadRequestException(
            'Please configure the venue name for this campaign before sending notifications.',
          );
        }

        if (notifyAt) {
          logger.info(`================ NOTIFY DATE CHECK ================`);
          const notifyAtDate = new Date(notifyAt);
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
        }

        /**
         * -------------------------------------------------
         * STEP 2
         * Fetch slots
         * -------------------------------------------------
         */
        const slots = await slotRepo.find({
          where: {
            batchId,
          },
          select: {
            id: true,
            capacity: true,
            filledCount: true,
            sequence: true,
            status: true,
          },
          order: {
            sequence: 'ASC',
          },
        });

        if (!slots.length) {
          throw new BadRequestException('No slots available for allocation');
        }

        /**
         * -------------------------------------------------
         * STEP 3
         * Calculate total capacity
         * -------------------------------------------------
         */
        const totalCapacity = this.calculateTotalCapacity(slots);
        /**
         * -------------------------------------------------
         * STEP 4
         * Fetch vouchers
         */
        const vouchers = await this.batchService.getEligibleVouchers({
          campaignId: batch.campaignId,
          residentialStatus: batch.residentialStatus,
          preferenceIds: batch.preferenceIds,
          typology: batch.typology ?? [],
          stage: batch.stage,
        });

        if (!vouchers.length) {
          throw new BadRequestException(
            'No eligible vouchers found for allocation',
          );
        }

        /**
         * -------------------------------------------------
         * STEP 5
         * Allocate vouchers sequentially
         * -------------------------------------------------
         */
        const { mappings, slotUpdates } = this.allocateVouchersToSlots(
          slots,
          vouchers,
          batch,
          batchId,
        );
        /**
         * -------------------------------------------------
         * STEP 6
         * Bulk insert mappings
         * -------------------------------------------------
         */
        await batchVoucherRepo.insert(mappings);

        /**
         * -------------------------------------------------
         * STEP 7
         * Update slot filled counts
         * -------------------------------------------------
         */
        for (const slotUpdate of slotUpdates) {
          await slotRepo.update(
            {
              id: slotUpdate.id,
            },
            {
              filledCount: slotUpdate.filledCount,
            },
          );
        }

        /**
         * -------------------------------------------------
         * STEP 8
         * Mark batch mapped
         * -------------------------------------------------
         */
        const updatePayload: any = {
          isUserMapped: true,
        };
        if (notifyAt) {
          updatePayload.notifyAt = notifyAt;
        } else {
          // notify now
          updatePayload.notifyAt = new Date();
          updatePayload.isNotified = true;
          //queue email notification for all allocated vouchers
        }
        await batchRepo.update({ id: batchId }, updatePayload);

        /**
         * -------------------------------------------------
         * STEP 9
         * Response
         * -------------------------------------------------
         */
        return {
          statusCode: SUCCESS,
          message: 'Vouchers allocated successfully.',
          data: {
            batchId,
            totalAllocated: mappings.length,
            totalSlots: slots.length,
            totalCapacity,
          },
        };
      });

      // ================= QUEUE BACKGROUND NOTIFICATION - IN CASE OF NOTIFY NOW =================
      if (notifyAt) {
        // Schedule notification for later
        await this.batchService.scheduleBatchNotification({
          batchId,
          notifyAt,
          stage: batchStage,
          userId: user?.dbId,
        });
      } else {
        const job = await this.batchNotificationQueue.add(
          BatchQueueJobs.BATCH_STAGE_NOTIFICATION,
          {
            userId: user?.dbId,
            batchId,
            stage: batchStage,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 10_000,
            },
            removeOnComplete: 500,
            removeOnFail: 1_000,
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
            stage: batchStage,
          },
          triggeredByUserId: user?.dbId,
        });
      }

      return response;
    } catch (e) {
      logger.error('Error occurred while allocating vouchers', e);

      return logsAndErrorHandling('SlotService - mapVouchersToSlots', e, {
        batchId,
      });
    }
  }

  private allocateVouchersToSlots(
    slots: EoiBatchSlot[],
    vouchers: any[],
    batch: EoiBatch,
    batchId: string,
  ) {
    const mappings: Partial<EoiBatchVoucher>[] = [];
    const slotUpdates: {
      id: string;
      filledCount: number;
    }[] = [];

    let voucherIndex = 0;
    for (const slot of slots) {
      const availableCapacity = slot.capacity - slot.filledCount;
      if (availableCapacity <= 0) {
        continue;
      }

      let allocatedCount = 0;
      for (let i = 0; i < availableCapacity; i++) {
        const voucher = vouchers[voucherIndex];

        if (!voucher) {
          break;
        }

        mappings.push({
          batchId,
          slotId: slot.id,
          voucherId: voucher.voucherId,
          stage: batch.stage,
          customerName: voucher.firstName + ' ' + voucher.lastName,
          email: voucher.emailAddress,
          phone: voucher.contactNumber,
          status: BatchVoucherStatus.MAPPED,
        });

        voucherIndex++;
        allocatedCount++;
      }

      if (allocatedCount > 0) {
        slotUpdates.push({
          id: slot.id,
          filledCount: slot.filledCount + allocatedCount,
        });
      }

      /**
       * Stop early if all vouchers allocated
       */
      if (voucherIndex >= vouchers.length) {
        break;
      }
    }

    if (!mappings.length) {
      throw new BadRequestException('No vouchers allocated');
    }

    return {
      mappings,
      slotUpdates,
    };
  }

  private calculateTotalCapacity(slots: EoiBatchSlot[]) {
    const totalCapacity = slots.reduce((sum, slot) => {
      return sum + (slot.capacity - slot.filledCount);
    }, 0);

    if (totalCapacity <= 0) {
      throw new BadRequestException('No slot capacity available');
    }

    return totalCapacity;
  }

  async getBatchVouchers(slotId: string, query: CommonFindAllQueryDto) {
    try {
      const slotDetails = await this.slotRepo.findOne({
        where: { id: slotId },
        relations: ['batch', 'batch.campaign'],
      });
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;

      const [vouchers, total] = await this.batchVoucherRepo.findAndCount({
        where: [
          {
            slotId,
            ...(query.search && {
              customerName: ILike(`%${query.search}%`),
            }),
          },
          {
            slotId,
            ...(query.search && {
              voucher: {
                uniqueReferenceId: ILike(`%${query.search}%`),
              },
            }),
          },
        ],
        relations: ['batch', 'voucher', 'voucher.closingRm', 'slot'],
        order: {
          assignedAt: 'DESC',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      const result = vouchers.map((item) => ({
        id: item.id,
        voucherId: item.voucherId,
        customerName: item.customerName,
        slotName: item?.slot?.name,
        cxStatus: item.status,
        uniqueReferenceId: item.voucher.uniqueReferenceId ?? null,
        closingRmName: item.voucher?.closingRm?.name ?? null,
      }));

      return {
        statusCode: 200,
        message: 'Batch vouchers fetched successfully',
        data: {
          result,
          batchId: slotDetails?.batch?.id || null,
          batchName: slotDetails?.batch?.name || null,
          slotName: slotDetails?.name || null,
          campaignName: slotDetails?.batch?.campaign?.campaignName,
          batchStatus: slotDetails?.batch?.status,
          total,
          page,
          limit,
        },
      };
    } catch (e) {
      logger.error('Error occurred while fetching slots', e);
      return logsAndErrorHandling('SlotService - listSlots', e, {
        query,
      });
    }
  }

  // slot.service.ts

  async moveVoucherToAnotherSlot(
    MappedvoucherId: string,
    dto: MoveVoucherToSlotDto,
    user: any,
  ) {
    const { targetSlotId, comments } = dto;

    logger.info(
      `${user.dbId} is moving voucher Mapping ${MappedvoucherId} to slot ${targetSlotId}`,
    );
    try {
      const data = await this.batchVoucherRepo.manager.transaction(
        async (manager) => {
          const voucherRepo = manager.getRepository(EoiBatchVoucher);
          const slotRepo = manager.getRepository(EoiBatchSlot);

          /**
           * -------------------------------------------------
           * STEP 1
           * Fetch voucher mapping with lock
           * -------------------------------------------------
           */
          const voucherMapping = await voucherRepo.findOne({
            where: {
              id: MappedvoucherId,
            },
            lock: {
              mode: 'pessimistic_write',
            },
          });

          if (!voucherMapping) {
            throw new BadRequestException('Voucher mapping not found.');
          }

          /**
           * -------------------------------------------------
           * STEP 2
           * Prevent same slot reassignment
           * -------------------------------------------------
           */
          if (voucherMapping.slotId === targetSlotId) {
            throw new BadRequestException(
              'Voucher is already assigned to the selected slot.',
            );
          }

          /**
           * -------------------------------------------------
           * STEP 3
           * Fetch source slot with lock
           * -------------------------------------------------
           */
          const sourceSlot = await slotRepo.findOne({
            where: {
              id: voucherMapping.slotId,
            },
            lock: {
              mode: 'pessimistic_write',
            },
          });

          if (!sourceSlot) {
            throw new BadRequestException('Source slot not found.');
          }

          /**
           * -------------------------------------------------
           * STEP 4
           * Fetch target slot with lock
           * -------------------------------------------------
           */
          const targetSlot = await slotRepo.findOne({
            where: {
              id: targetSlotId,
            },
            lock: {
              mode: 'pessimistic_write',
            },
          });

          if (!targetSlot) {
            throw new BadRequestException('Target slot not found.');
          }

          /**
           * -------------------------------------------------
           * STEP 5
           * Prevent cross-batch movement
           * -------------------------------------------------
           */
          if (sourceSlot.batchId !== targetSlot.batchId) {
            throw new BadRequestException(
              'Voucher can only be moved within the same batch.',
            );
          }

          /**
           * -------------------------------------------------
           * STEP 6
           * Validate source slot occupancy
           * -------------------------------------------------
           */
          if (sourceSlot.filledCount <= 0) {
            throw new BadRequestException('Invalid source slot occupancy.');
          }

          /**
           * -------------------------------------------------
           * STEP 9
           * Update voucher mapping
           * -------------------------------------------------
           */
          voucherMapping.slotId = targetSlotId;
          if (comments) {
            voucherMapping.comments = comments;
          }
          await voucherRepo.save(voucherMapping);

          /**
           * -------------------------------------------------
           * STEP 10
           * Update slot occupancy
           * -------------------------------------------------
           */
          await slotRepo.decrement(
            {
              id: sourceSlot.id,
            },
            'filledCount',
            1,
          );

          await slotRepo.increment(
            {
              id: targetSlot.id,
            },
            'filledCount',
            1,
          );

          /**
           * -------------------------------------------------
           * STEP 11
           * Return transaction payload
           * -------------------------------------------------
           */
          return {
            id: voucherMapping.id,
            MappedvoucherId,
            fromSlotId: sourceSlot.id,
            toSlotId: targetSlot.id,
          };
        },
      );

      //send move notificaio to customer
      await this.batchService.sendSingleCustomerNotification(
        MappedvoucherId,
        true,
      );

      return {
        statusCode: SUCCESS,
        message: 'Voucher moved to another slot successfully.',
        data,
      };
    } catch (error) {
      logger.error(
        `Failed to move voucher Mapped ${MappedvoucherId} to slot ${targetSlotId}`,
        error.stack,
      );

      return logsAndErrorHandling(
        'SlotService - moveVoucherToAnotherSlot',
        error,
        {
          MappedvoucherId,
          targetSlotId,
        },
      );
    }
  }
}
