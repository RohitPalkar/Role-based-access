import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecentroService } from './decentro.service';
import { DecentroController } from './decentro.controller';
import { HttpModule } from '@nestjs/axios';
import { DecentroLogs } from './entities/decentro-logs.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { LeegalityService } from '../leegality/leegality.service';
import { AwsService } from '../aws/aws.service';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([DecentroLogs, Booking]),
    BookingsModule,
  ],
  providers: [DecentroService, LeegalityService, AwsService],
  controllers: [DecentroController],
  exports: [DecentroService],
})
export class DecentroModule {}
