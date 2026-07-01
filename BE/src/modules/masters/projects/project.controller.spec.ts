import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './project.controller';
import { ProjectsService } from './project.service';
import {
  CanActivate,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

// simple guard mocks to bypass Nest guard behaviour in unit tests
class MockRmAdminAuthGuard implements CanActivate {
  canActivate() {
    return true;
  }
}
class MockRolesGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<ProjectsService>;

  const mockUser = { id: 1, dbId: 123, name: 'Test User' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            create: jest.fn(),
            findProjectPhases: jest.fn(),
            findAll: jest.fn(),
            findProjectsByBrandCity: jest.fn(),
            findProjectsByBrand: jest.fn(),
            findProjectById: jest.fn(),
            updateProject: jest.fn(),
            findAllBillingEntities: jest.fn(),
            projectTerm: jest.fn(),
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
      .overrideGuard(MockRmAdminAuthGuard as any)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(MockRolesGuard as any)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get(ProjectsService) as jest.Mocked<ProjectsService>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create and return created project', async () => {
      const dto = { name: 'New Project' } as any;
      const expected = {
        statusCode: 201,
        message: 'Created',
        data: { id: 1, ...dto },
      };

      service.create.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.create(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate errors from service.create', async () => {
      const dto = { name: '' } as any;
      const err = new Error('validation failed');
      service.create.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.create(dto)).rejects.toThrow(Error);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findProjectPhases', () => {
    it('should call findProjectPhases with provided brandId and cityId', async () => {
      const brandId = 2;
      const cityId = 3;
      const raw = [
        {
          id: 42,
          name: 'Phase 1 - Riverside',
          reraStatus: 'REGISTERED',
          projectType: 'PRE_LAUNCH',
          billingEntityId: 7,
          projectId: 123,
          cityId: 10,
          brandId: 3,
          incentiveBookingIds: [1001, 1002],
          sustenanceDate: null,
          skipLaunch: true,
          launchStartDate: null,
          launchEndDate: null,
          deletedAt: null,
          createdAt: '2025-05-12T08:30:00.000Z',
          updatedAt: '2025-10-20T12:45:00.000Z',
        },
      ];
      const expected = {
        message: 'Data Fetch Successfully',
        data: raw as unknown as any,
      };

      service.findProjectPhases.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findProjectPhases(brandId, cityId);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findProjectPhases).toHaveBeenCalledWith(brandId, cityId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle undefined params', async () => {
      const expected = {
        message: 'Data Fetch Successfully',
        data: [] as unknown as any,
      };
      service.findProjectPhases.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findProjectPhases(undefined, undefined);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findProjectPhases).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findAllProjects', () => {
    it('should parse billingEntities and call service.findAll with billingEntityIds array', async () => {
      const queryDto: any = {
        page: 1,
        limit: 10,
        search: 'p',
        sortBy: 'name',
        billingEntities: 'be1,be2, be3',
        brandId: 10,
        cityId: 20,
      };

      const expected = { statusCode: 200, message: 'OK', data: { items: [] } };
      service.findAll.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findAllProjects(queryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(
        queryDto.page,
        queryDto.limit,
        queryDto.search,
        queryDto.sortBy,
        ['be1', 'be2', 'be3'],
        queryDto.brandId,
        queryDto.cityId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass undefined for billingEntityIds when billingEntities is empty', async () => {
      const queryDto: any = {
        page: 1,
        limit: 10,
        billingEntities: '',
      };
      const expected = { statusCode: 200, message: 'OK', data: { items: [] } };
      service.findAll.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findAllProjects(queryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(
        queryDto.page,
        queryDto.limit,
        queryDto.search,
        queryDto.sortBy,
        undefined,
        queryDto.brandId,
        queryDto.cityId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate service errors', async () => {
      const queryDto: any = { page: 1, limit: 10 };
      const err = new Error('db');
      service.findAll.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.findAllProjects(queryDto)).rejects.toThrow(Error);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findProjectsCity', () => {
    it('should parse cityIds and call findProjectsByBrandCity', async () => {
      const cityIds = '1, 2,3';
      const brandId = 5;
      const expected = { statusCode: 200, message: 'OK', data: [] };

      service.findProjectsByBrandCity.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findProjectsCity(
        mockUser,
        brandId,
        cityIds,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findProjectsByBrandCity).toHaveBeenCalledWith(
        mockUser.dbId,
        [1, 2, 3],
        brandId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should call service with empty cityIds array when cityIds not provided', async () => {
      const brandId = 5;
      const expected = { statusCode: 200, message: 'OK', data: [] };
      service.findProjectsByBrandCity.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findProjectsCity(
        mockUser,
        brandId,
        undefined,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findProjectsByBrandCity).toHaveBeenCalledWith(
        mockUser.dbId,
        [],
        brandId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw BadRequestException for invalid cityIds', async () => {
      await expect(
        controller.findProjectsCity(mockUser, 1, 'a,b, ,'),
      ).rejects.toThrow(BadRequestException);

      expect(service.findProjectsByBrandCity).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      const cityIds = '1,2';
      const brandId = 5;
      const err = new Error('boom');
      service.findProjectsByBrandCity.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(
        controller.findProjectsCity(mockUser, brandId, cityIds),
      ).rejects.toThrow(Error);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findProjectsByBrand', () => {
    it('should throw BadRequestException when brandId missing', async () => {
      await expect(
        controller.findProjectsByBrand(undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call service.findProjectsByBrand when brandId provided', async () => {
      const brandId = 10;
      const expected = { statusCode: 200, message: 'OK', data: [] };
      service.findProjectsByBrand.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findProjectsByBrand(brandId);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findProjectsByBrand).toHaveBeenCalledWith(brandId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findProjectById', () => {
    it('should return project by id', async () => {
      const id = 12;
      const expected = { id, name: 'P' };
      service.findProjectById.mockResolvedValueOnce(expected as any);

      const start = Date.now();
      const result = await controller.findProjectById(id);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findProjectById).toHaveBeenCalledWith(id);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate not found error', async () => {
      const id = 999;
      const err = new NotFoundException('not found');
      service.findProjectById.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.findProjectById(id)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('updateProject', () => {
    it('should call updateProject and return updated project', async () => {
      const id = 7;
      const dto = { name: 'Updated' } as any;
      const expected = { statusCode: 200, message: 'OK', data: { id, ...dto } };
      service.updateProject.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.updateProject(id, dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.updateProject).toHaveBeenCalledWith(id, dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate errors from service.updateProject', async () => {
      const id = 7;
      const dto = { name: '' } as any;
      const err = new Error('validation');
      service.updateProject.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.updateProject(id, dto)).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findAllBillingEntities', () => {
    it('should return billing entities', async () => {
      const expected = [{ id: 'be1' }];
      service.findAllBillingEntities.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findAllBillingEntities();
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findAllBillingEntities).toHaveBeenCalledTimes(1);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate errors from service', async () => {
      const err = new Error('oops');
      service.findAllBillingEntities.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.findAllBillingEntities()).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getProjectTerm', () => {
    it('should fetch project term by project name', async () => {
      const projectName = 'ProjectX';
      const expected = {
        message: 'Term data',
        data: {
          id: 1,
          brandId: 10,
          projectName: 'ProjectX',
          projectImage: 'img.png',
          brandName: 'BrandX',
          brandLogo: 'logo.png',
          city: 'Bangalore',
          termsConditions: '36 months',
          jvPartnerLogo: 'jv.png',
          projectId: 100,
        },
      };
      service.projectTerm.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.getProjectTerm(projectName);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.projectTerm).toHaveBeenCalledWith(projectName);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate service error', async () => {
      const projectName = 'ProjectX';
      const err = new Error('not found');
      service.projectTerm.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.getProjectTerm(projectName)).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
