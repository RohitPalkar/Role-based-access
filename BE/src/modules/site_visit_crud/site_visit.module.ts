import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteVisitCrudController } from './site_visit.controller';
import { SiteVisitCrudService } from './site_visit.service';
import { SiteVisitForm } from './entities/site_visit_form.entity';
import { SfdcService } from '../sfdc/sfdc.service';
import { HttpModule } from '@nestjs/axios';
import { SfdcProjectListing } from './entities/sfdc_project_listing.entity';
import { Users } from 'src/entities';
import { GREProjectMapping } from './entities/gre-project-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SiteVisitForm,
      SfdcProjectListing,
      Users,
      GREProjectMapping,
    ]),
    HttpModule,
  ],
  controllers: [SiteVisitCrudController],
  providers: [SiteVisitCrudService, SfdcService],
})
export class SiteVisitCRUDModule {}
