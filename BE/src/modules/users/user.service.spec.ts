import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Brands, Group, Role } from 'src/entities';
import { RolesEnum } from 'src/enums/roles.enum';
import { AwsService } from '../aws/aws.service';
import { NotificationService } from '../notifications/notification.service';
import { Users } from './entities/user.entity';
import { UserGroupAssignment } from './entities/user_group_assignment.entity';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let usersRepository: { findOne: jest.Mock };

  const tlUserId = 10;
  const targetUserId = 20;

  const crmTargetUser = {
    id: targetUserId,
    reportingTo: tlUserId,
    role: { name: RolesEnum.CRM },
  } as Users;

  beforeEach(async () => {
    usersRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(Users), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: {} },
        { provide: getRepositoryToken(Group), useValue: {} },
        { provide: getRepositoryToken(Brands), useValue: {} },
        {
          provide: getRepositoryToken(UserGroupAssignment),
          useValue: {},
        },
        { provide: AwsService, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get(UserService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('validateTLAccess', () => {
    it('throws ForbiddenException when TL targets self', async () => {
      await expect(
        service.validateTLAccess(tlUserId, tlUserId),
      ).rejects.toThrow(
        new ForbiddenException('You cannot mark your own unavailability'),
      );
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when target user is not found', async () => {
      usersRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.validateTLAccess(tlUserId, targetUserId),
      ).rejects.toThrow(
        new ForbiddenException('Target user not found or access denied'),
      );
    });

    it('throws ForbiddenException when target user is not CRM', async () => {
      usersRepository.findOne.mockResolvedValueOnce({
        id: targetUserId,
        reportingTo: tlUserId,
        role: { name: RolesEnum.SALES_TL },
      });

      await expect(
        service.validateTLAccess(tlUserId, targetUserId),
      ).rejects.toThrow(
        new ForbiddenException('Target user must have CRM role'),
      );
    });

    it('throws ForbiddenException when reportingTo does not match TL', async () => {
      usersRepository.findOne.mockResolvedValueOnce({
        id: targetUserId,
        reportingTo: 99,
        role: { name: RolesEnum.CRM },
      });

      await expect(
        service.validateTLAccess(tlUserId, targetUserId),
      ).rejects.toThrow(
        new ForbiddenException(
          'You can only set availability for users in your team',
        ),
      );
    });

    it('returns target user for a valid direct-report CRM user', async () => {
      usersRepository.findOne.mockResolvedValueOnce(crmTargetUser);

      const result = await service.validateTLAccess(tlUserId, targetUserId);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: targetUserId },
        relations: ['role'],
      });
      expect(result).toBe(crmTargetUser);
    });
  });
});
