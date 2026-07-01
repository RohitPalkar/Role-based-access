import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { IncentiveReportsService } from './incentive_reports.service';
import { IncentiveReportsController } from './incentive_reports.controller';
import { IncentiveReportsGenerator } from './incentive_reports.utils';
import { AwsService } from '../../aws/aws.service';
import {
  CronLog,
  IncentiveBooking,
  UserIncentivePayout,
  Users,
} from 'src/entities';
import { CronLogsService } from '../../crons/cron-logs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncentiveBooking,
      Users,
      CronLog,
      UserIncentivePayout,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [IncentiveReportsController],
  providers: [
    IncentiveReportsService,
    IncentiveReportsGenerator,
    AwsService,
    CronLogsService,
  ],
  exports: [IncentiveReportsService],
})
export class IncentiveReportsModule {}
