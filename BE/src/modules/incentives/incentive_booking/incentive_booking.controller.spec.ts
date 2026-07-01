import * as fs from 'fs';
import { Test, TestingModule } from '@nestjs/testing';
import { IncentiveBookingController } from './incentive_booking.controller';
import { IncentiveBookingService } from './incentive_booking.service';
import { SapService } from '../sap/sap.service';
import { NotificationService } from '../../notifications/notification.service';
import { IncentiveBookingOverridesService } from '../incentive_booking_overrides/incentive_booking_overrides.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Users } from 'src/entities';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RolesEnum } from 'src/enums/roles.enum';
import { BadRequestException, HttpException } from '@nestjs/common';

describe('IncentiveBookingController', () => {
  let controller: IncentiveBookingController;

  const mockIncentiveService = {
    insertDataInMultipleTablesBasedOnApi: jest.fn(),
    findAllBookings: jest.fn(),
    bulkUpdatePayableReceivedDatesFromExcel: jest.fn(),
    bulkUpdatePayoutsFromExcel: jest.fn(),
    bulkUpdateQualifiedDates: jest.fn(),
  };

  const mockSapService = {
    getSapData: jest.fn(),
  };

  const mockNotificationService = {
    create: jest.fn(),
  };

  const mockOverrideService = {
    getLatestOverridesMap: jest.fn(),
  };

  const mockUsersRepo = {
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([
          { id: 1, empCode: 'E001', role: { name: RolesEnum.RM }, dbId: 1 },
        ]),
    })),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncentiveBookingController],
      providers: [
        { provide: IncentiveBookingService, useValue: mockIncentiveService },
        { provide: SapService, useValue: mockSapService },
        { provide: NotificationService, useValue: mockNotificationService },
        {
          provide: IncentiveBookingOverridesService,
          useValue: mockOverrideService,
        },
        { provide: getRepositoryToken(Users), useValue: mockUsersRepo },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    controller = module.get<IncentiveBookingController>(
      IncentiveBookingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should start background process when no cache', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(true);

      const result = await controller.create();
      expect(result).toEqual({
        message:
          'Booking data collection and processing has started. You will be notified once it is completed.',
      });
      expect(mockCache.set).toHaveBeenCalledWith('bookingflag', true, {
        ttl: 600000,
      });
    });

    it('should return message if cache exists', async () => {
      mockCache.get.mockResolvedValue(true);

      const result = await controller.create();
      expect(result).toEqual({
        message: 'Booking data collection is already in progress.',
      });
    });

    it('should throw InternalServerErrorException on unknown error', async () => {
      mockCache.get.mockRejectedValue(new Error('test error'));

      await expect(controller.create()).rejects.toThrow(HttpException);
    });
  });

  describe('bulkUpdatePayableDates', () => {
    it('should call service and return result', async () => {
      const mockResponse = { success: true };
      mockIncentiveService.bulkUpdatePayableReceivedDatesFromExcel.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.bulkUpdatePayableDates();
      expect(result).toEqual(mockResponse);
      expect(
        mockIncentiveService.bulkUpdatePayableReceivedDatesFromExcel,
      ).toHaveBeenCalled();
    });
  });

  describe('bulkUpdatePayouts', () => {
    it('should call service with updateOnlyDates true when query param is true', async () => {
      const mockResponse = { success: true };
      mockIncentiveService.bulkUpdatePayoutsFromExcel.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.bulkUpdatePayouts('true');
      expect(result).toEqual(mockResponse);
      expect(
        mockIncentiveService.bulkUpdatePayoutsFromExcel,
      ).toHaveBeenCalledWith(true);
    });

    it('should call service with updateOnlyDates false when query param is absent', async () => {
      const mockResponse = { success: true };
      mockIncentiveService.bulkUpdatePayoutsFromExcel.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.bulkUpdatePayouts();
      expect(result).toEqual(mockResponse);
      expect(
        mockIncentiveService.bulkUpdatePayoutsFromExcel,
      ).toHaveBeenCalledWith(false);
    });
  });

  describe('bulkUpdateQualifiedDates', () => {
    it('should call service and return result', async () => {
      const mockResponse = { success: true };
      mockIncentiveService.bulkUpdateQualifiedDates.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.bulkUpdateQualifiedDates();
      expect(result).toEqual(mockResponse);
      expect(mockIncentiveService.bulkUpdateQualifiedDates).toHaveBeenCalled();
    });
  });

  describe('findAllBookings', () => {
    it('should throw BadRequestException if projectIds contain non-numbers', async () => {
      const query = {
        projectIds: '1,abc',
        page: 1,
        limit: 10,
        type: '',
        incentiveFilter: '',
      };
      await expect(
        controller.findAllBookings(query, { role: RolesEnum.RM }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create records from file successfully', async () => {
      const jsonData = [{ opportunityId: 'OPP-111' }];
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(jsonData));
      mockIncentiveService.insertDataInMultipleTablesBasedOnApi.mockResolvedValue(
        { success: true },
      );

      const result = await controller.createFromFile();

      expect(
        mockIncentiveService.insertDataInMultipleTablesBasedOnApi,
      ).toHaveBeenCalledWith(jsonData);
      expect(result).toBeUndefined();
    });

    it('should handle invalid JSON in createFromFile gracefully', async () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue('invalid json');
      mockIncentiveService.insertDataInMultipleTablesBasedOnApi.mockResolvedValue(
        { success: true },
      );

      await expect(controller.createFromFile()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should test API endpoint and write combined data file', async () => {
      mockUsersRepo
        .createQueryBuilder()
        .getMany.mockResolvedValue([{ id: 1, empCode: 'E001' }] as any);
      mockSapService.getSapData.mockResolvedValue({
        data: { root: { root: [{ id: 1, sample: true }] } },
      });
      const spyWriteFile = jest
        .spyOn(fs.promises, 'writeFile')
        .mockResolvedValue();

      const result = await controller.testApi();

      expect(mockSapService.getSapData).toHaveBeenCalled();
      expect(spyWriteFile).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Test API call successful',
        data: [{ id: 1, sample: true }],
      });
    });
  });

  it('should call service.findAllBookings with RM user', async () => {
    const query = { page: 1, limit: 10, type: '', incentiveFilter: '' };
    const mockResult = [{ id: 1 }];
    mockIncentiveService.findAllBookings.mockResolvedValue(mockResult);

    const result = await controller.findAllBookings(query, {
      role: RolesEnum.RM,
      dbId: 5,
    });

    expect(result).toEqual(mockResult);
    expect(mockIncentiveService.findAllBookings).toHaveBeenCalledWith({
      userId: 5, // matches dbId
      page: 1,
      limit: 10,
      type: '',
      incentiveFilter: '',
      projectIds: undefined,
      month: undefined,
      year: undefined,
      search: undefined,
    });
  });

  it('should call service.findAllBookings with RM ID from query for admin', async () => {
    const query = {
      page: 1,
      limit: 10,
      type: '',
      incentiveFilter: '',
      rmId: '99',
    };
    const mockResult = [{ id: 1 }];
    mockIncentiveService.findAllBookings.mockResolvedValue(mockResult);

    const result = await controller.findAllBookings(query, {
      role: RolesEnum.ADMIN,
    });

    expect(result).toEqual(mockResult);
    expect(mockIncentiveService.findAllBookings).toHaveBeenCalledWith({
      userId: 99, // matches query.rmId
      page: 1,
      limit: 10,
      type: '',
      incentiveFilter: '',
      projectIds: undefined,
      month: undefined,
      year: undefined,
      search: undefined,
    });
  });
});
