import { Module } from '@nestjs/common';
import { CityMasterModule } from './citymaster/citymaster.module';
import { ProjectPhasesModule } from './project_phases/project_phases.module';
import { BrandsModule } from './brands/brands.module';
import { ProjectsModule } from './projects/project.module';
import { CountryMasterModule } from './country_master/countryMaster.module';
import { RegionModule } from './region/region.module';
import { CompanyMasterModule } from './company_master/company_master.module';

@Module({
  imports: [
    BrandsModule,
    CityMasterModule,
    ProjectsModule,
    ProjectPhasesModule,
    CountryMasterModule,
    RegionModule,
    CompanyMasterModule,
  ],
})
export class MastersModule {}
