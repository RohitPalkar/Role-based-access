import { Test, TestingModule } from '@nestjs/testing';
import { ProjectPhasesController } from './project_phases.controller';
import { ProjectPhasesService } from './project_phases.service';
import {
  CanActivate,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FindProjectPhasesQueryDto } from './dtos/find-project-phases.dto';
import { UpdateProjectPhaseDto } from './dtos/update-project-phase.dto';
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

describe('ProjectPhasesController', () => {
  let controller: ProjectPhasesController;
  let service: jest.Mocked<ProjectPhasesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectPhasesController],
      providers: [
        {
          provide: ProjectPhasesService,
          useValue: {
            findProjectPhasesList: jest.fn(),
            findProjectPhaseById: jest.fn(),
            updateProjectPhase: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(MockRmAdminAuthGuard as any)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(MockRolesGuard as any)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<ProjectPhasesController>(ProjectPhasesController);
    service = module.get(
      ProjectPhasesService,
    ) as jest.Mocked<ProjectPhasesService>;
    jest.clearAllMocks();
  });

  describe('findProjectPhasesList', () => {
    it('should call service.findProjectPhasesList with parsed query params and return result', async () => {
      const query: FindProjectPhasesQueryDto = {
        page: 2,
        limit: 10,
        brandId: 5,
        cityIds: [1, 2],
        search: 'phase',
      } as any;

      const expected = {
        statusCode: 200,
        message: 'Project phases fetched',
        data: { phases: [], total: 0, limit: 0, totalPages: 0, currentPage: 2 },
      };

      service.findProjectPhasesList.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.findProjectPhasesList(query);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findProjectPhasesList).toHaveBeenCalledWith(
        query.page,
        query.limit,
        query.brandId,
        query.cityIds,
        query.search,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate service errors', async () => {
      const query: FindProjectPhasesQueryDto = { page: 1, limit: 10 } as any;
      const err = new Error('DB error');

      service.findProjectPhasesList.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.findProjectPhasesList(query)).rejects.toThrow(
        Error,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('findProjectPhaseById', () => {
    it('should return phase when found', async () => {
      const id = 11;
      const expected = { id, name: 'Phase A' };

      service.findProjectPhaseById.mockResolvedValueOnce(expected as any);

      const start = Date.now();
      const result = await controller.findProjectPhaseById(id);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.findProjectPhaseById).toHaveBeenCalledWith(id);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw NotFoundException when phase not found', async () => {
      const id = 999;
      const err = new NotFoundException(
        `Project phase with id ${id} not found`,
      );

      service.findProjectPhaseById.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.findProjectPhaseById(id)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate unexpected errors', async () => {
      const id = 7;
      const err = new Error('unexpected');

      service.findProjectPhaseById.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.findProjectPhaseById(id)).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('updateProjectPhase', () => {
    it('should call updateProjectPhase and return updated phase', async () => {
      const id = 3;
      const dto: UpdateProjectPhaseDto = { name: 'Updated Phase' } as any;
      const expected = {
        statusCode: 200,
        message: 'Project phase updated',
        data: { id, ...dto },
      };

      service.updateProjectPhase.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.updateProjectPhase(id, dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.updateProjectPhase).toHaveBeenCalledWith(id, dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate validation errors from service', async () => {
      const id = 4;
      const dto: UpdateProjectPhaseDto = { name: '' } as any;
      const err = new BadRequestException('Invalid payload');

      service.updateProjectPhase.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.updateProjectPhase(id, dto)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate unexpected errors', async () => {
      const id = 8;
      const dto: UpdateProjectPhaseDto = { name: 'X' } as any;
      const err = new Error('boom');

      service.updateProjectPhase.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.updateProjectPhase(id, dto)).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
