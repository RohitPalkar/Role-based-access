import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountryMaster } from './entities/country_master.entity';
import { CountryMasterService } from './country_master.service';
import { CountryMasterController } from './country_master.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CountryMaster])],
  controllers: [CountryMasterController],
  providers: [CountryMasterService],
  exports: [CountryMasterService],
})
export class CountryMasterModule {}
