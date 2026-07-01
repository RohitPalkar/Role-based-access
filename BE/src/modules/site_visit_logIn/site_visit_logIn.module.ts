import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BillingEntity,
  Brands,
  CityMaster,
  GREProjectMapping,
  ProjectPhase,
  Projects,
  SfdcProjectListing,
  SiteVisitForm,
  Users,
} from 'src/entities';
import { SiteVisitLogInController } from './site_visit_logIn.controller';
import { SiteVisitLogInService } from './site_visit_logIn.service';
import { HttpModule } from '@nestjs/axios';
import { SfdcService } from '../sfdc/sfdc.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SfdcProjectListing,
      Brands,
      Projects,
      SiteVisitForm,
      ProjectPhase,
      BillingEntity,
      CityMaster,
      Users,
      GREProjectMapping,
    ]),
    HttpModule,
  ],
  controllers: [SiteVisitLogInController],
  providers: [SiteVisitLogInService, SfdcService],
})
export class SiteVisitLogInModule {}
