import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { NotFoundException } from '@nestjs/common';
import { SUCCESS } from 'src/config/constants';

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            findAll: jest.fn(),
            roleDropdown: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get(RolesService);
  });

  describe('findAll', () => {
    it('should return paginated roles', async () => {
      const mockResult = { data: [{ id: 1, name: 'Admin' }], total: 1 };
      rolesService.findAll.mockResolvedValue(mockResult);

      const query = { page: 1, limit: 10, search: 'adm', sortBy: 'name' };
      const result = await controller.findAll(query);

      expect(result).toEqual(mockResult);
      expect(rolesService.findAll).toHaveBeenCalledWith(
        query.page,
        query.limit,
        query.search,
        query.sortBy,
      );
    });

    it('should throw error if service fails', async () => {
      rolesService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.findAll({ page: 1, limit: 10 } as any),
      ).rejects.toThrow('DB error');
    });
  });

  describe('roleDropdown', () => {
    it('should return roles for dropdown', async () => {
      const mockRoles = [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'User' },
      ];
      rolesService.roleDropdown.mockResolvedValue({
        statusCode: SUCCESS,
        message: 'Roles fetched successfully.',
        data: mockRoles,
      });

      const result = await controller.roleDropdown('adm');

      expect(result).toEqual({
        statusCode: SUCCESS,
        message: 'Roles fetched successfully.',
        data: mockRoles,
      });
      expect(rolesService.roleDropdown).toHaveBeenCalledWith('adm');
    });

    it('should handle service error', async () => {
      rolesService.roleDropdown.mockRejectedValue(new Error('Service failed'));

      await expect(controller.roleDropdown('adm')).rejects.toThrow(
        'Service failed',
      );
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      const mockRole = { id: 1, name: 'Admin' };
      rolesService.findOne.mockResolvedValue(mockRole);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockRole);
      expect(rolesService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if role not found', async () => {
      rolesService.findOne.mockRejectedValue(
        new NotFoundException('Not found'),
      );

      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on other errors', async () => {
      rolesService.findOne.mockRejectedValue(new Error('DB error'));

      await expect(controller.findOne(1)).rejects.toThrow('DB error');
    });
  });
});
