// NOTE (PB-188): three mock DTOs in this spec gained `venueName: 'Sample Venue'`
// and `agreementDocLink: 'https://example.com/agreement.pdf'` to match an
// upstream `CreateEoiCampaignDto` field addition that landed before this
// branch was cut. The SFDC webhook work in PB-188 does not touch
// `EoiCampaignController` itself; this edit is purely test-drift maintenance
// surfaced when the test runner was widened to include this spec (see
// review-pointers-cycle-3.md R4). If preferred at review time, this two-key
// addition can be lifted into its own PR.
import { Test, TestingModule } from '@nestjs/testing';
import { EoiCampaignController } from './eoi_campaign.controller';
import { EoiCampaignService } from './eoi_campaign.service';
import { CreateEoiCampaignDto } from './dto/create-eoi-campaign.dto';
import { ListCampaignsQueryDto } from './dto/campaign-list.dto';
import { GetEoiCampaignsMasterDto } from './dto/get-eoi-campaigns-master.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SUCCESS, TEST_EXECUTION_TIME } from 'src/config/constants';
import {
  CampaignStatusEnum,
  DisplayQueueIdEnum,
} from 'src/enums/eoi-form.enums';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';

describe('EoiCampaignController', () => {
  let controller: EoiCampaignController;

  const mockService = {
    createEoiCampaign: jest.fn(),
    getEoiCampaignsMaster: jest.fn(),
    listCampaigns: jest.fn(),
    getAllDevelopmentTypes: jest.fn(),
    getInventories: jest.fn(),
    getById: jest.fn(),
    updateEoiCampaign: jest.fn(),
    listCampaignBankDetails: jest.fn(),
    sendEOIBankDetailEmail: jest.fn(),
  };

  const mockCreateEoiCampaignDto: CreateEoiCampaignDto = {
    campaignName: 'Project Alpha',
    enquiryInitials: 'PHL-BR',
    phase: 'VOUCHER' as any,
    brandId: 1,
    cityIds: [1, 2],
    developmentTypeIds: [10],
    inventoryTypeIds: [100],
    voucherStartDate: '2025-01-01',
    voucherEndDate: '2025-01-31',
    voucherFormType: 'Basic' as any,
    voucherAmount: 50000,
    voucherTermsAndCondition: 'be nice',
    voucherIdInitials: 'VCH-PHL',
    voucherIdCounter: 1,
    inventoryDetails: [
      {
        type: '2BHK',
        minSBA: '1000',
        maxSBA: '1200',
        minPrice: '9000000',
        maxPrice: '11000000',
      } as any,
    ],
    enquiryCounter: 1,
    displayQueueId: DisplayQueueIdEnum.ALL,
    availableGateways: [PaymentGatewayEnum.EASEBUZZ],
    venueName: 'Sample Venue',
    agreementDocLink: 'https://example.com/agreement.pdf',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EoiCampaignController],
      providers: [
        {
          provide: EoiCampaignService,
          useValue: mockService,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            emitAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EoiCampaignController>(EoiCampaignController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createEoiCampaign', () => {
    it('should create EOI campaign successfully (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI Campaign created successfully',
        data: {
          id: 1,
          campaignName: 'Project Alpha',
          enquiryInitials: 'PHL-BR',
          // service saves as Date; mocking that here is fine
          voucherStartDate: new Date('2025-01-01'),
          voucherEndDate: new Date('2025-01-31'),
          vqiCounter: 0,
          stdCounter: 0,
          preCounter: 0,
          enquiryCounter: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockService.createEoiCampaign.mockResolvedValue(mockResponse);

      const dto = {
        ...mockCreateEoiCampaignDto,
        voucherStartDate: '2025-01-01',
        voucherEndDate: '2025-01-31',
        brandId: 1,
        cityIds: [1, 2],
        developmentTypeIds: [10],
        inventoryTypeIds: [100],
        inventoryDetails: [
          {
            type: '2BHK',
            minSBA: 1000,
            maxSBA: 1200,
            minPrice: 9000000,
            maxPrice: 11000000,
          },
        ],
      };

      const start = Date.now();
      const result = await controller.createEoiCampaign(dto);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.campaignName).toBe('Project Alpha');
      expect(result.data.enquiryInitials).toBe('PHL-BR');
      expect(mockService.createEoiCampaign).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw BadRequestException when campaign name already exists (failure + response time)', async () => {
      mockService.createEoiCampaign.mockRejectedValue(
        new BadRequestException(
          'campaign with name "Project Alpha" already exists',
        ),
      );

      const dto = {
        ...mockCreateEoiCampaignDto,
        voucherStartDate: '2025-01-01',
        voucherEndDate: '2025-01-31',
        brandId: 1,
        cityIds: [1],
      };

      const start = Date.now();
      await expect(controller.createEoiCampaign(dto)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;

      expect(mockService.createEoiCampaign).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should create EOI phase campaign with standard EOI type', async () => {
      const eoiPhaseDto: CreateEoiCampaignDto = {
        ...mockCreateEoiCampaignDto,
        phase: 'EOI' as any,
        brandId: 1,
        cityIds: [1],
        developmentTypeIds: [1],
        inventoryTypeIds: [1],
        eoiStartDate: '2025-02-01',
        eoiEndDate: '2025-02-28',
        eoiFormType: 'Basic' as any,
        eoiType: ['Standard' as any],
        stdEoiAmount: 100000,
        eoiTermsAndCondition: 'EOI terms',
        // explicitly drop voucher fields for EOI-only
        voucherStartDate: undefined,
        voucherEndDate: undefined,
        voucherFormType: undefined,
        voucherAmount: undefined,
        voucherTermsAndCondition: undefined,
      };

      const mockResponse = {
        success: true,
        message: 'EOI Campaign created successfully',
        data: {
          id: 2,
          campaignName: 'Project Alpha',
          phase: 'EOI',
          eoiType: ['Standard'],
        },
      };

      mockService.createEoiCampaign.mockResolvedValue(mockResponse);

      const result = await controller.createEoiCampaign(eoiPhaseDto);

      expect(result.success).toBe(true);
      expect(result.data.phase).toBe('EOI');
      expect(mockService.createEoiCampaign).toHaveBeenCalledWith(eoiPhaseDto);
    });

    it('should handle validation errors for invalid date ranges', async () => {
      const invalidDateDto: CreateEoiCampaignDto = {
        ...mockCreateEoiCampaignDto,
        // strings in DTO, end before start
        voucherStartDate: '2025-01-31',
        voucherEndDate: '2025-01-01',
        brandId: 1,
        cityIds: [1],
      };

      mockService.createEoiCampaign.mockRejectedValue(
        new BadRequestException(
          'Voucher end date must be after voucher start date',
        ),
      );

      await expect(
        controller.createEoiCampaign(invalidDateDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.createEoiCampaign).toHaveBeenCalledWith(
        invalidDateDto,
      );
    });

    it('should create campaign with multiple cities', async () => {
      const multiCityDto: CreateEoiCampaignDto = {
        ...mockCreateEoiCampaignDto,
        brandId: 1,
        cityIds: [1, 2, 3, 4, 5],
        voucherStartDate: '2025-01-01',
        voucherEndDate: '2025-01-31',
      };

      const mockResponse = {
        success: true,
        message: 'EOI Campaign created successfully',
        data: {
          id: 3,
          campaignName: 'Project Alpha',
          cities: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
        },
      };

      mockService.createEoiCampaign.mockResolvedValue(mockResponse);

      const result = await controller.createEoiCampaign(multiCityDto);

      expect(result.success).toBe(true);
      expect(mockService.createEoiCampaign).toHaveBeenCalledWith(multiCityDto);
    });

    it('should create campaign with both Standard and Preferential EOI types', async () => {
      const bothEoiTypesDto: CreateEoiCampaignDto = {
        ...mockCreateEoiCampaignDto,
        phase: 'EOI' as any,
        brandId: 1,
        cityIds: [1],
        developmentTypeIds: [1],
        inventoryTypeIds: [1],
        eoiStartDate: '2025-02-01',
        eoiEndDate: '2025-02-28',
        eoiFormType: 'Basic' as any,
        eoiType: ['Standard' as any, 'Preferential' as any],
        stdEoiAmount: 100000,
        preEoiAmount: 150000,
        eoiTermsAndCondition: 'EOI terms',
        voucherStartDate: undefined,
        voucherEndDate: undefined,
        voucherFormType: undefined,
        voucherAmount: undefined,
        voucherTermsAndCondition: undefined,
      };

      const mockResponse = {
        success: true,
        message: 'EOI Campaign created successfully',
        data: {
          id: 4,
          campaignName: 'Project Alpha',
          eoiType: ['Standard', 'Preferential'],
          stdEoiAmount: 100000,
          preEoiAmount: 150000,
        },
      };

      mockService.createEoiCampaign.mockResolvedValue(mockResponse);

      const result = await controller.createEoiCampaign(bothEoiTypesDto);

      expect(result.success).toBe(true);
      expect(result.data.eoiType).toContain('Standard');
      expect(result.data.eoiType).toContain('Preferential');
      expect(mockService.createEoiCampaign).toHaveBeenCalledWith(
        bothEoiTypesDto,
      );
    });

    it('should create campaign with optional fields', async () => {
      const withOptionalFieldsDto: CreateEoiCampaignDto = {
        ...mockCreateEoiCampaignDto,
        voucherStartDate: '2025-01-01',
        voucherEndDate: '2025-01-31',
        brandId: 1,
        cityIds: [1],
        pushToSfdc: true as any,
        sfdcProjectName: 'Alpha Project SFDC' as any,
        accountDetails: {
          accountName: 'Project Alpha Account',
          bankName: 'HDFC Bank',
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
        } as any,
        // include inventoryDetails to assert casting coverage upstream
        inventoryDetails: [
          {
            type: '3BHK',
            minSBA: 1400,
            maxSBA: 1700,
            minPrice: 12000000,
            maxPrice: 15000000,
          },
        ],
      };

      const mockResponse = {
        success: true,
        message: 'EOI Campaign created successfully',
        data: {
          id: 5,
          campaignName: 'Project Alpha',
          pushToSfdc: true,
          sfdcProjectName: 'Alpha Project SFDC',
        },
      };

      mockService.createEoiCampaign.mockResolvedValue(mockResponse);

      const result = await controller.createEoiCampaign(withOptionalFieldsDto);

      expect(result.success).toBe(true);
      expect(result.data.pushToSfdc).toBe(true);
      expect(mockService.createEoiCampaign).toHaveBeenCalledWith(
        withOptionalFieldsDto,
      );
    });

    it('should create EOI phase campaign without voucher dates', async () => {
      const eoiOnlyDto: CreateEoiCampaignDto = {
        campaignName: 'EOI Only Campaign',
        enquiryInitials: 'EOI-TEST',
        phase: 'EOI' as any,
        brandId: 1,
        cityIds: [1],
        developmentTypeIds: [1],
        inventoryTypeIds: [1],
        eoiStartDate: '2025-03-01',
        eoiEndDate: '2025-03-31',
        eoiFormType: 'Basic' as any,
        eoiType: ['Standard' as any],
        stdEoiAmount: 100000,
        eoiTermsAndCondition: 'EOI terms',
        voucherIdInitials: 'VCH-PHL',
        voucherIdCounter: 1,
        // explicitly no voucher fields
        voucherStartDate: undefined,
        voucherEndDate: undefined,
        voucherFormType: undefined,
        voucherAmount: undefined,
        voucherTermsAndCondition: undefined,
        enquiryCounter: 1,
        displayQueueId: DisplayQueueIdEnum.ALL,
        availableGateways: [PaymentGatewayEnum.EASEBUZZ],
        venueName: 'Sample Venue',
        agreementDocLink: 'https://example.com/agreement.pdf',
      };

      const mockResponse = {
        success: true,
        message: 'EOI Campaign created successfully',
        data: {
          id: 6,
          campaignName: 'EOI Only Campaign',
          phase: 'EOI',
          voucherStartDate: null,
          voucherEndDate: null,
        },
      };

      mockService.createEoiCampaign.mockResolvedValue(mockResponse);

      const result = await controller.createEoiCampaign(eoiOnlyDto);

      expect(result.success).toBe(true);
      expect(result.data.phase).toBe('EOI');
      expect(mockService.createEoiCampaign).toHaveBeenCalledWith(eoiOnlyDto);
    });
  });

  describe('getEoiCampaignsMaster', () => {
    it('should return EOI campaigns master list successfully (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI campaigns retrieved successfully',
        data: [
          {
            id: 1,
            campaignName: 'Project Alpha',
          },
          {
            id: 2,
            campaignName: 'Project Beta',
          },
        ],
      };

      mockService.getEoiCampaignsMaster.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getEoiCampaignsMaster(
        {} as GetEoiCampaignsMasterDto,
        {} as any, // Mock user
      );
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].campaignName).toBe('Project Alpha');
      expect(result.data[1].campaignName).toBe('Project Beta');
      expect(mockService.getEoiCampaignsMaster).toHaveBeenCalledWith(
        {},
        false,
        false,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return EOI campaigns with showAll=true (all campaigns)', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI campaigns retrieved successfully',
        data: [
          {
            id: 1,
            campaignName: 'Project Alpha',
          },
          {
            id: 2,
            campaignName: 'Project Beta',
          },
          {
            id: 3,
            campaignName: 'Project Gamma (Inactive)',
          },
        ],
      };

      mockService.getEoiCampaignsMaster.mockResolvedValue(mockResponse);

      const dto: GetEoiCampaignsMasterDto = { showAll: true };
      const result = await controller.getEoiCampaignsMaster(dto, {} as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(mockService.getEoiCampaignsMaster).toHaveBeenCalledWith(
        {},
        true,
        false,
      );
    });

    it('should return EOI campaigns with showAll=false (only active campaigns)', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI campaigns retrieved successfully',
        data: [
          {
            id: 1,
            campaignName: 'Project Alpha',
          },
          {
            id: 2,
            campaignName: 'Project Beta',
          },
        ],
      };

      mockService.getEoiCampaignsMaster.mockResolvedValue(mockResponse);

      const dto: GetEoiCampaignsMasterDto = { showAll: false };
      const result = await controller.getEoiCampaignsMaster(dto, {} as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockService.getEoiCampaignsMaster).toHaveBeenCalledWith(
        {},
        false,
        false,
      );
    });

    it('should default to showAll=false when showAll is not provided', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI campaigns retrieved successfully',
        data: [],
      };

      mockService.getEoiCampaignsMaster.mockResolvedValue(mockResponse);

      const result = await controller.getEoiCampaignsMaster(
        {} as GetEoiCampaignsMasterDto,
        {} as any,
      );

      expect(result.success).toBe(true);
      expect(mockService.getEoiCampaignsMaster).toHaveBeenCalledWith(
        {},
        false,
        false,
      );
    });

    it('should return empty array when no campaigns exist', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI campaigns retrieved successfully',
        data: [],
      };

      mockService.getEoiCampaignsMaster.mockResolvedValue(mockResponse);

      const result = await controller.getEoiCampaignsMaster(
        {} as GetEoiCampaignsMasterDto,
        {} as any,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(mockService.getEoiCampaignsMaster).toHaveBeenCalledWith(
        {},
        false,
        false,
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.getEoiCampaignsMaster.mockRejectedValue(dbError);

      await expect(
        controller.getEoiCampaignsMaster(
          {} as GetEoiCampaignsMasterDto,
          {} as any,
        ),
      ).rejects.toThrow('Database connection failed');
      expect(mockService.getEoiCampaignsMaster).toHaveBeenCalledWith(
        {},
        false,
        false,
      );
    });

    it('should return campaigns sorted alphabetically', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI campaigns retrieved successfully',
        data: [
          { id: 3, campaignName: 'Alpha Campaign' },
          { id: 1, campaignName: 'Beta Campaign' },
          { id: 2, campaignName: 'Gamma Campaign' },
        ],
      };

      mockService.getEoiCampaignsMaster.mockResolvedValue(mockResponse);

      const result = await controller.getEoiCampaignsMaster(
        {} as GetEoiCampaignsMasterDto,
        {} as any,
      );

      expect(result.success).toBe(true);
      expect(result.data[0].campaignName).toBe('Alpha Campaign');
      expect(result.data[1].campaignName).toBe('Beta Campaign');
      expect(result.data[2].campaignName).toBe('Gamma Campaign');
    });
  });

  describe('list (listCampaigns)', () => {
    it('should return paginated campaigns list with default pagination', async () => {
      const dto: ListCampaignsQueryDto = { page: 1, limit: 10 };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: [
            {
              id: 1,
              campaignName: 'Campaign One',
              status: 'ACTIVE',
              city: 'Mumbai',
              phaseLabel: 'Voucher | EOI',
              countCollected: 5,
              startDate: '01/01/2025',
              endDate: '31/01/2025',
            },
            {
              id: 2,
              campaignName: 'Campaign Two',
              status: 'DRAFT',
              city: 'Bengaluru',
              phaseLabel: 'EOI',
              countCollected: 3,
              startDate: '01/02/2025',
              endDate: '28/02/2025',
            },
          ],
          total: 2,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      mockService.listCampaigns.mockResolvedValue(mockResponse);

      const result = await controller.list(dto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toBe('Campaign list');
      expect(result.data.campaigns).toHaveLength(2);
      expect(result.data.campaigns[0].status).toBe('ACTIVE');
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.total).toBe(2);
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should filter campaigns by search term', async () => {
      const dto: ListCampaignsQueryDto = {
        search: 'Project',
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: [
            {
              id: 1,
              campaignName: 'Project Alpha',
              status: 'ACTIVE',
              city: 'Mumbai',
              phaseLabel: 'Voucher | EOI',
              countCollected: 10,
              startDate: '01/01/2025',
              endDate: '31/01/2025',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      mockService.listCampaigns.mockResolvedValue(mockResponse);

      const result = await controller.list(dto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.campaigns).toHaveLength(1);
      expect(result.data.campaigns[0].campaignName).toBe('Project Alpha');
      expect(result.data.campaigns[0].status).toBe('ACTIVE');
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should filter campaigns by city IDs', async () => {
      const dto: ListCampaignsQueryDto = {
        cityIds: [1, 2],
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: [
            {
              id: 1,
              campaignName: 'Mumbai Campaign',
              status: 'ARCHIVED',
              city: 'Mumbai, Pune',
              phaseLabel: 'EOI',
              countCollected: 7,
              startDate: '01/03/2025',
              endDate: '31/03/2025',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      mockService.listCampaigns.mockResolvedValue(mockResponse);

      const result = await controller.list(dto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.campaigns[0].city).toBe('Mumbai, Pune');
      expect(result.data.campaigns[0].status).toBe('ARCHIVED');
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should filter campaigns by statuses', async () => {
      const dto: ListCampaignsQueryDto = {
        status: [
          CampaignStatusEnum.ACTIVE_EOI,
          CampaignStatusEnum.ACTIVE_VOUCHER,
        ],
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: [
            {
              id: 11,
              campaignName: 'Live One',
              status: 'ACTIVE',
              city: 'Delhi',
              phaseLabel: 'Voucher | EOI',
              countCollected: 12,
              startDate: '05/04/2025',
              endDate: '25/04/2025',
            },
            {
              id: 12,
              campaignName: 'Taking a Breather',
              status: 'PAUSED',
              city: 'Hyderabad',
              phaseLabel: 'EOI',
              countCollected: 2,
              startDate: '10/04/2025',
              endDate: '20/04/2025',
            },
          ],
          total: 2,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      mockService.listCampaigns.mockResolvedValue(mockResponse);

      const result = await controller.list(dto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(
        result.data.campaigns.every((c) =>
          ['ACTIVE', 'PAUSED'].includes(c.status),
        ),
      ).toBe(true);
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should handle pagination with page 2 and limit 3', async () => {
      const dto: ListCampaignsQueryDto = { page: 2, limit: 3 };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: [
            {
              id: 4,
              campaignName: 'Test Campaign',
              status: 'ACTIVE',
              city: 'Bengaluru, Mumbai',
              phaseLabel: 'Voucher | EOI',
              countCollected: 7,
              startDate: '01/09/2025',
              endDate: '30/09/2025',
            },
          ],
          total: 8,
          page: 2,
          limit: 3,
          pages: Math.ceil(8 / 3),
        },
      };

      mockService.listCampaigns.mockResolvedValue(mockResponse);

      const result = await controller.list(dto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toBe('Campaign list');
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(3);
      expect(result.data.pages).toBe(Math.ceil(8 / 3));
      expect(result.data.campaigns[0].campaignName).toBe('Test Campaign');
      expect(result.data.campaigns[0].status).toBe('ACTIVE');
      expect(result.data.campaigns[0].startDate).toBe('01/09/2025');
      expect(result.data.campaigns[0].endDate).toBe('30/09/2025');
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should handle string countCollected from DB and return number', async () => {
      const dto: ListCampaignsQueryDto = { page: 1, limit: 10 };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: [
            {
              id: 5,
              campaignName: 'Autumn',
              status: 'ACTIVE',
              city: '',
              phaseLabel: 'EOI',
              countCollected: 0,
              startDate: '10/10/2025',
              endDate: '20/10/2025',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      mockService.listCampaigns.mockResolvedValue(mockResponse);

      const result = await controller.list(dto);

      expect(result.data.campaigns[0].countCollected).toBe(0);
      expect(typeof result.data.campaigns[0].countCollected).toBe('number');
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should return empty campaigns array with total 0 gracefully', async () => {
      const dto: ListCampaignsQueryDto = {
        search: 'nope',
        page: 1,
        limit: 10,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: [],
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
        },
      };

      mockService.listCampaigns.mockResolvedValue(mockResponse);

      const result = await controller.list(dto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.campaigns).toHaveLength(0);
      expect(result.data.total).toBe(0);
      expect(result.data.pages).toBe(0);
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should handle null start/end dates from service mapping', async () => {
      const dto: ListCampaignsQueryDto = { page: 1, limit: 10 };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: {
          campaigns: [
            {
              id: 9,
              campaignName: 'No Dates Yet',
              status: 'PAUSED',
              city: '',
              phaseLabel: 'EOI',
              countCollected: 2,
              startDate: null,
              endDate: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      mockService.listCampaigns.mockResolvedValue(mockResponse);

      const result = await controller.list(dto);

      expect(result.data.campaigns[0].startDate).toBeNull();
      expect(result.data.campaigns[0].endDate).toBeNull();
      expect(result.data.campaigns[0].status).toBe('PAUSED');
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should bubble up BadRequestException from service (invalid payload)', async () => {
      const dto: ListCampaignsQueryDto = { page: -1, limit: 0 };
      mockService.listCampaigns.mockRejectedValue(
        new BadRequestException('Invalid pagination'),
      );

      await expect(controller.list(dto)).rejects.toThrow(BadRequestException);
      expect(mockService.listCampaigns).toHaveBeenCalledWith(dto);
    });

    it('should respond within 500ms (performance test)', async () => {
      const dto: ListCampaignsQueryDto = { page: 1, limit: 10 };
      mockService.listCampaigns.mockResolvedValue({
        statusCode: SUCCESS,
        message: 'Campaign list',
        data: { campaigns: [], total: 0, page: 1, limit: 10, pages: 0 },
      });

      const start = Date.now();
      await controller.list(dto);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getAllDevelopmentTypes', () => {
    it('should return development types successfully (sorted asc by name)', async () => {
      const mockResponse = {
        message: 'Development types fetched successfully.',
        data: [
          { id: 2, name: 'Alpha' },
          { id: 5, name: 'Beta' },
        ],
      };
      mockService.getAllDevelopmentTypes.mockResolvedValue(mockResponse);

      const result = await controller.getAllDevelopmentTypes();

      expect(result).toEqual(mockResponse);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0].name <= result.data[1].name).toBe(true);
      expect(mockService.getAllDevelopmentTypes).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no development types exist', async () => {
      const mockResponse = {
        message: 'Development types fetched successfully.',
        data: [],
      };
      mockService.getAllDevelopmentTypes.mockResolvedValue(mockResponse);

      const result = await controller.getAllDevelopmentTypes();

      expect(result.data).toHaveLength(0);
      expect(mockService.getAllDevelopmentTypes).toHaveBeenCalled();
    });

    it('should bubble up service errors', async () => {
      mockService.getAllDevelopmentTypes.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(controller.getAllDevelopmentTypes()).rejects.toThrow(
        'DB connection lost',
      );
      expect(mockService.getAllDevelopmentTypes).toHaveBeenCalled();
    });

    it('should respond within 500ms (performance test)', async () => {
      mockService.getAllDevelopmentTypes.mockResolvedValue({
        message: 'Development types fetched successfully.',
        data: [],
      });

      const start = Date.now();
      await controller.getAllDevelopmentTypes();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getInventories', () => {
    it('should return grouped inventories for specific departmentIds', async () => {
      const mockResponse = {
        message: 'Inventories fetched successfully.',
        data: [
          {
            departmentId: 1,
            departmentName: 'Housing',
            inventories: [
              { id: 10, name: '2BHK' },
              { id: 11, name: '3BHK' },
            ],
          },
          {
            departmentId: 2,
            departmentName: 'Commercial',
            inventories: [{ id: 20, name: 'Shop' }],
          },
        ],
      };
      mockService.getInventories.mockResolvedValue(mockResponse);

      const result = await controller.getInventories('1,2');

      expect(result).toEqual(mockResponse);
      expect(mockService.getInventories).toHaveBeenCalledWith('1,2');
    });

    it('should handle empty/invalid departmentIds by throwing BadRequestException', async () => {
      mockService.getInventories.mockRejectedValue(
        new BadRequestException(
          'Invalid departmentIds. Provide comma-separated positive integers.',
        ),
      );

      await expect(controller.getInventories(' , , ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.getInventories).toHaveBeenCalledWith(' , , ');
    });

    it('should return all inventories (no filter) when departmentIds not provided', async () => {
      const mockResponse = {
        message: 'Inventories fetched successfully.',
        data: [
          {
            departmentId: 1,
            departmentName: 'Housing',
            inventories: [{ id: 10, name: '2BHK' }],
          },
        ],
      };
      mockService.getInventories.mockResolvedValue(mockResponse);

      const result = await controller.getInventories();

      expect(result).toEqual(mockResponse);
      expect(mockService.getInventories).toHaveBeenCalledWith(undefined);
    });

    it('should throw BadRequestException for invalid departmentIds', async () => {
      mockService.getInventories.mockRejectedValue(
        new BadRequestException('Invalid departmentIds: 999'),
      );

      await expect(controller.getInventories('999')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.getInventories).toHaveBeenCalledWith('999');
    });

    it('should respond within 500ms (performance test)', async () => {
      mockService.getInventories.mockResolvedValue({
        message: 'Inventories fetched successfully.',
        data: [],
      });

      const start = Date.now();
      await controller.getInventories('1,2');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle multiple departmentIds correctly', async () => {
      const mockResponse = {
        message: 'Inventories fetched successfully.',
        data: [
          {
            departmentId: 1,
            departmentName: 'Housing',
            inventories: [{ id: 10, name: '2BHK' }],
          },
          {
            departmentId: 3,
            departmentName: 'Plots',
            inventories: [{ id: 30, name: 'Plot A' }],
          },
        ],
      };
      mockService.getInventories.mockResolvedValue(mockResponse);

      const result = await controller.getInventories('1,3');

      expect(result.data).toHaveLength(2);
      expect(result.data[0].departmentId).toBe(1);
      expect(result.data[1].departmentId).toBe(3);
      expect(mockService.getInventories).toHaveBeenCalledWith('1,3');
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.getInventories.mockRejectedValue(dbError);

      await expect(controller.getInventories('1,2')).rejects.toThrow(dbError);
      expect(mockService.getInventories).toHaveBeenCalledWith('1,2');
    });
  });

  describe('getById', () => {
    it('should return campaign details successfully (success + response time)', async () => {
      const mockResponse = {
        data: {
          id: 1,
          campaignName: 'Project Alpha',
          enquiryInitials: 'PA',
          phase: 'EOI',
          status: 'ACTIVE',
          brand: { id: 10, name: 'Purva' },
        },
      };

      mockService.getById.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getById(1 as any);
      const duration = Date.now() - start;

      expect(result.data.id).toBe(1);
      expect(result.data.campaignName).toBe('Project Alpha');
      expect(mockService.getById).toHaveBeenCalledWith(1);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle case when no campaign found', async () => {
      const notFoundError = new NotFoundException('Campaign 99 not found');
      mockService.getById.mockRejectedValue(notFoundError);

      await expect(controller.getById(99 as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockService.getById).toHaveBeenCalledWith(99);
    });

    it('should handle database or internal errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.getById.mockRejectedValue(dbError);

      await expect(controller.getById(2 as any)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockService.getById).toHaveBeenCalledWith(2);
    });

    it('should return correct structure for minimal response (empty relations)', async () => {
      const mockResponse = {
        data: {
          id: 5,
          campaignName: 'Project Minimal',
          enquiryInitials: 'PM',
          phase: 'EOI',
          status: 'ACTIVE',
          brand: null,
          cities: [],
          developmentTypes: [],
          inventoryTypes: [],
        },
      };

      mockService.getById.mockResolvedValue(mockResponse);

      const result = await controller.getById(5 as any);

      expect(result.data.id).toBe(5);
      expect(mockService.getById).toHaveBeenCalledWith(5);
    });

    it('should validate performance under expected threshold (stress test)', async () => {
      const mockResponse = {
        data: { id: 10, campaignName: 'Project Stress Test' },
      };
      mockService.getById.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getById(10 as any);
      const duration = Date.now() - start;

      expect(result.data.campaignName).toBe('Project Stress Test');
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
  describe('updateEoiCampaign', () => {
    const id = 1;
    const baseDto: CreateEoiCampaignDto = {
      campaignName: 'River Standard EOI2',
      enquiryInitials: 'RIV-STD2',
      phase: 'VOUCHER' as any,
      brandId: 27,
      cityIds: [6],
      developmentTypeIds: [2, 3],
      inventoryTypeIds: [1, 2, 3, 4],
      voucherStartDate: '2025-01-01',
      voucherEndDate: '2025-01-31',
      voucherFormType: 'Basic' as any,
      voucherAmount: 50000,
      voucherTermsAndCondition: 'test',
      voucherIdInitials: 'VCH-PHL',
      voucherIdCounter: 1,
      enquiryCounter: 1,
      displayQueueId: DisplayQueueIdEnum.ALL,
      availableGateways: [PaymentGatewayEnum.EASEBUZZ],
      venueName: 'Sample Venue',
      agreementDocLink: 'https://example.com/agreement.pdf',
    };

    it('should update EOI campaign successfully (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI Campaign updated successfully',
        data: {
          id: 1,
          campaignName: 'River Standard EOI2',
          enquiryInitials: 'RIV-STD2',
          updatedAt: new Date(),
        },
      };

      mockService.updateEoiCampaign.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.updateEoiCampaign(id, baseDto);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.campaignName).toBe('River Standard EOI2');
      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(id, baseDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should call eoiCampaignService.updateEoiCampaign with correct parameters', async () => {
      const dto: CreateEoiCampaignDto = {
        ...baseDto,
        pushToSfdc: false,
        sbaRange: '2000-3500 sqft',
        priceRange: '1Cr-2.5Cr',
        accountDetails: {
          accountName: 'River Standard EOI Account',
          bankName: 'Axis Bank',
          accountNumber: '91234567890123',
          ifscCode: 'UTIB0001234',
        },
        eoiFormType: 'KYC',
        eoiStartDate: '2026-01-01T00:00:00.000Z',
        eoiEndDate: '2026-01-31T23:59:59.999Z',
        eoiType: ['Standard', 'Preferential'],
        stdEoiAmount: 150000,
        preEoiAmount: 250000,
        eoiTermsAndCondition:
          '1. Standard EOI: ₹1.5L (Refundable)\n2. Preferential EOI: ₹2.5L (Refundable)\n3. Preferential gets priority allocation\n4. Terms apply',
      } as CreateEoiCampaignDto;

      const mockResult = { success: true };
      mockService.updateEoiCampaign.mockResolvedValue(mockResult);

      const result = await controller.updateEoiCampaign(id, dto);

      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException when campaign not found (failure + response time)', async () => {
      const invalidId = 999;
      mockService.updateEoiCampaign.mockRejectedValue(
        new NotFoundException('Campaign not found'),
      );

      const start = Date.now();
      await expect(
        controller.updateEoiCampaign(invalidId, baseDto),
      ).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;

      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(
        invalidId,
        baseDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw BadRequestException when campaign name already exists', async () => {
      const duplicateNameDto: CreateEoiCampaignDto = {
        ...baseDto,
        campaignName: 'Existing Campaign Name',
      };
      mockService.updateEoiCampaign.mockRejectedValue(
        new BadRequestException(
          'Campaign with name "Existing Campaign Name" already exists',
        ),
      );

      await expect(
        controller.updateEoiCampaign(id, duplicateNameDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(
        id,
        duplicateNameDto,
      );
    });

    it('should handle validation errors for invalid date ranges', async () => {
      const invalidDateDto: CreateEoiCampaignDto = {
        ...baseDto,
        voucherStartDate: '2025-01-31',
        voucherEndDate: '2025-01-01',
      };
      mockService.updateEoiCampaign.mockRejectedValue(
        new BadRequestException(
          'Voucher end date must be after voucher start date',
        ),
      );

      await expect(
        controller.updateEoiCampaign(id, invalidDateDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(
        id,
        invalidDateDto,
      );
    });

    it('should update campaign with EOI phase changes', async () => {
      const eoiPhaseDto: CreateEoiCampaignDto = {
        ...baseDto,
        phase: 'EOI' as any,
        eoiStartDate: '2025-02-01',
        eoiEndDate: '2025-02-28',
        eoiFormType: 'Basic' as any,
        eoiType: ['Standard' as any],
        stdEoiAmount: 100000,
        eoiTermsAndCondition: 'EOI terms',
        voucherStartDate: undefined,
        voucherEndDate: undefined,
        voucherFormType: undefined,
        voucherAmount: undefined,
        voucherTermsAndCondition: undefined,
      };

      const mockResponse = {
        success: true,
        message: 'EOI Campaign updated successfully',
        data: {
          id: 1,
          phase: 'EOI',
          eoiType: ['Standard'],
        },
      };
      mockService.updateEoiCampaign.mockResolvedValue(mockResponse);

      const result = await controller.updateEoiCampaign(id, eoiPhaseDto);

      expect(result.success).toBe(true);
      expect(result.data.phase).toBe('EOI');
      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(
        id,
        eoiPhaseDto,
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.updateEoiCampaign.mockRejectedValue(dbError);

      await expect(controller.updateEoiCampaign(id, baseDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(id, baseDto);
    });

    it('should handle update with optional fields', async () => {
      const withOptionalFieldsDto: CreateEoiCampaignDto = {
        ...baseDto,
        pushToSfdc: true as any,
        sfdcProjectName: 'Alpha Project SFDC' as any,
        accountDetails: {
          accountName: 'Project Alpha Account',
          bankName: 'HDFC Bank',
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
        } as any,
        inventoryDetails: [
          {
            type: '3BHK',
            minSBA: 1400,
            maxSBA: 1700,
            minPrice: 12000000,
            maxPrice: 15000000,
          },
        ],
      };

      const mockResponse = {
        success: true,
        message: 'EOI Campaign updated successfully',
        data: {
          id: 1,
          pushToSfdc: true,
          sfdcProjectName: 'Alpha Project SFDC',
        },
      };
      mockService.updateEoiCampaign.mockResolvedValue(mockResponse);

      const result = await controller.updateEoiCampaign(
        id,
        withOptionalFieldsDto,
      );

      expect(result.success).toBe(true);
      expect(result.data.pushToSfdc).toBe(true);
      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(
        id,
        withOptionalFieldsDto,
      );
    });

    it('should respond within 500ms (performance test)', async () => {
      const mockResponse = {
        success: true,
        message: 'EOI Campaign updated successfully',
        data: { id: 1 },
      };
      mockService.updateEoiCampaign.mockResolvedValue(mockResponse);

      const start = Date.now();
      await controller.updateEoiCampaign(id, baseDto);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
      expect(mockService.updateEoiCampaign).toHaveBeenCalledWith(id, baseDto);
    });
  });

  describe('getCampaignBankDetails', () => {
    it('should return campaign bank details', async () => {
      const dto = {
        campaignIds: [1, 2],
        search: 'test',
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        data: [
          {
            id: 1,
            campaignName: 'Test Campaign',
            accountDetails: { bankName: 'HDFC' },
          },
        ],
        total: 1,
      };

      mockService.listCampaignBankDetails.mockResolvedValue(mockResponse);

      const result = await controller.getCampaignBankDetails(dto as any);

      expect(result).toEqual(mockResponse);
      expect(mockService.listCampaignBankDetails).toHaveBeenCalledWith(dto);
    });
  });

  describe('sendFormEmail', () => {
    it('should invoke service and return success message', async () => {
      const user = { dbId: 123 } as any;
      const body = { campaignId: 1, emailIds: ['a@example.com'] };
      const mockResponse = {
        success: true,
        message: 'Email sent successfully',
      };

      mockService.sendEOIBankDetailEmail.mockResolvedValue(mockResponse);

      const result = await controller.sendFormEmail(user, body as any);

      expect(result).toEqual(mockResponse);
      expect(mockService.sendEOIBankDetailEmail).toHaveBeenCalledWith(
        user,
        body.campaignId,
        body.emailIds,
      );
    });

    it('should propagate errors from service', async () => {
      const user = { dbId: 123 } as any;
      const dto = { campaignId: 1, emailIds: ['a@example.com'] };
      const error = new Error('send failed');

      mockService.sendEOIBankDetailEmail.mockRejectedValue(error);

      await expect(controller.sendFormEmail(user, dto as any)).rejects.toThrow(
        error,
      );
    });
  });
});
