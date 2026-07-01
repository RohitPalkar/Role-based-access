import { Test, TestingModule } from '@nestjs/testing';
import { IncentiveBookingOverridesController } from './incentive_booking_overrides.controller';
import { IncentiveBookingOverridesService } from './incentive_booking_overrides.service';
import {
  CanActivate,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
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

describe('IncentiveBookingOverridesController', () => {
  let controller: IncentiveBookingOverridesController;
  let service: jest.Mocked<IncentiveBookingOverridesService>;

  const mockUser = { id: 1, dbId: 11, name: 'Finance Admin', role: 'ADMIN' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncentiveBookingOverridesController],
      providers: [
        {
          provide: IncentiveBookingOverridesService,
          useValue: {
            sampleExcel: jest.fn(),
            bulkInsert: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(MockRmAdminAuthGuard as any)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(MockRolesGuard as any)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<IncentiveBookingOverridesController>(
      IncentiveBookingOverridesController,
    );
    service = module.get(
      IncentiveBookingOverridesService,
    ) as jest.Mocked<IncentiveBookingOverridesService>;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sampleExcel', () => {
    it('should return sample excel payload from service', async () => {
      const expected = {
        statusCode: 200,
        message: 'Sample excel',
        data: { s3Path: 'booking_override/booking_override_sample.xlsx' },
      };
      service.sampleExcel.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.sampleExcel();
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.sampleExcel).toHaveBeenCalledTimes(1);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate service errors', async () => {
      const err = new Error('service down');
      service.sampleExcel.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.sampleExcel()).rejects.toThrow(Error);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('bulkInsert', () => {
    const mockBookingFileDto = {
      fileName: 'overrides.xlsx',
      data: [{ oppId: 'OPP1', override: 100 }],
    };

    it('should call bulkInsert with user and dto and return result', async () => {
      const expected = {
        statusCode: 200,
        message: 'Inserted',
        data: { inserted: 1 },
      };
      service.bulkInsert.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.bulkInsert(
        mockUser,
        mockBookingFileDto as any,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.bulkInsert).toHaveBeenCalledWith(
        mockUser,
        mockBookingFileDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate validation errors thrown by service', async () => {
      const err = new BadRequestException('Invalid file');
      service.bulkInsert.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(
        controller.bulkInsert(mockUser, mockBookingFileDto as any),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate unexpected service errors', async () => {
      const err = new InternalServerErrorException('DB error');
      service.bulkInsert.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(
        controller.bulkInsert(mockUser, mockBookingFileDto as any),
      ).rejects.toThrow(InternalServerErrorException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle empty or malformed dto according to service behaviour', async () => {
      const malformedDto = { fileName: '', data: [] };
      const expected = {
        statusCode: 200,
        message: 'No records',
        data: { inserted: 0 },
      };
      service.bulkInsert.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.bulkInsert(mockUser, malformedDto as any);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.bulkInsert).toHaveBeenCalledWith(mockUser, malformedDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
