import { Module } from '@nestjs/common';
import { AgreementSignatureFormService } from './agreement_signature_form.service';
import { AgreementSignatureFormController } from './agreement_signature_form.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementSignature } from './entities/agreement_signatures.entity';
import { Users, Role, Department, Booking } from 'src/entities';
import { PdfService } from 'src/modules/pdf/pdf.service';
import { LeegalityService } from 'src/modules/leegality/leegality.service';
import { AwsService } from '../aws/aws.service';
import { HttpModule } from '@nestjs/axios';
import { BatchManagerModule } from '../eoi_manager/batch_manager/batch_manager.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgreementSignature,
      Users,
      Role,
      Department,
      Booking,
    ]),
    HttpModule,
    BatchManagerModule,
  ],
  providers: [
    AgreementSignatureFormService,
    PdfService,
    LeegalityService,
    AwsService,
  ],
  controllers: [AgreementSignatureFormController],
  exports: [AgreementSignatureFormService],
})
export class AgreementSignatureFormModule {}
