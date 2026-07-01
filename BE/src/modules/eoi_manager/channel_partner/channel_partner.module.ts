import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelPartner } from './entities/channel-partner.entity';
import { VoucherForm } from '../voucher_forms/entities/voucher_form.entity';
import { ChannelPartnerService } from './channel_partner.service';
import { ChannelPartnerController } from './channel_partner.controller';
import { AwsModule } from '../../aws/aws.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelPartner, VoucherForm]), AwsModule],
  controllers: [ChannelPartnerController],
  providers: [ChannelPartnerService],
  exports: [ChannelPartnerService],
})
export class ChannelPartnerModule {}
