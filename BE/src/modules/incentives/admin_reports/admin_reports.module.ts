import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminReportsService } from './admin_reports.service';
import { AdminReportsController } from './admin_reports.controller';
import { Users } from '../../users/entities/user.entity';
import { IncentiveBooking } from '../incentive_booking/entities/incentive_booking.entity';
import { UserIncentivePayout } from '../incentive_booking/entities/user_incentive_payouts.entity';
import { AwsService } from '../../aws/aws.service';
import { IncentivePayoutsService } from '../incentive_payouts/incentive_payouts.service';
import { BulkPayoutLog } from 'src/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      IncentiveBooking,
      UserIncentivePayout,
      BulkPayoutLog,
    ]),
  ],
  providers: [AdminReportsService, AwsService, IncentivePayoutsService],
  controllers: [AdminReportsController],
})
export class AdminReportsModule {}
