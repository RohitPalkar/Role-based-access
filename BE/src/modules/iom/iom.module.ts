import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AwsModule } from 'src/modules/aws/aws.module';
import { PdfModule } from 'src/modules/pdf/pdf.module';
import { PineLabsModule } from 'src/modules/pine-labs/pine-labs.module';

import { Iom } from './entities/iom.entity';
import { IomStatus } from './entities/iom-status.entity';
import { IomTransition } from './entities/iom-transition.entity';
import { IomHistory } from './entities/iom-history.entity';
import {
  IncentiveBooking,
  Role,
  Users,
  Projects,
  IomInvoiceDetails,
  ProjectUserMapping,
  Brands,
} from 'src/entities';
import { UserAvailability } from 'src/modules/users/entities/user-availability.entity';
import { IomAssignmentState } from './entities/iom-assignment-state.entity';

import { IomController } from './iom.controller';
import { IomCrmService } from './services/iom-crm.service';
import { IomEligibilityService } from './services/iom-eligibility.service';
import { IomListingService } from './services/iom-listing.service';
import { WorkflowValidationService } from './services/workflow-validation.service';
import { IomValidationService } from './services/iom-validation.service';
import { IomHistoryListener } from './services/iom-history.listener';
import { IomAssignmentService } from './services/iom-assignment.service';
import { IomRejectionNotificationService } from './services/iom-rejection-notification.service';
import { IomRejectService } from './services/iom-reject.service';
import { IomApprovalNotificationService } from './services/iom-approval-notification.service';
import { IomApproveService } from './services/iom-approve.service';
import { IomCancelService } from './services/iom-cancel.service';
import { IomSubmissionNotificationService } from './services/iom-submission-notification.service';
import { IomExportService } from './services/iom-export.service';
import { IomLoyaltyCountsCacheService } from './services/iom-loyalty-counts-cache.service';
import { IomLoyaltyCountsCacheListener } from './services/iom-loyalty-counts-cache.listener';
import { IomLoyaltyDetailsService } from './services/iom-loyalty-details.service';
import { IomLoyaltyUploadService } from './services/iom-loyalty-upload.service';
import { IomAgeingService } from './services/iom-ageing.service';

/**
 * CRM-USER-scoped IOM module.
 *
 * `WorkflowValidationService` is the single chokepoint for workflow
 * authorisation; it's exported so the future TL / CRM Head / Finance /
 * Loyalty modules consume the same DB-driven rules instead of growing
 * their own role-status constants.
 */
@Module({
  imports: [
    AwsModule,
    PdfModule,
    PineLabsModule,
    TypeOrmModule.forFeature([
      Iom,
      IomStatus,
      IomTransition,
      IomHistory,
      IncentiveBooking,
      Projects,
      Role,
      Users,
      IomInvoiceDetails,
      UserAvailability,
      IomAssignmentState,
      Users,
      ProjectUserMapping,
      Brands,
    ]),
  ],
  controllers: [IomController],
  providers: [
    IomCrmService,
    IomEligibilityService,
    IomListingService,
    WorkflowValidationService,
    IomValidationService,
    IomHistoryListener,
    IomAssignmentService,
    IomRejectionNotificationService,
    IomRejectService,
    IomApprovalNotificationService,
    IomApproveService,
    IomCancelService,
    IomSubmissionNotificationService,
    IomExportService,
    IomLoyaltyCountsCacheService,
    IomLoyaltyCountsCacheListener,
    IomLoyaltyDetailsService,
    IomLoyaltyUploadService,
    IomAgeingService,
  ],
  exports: [
    WorkflowValidationService,
    IomValidationService,
    IomAssignmentService,
    IomRejectionNotificationService,
    IomRejectService,
    IomApprovalNotificationService,
    IomApproveService,
    IomCancelService,
    IomSubmissionNotificationService,
  ],
})
export class IomModule {}
