import { Module } from '@nestjs/common';
import { IncentiveDashboardController } from './incentive_dashboard.controller';
import { IncentiveDashboardService } from './incentive_dashboard.service';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Users,
  IncentiveBooking,
  Projects,
  Role,
  BoosterIncentiveSlabs,
  Boosters,
  CityMaster,
  UserMonthlyGrossTotal,
  IncentivePolicy,
  Notifications,
  UserIncentivePayout,
} from '../../../entities';
import { IncentiveBookingModule } from '../incentive_booking/incentive_booking.module';
import { NotificationService } from '../../notifications/notification.service';
import { WsPublisherService } from 'src/modules/ws_publisher/ws_publisher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      IncentiveBooking,
      Projects,
      Role,
      BoosterIncentiveSlabs,
      Boosters,
      CityMaster,

      UserMonthlyGrossTotal,
      IncentivePolicy,
      Notifications,
      UserIncentivePayout,
    ]),
    HttpModule,
    IncentiveBookingModule,
  ],
  controllers: [IncentiveDashboardController],
  providers: [
    IncentiveDashboardService,
    NotificationService,
    WsPublisherService,
  ],
})
export class IncentiveDashboard {}
