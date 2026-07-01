import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Users } from '../users/entities/user.entity';
import { UserFinances } from '../user_finance/entities/user_finance.entitiy';
import { Action } from 'src/enums/user_finance.enums';
import { Role } from 'src/entities';
import { UpdateUserFinanceDto } from './dto/update_employee_list.dto';
import { CustomConfigService } from '../../config/custom-config.service';
import { logger } from '../../logger/logger';
import { IST_TIME_ZONE, LISTING_DATE_FORMAT } from 'src/config/constants';
import { RolesDisplayMap, RolesEnum } from 'src/enums/roles.enum';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { formatInTimeZone } from 'date-fns-tz';
@Injectable()
export class EmployeeListService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(UserFinances)
    private readonly userFinancesRepository: Repository<UserFinances>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    private readonly configService: CustomConfigService,
  ) {}

  async getAllEmployees(
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
  ): Promise<any> {
    try {
      // Fetch RM Role ID
      const rmRole = await this.roleRepository.findOne({
        where: { name: RolesEnum.RM },
      });

      if (!rmRole) {
        throw new NotFoundException('RM Role not found.');
      }

      // Validate Pagination Inputs
      const skip = (page - 1) * limit;

      // Construct WHERE Conditions
      let where: any = [
        { role: { id: rmRole.id } }, // Base condition (Always applied)
      ];

      if (search) {
        where = [
          { role: { id: rmRole.id }, email: ILike(`%${search.trim()}%`) }, // Search by email
          { role: { id: rmRole.id }, name: ILike(`%${search.trim()}%`) }, // Search by name
        ];
      }

      //  Handle Sorting Logic
      const order: Record<string, 'ASC' | 'DESC'> = { createdAt: 'DESC' };

      if (sortBy) {
        const [field, direction] = sortBy.split(':');
        if (['name', 'updatedAt', 'createdAt'].includes(field)) {
          order[field] = direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        }
      }

      // Fetch RM Employees with Role and Selected Fields
      const [employees, total] = await this.usersRepository.findAndCount({
        where,
        relations: ['role'],
        select: {
          id: true,
          empCode: true,
          email: true,
          name: true,
          salary: true,
          accruals: true,
          employeeStatus: true,
          updatedAt: true,
          createdAt: true,
          role: {
            id: true,
            name: true,
          },
        },
        skip,
        take: limit,
        order,
      });

      if (!employees?.length) {
        return {
          message: 'No RM employees found.',
          data: {
            employees: [],
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
          },
        };
      }

      const formattedUsers = employees.map((employee) => {
        const salary = employee?.salary
          ? Number(this.configService.decryptData(employee?.salary))
          : null;
        return {
          empId: employee?.id ?? null,
          userId: employee?.empCode ?? null,
          email: employee?.email ?? 'No Email',
          name: employee?.name ?? 'No Name',
          salary: salary ?? null,
          employeeStatus: employee?.employeeStatus ?? null,
          accruals: employee?.accruals ?? null,
          roleId: employee?.role?.id ?? null,
          roleName: (() => {
            const formattedRole = employee?.role?.name;
            if (RolesDisplayMap[formattedRole]) {
              return RolesDisplayMap[formattedRole];
            }
            return formattedRole;
          })(),
          hasSalary: salary > 0,
          updatedAt: employee.updatedAt
            ? formatInTimeZone(
                employee.updatedAt,
                IST_TIME_ZONE,
                LISTING_DATE_FORMAT,
              )
            : null,
        };
      });

      return {
        message: 'RM Employees fetched successfully.',
        data: {
          employees: formattedUsers,
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error.name === 'QueryFailedError') {
        throw new InternalServerErrorException('Database query failed.');
      }
      throw new InternalServerErrorException('Failed to fetch RM employees.');
    }
  }

  async getEmployeeById(id: number): Promise<any> {
    try {
      // Validate the ID
      if (!id || isNaN(id)) {
        throw new BadRequestException('Invalid Employee ID.');
      }

      // Fetch employee details with role
      const employee = await this.usersRepository.findOne({
        where: { id },
        relations: ['role'],
        select: {
          id: true,
          name: true,
          email: true,
          salary: true,
          accruals: true,
          role: { id: true, name: true },
        },
      });

      if (!employee) {
        throw new NotFoundException(`Employee with ID ${id} not found.`);
      }

      const salary =
        employee?.salary &&
        Number(this.configService.decryptData(employee?.salary));

      return {
        message: 'Employee fetched successfully.',
        data: {
          employee: {
            empId: employee?.id ?? null,
            name: employee?.name ?? 'No Name',
            email: employee?.email ?? 'No Email',
            hasSalary: salary > 0,
            salary,
            accruals: employee?.accruals ?? null,
            roleId: employee?.role?.id ?? null,
            roleName: employee?.role?.name ?? null,
          },
        },
      };
    } catch (error) {
      logger.error('Error in getEmployeeById', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch employee.');
    }
  }

  async updateEmployeeFinance(
    userId: number,
    updateFinancedto: UpdateUserFinanceDto,
  ): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException({
          message: `User with ID ${userId} not found.`,
        });
      }

      const accruals = user?.accruals ?? 0;

      this.validateEmployeeFinanceUpdate(
        user,
        updateFinancedto,
        accruals,
        userId,
      );

      const providedAmount = updateFinancedto.amount ?? 0;
      let newBalance = accruals - providedAmount;

      if (updateFinancedto.action === Action.WRITE_OFF) {
        user.accruals = 0;
        newBalance = 0;
      } else {
        user.accruals = newBalance;
      }

      if (updateFinancedto.salary !== undefined) {
        user.salary = this.configService.encryptData(
          updateFinancedto.salary.toString(),
        );
      }

      if (accruals > 0) {
        const finance = this.userFinancesRepository.create({
          user,
          date: new Date(updateFinancedto.date),
          amount: updateFinancedto.amount,
          action: updateFinancedto.action,
          accumulatedBalance: accruals,
          balance: newBalance,
        });

        await this.userFinancesRepository.save(finance);
      }

      await this.usersRepository.save(user);

      return {
        message: 'User finance updated successfully.',
      };
    } catch (error) {
      logger.error(`Failed to update user finance: ${error}`);
      logsAndErrorHandling(
        'EmployeeListService - updateEmployeeFinance',
        error,
      );
    }
  }

  private validateEmployeeFinanceUpdate(
    user: any,
    dto: UpdateUserFinanceDto,
    accruals: number,
    userId: number,
  ) {
    if (user.salary === null && dto.salary === undefined) {
      throw new BadRequestException(`Salary is required for user ${userId}.`);
    }

    const hasTxnFields =
      dto.amount !== undefined ||
      dto.action !== undefined ||
      dto.date !== undefined;

    if (accruals > 0) {
      if (hasTxnFields) {
        throw new BadRequestException(
          'Amount, action, and date are required when accruals exist.',
        );
      }
    } else if (hasTxnFields) {
      throw new BadRequestException(
        `Only salary is allowed since no accruals exist for user ${userId}.`,
      );
    }

    const providedAmount = dto.amount ?? 0;
    if (providedAmount > accruals) {
      throw new BadRequestException(
        'Amount cannot exceed accumulated balance.',
      );
    }
  }
}
