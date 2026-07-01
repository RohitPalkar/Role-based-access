import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { BULK_TRANSACTION_UPDATE_QUEUE } from 'src/config/constants';
import { BulkTransactionUpdateProcessor } from './processors/bulk-transaction-update.processor';
import { EoiManagementController } from './eoi_management.controller';
import { EoiManagementService } from './eoi_management.service';
import { VoucherForm } from '../../eoi_manager/voucher_forms/entities/voucher_form.entity';
import { VoucherChangeRequest } from './entities/source-change-request.entity';
import {
  ChannelPartner,
  Users,
  Brands,
  CityMaster,
  EoiCampaign,
  VoucherPayment,
  Projects,
  Booking,
  VoucherUnitBlocking,
  ProjectUserMapping,
  BookingOfficeUse,
} from 'src/entities';
import { AwsModule } from '../../aws/aws.module';
import { VoucherFormsModule } from 'src/modules/eoi_manager/voucher_forms/voucher_form.module';
import { SfdcModule } from '../../sfdc/sfdc.module';
import { RmDashboardDailyReportCron } from '../../crons/rm-dashboard-daily-report.cron';
import { CronLogsModule } from '../../crons/cron-logs.module';
import { VoucherUnitMapping } from '../../eoi_manager/voucher_forms/entities/voucher_unit_mappings.entity';
import { ProjectInventoryUnit } from '../../inventory-unit/entities/project_inventory_units.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoucherForm,
      VoucherPayment,
      EoiCampaign,
      ChannelPartner,
      Users,
      Brands,
      CityMaster,
      Projects,
      VoucherUnitMapping,
      VoucherUnitBlocking,
      ProjectInventoryUnit,
      VoucherChangeRequest,
      Booking,
      ProjectUserMapping,
      BookingOfficeUse,
    ]),
    HttpModule,
    EventEmitterModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: BULK_TRANSACTION_UPDATE_QUEUE }),
    AwsModule,
    SfdcModule,
    CronLogsModule,
    forwardRef(() => VoucherFormsModule),
  ],
  controllers: [EoiManagementController],
  providers: [
    EoiManagementService,
    BulkTransactionUpdateProcessor,
    RmDashboardDailyReportCron,
  ],
  exports: [EoiManagementService],
})
export class EoiManagementModule {}
