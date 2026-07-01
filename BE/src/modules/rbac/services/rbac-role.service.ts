import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleDefinition } from '../entities/role-definition.entity';
import { DeptRoleModuleMapping } from '../entities/dept-role-module-mapping.entity';
import { ModuleDefinition } from '../entities/module-definition.entity';
import { ActionDefinition } from '../entities/action-definition.entity';
import { SubModuleDefinition } from '../entities/sub-module-definition.entity';
import { logger } from '../../../logger/logger';
import { SUCCESS } from '../../../config/constants';
import { logsAndErrorHandling } from '../../../utils/errorLogHandler';

@Injectable()
export class RbacRoleService {
  constructor(
    @InjectRepository(RoleDefinition)
    private readonly roleDefinitionRepository: Repository<RoleDefinition>,
    @InjectRepository(DeptRoleModuleMapping)
    private readonly drmRepository: Repository<DeptRoleModuleMapping>,
    @InjectRepository(ModuleDefinition)
    private readonly moduleRepository: Repository<ModuleDefinition>,
    @InjectRepository(ActionDefinition)
    private readonly actionRepository: Repository<ActionDefinition>,
    @InjectRepository(SubModuleDefinition)
    private readonly subModuleRepository: Repository<SubModuleDefinition>,
  ) {}

  async findAll(page: number, limit: number, search?: string, sortBy?: string, status?: string): Promise<any> {
    try {
      const skip = (page - 1) * limit;
      const queryBuilder = this.roleDefinitionRepository
        .createQueryBuilder('rd')
        .leftJoinAndSelect('rd.department', 'department')
        .leftJoinAndSelect('rd.level', 'level');

      if (search) {
        queryBuilder.andWhere(
          '(LOWER(rd.name) LIKE LOWER(:search) OR LOWER(rd.code) LIKE LOWER(:search))',
          { search: `%${search}%` },
        );
      }

      if (status) {
        queryBuilder.andWhere('rd.status = :status', { status });
      }

      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        const safeField = ['rd.name', 'rd.code', 'rd.status'].includes(field) ? field : 'rd.name';
        queryBuilder.orderBy(safeField, direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC');
      } else {
        queryBuilder.orderBy('rd.name', 'ASC');
      }

      const [roles, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        statusCode: SUCCESS,
        message: 'Role definitions fetched successfully.',
        data: {
          roles,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch role definitions', error);
      logsAndErrorHandling('RbacRoleService - findAll', error, { page, limit, search, sortBy });
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      const role = await this.roleDefinitionRepository.findOne({
        where: { id },
        relations: ['department', 'level'],
      });

      if (!role) {
        throw new NotFoundException(`Role definition with ID "${id}" not found.`);
      }

      const permissions = await this.drmRepository.find({
        where: { roleDefinitionId: id },
        relations: ['module', 'subModule', 'action'],
      });

      return {
        statusCode: SUCCESS,
        message: 'Role definition fetched successfully.',
        data: { role, permissions },
      };
    } catch (error) {
      logger.error(`Failed to fetch role definition with ID: ${id}`, error);
      logsAndErrorHandling('RbacRoleService - findOne', error, { id });
    }
  }

  async dropdown(): Promise<any> {
    try {
      const roles = await this.roleDefinitionRepository.find({
        where: { status: 'active' },
        select: ['id', 'name', 'code'],
        order: { name: 'ASC' },
      });

      return {
        statusCode: SUCCESS,
        message: 'Role definitions fetched successfully.',
        data: roles,
      };
    } catch (error) {
      logger.error('Failed to fetch role dropdown', error);
      logsAndErrorHandling('RbacRoleService - dropdown', error, {});
    }
  }

  async create(data: { name: string; code: string; description?: string; departmentId?: number; levelId?: number }): Promise<any> {
    try {
      const role = this.roleDefinitionRepository.create({
        name: data.name,
        code: data.code,
        description: data.description,
        departmentId: data.departmentId ?? 1,
        levelId: data.levelId ?? 1,
      });

      const saved = await this.roleDefinitionRepository.save(role);

      return {
        statusCode: SUCCESS,
        message: 'Role definition created successfully.',
        data: saved,
      };
    } catch (error) {
      logger.error('Failed to create role definition', error);
      logsAndErrorHandling('RbacRoleService - create', error, data);
    }
  }

  async update(id: number, data: Partial<{ name: string; code: string; description: string; status: string }>): Promise<any> {
    try {
      const role = await this.roleDefinitionRepository.findOne({ where: { id } });
      if (!role) {
        throw new NotFoundException(`Role definition with ID "${id}" not found.`);
      }

      await this.roleDefinitionRepository.update(id, data);
      const updated = await this.roleDefinitionRepository.findOne({ where: { id } });

      return {
        statusCode: SUCCESS,
        message: 'Role definition updated successfully.',
        data: updated,
      };
    } catch (error) {
      logger.error(`Failed to update role definition with ID: ${id}`, error);
      logsAndErrorHandling('RbacRoleService - update', error, { id, data });
    }
  }

  async remove(id: number): Promise<any> {
    try {
      const role = await this.roleDefinitionRepository.findOne({ where: { id } });
      if (!role) {
        throw new NotFoundException(`Role definition with ID "${id}" not found.`);
      }

      await this.roleDefinitionRepository.softDelete(id);

      return {
        statusCode: SUCCESS,
        message: 'Role definition deleted successfully.',
        data: null,
      };
    } catch (error) {
      logger.error(`Failed to delete role definition with ID: ${id}`, error);
      logsAndErrorHandling('RbacRoleService - remove', error, { id });
    }
  }

  async getModules(): Promise<any> {
    try {
      const modules = await this.moduleRepository.find({
        where: { status: 'active', parentId: null },
        relations: ['subModules', 'actions'],
        order: { sortOrder: 'ASC' },
      });

      return {
        statusCode: SUCCESS,
        message: 'Modules fetched successfully.',
        data: modules,
      };
    } catch (error) {
      logger.error('Failed to fetch modules', error);
      logsAndErrorHandling('RbacRoleService - getModules', error, {});
    }
  }

  async getModuleActions(moduleCode: string): Promise<any> {
    try {
      const module = await this.moduleRepository.findOne({
        where: { code: moduleCode },
      });

      if (!module) {
        throw new NotFoundException(`Module with code "${moduleCode}" not found.`);
      }

      const actions = await this.actionRepository.find({
        where: [
          { moduleId: module.id },
          { moduleId: null },
        ],
        order: { name: 'ASC' },
      });

      const subModules = await this.subModuleRepository.find({
        where: { moduleId: module.id, status: 'active' },
        order: { sortOrder: 'ASC' },
      });

      return {
        statusCode: SUCCESS,
        message: 'Module details fetched successfully.',
        data: { module, actions, subModules },
      };
    } catch (error) {
      logger.error('Failed to fetch module actions', error);
      logsAndErrorHandling('RbacRoleService - getModuleActions', error, { moduleCode });
    }
  }

  async getRolePermissions(roleId: number): Promise<any> {
    try {
      const mappings = await this.drmRepository.find({
        where: { roleDefinitionId: roleId, status: 'active' },
        relations: ['module', 'subModule', 'action', 'level'],
      });

      return {
        statusCode: SUCCESS,
        message: 'Role permissions fetched successfully.',
        data: mappings,
      };
    } catch (error) {
      logger.error('Failed to fetch role permissions', error);
      logsAndErrorHandling('RbacRoleService - getRolePermissions', error, { roleId });
    }
  }
}
