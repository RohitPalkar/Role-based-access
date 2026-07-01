import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { IncentiveBookingService } from './incentive_booking.service';
import { IncentiveBookingController } from './incentive_booking.controller';
import { IncentiveBooking } from './entities/incentive_booking.entity';
import {
  BillingEntity,
  Brands,
  CityMaster,
  CronLog,
  Group,
  IncentiveBookingOverride,
  IncentivePolicy,
  Notifications,
  ProjectPhase,
  Projects,
  Role,
  UserGroupAssignment,
  UserMonthlyGrossTotal,
  Users,
} from 'src/entities';
import { UserService } from '../../users/user.service';
import { AwsService } from '../../aws/aws.service';
import { NotificationService } from '../../notifications/notification.service';
import { LeaderBoardService } from '../leaderboard/leaderboard.service';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingCronService } from '../../crons/booking-rule-engine.cron';
import { CronLogsService } from '../../crons/cron-logs.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SapService } from '../sap/sap.service';
import { SfdcService } from '../../sfdc/sfdc.service';
import { IncentiveBookingOverridesService } from '../incentive_booking_overrides/incentive_booking_overrides.service';
import { WsPublisherService } from 'src/modules/ws_publisher/ws_publisher.service';
import { BULK_PAYOUT_UPDATE_QUEUE } from 'src/config/constants';
import { BulkPayoutUpdateProcessor } from './processors/bulk-payout-update.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncentiveBooking,
      CityMaster,
      Brands,
      UserGroupAssignment,
      ProjectPhase,
      Users,
      Role,
      Group,
      BillingEntity,
      Projects,
      UserMonthlyGrossTotal,
      IncentivePolicy,
      Notifications,
      CronLog,
      IncentiveBookingOverride,
    ]),
    HttpModule, // Needed for making HTTP requests
    ConfigModule, // Needed for environment variables
    ScheduleModule.forRoot(), // For scheduling background jobs
    BullModule.registerQueue({ name: BULK_PAYOUT_UPDATE_QUEUE }),
  ],
  providers: [
    IncentiveBookingService,
    UserService,
    AwsService,
    NotificationService,
    WsPublisherService,
    LeaderBoardService,
    BookingCronService,
    CronLogsService,
    SapService,
    SfdcService,
    IncentiveBookingOverridesService,
    BulkPayoutUpdateProcessor,
  ],
  controllers: [IncentiveBookingController],
  exports: [IncentiveBookingService], // Export for usage in other modules
})
export class IncentiveBookingModule {}
