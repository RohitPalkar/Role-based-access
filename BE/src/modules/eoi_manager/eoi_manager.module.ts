import { Module } from '@nestjs/common';
import { BatchManagerModule } from './batch_manager/batch_manager.module';
import { VoucherFormsModule } from './voucher_forms/voucher_form.module';
import { EoiCampaignModule } from './eoi_campaign/eoi_campaign.module';
import { EoiManagementModule } from './eoi_management/eoi_management.module';
import { ChannelPartnerModule } from './channel_partner/channel_partner.module';

@Module({
  imports: [
    BatchManagerModule,
    VoucherFormsModule,
    EoiCampaignModule,
    EoiManagementModule,
    ChannelPartnerModule,
  ],
})
export class EoiManagerModule {}
