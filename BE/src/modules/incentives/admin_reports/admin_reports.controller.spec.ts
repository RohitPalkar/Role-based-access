import { describe } from 'node:test';
import { AdminReportsController } from './admin_reports.controller';
import { AdminReportsService } from './admin_reports.service';
import { Test, TestingModule } from '@nestjs/testing';
import { TEST_EXECUTION_TIME } from 'src/config/constants';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatusEnum } from 'src/enums/booking-list.enums';

type AdminReportsServiceMock = jest.Mocked<
  Pick<
    AdminReportsService,
    | 'getDashboardUsers'
    | 'exportDashboardUsers'
    | 'userBookings'
    | 'exportUserBookings'
    | 'updatePaymentStatus'
  >
>;

describe('AdminReportsController', () => {
  let controller: AdminReportsController;
  let adminReportsService: jest.Mocked<AdminReportsServiceMock>;

  beforeEach(async () => {
    const serviceMock: AdminReportsServiceMock = {
      getDashboardUsers: jest.fn(),
      exportDashboardUsers: jest.fn(),
      userBookings: jest.fn(),
      exportUserBookings: jest.fn(),
      updatePaymentStatus: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReportsController],
      providers: [
        {
          provide: AdminReportsService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<AdminReportsController>(AdminReportsController);
    adminReportsService = module.get(
      AdminReportsService,
    ) as AdminReportsServiceMock;
    jest.clearAllMocks();
  });

  describe('getDashboardUsers', () => {
    const baseQuery = {
      page: 1,
      limit: 10,
      search: undefined,
      sortBy: undefined,
    };

    const sampleUser = {
      id: 1,
      empCode: 'EMP001',
      name: 'Alice',
      email: 'alice@example.com',
      incentivePaidYTD: '10000',
      incentivePaid: '2000',
      incentivePayable: '5000',
      bookingAmountYTD: '1.25',
      collectedAmountYTD: '0.80',
      totalBookings: '12',
      qualifiedBookings: '8',
      disqualifiedBookings: '2',
      cancelledBookings: '1',
      regularisedBookings: '1',
      unRegularisedBookings: '0',
    };

    it('should fetch dashboard users successfully (success + response time)', async () => {
      const queryDto = { ...baseQuery };
      const mockResponse = {
        message: 'Dashboard Users fetched successfully',
        data: {
          users: [sampleUser],
          total: 1,
          page: queryDto.page!,
          limit: queryDto.limit!,
        },
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.getDashboardUsers(queryDto as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        queryDto.page,
        queryDto.limit,
        queryDto.search,
        queryDto.sortBy,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass pagination, search and sort to service', async () => {
      const queryDto = {
        page: 3,
        limit: 25,
        search: 'iresh',
        sortBy: 'name:asc',
      };
      const mockResponse = {
        message: 'Dashboard Users fetched successfully',
        data: {
          users: [{ ...sampleUser, id: 10, name: 'Iresh' }],
          total: 1,
          page: 3,
          limit: 25,
        },
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(mockResponse);

      const result = await controller.getDashboardUsers(queryDto as any);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        3,
        25,
        'iresh',
        'name:asc',
      );
    });

    it('should handle missing optional params (undefined search & sortBy)', async () => {
      const queryDto = { page: 1, limit: 20 } as any;
      const mockResponse = {
        message: 'Dashboard Users fetched successfully',
        data: { users: [], total: 0, page: 1, limit: 20 },
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(mockResponse);

      const result = await controller.getDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
      );
    });

    it('should handle empty search string by passing it through', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        search: '',
        sortBy: 'createdAt:desc',
      } as any;
      const mockResponse = {
        message: 'Dashboard Users fetched successfully',
        data: { users: [], total: 0, page: 1, limit: 10 },
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(mockResponse);

      const result = await controller.getDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        1,
        10,
        '',
        'createdAt:desc',
      );
    });

    it('should return empty list gracefully when service returns "No users found."', async () => {
      const queryDto = { page: 2, limit: 10 } as any;
      // NOTE: this is the other valid shape from the service
      const mockResponse = {
        message: 'No users found.',
        total: 0,
        page: 2,
        limit: 10,
        data: [],
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(
        mockResponse as any,
      );

      const result = await controller.getDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        2,
        10,
        undefined,
        undefined,
      );
    });

    it('should enforce response time even for large datasets (success + response time)', async () => {
      const queryDto = {
        page: 5,
        limit: 100,
        search: 'corp',
        sortBy: 'totalBookings:desc',
      } as any;
      const bigUsers = Array.from({ length: 100 }, (_, i) => ({
        ...sampleUser,
        id: i + 1,
        name: `User ${i + 1}`,
      }));
      const mockResponse = {
        message: 'Dashboard Users fetched successfully',
        data: { users: bigUsers, total: 1000, page: 5, limit: 100 },
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.getDashboardUsers(queryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        5,
        100,
        'corp',
        'totalBookings:desc',
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface BadRequestException for invalid sort field', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        sortBy: 'unknownField:asc',
      } as any;
      adminReportsService.getDashboardUsers.mockRejectedValueOnce(
        new BadRequestException(
          'Invalid sort field "unknownField". Allowed fields: empCode, name, incentivePaidYTD, incentivePaid, incentivePayable, bookingAmountYTD, collectedAmountYTD, totalBookings, qualifiedBookings, disqualifiedBookings, cancelledBookings, regularisedBookings, unRegularisedBookings',
        ),
      );

      await expect(controller.getDashboardUsers(queryDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        'unknownField:asc',
      );
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      const queryDto = { page: 1, limit: 10 } as any;
      adminReportsService.getDashboardUsers.mockRejectedValueOnce(
        new InternalServerErrorException(
          'Failed to fetch admin dashboard users',
        ),
      );

      await expect(controller.getDashboardUsers(queryDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const queryDto = { page: 2, limit: 5, sortBy: 'name:desc' } as any;
      const err = new Error('Database timeout');
      adminReportsService.getDashboardUsers.mockRejectedValueOnce(err);

      await expect(controller.getDashboardUsers(queryDto)).rejects.toThrow(err);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        2,
        5,
        undefined,
        'name:desc',
      );
    });

    it('should handle maximal inputs (all fields populated)', async () => {
      const queryDto = {
        page: 10,
        limit: 200,
        search: 'alice',
        sortBy: 'role:asc',
      } as any;
      const mockResponse = {
        message: 'Dashboard Users fetched successfully',
        data: {
          users: [{ ...sampleUser, name: 'Alice' }],
          total: 1,
          page: 10,
          limit: 200,
        },
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(mockResponse);

      const result = await controller.getDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        10,
        200,
        'alice',
        'role:asc',
      );
    });

    it('should handle minimal inputs (only required pagination fields)', async () => {
      const queryDto = { page: 1, limit: 1 } as any;
      const mockResponse = {
        message: 'Dashboard Users fetched successfully',
        data: {
          users: [{ ...sampleUser, id: 99, name: 'Only One' }],
          total: 1,
          page: 1,
          limit: 1,
        },
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(mockResponse);

      const result = await controller.getDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        1,
        1,
        undefined,
        undefined,
      );
    });

    it('should coerce string page/limit from DTO pipes and forward numbers', async () => {
      const queryDto = { page: '2', limit: '15', search: 'bob' } as any;
      const mockResponse = {
        message: 'Dashboard Users fetched successfully',
        data: { users: [], total: 0, page: 2, limit: 15 },
      };
      adminReportsService.getDashboardUsers.mockResolvedValueOnce(mockResponse);

      const result = await controller.getDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.getDashboardUsers).toHaveBeenCalledWith(
        '2',
        '15',
        'bob',
        undefined,
      );
    });
  });

  describe('exportDashboardUsers', () => {
    const baseQuery = {
      page: 1,
      limit: 10,
      search: undefined,
      sortBy: undefined,
    };

    it('should export users successfully (success + response time)', async () => {
      const queryDto = { ...baseQuery };
      const mockResponse = {
        message: 'Users exported successfully',
        data: {
          filePath: 'exports/admin-reports/users/users-20251014T153000.xlsx',
        },
      };
      adminReportsService.exportDashboardUsers.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.exportDashboardUsers(queryDto as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        queryDto.page,
        queryDto.limit,
        queryDto.search,
        queryDto.sortBy,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass pagination, search and sort to service', async () => {
      const queryDto = {
        page: 3,
        limit: 25,
        search: 'iresh',
        sortBy: 'name:asc',
      };
      const mockResponse = {
        message: 'Users exported successfully',
        data: {
          filePath: 'exports/admin-reports/users/users-20251014T160000.xlsx',
        },
      };
      adminReportsService.exportDashboardUsers.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.exportDashboardUsers(queryDto as any);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        3,
        25,
        'iresh',
        'name:asc',
      );
    });

    it('should return empty export gracefully when no users found', async () => {
      const queryDto = { page: 2, limit: 10 } as any;
      const mockResponse = {
        message: 'No users found to export',
        data: [],
      };
      adminReportsService.exportDashboardUsers.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.exportDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        2,
        10,
        undefined,
        undefined,
      );
    });

    it('should enforce response time even for large datasets (success + response time)', async () => {
      const queryDto = {
        page: 5,
        limit: 100,
        search: 'corp',
        sortBy: 'totalBookings:desc',
      } as any;
      const mockResponse = {
        message: 'Users exported successfully',
        data: {
          filePath: 'exports/admin-reports/users/users-20251014T161500.xlsx',
        },
      };
      adminReportsService.exportDashboardUsers.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.exportDashboardUsers(queryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        5,
        100,
        'corp',
        'totalBookings:desc',
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      const queryDto = { page: 1, limit: 10 } as any;
      adminReportsService.exportDashboardUsers.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to export dashboard users'),
      );

      await expect(controller.exportDashboardUsers(queryDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const queryDto = { page: 2, limit: 5, sortBy: 'name:desc' } as any;
      const err = new Error('S3 down');
      adminReportsService.exportDashboardUsers.mockRejectedValueOnce(err);

      await expect(controller.exportDashboardUsers(queryDto)).rejects.toThrow(
        err,
      );
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        2,
        5,
        undefined,
        'name:desc',
      );
    });

    it('should handle maximal inputs (all fields populated)', async () => {
      const queryDto = {
        page: 10,
        limit: 200,
        search: 'alice',
        sortBy: 'role:asc',
      } as any;
      const mockResponse = {
        message: 'Users exported successfully',
        data: {
          filePath: 'exports/admin-reports/users/users-20251014T170000.xlsx',
        },
      };
      adminReportsService.exportDashboardUsers.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.exportDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        10,
        200,
        'alice',
        'role:asc',
      );
    });

    it('should handle minimal inputs (only required pagination fields)', async () => {
      const queryDto = { page: 1, limit: 1 } as any;
      const mockResponse = {
        message: 'Users exported successfully',
        data: {
          filePath: 'exports/admin-reports/users/users-20251014T171000.xlsx',
        },
      };
      adminReportsService.exportDashboardUsers.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.exportDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        1,
        1,
        undefined,
        undefined,
      );
    });

    it('should coerce string page/limit from DTO pipes and forward numbers', async () => {
      const queryDto = { page: '2', limit: '15', search: 'bob' } as any;
      const mockResponse = {
        message: 'Users exported successfully',
        data: {
          filePath: 'exports/admin-reports/users/users-20251014T172000.xlsx',
        },
      };
      adminReportsService.exportDashboardUsers.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.exportDashboardUsers(queryDto);

      expect(result).toEqual(mockResponse);
      // NOTE: if your DTO pipes coerce to numbers, expect 2 and 15 below.
      // Keep this matching your getDashboardUsers test style:
      expect(adminReportsService.exportDashboardUsers).toHaveBeenCalledWith(
        '2',
        '15',
        'bob',
        undefined,
      );
    });
  });

  describe('userBookings', () => {
    const baseQuery = {
      userId: undefined,
      page: 1,
      limit: 10,
      search: undefined,
      brandId: undefined,
      projectIds: undefined,
      unitStatus: undefined,
      incentiveStatus: undefined,
      startDate: undefined,
      endDate: undefined,
      rmIds: undefined,
      sortBy: undefined,
    };

    const sampleBooking = {
      id: '1',
      bookingId: 'BK-001',
      vendor: 'V1',
      unitStatus: 'Qualified',
      customerName: 'Alice',
      projectName: 'Project X',
      phaseName: 'Phase 1',
      propertyNo: 'A-101',
      bookingDate: '2025-09-01',
      sapBookingDate: '2025-09-02',
      agreementReceivedDate: '2025-09-05',
      receivedDate: '2025-09-10',
      receivedPercentage: '80',
      grossTotalValue: '1000000',
      incentivePercentage: '2',
      incentiveAmount: '20000',
      paymentStatus: 'PAID',
      saleType: 'Retail',
      stage: 'Primary',
      qualificationDate: '2025-09-07',
      paidDate: '2025-09-12',
      cancellationDate: null,
      rmName: 'RM-1',
      empCode: 'EMP001',
      ineligibilityReason: null,
      policyUsed: 'Std Policy',
    };

    const successEnvelope = (
      query: any,
      bookings = [sampleBooking],
      totals = {
        total: 1,
        incentiveAmountSum: 20000,
        grossTotalValueSum: 1000000,
      },
    ) => ({
      message: '',
      data: {
        bookings,
        total: totals.total,
        page: query.page!,
        limit: query.limit!,
        incentiveAmountSum: totals.incentiveAmountSum,
        grossTotalValueSum: totals.grossTotalValueSum,
      },
    });

    it('should fetch user bookings successfully (success + response time)', async () => {
      const query = { ...baseQuery };
      const mockResponse = successEnvelope(query);
      adminReportsService.userBookings.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.userBookings(query as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        userId: undefined,
        page: 1,
        limit: 10,
        search: undefined,
        brandId: undefined,
        projectIds: undefined,
        unitStatus: undefined,
        incentiveStatus: undefined,
        startDate: undefined,
        endDate: undefined,
        rmIds: undefined,
        sortBy: undefined,
      });
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass all filters and sort to service', async () => {
      const query = {
        userId: 12,
        page: 3,
        limit: 25,
        search: 'al',
        brandId: [1, 2],
        projectIds: [10, 11],
        unitStatus: 'QUALIFIED',
        incentiveStatus: 'PAID',
        startDate: '2025-08-01',
        endDate: '2025-09-30',
        rmIds: undefined,
        sortBy: 'bookingDate:asc',
      } as any;

      const mockResponse = successEnvelope(query, [sampleBooking], {
        total: 5,
        incentiveAmountSum: 50000,
        grossTotalValueSum: 4500000,
      });
      adminReportsService.userBookings.mockResolvedValueOnce(mockResponse);

      const result = await controller.userBookings(query);

      expect(result).toEqual(mockResponse);
      // startDate/endDate must be converted to Date objects by controller
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        userId: 12,
        page: 3,
        limit: 25,
        search: 'al',
        brandId: [1, 2],
        projectIds: [10, 11],
        unitStatus: 'QUALIFIED',
        incentiveStatus: 'PAID',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-09-30'),
        rmIds: undefined,
        sortBy: 'bookingDate:asc',
      });
    });

    it('should forward rmIds array when provided (without userId)', async () => {
      const query = {
        ...baseQuery,
        rmIds: [7, 8, 9],
        search: 'x',
        sortBy: 'projectName:desc',
      } as any;

      const mockResponse = successEnvelope(query, [sampleBooking]);
      adminReportsService.userBookings.mockResolvedValueOnce(mockResponse);

      const result = await controller.userBookings(query);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        userId: undefined,
        page: 1,
        limit: 10,
        search: 'x',
        brandId: undefined,
        projectIds: undefined,
        unitStatus: undefined,
        incentiveStatus: undefined,
        startDate: undefined,
        endDate: undefined,
        rmIds: [7, 8, 9],
        sortBy: 'projectName:desc',
      });
    });

    it('should return empty list gracefully', async () => {
      const query = { ...baseQuery, page: 2, limit: 5 } as any;
      const mockResponse = {
        message: '',
        data: {
          bookings: [],
          total: 0,
          page: 2,
          limit: 5,
          incentiveAmountSum: 0,
          grossTotalValueSum: 0,
        },
      };
      adminReportsService.userBookings.mockResolvedValueOnce(mockResponse);

      const result = await controller.userBookings(query);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should enforce response time even for larger results (success + response time)', async () => {
      const query = {
        ...baseQuery,
        page: 4,
        limit: 100,
        search: 'corp',
      } as any;
      const big = Array.from({ length: 100 }, (_, i) => ({
        ...sampleBooking,
        id: i + 1 + '',
        bookingId: `BK-${i + 1}`,
        customerName: `Cust ${i + 1}`,
      }));

      const mockResponse = {
        message: '',
        data: {
          bookings: big,
          total: 1000,
          page: 4,
          limit: 100,
          incentiveAmountSum: 250000,
          grossTotalValueSum: 90000000,
        },
      };
      adminReportsService.userBookings.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.userBookings(query);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    // ----- Controller validation errors (thrown before service is called) -----

    it('should throw BadRequest when only startDate is provided', async () => {
      const query = { ...baseQuery, startDate: '2025-09-01' } as any;

      await expect(controller.userBookings(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.userBookings).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when only endDate is provided', async () => {
      const query = { ...baseQuery, endDate: '2025-09-30' } as any;

      await expect(controller.userBookings(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.userBookings).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when startDate is after endDate', async () => {
      const query = {
        ...baseQuery,
        startDate: '2025-10-01',
        endDate: '2025-09-01',
      } as any;

      await expect(controller.userBookings(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.userBookings).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when both userId and rmIds are provided', async () => {
      const query = { ...baseQuery, userId: 1, rmIds: [2, 3] } as any;

      await expect(controller.userBookings(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.userBookings).not.toHaveBeenCalled();
    });

    // ----- Propagated errors from service -----

    it('should surface BadRequestException from service (e.g., invalid sort field)', async () => {
      const query = { ...baseQuery, sortBy: 'unknownField:asc' } as any;
      adminReportsService.userBookings.mockRejectedValueOnce(
        new BadRequestException(
          'Invalid sort field "unknownField". Allowed fields: projectName, bookingDate, agreementReceivedDate, qualificationDate, receivedDate, paidDate, grossTotalValue, incentivePercentage, incentiveAmount, receivedPercentage, rmName, paymentStatus, unitStatus, stage, saleType, empCode',
        ),
      );

      await expect(controller.userBookings(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      const query = { ...baseQuery } as any;
      adminReportsService.userBookings.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to fetch bookings'),
      );

      await expect(controller.userBookings(query)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should propagate generic errors from the service', async () => {
      const query = { ...baseQuery, sortBy: 'bookingDate:desc' } as any;
      const err = new Error('DB timeout');
      adminReportsService.userBookings.mockRejectedValueOnce(err);

      await expect(controller.userBookings(query)).rejects.toThrow(err);
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
    });

    // ----- Coercion cases (strings → numbers for page/limit if your pipes do it elsewhere) -----

    it('should coerce string page/limit and pass Date objects for start/end', async () => {
      const query = {
        userId: undefined,
        page: '2',
        limit: '15',
        search: 'bob',
        brandId: [1],
        projectIds: [2, 3],
        unitStatus: 'QUALIFIED',
        incentiveStatus: 'PAID',
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        rmIds: undefined,
        sortBy: 'paidDate:desc',
      } as any;

      const mockResponse = {
        message: '',
        data: {
          bookings: [],
          total: 0,
          page: 2,
          limit: 15,
          incentiveAmountSum: 0,
          grossTotalValueSum: 0,
        },
      };
      adminReportsService.userBookings.mockResolvedValueOnce(mockResponse);

      const result = await controller.userBookings(query);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.userBookings).toHaveBeenCalledWith({
        userId: undefined,
        page: '2',
        limit: '15',
        search: 'bob',
        brandId: [1],
        projectIds: [2, 3],
        unitStatus: 'QUALIFIED',
        incentiveStatus: 'PAID',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        rmIds: undefined,
        sortBy: 'paidDate:desc',
      });
    });
  });

  describe('exportUserBookings', () => {
    const baseQuery = {
      userId: undefined,
      page: 1,
      limit: 10,
      search: undefined,
      brandId: undefined,
      projectIds: undefined,
      unitStatus: undefined,
      incentiveStatus: undefined,
      startDate: undefined,
      endDate: undefined,
      rmIds: undefined,
      sortBy: undefined,
    };

    it('should export user bookings successfully (success + response time)', async () => {
      const query = { ...baseQuery };
      const mockResponse = {
        message: 'User bookings exported successfully',
        data: {
          filePath:
            'exports/admin-reports/user-bookings/Recent-Bookings-20251014T170000.xlsx',
        },
      };
      adminReportsService.exportUserBookings.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.exportUserBookings(query as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportUserBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass all filters and sort to service (including Date conversion)', async () => {
      const query = {
        userId: 42,
        page: 3,
        limit: 25,
        search: 'alpha',
        brandId: [1, 2],
        projectIds: [10, 11],
        unitStatus: 'QUALIFIED',
        incentiveStatus: 'PAID',
        startDate: '2025-08-01',
        endDate: '2025-09-30',
        rmIds: [7, 8],
        sortBy: 'bookingDate:asc',
      } as any;

      const mockResponse = {
        message: 'User bookings exported successfully',
        data: {
          filePath:
            'exports/admin-reports/user-bookings/RM-Name-20251014T171500.xlsx',
        },
      };
      adminReportsService.exportUserBookings.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.exportUserBookings(query);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportUserBookings).toHaveBeenCalledWith({
        userId: 42,
        page: 3,
        limit: 25,
        search: 'alpha',
        brandId: [1, 2],
        projectIds: [10, 11],
        unitStatus: 'QUALIFIED',
        incentiveStatus: 'PAID',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-09-30'),
        rmIds: [7, 8],
        sortBy: 'bookingDate:asc',
      });
    });

    it('should return empty export gracefully when no bookings found', async () => {
      const query = { ...baseQuery, page: 2, limit: 50 } as any;
      const mockResponse = {
        message: 'No qualified bookings found to export.',
        data: [],
        limit: 50,
      };
      adminReportsService.exportUserBookings.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.exportUserBookings(query);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportUserBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should enforce response time even for larger result sets (success + response time)', async () => {
      const query = {
        ...baseQuery,
        page: 4,
        limit: 100,
        search: 'corp',
        sortBy: 'paidDate:desc',
      } as any;
      const mockResponse = {
        message: 'User bookings exported successfully',
        data: {
          filePath:
            'exports/admin-reports/user-bookings/Recent-Bookings-20251014T173000.xlsx',
        },
      };
      adminReportsService.exportUserBookings.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.exportUserBookings(query);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.exportUserBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    // ---- Controller validations (pre-service) ----

    it('should throw BadRequest when only startDate is provided', async () => {
      const query = { ...baseQuery, startDate: '2025-09-01' } as any;

      await expect(controller.exportUserBookings(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.exportUserBookings).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when only endDate is provided', async () => {
      const query = { ...baseQuery, endDate: '2025-09-30' } as any;

      await expect(controller.exportUserBookings(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.exportUserBookings).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when startDate is after endDate', async () => {
      const query = {
        ...baseQuery,
        startDate: '2025-10-10',
        endDate: '2025-09-15',
      } as any;

      await expect(controller.exportUserBookings(query)).rejects.toThrow(
        BadRequestException,
      );
      expect(adminReportsService.exportUserBookings).not.toHaveBeenCalled();
    });

    // ---- Propagated errors from service ----

    it('should surface InternalServerErrorException when service fails', async () => {
      const query = { ...baseQuery } as any;
      adminReportsService.exportUserBookings.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to export user bookings'),
      );

      await expect(controller.exportUserBookings(query)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(adminReportsService.exportUserBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should propagate generic errors from the service', async () => {
      const query = { ...baseQuery, sortBy: 'bookingDate:desc' } as any;
      const err = new Error('S3 down');
      adminReportsService.exportUserBookings.mockRejectedValueOnce(err);

      await expect(controller.exportUserBookings(query)).rejects.toThrow(err);
      expect(adminReportsService.exportUserBookings).toHaveBeenCalledWith({
        ...query,
        startDate: undefined,
        endDate: undefined,
      });
    });

    // ---- Coercion case (strings → numbers if your pipes do NOT coerce before controller) ----

    it('should coerce string page/limit and pass Date objects for start/end', async () => {
      const query = {
        userId: 55,
        page: '2',
        limit: '15',
        search: 'bob',
        brandId: [1],
        projectIds: [2, 3],
        unitStatus: 'QUALIFIED',
        incentiveStatus: 'PAID',
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        rmIds: undefined,
        sortBy: 'paidDate:desc',
      } as any;

      const mockResponse = {
        message: 'User bookings exported successfully',
        data: {
          filePath:
            'exports/admin-reports/user-bookings/Some-User-20251014T180000.xlsx',
        },
      };
      adminReportsService.exportUserBookings.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.exportUserBookings(query);

      expect(result).toEqual(mockResponse);
      // If your DTO pipes already coerce to numbers before the controller, change '2','15' -> 2,15 below.
      expect(adminReportsService.exportUserBookings).toHaveBeenCalledWith({
        userId: 55,
        page: '2',
        limit: '15',
        search: 'bob',
        brandId: [1],
        projectIds: [2, 3],
        unitStatus: 'QUALIFIED',
        incentiveStatus: 'PAID',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        rmIds: undefined,
        sortBy: 'paidDate:desc',
      });
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status successfully (success + response time)', async () => {
      const ids = '1,2,3';
      const paymentStatus = PaymentStatusEnum.HOLD;
      const mockResponse = { message: '3 booking(s) updated successfully.' };

      adminReportsService.updatePaymentStatus.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.updatePaymentStatus(
        ids,
        paymentStatus as any,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        [1, 2, 3],
        PaymentStatusEnum.HOLD,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should pass trimmed ids and valid enum to service', async () => {
      const ids = ' 7 ,  8,9  , x , ,10 ';
      const paymentStatus = PaymentStatusEnum.PAYABLE;
      const mockResponse = { message: '4 booking(s) updated successfully.' };

      adminReportsService.updatePaymentStatus.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.updatePaymentStatus(
        ids,
        paymentStatus as any,
      );

      expect(result).toEqual(mockResponse);
      // 'x' and empty entries are filtered out
      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        [7, 8, 9, 0, 10],
        PaymentStatusEnum.PAYABLE,
      );
    });

    // ----- Controller validations (pre-service) -----

    it('should throw BadRequest when "ids" is missing', async () => {
      await expect(
        controller.updatePaymentStatus(
          undefined as any,
          PaymentStatusEnum.PAID as any,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(adminReportsService.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when "ids" has no valid numbers', async () => {
      const ids = 'a,b,c';
      await expect(
        controller.updatePaymentStatus(ids, PaymentStatusEnum.PAID as any),
      ).rejects.toThrow(BadRequestException);

      expect(adminReportsService.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should throw BadRequest for invalid paymentStatus', async () => {
      const ids = '1,2';
      const invalidStatus = 'UNKNOWN_STATUS';

      await expect(
        controller.updatePaymentStatus(ids, invalidStatus as any),
      ).rejects.toThrow(BadRequestException);

      expect(adminReportsService.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should surface NotFoundException from service when no valid bookings', async () => {
      const ids = '100,200';
      const status = PaymentStatusEnum.PAYABLE;

      adminReportsService.updatePaymentStatus.mockRejectedValueOnce(
        new NotFoundException('No valid bookings found for the provided IDs'),
      );

      await expect(
        controller.updatePaymentStatus(ids, status as any),
      ).rejects.toThrow(NotFoundException);

      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        [100, 200],
        PaymentStatusEnum.PAYABLE,
      );
    });

    it('should surface BadRequestException from service when trying to change already PAID', async () => {
      const ids = '5,6';
      const status = PaymentStatusEnum.HOLD;

      adminReportsService.updatePaymentStatus.mockRejectedValueOnce(
        new BadRequestException(
          "Cannot change status of already 'Paid' bookings: 5",
        ),
      );

      await expect(
        controller.updatePaymentStatus(ids, status as any),
      ).rejects.toThrow(BadRequestException);

      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        [5, 6],
        PaymentStatusEnum.HOLD,
      );
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      const ids = '1';
      const status = PaymentStatusEnum.PAID;

      adminReportsService.updatePaymentStatus.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to update payment status'),
      );

      await expect(
        controller.updatePaymentStatus(ids, status as any),
      ).rejects.toThrow(InternalServerErrorException);

      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        [1],
        PaymentStatusEnum.PAID,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const ids = '2,3';
      const status = PaymentStatusEnum.PAID;
      const err = new Error('DB write timeout');

      adminReportsService.updatePaymentStatus.mockRejectedValueOnce(err);

      await expect(
        controller.updatePaymentStatus(ids, status as any),
      ).rejects.toThrow(err);

      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        [2, 3],
        PaymentStatusEnum.PAID,
      );
    });

    // ----- Edge cases -----

    it('should accept single id and PAID status (processSelectedIncentivePayments path in service)', async () => {
      const ids = '999';
      const status = PaymentStatusEnum.PAID;
      const mockResponse = { message: '1 booking(s) updated successfully.' };

      adminReportsService.updatePaymentStatus.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.updatePaymentStatus(ids, status as any);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        [999],
        PaymentStatusEnum.PAID,
      );
    });

    it('should ignore spaces and extra commas in ids', async () => {
      const ids = ' , , 4 ,  ,  5,,6, ';
      const status = PaymentStatusEnum.HOLD;
      const mockResponse = { message: '3 booking(s) updated successfully.' };

      adminReportsService.updatePaymentStatus.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.updatePaymentStatus(ids, status as any);

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        [0, 0, 4, 0, 5, 0, 6, 0],
        PaymentStatusEnum.HOLD,
      );
    });

    it('should meet performance budget even with many ids (success + response time)', async () => {
      const ids = Array.from({ length: 200 }, (_, i) => i + 1).join(',');
      const status = PaymentStatusEnum.PAYABLE;
      const mockResponse = { message: '200 booking(s) updated successfully.' };

      adminReportsService.updatePaymentStatus.mockResolvedValueOnce(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.updatePaymentStatus(ids, status as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(adminReportsService.updatePaymentStatus).toHaveBeenCalledWith(
        expect.arrayContaining([1, 200]),
        PaymentStatusEnum.PAYABLE,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
