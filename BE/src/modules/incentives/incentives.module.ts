import { Module } from '@nestjs/common';
import { IncentivePolicyModule } from './incentive_policy/incentive_policy.module';
import { IncentiveReportsModule } from './incentive_reports/incentive_reports.module';
import { IncentiveDashboard } from './incentive_dashboard/incentive_dashboard.module';
import { IncentivePayoutsModule } from './incentive_payouts/incentive_payouts.module';
import { IncentiveBookingOverridesModule } from './incentive_booking_overrides/incentive_booking_overrides.module';
import { LeaderBoardModule } from './leaderboard/leaderboard.module';
import { IncentiveBookingModule } from './incentive_booking/incentive_booking.module';
import { BoosterModule } from './booster_master/booster.module';
import { SapModule } from './sap/sap.module';
import { AdminReportsModule } from './admin_reports/admin_reports.module';

@Module({
  imports: [
    IncentivePolicyModule,
    IncentiveReportsModule,
    IncentiveDashboard,
    IncentivePayoutsModule,
    IncentiveBookingOverridesModule,
    LeaderBoardModule,
    IncentiveBookingModule,
    BoosterModule,
    SapModule,
    AdminReportsModule,
  ],
})
export class IncentivesModule {}
