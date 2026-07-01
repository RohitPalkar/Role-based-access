import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Users } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BillingEntity,
  Brands,
  CityMaster,
  CronLog,
  Group,
  IncentiveBooking,
  Notifications,
  Projects,
  Role,
  UserFinances,
  UserGroupAssignment,
  UserIncentivePayout,
  UserMonthlyGrossTotal,
  Iom,
  ProjectUserMapping,
} from 'src/entities';
import { IncentiveBookingModule } from '../incentives/incentive_booking/incentive_booking.module';
import { AwsService } from '../aws/aws.service';
import { SfdcService } from '../sfdc/sfdc.service';
import { HttpModule } from '@nestjs/axios';
import { NotificationService } from '../notifications/notification.service';
import { LeaderBoardService } from '../incentives/leaderboard/leaderboard.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AccrualsCronService } from '../crons/leaderboard.cron';
import { CronLogsService } from '../crons/cron-logs.service';
import { WsPublisherService } from '../ws_publisher/ws_publisher.service';
import { UserAvailability } from './entities/user-availability.entity';
import { UserAvailabilityService } from './services/user-availability.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      Role,
      Group,
      CityMaster,
      IncentiveBooking,
      Brands,
      BillingEntity,
      Projects,
      UserMonthlyGrossTotal,
      Notifications,
      UserFinances,
      CronLog,
      UserIncentivePayout,
      UserGroupAssignment,
      UserAvailability,
      Iom,
      ProjectUserMapping,
    ]),
    HttpModule,
    ScheduleModule.forRoot(),
    IncentiveBookingModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserAvailabilityService,
    AwsService,
    SfdcService,
    NotificationService,
    WsPublisherService,
    LeaderBoardService,
    AccrualsCronService,
    CronLogsService,
  ],
  exports: [UserService],
})
export class UsersModule {}
