import { Module } from '@nestjs/common';
import { IncentivePayoutsService } from './incentive_payouts.service';
import {
  BulkPayoutLog,
  IncentiveBooking,
  UserIncentivePayout,
  Users,
} from 'src/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncentivePayoutsController } from './incentive_payouts.controller';
import { AwsService } from '../../aws/aws.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BulkPayoutLog,
      Users,
      IncentiveBooking,
      UserIncentivePayout,
    ]),
  ],
  providers: [IncentivePayoutsService, AwsService],
  exports: [IncentivePayoutsService],
  controllers: [IncentivePayoutsController],
})
export class IncentivePayoutsModule {}
