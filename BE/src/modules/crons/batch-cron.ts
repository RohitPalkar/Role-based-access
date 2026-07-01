import { Cron } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format, subMinutes } from 'date-fns';
import { EoiBatchSlot, EoiBatchVoucher } from 'src/entities';
import {
  BatchStatus,
  BatchVoucherStatus,
  SlotStatusEnum,
} from 'src/enums/batch-manager.enums';
import { logger } from 'src/logger/logger';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { IST_TIME_ZONE } from 'src/config/constants';

@Injectable()
export class BatchCron {
  constructor(
    @InjectRepository(EoiBatchSlot)
    private readonly batchSlotRepo: Repository<EoiBatchSlot>,
    @InjectRepository(EoiBatchVoucher)
    private readonly batchVoucherRepo: Repository<EoiBatchVoucher>,
  ) {}

  @Cron('* * * * *') // Every minute
  async handleBatchSlotStatus(): Promise<void> {
    try {
      logger.info('Starting batch slot status cron');
      const slots = await this.getTodaySlots();
      await this.updateSlotStatus(slots);
      logger.info('Completed batch slot status cron');
    } catch (error) {
      logger.error(
        `Error in handleBatchSlotStatus cron: ${error?.message}`,
        error?.stack,
      );
    }
  }
  /**
   * Open slot before start time and Active batch when start time is reached
   */
  private async updateSlotStatus(slots: EoiBatchSlot[]): Promise<void> {
    try {
      if (!slots?.length) {
        logger.info('No slots found for status update');
        return;
      }
      logger.info('Starting slot status update cron');
      for (const slot of slots) {
        const updatedStatus = await this.getUpdatedSlotStatus(slot);

        if (!updatedStatus) {
          continue;
        }
        slot.status = updatedStatus;
        await this.batchSlotRepo.save(slot);
      }
    } catch (error) {
      logger.error('Error in updateSlotStatus cron:', error);
    }
  }
  private async getTodaySlots(): Promise<EoiBatchSlot[]> {
    const now = new Date();
    const currentDate = formatInTimeZone(now, IST_TIME_ZONE, 'yyyy-MM-dd');

    return this.batchSlotRepo
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.batch', 'batch')
      .where('batch.status = :batchStatus', {
        batchStatus: BatchStatus.ACTIVE,
      })
      .andWhere('slot.filledCount > 0')
      .andWhere('slot.status IN (:...statuses)', {
        statuses: [
          SlotStatusEnum.LOCKED,
          SlotStatusEnum.OPEN,
          SlotStatusEnum.ACTIVE,
        ],
      })
      .andWhere('slot.date = :currentDate', {
        currentDate,
      })
      .getMany();
  }

  private async getUpdatedSlotStatus(
    slot: EoiBatchSlot,
  ): Promise<SlotStatusEnum | null> {
    const now = new Date();
    const slotDate = format(slot.date, 'yyyy-MM-dd');
    // Convert IST time properly to UTC
    const startDateTime = fromZonedTime(
      `${slotDate} ${slot.startTime}`,
      IST_TIME_ZONE,
    );

    const endDateTime = fromZonedTime(
      `${slotDate} ${slot.endTime}`,
      IST_TIME_ZONE,
    );

    let updatedStatus: SlotStatusEnum | null = null;
    const openBatchBefore = slot.batch?.openBatchBefore || 0;

    /**
     * LOCKED -> OPEN
     */
    if (openBatchBefore > 0) {
      const openDateTime = subMinutes(startDateTime, openBatchBefore);

      if (
        slot.status === SlotStatusEnum.LOCKED &&
        now >= openDateTime &&
        now < startDateTime
      ) {
        updatedStatus = SlotStatusEnum.OPEN;
      }
    }

    /**
     * OPEN -> ACTIVE
     */
    if (
      (slot.status === SlotStatusEnum.OPEN ||
        slot.status === SlotStatusEnum.LOCKED) &&
      now >= startDateTime &&
      now < endDateTime
    ) {
      updatedStatus = SlotStatusEnum.ACTIVE;
    }

    /**
     * ACTIVE -> COMPLETED / ELAPSED
     */
    if (
      slot.status === SlotStatusEnum.ACTIVE &&
      slot.filledCount > 0 &&
      now >= endDateTime
    ) {
      updatedStatus = await this.getCompletionStatus(slot);
    }

    return updatedStatus;
  }
  private async getCompletionStatus(
    slot: EoiBatchSlot,
  ): Promise<SlotStatusEnum | null> {
    const invitedCount = slot.filledCount || 0;
    const attendedCount = await this.batchVoucherRepo.count({
      where: {
        slotId: slot.id,
        status: BatchVoucherStatus.ATTENDED,
      },
    });

    if (invitedCount === attendedCount) {
      return SlotStatusEnum.COMPLETED;
    } else {
      return SlotStatusEnum.ELAPSED;
    }
  }
}
