import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRoleAssignment } from '../entities/user-role-assignment.entity';
import { DeptRoleModuleMapping } from '../entities/dept-role-module-mapping.entity';
import { RoleDefinition } from '../entities/role-definition.entity';
import { UserPermission } from '../interfaces/permission.interface';

const CACHE_TTL = 15 * 60 * 1000;

const BYPASS_ROLES = ['Super Admin', 'Super User (BI Team)'];

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,
    @InjectRepository(UserRoleAssignment)
    private readonly userRoleAssignmentRepository: Repository<UserRoleAssignment>,
    @InjectRepository(DeptRoleModuleMapping)
    private readonly drmRepository: Repository<DeptRoleModuleMapping>,
    @InjectRepository(RoleDefinition)
    private readonly roleDefinitionRepository: Repository<RoleDefinition>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<{ module: string; actions: string[] }>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.dbId) {
      throw new ForbiddenException('Unauthorized: User not authenticated');
    }

    if (BYPASS_ROLES.includes(user.role)) {
      return true;
    }

    const permissions = await this.loadUserPermissions(user.dbId);

    const hasModuleAccess = permissions.some(
      (p) => p.moduleCode === requiredPermission.module,
    );

    if (!hasModuleAccess) {
      throw new ForbiddenException(`Access denied: Missing module access for '${requiredPermission.module}'`);
    }

    if (requiredPermission.actions && requiredPermission.actions.length > 0) {
      const hasActionAccess = requiredPermission.actions.some((action) =>
        permissions.some(
          (p) =>
            p.moduleCode === requiredPermission.module &&
            p.actionCode === action,
        ),
      );

      if (!hasActionAccess) {
        throw new ForbiddenException(
          `Access denied: Missing '${requiredPermission.actions.join(', ')}' permission(s) on '${requiredPermission.module}'`,
        );
      }
    }

    request.user.permissions = permissions;
    return true;
  }

  private async loadUserPermissions(userDbId: number): Promise<UserPermission[]> {
    const cacheKey = `rbac:permissions:${userDbId}`;
    const cached = await this.cacheService.get<UserPermission[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const assignments = await this.userRoleAssignmentRepository.find({
      where: { userId: userDbId, status: 'active' },
      select: ['roleDefinitionId'],
    });

    if (!assignments.length) {
      return [];
    }

    const roleIds = assignments.map((a) => a.roleDefinitionId);

    const mappings = await this.drmRepository
      .createQueryBuilder('drm')
      .innerJoinAndSelect('drm.module', 'module')
      .leftJoinAndSelect('drm.subModule', 'subModule')
      .leftJoinAndSelect('drm.action', 'action')
      .where('drm.role_definition_id IN (:...roleIds)', { roleIds })
      .andWhere('drm.status = :status', { status: 'active' })
      .getMany();

    const permissions: UserPermission[] = mappings.map((m) => ({
      moduleCode: m.module.code,
      subModuleCode: m.subModule?.code ?? null,
      actionCode: m.action?.code ?? null,
    }));

    await this.cacheService.set(cacheKey, permissions, CACHE_TTL);
    return permissions;
  }
}
