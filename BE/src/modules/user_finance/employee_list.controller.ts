import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeeListService } from './employee_list.service';
import { Users } from '../users/entities/user.entity';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';
import { UpdateUserFinanceDto } from './dto/update_employee_list.dto';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { Roles } from '../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
@Controller('finance')
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.FINANCE_ADMIN, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
export class EmployeeListController {
  constructor(private readonly employeeListService: EmployeeListService) {}

  @Get()
  @ExposeFields('updatedAt')
  async getAllEmployees(@Query() queryDto: CommonFindAllQueryDto) {
    const { page, limit, search, sortBy } = queryDto;
    return this.employeeListService.getAllEmployees(
      page,
      limit,
      search,
      sortBy,
    );
  }

  @Get(':id')
  async getEmployeeById(@Param('id', ParseIntPipe) id: number): Promise<Users> {
    return this.employeeListService.getEmployeeById(id);
  }

  @Patch(':id')
  async updateFinance(
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateFinancedto: UpdateUserFinanceDto,
  ) {
    return this.employeeListService.updateEmployeeFinance(
      userId,
      updateFinancedto,
    );
  }
}
