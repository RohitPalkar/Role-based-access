import { describe } from 'node:test';
import { IncentiveDashboardController } from './incentive_dashboard.controller';
import { IncentiveDashboardService } from './incentive_dashboard.service';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RolesEnum } from 'src/enums/roles.enum';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

type IncentiveDashboardServiceMock = jest.Mocked<
  Pick<
    IncentiveDashboardService,
    | 'calculateIncentiveAtRiskForBookingTypes'
    | 'getDateDifference'
    | 'getIncentiveCardsData'
    | 'getPrizeData'
    | 'getSalesData'
    | 'getUserPerformance'
  >
>;
describe('IncentiveDashboardController', () => {
  let controller: IncentiveDashboardController;
  let incentiveDashboardService: IncentiveDashboardServiceMock;

  beforeAll(async () => {
    const serviceMock: IncentiveDashboardServiceMock = {
      calculateIncentiveAtRiskForBookingTypes: jest.fn(),
      getDateDifference: jest.fn(),
      getIncentiveCardsData: jest.fn(),
      getPrizeData: jest.fn(),
      getSalesData: jest.fn(),
      getUserPerformance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncentiveDashboardController],
      providers: [
        {
          provide: IncentiveDashboardService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get(IncentiveDashboardController);
    incentiveDashboardService = module.get(
      IncentiveDashboardService,
    ) as IncentiveDashboardServiceMock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('incentiveDashboardData', () => {
    const baseUser = { dbId: 999, role: RolesEnum.RM };
    const baseQuery = {
      ids: '101,102',
      month: 'October',
      year: '2025',
      rmId: '1234',
    };
    const baseProjectIds = ['101', '102'];
    const baseMonthInt = 10;
    const mockResponse = {
      message: 'Incentive cards data fetched successfully',
      data: { rmName: 'Test RM', cards: [] },
    };

    it('should fetch incentive dashboard data successfully (success + response time)', async () => {
      incentiveDashboardService.getIncentiveCardsData.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.incentiveDashboardData(
        baseUser,
        baseQuery.ids,
        baseQuery.month,
        baseQuery.year,
        baseQuery.rmId,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).toHaveBeenCalledWith(
        baseUser.dbId,
        baseProjectIds,
        baseMonthInt,
        baseQuery.year,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should use rmId from query when user role is ADMIN', async () => {
      const adminUser = { role: RolesEnum.ADMIN };
      incentiveDashboardService.getIncentiveCardsData.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.incentiveDashboardData(
        adminUser,
        baseQuery.ids,
        baseQuery.month,
        baseQuery.year,
        baseQuery.rmId,
      );

      expect(result).toEqual(mockResponse);
      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).toHaveBeenCalledWith(
        baseQuery.rmId,
        baseProjectIds,
        baseMonthInt,
        baseQuery.year,
      );
    });

    it('should pass an empty projectIds array if none are provided', async () => {
      incentiveDashboardService.getIncentiveCardsData.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.incentiveDashboardData(
        baseUser,
        undefined,
        baseQuery.month,
        baseQuery.year,
        baseQuery.rmId,
      );

      expect(result).toEqual(mockResponse);
      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).toHaveBeenCalledWith(baseUser.dbId, [], baseMonthInt, baseQuery.year);
    });

    it('should throw BadRequestException if year is not numeric', async () => {
      await expect(
        controller.incentiveDashboardData(
          baseUser,
          baseQuery.ids,
          baseQuery.month,
          '20XX',
          baseQuery.rmId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.incentiveDashboardData(
          baseUser,
          baseQuery.ids,
          baseQuery.month,
          '20XX',
          baseQuery.rmId,
        ),
      ).rejects.toThrow('Invalid year. It must be a valid number.');

      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if any projectId is not numeric', async () => {
      await expect(
        controller.incentiveDashboardData(
          baseUser,
          '101,abc,102',
          baseQuery.month,
          baseQuery.year,
          baseQuery.rmId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.incentiveDashboardData(
          baseUser,
          '101,abc,102',
          baseQuery.month,
          baseQuery.year,
          baseQuery.rmId,
        ),
      ).rejects.toThrow('Invalid projectIds. All IDs must be numbers.');

      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).not.toHaveBeenCalled();
    });

    it('should accept only month/year filter without projects', async () => {
      incentiveDashboardService.getIncentiveCardsData.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.incentiveDashboardData(
        baseUser,
        undefined,
        baseQuery.month,
        baseQuery.year,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).toHaveBeenCalledWith(baseUser.dbId, [], baseMonthInt, baseQuery.year);
    });

    it('should propagate BadRequestException from the service', async () => {
      incentiveDashboardService.getIncentiveCardsData.mockRejectedValueOnce(
        new BadRequestException('userId must be provided'),
      );

      await expect(
        controller.incentiveDashboardData(
          baseUser,
          baseQuery.ids,
          baseQuery.month,
          baseQuery.year,
          baseQuery.rmId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).toHaveBeenCalledWith(
        baseUser.dbId,
        baseProjectIds,
        baseMonthInt,
        baseQuery.year,
      );
    });

    it('should surface InternalServerErrorException when service fails with it', async () => {
      incentiveDashboardService.getIncentiveCardsData.mockRejectedValueOnce(
        new InternalServerErrorException('Unable To Fetch Dashboard Card Data'),
      );

      await expect(
        controller.incentiveDashboardData(
          baseUser,
          baseQuery.ids,
          baseQuery.month,
          baseQuery.year,
          baseQuery.rmId,
        ),
      ).rejects.toThrow(InternalServerErrorException);
      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).toHaveBeenCalledWith(
        baseUser.dbId,
        baseProjectIds,
        baseMonthInt,
        baseQuery.year,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('db timeout');
      incentiveDashboardService.getIncentiveCardsData.mockRejectedValueOnce(
        err,
      );

      await expect(
        controller.incentiveDashboardData(
          baseUser,
          baseQuery.ids,
          baseQuery.month,
          baseQuery.year,
          baseQuery.rmId,
        ),
      ).rejects.toThrow(err);
      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).toHaveBeenCalledWith(
        baseUser.dbId,
        baseProjectIds,
        baseMonthInt,
        baseQuery.year,
      );
    });

    it('should handle no month/year/projectIds gracefully and still pass to service', async () => {
      incentiveDashboardService.getIncentiveCardsData.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.incentiveDashboardData(
        baseUser,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockResponse);
      expect(
        incentiveDashboardService.getIncentiveCardsData,
      ).toHaveBeenCalledWith(baseUser.dbId, [], null, undefined);
    });
  });

  describe('getUserPerformance (GET /user-targets)', () => {
    const rmUser = { dbId: 999, role: RolesEnum.RM };

    const mockMonthlyResponse = {
      message: `Performance data for user ${rmUser.dbId} (monthly) fetched successfully.`,
      data: {
        unit: 'Cr',
        name: 'Monthly',
        categories: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        data: [
          { name: 'Sale', data: Array(12).fill(0) },
          { name: 'Regularized', data: Array(12).fill(0) },
          { name: 'Earned', data: Array(12).fill(0) },
        ],
      },
    };

    const mockYearlyResponse = {
      message: `Performance data for user ${rmUser.dbId} (yearly) fetched successfully.`,
      data: {
        unit: 'Cr',
        name: 'Yearly',
        categories: ['2024', '2025'],
        data: [
          { name: 'Sale', data: [1.23, 2.34] },
          { name: 'Regularized', data: [0.5, 1.1] },
          { name: 'Earned', data: [0.25, 0.75] },
        ],
      },
    };

    it('should fetch monthly performance successfully (success + response time)', async () => {
      incentiveDashboardService.getUserPerformance.mockResolvedValueOnce(
        mockMonthlyResponse,
      );

      const start = Date.now();
      const result = await controller.getUserPerformance(
        rmUser as any,
        'monthly' as any,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(mockMonthlyResponse);
      expect(incentiveDashboardService.getUserPerformance).toHaveBeenCalledWith(
        rmUser.dbId,
        'monthly',
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should fetch yearly performance successfully (success + response time)', async () => {
      incentiveDashboardService.getUserPerformance.mockResolvedValueOnce(
        mockYearlyResponse,
      );

      const start = Date.now();
      const result = await controller.getUserPerformance(
        rmUser as any,
        'yearly' as any,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(mockYearlyResponse);
      expect(incentiveDashboardService.getUserPerformance).toHaveBeenCalledWith(
        rmUser.dbId,
        'yearly',
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass user.dbId and type to the service unchanged', async () => {
      const user = { dbId: 1234, role: RolesEnum.RM };
      const resp = { message: 'ok', data: {} };
      incentiveDashboardService.getUserPerformance.mockResolvedValueOnce(resp);

      const result = await controller.getUserPerformance(
        user as any,
        'monthly' as any,
      );

      expect(result).toBe(resp);
      expect(
        incentiveDashboardService.getUserPerformance,
      ).toHaveBeenCalledTimes(1);
      expect(incentiveDashboardService.getUserPerformance).toHaveBeenCalledWith(
        1234,
        'monthly',
      );
    });

    it('should throw BadRequestException if type is invalid (and not call service)', async () => {
      await expect(
        controller.getUserPerformance(rmUser as any, 'weekly' as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.getUserPerformance(rmUser as any, 'weekly' as any),
      ).rejects.toThrow('Invalid type. Allowed values: "monthly", "yearly".');
      expect(
        incentiveDashboardService.getUserPerformance,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if type is missing (and not call service)', async () => {
      await expect(
        controller.getUserPerformance(rmUser as any, undefined as any),
      ).rejects.toThrow(BadRequestException);
      expect(
        incentiveDashboardService.getUserPerformance,
      ).not.toHaveBeenCalled();
    });

    it('should be strict about case for type (e.g., "Monthly" is invalid)', async () => {
      await expect(
        controller.getUserPerformance(rmUser as any, 'Monthly' as any),
      ).rejects.toThrow(BadRequestException);
      expect(
        incentiveDashboardService.getUserPerformance,
      ).not.toHaveBeenCalled();
    });

    it('should propagate BadRequestException from the service', async () => {
      incentiveDashboardService.getUserPerformance.mockRejectedValueOnce(
        new BadRequestException('userId must be provided'),
      );

      await expect(
        controller.getUserPerformance(
          { dbId: 0, role: RolesEnum.RM } as any,
          'monthly' as any,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(incentiveDashboardService.getUserPerformance).toHaveBeenCalledWith(
        0,
        'monthly',
      );
    });

    it('should surface InternalServerErrorException when service fails with it', async () => {
      incentiveDashboardService.getUserPerformance.mockRejectedValueOnce(
        new InternalServerErrorException('Unable To Fetch Dashboard Card Data'),
      );

      await expect(
        controller.getUserPerformance(rmUser as any, 'yearly' as any),
      ).rejects.toThrow(InternalServerErrorException);
      expect(incentiveDashboardService.getUserPerformance).toHaveBeenCalledWith(
        rmUser.dbId,
        'yearly',
      );
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('db timeout');
      incentiveDashboardService.getUserPerformance.mockRejectedValueOnce(err);

      await expect(
        controller.getUserPerformance(rmUser as any, 'monthly' as any),
      ).rejects.toThrow(err);
      expect(incentiveDashboardService.getUserPerformance).toHaveBeenCalledWith(
        rmUser.dbId,
        'monthly',
      );
    });
  });

  describe('getPrize (GET /booster-prize)', () => {
    const rmUser = { dbId: 999, role: RolesEnum.RM };

    it('should fetch booster prize successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'Booster Prize fetched Successfully',
        data: [
          {
            boosterName: 'Dussehra Booster',
            totalSales: '1.25',
            progress: '62.50',
            prizeValue: '1 Lakh',
            PrizeType: 'Amount',
            targetSales: '2.00',
          },
        ],
      };
      incentiveDashboardService.getPrizeData.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.getPrize(rmUser as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(incentiveDashboardService.getPrizeData).toHaveBeenCalledWith(
        rmUser.dbId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass user.dbId to the service unchanged', async () => {
      const user = { dbId: 1234, role: RolesEnum.RM };
      const resp = { message: 'Booster Prize fetched Successfully', data: [] };
      incentiveDashboardService.getPrizeData.mockResolvedValueOnce(resp);

      const result = await controller.getPrize(user as any);

      expect(result).toBe(resp); // exact object passthrough
      expect(incentiveDashboardService.getPrizeData).toHaveBeenCalledTimes(1);
      expect(incentiveDashboardService.getPrizeData).toHaveBeenCalledWith(1234);
    });

    it('should accept stringified user id and pass it through unchanged when pipes do not coerce', async () => {
      const user = { dbId: '777', role: RolesEnum.RM } as any;
      const resp = { message: 'Booster Prize fetched Successfully', data: [] };
      incentiveDashboardService.getPrizeData.mockResolvedValueOnce(resp);

      const result = await controller.getPrize(user);

      expect(result).toEqual(resp);
      expect(incentiveDashboardService.getPrizeData).toHaveBeenCalledWith(
        '777',
      ); // unchanged
    });

    it('should propagate BadRequestException from the service (e.g., user without brand / not found)', async () => {
      incentiveDashboardService.getPrizeData.mockRejectedValueOnce(
        new BadRequestException('User does not have a brand.'),
      );

      await expect(controller.getPrize(rmUser as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(incentiveDashboardService.getPrizeData).toHaveBeenCalledWith(
        rmUser.dbId,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('db timeout');
      incentiveDashboardService.getPrizeData.mockRejectedValueOnce(err);

      await expect(controller.getPrize(rmUser as any)).rejects.toThrow(err);
      expect(incentiveDashboardService.getPrizeData).toHaveBeenCalledWith(
        rmUser.dbId,
      );
    });

    it('should handle undefined user.dbId by letting the service throw and propagating that error', async () => {
      incentiveDashboardService.getPrizeData.mockRejectedValueOnce(
        new BadRequestException('User with ID undefined not found'),
      );

      await expect(
        controller.getPrize({ role: RolesEnum.RM } as any),
      ).rejects.toThrow(BadRequestException);
      expect(incentiveDashboardService.getPrizeData).toHaveBeenCalledWith(
        undefined,
      );
    });
  });
});
