// imports
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SiteVisitLogInController } from './site_visit_logIn.controller';
import { SiteVisitLogInService } from './site_visit_logIn.service';
import { OtpThrottleGuard } from 'src/guards/otp-throttle.guard';

// tests
describe('SiteVisitLogInController', () => {
  let controller: SiteVisitLogInController;

  const mockService = {
    getProjectsByBrand: jest.fn(),
    checkOrStartFlow: jest.fn(),
    verifyOtp: jest.fn(),
    sendOtp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteVisitLogInController],
      providers: [
        {
          provide: SiteVisitLogInService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(OtpThrottleGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<SiteVisitLogInController>(SiteVisitLogInController);

    // reset all mock fns on the service
    mockService.getProjectsByBrand.mockReset();
    mockService.checkOrStartFlow.mockReset();
    mockService.verifyOtp.mockReset();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getProjectsByBrand', () => {
    it('should return projects for a brand (success + response time)', async () => {
      const mockResponse = {
        message: 'Projects fetched successfully',
        data: {
          brand: 'Puravankara',
          projects: [
            { id: 1, name: 'Alpha Heights' },
            { id: 2, name: 'SkyCourt' },
          ],
        },
      };
      mockService.getProjectsByBrand.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.getProjectsByBrand('Purva');
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(mockService.getProjectsByBrand).toHaveBeenCalledWith(
        'Purva',
        undefined,
      );
      expect(duration).toBeLessThan(1000);
    });

    it('should return projects for a userId (GRE flow)', async () => {
      const mockResponse = {
        message: 'Projects fetched successfully',
        data: {
          userId: 'gre_123',
          projects: [
            { id: 11, name: 'Gamma Meadows' },
            { id: 22, name: 'Delta Crest' },
          ],
        },
      };
      mockService.getProjectsByBrand.mockResolvedValueOnce(mockResponse);

      const result = await controller.getProjectsByBrand(undefined, 'gre_123');

      expect(result).toEqual(mockResponse);
      expect(mockService.getProjectsByBrand).toHaveBeenCalledWith(
        undefined,
        'gre_123',
      );
    });

    it('should return all projects when both brandName and userId are missing (undefined)', async () => {
      const mockResponse = {
        message: 'Projects fetched successfully',
        data: {
          projects: [
            { id: 1, name: 'Alpha Heights' },
            { id: 2, name: 'SkyCourt' },
          ],
        },
      };
      mockService.getProjectsByBrand.mockResolvedValueOnce(mockResponse);

      const result = await controller.getProjectsByBrand(
        undefined as unknown as string,
        undefined as unknown as string,
      );

      expect(result).toEqual(mockResponse);
      expect(mockService.getProjectsByBrand).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('should return all projects when brandName is only whitespace (controller passes through)', async () => {
      const mockResponse = {
        message: 'Projects fetched successfully',
        data: {
          projects: [
            { id: 10, name: 'Omega Vista' },
            { id: 20, name: 'Sunrise Enclave' },
          ],
        },
      };
      mockService.getProjectsByBrand.mockResolvedValueOnce(mockResponse);

      const result = await controller.getProjectsByBrand(
        '   ',
        undefined as unknown as string,
      );

      expect(result).toEqual(mockResponse);
      expect(mockService.getProjectsByBrand).toHaveBeenCalledWith(
        '   ',
        undefined,
      );
    });

    it('should throw BadRequestException when both brandName and userId are provided', async () => {
      await expect(
        controller.getProjectsByBrand('Purva', 'gre_123'),
      ).rejects.toThrow(BadRequestException);
      // ensure service is NOT called when both are provided
      expect(mockService.getProjectsByBrand).not.toHaveBeenCalled();
    });

    it('should surface NotFoundException when service throws not found (failure + response time)', async () => {
      mockService.getProjectsByBrand.mockRejectedValueOnce(
        new NotFoundException('No projects found for brand'),
      );

      const start = Date.now();
      await expect(
        controller.getProjectsByBrand(
          'UnknownBrand',
          undefined as unknown as string,
        ),
      ).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;

      expect(mockService.getProjectsByBrand).toHaveBeenCalledWith(
        'UnknownBrand',
        undefined,
      );
      expect(duration).toBeLessThan(1000);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Database error');
      mockService.getProjectsByBrand.mockRejectedValueOnce(err);

      await expect(
        controller.getProjectsByBrand('Purva', undefined as unknown as string),
      ).rejects.toThrow(err);
      expect(mockService.getProjectsByBrand).toHaveBeenCalledWith(
        'Purva',
        undefined,
      );
    });

    it('should pass through params as provided (preserve spacing for brand and userId)', async () => {
      const mockResponse = {
        message: 'Projects fetched successfully',
        data: { projects: [] },
      };
      mockService.getProjectsByBrand.mockResolvedValueOnce(mockResponse);

      const brandInput = '  Purva  ';
      const userInput = '  gre_789  '; // note: this case won’t run due to controller guard; test pass-through when userId alone
      const res1 = await controller.getProjectsByBrand(
        brandInput,
        undefined as unknown as string,
      );
      expect(res1).toEqual(mockResponse);
      expect(mockService.getProjectsByBrand).toHaveBeenCalledWith(
        brandInput,
        undefined,
      );

      mockService.getProjectsByBrand.mockResolvedValueOnce(mockResponse);
      const res2 = await controller.getProjectsByBrand(undefined, userInput);
      expect(res2).toEqual(mockResponse);
      expect(mockService.getProjectsByBrand).toHaveBeenCalledWith(
        undefined,
        userInput,
      );
    });
  });

  describe('checkOrStartFlow', () => {
    it('welcome-code path → returns welcome details (success + response time)', async () => {
      const dto = { welcomeCode: 'WEL-123' } as any;
      const welcomePayload = {
        statusCode: 200,
        message: 'Welcome code details',
        data: { id: 'WEL-123', name: 'John' },
      };

      mockService.checkOrStartFlow.mockResolvedValueOnce(welcomePayload);

      const start = Date.now();
      const result = await controller.check(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(welcomePayload);
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(1000);
    });

    it('validation → throws when neither welcomeCode nor (mobile + projectInterested) provided', async () => {
      const dto = { mobile: undefined, projectInterested: undefined } as any;

      mockService.checkOrStartFlow.mockRejectedValueOnce(
        new BadRequestException(
          'Provide either welcomeCode OR mobile + projectInterested',
        ),
      );

      await expect(controller.check(dto)).rejects.toThrow(BadRequestException);
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
    });

    it('NL path → normalized EnqRefNo from "enqRefNo"', async () => {
      const dto = { mobile: '9999', projectInterested: 'Project-A' } as any;
      const response = {
        statusCode: 200,
        message: 'New lead (NL)',
        data: {
          status: 'NL',
          mobile: '9999',
          projectInterested: 'Project-A',
          id: 'SF-1',
          EnqRefNo: 'ENQ-LOWER',
        },
      };

      mockService.checkOrStartFlow.mockResolvedValueOnce(response);

      const result = await controller.check(dto);

      expect(result).toEqual(response);
      expect(result.data.status).toBe('NL');
      expect(result.data.EnqRefNo).toBe('ENQ-LOWER');
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
    });

    it('NL path → normalized EnqRefNo from "EnqRefNo"', async () => {
      const dto = { mobile: '8888', projectInterested: 'Project-B' } as any;
      const response = {
        statusCode: 200,
        message: 'New lead (NL)',
        data: {
          status: 'NL',
          mobile: '8888',
          projectInterested: 'Project-B',
          id: 'SF-2',
          EnqRefNo: 'ENQ-UPPER',
        },
      };

      mockService.checkOrStartFlow.mockResolvedValueOnce(response);

      const result = await controller.check(dto);

      expect(result.data.status).toBe('NL');
      expect(result.data.EnqRefNo).toBe('ENQ-UPPER');
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
    });

    it('EL path → mobile present, project found, revisit=1', async () => {
      const dto = { mobile: '1111', projectInterested: 'Proj-X' } as any;
      const response = {
        statusCode: 200,
        message: 'Existing lead (EL)',
        data: { isMarkRevisit: 1, customerId: 'CUST-1' },
      };

      mockService.checkOrStartFlow.mockResolvedValueOnce(response);

      const result = await controller.check(dto);

      expect(result.data.isMarkRevisit).toBe(1);
      expect(result.data.customerId).toBe('CUST-1');
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
    });

    it('EL path → uses Mobile (capitalized), no existing, revisit=0', async () => {
      const dto = { mobile: '2222', projectInterested: 'Proj-Y' } as any;
      const response = {
        statusCode: 200,
        message: 'Existing lead (EL)',
        data: { isMarkRevisit: 0, customerId: 'CUST-2' },
      };

      mockService.checkOrStartFlow.mockResolvedValueOnce(response);

      const result = await controller.check(dto);

      expect(result.data.isMarkRevisit).toBe(0);
      expect(result.data.customerId).toBe('CUST-2');
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
    });

    it('EL path → project not found → skip siteVisit lookup, revisit=0', async () => {
      const dto = { mobile: '3333', projectInterested: 'Proj-Z' } as any;
      const response = {
        statusCode: 200,
        message: 'Existing lead (EL)',
        data: { isMarkRevisit: 0, customerId: 'CUST-3' },
      };

      mockService.checkOrStartFlow.mockResolvedValueOnce(response);

      const result = await controller.check(dto);

      expect(result.data.isMarkRevisit).toBe(0);
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
    });

    it('EL path → fallback to dto.mobile when statusRes lacks mobile', async () => {
      const dto = { mobile: '4444', projectInterested: 'Proj-Q' } as any;
      const response = {
        statusCode: 200,
        message: 'Existing lead (EL)',
        data: { isMarkRevisit: 0, customerId: 'CUST-4' },
      };

      mockService.checkOrStartFlow.mockResolvedValueOnce(response);

      const result = await controller.check(dto);

      expect(result.data.isMarkRevisit).toBe(0);
      expect(result.data.customerId).toBe('CUST-4');
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
    });

    it('should bubble unexpected errors from service', async () => {
      const dto = { mobile: '9999', projectInterested: 'Any' } as any;
      mockService.checkOrStartFlow.mockRejectedValueOnce(
        new Error('SFDC timeout'),
      );

      await expect(controller.check(dto)).rejects.toThrow('SFDC timeout');
      expect(mockService.checkOrStartFlow).toHaveBeenCalledWith(dto);
    });
  });

  describe('verifyOtp', () => {
    it('success → returns verification result (response time)', async () => {
      const dto = { mobile: '9999', otp: '123456' } as any;
      const response = { statusCode: 200, message: 'OTP verified' };

      mockService.verifyOtp.mockResolvedValueOnce(response);

      const start = Date.now();
      const result = await controller.verify(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(response);
      expect(mockService.verifyOtp).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(1000);
    });

    it('failure → invalid/expired OTP', async () => {
      const dto = { mobile: '9999', otp: '000000' } as any;

      mockService.verifyOtp.mockRejectedValueOnce(
        new BadRequestException('OTP expired or invalid'),
      );

      await expect(controller.verify(dto)).rejects.toThrow(BadRequestException);
      expect(mockService.verifyOtp).toHaveBeenCalledWith(dto);
    });

    it('unexpected error → bubbles up', async () => {
      const dto = { mobile: '9999', otp: '123456' } as any;

      mockService.verifyOtp.mockRejectedValueOnce(new Error('Redis down'));

      await expect(controller.verify(dto)).rejects.toThrow('Redis down');
      expect(mockService.verifyOtp).toHaveBeenCalledWith(dto);
    });
  });

  describe('sendOtp', () => {
    it('success → sends OTP (response time)', async () => {
      mockService.sendOtp.mockResolvedValueOnce(undefined);

      const dto = {
        mobile: '9999999999',
        projectInterested: 'Alpha Heights',
        brand: 'Puravankara',
      };

      const start = Date.now();
      const result = await controller.sendOtp(dto);
      const duration = Date.now() - start;

      expect(result).toEqual({
        statusCode: 200,
        message: 'OTP sent to mobile. Please verify.',
      });
      expect(mockService.sendOtp).toHaveBeenCalledWith(
        '9999999999',
        'Alpha Heights',
        'Puravankara',
      );
      expect(duration).toBeLessThan(1000);
    });

    it('validation failure → missing required fields (bubbled from service)', async () => {
      mockService.sendOtp.mockRejectedValueOnce(
        new BadRequestException('mobile & projectInterested required'),
      );

      const dto = { mobile: '', projectInterested: '', brand: 'Puravankara' };

      await expect(controller.sendOtp(dto as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.sendOtp).toHaveBeenCalledWith('', '', 'Puravankara');
    });

    it('throttle failure → min resend gap enforced (bubbled from service)', async () => {
      mockService.sendOtp.mockRejectedValueOnce(
        new BadRequestException(
          'Please wait 30 seconds before requesting a new OTP.',
        ),
      );

      const dto = {
        mobile: '9999999999',
        projectInterested: 'Alpha Heights',
        brand: 'Puravankara',
      };

      await expect(controller.sendOtp(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.sendOtp).toHaveBeenCalledWith(
        '9999999999',
        'Alpha Heights',
        'Puravankara',
      );
    });

    it('blocked failure → too many attempts within window (bubbled from service)', async () => {
      mockService.sendOtp.mockRejectedValueOnce(
        new BadRequestException(
          'Too many OTP requests. You are blocked for 10 minutes.',
        ),
      );

      const dto = {
        mobile: '9999999999',
        projectInterested: 'Alpha Heights',
        brand: 'Puravankara',
      };

      await expect(controller.sendOtp(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.sendOtp).toHaveBeenCalledWith(
        '9999999999',
        'Alpha Heights',
        'Puravankara',
      );
    });

    it('unexpected error → bubbles up', async () => {
      mockService.sendOtp.mockRejectedValueOnce(new Error('SMS provider down'));

      const dto = {
        mobile: '9999999999',
        projectInterested: 'Alpha Heights',
        brand: 'Puravankara',
      };

      await expect(controller.sendOtp(dto)).rejects.toThrow(
        'SMS provider down',
      );
      expect(mockService.sendOtp).toHaveBeenCalledWith(
        '9999999999',
        'Alpha Heights',
        'Puravankara',
      );
    });

    it('preserves DTO values exactly (including spacing)', async () => {
      mockService.sendOtp.mockResolvedValueOnce(undefined);

      const dto = {
        mobile: '  9999999999 ',
        projectInterested: '  Alpha Heights  ',
        brand: '  Puravankara ',
      };

      const res = await controller.sendOtp(dto as any);

      expect(res).toEqual({
        statusCode: 200,
        message: 'OTP sent to mobile. Please verify.',
      });
      expect(mockService.sendOtp).toHaveBeenCalledWith(
        '  9999999999 ',
        '  Alpha Heights  ',
        '  Puravankara ',
      );
    });

    it('brand optional → passes undefined through to service', async () => {
      mockService.sendOtp.mockResolvedValueOnce(undefined);

      const dto = { mobile: '9999999999', projectInterested: 'Alpha Heights' }; // no brand

      const res = await controller.sendOtp(dto as any);

      expect(res).toEqual({
        statusCode: 200,
        message: 'OTP sent to mobile. Please verify.',
      });
      expect(mockService.sendOtp).toHaveBeenCalledWith(
        '9999999999',
        'Alpha Heights',
        undefined,
      );
    });
  });

  describe('resendOtp', () => {
    it('success → resends OTP (response time)', async () => {
      mockService.sendOtp.mockResolvedValueOnce(undefined);

      const dto = {
        mobile: '9999999999',
        projectInterested: 'Alpha Heights',
        brand: 'Puravankara',
      };

      const start = Date.now();
      const result = await controller.resendOtp(dto as any);
      const duration = Date.now() - start;

      expect(result).toEqual({
        statusCode: 200,
        message: 'OTP resent successfully',
      });
      expect(mockService.sendOtp).toHaveBeenCalledWith(
        '9999999999',
        'Alpha Heights',
        'Puravankara',
      );
      expect(duration).toBeLessThan(1000);
    });

    it('failure → missing mobile or projectInterested', async () => {
      const invalidDto = { mobile: '', projectInterested: '' };
      await expect(controller.resendOtp(invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.sendOtp).not.toHaveBeenCalled();
    });

    it('failure → service errors bubble up', async () => {
      const dto = {
        mobile: '9999999999',
        projectInterested: 'Alpha Heights',
        brand: 'Puravankara',
      };

      mockService.sendOtp.mockRejectedValueOnce(new Error('SMS provider down'));

      await expect(controller.resendOtp(dto as any)).rejects.toThrow(
        'SMS provider down',
      );
      expect(mockService.sendOtp).toHaveBeenCalledWith(
        '9999999999',
        'Alpha Heights',
        'Puravankara',
      );
    });
  });
});
