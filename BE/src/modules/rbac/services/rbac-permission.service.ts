import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DeptRoleModuleMapping } from '../entities/dept-role-module-mapping.entity';
import { UserRoleAssignment } from '../entities/user-role-assignment.entity';
import { ModuleDefinition } from '../entities/module-definition.entity';
import { ActionDefinition } from '../entities/action-definition.entity';
import { UserPermission } from '../interfaces/permission.interface';
import { PermissionAuditLog } from '../entities/permission-audit-log.entity';
import { logger } from '../../../logger/logger';
import { SUCCESS } from '../../../config/constants';
import { logsAndErrorHandling } from '../../../utils/errorLogHandler';

const CACHE_TTL = 15 * 60 * 1000;

@Injectable()
export class RbacPermissionService {
  constructor(
    @InjectRepository(DeptRoleModuleMapping)
    private readonly drmRepository: Repository<DeptRoleModuleMapping>,
    @InjectRepository(UserRoleAssignment)
    private readonly userRoleAssignmentRepository: Repository<UserRoleAssignment>,
    @InjectRepository(PermissionAuditLog)
    private readonly auditLogRepository: Repository<PermissionAuditLog>,
    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,
  ) {}

  async getUserPermissions(userDbId: number): Promise<UserPermission[]> {
    const cacheKey = `rbac:permissions:${userDbId}`;
    const cached = await this.cacheService.get<UserPermission[]>(cacheKey);
    if (cached) return cached;

    const assignments = await this.userRoleAssignmentRepository.find({
      where: { userId: userDbId, status: 'active' },
      select: ['roleDefinitionId'],
    });

    if (!assignments.length) return [];

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

  async checkPermission(
    userDbId: number,
    moduleCode: string,
    actionCode?: string,
    userRole?: string,
  ): Promise<any> {
    try {
      const bypassRoles = ['Super Admin', 'Super User (BI Team)'];
      if (userRole && bypassRoles.includes(userRole)) {
        return {
          statusCode: SUCCESS,
          message: 'Access granted (bypass role).',
          data: { allowed: true },
        };
      }

      const permissions = await this.getUserPermissions(userDbId);

      const hasModuleAccess = permissions.some((p) => p.moduleCode === moduleCode);
      if (!hasModuleAccess) {
        return {
          statusCode: SUCCESS,
          message: 'Access denied.',
          data: { allowed: false },
        };
      }

      if (actionCode) {
        const hasActionAccess = permissions.some(
          (p) => p.moduleCode === moduleCode && p.actionCode === actionCode,
        );
        return {
          statusCode: SUCCESS,
          message: hasActionAccess ? 'Access granted.' : 'Access denied.',
          data: { allowed: hasActionAccess },
        };
      }

      return {
        statusCode: SUCCESS,
        message: 'Access granted.',
        data: { allowed: true },
      };
    } catch (error) {
      logger.error('Failed to check permission', error);
      logsAndErrorHandling('RbacPermissionService - checkPermission', error, {
        userDbId,
        moduleCode,
        actionCode,
      });
    }
  }

  async clearUserCache(userDbId: number): Promise<void> {
    await this.cacheService.del(`rbac:permissions:${userDbId}`);
  }

  async logAudit(
    action: string,
    entityType: string,
    entityId: number,
    performedBy: number,
    oldValue?: any,
    newValue?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.auditLogRepository.save({
        action,
        entityType,
        entityId,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
        performedBy,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
    } catch (error) {
      logger.error('Failed to log permission audit', error);
    }
  }

  async getEffectivePermissions(userDbId: number, userRole?: string): Promise<any> {
    try {
      const bypassRoles = ['Super Admin', 'Super User (BI Team)'];
      if (userRole && bypassRoles.includes(userRole)) {
        const moduleRepo = this.drmRepository.manager.getRepository(ModuleDefinition);
        const actionRepo = this.drmRepository.manager.getRepository(ActionDefinition);
        const allModules = await moduleRepo.find({ where: { status: 'active' } });
        const allActions = await actionRepo.find();
        const result = allModules.map((m) => ({
          module: m.code,
          actions: allActions.map((a) => a.code),
        }));
        return {
          statusCode: SUCCESS,
          message: 'Effective permissions fetched successfully.',
          data: result,
        };
      }

      const permissions = await this.getUserPermissions(userDbId);

      const grouped = permissions.reduce(
        (acc, p) => {
          if (!acc[p.moduleCode]) {
            acc[p.moduleCode] = { module: p.moduleCode, actions: new Set() };
          }
          if (p.actionCode) {
            acc[p.moduleCode].actions.add(p.actionCode);
          }
          return acc;
        },
        {} as Record<string, { module: string; actions: Set<string> }>,
      );

      const result = Object.values(grouped).map((g) => ({
        module: g.module,
        actions: Array.from(g.actions).sort(),
      }));

      return {
        statusCode: SUCCESS,
        message: 'Effective permissions fetched successfully.',
        data: result,
      };
    } catch (error) {
      logger.error('Failed to fetch effective permissions', error);
      logsAndErrorHandling('RbacPermissionService - getEffectivePermissions', error, { userDbId });
    }
  }
}
