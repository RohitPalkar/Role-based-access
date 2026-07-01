import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { RolesEnum } from 'src/enums/roles.enum';
import { Iom, ProjectUserMapping } from 'src/entities';
import { UserAvailability } from '../entities/user-availability.entity';
import { UserAvailabilityService } from './user-availability.service';
import { UserService } from '../user.service';
import { Users } from '../entities/user.entity';
import { AwsService } from 'src/modules/aws/aws.service';
import { CustomConfigService } from 'src/config/custom-config.service';
import { generateExcelBuffer } from 'src/common/helpers/excel.helper';

jest.mock('src/common/helpers/excel.helper', () => ({
  generateExcelBuffer: jest.fn(),
}));

jest.mock('src/helpers/date.helper', () => ({
  formatDateUtil: jest.fn().mockReturnValue('17Jun_3-30PM'),
}));

describe('UserAvailabilityService', () => {
  let service: UserAvailabilityService;
  let userService: { validateTLAccess: jest.Mock };
  let awsService: { uploadToS3: jest.Mock };
  let configService: { get: jest.Mock };
  let availabilityRepo: {
    createQueryBuilder: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
  };
  let usersRepo: { createQueryBuilder: jest.Mock };
  let iomRepo: { createQueryBuilder: jest.Mock };
  let projectUserMappingRepo: { createQueryBuilder: jest.Mock };
  let availabilityQb: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getOne: jest.Mock;
    getMany: jest.Mock;
  };
  let teamMembersQb: {
    innerJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    setParameter: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    select: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let iomCountQb: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    groupBy: jest.Mock;
    getRawMany: jest.Mock;
  };
  let projectMappingQb: {
    innerJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };

  const tlUser = { dbId: 10 };
  const targetUserId = 20;
  const listQuery = { status: 'ALL' } as any;

  const futureFrom = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const futureTo = () =>
    new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const pastFrom = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const baseDto = () => ({
    userId: targetUserId,
    unavailableFrom: futureFrom(),
    unavailableTo: futureTo(),
    reason: 'Leave',
  });

  const crmTargetUser = {
    id: targetUserId,
    reportingTo: tlUser.dbId,
    role: { name: RolesEnum.CRM },
  } as Users;

  const createAvailabilityQb = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    availabilityQb = createAvailabilityQb();

    teamMembersQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    iomCountQb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    projectMappingQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    availabilityRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(availabilityQb),
      save: jest
        .fn()
        .mockImplementation((record) => Promise.resolve({ id: 1, ...record })),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
    };

    usersRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(teamMembersQb),
    };

    iomRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(iomCountQb),
    };

    projectUserMappingRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(projectMappingQb),
    };

    userService = {
      validateTLAccess: jest.fn().mockResolvedValue(crmTargetUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAvailabilityService,
        { provide: UserService, useValue: userService },
        {
          provide: getRepositoryToken(UserAvailability),
          useValue: availabilityRepo,
        },
        {
          provide: getRepositoryToken(Users),
          useValue: usersRepo,
        },
        {
          provide: getRepositoryToken(Iom),
          useValue: iomRepo,
        },
        {
          provide: getRepositoryToken(ProjectUserMapping),
          useValue: projectUserMappingRepo,
        },
        {
          provide: AwsService,
          useValue: { uploadToS3: jest.fn() },
        },
        {
          provide: CustomConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UserAvailabilityService);
    awsService = module.get(AwsService);
    configService = module.get(CustomConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  it('saves unavailability for a direct-report CRM user with markedBy', async () => {
    const dto = baseDto();

    const result = await service.markUnavailable(tlUser, dto);

    expect(userService.validateTLAccess).toHaveBeenCalledWith(
      tlUser.dbId,
      targetUserId,
    );
    expect(availabilityRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: targetUserId,
        markedBy: tlUser.dbId,
        reason: 'Leave',
      }),
    );
    expect(result.markedBy).toBe(tlUser.dbId);
  });

  it('throws ForbiddenException when TL targets self', async () => {
    userService.validateTLAccess.mockRejectedValueOnce(
      new ForbiddenException('You cannot mark your own unavailability'),
    );

    await expect(
      service.markUnavailable(tlUser, { ...baseDto(), userId: tlUser.dbId }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when target user is not found', async () => {
    userService.validateTLAccess.mockRejectedValueOnce(
      new ForbiddenException('Target user not found or access denied'),
    );

    await expect(service.markUnavailable(tlUser, baseDto())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when target user is not CRM', async () => {
    userService.validateTLAccess.mockRejectedValueOnce(
      new ForbiddenException('Target user must have CRM role'),
    );

    await expect(service.markUnavailable(tlUser, baseDto())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when reportingTo does not match TL', async () => {
    userService.validateTLAccess.mockRejectedValueOnce(
      new ForbiddenException(
        'You can only set availability for users in your team',
      ),
    );

    await expect(service.markUnavailable(tlUser, baseDto())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws BadRequestException when unavailableFrom is in the past', async () => {
    await expect(
      service.markUnavailable(tlUser, {
        ...baseDto(),
        unavailableFrom: pastFrom(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for invalid date strings', async () => {
    await expect(
      service.markUnavailable(tlUser, {
        ...baseDto(),
        unavailableFrom: 'not-a-date',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when unavailableTo <= unavailableFrom', async () => {
    const from = futureFrom();

    await expect(
      service.markUnavailable(tlUser, {
        ...baseDto(),
        unavailableFrom: from,
        unavailableTo: from,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when an overlapping window exists', async () => {
    availabilityQb.getOne.mockResolvedValueOnce({ id: 99 });

    await expect(service.markUnavailable(tlUser, baseDto())).rejects.toThrow(
      ConflictException,
    );

    expect(availabilityQb.andWhere).toHaveBeenCalledWith(
      'ua.cancelled_at IS NULL AND ua.is_deleted = 0',
    );
  });

  it('allows adjacent non-overlapping windows', async () => {
    const firstEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const secondStart = firstEnd.toISOString();
    const secondEnd = new Date(
      firstEnd.getTime() + 60 * 60 * 1000,
    ).toISOString();

    await service.markUnavailable(tlUser, {
      userId: targetUserId,
      unavailableFrom: futureFrom(),
      unavailableTo: firstEnd.toISOString(),
    });

    await service.markUnavailable(tlUser, {
      userId: targetUserId,
      unavailableFrom: secondStart,
      unavailableTo: secondEnd,
    });

    expect(availabilityRepo.save).toHaveBeenCalledTimes(2);
  });

  describe('markAvailable', () => {
    it('ends the active window by setting unavailableTo to now', async () => {
      const activeWindow = {
        id: 5,
        userId: targetUserId,
        unavailableFrom: new Date(Date.now() - 60 * 60 * 1000),
        unavailableTo: new Date(Date.now() + 60 * 60 * 1000),
      };

      availabilityQb.getOne.mockResolvedValueOnce(activeWindow);
      availabilityRepo.findOne.mockResolvedValueOnce({
        ...activeWindow,
        unavailableTo: new Date(),
      });

      const result = await service.markAvailable(tlUser, {
        userId: targetUserId,
      });

      expect(userService.validateTLAccess).toHaveBeenCalledWith(
        tlUser.dbId,
        targetUserId,
      );
      expect(availabilityRepo.update).toHaveBeenCalledWith(
        activeWindow.id,
        expect.objectContaining({
          unavailableTo: expect.any(Date),
          isDeleted: 1,
        }),
      );
      expect(availabilityRepo.update).toHaveBeenCalledWith(
        activeWindow.id,
        expect.not.objectContaining({
          cancelledAt: expect.anything(),
          cancelledBy: expect.anything(),
          unavailableFrom: expect.anything(),
        }),
      );
      expect(result.id).toBe(activeWindow.id);
    });

    it('throws BadRequestException when user is already available', async () => {
      availabilityQb.getOne.mockResolvedValueOnce(null);

      await expect(
        service.markAvailable(tlUser, { userId: targetUserId }),
      ).rejects.toThrow(new BadRequestException('User is already available'));

      expect(availabilityRepo.update).not.toHaveBeenCalled();
    });

    it('soft-cancels an upcoming window without modifying window dates', async () => {
      const upcomingWindow = {
        id: 7,
        userId: targetUserId,
        unavailableFrom: new Date(Date.now() + 60 * 60 * 1000),
        unavailableTo: new Date(Date.now() + 2 * 60 * 60 * 1000),
      };
      const softCancelledWindow = {
        ...upcomingWindow,
        cancelledAt: new Date(),
        cancelledBy: tlUser.dbId,
      };

      availabilityQb.getOne.mockResolvedValueOnce(upcomingWindow);
      availabilityRepo.findOne.mockResolvedValueOnce(softCancelledWindow);

      const before = Date.now();
      const result = await service.markAvailable(tlUser, {
        userId: targetUserId,
      });
      const after = Date.now();

      expect(availabilityRepo.update).toHaveBeenCalledWith(
        upcomingWindow.id,
        expect.objectContaining({
          cancelledAt: expect.any(Date),
          cancelledBy: tlUser.dbId,
          isDeleted: 1,
        }),
      );
      const updatePayload = availabilityRepo.update.mock.calls[0][1];
      expect(updatePayload.cancelledAt.getTime()).toBeGreaterThanOrEqual(
        before,
      );
      expect(updatePayload.cancelledAt.getTime()).toBeLessThanOrEqual(after);
      expect(updatePayload).not.toHaveProperty('unavailableFrom');
      expect(updatePayload).not.toHaveProperty('unavailableTo');
      expect(availabilityRepo.save).not.toHaveBeenCalled();
      expect(result.id).toBe(upcomingWindow.id);
      expect(result.unavailableFrom).toEqual(upcomingWindow.unavailableFrom);
      expect(result.unavailableTo).toEqual(upcomingWindow.unavailableTo);
    });

    it('ends an active window without modifying unavailableFrom', async () => {
      const activeWindow = {
        id: 8,
        userId: targetUserId,
        unavailableFrom: new Date(Date.now() - 60 * 60 * 1000),
        unavailableTo: new Date(Date.now() + 60 * 60 * 1000),
      };

      availabilityQb.getOne.mockResolvedValueOnce(activeWindow);
      availabilityRepo.findOne.mockResolvedValueOnce({
        ...activeWindow,
        unavailableTo: new Date(),
      });

      await service.markAvailable(tlUser, { userId: targetUserId });

      expect(availabilityRepo.update).toHaveBeenCalledWith(
        activeWindow.id,
        expect.objectContaining({
          unavailableTo: expect.any(Date),
          isDeleted: 1,
        }),
      );
      expect(availabilityRepo.update).toHaveBeenCalledWith(
        activeWindow.id,
        expect.not.objectContaining({
          unavailableFrom: expect.anything(),
        }),
      );
    });

    it('soft-cancels only the earliest upcoming window when multiple exist', async () => {
      const earliestUpcoming = {
        id: 9,
        userId: targetUserId,
        unavailableFrom: new Date(Date.now() + 30 * 60 * 1000),
        unavailableTo: new Date(Date.now() + 90 * 60 * 1000),
      };

      availabilityQb.getOne.mockResolvedValueOnce(earliestUpcoming);
      availabilityRepo.findOne.mockResolvedValueOnce({
        ...earliestUpcoming,
        cancelledAt: new Date(),
        cancelledBy: tlUser.dbId,
      });

      await service.markAvailable(tlUser, { userId: targetUserId });

      expect(availabilityRepo.update).toHaveBeenCalledTimes(1);
      expect(availabilityRepo.update).toHaveBeenCalledWith(
        earliestUpcoming.id,
        expect.objectContaining({
          cancelledAt: expect.any(Date),
          cancelledBy: tlUser.dbId,
          isDeleted: 1,
        }),
      );
    });

    it('does not delete rows when soft-cancelling an upcoming window', async () => {
      const upcomingWindow = {
        id: 10,
        userId: targetUserId,
        unavailableFrom: new Date(Date.now() + 60 * 60 * 1000),
        unavailableTo: new Date(Date.now() + 2 * 60 * 60 * 1000),
      };

      availabilityQb.getOne.mockResolvedValueOnce(upcomingWindow);
      availabilityRepo.findOne.mockResolvedValueOnce({
        ...upcomingWindow,
        cancelledAt: new Date(),
        cancelledBy: tlUser.dbId,
      });

      await service.markAvailable(tlUser, { userId: targetUserId });

      expect(availabilityRepo.update).toHaveBeenCalledTimes(1);
      expect(availabilityRepo.findOne).toHaveBeenCalledTimes(1);
      expect(availabilityRepo.save).not.toHaveBeenCalled();
    });

    it('filters cancelled windows via resolver', async () => {
      availabilityQb.getOne.mockResolvedValueOnce(null);

      await expect(
        service.markAvailable(tlUser, { userId: targetUserId }),
      ).rejects.toThrow(new BadRequestException('User is already available'));

      expect(availabilityQb.andWhere).toHaveBeenCalledWith(
        'ua.cancelled_at IS NULL AND ua.is_deleted = 0',
      );
      expect(availabilityRepo.update).not.toHaveBeenCalled();
    });

    it('throws when only past windows exist', async () => {
      availabilityQb.getOne.mockResolvedValueOnce(null);

      await expect(
        service.markAvailable(tlUser, { userId: targetUserId }),
      ).rejects.toThrow(new BadRequestException('User is already available'));

      expect(availabilityRepo.update).not.toHaveBeenCalled();
    });

    it('ends active window when both active and upcoming windows exist', async () => {
      const activeWindow = {
        id: 11,
        userId: targetUserId,
        unavailableFrom: new Date(Date.now() - 60 * 60 * 1000),
        unavailableTo: new Date(Date.now() + 60 * 60 * 1000),
      };

      availabilityQb.getOne.mockResolvedValueOnce(activeWindow);
      availabilityRepo.findOne.mockResolvedValueOnce({
        ...activeWindow,
        unavailableTo: new Date(),
      });

      await service.markAvailable(tlUser, { userId: targetUserId });

      expect(availabilityRepo.update).toHaveBeenCalledWith(
        activeWindow.id,
        expect.objectContaining({
          unavailableTo: expect.any(Date),
          isDeleted: 1,
        }),
      );
      expect(availabilityRepo.update).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          cancelledAt: expect.anything(),
        }),
      );
    });

    it('throws ForbiddenException when TL access is denied', async () => {
      userService.validateTLAccess.mockRejectedValueOnce(
        new ForbiddenException(
          'You can only set availability for users in your team',
        ),
      );

      await expect(
        service.markAvailable(tlUser, { userId: targetUserId }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTeamAvailability', () => {
    const teamMember = {
      id: 101,
      name: 'Amit Sharma',
      email: 'amit@company.com',
      empCode: 'CRM1021',
    };

    it('returns an empty paginated result when the TL has no direct-report CRM users', async () => {
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[], 0]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(result).toEqual({
        items: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
      expect(availabilityRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns team members with AVAILABLE status when no active window exists', async () => {
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        userId: 101,
        empId: 'CRM1021',
        name: 'Amit Sharma',
        email: 'amit@company.com',
        role: RolesEnum.CRM,
        currentStatus: 'AVAILABLE',
        statusLabel: 'Available',
        projects: [],
        allocatedIomsCount: 0,
      });
      expect(result.items[0]).not.toHaveProperty('unavailableFrom');
      expect(result.items[0]).not.toHaveProperty('unavailableTo');
    });

    it('returns UNAVAILABLE status with window fields for active users', async () => {
      const unavailableFrom = new Date(Date.now() - 60 * 60 * 1000);
      const unavailableTo = new Date(Date.now() + 60 * 60 * 1000);

      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([
        {
          userId: 101,
          unavailableFrom,
          unavailableTo,
        },
      ]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(availabilityQb.andWhere).toHaveBeenCalledWith(
        'ua.cancelled_at IS NULL AND ua.is_deleted = 0',
      );
      expect(availabilityQb.andWhere).toHaveBeenCalledWith(
        'ua.unavailable_to >= :now',
        expect.objectContaining({ now: expect.any(Date) }),
      );
      expect(result.items[0].currentStatus).toBe('UNAVAILABLE');
      expect(result.items[0].unavailableFrom).toBe(
        unavailableFrom.toISOString(),
      );
      expect(result.items[0].unavailableTo).toBe(unavailableTo.toISOString());
    });

    it('returns UNAVAILABLE status with window fields for upcoming-only users', async () => {
      const unavailableFrom = new Date(Date.now() + 60 * 60 * 1000);
      const unavailableTo = new Date(Date.now() + 2 * 60 * 60 * 1000);

      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([
        {
          userId: 101,
          unavailableFrom,
          unavailableTo,
        },
      ]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(result.items[0].currentStatus).toBe('UNAVAILABLE');
      expect(result.items[0].unavailableFrom).toBe(
        unavailableFrom.toISOString(),
      );
      expect(result.items[0].unavailableTo).toBe(unavailableTo.toISOString());
    });

    it('includes allocated IOM counts and mapped projects', async () => {
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([]);
      iomCountQb.getRawMany.mockResolvedValueOnce([
        { userId: 101, count: '12' },
      ]);
      projectMappingQb.getMany.mockResolvedValueOnce([
        {
          user: { id: 101 },
          project: { id: 58, name: 'Project Alpha' },
        },
      ]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(result.items[0].allocatedIomsCount).toBe(12);
      expect(result.items[0].projects).toEqual([
        { id: 58, name: 'Project Alpha' },
      ]);
    });

    it('uses the latest active window when multiple running windows overlap', async () => {
      const earlierFrom = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const laterFrom = new Date(Date.now() - 60 * 60 * 1000);
      const unavailableTo = new Date(Date.now() + 60 * 60 * 1000);

      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([
        {
          userId: 101,
          unavailableFrom: laterFrom,
          unavailableTo,
        },
        {
          userId: 101,
          unavailableFrom: earlierFrom,
          unavailableTo,
        },
      ]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(result.items[0].unavailableFrom).toBe(laterFrom.toISOString());
    });

    it('prefers a running window over an upcoming window', async () => {
      const runningFrom = new Date(Date.now() - 60 * 60 * 1000);
      const runningTo = new Date(Date.now() + 60 * 60 * 1000);
      const upcomingFrom = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const upcomingTo = new Date(Date.now() + 3 * 60 * 60 * 1000);

      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([
        {
          userId: 101,
          unavailableFrom: upcomingFrom,
          unavailableTo: upcomingTo,
        },
        {
          userId: 101,
          unavailableFrom: runningFrom,
          unavailableTo: runningTo,
        },
      ]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(result.items[0].unavailableFrom).toBe(runningFrom.toISOString());
      expect(result.items[0].unavailableTo).toBe(runningTo.toISOString());
    });

    it('uses the nearest upcoming window when multiple upcoming windows exist', async () => {
      const nearerFrom = new Date(Date.now() + 60 * 60 * 1000);
      const nearerTo = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const laterFrom = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const laterTo = new Date(Date.now() + 4 * 60 * 60 * 1000);

      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([
        {
          userId: 101,
          unavailableFrom: laterFrom,
          unavailableTo: laterTo,
        },
        {
          userId: 101,
          unavailableFrom: nearerFrom,
          unavailableTo: nearerTo,
        },
      ]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(result.items[0].unavailableFrom).toBe(nearerFrom.toISOString());
      expect(result.items[0].unavailableTo).toBe(nearerTo.toISOString());
    });

    it('skips pagination when skipPagination is true', async () => {
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([]);

      const result = await service.getTeamAvailability(tlUser, listQuery, {
        skipPagination: true,
      });

      expect(teamMembersQb.skip).not.toHaveBeenCalled();
      expect(teamMembersQb.take).not.toHaveBeenCalled();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies status filter with is_deleted exclusion in SQL subquery', async () => {
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[], 0]);

      await service.getTeamAvailability(tlUser, {
        status: 'UNAVAILABLE',
      } as any);

      expect(teamMembersQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ua.is_deleted = 0'),
      );
      expect(teamMembersQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ua.unavailable_to >= :now'),
      );
      expect(teamMembersQb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('ua.unavailable_from <= :now'),
      );
    });

    it('excludes upcoming-only users from AVAILABLE status filter', async () => {
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[], 0]);

      await service.getTeamAvailability(tlUser, {
        status: 'AVAILABLE',
      } as any);

      expect(teamMembersQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('NOT EXISTS'),
      );
      expect(teamMembersQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ua.unavailable_to >= :now'),
      );
      expect(teamMembersQb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('ua.unavailable_from <= :now'),
      );
    });

    it('does not treat soft-deleted rows as active windows', async () => {
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([]);

      const result = await service.getTeamAvailability(tlUser, listQuery);

      expect(availabilityQb.andWhere).toHaveBeenCalledWith(
        'ua.cancelled_at IS NULL AND ua.is_deleted = 0',
      );
      expect(result.items[0].currentStatus).toBe('AVAILABLE');
    });
  });

  describe('exportTeamAvailability', () => {
    const teamMember = {
      id: 101,
      name: 'Amit Sharma',
      email: 'amit@company.com',
      empCode: 'CRM1021',
    };

    beforeEach(() => {
      (generateExcelBuffer as jest.Mock).mockResolvedValue(
        Buffer.from('excel'),
      );
      awsService.uploadToS3.mockResolvedValue(undefined);
      configService.get.mockReturnValue('https://cdn.example.com/puravankara/');
    });

    it('exports all filtered rows and returns the S3 URL', async () => {
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([]);
      projectMappingQb.getMany.mockResolvedValueOnce([
        {
          user: { id: 101 },
          project: { id: 58, name: 'Project Alpha' },
        },
        {
          user: { id: 101 },
          project: { id: 59, name: 'Project Beta' },
        },
      ]);

      const result = await service.exportTeamAvailability(tlUser, listQuery);

      expect(teamMembersQb.skip).not.toHaveBeenCalled();
      expect(teamMembersQb.take).not.toHaveBeenCalled();
      expect(generateExcelBuffer).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ header: 'Employee ID', key: 'employeeId' }),
        ]),
        [
          expect.objectContaining({
            employeeId: 'CRM1021',
            employeeName: 'Amit Sharma',
            email: 'amit@company.com',
            project: 'Project Alpha, Project Beta',
            iomAllotted: 0,
            statusLabel: 'Available',
            fromDateTime: '',
            toDateTime: '',
          }),
        ],
        'Team Availability',
      );
      expect(awsService.uploadToS3).toHaveBeenCalledWith(
        'exports/team-availability-17Jun_3-30PM.xlsx',
        expect.anything(),
        true,
      );
      expect(result).toEqual({
        message: 'Team availability exported successfully',
        data: {
          url: 'exports/team-availability-17Jun_3-30PM.xlsx',
          basePath: 'https://cdn.example.com/puravankara/',
        },
      });
    });

    it('maps unavailable date fields for UNAVAILABLE users', async () => {
      const unavailableFrom = new Date(Date.now() - 60 * 60 * 1000);
      const unavailableTo = new Date(Date.now() + 60 * 60 * 1000);

      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([
        {
          userId: 101,
          unavailableFrom,
          unavailableTo,
        },
      ]);

      await service.exportTeamAvailability(tlUser, listQuery);

      expect(generateExcelBuffer).toHaveBeenCalledWith(
        expect.any(Array),
        [
          expect.objectContaining({
            fromDateTime: unavailableFrom.toISOString(),
            toDateTime: unavailableTo.toISOString(),
          }),
        ],
        'Team Availability',
      );
    });

    it('maps upcoming window date fields in export rows', async () => {
      const unavailableFrom = new Date(Date.now() + 60 * 60 * 1000);
      const unavailableTo = new Date(Date.now() + 2 * 60 * 60 * 1000);

      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([
        {
          userId: 101,
          unavailableFrom,
          unavailableTo,
        },
      ]);

      await service.exportTeamAvailability(tlUser, listQuery);

      expect(generateExcelBuffer).toHaveBeenCalledWith(
        expect.any(Array),
        [
          expect.objectContaining({
            statusLabel: 'Unavailable',
            fromDateTime: unavailableFrom.toISOString(),
            toDateTime: unavailableTo.toISOString(),
          }),
        ],
        'Team Availability',
      );
    });

    it('throws InternalServerErrorException when export fails', async () => {
      (generateExcelBuffer as jest.Mock).mockRejectedValueOnce(
        new Error('excel failed'),
      );
      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([]);

      await expect(
        service.exportTeamAvailability(tlUser, listQuery),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('uses the same filtered listing query without pagination', async () => {
      const filteredQuery = {
        status: 'UNAVAILABLE',
        search: 'amit',
        project: [58],
      } as any;

      teamMembersQb.getManyAndCount.mockResolvedValueOnce([[teamMember], 1]);
      availabilityQb.getMany.mockResolvedValueOnce([]);

      await service.exportTeamAvailability(tlUser, filteredQuery);

      expect(teamMembersQb.skip).not.toHaveBeenCalled();
      expect(teamMembersQb.take).not.toHaveBeenCalled();
      expect(teamMembersQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ua.is_deleted = 0'),
      );
      expect(teamMembersQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('upm.project_id in'),
        { projectId: [58] },
      );
      expect(teamMembersQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('u.name LIKE :like'),
        { like: '%amit%' },
      );
    });
  });
});
