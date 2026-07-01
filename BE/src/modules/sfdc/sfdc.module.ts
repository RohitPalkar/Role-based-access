import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SfdcService } from './sfdc.service';
import { SfdcController } from './sfdc.controller';
import { SfdcWebhookController } from './sfdc-webhook.controller';
import { SfdcWebhookService } from './sfdc-webhook.service';
import { SfdcWebhookSignatureGuard } from './guards/sfdc-webhook-signature.guard';
import { SfdcVoucherChangeRequest } from './entities/sfdc-voucher-change-request.entity';
import { IntegrationClient } from './entities/integration-client.entity';
import { VoucherForm } from '../eoi_manager/voucher_forms/entities/voucher_form.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      VoucherForm,
      SfdcVoucherChangeRequest,
      IntegrationClient,
    ]),
  ],
  providers: [SfdcService, SfdcWebhookService, SfdcWebhookSignatureGuard],
  controllers: [SfdcController, SfdcWebhookController],
  exports: [SfdcService],
})
export class SfdcModule {}
