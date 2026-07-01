import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/config/constants';
import { UserAvailability } from '../entities/user-availability.entity';
import { MarkUnavailableDto } from '../dto/mark-unavailable.dto';
import { MarkAvailableDto } from '../dto/mark-available.dto';
import {
  AvailabilityStatus,
  TeamMemberAvailabilityDto,
  TeamProjectDto,
} from '../dto/team-availability.dto';
import { ListTeamAvailabilityDto } from '../dto/list-team-availability.dto';
import { UserService } from '../user.service';
import { Users } from '../entities/user.entity';
import { Iom, ProjectUserMapping } from 'src/entities';
import { RolesEnum } from 'src/enums/roles.enum';
import { toTitleCase } from 'src/helpers';
import { formatDateUtil } from 'src/helpers/date.helper';
import { generateExcelBuffer } from 'src/common/helpers/excel.helper';
import { AwsService } from 'src/modules/aws/aws.service';
import { CustomConfigService } from 'src/config/custom-config.service';
import { logger } from 'src/logger/logger';
import { PassThrough } from 'stream';
import { TEAM_AVAILABILITY_EXPORT_COLUMNS } from '../constants';

@Injectable()
export class UserAvailabilityService {
  private static readonly ACTIVE_AVAILABILITY_SQL =
    'ua.cancelled_at IS NULL AND ua.is_deleted = 0';

  constructor(
    @InjectRepository(UserAvailability)
    private readonly availabilityRepo: Repository<UserAvailability>,
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepo: Repository<ProjectUserMapping>,
    private readonly userService: UserService,
    private readonly awsService: AwsService,
    private readonly configService: CustomConfigService,
  ) {}

  async markUnavailable(
    loggedInUser: { dbId: number },
    dto: MarkUnavailableDto,
  ): Promise<UserAvailability> {
    await this.userService.validateTLAccess(loggedInUser.dbId, dto.userId);

    const unavailableFrom = new Date(dto.unavailableFrom);
    const unavailableTo = new Date(dto.unavailableTo);

    if (
      Number.isNaN(unavailableFrom.getTime()) ||
      Number.isNaN(unavailableTo.getTime())
    ) {
      throw new BadRequestException('Invalid date format');
    }

    const now = new Date();

    if (unavailableFrom < now) {
      throw new BadRequestException(
        'Unavailability start time must be in the future or current time',
      );
    }

    if (unavailableTo <= unavailableFrom) {
      throw new BadRequestException(
        'Unavailability end time must be after start time',
      );
    }

    const overlapping = await this.availabilityRepo
      .createQueryBuilder('ua')
      .where('ua.userId = :userId', { userId: dto.userId })
      .andWhere(UserAvailabilityService.ACTIVE_AVAILABILITY_SQL)
      .andWhere('ua.unavailableFrom < :to', { to: unavailableTo })
      .andWhere('ua.unavailableTo > :from', { from: unavailableFrom })
      .getOne();

    if (overlapping) {
      throw new ConflictException(
        'An overlapping unavailability window already exists for this user',
      );
    }

    return this.availabilityRepo.save({
      userId: dto.userId,
      unavailableFrom,
      unavailableTo,
      markedBy: loggedInUser.dbId,
      reason: dto.reason ?? null,
    });
  }

  async markAvailable(
    loggedInUser: { dbId: number },
    dto: MarkAvailableDto,
  ): Promise<UserAvailability> {
    await this.userService.validateTLAccess(loggedInUser.dbId, dto.userId);

    const now = new Date();
    const window = await this.resolveRelevantWindow(dto.userId, now);

    if (!window) {
      throw new BadRequestException('User is already available');
    }

    if (window.unavailableFrom <= now) {
      // Active window: end early — preserve unavailable_from and cancel fields
      await this.availabilityRepo.update(window.id, {
        unavailableTo: now,
        isDeleted: 1,
      });
    } else {
      // Upcoming window: soft-cancel — preserve original window dates
      await this.availabilityRepo.update(window.id, {
        cancelledAt: now,
        cancelledBy: loggedInUser.dbId,
        isDeleted: 1,
      });
    }

    return this.availabilityRepo.findOne({ where: { id: window.id } });
  }

  async getTeamAvailability(
    loggedInUser: { dbId: number },
    query: ListTeamAvailabilityDto,
    options?: { skipPagination?: boolean },
  ): Promise<{
    items: TeamMemberAvailabilityDto[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const qb = this.usersRepo
      .createQueryBuilder('u')
      .innerJoin('u.role', 'role')
      .where('u.reporting_to = :tlId', { tlId: loggedInUser.dbId })
      .andWhere('role.name = :crmRole', { crmRole: RolesEnum.CRM });

    const now = new Date();

    /* 🔎 STATUS FILTER */
    if (query?.status?.toUpperCase() === 'UNAVAILABLE') {
      qb.andWhere(`
        EXISTS (
          SELECT 1 FROM user_availability ua
          WHERE ua.user_id = u.id
            AND ua.cancelled_at IS NULL
            AND ua.is_deleted = 0
            AND ua.unavailable_to >= :now
        )
      `);
    }

    if (query?.status?.toUpperCase() === 'AVAILABLE') {
      qb.andWhere(`
        NOT EXISTS (
          SELECT 1 FROM user_availability ua
          WHERE ua.user_id = u.id
            AND ua.cancelled_at IS NULL
            AND ua.is_deleted = 0
            AND ua.unavailable_to >= :now
        )
      `);
    }

    /* 🔎 PROJECT FILTER */
    if (query.project?.length) {
      qb.andWhere(
        `
        EXISTS (
          SELECT 1 FROM project_user_mapping upm
          WHERE upm.user_id = u.id
            AND upm.project_id in( :...projectId)
        )
      `,
        { projectId: query.project },
      );
    }

    qb.setParameter('now', now);

    /* SEARCH FILTER */
    if (query.search) {
      const like = `%${query.search}%`;
      qb.andWhere(
        `(u.name LIKE :like 
          OR u.email LIKE :like 
          OR u.empCode LIKE :like)`,
        { like },
      );
    }

    /* PAGINATION */
    if (!options?.skipPagination) {
      qb.skip(skip).take(limit);
    }

    qb.select(['u.id', 'u.name', 'u.email', 'u.empCode']);

    const [teamMembers, total] = await qb.getManyAndCount();

    const responsePage = options?.skipPagination ? 1 : page;
    const responseLimit = options?.skipPagination ? total : limit;
    const responseTotalPages = options?.skipPagination
      ? total > 0
        ? 1
        : 0
      : Math.ceil(total / limit);

    if (teamMembers.length === 0) {
      return {
        items: [],
        page: responsePage,
        limit: responseLimit,
        total,
        totalPages: 0,
      };
    }

    const userIds = teamMembers.map((member) => member.id);

    const [activeWindows, projectMappings, iomCounts] = await Promise.all([
      this.loadActiveWindowsForUsers(userIds, now),
      this.loadProjectsForUsers(userIds),
      this.loadAllocatedIomCounts(userIds),
    ]);

    const items = teamMembers.map((member) => {
      const activeWindow = activeWindows.get(member.id);
      const isUnavailable = activeWindow != null;
      const currentStatusValue: AvailabilityStatus = isUnavailable
        ? 'UNAVAILABLE'
        : 'AVAILABLE';
      const result: TeamMemberAvailabilityDto = {
        userId: member.id,
        empId: member.empCode ?? null,
        name: member.name,
        email: member.email,
        role: RolesEnum.CRM,
        currentStatus: currentStatusValue,
        statusLabel: toTitleCase(currentStatusValue),
        projects: projectMappings.get(member.id) ?? [],
        allocatedIomsCount: iomCounts.get(member.id) ?? 0,
      };

      if (isUnavailable) {
        result.unavailableFrom = activeWindow.unavailableFrom.toISOString();
        result.unavailableTo = activeWindow.unavailableTo.toISOString();
      }

      return result;
    });

    return {
      items,
      page: responsePage,
      limit: responseLimit,
      total,
      totalPages: responseTotalPages,
    };
  }

  async exportTeamAvailability(
    loggedInUser: { dbId: number },
    query: ListTeamAvailabilityDto,
  ): Promise<{ message: string; data: { url: string; basePath: string } }> {
    try {
      const { items } = await this.getTeamAvailability(loggedInUser, query, {
        skipPagination: true,
      });

      const rows = items.map((item) => ({
        employeeId: item.empId ?? '',
        employeeName: item.name ?? '',
        email: item.email ?? '',
        project: (item.projects ?? [])
          .map((project) => project.name)
          .join(', '),
        iomAllotted: item.allocatedIomsCount ?? 0,
        statusLabel: item.statusLabel ?? '',
        fromDateTime:
          item.currentStatus === 'AVAILABLE'
            ? ''
            : (item.unavailableFrom ?? ''),
        toDateTime:
          item.currentStatus === 'AVAILABLE' ? '' : (item.unavailableTo ?? ''),
      }));

      const buffer = await generateExcelBuffer(
        TEAM_AVAILABILITY_EXPORT_COLUMNS,
        rows,
        'Team Availability',
      );

      const timestamp = formatDateUtil(undefined, 'timestamp');
      const fileName = `exports/team-availability-${timestamp}.xlsx`;

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(fileName, stream, true);
      const baseUrl = this.configService.get<string>('AWS_S3_ACCESS_URL');
      return {
        message: 'Team availability exported successfully',
        data: { url: fileName, basePath: baseUrl },
      };
    } catch (error) {
      logger.error('Team availability export failed:', error);
      throw new InternalServerErrorException(
        'Failed to export team availability',
      );
    }
  }

  private async resolveRelevantWindow(
    userId: number,
    now: Date,
  ): Promise<UserAvailability | null> {
    return this.availabilityRepo
      .createQueryBuilder('ua')
      .where('ua.user_id = :userId', { userId })
      .andWhere(UserAvailabilityService.ACTIVE_AVAILABILITY_SQL)
      .andWhere('ua.unavailable_to >= :now', { now })
      .orderBy('ua.unavailable_from', 'ASC')
      .getOne();
  }

  private async loadActiveWindowsForUsers(
    userIds: number[],
    now: Date,
  ): Promise<Map<number, UserAvailability>> {
    const rows = await this.availabilityRepo
      .createQueryBuilder('ua')
      .where('ua.user_id IN (:...userIds)', { userIds })
      .andWhere(UserAvailabilityService.ACTIVE_AVAILABILITY_SQL)
      .andWhere('ua.unavailable_to >= :now', { now })
      .orderBy('ua.unavailable_from', 'ASC')
      .getMany();

    const windowsByUser = new Map<number, UserAvailability[]>();
    for (const window of rows) {
      const existing = windowsByUser.get(window.userId) ?? [];
      existing.push(window);
      windowsByUser.set(window.userId, existing);
    }

    const activeByUser = new Map<number, UserAvailability>();
    for (const [userId, windows] of windowsByUser) {
      const resolved = this.resolveListingWindow(windows, now);
      if (resolved) {
        activeByUser.set(userId, resolved);
      }
    }

    return activeByUser;
  }

  private resolveListingWindow(
    windows: UserAvailability[],
    now: Date,
  ): UserAvailability | null {
    const running = windows.filter(
      (window) => window.unavailableFrom <= now && window.unavailableTo >= now,
    );
    if (running.length > 0) {
      return running.reduce((latest, window) =>
        window.unavailableFrom > latest.unavailableFrom ? window : latest,
      );
    }

    const upcoming = windows.filter((window) => window.unavailableFrom > now);
    if (upcoming.length > 0) {
      return upcoming.reduce((nearest, window) =>
        window.unavailableFrom < nearest.unavailableFrom ? window : nearest,
      );
    }

    return null;
  }

  private async loadProjectsForUsers(
    userIds: number[],
  ): Promise<Map<number, TeamProjectDto[]>> {
    const mappings = await this.projectUserMappingRepo
      .createQueryBuilder('pum')
      .innerJoinAndSelect('pum.project', 'project')
      .innerJoinAndSelect('pum.user', 'user')
      .where('user.id IN (:...userIds)', { userIds })
      .andWhere('pum.removed_at IS NULL')
      .getMany();

    const projectsByUser = new Map<number, TeamProjectDto[]>();
    for (const mapping of mappings) {
      const userId = mapping.user?.id;
      const project = mapping.project;
      if (userId == null || project?.id == null) {
        continue;
      }

      const existing = projectsByUser.get(userId) ?? [];
      if (!existing.some((entry) => entry.id === project.id)) {
        existing.push({ id: project.id, name: project.name });
        projectsByUser.set(userId, existing);
      }
    }

    return projectsByUser;
  }

  private async loadAllocatedIomCounts(
    userIds: number[],
  ): Promise<Map<number, number>> {
    const rows = await this.iomRepo
      .createQueryBuilder('iom')
      .select('iom.assigned_to', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('iom.assigned_to IN (:...userIds)', { userIds })
      .andWhere('iom.deleted_at IS NULL')
      .groupBy('iom.assigned_to')
      .getRawMany<{ userId: number; count: string }>();

    const counts = new Map<number, number>();
    for (const row of rows) {
      counts.set(Number(row.userId), Number(row.count));
    }

    return counts;
  }
}
