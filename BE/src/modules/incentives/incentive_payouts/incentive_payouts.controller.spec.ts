import { Test, TestingModule } from '@nestjs/testing';
import { IncentivePayoutsController } from './incentive_payouts.controller';
import { IncentivePayoutsService } from './incentive_payouts.service';
import { CanActivate, BadRequestException } from '@nestjs/common';
import { PayableBookingsQueryDto } from './dto/get-payable-bookings.dto';
import { PayoutFileDto } from './dto/payout-file.dto';
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

describe('IncentivePayoutsController', () => {
  let controller: IncentivePayoutsController;
  let service: jest.Mocked<IncentivePayoutsService>;

  const mockUser = { id: 1, dbId: 11, name: 'Finance Admin', role: 'ADMIN' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncentivePayoutsController],
      providers: [
        {
          provide: IncentivePayoutsService,
          useValue: {
            getPayableBookings: jest.fn(),
            exportPayableBookings: jest.fn(),
            bulkPayout: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(MockRmAdminAuthGuard as any)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(MockRolesGuard as any)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<IncentivePayoutsController>(
      IncentivePayoutsController,
    );
    service = module.get(
      IncentivePayoutsService,
    ) as jest.Mocked<IncentivePayoutsService>;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPayableBookings', () => {
    it('should call service.getPayableBookings with parsed dates and other params', async () => {
      const query: PayableBookingsQueryDto = {
        page: 1,
        limit: 20,
        search: 'opp',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        brandIds: [1, 2],
        projectIds: [10],
        rmIds: [100],
        sortBy: 'amount',
      } as any;

      const expected = { statusCode: 200, message: 'OK', data: { items: [] } };
      service.getPayableBookings.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.getPayableBookings(query);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.getPayableBookings).toHaveBeenCalledWith({
        page: query.page,
        limit: query.limit,
        search: query.search,
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        brandIds: query.brandIds,
        projectIds: query.projectIds,
        rmIds: query.rmIds,
        sortBy: query.sortBy,
      });
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass undefined for startDate/endDate when they are not provided', async () => {
      const query: PayableBookingsQueryDto = {
        page: 1,
        limit: 10,
        search: 'x',
      } as any;

      const expected = { statusCode: 200, message: 'OK', data: {} };
      service.getPayableBookings.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.getPayableBookings(query);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.getPayableBookings).toHaveBeenCalledWith({
        page: query.page,
        limit: query.limit,
        search: query.search,
        startDate: undefined,
        endDate: undefined,
        brandIds: undefined,
        projectIds: undefined,
        rmIds: undefined,
        sortBy: undefined,
      });
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate service errors', async () => {
      const query: PayableBookingsQueryDto = { page: 1, limit: 10 } as any;
      const err = new Error('db error');
      service.getPayableBookings.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.getPayableBookings(query)).rejects.toThrow(Error);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw if startDate is invalid date string', async () => {
      const query: PayableBookingsQueryDto = {
        startDate: 'invalid-date',
      } as any;

      // controller converts startDate via new Date('invalid-date') which yields Invalid Date.
      // Service should receive that; test expects it to be passed through. If service or controller
      // validates, it will throw. Here we simulate service throwing a BadRequestException.
      const err = new BadRequestException('Invalid date');
      service.getPayableBookings.mockRejectedValueOnce(err);

      await expect(controller.getPayableBookings(query)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('exportPayableBookings', () => {
    it('should call service.exportPayableBookings with parsed dates and other params', async () => {
      const query: PayableBookingsQueryDto = {
        page: 2,
        limit: 5,
        search: 'export',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
        brandIds: [3],
        projectIds: [11],
        rmIds: [200],
        sortBy: 'createdAt',
      } as any;

      const expected = {
        statusCode: 200,
        message: 'Export ready',
        data: { filePath: 'export/payable_bookings.xlsx' },
      };
      service.exportPayableBookings.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.exportPayableBookings(query);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.exportPayableBookings).toHaveBeenCalledWith({
        page: query.page,
        limit: query.limit,
        search: query.search,
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        brandIds: query.brandIds,
        projectIds: query.projectIds,
        rmIds: query.rmIds,
        sortBy: query.sortBy,
      });
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate service errors', async () => {
      const query: PayableBookingsQueryDto = { page: 1, limit: 10 } as any;
      const err = new Error('export failed');
      service.exportPayableBookings.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.exportPayableBookings(query)).rejects.toThrow(
        Error,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('bulkPayout', () => {
    const mockDto: PayoutFileDto = {
      fileName: 'payouts.xlsx',
      data: [{ rmId: 1, amount: 1000 }],
    } as any;

    it('should call service.bulkPayout with user and dto and return result', async () => {
      const expected = {
        statusCode: 200,
        message: 'Bulk payout processed',
        data: { processed: 1 },
      };
      service.bulkPayout.mockResolvedValueOnce(expected);

      const start = Date.now();
      const result = await controller.bulkPayout(mockUser, mockDto);
      const duration = Date.now() - start;

      expect(result).toEqual(expected);
      expect(service.bulkPayout).toHaveBeenCalledWith(mockUser, mockDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate validation errors from service', async () => {
      const err = new BadRequestException('Invalid file contents');
      service.bulkPayout.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.bulkPayout(mockUser, mockDto)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate unexpected errors from service', async () => {
      const err = new Error('boom');
      service.bulkPayout.mockRejectedValueOnce(err);

      const start = Date.now();
      await expect(controller.bulkPayout(mockUser, mockDto)).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
