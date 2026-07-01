import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Projects } from './entities/project.entity';
import { ProjectsService } from './project.service';
import { ProjectsController } from './project.controller';
import {
  BillingEntity,
  Boosters,
  CityMaster,
  ProjectPhase,
  ProjectUserMapping,
  Users,
} from '../../../entities/index';
import { Brands } from '../brands/entities/brand.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Projects,
      Brands,
      CityMaster,
      ProjectPhase,
      BillingEntity,
      Boosters,
      Users,
      ProjectUserMapping,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
