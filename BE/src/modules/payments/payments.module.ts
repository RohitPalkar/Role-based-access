import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/payment.entity';
import { VoucherFormsModule } from '../eoi_manager/voucher_forms/voucher_form.module';
import { HttpModule } from '@nestjs/axios';
import {
  Booking,
  EoiCampaign,
  ProjectPhase,
  ProjectTerm,
  Projects,
} from 'src/entities';
import { PaymentVerificationCron } from '../crons/payment-verification.cron';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      PaymentTransaction,
      EoiCampaign,
      ProjectTerm,
      ProjectPhase,
      Projects,
      Booking,
    ]),
    VoucherFormsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentVerificationCron],
})
export class PaymentsModule {}
