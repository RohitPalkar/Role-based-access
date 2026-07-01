import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { HttpModule } from '@nestjs/axios';
import { LeegalityService } from '../leegality/leegality.service';
import { AwsService } from '../aws/aws.service';
import { ReferralsService } from '../referrals/referrals.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { SfdcService } from '../sfdc/sfdc.service';
import { SfdcModule } from '../sfdc/sfdc.module';
import { ProjectTermsService } from '../project_terms/project_terms.service';
import { ProjectTermsModule } from '../project_terms/project_terms.module';
import { PdfService } from '../pdf/pdf.service';
import { BookingDocumentsService } from '../booking_documents/booking_documents.service';
import { BookingDocumentsModule } from '../booking_documents/booking_documents.module';
import { BookingOfficeUse } from './entities/booking_office_use.entity';
import {
  BookingPayment,
  MultiBooking,
  GroupBookingMapping,
  Users,
  VoucherForm,
  VoucherPayment,
} from 'src/entities';
import { ProjectUserMapping } from '../masters/projects/entities/project_user_mapping.entity';
import { WsPublisherService } from '../ws_publisher/ws_publisher.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CronLogsModule } from '../crons/cron-logs.module';
import { OfficeUseReminderCron } from '../crons/office-use-reminder.cron';
import { BatchManagerModule } from '../eoi_manager/batch_manager/batch_manager.module';

@Module({
  imports: [
    BookingDocumentsModule,
    ProjectTermsModule,
    SfdcModule,
    ReferralsModule,
    CronLogsModule,
    BatchManagerModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Booking,
      BookingOfficeUse,
      Users,
      MultiBooking,
      GroupBookingMapping,
      BookingPayment,
      VoucherForm,
      VoucherPayment,
      ProjectUserMapping,
    ]),
    HttpModule,
  ],
  providers: [
    BookingsService,
    LeegalityService,
    AwsService,
    ReferralsService,
    SfdcService,
    ProjectTermsService,
    BookingDocumentsService,
    PdfService,
    WsPublisherService,
    OfficeUseReminderCron,
  ],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
