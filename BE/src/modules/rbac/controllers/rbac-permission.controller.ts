import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { RbacRoleService } from '../services/rbac-role.service';
import { RbacPermissionService } from '../services/rbac-permission.service';
import { CheckPermissionDto } from '../dto/check-permission.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { User } from '../../sso/decorators/user.decorator';

@Controller('rbac/permissions')
@UseGuards(RmAdminAuthGuard)
export class RbacPermissionController {
  constructor(
    private readonly rbacRoleService: RbacRoleService,
    private readonly rbacPermissionService: RbacPermissionService,
  ) {}

  @Get('/modules')
  async getModules(): Promise<any> {
    return await this.rbacRoleService.getModules();
  }

  @Get('/modules/:code/actions')
  async getModuleActions(@Param('code') code: string): Promise<any> {
    return await this.rbacRoleService.getModuleActions(code);
  }

  @Get('/roles/:roleId')
  async getRolePermissions(@Param('roleId') roleId: number): Promise<any> {
    return await this.rbacRoleService.getRolePermissions(roleId);
  }

  @Post('/check')
  async checkPermission(
    @Body() dto: CheckPermissionDto,
    @User('dbId') dbId: number,
    @User('role') role: string,
  ): Promise<any> {
    return await this.rbacPermissionService.checkPermission(
      dto.userId ?? dbId,
      dto.module,
      dto.action,
      role,
    );
  }

  @Get('/my')
  async getMyPermissions(
    @User('dbId') dbId: number,
    @User('role') role: string,
  ): Promise<any> {
    return await this.rbacPermissionService.getEffectivePermissions(dbId, role);
  }
}
