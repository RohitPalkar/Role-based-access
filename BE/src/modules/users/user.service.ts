import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './entities/user.entity';
import { ILike, Repository, Brackets, EntityManager, In } from 'typeorm';
import { logger } from '../../logger/logger';
import { Brands, Department, Group, Projects, Role } from 'src/entities';
import { AwsService } from '../aws/aws.service';
import * as ExcelJS from 'exceljs';
import { PassThrough } from 'node:stream';
import { StatusEnum } from 'src/enums/status.enum';
import { UpdateUserDTO } from './dto/update-user-dto';
import { NotificationService } from '../notifications/notification.service';
import { EmployeeStatus } from 'src/enums/employee-status.enum';
import { RolesDisplayMap, RolesEnum } from 'src/enums/roles.enum';
import { File } from 'multer';
import {
  DEFAULT_LIMIT,
  EXCLUDED_BRANDS_FROM_SAP,
  SUCCESS,
  ROLES_TO_DISPLAY,
} from 'src/config/constants';
import { extractInkOnly } from '../../utils/image.utils';
import { extractRoleName } from 'src/helpers';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { UserGroupAssignment } from './entities/user_group_assignment.entity';
import { fromZonedTime } from 'date-fns-tz';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Brands)
    private readonly brandRepository: Repository<Brands>,

    @InjectRepository(UserGroupAssignment)
    private readonly groupAssignRepository: Repository<UserGroupAssignment>,

    private readonly awsService: AwsService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Refresh Data (with transaction). If any step fails, all DB operations will be rolled back.
   */
  async refreshData(users: CreateUserDto[]): Promise<any> {
    if (!Array.isArray(users) || users.length === 0) {
      throw new BadRequestException('Invalid input: Users array is required.');
    }

    const notifications: any[] = [];

    // Start transaction
    return this.usersRepository.manager
      .transaction(async (manager) => {
        try {
          // 1. Extract unique brand, role, department and group values
          const { uniqueBrands, uniqueRoles, uniqueDepartments } =
            this.extractUniqueValues(users);

          // 2. Fetch existing brands, roles, department and groups
          const [existingBrands, existingRoles, existingDepartments] =
            await this.fetchExistingData(
              manager,
              uniqueBrands,
              uniqueRoles,
              uniqueDepartments,
            );

          // 3. Build lookup maps
          const { brandMap, roleMap, departmentMap } = this.buildMaps(
            existingBrands,
            existingRoles,
            existingDepartments,
          );

          // 4. Create missing brands
          await this.createMissingBrands(
            manager,
            brandMap,
            uniqueBrands,
            existingBrands,
            notifications, // Collect notifications inside transaction
          );

          // 6. Create missing roles
          await this.createMissingRoles(manager, roleMap, uniqueRoles);

          // 7. Create missing departments
          await this.createMissingDepartments(
            manager,
            departmentMap,
            uniqueDepartments,
          );

          // 8. Fetch existing users
          const existingUsers = await this.fetchExistingUsers(manager);

          // 9. Determine which users to insert, update, or deactivate
          const [usersToInsert, usersToUpdate, usersToDeactivate] =
            this.processUsers(
              users,
              { brandMap, roleMap, departmentMap },
              {
                brands: existingBrands,
                users: existingUsers,
                roles: existingRoles,
                departments: existingDepartments,
              },
            );

          // 10. Save all changes (insert, update, deactivate) & collect notifications
          await this.saveUsers(
            manager,
            usersToInsert,
            usersToUpdate,
            usersToDeactivate,
            notifications,
          );

          return { message: 'List updated successfully' };
        } catch (error) {
          logger.error('Error processing users:', error);
          logsAndErrorHandling('UserService - refreshData', error, {
            users,
          });
        }
      })
      .then((result) => {
        // Send notifications only after transaction is committed
        this.sendNotifications(notifications);
        return result;
      })
      .catch((error) => {
        logger.error('Transaction failed:', error);
        logsAndErrorHandling('UserService - refreshData', error);
      });
  }

  /**
   * Step 1: Extract unique brand, role, and group values from the input.
   */
  private extractUniqueValues(users: CreateUserDto[]): {
    uniqueBrands: string[];
    uniqueRoles: string[];
    uniqueDepartments: string[];
  } {
    try {
      const uniqueBrands = [...new Set(users.map((u) => u.Company))];
      const uniqueRoles = [...new Set(users.map((u) => u.profileName))];
      const uniqueDepartments = [
        ...new Set(users.map((u) => u.departmentName)),
      ];

      return { uniqueBrands, uniqueRoles, uniqueDepartments };
    } catch (error) {
      logger.error('Error extracting unique values:', error);
      logsAndErrorHandling('UserService - extractUniqueValues', error, {
        users,
      });
    }
  }

  /**
   * Step 2: Fetch existing brands, roles, and groups in parallel using the transaction manager.
   */
  private async fetchExistingData(
    manager: EntityManager,
    uniqueBrands: string[],
    uniqueRoles: string[],
    uniqueDepartments: string[],
  ): Promise<[Brands[], Role[], Department[]]> {
    try {
      const brandsPromise = manager.getRepository(Brands).find({
        where: uniqueBrands.map((name) => ({ name: ILike(`%${name}%`) })),
      });

      const rolesPromise = manager.getRepository(Role).find({
        where: uniqueRoles.map((name) => ({ name: ILike(`%${name}%`) })),
      });

      const departmentsPromise = manager.getRepository(Department).find({
        where: uniqueDepartments.map((name) => ({ name: ILike(`%${name}%`) })),
      });

      return await Promise.all([
        brandsPromise,
        rolesPromise,
        departmentsPromise,
      ]);
    } catch (error) {
      logger.error('Error fetching existing data:', error);
      logsAndErrorHandling('UserService - fetchExistingData', error, null);
    }
  }

  /**
   * Step 3: Build lookup maps from existing records.
   */
  private buildMaps(
    existingBrands: Brands[],
    existingRoles: Role[],
    existingDepartments: Department[],
  ): {
    brandMap: Map<string, Brands>;
    roleMap: Map<string, Role>;
    departmentMap: Map<string, Department>;
  } {
    try {
      const brandMap = new Map(
        existingBrands.map((b) => [b?.name?.toLowerCase(), b]),
      );
      const roleMap = new Map(existingRoles.map((r) => [r?.name, r]));
      const departmentMap = new Map(
        existingDepartments.map((d) => [d?.name, d]),
      );

      return { brandMap, roleMap, departmentMap };
    } catch (error) {
      logger.error('Error building maps:', error);
      logsAndErrorHandling('UserService - buildMaps', error, null);
    }
  }

  /**
   * Step 4: Create missing brands (with partial matching logic) within the transaction.
   */
  private async createMissingBrands(
    manager: EntityManager,
    brandMap: Map<string, Brands>,
    uniqueBrands: string[],
    existingBrands: Brands[],
    notifications: any[],
  ): Promise<void> {
    try {
      const excludedBrandsSet = new Set(EXCLUDED_BRANDS_FROM_SAP);
      const brandRepo = manager.getRepository(Brands);
      const newBrands = uniqueBrands
        .filter(
          (brandName) =>
            !existingBrands.some((b) =>
              b?.name?.toLowerCase().includes(brandName?.toLowerCase()),
            ) &&
            !brandMap.has(brandName?.toLowerCase()) &&
            !excludedBrandsSet.has(brandName?.toLowerCase()),
        )
        .map((brandName) =>
          brandRepo.create({
            name: brandName,
            maxQualificationDays: 0,
          }),
        );

      if (newBrands.length > 0) {
        const savedBrands = await brandRepo.save(newBrands);
        savedBrands.forEach((b) => {
          // Put it in our brand map
          brandMap.set(b.name.toLowerCase().trim(), b);

          // Push notification for the new brand
          notifications.push({
            title: 'New Brand Alert',
            message: `A new brand, "${b.name}", has been added to the system.`,
            type: 'Brand',
            isForAllAdmin: true,
          });
        });
      }
    } catch (error) {
      logger.error('Error creating missing brands:', error);
      logsAndErrorHandling('UserService - createMissingBrands', error, null);
    }
  }

  /**
   * Step 5: Create missing roles within the transaction.
   */
  private async createMissingRoles(
    manager: EntityManager,
    roleMap: Map<string, Role>,
    uniqueRoles: string[],
  ): Promise<void> {
    try {
      const roleRepo = manager.getRepository(Role);
      const newRoles = uniqueRoles
        .filter((name) => !roleMap.has(name))
        .map((name) => roleRepo.create({ name }));

      if (newRoles.length > 0) {
        const savedRoles = await roleRepo.save(newRoles);
        savedRoles.forEach((r) => roleMap.set(r.name, r));
      }
    } catch (error) {
      logger.error('Error creating missing roles:', error);
      logsAndErrorHandling('UserService - createMissingRoles', error, null);
    }
  }

  /**
   * Step 6: Create missing departments
   */
  private async createMissingDepartments(
    manager: EntityManager,
    departmentMap: Map<string, Department>,
    uniqueDepartments: string[],
  ): Promise<void> {
    try {
      const departmentRepo = manager.getRepository(Department);
      const newDepartments = uniqueDepartments
        .filter((name) => !departmentMap.has(name))
        .map((name) => departmentRepo.create({ name }));

      if (newDepartments.length > 0) {
        const savedDepartments = await departmentRepo.save(newDepartments);
        savedDepartments.forEach((d) => departmentMap.set(d.name, d));
      }
    } catch (error) {
      logger.error('Error creating missing departments:', error);
      logsAndErrorHandling(
        'UserService - createMissingDepartments',
        error,
        null,
      );
    }
  }

  /**
   * Step 7: Fetch all existing users within the transaction.
   */
  private async fetchExistingUsers(manager: EntityManager): Promise<Users[]> {
    try {
      return await manager.getRepository(Users).find({
        relations: ['role', 'group', 'brand', 'department'],
      });
    } catch (error) {
      logger.error('Error fetching existing users:', error);
      logsAndErrorHandling('UserService - fetchExistingUsers', error, null);
    }
  }

  /**
   * Step 8: Determine which users to insert, update, or deactivate based on input.
   */
  private processUsers(
    users: CreateUserDto[],
    maps: {
      brandMap: Map<string, Brands>;
      roleMap: Map<string, Role>;
      departmentMap: Map<string, Department>;
    },
    existingData: {
      brands: Brands[];
      users: Users[];
      roles: Role[];
      departments: Department[];
    },
  ): [Users[], Users[], Users[]] {
    try {
      logger.info('Processing users for insert/update/deactivate...');
      const {
        brands: existingBrands,
        users: existingUsers,
        roles: existingRoles,
        departments: existingDepartments,
      } = existingData;

      const userNameMap = new Map(
        existingUsers?.map((u) => [u?.userName?.toLowerCase(), u]) || [],
      );

      const userIdsMap = new Map(
        existingUsers?.map((u) => [u?.userId?.toLowerCase(), u]) || [],
      );

      const activeUserIds = new Set(users?.map((user) => user?.Username) || []);
      const { usersToInsert, usersToUpdate } = this.mapUsersForInsertOrUpdate(
        users,
        userNameMap,
        userIdsMap,
        maps,
        existingBrands,
        existingRoles,
        existingDepartments,
      );

      // Identify users to deactivate (those not present in the new "activeUserIds")
      const usersToDeactivate = this.identifyUsersToDeactivate(
        existingUsers,
        activeUserIds,
      );

      return [usersToInsert, usersToUpdate, usersToDeactivate];
    } catch (error) {
      logger.error('Error processing users:', error);
      logsAndErrorHandling('Failed to process users', error, null);
    }
  }

  /**
   * Map users for insertion or update based on existing records and input data.
   */
  private mapUsersForInsertOrUpdate(
    users: CreateUserDto[],
    userNameMap: Map<string, Users>,
    userIdsMap: Map<string, Users>,
    maps: {
      brandMap: Map<string, Brands>;
      roleMap: Map<string, Role>;
      departmentMap: Map<string, Department>;
    },
    existingBrands: Brands[],
    existingRoles: Role[],
    existingDepartments: Department[],
  ): { usersToInsert: Users[]; usersToUpdate: Users[] } {
    const { brandMap, roleMap, departmentMap } = maps;
    const usersToInsert: Users[] = [];
    const usersToUpdate: Users[] = [];

    for (const user of users) {
      const brandKey = user?.Company?.toLowerCase().trim();
      const brand =
        brandMap.get(brandKey) ||
        existingBrands.find((b) => b?.name.toLowerCase().includes(brandKey));

      const roleKey = user?.profileName;
      const role =
        existingRoles?.find((r) => r?.name === roleKey) || roleMap.get(roleKey);

      const departmentKey = user?.departmentName;
      const department =
        existingDepartments?.find((r) => r?.name === departmentKey) ||
        departmentMap.get(departmentKey);

      const existingUser = userNameMap.get(user?.Username?.toLowerCase());
      const existingUserId = userIdsMap.get(user?.Id?.toLowerCase());

      if (existingUser || existingUserId) {
        const userToUpdate = existingUser ?? existingUserId;
        const needsUpdate = this.needsUserUpdate(
          userToUpdate,
          user,
          department,
          brand,
        );

        if (needsUpdate) {
          userToUpdate.name = user?.Name;
          userToUpdate.userId = user?.Id;
          userToUpdate.userName = user?.Username;
          userToUpdate.email = user?.Email;
          userToUpdate.empCode = user?.empCode;
          userToUpdate.department = department;
          userToUpdate.brand = brand;
          userToUpdate.regionIds = user?.regionIds;
          userToUpdate.status = StatusEnum.ACTIVE;
          userToUpdate.updatedAt = new Date();
          usersToUpdate.push(userToUpdate);
        }
      } else {
        const newUser = new Users();
        newUser.name = user?.Name;
        newUser.userId = user?.Id;
        newUser.email = user?.Email;
        newUser.userName = user?.Username;
        newUser.empCode = user.empCode;
        newUser.role = role;
        newUser.department = department;
        newUser.brand = brand;
        newUser.regionIds = user?.regionIds;
        newUser.status = StatusEnum.ACTIVE;
        newUser.createdAt = new Date();
        usersToInsert.push(newUser);
      }
    }

    return { usersToInsert, usersToUpdate };
  }

  /**
   * Identify users to deactivate
   *
   */
  private identifyUsersToDeactivate(
    existingUsers: Users[],
    activeUserIds: Set<string>,
  ): Users[] {
    const toDeactivate = existingUsers.filter(
      (existingUser) =>
        !activeUserIds.has(existingUser.userName) &&
        existingUser.status === StatusEnum.ACTIVE &&
        existingUser.createdBy === null,
    );

    toDeactivate.forEach((user) => {
      user.status = StatusEnum.ACTIVE;
      user.updatedAt = new Date();
    });

    return toDeactivate;
  }

  private needsUserUpdate(
    userToUpdate: Users | null,
    user: any,
    department: Department | null,
    brand: Brands | null,
  ): boolean {
    return (
      userToUpdate?.name !== user?.Name ||
      userToUpdate?.userId !== user?.Id ||
      userToUpdate?.userName !== user?.Username ||
      userToUpdate?.email !== user?.Email ||
      userToUpdate?.empCode !== user?.empCode ||
      userToUpdate?.department?.id !== department?.id ||
      userToUpdate?.brand?.id !== brand?.id ||
      userToUpdate?.status === StatusEnum.INACTIVE
    );
  }

  /**
   * Step 10: Save all user changes (insert, update, deactivate) within the transaction.
   */
  private async saveUsers(
    manager: EntityManager,
    usersToInsert: Users[],
    usersToUpdate: Users[],
    usersToDeactivate: Users[],
    notifications: any[],
  ): Promise<void> {
    try {
      const userRepo = manager.getRepository(Users);

      if (usersToInsert.length > 0) {
        await userRepo.save(usersToInsert);

        notifications.push(
          ...usersToInsert.map((newUser) => ({
            title: `New User Added`,
            message: `A new User, ${newUser?.name} (${newUser.role?.name}), has been added to the system`,
            type: 'User',
            isForAllAdmin: true,
          })),
        );
      }

      if (usersToUpdate.length > 0) {
        await userRepo.save(usersToUpdate);
      }
      if (usersToDeactivate.length > 0) {
        await userRepo.save(usersToDeactivate);
      }
    } catch (error) {
      logger.error('Error saving user records:', error);
      logsAndErrorHandling('UserService - saveUsers', error, null);
    }
  }

  private async sendNotifications(notifications: any[]): Promise<void> {
    try {
      if (!notifications || notifications.length === 0) return;

      // Send notifications
      await this.notificationService.create({ notifications });
    } catch (error) {
      logger.error('Error creating notifications:', error);
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException('Invalid user ID format.');
      }

      const userData = await this.usersRepository.findOne({
        where: { id },
        relations: ['role', 'brand', 'project'],
      });

      if (!userData) {
        throw new NotFoundException(`User with ID "${id}" not found.`);
      }

      const now = new Date();

      const currentAssignment = await this.groupAssignRepository
        .createQueryBuilder('uga')
        .innerJoin('uga.group', 'g')
        .where('uga.user_id = :userId', { userId: id })
        .andWhere('uga.start_date <= :now', { now })
        .andWhere('(uga.end_date IS NULL OR uga.end_date >= :now)', { now })
        .select(['uga.startDate', 'uga.endDate', 'g.id', 'g.name'])
        .getOne();

      const user = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        employeeStatus: userData.employeeStatus,
        roleId: userData.role?.id,
        role: userData.role?.name,
        group: currentAssignment
          ? {
              id: currentAssignment.group.id,
              name: currentAssignment.group.name,
              startDate: currentAssignment.startDate,
              endDate: currentAssignment.endDate,
            }
          : null,
        brandId: userData.brand?.id,
        project: {
          id: userData.project?.id,
          name: userData.project?.name,
        },
        signatureImage: userData.signatureImage,
        regionIds: userData?.regionIds,
        countryCode: userData?.countryCode,
        contactNumber: userData?.contactNumber,
      };

      return {
        message: 'User fetched successfully.',
        data: user,
      };
    } catch (error) {
      logger.error(`Failed to fetch User with ID: ${id}`, error);
      logsAndErrorHandling('UserService - findOne', error, { id });
    }
  }

  async getAllUser(options: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    brandUserId?: number[];
    groupUserId?: number;
    status?: string;
    role?: number;
  }): Promise<any> {
    try {
      const query = await this.buildUserQuery(options);
      const [userData, total] = await query.getManyAndCount();
      const message = userData.length
        ? 'Users fetched successfully.'
        : 'No users found.';

      const users = userData.map((user) => {
        let formattedRole = user?.role?.name;
        if (RolesDisplayMap[formattedRole]) {
          formattedRole = RolesDisplayMap[formattedRole];
        } else {
          formattedRole = extractRoleName(formattedRole);
        }

        const activeGroup = user.groupAssignments?.[0]?.group ?? null;
        return {
          id: user.id,
          sfdcUserId: user.userId,
          EmpId: user.empCode,
          name: user.name,
          brand: user.brand?.name,
          email: user.email,
          role: formattedRole,
          group: activeGroup
            ? { id: activeGroup.id, name: activeGroup.name }
            : null,
          status: user.status,
          signatureImage: user.signatureImage,
          employeeStatus: user.employeeStatus,
          reportingTo: user.reportingTo,
          isSignatory: user.isSignatory,
          contactNumber:
            user.countryCode && user.contactNumber
              ? `${user.countryCode}${user.contactNumber}`
              : null,
          regionIds: user?.regionIds,
        };
      });

      return {
        message,
        data: {
          users,
          total,
          currentPage: options.page,
          totalPages: Math.ceil(total / options.limit),
        },
      };
    } catch (error) {
      logger.error('Failed to fetch users:', error);
      logsAndErrorHandling('UserService - getAllUser', error, options);
    }
  }

  /**
   * Helper function to build the query based on filters, sorting, pagination, and roles
   */
  private async buildUserQuery(options: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    brandUserId?: number[];
    groupUserId?: number;
    status?: string;
    role?: number;
  }) {
    const { page, limit, search, sortBy, groupUserId, status, role } = options;
    let { brandUserId } = options;

    const skip = (page - 1) * limit;
    const now = new Date();

    if (brandUserId?.length) {
      brandUserId = brandUserId.filter(
        (el) => typeof el === 'number' && !Number.isNaN(el),
      );
    }

    const groupUserIdNum =
      typeof groupUserId === 'number' && !Number.isNaN(groupUserId)
        ? groupUserId
        : null;

    const activeBool = typeof status === 'string' ? status : null;

    let roleIdsToFilter: number[] | null = null;
    if (!role) {
      const roleEntities = await this.roleRepository
        .createQueryBuilder('role')
        .where('role.name IN (:...names)', { names: ROLES_TO_DISPLAY })
        .getMany();

      roleIdsToFilter = roleEntities.map((r) => r.id);
      if (!roleIdsToFilter.length) {
        throw new BadRequestException('Required roles not found.');
      }
    }

    const order: Record<string, 'ASC' | 'DESC'> = (() => {
      const defaultOrder = { 'user.createdAt': 'DESC' as const };
      if (!sortBy) return defaultOrder;

      const [field, direction] = sortBy.split(':');
      const validFields = ['name', 'createdAt', 'updatedAt', 'email'];

      if (!validFields.includes(field)) return defaultOrder;

      return {
        [`user.${field}`]: direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC',
      };
    })();

    const query = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.brand', 'brand')
      .orderBy(order);

    if (limit > 0) {
      query.take(limit).skip(skip);
    }

    if (groupUserIdNum === null) {
      query
        .leftJoinAndSelect(
          'user.groupAssignments',
          'uga',
          'uga.startDate <= :now AND (uga.endDate IS NULL OR uga.endDate >= :now)',
          { now },
        )
        .leftJoinAndSelect('uga.group', 'group');
    } else {
      query
        .innerJoinAndSelect(
          'user.groupAssignments',
          'uga',
          'uga.startDate <= :now AND (uga.endDate IS NULL OR uga.endDate >= :now)',
          { now },
        )
        .innerJoinAndSelect('uga.group', 'group', 'group.id = :groupUserId', {
          groupUserId: groupUserIdNum,
        });
    }

    if (search) {
      const searchTerm = `%${search.trim()}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('user.name LIKE :search', { search: searchTerm }).orWhere(
            'user.email LIKE :search',
            { search: searchTerm },
          );
        }),
      );
    }

    if (activeBool !== null) {
      query.andWhere('user.status = :active', { active: activeBool });
    }

    if (brandUserId?.length) {
      query.andWhere('user.brand_id IN (:...brandUserId)', { brandUserId });
    }

    if (role) {
      query.andWhere('user.role_id = :role', { role });
    } else {
      query.andWhere('user.role_id IN (:...roleIds)', {
        roleIds: roleIdsToFilter,
      });
    }

    return query;
  }

  async exportUsers(filterDto: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    brandUserId?: number[];
    groupUserId?: number;
    status?: string;
    role?: number;
  }): Promise<any> {
    try {
      logger.info('Started user export process');
      filterDto.limit = -1;
      const response = await this.getAllUser(filterDto);
      const users = response?.data?.users;

      // Generate Excel and upload to S3 ---
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');

      worksheet.columns = [
        { header: 'EmpID', key: 'empCode', width: 10 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Brand', key: 'brand', width: 20 },
        { header: 'Email', key: 'email', width: 50 },
        { header: 'Group', key: 'group', width: 15 },
        { header: 'Role', key: 'role', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12, color: { argb: '000000' } };

      users.forEach((user) => {
        worksheet.addRow({
          empCode: user.EmpId ?? '',
          name: user?.name ?? '',
          brand: user?.brand || 'N/A',
          email: user?.email,
          group: user?.group?.name || 'N/A',
          role: user?.role || 'N/A',
          status:
            user?.status?.charAt(0)?.toUpperCase() + user?.status?.slice(1),
        });
      });

      const fileBuffer = await workbook.xlsx.writeBuffer();
      const s3Key = `exports/users-exports.xlsx`;

      const stream = new PassThrough();
      stream.end(fileBuffer);

      await this.awsService.uploadToS3(s3Key, stream, true);
      return {
        message: 'Users exported successfully',
        data: { s3Key },
      };
    } catch (error) {
      logger.error('User exports error:', error);
      logsAndErrorHandling('UserService - exportUsers', error, {
        filterDto,
      });
    }
  }

  /**
   * To fetch project groups
   *
   * @returns list of project groups
   */
  async findProjectGroups() {
    try {
      const groups = await this.groupRepository.find({
        order: { name: 'ASC' },
      });

      return {
        message:
          groups.length > 0 ? 'Groups Fetched Successfully' : 'No Groups Found',
        data: groups || [],
      };
    } catch (error) {
      logger.error('Failed to fetch project groups.', error);
      logsAndErrorHandling('UserService - findProjectGroups', error, null);
    }
  }

  /**
   * To update rm signature
   *
   * @param userObj Login user
   * @param data as request body
   * @returns success message
   */
  async updateUserProfile(
    userObj: any,
    data: { signatureImage: string },
  ): Promise<any> {
    try {
      if (!userObj?.dbId || Number.isNaN(userObj?.dbId)) {
        throw new BadRequestException('Invalid Id. It must be a number.');
      }

      // Fetch the user by ID with active status
      const user = await this.usersRepository.findOne({
        where: { id: userObj?.dbId, status: StatusEnum.ACTIVE },
        select: ['id'],
      });

      if (!user) {
        throw new NotFoundException('User Not Found');
      }

      // Update user details in the repository
      await this.usersRepository.update(
        { id: userObj?.dbId },
        { signatureImage: data?.signatureImage },
      );
      return {
        statusCode: SUCCESS,
        message: 'Signature updated successfully',
        data: { id: userObj?.dbId },
      };
    } catch (error) {
      logger.error('Failed to update user signature.', error);
      logsAndErrorHandling('UserService - updateUserProfile', error, {
        userObj,
        data,
      });
    }
  }

  /**
   * To update user details
   *
   * @param id User ID
   * @param userData Data to update
   * @returns success message
   */
  async updateUserDetails(id: number, userData: UpdateUserDTO): Promise<any> {
    return this.usersRepository.manager.transaction(async (manager) => {
      try {
        if (!id || Number.isNaN(id)) {
          throw new BadRequestException('Invalid Id. It must be a number.');
        }

        const user = await manager.findOne(Users, {
          where: { id, status: StatusEnum.ACTIVE },
        });

        if (!user) {
          throw new NotFoundException('User Not Found');
        }

        const previousStatus = user.employeeStatus
          ? user.employeeStatus.toString().toLowerCase()
          : null;

        await this.updateUserCoreFields(manager, user, userData);

        if (userData.groupId) {
          await this.updateUserGroup(manager, user, userData);
        }

        if (userData.employeeStatus) {
          const normalizedStatus = userData.employeeStatus.trim().toLowerCase();

          if (
            (normalizedStatus === 'resigned' ||
              normalizedStatus === 'notice period') &&
            previousStatus !== normalizedStatus
          ) {
            try {
              await this.notificationService.create({
                notifications: [
                  {
                    title: 'Employee Status Update',
                    message: `Employee "${user.name}" status changed to "${user.employeeStatus}".`,
                    type: 'Employee Status Alert',
                    isForAllFinanceAdmin: true,
                  },
                ],
              });
            } catch (e) {
              logger.error(
                e,
                'Failed to create notification for Employee Status Update',
              );
            }
          }
        }

        return {
          statusCode: SUCCESS,
          message: 'User details updated successfully',
          data: { id },
        };
      } catch (error) {
        logger.error('Failed to update user details.', error);
        logsAndErrorHandling('UserService - updateUserDetails', error, {
          id,
          userData,
        });
      }
    });
  }

  /**
   * Update core fields of the user such as project, role, employee status, and signature image.
   */
  private async updateUserCoreFields(
    manager: EntityManager,
    user: Users,
    userData: UpdateUserDTO,
  ) {
    if (userData.projectId !== undefined) {
      if (userData.projectId === null) {
        user.project = null;
      } else {
        const project = await manager.findOne(Projects, {
          where: { id: userData.projectId },
        });

        if (!project) {
          throw new BadRequestException(
            `Project With Id ${userData.projectId} Not Found`,
          );
        }

        user.project = project;
      }
    }

    if (userData.roleId !== undefined) {
      if (userData.roleId === null) {
        user.role = null;
      } else {
        const role = await manager.findOne(Role, {
          where: { id: userData.roleId },
        });

        if (!role) {
          throw new BadRequestException(
            `Role With Id ${userData.roleId} Not Found`,
          );
        }

        user.role = role;
      }
    }

    if (userData.employeeStatus) {
      const validStatuses: Record<string, EmployeeStatus> = {
        resigned: EmployeeStatus.RESIGNED,
        'notice period': EmployeeStatus.NOTICE_PERIOD,
        available: EmployeeStatus.AVAILABLE,
      };

      const normalizedStatus = userData.employeeStatus.trim().toLowerCase();

      if (!validStatuses[normalizedStatus]) {
        throw new BadRequestException(
          `Invalid employeeStatus. Allowed values: ${Object.values(EmployeeStatus).join(', ')}`,
        );
      }

      user.employeeStatus = validStatuses[normalizedStatus];
    }

    if (userData.signatureImage) {
      user.signatureImage = userData.signatureImage;
    }

    if (userData.regionIds !== undefined) {
      user.regionIds = userData.regionIds;
    }

    if (userData.countryCode !== undefined) {
      user.countryCode = userData.countryCode;
    }

    if (userData.contactNumber !== undefined) {
      user.contactNumber = userData.contactNumber;
    }

    await manager.save(user);
  }

  /**
   * Update user's group assignment with overlap checks and proper handling of open-ended assignments.
   */
  private async updateUserGroup(
    manager: EntityManager,
    user: Users,
    dto: UpdateUserDTO,
  ) {
    const now = new Date();

    if (!dto.groupId || !dto.groupStartDate) {
      throw new BadRequestException('groupId and groupStartDate are required');
    }

    const startDate = fromZonedTime(new Date(dto.groupStartDate), 'UTC');
    const endDate = dto.groupEndDate
      ? fromZonedTime(new Date(dto.groupEndDate), 'UTC')
      : null;

    if (endDate && endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const group = await manager.findOne(Group, {
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new BadRequestException('Invalid group');
    }

    // Idempotency check: same group + same start (+ same end)
    const existingSame = await manager.findOne(UserGroupAssignment, {
      where: {
        user: { id: user.id },
        group: { id: dto.groupId },
        startDate,
      },
    });

    if (existingSame) {
      const sameEnd =
        (!existingSame.endDate && !endDate) ||
        (existingSame.endDate &&
          endDate &&
          existingSame.endDate.getTime() === endDate.getTime());

      if (sameEnd) {
        return;
      }
    }

    // Core timeline mutation
    await this.applyUserGroupAssignment(
      manager,
      user,
      group,
      startDate,
      endDate,
      now,
    );
  }

  /**
   * Core logic to apply a user-group assignment with necessary checks and updates.
   */
  private async applyUserGroupAssignment(
    manager: EntityManager,
    user: Users,
    group: Group,
    startDate: Date,
    endDate: Date | null,
    now: Date,
  ) {
    // 1: Close existing open-ended assignment if it starts before new start
    const openAssignment = await manager
      .createQueryBuilder(UserGroupAssignment, 'uga')
      .where('uga.user_id = :userId', { userId: user.id })
      .andWhere('uga.end_date IS NULL')
      .getOne();

    if (openAssignment && openAssignment.startDate < startDate) {
      openAssignment.endDate = new Date(startDate.getTime() - 1);
      openAssignment.isActive = false;
      await manager.save(openAssignment);

      if (openAssignment.startDate <= now && openAssignment.endDate >= now) {
        user.group = null;
      }
    }

    // 2: Overlap check (authoritative)
    const overlapping = await manager
      .createQueryBuilder(UserGroupAssignment, 'uga')
      .where('uga.user_id = :userId', { userId: user.id })
      .andWhere(
        `
      uga.start_date <= :effectiveEnd
      AND (uga.end_date IS NULL OR uga.end_date >= :startDate)
      `,
        {
          startDate,
          effectiveEnd: endDate ?? startDate,
        },
      )
      .getOne();

    if (overlapping) {
      throw new BadRequestException(
        'User already has a group mapped in this timeline',
      );
    }

    // 3: Insert new assignment
    const assignment = manager.create(UserGroupAssignment, {
      user,
      group,
      startDate,
      endDate,
      isActive: !endDate,
    });

    await manager.save(assignment);
  }

  /**
   * To create a new user
   *
   * @param userData Data to create user
   * @returns success message
   */
  async createUser(userData: CreateUserDto): Promise<any> {
    return this.usersRepository.manager.transaction(async (manager) => {
      try {
        // Check if user already exists
        const existingUser = await manager.findOne(Users, {
          where: { userName: userData.Username },
        });
        if (existingUser) {
          throw new BadRequestException(
            'User with this username already exists',
          );
        }

        // Find brand
        const brand = await manager.findOne(Brands, {
          where: { name: ILike(userData.Company.trim()) },
        });
        if (!brand) {
          throw new BadRequestException(
            `Brand "${userData.Company}" not found`,
          );
        }

        // Find role
        const role = await manager.findOne(Role, {
          where: { name: userData.profileName },
        });
        if (!role) {
          throw new BadRequestException(
            `Role "${userData.profileName}" not found`,
          );
        }

        // Find department
        const department = await manager.findOne(Department, {
          where: { name: userData.departmentName },
        });
        if (!department) {
          throw new BadRequestException(
            `Department "${userData.departmentName}" not found`,
          );
        }

        // Create user
        const newUser = new Users();
        newUser.name = userData.Name;
        newUser.userId = userData.Id;
        newUser.email = userData.Email;
        newUser.userName = userData.Username;
        newUser.empCode = userData.empCode;
        newUser.role = role;
        newUser.department = department;
        newUser.brand = brand;
        newUser.regionIds = userData.regionIds;
        newUser.status = StatusEnum.ACTIVE;
        newUser.createdAt = new Date();

        await manager.save(newUser);

        // If groupId provided, assign group
        if (userData.groupId) {
          if (!userData.groupStartDate) {
            throw new BadRequestException(
              'groupStartDate is required when groupId is provided',
            );
          }
          const group = await manager.findOne(Group, {
            where: { id: userData.groupId },
          });
          if (!group) {
            throw new BadRequestException('Invalid group');
          }
          const startDate = fromZonedTime(
            new Date(userData.groupStartDate),
            'UTC',
          );
          const endDate = userData.groupEndDate
            ? fromZonedTime(new Date(userData.groupEndDate), 'UTC')
            : null;

          if (endDate && endDate < startDate) {
            throw new BadRequestException(
              'End date cannot be before start date',
            );
          }

          const assignment = manager.create(UserGroupAssignment, {
            user: newUser,
            group,
            startDate,
            endDate,
            isActive: !endDate,
          });
          await manager.save(assignment);
        }

        return {
          statusCode: SUCCESS,
          message: 'User created successfully',
          data: { id: newUser.id },
        };
      } catch (error) {
        logger.error('Failed to create user.', error);
        logsAndErrorHandling('UserService - createUser', error, {
          userData,
        });
        throw error;
      }
    });
  }

  /**
   * To get logged in user details
   *
   * @param user Logged in user
   * @returns user details
   */
  async getLoggedInUserDetails(user: any): Promise<any> {
    try {
      const result = await this.usersRepository
        .createQueryBuilder('u')
        .leftJoin('u.role', 'r')
        .leftJoin('u.project', 'p')
        .leftJoin('p.brand', 'b')

        // current group assignment
        .leftJoin(
          'user_group_assignments',
          'uga',
          `
          uga.user_id = u.id
          AND uga.is_deleted = 0
          AND uga.is_active = 1
          AND uga.start_date <= CURRENT_TIMESTAMP
          AND (uga.end_date IS NULL OR uga.end_date >= CURRENT_TIMESTAMP)
        `,
        )
        .leftJoin('groups', 'g', 'g.id = uga.group_id')

        .where('u.username = :username', { username: user?.userId })
        .andWhere('u.deleted_at IS NULL')

        .select([
          'u.id AS userId',
          'u.name AS name',
          'u.email AS email',
          'u.signature_image AS signatureImage',

          'r.name AS role',

          'p.id AS projectId',
          'p.name AS projectName',

          'b.id AS brandId',
          'b.name AS brandName',

          'g.name AS groupName',
        ])
        .getRawOne();

      if (!result) {
        throw new NotFoundException('User not found');
      }

      return {
        message: 'User Data Fetched Successfully',
        data: {
          userId: result.userId,
          name: result.name,
          email: result.email,
          signatureImage: result.signatureImage,
          role: result.role,
          group: result.groupName ?? null,
          project: {
            id: result.projectId,
            name: result.projectName,
          },
          brand: {
            id: result.brandId,
            name: result.brandName,
          },
        },
      };
    } catch (error) {
      logger.error('Error fetching logged-in user details:', error);
      logsAndErrorHandling('UserService - getLoggedInUserDetails', error, {
        user,
      });
    }
  }

  async getRmUsers(search?: string): Promise<{ message: string; data: any }> {
    try {
      const query = this.usersRepository
        .createQueryBuilder('user')
        .leftJoin('user.role', 'role')
        .where('role.name = :rmRole', { rmRole: RolesEnum.RM })
        // .andWhere('user.status = :status', { status: StatusEnum.ACTIVE })
        .select(['user.id', 'user.name', 'user.emp_code'])
        .orderBy('user.name', 'ASC');

      if (search) {
        query.andWhere('user.name LIKE :search', { search: `%${search}%` });
      }

      const rmUsers = await query.getRawMany();

      const data = rmUsers.map((u) => ({
        id: u.user_id,
        name: u.user_name,
        empCode: u.emp_code,
      }));
      return {
        message: 'RM Users Fetched Successfully',
        data,
      };
    } catch (error) {
      logger.error('Error fetching RM users:', error);
      logsAndErrorHandling('UserService - getRmUsers', error, {
        search,
      });
    }
  }

  async extractSignature(file: File): Promise<Buffer> {
    try {
      return await extractInkOnly(file.buffer);
    } catch (error) {
      logger.error('Signature extraction failed', error);
      logsAndErrorHandling('UserService - extractSignature', error, {
        file,
      });
    }
  }

  async getSalesTeamDropdown(role: string, search?: string): Promise<any> {
    try {
      // Only fetch active users for the sales team dropdown
      let whereCondition: any = {
        status: StatusEnum.ACTIVE,
      };

      if (role) {
        const roleNames = role.split(',').map((r) => r.trim());
        whereCondition.role = { name: In(roleNames) };
      }

      // If search is provided, add ILike conditions for name or email
      if (search) {
        whereCondition = [
          { ...whereCondition, name: ILike(`%${search.trim()}%`) },
          { ...whereCondition, email: ILike(`%${search.trim()}%`) },
        ];
      }

      const [users, total] = await this.usersRepository.findAndCount({
        where: whereCondition,
        order: { name: 'ASC' },
        relations: ['role'],
        select: ['id', 'userId', 'name', 'email', 'empCode', 'signatureImage'],
      });

      const transformedUsers = users.map((u) => ({
        ...u,
        userName: u.name,
        name: undefined, //remove key
      }));

      return {
        message: users.length
          ? 'Users fetched successfully.'
          : 'No users found.',
        data: {
          users: transformedUsers,
          total,
        },
      };
    } catch (error) {
      logger.error('Error fetching sales team dropdown:', error);
      logsAndErrorHandling('UserService - getSalesTeamDropdown', error, {
        role,
        search,
      });
    }
  }

  /**
   * To get user group assignments
   *
   * @param userId User ID
   * @returns group assignments
   */
  async getUserGroupAssignments(
    userId: number,
    query: { page?: number; limit?: number; search?: string },
  ): Promise<any> {
    try {
      if (!userId || Number.isNaN(userId)) {
        throw new BadRequestException('Invalid userId');
      }

      const page = Math.max(Number(query.page) || 1, 1);
      const limit = Math.min(Number(query.limit) || DEFAULT_LIMIT, 100);
      const offset = (page - 1) * limit;

      const qb = this.groupAssignRepository
        .createQueryBuilder('uga')
        .innerJoinAndSelect('uga.group', 'g')
        .where('uga.user_id = :userId', { userId });

      if (query.search) {
        qb.andWhere('LOWER(g.name) LIKE LOWER(:search)', {
          search: `%${query.search}%`,
        });
      }

      const [assignments, total] = await qb
        .orderBy('uga.startDate', 'DESC')
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return {
        message: 'User group assignments fetched successfully',
        data: {
          assignments: assignments.map((a) => ({
            groupId: a.group.id,
            groupName: a.group.name,
            startDate: a.startDate,
            endDate: a.endDate,
            isActive: a.isActive,
          })),
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching user group assignments:', error);
      logsAndErrorHandling('UserService - getUserGroupAssignments', error, {
        userId,
        query,
      });
    }
  }

  async validateTLAccess(
    tlUserId: number,
    targetUserId: number,
  ): Promise<Users> {
    if (tlUserId === targetUserId) {
      throw new ForbiddenException('You cannot mark your own unavailability');
    }

    const targetUser = await this.usersRepository.findOne({
      where: { id: targetUserId },
      relations: ['role'],
    });

    if (!targetUser) {
      throw new ForbiddenException('Target user not found or access denied');
    }

    if (targetUser.role?.name !== RolesEnum.CRM) {
      throw new ForbiddenException('Target user must have CRM role');
    }

    if (targetUser.reportingTo !== tlUserId) {
      throw new ForbiddenException(
        'You can only set availability for users in your team',
      );
    }

    return targetUser;
  }
}
