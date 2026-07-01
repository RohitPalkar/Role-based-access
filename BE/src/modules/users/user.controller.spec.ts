import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SfdcService } from '../sfdc/sfdc.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;
  let sfdcService: jest.Mocked<SfdcService>;
  let cache: jest.Mocked<Cache>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            refreshData: jest.fn(),
            getRmUsers: jest.fn(),
            exportUsers: jest.fn(),
            getAllUser: jest.fn(),
            getLoggedInUserDetails: jest.fn(),
            findOne: jest.fn(),
            findProjectGroups: jest.fn(),
            updateUserDetails: jest.fn(),
            extractSignature: jest.fn(),
            getSalesTeamDropdown: jest.fn(),
          },
        },
        {
          provide: SfdcService,
          useValue: {
            getUsers: jest.fn(),
            searchUserList: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            emitAsync: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RmAdminAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UserController);
    userService = module.get(UserService);
    sfdcService = module.get(SfdcService);
    cache = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('refreshData', () => {
    it('returns already in progress if cache flag exists', async () => {
      cache.get.mockResolvedValue(true);

      const res = await controller.refreshData();

      expect(res).toEqual({
        message: 'User Processing already in progress',
      });
    });

    it('delegates to service when users exist', async () => {
      cache.get.mockResolvedValue(null);
      sfdcService.getUsers.mockResolvedValue({ data: [{ id: 1 }] } as any);
      userService.refreshData.mockResolvedValue({ message: 'ok' });

      const res = await controller.refreshData();

      expect(userService.refreshData).toHaveBeenCalled();
      expect(res).toEqual({ message: 'ok' });
    });

    it('returns success when no users returned', async () => {
      cache.get.mockResolvedValue(null);
      sfdcService.getUsers.mockResolvedValue({ data: [] } as any);

      const res = await controller.refreshData();

      expect(res).toEqual({ message: 'List updated successfully' });
    });
  });

  describe('getRmUsers', () => {
    it('passes search param to service', async () => {
      userService.getRmUsers.mockResolvedValue({ data: [] } as any);

      await controller.getRmUsers('john');

      expect(userService.getRmUsers).toHaveBeenCalledWith('john');
    });
  });

  describe('exportUsers', () => {
    it('does not throw for invalid roleId at controller level', async () => {
      await expect(controller.exportUsers('abc' as any)).resolves.not.toThrow();
    });

    it('delegates to service', async () => {
      userService.exportUsers.mockResolvedValue({ csv: 'x' } as any);

      const res = await controller.exportUsers({
        page: 1,
        limit: 10,
        groupId: '5',
        role: '2',
      } as any);

      expect(userService.exportUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          groupUserId: 5,
          role: 2,
        }),
      );
      expect(res).toEqual({ csv: 'x' });
    });
  });

  describe('getAllUser', () => {
    it('maps query params correctly', async () => {
      userService.getAllUser.mockResolvedValue({ items: [], total: 0 });

      await controller.getAllUser({
        page: 1,
        limit: 10,
        groupId: '5',
        role: '2',
      } as any);

      expect(userService.getAllUser).toHaveBeenCalledWith(
        expect.objectContaining({
          groupUserId: 5,
          role: 2,
        }),
      );
    });
  });

  describe('getLoggedInUserDetails', () => {
    it('delegates to service', async () => {
      userService.getLoggedInUserDetails.mockResolvedValue({ id: 1 });

      const res = await controller.getUserDetails({ id: 1 });

      expect(res).toEqual({ id: 1 });
    });
  });

  describe('updateUserDetails', () => {
    it('delegates update', async () => {
      userService.updateUserDetails.mockResolvedValue({ success: true });

      const res = await controller.updateUserDetails(1, { name: 'X' } as any);

      expect(res).toEqual({ success: true });
    });

    it('rethrows service error', async () => {
      userService.updateUserDetails.mockRejectedValue(new Error('fail'));

      await expect(controller.updateUserDetails(1, {} as any)).rejects.toThrow(
        'fail',
      );
    });
  });

  describe('extractSignature', () => {
    it('returns base64 image', async () => {
      const buffer = Buffer.from('img');
      userService.extractSignature.mockResolvedValue(buffer);

      const file = { originalname: 'sign.pdf' } as any;
      const json = jest.fn();
      const res = { status: () => ({ json }) } as any;

      await controller.extractSignature(file, res);

      const expectedName = path.parse(file.originalname).name + '.png';

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expectedName,
          success: true,
          data: buffer.toString('base64'),
        }),
      );
    });

    it('throws InternalServerErrorException on failure', async () => {
      userService.extractSignature.mockRejectedValue(new Error());

      const res = { status: () => ({ json: jest.fn() }) } as any;

      await expect(controller.extractSignature({} as any, res)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
