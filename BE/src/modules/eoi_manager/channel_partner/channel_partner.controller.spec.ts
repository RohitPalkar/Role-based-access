import { Test, TestingModule } from '@nestjs/testing';
import { ChannelPartnerController } from './channel_partner.controller';
import { ChannelPartnerService } from './channel_partner.service';
import { CreateChannelPartnerDto } from './dto/create-channel-partner.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryChannelPartnerDto } from './dto/query-channel-partner.dto';
import { TEST_EXECUTION_TIME } from 'src/config/constants';

describe('ChannelPartnerController', () => {
  let controller: ChannelPartnerController;

  const mockChannelPartnerService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findByLinkId: jest.fn(),
    exportChannelPartners: jest.fn(),
    cpDropdown: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelPartnerController],
      providers: [
        { provide: ChannelPartnerService, useValue: mockChannelPartnerService },
      ],
    }).compile();

    controller = module.get<ChannelPartnerController>(ChannelPartnerController);
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    const mockUser = { dbId: 42, id: 'user-42', email: 'rm@example.com' };

    it('should return all channel partners successfully with campaign names and voucher counts', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [
            {
              id: 1,
              name: 'Partner One',
              email: 'partner1@example.com',
              linkId: 'CP-123456',
              campaignName: 'Project Alpha',
              noOfVouchers: 5,
              region: 'South',
              address: '123 Main St, City',
              status: 'active',
              createdAt: new Date('2024-01-15T10:30:00Z'),
              updatedAt: new Date('2024-01-15T10:30:00Z'),
            },
            {
              id: 2,
              name: 'Partner Two',
              email: 'partner2@example.com',
              linkId: 'CP-789012',
              campaignName: 'Project Beta',
              noOfVouchers: 3,
              region: 'North',
              address: '456 Another St, City',
              status: 'active',
              createdAt: new Date('2024-01-14T09:15:00Z'),
              updatedAt: new Date('2024-01-14T09:15:00Z'),
            },
          ],
          page: 1,
          total: 2,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, {});

      expect(result.success).toBe(true);
      expect(result.message).toBe('Channel partners retrieved successfully');
      expect(result.data.result).toHaveLength(2);

      // Verify first partner data
      expect(result.data.result[0].id).toBe(1);
      expect(result.data.result[0].name).toBe('Partner One');
      expect(result.data.result[0].campaignName).toBe('Project Alpha');
      expect(result.data.result[0].noOfVouchers).toBe(5);
      expect(result.data.result[0].campaignId).toBeUndefined(); // campaignId should not be present

      // Verify second partner data
      expect(result.data.result[1].id).toBe(2);
      expect(result.data.result[1].name).toBe('Partner Two');
      expect(result.data.result[1].campaignName).toBe('Project Beta');
      expect(result.data.result[1].noOfVouchers).toBe(3);
      expect(result.data.result[1].campaignId).toBeUndefined(); // campaignId should not be present

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should return empty array when no partners exist', async () => {
      const mockResponse = {
        success: true,
        message: 'No channel partners found',
        data: {
          result: [],
          page: 0,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, {});

      expect(result.success).toBe(true);
      expect(result.message).toBe('No channel partners found');
      expect(result.data.result).toHaveLength(0);
      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should handle channel partners with null campaign names', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [
            {
              id: 3,
              name: 'Partner Without Campaign',
              email: 'nocampaign@example.com',
              linkId: 'CP-345678',
              campaignName: null, // No campaign associated
              noOfVouchers: 0, // No vouchers
              region: 'West',
              address: '789 No Campaign St, City',
              status: 'inactive',
              createdAt: new Date('2024-01-13T08:00:00Z'),
              updatedAt: new Date('2024-01-13T08:00:00Z'),
            },
          ],
          page: 1,
          total: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, {});

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(1);
      expect(result.data.result[0].campaignName).toBeNull();
      expect(result.data.result[0].noOfVouchers).toBe(0);
      expect(result.data.result[0].campaignId).toBeUndefined();
      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should handle channel partners with zero vouchers', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [
            {
              id: 4,
              name: 'New Partner',
              email: 'new@example.com',
              linkId: 'CP-901234',
              campaignName: 'Project Gamma',
              noOfVouchers: 0, // New partner, no vouchers yet
              region: 'East',
              address: '321 New Partner St, City',
              status: 'active',
              createdAt: new Date('2024-01-16T11:00:00Z'),
              updatedAt: new Date('2024-01-16T11:00:00Z'),
            },
          ],
          page: 1,
          total: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, {});

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(1);
      expect(result.data.result[0].noOfVouchers).toBe(0);
      expect(result.data.result[0].campaignName).toBe('Project Gamma');
      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockChannelPartnerService.findAll.mockRejectedValue(dbError);

      await expect(controller.getAll(mockUser, {})).rejects.toThrow(dbError);
      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should call findAll with pagination parameters correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [],
          page: 2,
          total: 50,
          pageSize: 10,
          pageCount: 5,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const queryDto = {
        page: 2,
        limit: 10,
        search: 'partner',
        sortBy: 'name:asc',
      };

      const result = await controller.getAll(mockUser, queryDto);

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        queryDto,
      );
      expect(result.data.page).toBe(2);
      expect(result.data.pageCount).toBe(5);
      expect(result.data.total).toBe(50);
    });

    it('should call findAll with default pagination values when no query params provided', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [],
          page: 1,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, {});

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
    });

    it('should return financial metrics for channel partners', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [
            {
              id: 1,
              name: 'Partner One',
              email: 'partner1@example.com',
              campaignName: 'Project Alpha',
              noOfVouchers: 3,
              voucherValue: 150000.0,
              amountCollected: 120000.0,
              // service formats lastCollectedDate as a string; mock the formatted string
              lastCollectedDate: '15 Aug 2024',
            },
            {
              id: 2,
              name: 'Partner Two',
              email: 'partner2@example.com',
              campaignName: 'Project Beta',
              noOfVouchers: 2,
              voucherValue: 80000.0,
              amountCollected: 60000.0,
              lastCollectedDate: '10 Aug 2024',
            },
          ],
          page: 1,
          total: 2,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, { page: 1, limit: 10 });

      expect(result.data.result[0].voucherValue).toBe(150000.0);
      expect(result.data.result[0].amountCollected).toBe(120000.0);
      expect(result.data.result[0].lastCollectedDate).toBe('15 Aug 2024');
      expect(result.data.result[1].voucherValue).toBe(80000.0);
      expect(result.data.result[1].amountCollected).toBe(60000.0);
      expect(result.data.result[1].lastCollectedDate).toBe('10 Aug 2024');
    });

    it('should handle search functionality correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [
            {
              id: 1,
              name: 'Searchable Partner',
              email: 'searchable@example.com',
              campaignName: 'Project Alpha',
              noOfVouchers: 1,
              voucherValue: 50000.0,
              amountCollected: 50000.0,
              lastCollectedDate: '20 Aug 2024',
            },
          ],
          page: 1,
          total: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, {
        search: 'Searchable',
      });

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(mockUser, {
        search: 'Searchable',
      });
      expect(result.data.result[0].name).toBe('Searchable Partner');
    });

    it('should handle sorting functionality correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [
            {
              id: 2,
              name: 'Alpha Partner',
              email: 'alpha@example.com',
              campaignName: 'Project Alpha',
              noOfVouchers: 1,
              voucherValue: 30000.0,
              amountCollected: 30000.0,
              lastCollectedDate: '18 Aug 2024',
            },
            {
              id: 1,
              name: 'Beta Partner',
              email: 'beta@example.com',
              campaignName: 'Project Beta',
              noOfVouchers: 1,
              voucherValue: 40000.0,
              amountCollected: 40000.0,
              lastCollectedDate: '19 Aug 2024',
            },
          ],
          page: 1,
          total: 2,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, { sortBy: 'name:asc' });

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(mockUser, {
        sortBy: 'name:asc',
      });
      expect(result.data.result[0].name).toBe('Alpha Partner');
      expect(result.data.result[1].name).toBe('Beta Partner');
    });
  });

  describe('create', () => {
    const mockUser = { dbId: 123, id: 123, name: 'Test RM' };

    it('should create channel partner successfully', async () => {
      const createDto: CreateChannelPartnerDto = {
        cpName: 'Test Partner',
        email: 'test@example.com',
        countryCode: '+91',
        contactNumber: '9876543210',
        region: 'South',
        address: '123 Main St, City',
        campaignId: 1,
      };

      const mockResponse = {
        success: true,
        message: 'Channel Partner Link created successfully',
        data: {
          id: 1,
          ...createDto,
          linkId: 'CP-123456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockChannelPartnerService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto, mockUser);

      expect(result.success).toBe(true);
      expect(result.data.cpName).toBe('Test Partner');
      expect(result.data.linkId).toBe('CP-123456');
      expect(mockChannelPartnerService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.dbId,
      );
    });

    it('should throw BadRequestException when partner already exists', async () => {
      const createDto: CreateChannelPartnerDto = {
        cpName: 'Existing Partner',
        email: 'existing@example.com',
        countryCode: '+91',
        contactNumber: '9876543210',
        region: 'North',
        address: '456 Another St, City',
        campaignId: 1,
      };

      mockChannelPartnerService.create.mockRejectedValue(
        new BadRequestException(
          'Channel partner with this name already exists',
        ),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockChannelPartnerService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.dbId,
      );
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        name: '',
        email: 'invalid-email',
        countryCode: '+91',
        contactNumber: '123',
        region: 'West',
        address: 'Short',
      } as CreateChannelPartnerDto;

      const validationError = new BadRequestException('Invalid input data');
      mockChannelPartnerService.create.mockRejectedValue(validationError);

      await expect(controller.create(invalidDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockChannelPartnerService.create).toHaveBeenCalledWith(
        invalidDto,
        mockUser.dbId,
      );
    });

    it('should handle different partner configurations', async () => {
      const createDtoWithOptionals: CreateChannelPartnerDto = {
        cpName: 'Full Partner',
        email: 'full@example.com',
        countryCode: '+91',
        contactNumber: '9876543210',
        region: 'East',
        address: '789 Complete Address, City, State',
        campaignId: 2,
        rera: 'RERA12345',
        gst: 'GST67890',
        panNumber: 'ABCDE1234F',
        city: 'Mumbai',
        pinCode: '400001',
      };

      const mockResponse = {
        success: true,
        message: 'Channel Partner Link created successfully',
        data: {
          id: 2,
          ...createDtoWithOptionals,
          linkId: 'CP-789012',
        },
      };

      mockChannelPartnerService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDtoWithOptionals, mockUser);

      expect(result.success).toBe(true);
      expect(result.data.rera).toBe('RERA12345');
      expect(result.data.gst).toBe('GST67890');
      expect(result.data.panNumber).toBe('ABCDE1234F');
      expect(mockChannelPartnerService.create).toHaveBeenCalledWith(
        createDtoWithOptionals,
        mockUser.dbId,
      );
    });

    it('should require name when cpName is "Upcoming Estates"', async () => {
      const createDto: CreateChannelPartnerDto = {
        cpName: 'Upcoming Estates',
        email: 'upcoming@example.com',
        countryCode: '+91',
        contactNumber: '9876543210',
        region: 'South',
        address: '123 Main St, City',
        campaignId: 1,
        // name is missing - should cause validation error
      };

      mockChannelPartnerService.create.mockRejectedValue(
        new BadRequestException(
          'Name is required when cp name is "Upcoming Estates"',
        ),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockChannelPartnerService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.dbId,
      );
    });

    it('should create channel partner successfully when cpName is "Upcoming Estates" and name is provided', async () => {
      const createDto: CreateChannelPartnerDto = {
        cpName: 'Upcoming Estates',
        name: 'New Estate Name',
        email: 'upcoming@example.com',
        countryCode: '+91',
        contactNumber: '9876543210',
        region: 'South',
        address: '123 Main St, City',
        campaignId: 1,
      };

      const mockResponse = {
        success: true,
        message: 'Channel Partner Link created successfully',
        data: {
          id: 1,
          ...createDto,
          linkId: 'CP-123456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockChannelPartnerService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto, mockUser);

      expect(result.success).toBe(true);
      expect(result.data.cpName).toBe('Upcoming Estates');
      expect(result.data.name).toBe('New Estate Name');
      expect(result.data.linkId).toBe('CP-123456');
      expect(mockChannelPartnerService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.dbId,
      );
    });

    it('should create channel partner successfully when cpName is not "Upcoming Estates" and name is not provided', async () => {
      const createDto: CreateChannelPartnerDto = {
        cpName: 'Regular Partner',
        email: 'regular@example.com',
        countryCode: '+91',
        contactNumber: '9876543210',
        region: 'South',
        address: '123 Main St, City',
        campaignId: 1,
        // name is not required for non-Upcoming Estates
      };

      const mockResponse = {
        success: true,
        message: 'Channel Partner Link created successfully',
        data: {
          id: 1,
          ...createDto,
          linkId: 'CP-123456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockChannelPartnerService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(createDto, mockUser);

      expect(result.success).toBe(true);
      expect(result.data.cpName).toBe('Regular Partner');
      expect(result.data.name).toBeUndefined();
      expect(result.data.linkId).toBe('CP-123456');
      expect(mockChannelPartnerService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.dbId,
      );
    });
  });

  describe('getById', () => {
    it('should return channel partner when found', async () => {
      const partnerId = 1;
      const mockResponse = {
        success: true,
        message: 'Channel partner retrieved successfully',
        data: {
          id: partnerId,
          cpName: 'Found Partner',
          email: 'found@example.com',
          linkId: 'CP-456789',
          campaignId: 1,
          region: 'Central',
          address: '123 Found St, City',
        },
      };

      mockChannelPartnerService.findOne.mockResolvedValue(mockResponse);

      const result = await controller.getById(partnerId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(partnerId);
      expect(result.data.cpName).toBe('Found Partner');
      expect(mockChannelPartnerService.findOne).toHaveBeenCalledWith(partnerId);
    });

    it('should throw NotFoundException when partner not found', async () => {
      const partnerId = 999;
      mockChannelPartnerService.findOne.mockRejectedValue(
        new NotFoundException('Channel partner not found'),
      );

      await expect(controller.getById(partnerId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockChannelPartnerService.findOne).toHaveBeenCalledWith(partnerId);
    });

    it('should handle database errors gracefully', async () => {
      const partnerId = 1;
      const dbError = new Error('Database query failed');
      mockChannelPartnerService.findOne.mockRejectedValue(dbError);

      await expect(controller.getById(partnerId)).rejects.toThrow(dbError);
      expect(mockChannelPartnerService.findOne).toHaveBeenCalledWith(partnerId);
    });

    it('should handle invalid ID format', async () => {
      const invalidId = NaN;
      mockChannelPartnerService.findOne.mockRejectedValue(
        new NotFoundException('Channel partner not found'),
      );

      await expect(controller.getById(invalidId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockChannelPartnerService.findOne).toHaveBeenCalledWith(invalidId);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    const mockUser = { dbId: 42, id: 'user-42', email: 'rm@example.com' };

    it('should handle concurrent requests gracefully', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [],
          page: 1,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };
      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      // Simulate concurrent requests
      const promises = [
        controller.getAll(mockUser, {}),
        controller.getAll(mockUser, {}),
        controller.getAll(mockUser, {}),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.result).toBeInstanceOf(Array);
      });

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledTimes(3);
      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should handle service returning unexpected data structure', async () => {
      const unexpectedResponse = {
        unexpectedField: 'unexpected value',
        data: null,
      };

      mockChannelPartnerService.findAll.mockResolvedValue(unexpectedResponse);

      const result = await controller.getAll(mockUser, {});

      // Controller simply returns whatever service returns, so equality is expected
      expect(result).toEqual(unexpectedResponse);
      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should verify correct data structure transformation', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [
            {
              id: 5,
              name: 'Test Partner',
              email: 'test@example.com',
              linkId: 'CP-TEST123',
              campaignName: 'Test Campaign',
              noOfVouchers: 12,
              region: 'Test Region',
              address: 'Test Address',
              status: 'active',
              createdAt: new Date('2024-01-17T12:00:00Z'),
              updatedAt: new Date('2024-01-17T12:00:00Z'),
            },
          ],
          page: 1,
          total: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, {});

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(1);

      const partner = result.data.result[0];

      // Verify all expected fields are present
      expect(partner).toHaveProperty('id');
      expect(partner).toHaveProperty('name');
      expect(partner).toHaveProperty('email');
      expect(partner).toHaveProperty('linkId');
      expect(partner).toHaveProperty('campaignName');
      expect(partner).toHaveProperty('noOfVouchers');
      expect(partner).toHaveProperty('region');
      expect(partner).toHaveProperty('address');
      expect(partner).toHaveProperty('status');
      expect(partner).toHaveProperty('createdAt');
      expect(partner).toHaveProperty('updatedAt');

      // Verify campaignId is NOT present (transformed out)
      expect(partner).not.toHaveProperty('campaignId');

      // Verify data types (createdAt/updatedAt are Date instances from entity)
      expect(typeof partner.id).toBe('number');
      expect(typeof partner.name).toBe('string');
      expect(typeof partner.email).toBe('string');
      expect(typeof partner.linkId).toBe('string');
      // campaignName can be string or null; in this mock it's a string
      expect(typeof partner.campaignName).toBe('string');
      expect(typeof partner.noOfVouchers).toBe('number');
      expect(typeof partner.region).toBe('string');
      expect(typeof partner.address).toBe('string');
      expect(typeof partner.status).toBe('string');
      expect(partner.createdAt).toBeInstanceOf(Date);
      expect(partner.updatedAt).toBeInstanceOf(Date);

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should handle various voucher count scenarios', async () => {
      const mockResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: {
          result: [
            {
              id: 6,
              name: 'High Volume Partner',
              email: 'highvolume@example.com',
              linkId: 'CP-HIGH123',
              campaignName: 'Premium Project',
              noOfVouchers: 150, // High volume partner
              region: 'Premium',
              address: 'Premium Address',
              status: 'active',
              createdAt: new Date('2024-01-10T10:00:00Z'),
              updatedAt: new Date('2024-01-10T10:00:00Z'),
            },
            {
              id: 7,
              name: 'Medium Volume Partner',
              email: 'medium@example.com',
              linkId: 'CP-MED456',
              campaignName: 'Standard Project',
              noOfVouchers: 25, // Medium volume partner
              region: 'Standard',
              address: 'Standard Address',
              status: 'active',
              createdAt: new Date('2024-01-12T11:00:00Z'),
              updatedAt: new Date('2024-01-12T11:00:00Z'),
            },
            {
              id: 8,
              name: 'Low Volume Partner',
              email: 'low@example.com',
              linkId: 'CP-LOW789',
              campaignName: 'Basic Project',
              noOfVouchers: 2, // Low volume partner
              region: 'Basic',
              address: 'Basic Address',
              status: 'active',
              createdAt: new Date('2024-01-15T12:00:00Z'),
              updatedAt: new Date('2024-01-15T12:00:00Z'),
            },
          ],
          page: 1,
          total: 3,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockChannelPartnerService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAll(mockUser, {});

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(3);

      // Verify high volume partner
      expect(result.data.result[0].noOfVouchers).toBe(150);
      expect(result.data.result[0].name).toBe('High Volume Partner');

      // Verify medium volume partner
      expect(result.data.result[1].noOfVouchers).toBe(25);
      expect(result.data.result[1].name).toBe('Medium Volume Partner');

      // Verify low volume partner
      expect(result.data.result[2].noOfVouchers).toBe(2);
      expect(result.data.result[2].name).toBe('Low Volume Partner');

      // Verify all have campaign names but no campaignId
      result.data.result.forEach((partner) => {
        expect(partner).toHaveProperty('campaignName');
        expect(partner).not.toHaveProperty('campaignId');
        expect(typeof partner.noOfVouchers).toBe('number');
        expect(partner.noOfVouchers).toBeGreaterThanOrEqual(0);
      });

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        mockUser,
        {},
      );
    });

    it('should handle mixed success and failure scenarios', async () => {
      // First call succeeds
      const successResponse = {
        success: true,
        message: 'Channel partners retrieved successfully',
        data: { result: [], page: 1, total: 0, pageSize: 10, pageCount: 0 },
      };
      mockChannelPartnerService.findAll.mockResolvedValueOnce(successResponse);

      // Second call fails
      const error = new Error('Service error');
      mockChannelPartnerService.findAll.mockRejectedValueOnce(error);

      // Third call succeeds again
      mockChannelPartnerService.findAll.mockResolvedValueOnce(successResponse);

      // Execute calls
      const result1 = await controller.getAll(mockUser, {});
      expect(result1.success).toBe(true);

      await expect(controller.getAll(mockUser, {})).rejects.toThrow(error);

      const result3 = await controller.getAll(mockUser, {});
      expect(result3.success).toBe(true);

      expect(mockChannelPartnerService.findAll).toHaveBeenCalledTimes(3);
      expect(mockChannelPartnerService.findAll).toHaveBeenNthCalledWith(
        1,
        mockUser,
        {},
      ); // NOTE: toHaveBeenNthCalledWith signature above is wrong — use generic check below instead

      // Ensure default-args call pattern for all invocations
      for (let i = 0; i < 3; i++) {
        expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
          mockUser,
          {},
        );
      }
    });
  });

  describe('Performance Tests', () => {
    const testUser = { dbId: 123, id: 123, name: 'Test RM' };

    it('should complete operations within acceptable time limits', async () => {
      // Mock service responses (match updated shapes where applicable)
      mockChannelPartnerService.findAll.mockResolvedValue({
        success: true,
        message: 'Channel partners retrieved successfully',
        data: { result: [], page: 1, total: 0, pageSize: 10, pageCount: 0 },
      });
      mockChannelPartnerService.findOne.mockResolvedValue({
        success: true,
        message: 'Channel partner retrieved successfully',
        data: { id: 1 },
      });
      mockChannelPartnerService.create.mockResolvedValue({
        success: true,
        message: 'Channel partner created successfully',
        data: { id: 999 },
      });

      const start = Date.now();

      // Execute all operations (pass user where controller expects it)
      await controller.getAll(testUser, {});
      // assumed signature: getById(user, id)
      await controller.getById(1);
      // preserved earlier order: create(dto, user)
      await controller.create(
        {
          cpName: 'Test',
          email: 'test@test.com',
          countryCode: '+91',
          contactNumber: '9876543210',
          region: 'Test',
          address: 'Test Address',
        },
        testUser,
      );

      const duration = Date.now() - start;

      // All operations should complete within 1 second
      expect(duration).toBeLessThan(1000);

      // Optional: verify service methods were invoked with expected args
      expect(mockChannelPartnerService.findAll).toHaveBeenCalledWith(
        testUser,
        {},
      );
      expect(mockChannelPartnerService.findOne).toHaveBeenCalledWith(1);
      expect(mockChannelPartnerService.create).toHaveBeenCalledWith(
        expect.objectContaining({ cpName: 'Test', email: 'test@test.com' }),
        expect.any(Number),
      );
    });
  });

  describe('getChannelPartnerByLink', () => {
    it('should return channel partner when found by link ID', async () => {
      const linkId = 'CP-123456';
      const mockResponse = {
        success: true,
        message: 'Channel partner retrieved successfully',
        data: {
          id: 1,
          cpName: 'Found Partner',
          status: 'active',
        },
      };

      mockChannelPartnerService.findByLinkId.mockResolvedValue(mockResponse);

      const result = await controller.getChannelPartnerByLink(linkId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1);
      expect(result.data.cpName).toBe('Found Partner');
      expect(result.data.status).toBe('active');
      expect(mockChannelPartnerService.findByLinkId).toHaveBeenCalledWith(
        linkId,
      );
    });

    it('should throw NotFoundException when channel partner not found by link ID', async () => {
      const linkId = 'CP-INVALID';
      mockChannelPartnerService.findByLinkId.mockRejectedValue(
        new NotFoundException('Channel partner not found'),
      );

      await expect(controller.getChannelPartnerByLink(linkId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockChannelPartnerService.findByLinkId).toHaveBeenCalledWith(
        linkId,
      );
    });

    it('should handle database errors gracefully', async () => {
      const linkId = 'CP-ERROR';
      const dbError = new Error('Database query failed');
      mockChannelPartnerService.findByLinkId.mockRejectedValue(dbError);

      await expect(controller.getChannelPartnerByLink(linkId)).rejects.toThrow(
        dbError,
      );
      expect(mockChannelPartnerService.findByLinkId).toHaveBeenCalledWith(
        linkId,
      );
    });

    it('should handle empty link ID', async () => {
      const linkId = '';
      mockChannelPartnerService.findByLinkId.mockRejectedValue(
        new NotFoundException('Channel partner not found'),
      );

      await expect(controller.getChannelPartnerByLink(linkId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockChannelPartnerService.findByLinkId).toHaveBeenCalledWith(
        linkId,
      );
    });

    it('should respond within 500ms (performance test)', async () => {
      const linkId = 'CP-PERF';
      const mockResponse = {
        success: true,
        message: 'Channel partner retrieved successfully',
        data: {
          id: 5,
          cpName: 'Performance Test Partner',
          status: 'active',
        },
      };

      mockChannelPartnerService.findByLinkId.mockResolvedValue(mockResponse);

      const start = Date.now();
      await controller.getChannelPartnerByLink(linkId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
      expect(mockChannelPartnerService.findByLinkId).toHaveBeenCalledWith(
        linkId,
      );
    });
  });

  describe('exportCPListing', () => {
    it('should export channel partners successfully (success + response time)', async () => {
      const userId = 1;
      const mockFilterDto: QueryChannelPartnerDto = {
        page: 1,
        limit: 20,
        search: 'test',
        sortBy: 'name:asc',
      } as any;

      const mockResponse = {
        message: 'Channel partners exported successfully',
        data: {
          filePath:
            'exports/channel-partners/channel-partners-2025-11-20_103000.xlsx',
        },
      };

      mockChannelPartnerService.exportChannelPartners.mockResolvedValue(
        mockResponse,
      );

      const start = Date.now();
      const result = await controller.exportCPListing(userId, mockFilterDto);
      const duration = Date.now() - start;

      expect(result.message).toBe('Channel partners exported successfully');
      expect(result.data.filePath).toContain('exports/channel-partners');
      expect(
        mockChannelPartnerService.exportChannelPartners,
      ).toHaveBeenCalledWith(userId, mockFilterDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return message when no channel partners found to export', async () => {
      const userId = 1;
      const mockFilterDto: QueryChannelPartnerDto = {
        page: 1,
        limit: 20,
        search: 'nothing-matches',
      } as any;

      const mockResponse = {
        message: 'No channel partners found to export',
        data: [],
      };

      mockChannelPartnerService.exportChannelPartners.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.exportCPListing(userId, mockFilterDto);

      expect(result.message).toBe('No channel partners found to export');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
      expect(
        mockChannelPartnerService.exportChannelPartners,
      ).toHaveBeenCalledWith(userId, mockFilterDto);
    });

    it('should handle missing pagination and other optional filters', async () => {
      const userId = 1;
      const mockFilterDto: QueryChannelPartnerDto = {
        // intentionally missing page/limit
        search: 'some',
      } as any;

      const mockResponse = {
        message: 'Channel partners exported successfully',
        data: {
          filePath:
            'exports/channel-partners/channel-partners-2025-11-20_103000.xlsx',
        },
      };

      mockChannelPartnerService.exportChannelPartners.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.exportCPListing(userId, mockFilterDto);

      expect(result.message).toBe('Channel partners exported successfully');
      expect(result.data.filePath).toMatch(/channel-partners-.*\.xlsx$/);
      expect(
        mockChannelPartnerService.exportChannelPartners,
      ).toHaveBeenCalledWith(userId, mockFilterDto);
    });

    it('should throw error when export fails (failure + response time)', async () => {
      const userId = 1;
      const mockFilterDto: QueryChannelPartnerDto = {
        page: 1,
        limit: 20,
      } as any;

      const exportError = new Error('Channel partners export failed');
      mockChannelPartnerService.exportChannelPartners.mockRejectedValue(
        exportError,
      );

      const start = Date.now();
      await expect(
        controller.exportCPListing(userId, mockFilterDto),
      ).rejects.toThrow(exportError);
      const duration = Date.now() - start;

      expect(
        mockChannelPartnerService.exportChannelPartners,
      ).toHaveBeenCalledWith(userId, mockFilterDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle undefined / empty filter DTO gracefully', async () => {
      const userId = 1;
      const mockFilterDto = {} as QueryChannelPartnerDto;

      const mockResponse = {
        message: 'Channel partners exported successfully',
        data: {
          filePath:
            'exports/channel-partners/channel-partners-2025-11-20_103000.xlsx',
        },
      };

      mockChannelPartnerService.exportChannelPartners.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.exportCPListing(userId, mockFilterDto);

      expect(result.message).toBe('Channel partners exported successfully');
      expect(result.data.filePath).toContain('exports/channel-partners');
      expect(
        mockChannelPartnerService.exportChannelPartners,
      ).toHaveBeenCalledWith(userId, mockFilterDto);
    });
  });
  describe('cpDropdown', () => {
    it('should call cpDropdown service with user and queryDto', async () => {
      const mockUser = {
        dbId: 42,
        role: 'RM',
        email: 'rm@example.com',
      };

      const queryDto = {
        search: 'test partner',
      };

      const mockResponse = {
        success: true,
        data: [{ id: 1, cpName: 'Test Partner' }],
      };

      mockChannelPartnerService.cpDropdown.mockResolvedValue(mockResponse);

      const result = await controller.cpDropdown(mockUser, queryDto);

      expect(mockChannelPartnerService.cpDropdown).toHaveBeenCalledTimes(1);
      expect(mockChannelPartnerService.cpDropdown).toHaveBeenCalledWith(
        mockUser,
        queryDto,
      );
      expect(result).toBe(mockResponse);
    });

    it('should call cpDropdown with empty query when no search is provided', async () => {
      const mockUser = {
        dbId: 42,
        role: 'ADMIN',
      };

      const mockResponse = {
        success: true,
        data: [],
      };

      mockChannelPartnerService.cpDropdown.mockResolvedValue(mockResponse);

      const result = await controller.cpDropdown(mockUser, {});

      expect(mockChannelPartnerService.cpDropdown).toHaveBeenCalledWith(
        mockUser,
        {},
      );
      expect(result).toBe(mockResponse);
    });
  });
});
