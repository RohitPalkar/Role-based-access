import { Test, TestingModule } from '@nestjs/testing';
import { DecentroController } from './decentro.controller';
import { DecentroService } from './decentro.service';
import { GetGstDetailsDto } from './dto/get-gst-details.dto';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DecentroLogs } from './entities/decentro-logs.entity';
import { CustomConfigService } from 'src/config/custom-config.service';
import { HttpException } from '@nestjs/common';
import { BookingAsEnum } from 'src/enums/booking-as.enum';

describe('DecentroController', () => {
  let controller: DecentroController;
  let service: DecentroService;

  const mockDecentroService = {
    generateDigiLockerUrl: jest.fn(),
    getGstDetails: jest.fn(),
    handleDigiLockerWebhook: jest.fn(),
    getImageDetails: jest.fn(),
    verifyDigilockerStatus: jest.fn(),
  };

  const mockDecentroLogsRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getDecrypted: jest.fn(),
    getImageDetails: jest.fn(),
  };

  beforeEach(async () => {
    // Setup default mock values for webhook tests
    mockConfigService.get.mockReturnValue('https://api.decentro.tech');
    mockConfigService.getDecrypted.mockReturnValue('test-secret');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DecentroController],
      providers: [
        {
          provide: DecentroService,
          useValue: mockDecentroService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getRepositoryToken(DecentroLogs),
          useValue: mockDecentroLogsRepository,
        },
        {
          provide: CustomConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<DecentroController>(DecentroController);
    service = module.get<DecentroService>(DecentroService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateDigiLockerUrl', () => {
    it('should generate DigiLocker URL successfully', async () => {
      const mockRequest = {
        redirectUrl: 'https://example.com/redirect',
        opportunityId: 'test-opp-123',
        bookingAs: BookingAsEnum.INDIVIDUAL,
        lastStep: 1,
        applicantNumber: 1,
        residentStatus: 'NRI',
        relationship: 'FATHER',
      };

      const mockResponse = {
        status: 'SUCCESS',
        message: 'DigiLocker URL generated successfully',
        data: {
          session_url:
            'https://staging.uistream.decentro.tech/flow/digilocker/?auth_token=test',
          transactionId: 'test_transaction_id',
          applicantNumber: 1,
          lastStep: 1,
          opportunityId: 'test-opp-123',
          bookingAs: BookingAsEnum.INDIVIDUAL,
        },
      };

      mockDecentroService.generateDigiLockerUrl.mockResolvedValue(mockResponse);

      const result = await controller.generateDigiLockerUrl(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.generateDigiLockerUrl).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('getGstDetails', () => {
    it('should get GST details successfully', async () => {
      const mockRequest: GetGstDetailsDto = {
        gstNumber: '29AAACP2550R1ZX',
        opportunityId: 'test-opp-123',
        bookingAs: BookingAsEnum.INDIVIDUAL,
      };

      const mockResponse = {
        status: 'SUCCESS',
        message: 'GST details retrieved successfully',
        data: {
          gstNumber: '29AAACP2550R1ZX',
          businessName: 'Test Business',
          status: 'Active',
          opportunityId: 'test-opp-123',
          bookingAs: BookingAsEnum.INDIVIDUAL,
        },
      };

      mockDecentroService.getGstDetails.mockResolvedValue(mockResponse);

      const result = await controller.getGstDetails(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(service.getGstDetails).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('handleDigiLockerWebhook', () => {
    it('should handle webhook successfully', async () => {
      const mockWebhookData = {
        initialDecentroTxnId: 'test-transaction-id',
        data: {
          EAADHAAR: {
            data: {
              aadhaarUid: '123456789012',
              proofOfIdentity: {
                name: 'John Doe',
              },
            },
          },
          PAN: {
            idNumber: 'ABCDE1234F',
            userName: 'John Doe',
          },
        },
      };

      const mockResponse = {
        status: 'SUCCESS',
        message: 'Webhook processed successfully',
      };

      mockDecentroService.handleDigiLockerWebhook.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.handleDigiLockerWebhook(mockWebhookData);

      expect(result).toEqual(mockResponse);
      expect(service.handleDigiLockerWebhook).toHaveBeenCalledWith(
        mockWebhookData,
      );
    });

    it('should handle webhook errors', async () => {
      const mockWebhookData = {
        initialDecentroTxnId: 'test-transaction-id',
        data: {
          EAADHAAR: {
            data: {
              aadhaarUid: '123456789012',
              proofOfIdentity: {
                name: 'John Doe',
              },
            },
          },
          PAN: {
            idNumber: 'ABCDE1234F',
            userName: 'John Doe',
          },
        },
      };

      mockDecentroService.handleDigiLockerWebhook.mockRejectedValue(
        new HttpException('Webhook processing failed', 500),
      );

      await expect(
        controller.handleDigiLockerWebhook(mockWebhookData),
      ).rejects.toThrow(HttpException);

      expect(service.handleDigiLockerWebhook).toHaveBeenCalledWith(
        mockWebhookData,
      );
    });
  });

  describe('getimageDetails', () => {
    it('should call service getImageDetails with request payload', async () => {
      const request = {
        documentType: 'PAN',
        documentNumber: 'ABCDE1234F',
      } as any;
      const expected = { status: 'SUCCESS', message: 'Image details' };

      mockDecentroService.getImageDetails.mockResolvedValue(expected);

      const result = await controller.getimageDetails(request);

      expect(result).toEqual(expected);
      expect(service.getImageDetails).toHaveBeenCalledWith(request);
    });

    it('should throw error for service failure', async () => {
      const request = {
        documentType: 'PAN',
        documentNumber: 'ABCDE1234F',
      } as any;
      const error = new Error('Failed to get image details');
      mockDecentroService.getImageDetails.mockRejectedValue(error);

      await expect(controller.getimageDetails(request)).rejects.toThrow(error);
      expect(service.getImageDetails).toHaveBeenCalledWith(request);
    });
  });

  describe('verifyDigilockerStatus', () => {
    it('should call service verifyDigilockerStatus with opportunityId', async () => {
      const param = { opportunityId: 'opp-123' } as any;
      const expected = { status: 'SUCCESS', data: {} };

      mockDecentroService.verifyDigilockerStatus.mockResolvedValue(expected);

      const result = await controller.verifyDigilockerStatus(param);

      expect(result).toEqual(expected);
      expect(service.verifyDigilockerStatus).toHaveBeenCalledWith('opp-123');
    });

    it('should propagate service errors', async () => {
      const param = { opportunityId: 'opp-123' } as any;
      const error = new Error('Verification failed');
      mockDecentroService.verifyDigilockerStatus.mockRejectedValue(error);

      await expect(controller.verifyDigilockerStatus(param)).rejects.toThrow(
        error,
      );
      expect(service.verifyDigilockerStatus).toHaveBeenCalledWith('opp-123');
    });
  });
});
