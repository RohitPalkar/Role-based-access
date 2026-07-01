import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';

@Controller('roles')
@UseGuards(RmAdminAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll(@Query() queryDto: CommonFindAllQueryDto): Promise<any> {
    const { page, limit, search, sortBy } = queryDto;
    return await this.rolesService.findAll(page, limit, search, sortBy);
  }

  @Get('/dropdown')
  async roleDropdown(@Query('search') search: string) {
    return await this.rolesService.roleDropdown(search);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.rolesService.findOne(id);
  }
}
