import { Module } from '@nestjs/common';
import { BookingDocumentsService } from './booking_documents.service';
import { BookingDocumentsController } from './booking_documents.controller';
import { BookingDocument } from './entities/booking_document.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingOfficeUse } from '../bookings/entities/booking_office_use.entity';
import { Booking, VoucherForm } from 'src/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingDocument,
      BookingOfficeUse,
      Booking,
      VoucherForm,
    ]),
  ],
  providers: [BookingDocumentsService],
  controllers: [BookingDocumentsController],
  exports: [BookingDocumentsService, TypeOrmModule],
})
export class BookingDocumentsModule {}
