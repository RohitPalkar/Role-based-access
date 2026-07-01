import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { EoiBatch } from './entities/batch.entity';
import { EoiBatchSlot } from './entities/slot.entity';
import { EoiBatchVoucher } from './entities/batch_voucher.entity';
import { BatchService } from './batch.service';
import { SlotService } from './slot.service';
import { AllocationService } from './allocation.service';
import { BatchController } from './batch.controller';
import { SlotController } from './slot.controller';
import { VoucherForm } from 'src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity';
import { Booking, EoiCampaign, InventoryType, Users } from 'src/entities';
import { AwsService } from 'src/modules/aws/aws.service';
import { BullModule } from '@nestjs/bullmq';
import { BATCH_NOTIFICATION_QUEUE } from 'src/config/constants';
import { BatchNotificationProcessor } from './processors/batch-notification.processor';
import { BatchCron } from 'src/modules/crons/batch-cron';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      EoiBatch,
      EoiBatchSlot,
      EoiBatchVoucher,
      VoucherForm,
      InventoryType,
      Users,
      Booking,
      EoiCampaign,
    ]),
    BullModule.registerQueue({ name: BATCH_NOTIFICATION_QUEUE }),
  ],
  providers: [
    BatchService,
    SlotService,
    AllocationService,
    AwsService,
    BatchNotificationProcessor,
    BatchCron,
  ],
  controllers: [BatchController, SlotController],
  exports: [BatchService, SlotService, AllocationService],
})
export class BatchManagerModule {}
