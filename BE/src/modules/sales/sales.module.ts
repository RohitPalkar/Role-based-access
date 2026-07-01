import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { PdfModule } from '../pdf/pdf.module';
import { SfdcModule } from '../sfdc/sfdc.module';
import { SalesService } from './sales.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  BookingOfficeUse,
  MultiBooking,
  GroupBookingMapping,
  Users,
} from 'src/entities';
import { BookingDocumentsModule } from '../booking_documents/booking_documents.module';
import { ProjectUserMapping } from '../masters/projects/entities/project_user_mapping.entity';

@Module({
  imports: [
    SalesModule,
    BookingsModule,
    BookingDocumentsModule,
    PdfModule,
    SfdcModule,
    TypeOrmModule.forFeature([
      Booking,
      BookingOfficeUse,
      Users,
      MultiBooking,
      GroupBookingMapping,
      ProjectUserMapping,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
