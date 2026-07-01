import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CityMaster } from './entities/cityMaster.entity';
import { CityMasterService } from './citymaster.service';
import { CityMasterController } from './citymaster.controller';
import { Regions } from '../region/entities/region.entities';

@Module({
  imports: [TypeOrmModule.forFeature([CityMaster, Regions])],
  controllers: [CityMasterController],
  providers: [CityMasterService],
  exports: [CityMasterService],
})
export class CityMasterModule {}
