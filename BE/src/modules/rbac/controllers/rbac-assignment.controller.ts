import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { RbacAssignmentService } from '../services/rbac-assignment.service';
import { AssignRoleDto, RevokeRoleDto, UpdateMappingDto, UpdateProjectAccessDto } from '../dto/assign-role.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { User } from '../../sso/decorators/user.decorator';

@Controller('rbac/assignments')
@UseGuards(RmAdminAuthGuard)
export class RbacAssignmentController {
  constructor(
    private readonly rbacAssignmentService: RbacAssignmentService,
  ) {}

  @Post('/assign')
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Super User (BI Team)')
  async assignRole(
    @Body() dto: AssignRoleDto,
    @User('dbId') dbId: number,
  ): Promise<any> {
    return await this.rbacAssignmentService.assignRole(
      dto.userId,
      dto.roleDefinitionId,
      dto.isPrimary,
      dto.projectAccess,
      dbId,
    );
  }

  @Post('/revoke')
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Super User (BI Team)')
  async revokeRole(@Body() dto: RevokeRoleDto): Promise<any> {
    return await this.rbacAssignmentService.revokeRole(dto.userId, dto.roleDefinitionId);
  }

  @Get('/users/:userId/roles')
  async getUserRoles(@Param('userId') userId: number): Promise<any> {
    return await this.rbacAssignmentService.getUserRoles(userId);
  }

  @Get('/users/:userId/permissions')
  async getUserPermissions(@Param('userId') userId: number): Promise<any> {
    const { RbacPermissionService } = await import('../services/rbac-permission.service');
    return { message: 'Use GET /rbac/permissions/check or /rbac/permissions/my' };
  }

  @Patch('/mappings')
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Super User (BI Team)')
  async updateMappings(@Body() dto: UpdateMappingDto): Promise<any> {
    return await this.rbacAssignmentService.updateMappings(
      dto.roleDefinitionId,
      dto.moduleId,
      dto.subModuleId,
      dto.actionIds,
    );
  }

  @Post('/project-access')
  @UseGuards(RolesGuard)
  @Roles('Super Admin', 'Super User (BI Team)')
  async setProjectAccess(@Body() dto: UpdateProjectAccessDto): Promise<any> {
    return await this.rbacAssignmentService.setProjectModuleAccess(
      dto.userId,
      dto.projectId,
      dto.moduleId,
      dto.isEnabled,
    );
  }

  @Get('/users/:userId/hierarchy')
  async getUserHierarchy(@Param('userId') userId: number): Promise<any> {
    return await this.rbacAssignmentService.getUserHierarchy(userId);
  }
}
