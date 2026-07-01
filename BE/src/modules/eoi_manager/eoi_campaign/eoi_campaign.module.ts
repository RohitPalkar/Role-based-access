import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EoiCampaignController } from './eoi_campaign.controller';
import { EoiCampaignService } from './eoi_campaign.service';
import { EoiCampaign } from './entities/eoi_campaign.entity';
import { DevelopmentType, InventoryType, Users } from 'src/entities';
import { VoucherForm } from '../../eoi_manager/voucher_forms/entities/voucher_form.entity';
import { VoucherFormsModule } from '../../eoi_manager/voucher_forms/voucher_form.module';
import { EoiPhaseLaunchCron } from '../../crons/eoi-phase-launch.cron';
import { EoiManagementModule } from '../eoi_management/eoi_management.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EoiCampaign,
      DevelopmentType,
      InventoryType,
      VoucherForm,
      Users,
    ]),
    VoucherFormsModule,
    EoiManagementModule,
  ],
  controllers: [EoiCampaignController],
  providers: [EoiCampaignService, EoiPhaseLaunchCron],
  exports: [EoiCampaignService],
})
export class EoiCampaignModule {}
