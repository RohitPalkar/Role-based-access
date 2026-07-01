import { Module } from '@nestjs/common';
import { IncentivePolicyController } from './incentive_policy.controller';
import {
  Boosters,
  Brands,
  IncentiveSlab,
  CityMaster,
  ProjectPhase,
  Group,
  Users,
  CronLog,
  Regions,
} from '../../../entities';
import { IncentivePolicy } from './entities/incentive_policy.entity';
import { Projects } from '../../masters/projects/entities/project.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncentivePolicyService } from './incentive_policy.service';
import { IncentivePolicyStatusCron } from '../../crons/incentive-policy-status.cron';
import { CronLogsService } from '../../crons/cron-logs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Projects,
      IncentiveSlab,
      IncentivePolicy,
      Brands,
      Regions,
      Boosters,
      CityMaster,
      Users,
      ProjectPhase,
      Group,
      CronLog,
    ]),
  ],
  controllers: [IncentivePolicyController],
  providers: [
    IncentivePolicyService,
    IncentivePolicyStatusCron,
    CronLogsService,
  ],
  exports: [IncentivePolicyService],
})
export class IncentivePolicyModule {}
