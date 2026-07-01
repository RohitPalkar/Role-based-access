import { Module } from '@nestjs/common';
import { FormAmendmentRequestService } from './form_amendment_requests.service';
import { FormAmendmentRequestsController } from './form_amendment_requests.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAmendmentRequest } from './entities/form_amendment_requests.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormAmendmentRequest])],
  providers: [FormAmendmentRequestService],
  controllers: [FormAmendmentRequestsController],
  exports: [FormAmendmentRequestService, TypeOrmModule],
})
export class FormAmendmentRequestsModule {}
