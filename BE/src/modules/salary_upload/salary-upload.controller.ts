import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SalaryUploadService } from './salary-upload.service';
import { SalaryFileDto } from './dto/salary-file.dto';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { Roles } from '../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { FindLogsQueryDto } from './dto/find-logs.dto';

@Controller('salary')
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.FINANCE_ADMIN, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
export class SalaryUploadController {
  constructor(private readonly salaryUploadService: SalaryUploadService) {}

  @Get('/sample-excel')
  async sampleExcel() {
    return this.salaryUploadService.sampleExcel();
  }
  @Post('bulk-insert')
  async bulkInsert(@Body() salaryFileDto: SalaryFileDto) {
    return await this.salaryUploadService.bulkInsert(salaryFileDto);
  }

  @Get('/logs')
  @ExposeFields('createdAt')
  async findAllLogs(@Query() queryDto: FindLogsQueryDto) {
    const { page, limit, search, sortBy, startDate, endDate, status } =
      queryDto;
    return await this.salaryUploadService.findAllLogs(
      page,
      limit,
      search,
      sortBy,
      startDate,
      endDate,
      status,
    );
  }
}
