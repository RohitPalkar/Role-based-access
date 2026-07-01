import { Module } from '@nestjs/common';
import { BoosterController } from './booster.controller';
import { BoosterService } from './booster.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Projects } from '../../masters/projects/entities/project.entity';
import {
  BoosterIncentiveSlabs,
  Boosters,
  CityMaster,
  CronLog,
  Notifications,
  Role,
  Users,
} from '../../../entities/index';
import { NotificationService } from '../../notifications/notification.service';
import { BoosterStatusCron } from '../../crons/booster-status.cron';
import { CronLogsService } from '../../crons/cron-logs.service';
import { WsPublisherService } from 'src/modules/ws_publisher/ws_publisher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Projects,
      Boosters,
      BoosterIncentiveSlabs,
      CityMaster,
      Users,
      Notifications,
      Role,
      CronLog,
    ]),
  ],
  controllers: [BoosterController],
  providers: [
    BoosterService,
    NotificationService,
    WsPublisherService,
    BoosterStatusCron,
    CronLogsService,
  ],
  exports: [BoosterService],
})
export class BoosterModule {}
