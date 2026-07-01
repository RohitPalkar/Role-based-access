import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/roles.entity';
import { logger } from '../../logger/logger';
import { ROLES_TO_DISPLAY, SUCCESS } from '../../config/constants';
import { RolesDisplayMap, RolesEnum } from 'src/enums/roles.enum';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  /**
   * Find all Roles with pagination, search, and sorting
   * @param page Page number
   * @param limit Number of items per page
   * @param search Optional search string to filter roles by name
   * @param sortBy Optional sort parameter in the format 'field:direction'
   * @returns Paginated list of roles
   */
  async findAll(
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const order: Record<string, 'ASC' | 'DESC'> = {};
      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        if (field) {
          order[field] = direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        }
      }

      // Updated where conditions to include Finance Admin as well
      const whereConditions = [
        { name: RolesEnum.RM },
        { name: RolesEnum.SUPER_ADMIN },
        { name: RolesEnum.ADMIN },
        { name: RolesEnum.FINANCE_ADMIN },
      ];

      const [roles, total] = await this.rolesRepository.findAndCount({
        where: whereConditions,
        skip,
        take: limit,
        order,
      });

      if (!roles.length) {
        return {
          statusCode: SUCCESS,
          message: 'No Roles Found.',
          data: { roles },
        };
      }

      // Format each role for display using enum values for consistency
      const formattedResponse = roles.map((role) => {
        let formattedRole = role.name;
        if (RolesDisplayMap[formattedRole]) {
          formattedRole = RolesDisplayMap[formattedRole];
        }

        return {
          id: role.id,
          name: formattedRole,
        };
      });

      return {
        statusCode: SUCCESS,
        message: 'Roles fetched successfully.',
        data: {
          roles: formattedResponse,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch roles', error);
      logsAndErrorHandling('RolesService - findAll', error, {
        page,
        limit,
        search,
        sortBy,
      });
    }
  }

  /**
   * Find a Role by ID
   * @param id Role ID
   * @returns Role details
   */
  async findOne(id: number): Promise<any> {
    try {
      const role = await this.rolesRepository.findOne({ where: { id } });
      if (!role) {
        throw new NotFoundException(`Role with ID "${id}" not found.`);
      }

      return {
        statusCode: SUCCESS,
        message: 'Role fetched successfully.',
        data: role,
      };
    } catch (error) {
      logger.error(`Failed to fetch Role with ID: ${id}`, error);
      logsAndErrorHandling('RolesService - findOne', error, { id });
    }
  }

  /**
   * Role Dropdown List
   * @param search Optional search string to filter roles by name
   * @returns List of roles matching the search criteria
   */
  async roleDropdown(search?: string): Promise<any> {
    try {
      const qb = this.rolesRepository
        .createQueryBuilder('role')
        .where('role.name IN (:...names)', { names: ROLES_TO_DISPLAY })
        .select(['role.id', 'role.name']);

      if (search) {
        qb.andWhere('LOWER(role.name) LIKE LOWER(:search)', {
          search: `%${search}%`,
        });
      }

      const roles = await qb.orderBy('role.name', 'ASC').getMany();

      return {
        statusCode: SUCCESS,
        message: 'Roles fetched successfully.',
        data: roles,
      };
    } catch (error) {
      logger.error('Failed to fetch role dropdown', error);
      logsAndErrorHandling('RolesService - roleDropdown', error, {
        search,
      });
    }
  }
}
