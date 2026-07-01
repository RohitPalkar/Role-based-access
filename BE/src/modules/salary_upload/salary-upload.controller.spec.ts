import { Test, TestingModule } from '@nestjs/testing';
import { SalaryUploadController } from './salary-upload.controller';
import { SalaryUploadService } from './salary-upload.service';
import { SalaryFileDto } from './dto/salary-file.dto';
import { FindLogsQueryDto } from './dto/find-logs.dto';

describe('SalaryUploadController', () => {
  let controller: SalaryUploadController;
  let service: SalaryUploadService;

  const mockSalaryUploadService = {
    sampleExcel: jest.fn(),
    bulkInsert: jest.fn(),
    findAllLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalaryUploadController],
      providers: [
        {
          provide: SalaryUploadService,
          useValue: mockSalaryUploadService,
        },
      ],
    }).compile();

    controller = module.get<SalaryUploadController>(SalaryUploadController);
    service = module.get<SalaryUploadService>(SalaryUploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sampleExcel', () => {
    it('should return sample excel from service', async () => {
      const mockResponse = { url: 'sample.xlsx' };

      mockSalaryUploadService.sampleExcel.mockResolvedValue(mockResponse);

      const result = await controller.sampleExcel();

      expect(service.sampleExcel).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('bulkInsert', () => {
    it('should call bulkInsert with SalaryFileDto', async () => {
      const dto: SalaryFileDto = {
        key: 'uploads/salary.xlsx',
        fileName: 'salary.xlsx',
      } as SalaryFileDto;

      const mockResponse = { success: true };

      mockSalaryUploadService.bulkInsert.mockResolvedValue(mockResponse);

      const result = await controller.bulkInsert(dto);

      expect(service.bulkInsert).toHaveBeenCalledTimes(1);
      expect(service.bulkInsert).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAllLogs', () => {
    it('should call findAllLogs with correct query params', async () => {
      const query: FindLogsQueryDto = {
        page: 1,
        limit: 10,
        search: 'test',
        sortBy: 'createdAt',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'SUCCESS',
      } as FindLogsQueryDto;

      const mockResponse = {
        data: [],
        total: 0,
      };

      mockSalaryUploadService.findAllLogs.mockResolvedValue(mockResponse);

      const result = await controller.findAllLogs(query);

      expect(mockSalaryUploadService.findAllLogs).toHaveBeenCalledTimes(1);

      // ✅ FIX: match actual arguments passed from controller
      expect(mockSalaryUploadService.findAllLogs).toHaveBeenCalledWith(
        query.page,
        query.limit,
        query.search,
        query.sortBy,
        query.startDate,
        query.endDate,
        query.status,
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
