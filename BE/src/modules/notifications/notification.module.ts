import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notifications } from './entities/notification.entity';
import {
  BillingEntity,
  Brands,
  CityMaster,
  ProjectPhase,
  Projects,
  Role,
  UserMonthlyGrossTotal,
  Users,
} from 'src/entities';
import { WsPublisherService } from '../ws_publisher/ws_publisher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notifications,
      Users,
      UserMonthlyGrossTotal,
      CityMaster,
      Brands,
      ProjectPhase,
      BillingEntity,
      Projects,
      Role,
      Users,
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, WsPublisherService],
  exports: [NotificationService],
})
export class NotificationModule {}
