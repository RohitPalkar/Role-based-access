import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyMaster } from './entities/company_master.entity';
import { CompanyMasterService } from './company_master.service';
import { CompanyMasterController } from './company_master.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyMaster])],
  controllers: [CompanyMasterController],
  providers: [CompanyMasterService],
  exports: [CompanyMasterService],
})
export class CompanyMasterModule {}
