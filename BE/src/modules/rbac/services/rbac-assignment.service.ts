import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserRoleAssignment } from '../entities/user-role-assignment.entity';
import { RoleDefinition } from '../entities/role-definition.entity';
import { UserHierarchy } from '../entities/user-hierarchy.entity';
import { UserProjectModuleAccess } from '../entities/user-project-module-access.entity';
import { DeptRoleModuleMapping } from '../entities/dept-role-module-mapping.entity';
import { Users } from '../../../entities';
import { Projects } from '../../../entities';
import { logger } from '../../../logger/logger';
import { SUCCESS } from '../../../config/constants';
import { logsAndErrorHandling } from '../../../utils/errorLogHandler';

@Injectable()
export class RbacAssignmentService {
  constructor(
    @InjectRepository(UserRoleAssignment)
    private readonly assignmentRepository: Repository<UserRoleAssignment>,
    @InjectRepository(RoleDefinition)
    private readonly roleDefinitionRepository: Repository<RoleDefinition>,
    @InjectRepository(UserHierarchy)
    private readonly hierarchyRepository: Repository<UserHierarchy>,
    @InjectRepository(UserProjectModuleAccess)
    private readonly projectAccessRepository: Repository<UserProjectModuleAccess>,
    @InjectRepository(DeptRoleModuleMapping)
    private readonly drmRepository: Repository<DeptRoleModuleMapping>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,
  ) {}

  async assignRole(
    userId: number,
    roleDefinitionId: number,
    isPrimary?: boolean,
    projectAccess?: any,
    assignedBy?: number,
  ): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID "${userId}" not found.`);
      }

      const roleDef = await this.roleDefinitionRepository.findOne({ where: { id: roleDefinitionId } });
      if (!roleDef) {
        throw new NotFoundException(`Role definition with ID "${roleDefinitionId}" not found.`);
      }

      if (isPrimary) {
        await this.assignmentRepository.update(
          { userId, isPrimary: true, status: 'active' },
          { isPrimary: false },
        );
      }

      const existingAssignment = await this.assignmentRepository.findOne({
        where: { userId, roleDefinitionId, status: 'active' },
      });

      if (existingAssignment) {
        throw new BadRequestException('User already has this role assignment.');
      }

      const assignment = this.assignmentRepository.create({
        userId,
        roleDefinitionId,
        isPrimary: isPrimary ?? false,
        projectAccess: projectAccess ?? null,
        assignedBy,
      });

      const saved = await this.assignmentRepository.save(assignment);

      await this.cacheService.del(`rbac:permissions:${userId}`);

      return {
        statusCode: SUCCESS,
        message: 'Role assigned successfully.',
        data: saved,
      };
    } catch (error) {
      logger.error('Failed to assign role', error);
      logsAndErrorHandling('RbacAssignmentService - assignRole', error, {
        userId,
        roleDefinitionId,
        isPrimary,
      });
    }
  }

  async revokeRole(userId: number, roleDefinitionId: number): Promise<any> {
    try {
      const assignment = await this.assignmentRepository.findOne({
        where: { userId, roleDefinitionId, status: 'active' },
      });

      if (!assignment) {
        throw new NotFoundException('Active role assignment not found.');
      }

      await this.assignmentRepository.update(assignment.id, {
        status: 'inactive',
        revokedAt: new Date(),
      });

      await this.cacheService.del(`rbac:permissions:${userId}`);

      return {
        statusCode: SUCCESS,
        message: 'Role revoked successfully.',
        data: null,
      };
    } catch (error) {
      logger.error('Failed to revoke role', error);
      logsAndErrorHandling('RbacAssignmentService - revokeRole', error, { userId, roleDefinitionId });
    }
  }

  async getUserRoles(userId: number): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID "${userId}" not found.`);
      }

      const assignments = await this.assignmentRepository.find({
        where: { userId, status: 'active' },
        relations: ['roleDefinition', 'roleDefinition.department', 'roleDefinition.level'],
        order: { isPrimary: 'DESC', createdAt: 'DESC' },
      });

      return {
        statusCode: SUCCESS,
        message: 'User roles fetched successfully.',
        data: assignments,
      };
    } catch (error) {
      logger.error('Failed to fetch user roles', error);
      logsAndErrorHandling('RbacAssignmentService - getUserRoles', error, { userId });
    }
  }

  async updateMappings(
    roleDefinitionId: number,
    moduleId: number,
    subModuleId: number | null,
    actionIds: number[],
  ): Promise<any> {
    try {
      await this.drmRepository.delete({
        roleDefinitionId,
        moduleId,
        subModuleId: subModuleId ?? null,
      });

      if (actionIds.length > 0) {
        const mappings = actionIds.map((actionId) =>
          this.drmRepository.create({
            departmentId: 1,
            roleDefinitionId,
            moduleId,
            subModuleId: subModuleId ?? null,
            actionId,
            levelId: 1,
          }),
        );

        await this.drmRepository.save(mappings);
      }

      return {
        statusCode: SUCCESS,
        message: 'Permissions updated successfully.',
        data: null,
      };
    } catch (error) {
      logger.error('Failed to update permission mappings', error);
      logsAndErrorHandling('RbacAssignmentService - updateMappings', error, {
        roleDefinitionId,
        moduleId,
      });
    }
  }

  async setProjectModuleAccess(
    userId: number,
    projectId: number,
    moduleId: number,
    isEnabled: boolean,
  ): Promise<any> {
    try {
      const existing = await this.projectAccessRepository.findOne({
        where: { userId, projectId, moduleId },
      });

      if (existing) {
        await this.projectAccessRepository.update(existing.id, { isEnabled });
      } else {
        await this.projectAccessRepository.save({
          userId,
          projectId,
          moduleId,
          isEnabled,
        });
      }

      return {
        statusCode: SUCCESS,
        message: 'Project module access updated successfully.',
        data: null,
      };
    } catch (error) {
      logger.error('Failed to set project module access', error);
      logsAndErrorHandling('RbacAssignmentService - setProjectModuleAccess', error, {
        userId,
        projectId,
        moduleId,
      });
    }
  }

  async getUserHierarchy(userId: number): Promise<any> {
    try {
      let hierarchy = await this.hierarchyRepository.findOne({
        where: { userId },
        relations: ['manager', 'teamAdmin', 'deptAdmin'],
      });

      if (!hierarchy) {
        hierarchy = await this.hierarchyRepository.save({ userId });
      }

      return {
        statusCode: SUCCESS,
        message: 'User hierarchy fetched successfully.',
        data: hierarchy,
      };
    } catch (error) {
      logger.error('Failed to fetch user hierarchy', error);
      logsAndErrorHandling('RbacAssignmentService - getUserHierarchy', error, { userId });
    }
  }
}
