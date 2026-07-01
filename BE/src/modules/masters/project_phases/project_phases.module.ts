import { Module } from '@nestjs/common';
import { ProjectPhasesService } from './project_phases.service';
import { ProjectPhasesController } from './project_phases.controller';
import { ProjectPhase } from './entities/project_phases.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brands, CityMaster } from 'src/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectPhase, Brands, CityMaster])],
  providers: [ProjectPhasesService],
  controllers: [ProjectPhasesController],
  exports: [ProjectPhasesService],
})
export class ProjectPhasesModule {}
