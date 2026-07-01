import { Module, forwardRef } from '@nestjs/common';
import { VoucherFormsService } from './voucher_form.service';
import { VoucherFormsController } from './voucher_form.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherForm } from './entities/voucher_form.entity';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { EoiManagementModule } from '../eoi_management/eoi_management.module';
import {
  ChannelPartner,
  EoiCampaign,
  Users,
  VoucherUnitMapping,
} from 'src/entities';
import { VoucherUnitBlocking } from '../../inventory-unit/entities/voucher_unit_blocking.entity';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PdfService } from '../../pdf/pdf.service';
import { AwsService } from '../../aws/aws.service';
import { BookingsModule } from '../../bookings/bookings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoucherForm,
      EoiCampaign,
      ChannelPartner,
      Users,
      VoucherUnitMapping,
      VoucherUnitBlocking,
    ]),
    HttpModule,
    ConfigModule,
    EventEmitterModule,
    forwardRef(() => EoiManagementModule),
    BookingsModule,
  ],
  providers: [VoucherFormsService, AwsService, PdfService],
  controllers: [VoucherFormsController],
  exports: [VoucherFormsService],
})
export class VoucherFormsModule {}
