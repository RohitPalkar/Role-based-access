import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { RbacRoleService } from '../services/rbac-role.service';
import { QueryRoleDefinitionDto } from '../dto/query-role-definition.dto';
import { CreateRoleDefinitionDto } from '../dto/create-role-definition.dto';
import { UpdateRoleDefinitionDto } from '../dto/update-role-definition.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';

@Controller('rbac/roles')
@UseGuards(RmAdminAuthGuard)
export class RbacRoleController {
  constructor(private readonly rbacRoleService: RbacRoleService) {}

  @Get()
  async findAll(@Query() queryDto: QueryRoleDefinitionDto): Promise<any> {
    const { page, limit, search, sortBy, status } = queryDto;
    return await this.rbacRoleService.findAll(page, limit, search, sortBy, status);
  }

  @Get('/dropdown')
  async dropdown(): Promise<any> {
    return await this.rbacRoleService.dropdown();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<any> {
    return await this.rbacRoleService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Super User (BI Team)')
  async create(@Body() dto: CreateRoleDefinitionDto): Promise<any> {
    return await this.rbacRoleService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Super User (BI Team)')
  async update(@Param('id') id: number, @Body() dto: UpdateRoleDefinitionDto): Promise<any> {
    return await this.rbacRoleService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Super User (BI Team)')
  async remove(@Param('id') id: number): Promise<any> {
    return await this.rbacRoleService.remove(id);
  }
}
