import { Controller, Get, Query } from '@nestjs/common';
import { CompanyMasterService } from './company_master.service';

@Controller('company-master')
export class CompanyMasterController {
  constructor(private readonly service: CompanyMasterService) {}

  @Get()
  getAllCompanies(@Query('search') search?: string) {
    return this.service.getAllCompanies(search);
  }
}
