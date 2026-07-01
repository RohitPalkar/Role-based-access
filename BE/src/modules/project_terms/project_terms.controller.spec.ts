import { Test, TestingModule } from '@nestjs/testing';
import { ProjectTermsController } from './project_terms.controller';
import { ProjectTermsService } from './project_terms.service';
import { ProjectTerm } from './entities/project_term.entity';

describe('ProjectTermsController', () => {
  let controller: ProjectTermsController;
  let service: ProjectTermsService;

  const mockProjectTermsService = {
    getTermsConditions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectTermsController],
      providers: [
        {
          provide: ProjectTermsService,
          useValue: mockProjectTermsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectTermsController>(ProjectTermsController);
    service = module.get<ProjectTermsService>(ProjectTermsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTermsConditions', () => {
    it('should call service with projectName and brandName and return result', async () => {
      const projectName = 'SkyView';
      const brandName = 'Puravankara';

      const mockResponse: ProjectTerm = {
        id: 1,
      } as ProjectTerm;

      mockProjectTermsService.getTermsConditions.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getTermsConditions(
        projectName,
        brandName,
      );

      expect(service.getTermsConditions).toHaveBeenCalledTimes(1);
      expect(service.getTermsConditions).toHaveBeenCalledWith(
        projectName,
        brandName,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
