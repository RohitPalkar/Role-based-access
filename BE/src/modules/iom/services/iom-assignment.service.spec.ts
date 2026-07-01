import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Users } from 'src/entities';
import { RolesEnum } from 'src/enums/roles.enum';
import { StatusEnum } from 'src/enums/status.enum';

import { Iom } from '../entities/iom.entity';
import { UserAvailability } from 'src/modules/users/entities/user-availability.entity';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import {
  IomAssignmentService,
  pickNextAvailableUser,
} from './iom-assignment.service';
import { WorkflowValidationService } from './workflow-validation.service';

describe('pickNextAvailableUser', () => {
  const allAvailable = new Set([1, 2, 3]);

  it('returns first available user when lastUserId is null', () => {
    expect(pickNextAvailableUser([1, 2, 3], allAvailable, null)).toBe(1);
  });

  it('returns next user after lastUserId in round-robin order', () => {
    expect(pickNextAvailableUser([1, 2, 3], allAvailable, 2)).toBe(3);
  });

  it('wraps to first available user after the last CRM user', () => {
    expect(pickNextAvailableUser([1, 2, 3], allAvailable, 3)).toBe(1);
  });

  it('skips unavailable users when selecting after lastUserId', () => {
    expect(pickNextAvailableUser([1, 2, 3], new Set([1, 3]), 2)).toBe(3);
  });

  it('returns null when all users are unavailable', () => {
    expect(pickNextAvailableUser([1, 2, 3], new Set(), 2)).toBeNull();
  });
});

describe('IomAssignmentService', () => {
  let service: IomAssignmentService;
  let iomRepo: jest.Mocked<Repository<Iom>>;
  let usersRepo: jest.Mocked<Repository<Users>>;
  let availabilityRepo: jest.Mocked<Repository<UserAvailability>>;
  let workflow: jest.Mocked<WorkflowValidationService>;
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    query: jest.Mock;
  };
  let dataSource: { createQueryRunner: jest.Mock };

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest
        .fn()
        .mockResolvedValueOnce([{ lastUserId: null }])
        .mockResolvedValueOnce({ affectedRows: 1 })
        .mockResolvedValueOnce(undefined),
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    iomRepo = {
      find: jest.fn().mockResolvedValue([{ id: 101 }]),
    } as unknown as jest.Mocked<Repository<Iom>>;

    const usersQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    };

    usersRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(usersQb),
    } as unknown as jest.Mocked<Repository<Users>>;

    const availabilityQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    availabilityRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(availabilityQb),
    } as unknown as jest.Mocked<Repository<UserAvailability>>;

    workflow = {
      getStatusId: jest.fn().mockReturnValue(10),
    } as unknown as jest.Mocked<WorkflowValidationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IomAssignmentService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: getRepositoryToken(Iom), useValue: iomRepo },
        { provide: getRepositoryToken(Users), useValue: usersRepo },
        {
          provide: getRepositoryToken(UserAvailability),
          useValue: availabilityRepo,
        },
        { provide: WorkflowValidationService, useValue: workflow },
      ],
    }).compile();

    service = module.get(IomAssignmentService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns zero counts when no eligible IOMs exist', async () => {
    iomRepo.find.mockResolvedValueOnce([]);

    await expect(service.assignEligibleIoms()).resolves.toEqual({
      assigned: 0,
      skipped: 0,
      errors: 0,
    });
  });

  it('returns zero counts when CRM pool is empty', async () => {
    const usersQb = usersRepo.createQueryBuilder();
    (usersQb.getRawMany as jest.Mock).mockResolvedValueOnce([]);

    await expect(service.assignEligibleIoms()).resolves.toEqual({
      assigned: 0,
      skipped: 0,
      errors: 0,
    });
  });

  it('assigns eligible IOMs using queryRunner transaction lifecycle', async () => {
    const result = await service.assignEligibleIoms();

    expect(workflow.getStatusId).toHaveBeenCalledWith(
      IomStatusCodeEnum.IOM_TO_BE_CREATED,
    );
    expect(iomRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          statusId: 10,
          assignedTo: expect.objectContaining({ _type: 'isNull' }),
        }),
        order: { id: 'ASC' },
      }),
    );
    expect(usersRepo.createQueryBuilder).toHaveBeenCalled();
    expect(dataSource.createQueryRunner).toHaveBeenCalled();
    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(result).toEqual({ assigned: 1, skipped: 0, errors: 0 });
  });

  it('skips IOM when all CRM users are unavailable', async () => {
    const availabilityQb = availabilityRepo.createQueryBuilder();
    (availabilityQb.getRawMany as jest.Mock).mockResolvedValueOnce([
      { userId: 1 },
      { userId: 2 },
    ]);

    const result = await service.assignEligibleIoms();

    expect(result).toEqual({ assigned: 0, skipped: 1, errors: 0 });
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('loads only active CRM users for assignment pool', async () => {
    const usersQb = usersRepo.createQueryBuilder();

    await service.assignEligibleIoms();

    expect(usersQb.where).toHaveBeenCalledWith('role.name = :crmRole', {
      crmRole: RolesEnum.CRM,
    });
    expect(usersQb.andWhere).toHaveBeenCalledWith('user.status = :status', {
      status: StatusEnum.ACTIVE,
    });
  });

  it('excludes cancelled and soft-deleted availability when loading unavailable users', async () => {
    const availabilityQb = availabilityRepo.createQueryBuilder();

    await service.assignEligibleIoms();

    expect(availabilityQb.andWhere).toHaveBeenCalledWith(
      'ua.cancelled_at IS NULL',
    );
    expect(availabilityQb.andWhere).toHaveBeenCalledWith('ua.is_deleted = 0');
  });
});
