import { Test, TestingModule } from '@nestjs/testing';
import { VoucherFormsController } from './voucher_form.controller';
import { VoucherFormsService } from './voucher_form.service';
import { EoiManagementService } from '../eoi_management/eoi_management.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  ApplicantDto,
  EoiDetailsDto,
  PaymentDetailsDto,
  ThirdFourthApplicantDto,
  EnableEditFormDto,
  SendOtpDto,
  VerifyOtpDto,
  DeletePaymentsDto,
} from './dto/update-voucher-form.dto';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { VoucherFormStatusEnum } from 'src/enums/eoi-form.enums';
import { APP_INTERCEPTOR } from '@nestjs/core';

describe('VoucherFormsController', () => {
  let controller: VoucherFormsController;

  const mockVoucherFormsService = {
    getVoucherFormByVoucherId: jest.fn(),
    updateVoucherFormApplicant: jest.fn(),
    updateEoiDetails: jest.fn(),
    updatePaymentDetails: jest.fn(),
    deletePaymentDetails: jest.fn(),
    deleteApplicantDetails: jest.fn(),
    resetVoucherForm: jest.fn(),
    enableEditForm: jest.fn(),
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
    getVoucherApplicants: jest.fn(),
    mapVoucherApplicants: jest.fn(),
    requestCancellation: jest.fn(),
    myVoucherslisting: jest.fn(),
    renderVoucherPreview: jest.fn(),
    downloadVoucherFormPDF: jest.fn(),
  };

  const mockEoiManagementService = {
    createVoucherForm: jest.fn(),
    buyNewVoucher: jest.fn(),
  };

  const mockInterceptor = {
    intercept: jest.fn((context, next) => next.handle()),
  };
  const mockEventEmitter = {
    emit: jest.fn(),
    emitAsync: jest.fn(),
  };

  const voucherId = 'VID-12345678';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoucherFormsController],
      providers: [
        { provide: VoucherFormsService, useValue: mockVoucherFormsService },
        { provide: EoiManagementService, useValue: mockEoiManagementService },
        { provide: EventEmitter2, useValue: mockEventEmitter },

        // THIS disables UserActivityInterceptor (and any others)
        {
          provide: APP_INTERCEPTOR,
          useValue: mockInterceptor,
        },
      ],
    }).compile();

    controller = module.get<VoucherFormsController>(VoucherFormsController);
    jest.clearAllMocks();
  });

  describe('getVoucherFormById', () => {
    const voucherId = 'VID-12345678';

    it('should return voucher form when found', async () => {
      const mockVoucherForm = { voucherId, isUpgradableToEOI: false };
      mockVoucherFormsService.getVoucherFormByVoucherId.mockResolvedValue(
        mockVoucherForm,
      );

      const result = await controller.getVoucherFormById(voucherId);

      expect(result).toEqual(mockVoucherForm);
      expect(result.voucherId).toBe(voucherId);
      expect(result.isUpgradableToEOI).toBe(false);
      expect(
        mockVoucherFormsService.getVoucherFormByVoucherId,
      ).toHaveBeenCalledWith(voucherId);
    });

    it('should throw NotFoundException if voucher not found', async () => {
      mockVoucherFormsService.getVoucherFormByVoucherId.mockRejectedValue(
        new NotFoundException('Voucher not found'),
      );

      await expect(controller.getVoucherFormById(voucherId)).rejects.toThrow(
        NotFoundException,
      );

      expect(
        mockVoucherFormsService.getVoucherFormByVoucherId,
      ).toHaveBeenCalledWith(voucherId);
    });

    it('should handle internal errors gracefully', async () => {
      const error = new Error('DB error');
      mockVoucherFormsService.getVoucherFormByVoucherId.mockRejectedValue(
        error,
      );

      await expect(controller.getVoucherFormById(voucherId)).rejects.toThrow(
        error,
      );

      expect(
        mockVoucherFormsService.getVoucherFormByVoucherId,
      ).toHaveBeenCalledWith(voucherId);
    });

    it('should respond within 500ms (performance test)', async () => {
      const mockVoucherForm = { voucherId, isUpgradableToEOI: true };
      mockVoucherFormsService.getVoucherFormByVoucherId.mockResolvedValue(
        mockVoucherForm,
      );

      const start = Date.now();
      await controller.getVoucherFormById(voucherId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
      expect(
        mockVoucherFormsService.getVoucherFormByVoucherId,
      ).toHaveBeenCalledWith(voucherId);
    });
  });

  describe('updateApplicant', () => {
    it('should update applicant successfully', async () => {
      const applicantDto = { applicantNumber: 1 } as ApplicantDto;
      const mockResponse = {
        message: 'Applicant details updated successfully.',
      };
      mockVoucherFormsService.updateVoucherFormApplicant.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.updateApplicant(voucherId, applicantDto);

      expect(result.message).toBe('Applicant details updated successfully.');
      expect(
        mockVoucherFormsService.updateVoucherFormApplicant,
      ).toHaveBeenCalledWith(voucherId, applicantDto);
    });

    it('should bubble up BadRequestException from service', async () => {
      const applicantDto = { applicantNumber: 1 } as ApplicantDto;
      mockVoucherFormsService.updateVoucherFormApplicant.mockRejectedValue(
        new BadRequestException('The Voucher form has already been submitted'),
      );

      await expect(
        controller.updateApplicant(voucherId, applicantDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass isApplicantsUpdated through to the service unchanged', async () => {
      const applicantDto = {
        applicantNumber: 1,
        isApplicantsUpdated: true,
      } as ApplicantDto;
      const mockResponse = {
        message: 'Applicant details updated successfully.',
      };
      mockVoucherFormsService.updateVoucherFormApplicant.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.updateApplicant(voucherId, applicantDto);

      expect(result.message).toBe('Applicant details updated successfully.');
      expect(
        mockVoucherFormsService.updateVoucherFormApplicant,
      ).toHaveBeenCalledWith(voucherId, applicantDto);
      const [, passedDto] =
        mockVoucherFormsService.updateVoucherFormApplicant.mock.calls[0];
      expect(passedDto).toBe(applicantDto);
      expect(passedDto.isApplicantsUpdated).toBe(true);
    });
  });

  describe('updateEoiDetails', () => {
    it('should update EOI details successfully', async () => {
      const eoiDetailsDto = { typology: '2BHK' } as any as EoiDetailsDto;
      const mockResponse = { message: 'Unit details updated successfully.' };
      mockVoucherFormsService.updateEoiDetails.mockResolvedValue(mockResponse);

      const result = await controller.updateEoiDetails(
        voucherId,
        eoiDetailsDto,
      );

      expect(result.message).toBe('Unit details updated successfully.');
      expect(mockVoucherFormsService.updateEoiDetails).toHaveBeenCalledWith(
        voucherId,
        eoiDetailsDto,
      );
    });

    it('should update EOI details with preferences successfully', async () => {
      const eoiDetailsDto = {
        eoiType: 'Standard',
        typology: '2BHK Normal',
        preferences: [
          { tower: 'A', floor: '10', series: 'Premium', unit: 'A101' },
          { tower: 'B', floor: '15', series: 'Deluxe', unit: 'B201' },
          { tower: 'C', floor: '20', series: 'Super Deluxe', unit: 'C301' },
        ],
        lastStep: 3,
      } as any as EoiDetailsDto;

      const mockResponse = {
        message: 'Unit details updated successfully.',
        data: { eoiDetails: eoiDetailsDto },
      };
      mockVoucherFormsService.updateEoiDetails.mockResolvedValue(mockResponse);

      const result = await controller.updateEoiDetails(
        voucherId,
        eoiDetailsDto,
      );

      expect(result.message).toBe('Unit details updated successfully.');
      expect(mockVoucherFormsService.updateEoiDetails).toHaveBeenCalledWith(
        voucherId,
        eoiDetailsDto,
      );
    });

    it('should bubble up NotFoundException from service', async () => {
      const eoiDetailsDto = { typology: '2BHK' } as any as EoiDetailsDto;
      mockVoucherFormsService.updateEoiDetails.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.updateEoiDetails(voucherId, eoiDetailsDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle EOI details merging correctly', async () => {
      const eoiDetailsDto = {
        eoiType: 'Preferential',
        typology: '3BHK',
        preferences: [{ tower: 'A', floor: '5', unit: 'A501' }],
        lastStep: 2,
      } as any as EoiDetailsDto;

      const mockResponse = {
        message: 'Unit details updated successfully.',
        data: {
          eoiDetails: {
            typology: 'Villa', // Existing field preserved
            eoiType: 'Preferential', // New field added
            preferences: [{ tower: 'A', floor: '5', unit: 'A501' }], // New field added
          },
        },
      };
      mockVoucherFormsService.updateEoiDetails.mockResolvedValue(mockResponse);

      const result = await controller.updateEoiDetails(
        voucherId,
        eoiDetailsDto,
      );

      expect(result.message).toBe('Unit details updated successfully.');
      expect(result.data.eoiDetails.typology).toBe('Villa'); // Preserved from existing
      expect(result.data.eoiDetails.eoiType).toBe('Preferential'); // Updated from DTO
      expect(mockVoucherFormsService.updateEoiDetails).toHaveBeenCalledWith(
        voucherId,
        eoiDetailsDto,
      );
    });

    it('should handle phase upgrade scenarios', async () => {
      const eoiDetailsDto = {
        eoiType: 'Standard',
        lastStep: 3,
      } as any as EoiDetailsDto;

      const mockResponse = {
        message: 'Unit details updated successfully.',
        data: {
          formPhase: 'EOI',
          voucherFormStatus: 'UPGRADING',
          paymentStatus: 'PARTIALLY_PAID',
          chronology: 'V_E',
        },
      };
      mockVoucherFormsService.updateEoiDetails.mockResolvedValue(mockResponse);

      const result = await controller.updateEoiDetails(
        voucherId,
        eoiDetailsDto,
      );

      expect(result.message).toBe('Unit details updated successfully.');
      expect(result.data.formPhase).toBe('EOI');
      expect(result.data.voucherFormStatus).toBe('UPGRADING');
      expect(mockVoucherFormsService.updateEoiDetails).toHaveBeenCalledWith(
        voucherId,
        eoiDetailsDto,
      );
    });

    it('should handle standard to preferential EOI upgrade', async () => {
      const eoiDetailsDto = {
        eoiType: 'Preferential',
        lastStep: 3,
      } as any as EoiDetailsDto;

      const mockResponse = {
        message: 'Unit details updated successfully.',
        data: {
          voucherFormStatus: 'UPGRADING',
          paymentStatus: 'PARTIALLY_PAID',
        },
      };
      mockVoucherFormsService.updateEoiDetails.mockResolvedValue(mockResponse);

      const result = await controller.updateEoiDetails(
        voucherId,
        eoiDetailsDto,
      );

      expect(result.message).toBe('Unit details updated successfully.');
      expect(result.data.voucherFormStatus).toBe('UPGRADING');
      expect(mockVoucherFormsService.updateEoiDetails).toHaveBeenCalledWith(
        voucherId,
        eoiDetailsDto,
      );
    });
  });

  describe('updatePaymentDetails', () => {
    it('should update payment details successfully', async () => {
      const paymentDto = {
        amount: 100000,
        transactions: [
          {
            amount: 100000,
            paymentDetails: {
              mode: 'EDC_MACHINE',
              transactionNumber: 'EDC123',
            },
          },
        ],
      } as any as PaymentDetailsDto;

      const mockResponse = {
        success: true,
        message: 'Payment details updated successfully',
      };
      mockVoucherFormsService.updatePaymentDetails.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.updatePaymentDetails(
        voucherId,
        paymentDto,
      );

      expect(result.success).toBe(true);
      expect(mockVoucherFormsService.updatePaymentDetails).toHaveBeenCalledWith(
        voucherId,
        paymentDto,
      );
    });

    it('should bubble up NotFoundException from service', async () => {
      const paymentDto = {
        amount: 0,
        transactions: [],
      } as any as PaymentDetailsDto;
      mockVoucherFormsService.updatePaymentDetails.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.updatePaymentDetails(voucherId, paymentDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePaymentDetails', () => {
    it('should delete payment details successfully', async () => {
      const deletePaymentsDto = {
        paymentId: 123,
        voucherId: 'VID-12345678',
      } as DeletePaymentsDto;

      const mockResponse = {
        success: true,
        message: 'Payment deleted successfully',
        data: { id: 1, voucherId: 'VID-12345678' },
      };
      mockVoucherFormsService.deletePaymentDetails.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.deletePaymentDetails(deletePaymentsDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment deleted successfully');
      expect(mockVoucherFormsService.deletePaymentDetails).toHaveBeenCalledWith(
        deletePaymentsDto,
      );
    });

    it('should bubble up NotFoundException from service', async () => {
      const deletePaymentsDto = {
        paymentId: 123,
        voucherId: 'VID-12345678',
      } as DeletePaymentsDto;

      mockVoucherFormsService.deletePaymentDetails.mockRejectedValue(
        new NotFoundException(
          'Payment not found or does not belong to this voucher',
        ),
      );

      await expect(
        controller.deletePaymentDetails(deletePaymentsDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle invalid payment ID', async () => {
      const deletePaymentsDto = {
        paymentId: 0,
        voucherId: 'VID-12345678',
      } as DeletePaymentsDto;

      mockVoucherFormsService.deletePaymentDetails.mockRejectedValue(
        new NotFoundException(
          'Payment not found or does not belong to this voucher',
        ),
      );

      await expect(
        controller.deletePaymentDetails(deletePaymentsDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetVoucherForm', () => {
    it('should reset voucher form successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher form reset successfully',
      };
      mockVoucherFormsService.resetVoucherForm.mockResolvedValue(mockResponse);

      const result = await controller.resetVoucherForm(voucherId);

      expect(result.success).toBe(true);
      expect(mockVoucherFormsService.resetVoucherForm).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should bubble up NotFoundException from service', async () => {
      mockVoucherFormsService.resetVoucherForm.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.resetVoucherForm(voucherId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCpVoucherForm', () => {
    it('should create CP voucher form successfully', async () => {
      const createVoucherFormDto = {
        firstName: 'John',
        lastName: 'Doe',
        countryCode: '+91',
        contactNumber: '9876543210',
        emailId: 'john@example.com',
        campaignId: 1,
        channelPartnerLinkId: 'CP-123',
      } as any;

      const mockResponse = {
        success: true,
        message: 'Voucher form created successfully',
        data: {
          voucherFormUrl: 'http://localhost:3000/voucher-form/VID-12345678',
          voucherForm: {
            id: 1,
            voucherId: 'VID-12345678',
            uniqueReferenceId: 'PHL-BR-0001',
            primarySource: 'Channel Partner',
            voucherFormStatus: 'Created',
          },
        },
      };

      mockEoiManagementService.createVoucherForm.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.createCpVoucherForm(createVoucherFormDto);

      expect(result.success).toBe(true);
      expect(result.data.voucherForm.primarySource).toBe('Channel Partner');
      expect(mockEoiManagementService.createVoucherForm).toHaveBeenCalledWith(
        createVoucherFormDto,
      );
    });

    it('should bubble up NotFoundException from service', async () => {
      const createVoucherFormDto = {
        firstName: 'John',
        lastName: 'Doe',
        channelPartnerLinkId: 'INVALID-CP',
      } as any;

      mockEoiManagementService.createVoucherForm.mockRejectedValue(
        new NotFoundException('Channel partner campaign not found'),
      );

      await expect(
        controller.createCpVoucherForm(createVoucherFormDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should bubble up BadRequestException from service', async () => {
      const createVoucherFormDto = {
        firstName: '',
        lastName: 'Doe',
        channelPartnerLinkId: 'CP-123',
      } as any;

      mockEoiManagementService.createVoucherForm.mockRejectedValue(
        new BadRequestException('Invalid input data'),
      );

      await expect(
        controller.createCpVoucherForm(createVoucherFormDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteApplicantDetails', () => {
    it('should delete applicant details successfully', async () => {
      const applicantNumber = 2;
      const mockResponse = {
        success: true,
        message: 'Applicant details deleted successfully',
      };

      mockVoucherFormsService.deleteApplicantDetails.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.deleteApplicantDetails(
        voucherId,
        applicantNumber,
      );

      expect(result.success).toBe(true);
      expect(
        mockVoucherFormsService.deleteApplicantDetails,
      ).toHaveBeenCalledWith(voucherId, applicantNumber);
    });

    it('should bubble up NotFoundException from service', async () => {
      const applicantNumber = 2;
      mockVoucherFormsService.deleteApplicantDetails.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.deleteApplicantDetails(voucherId, applicantNumber),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('enableEditForm', () => {
    it('should enable edit form successfully', async () => {
      const enableEditFormDto: EnableEditFormDto = {
        voucherStatus: VoucherFormStatusEnum.IN_PROGRESS,
        lastStep: 2,
      };
      const mockResponse = {
        success: true,
        message: 'Voucher form edit enabled successfully',
        data: {
          voucherId,
          voucherFormStatus: VoucherFormStatusEnum.IN_PROGRESS,
          lastStep: 2,
          customerLastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-15T10:30:00Z'),
          toBeVerified: false,
        },
      };
      mockVoucherFormsService.enableEditForm.mockResolvedValue(mockResponse);

      const result = await controller.enableEditForm(
        voucherId,
        enableEditFormDto,
      );

      expect(result.success).toBe(true);
      expect(result.data.voucherFormStatus).toBe(
        VoucherFormStatusEnum.IN_PROGRESS,
      );
      expect(result.data.lastStep).toBe(2);
      expect(mockVoucherFormsService.enableEditForm).toHaveBeenCalledWith(
        voucherId,
        enableEditFormDto.voucherStatus,
        enableEditFormDto.lastStep,
      );
    });

    it('should bubble up NotFoundException from service', async () => {
      const enableEditFormDto: EnableEditFormDto = {
        voucherStatus: VoucherFormStatusEnum.IN_PROGRESS,
        lastStep: 1,
      };
      mockVoucherFormsService.enableEditForm.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.enableEditForm(voucherId, enableEditFormDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockVoucherFormsService.enableEditForm).toHaveBeenCalledWith(
        voucherId,
        enableEditFormDto.voucherStatus,
        enableEditFormDto.lastStep,
      );
    });

    it('should handle different voucher status values', async () => {
      const enableEditFormDto: EnableEditFormDto = {
        voucherStatus: VoucherFormStatusEnum.CREATED,
        lastStep: 0,
      };
      const mockResponse = {
        success: true,
        message: 'Voucher form edit enabled successfully',
        data: {
          voucherId,
          voucherFormStatus: VoucherFormStatusEnum.CREATED,
          lastStep: 0,
          customerLastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-15T10:30:00Z'),
          toBeVerified: false,
        },
      };
      mockVoucherFormsService.enableEditForm.mockResolvedValue(mockResponse);

      const result = await controller.enableEditForm(
        voucherId,
        enableEditFormDto,
      );

      expect(result.success).toBe(true);
      expect(result.data.voucherFormStatus).toBe(VoucherFormStatusEnum.CREATED);
      expect(result.data.lastStep).toBe(0);
      expect(mockVoucherFormsService.enableEditForm).toHaveBeenCalledWith(
        voucherId,
        enableEditFormDto.voucherStatus,
        enableEditFormDto.lastStep,
      );
    });
  });

  describe('sendOtp', () => {
    it('should send OTP successfully for valid voucherId', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      const mockResponse = {
        statusCode: 200,
        message:
          "We've sent a 6-digit confirmation code to your email. Please enter the code below to verify your email address. The code is valid for 10 minutes.",
        data: null,
      };
      mockVoucherFormsService.sendOtp.mockResolvedValue(mockResponse);

      const result = await controller.sendOtp(sendOtpDto);

      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('6-digit confirmation code');
      expect(result.message).toContain('valid for 10 minutes');
      expect(result.data).toBeNull();
      expect(mockVoucherFormsService.sendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should bubble up NotFoundException from service', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'INVALID123',
      };
      mockVoucherFormsService.sendOtp.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockVoucherFormsService.sendOtp).toHaveBeenCalledWith(
        'INVALID123',
      );
    });

    it('should bubble up BadRequestException for non-submitted voucher', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.sendOtp.mockRejectedValue(
        new BadRequestException(
          'Verification is required only for submitted voucher forms',
        ),
      );

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.sendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should bubble up BadRequestException for missing email', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.sendOtp.mockRejectedValue(
        new BadRequestException(
          'No email address found for the primary applicant',
        ),
      );

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.sendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should bubble up BadRequestException for resend rate limit', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.sendOtp.mockRejectedValue(
        new BadRequestException(
          'Please wait at least 60 seconds before requesting a new OTP. This helps keep your account secure and prevents spam.',
        ),
      );

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.sendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should handle internal server errors gracefully', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.sendOtp.mockRejectedValue(
        new Error(
          'Something went wrong while sending the OTP. Please try again later.',
        ),
      );

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(Error);
      expect(mockVoucherFormsService.sendOtp).toHaveBeenCalledWith('VOU123');
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully for valid voucherId and OTP', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        voucherId: 'VOU123',
        otp: '123456',
      };
      const mockResponse = {
        statusCode: 200,
        message:
          'OTP verified successfully. Your voucher form has been verified.',
        data: {
          voucherId: 'VOU123',
          verified: true,
        },
      };
      mockVoucherFormsService.verifyOtp.mockResolvedValue(mockResponse);

      const result = await controller.verifyOtp(verifyOtpDto);

      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('OTP verified successfully');
      expect(result.data.verified).toBe(true);
      expect(result.data.voucherId).toBe('VOU123');
      expect(mockVoucherFormsService.verifyOtp).toHaveBeenCalledWith(
        'VOU123',
        '123456',
      );
    });

    it('should bubble up NotFoundException from service', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        voucherId: 'INVALID123',
        otp: '123456',
      };
      mockVoucherFormsService.verifyOtp.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.verifyOtp(verifyOtpDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockVoucherFormsService.verifyOtp).toHaveBeenCalledWith(
        'INVALID123',
        '123456',
      );
    });

    it('should bubble up BadRequestException for invalid OTP format', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        voucherId: 'VOU123',
        otp: '12345', // Invalid format (5 digits instead of 6)
      };
      mockVoucherFormsService.verifyOtp.mockRejectedValue(
        new BadRequestException(
          'Invalid OTP format. OTP must be a 6-digit number.',
        ),
      );

      await expect(controller.verifyOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.verifyOtp).toHaveBeenCalledWith(
        'VOU123',
        '12345',
      );
    });

    it('should bubble up BadRequestException for expired OTP', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        voucherId: 'VOU123',
        otp: '123456',
      };
      mockVoucherFormsService.verifyOtp.mockRejectedValue(
        new BadRequestException(
          'This OTP has expired. Please request a new one to continue.',
        ),
      );

      await expect(controller.verifyOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.verifyOtp).toHaveBeenCalledWith(
        'VOU123',
        '123456',
      );
    });

    it('should bubble up BadRequestException for invalid OTP', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        voucherId: 'VOU123',
        otp: '654321',
      };
      mockVoucherFormsService.verifyOtp.mockRejectedValue(
        new BadRequestException(
          'This OTP is invalid. Please request a new one to continue.',
        ),
      );

      await expect(controller.verifyOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.verifyOtp).toHaveBeenCalledWith(
        'VOU123',
        '654321',
      );
    });

    it('should bubble up UnauthorizedException for incorrect OTP', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        voucherId: 'VOU123',
        otp: '999999',
      };
      mockVoucherFormsService.verifyOtp.mockRejectedValue(
        new UnauthorizedException(
          'The OTP you entered is incorrect. Please try again.',
        ),
      );

      await expect(controller.verifyOtp(verifyOtpDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockVoucherFormsService.verifyOtp).toHaveBeenCalledWith(
        'VOU123',
        '999999',
      );
    });

    it('should bubble up BadRequestException for max attempts exceeded', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        voucherId: 'VOU123',
        otp: '123456',
      };
      mockVoucherFormsService.verifyOtp.mockRejectedValue(
        new BadRequestException(
          'You have exceeded the maximum number of incorrect OTP attempts. Please request a new OTP after some time to continue.',
        ),
      );

      await expect(controller.verifyOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.verifyOtp).toHaveBeenCalledWith(
        'VOU123',
        '123456',
      );
    });

    it('should bubble up BadRequestException for non-submitted voucher', async () => {
      const verifyOtpDto: VerifyOtpDto = {
        voucherId: 'VOU123',
        otp: '123456',
      };
      mockVoucherFormsService.verifyOtp.mockRejectedValue(
        new BadRequestException(
          'Verification is required only for submitted voucher forms',
        ),
      );

      await expect(controller.verifyOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.verifyOtp).toHaveBeenCalledWith(
        'VOU123',
        '123456',
      );
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP successfully for valid voucherId', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      const mockResponse = {
        statusCode: 200,
        message: 'OTP has been resent to your email address.',
        data: null,
      };
      mockVoucherFormsService.resendOtp.mockResolvedValue(mockResponse);

      const result = await controller.resendOtp(sendOtpDto);

      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('OTP has been resent');
      expect(result.data).toBeNull();
      expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should bubble up NotFoundException from service', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'INVALID123',
      };
      mockVoucherFormsService.resendOtp.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.resendOtp(sendOtpDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith(
        'INVALID123',
      );
    });

    it('should bubble up BadRequestException for non-submitted voucher', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.resendOtp.mockRejectedValue(
        new BadRequestException(
          'Verification is required only for submitted voucher forms',
        ),
      );

      await expect(controller.resendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should bubble up BadRequestException for missing email', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.resendOtp.mockRejectedValue(
        new BadRequestException(
          'No email address found for the primary applicant',
        ),
      );

      await expect(controller.resendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should bubble up BadRequestException for resend rate limit', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.resendOtp.mockRejectedValue(
        new BadRequestException(
          'You must wait at least 60 seconds before resending the OTP.',
        ),
      );

      await expect(controller.resendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should bubble up BadRequestException for max resend attempts exceeded', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.resendOtp.mockRejectedValue(
        new BadRequestException(
          'You have reached the maximum number of OTP resend attempts. Please try again later.',
        ),
      );

      await expect(controller.resendOtp(sendOtpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should handle resend when no existing OTP cache exists', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      const mockResponse = {
        statusCode: 200,
        message: 'OTP has been resent to your email address.',
        data: null,
      };
      mockVoucherFormsService.resendOtp.mockResolvedValue(mockResponse);

      const result = await controller.resendOtp(sendOtpDto);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('OTP has been resent to your email address.');
      expect(result.data).toBeNull();
      expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith('VOU123');
    });

    it('should handle internal server errors gracefully', async () => {
      const sendOtpDto: SendOtpDto = {
        voucherId: 'VOU123',
      };
      mockVoucherFormsService.resendOtp.mockRejectedValue(
        new Error(
          'Something went wrong while resending the OTP. Please try again later.',
        ),
      );

      await expect(controller.resendOtp(sendOtpDto)).rejects.toThrow(Error);
      expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith('VOU123');
    });
  });

  it('getVoucherFormById should bubble generic errors', async () => {
    const genericError = new Error('unexpected');
    mockVoucherFormsService.getVoucherFormByVoucherId.mockRejectedValue(
      genericError,
    );

    await expect(controller.getVoucherFormById(voucherId)).rejects.toThrow(
      genericError,
    );
  });

  it('updateApplicant should handle ThirdFourthApplicantDto and bubble NotFound', async () => {
    const thirdDto = {
      applicantNumber: 3,
      lastStep: 2,
    } as ThirdFourthApplicantDto;
    const mockResponse = { message: 'Applicant details updated successfully.' };
    mockVoucherFormsService.updateVoucherFormApplicant.mockResolvedValueOnce(
      mockResponse,
    );

    const result = await controller.updateApplicant(voucherId, thirdDto);
    expect(result.message).toBe('Applicant details updated successfully.');
    expect(
      mockVoucherFormsService.updateVoucherFormApplicant,
    ).toHaveBeenCalledWith(voucherId, thirdDto);

    mockVoucherFormsService.updateVoucherFormApplicant.mockRejectedValueOnce(
      new NotFoundException('Voucher form not found'),
    );
    await expect(
      controller.updateApplicant(voucherId, thirdDto),
    ).rejects.toThrow(NotFoundException);
  });

  it('updateEoiDetails should bubble BadRequestException', async () => {
    const eoiDetailsDto = { typology: '3BHK' } as any as EoiDetailsDto;
    mockVoucherFormsService.updateEoiDetails.mockRejectedValue(
      new BadRequestException('Invalid EOI details'),
    );

    await expect(
      controller.updateEoiDetails(voucherId, eoiDetailsDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('updatePaymentDetails should bubble BadRequestException', async () => {
    const paymentDto = {
      amount: -1,
      transactions: [],
    } as any as PaymentDetailsDto;
    mockVoucherFormsService.updatePaymentDetails.mockRejectedValue(
      new BadRequestException('Invalid payment'),
    );

    await expect(
      controller.updatePaymentDetails(voucherId, paymentDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('resetVoucherForm should bubble generic errors', async () => {
    const genericError = new Error('reset failed');
    mockVoucherFormsService.resetVoucherForm.mockRejectedValue(genericError);

    await expect(controller.resetVoucherForm(voucherId)).rejects.toThrow(
      genericError,
    );
  });

  it('handles simple concurrent getVoucherFormById calls', async () => {
    const mockResp = { success: true, message: 'ok' };
    mockVoucherFormsService.getVoucherFormByVoucherId.mockResolvedValue(
      mockResp,
    );

    const ids = ['VID-1', 'VID-2', 'VID-3'];
    const results = await Promise.all(
      ids.map((id) => controller.getVoucherFormById(id)),
    );

    expect(results).toHaveLength(3);
    results.forEach((r) => expect(r.success).toBe(true));
    expect(
      mockVoucherFormsService.getVoucherFormByVoucherId,
    ).toHaveBeenCalledTimes(3);
  });

  it('should maintain consistent behavior between sendOtp and resendOtp for same voucherId', async () => {
    const sendOtpDto: SendOtpDto = { voucherId: 'VOU123' };

    // Mock successful responses for both methods
    const sendOtpResponse = {
      statusCode: 200,
      message:
        "We've sent a 6-digit confirmation code to your email. Please enter the code below to verify your email address. The code is valid for 10 minutes.",
      data: null,
    };
    const resendOtpResponse = {
      statusCode: 200,
      message: 'OTP has been resent to your email address.',
      data: null,
    };

    mockVoucherFormsService.sendOtp.mockResolvedValue(sendOtpResponse);
    mockVoucherFormsService.resendOtp.mockResolvedValue(resendOtpResponse);

    // Test both methods
    const sendResult = await controller.sendOtp(sendOtpDto);
    const resendResult = await controller.resendOtp(sendOtpDto);

    // Verify both return success
    expect(sendResult.statusCode).toBe(200);
    expect(resendResult.statusCode).toBe(200);

    // Verify different messages for different contexts
    expect(sendResult.message).toContain('6-digit confirmation code');
    expect(resendResult.message).toContain('OTP has been resent');

    // Verify both return null data
    expect(sendResult.data).toBeNull();
    expect(resendResult.data).toBeNull();

    // Verify both methods were called with the same voucherId
    expect(mockVoucherFormsService.sendOtp).toHaveBeenCalledWith('VOU123');
    expect(mockVoucherFormsService.resendOtp).toHaveBeenCalledWith('VOU123');
  });

  // BUY NEW VOUCHER
  describe('buyNewVoucher', () => {
    it('should buy a new voucher successfully', async () => {
      const oldVoucherId = 1;
      const mockResponse = {
        id: 101,
        voucherId: 'VCHR-001',
        uniqueReferenceId: 'ENQ-001',
        status: 'IN_PROGRESS',
      };

      mockEoiManagementService.buyNewVoucher.mockResolvedValue(mockResponse);

      const result = await controller.buyNewVoucher(oldVoucherId);

      expect(result).toEqual(mockResponse);
      expect(mockEoiManagementService.buyNewVoucher).toHaveBeenCalledWith(
        oldVoucherId,
      );
    });

    it('should return duplicate voucher response if already exists', async () => {
      const oldVoucherId = 2;
      const mockResponse = {
        message: 'Duplicate voucher exists',
        existingVoucherId: 200,
      };

      mockEoiManagementService.buyNewVoucher.mockResolvedValue(mockResponse);

      const result = await controller.buyNewVoucher(oldVoucherId);

      expect(result).toEqual(mockResponse);
      expect(mockEoiManagementService.buyNewVoucher).toHaveBeenCalledWith(
        oldVoucherId,
      );
    });

    it('should throw NotFoundException if old voucher not found', async () => {
      const oldVoucherId = 999;
      mockEoiManagementService.buyNewVoucher.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.buyNewVoucher(oldVoucherId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockEoiManagementService.buyNewVoucher).toHaveBeenCalledWith(
        oldVoucherId,
      );
    });

    it('should handle internal errors gracefully', async () => {
      const oldVoucherId = 3;
      const error = new Error('DB error');
      mockEoiManagementService.buyNewVoucher.mockRejectedValue(error);

      await expect(controller.buyNewVoucher(oldVoucherId)).rejects.toThrow(
        error,
      );
      expect(mockEoiManagementService.buyNewVoucher).toHaveBeenCalledWith(
        oldVoucherId,
      );
    });

    it('should respond within 500ms (performance test)', async () => {
      const oldVoucherId = 4;
      const mockResponse = {
        id: 102,
        voucherId: 'VCHR-002',
        uniqueReferenceId: 'ENQ-002',
        status: 'IN_PROGRESS',
      };

      mockEoiManagementService.buyNewVoucher.mockResolvedValue(mockResponse);

      const start = Date.now();
      await controller.buyNewVoucher(oldVoucherId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should throw BadRequestException for invalid voucherId (null)', () => {
      expect(() => controller.buyNewVoucher(null)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid voucherId (0)', () => {
      expect(() => controller.buyNewVoucher(0)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid voucherId (negative)', () => {
      expect(() => controller.buyNewVoucher(-1)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid voucherId (undefined)', () => {
      expect(() => controller.buyNewVoucher(undefined)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVoucherApplicants', () => {
    const voucherId = 'VID-12345678';

    it('should return voucher applicants successfully', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Voucher applicants fetched successfully.',
        data: {
          applicants: [
            {
              value: 'VID-12345678/1',
              name: 'John Doe',
              isMinor: false,
            },
            {
              value: 'VID-12345678/2',
              name: 'Jane Doe',
              isMinor: false,
            },
          ],
        },
      };
      mockVoucherFormsService.getVoucherApplicants.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getVoucherApplicants(voucherId);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Voucher applicants fetched successfully.');
      expect(result.data.applicants).toHaveLength(2);
      expect(result.data.applicants[0].value).toBe('VID-12345678/1');
      expect(result.data.applicants[0].name).toBe('John Doe');
      expect(result.data.applicants[1].value).toBe('VID-12345678/2');
      expect(result.data.applicants[1].name).toBe('Jane Doe');
      expect(mockVoucherFormsService.getVoucherApplicants).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should return empty applicants array when no applicants exist', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Voucher applicants fetched successfully.',
        data: {
          applicants: [],
        },
      };
      mockVoucherFormsService.getVoucherApplicants.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getVoucherApplicants(voucherId);

      expect(result.statusCode).toBe(200);
      expect(result.data.applicants).toHaveLength(0);
      expect(mockVoucherFormsService.getVoucherApplicants).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should return all four applicants when all exist', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Voucher applicants fetched successfully.',
        data: {
          applicants: [
            {
              value: 'VID-12345678/1',
              name: 'Applicant One',
              isMinor: false,
            },
            {
              value: 'VID-12345678/2',
              name: 'Applicant Two',
              isMinor: false,
            },
            {
              value: 'VID-12345678/3',
              name: 'Applicant Three',
              isMinor: false,
            },
            {
              value: 'VID-12345678/4',
              name: 'Applicant Four',
              isMinor: false,
            },
          ],
        },
      };
      mockVoucherFormsService.getVoucherApplicants.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getVoucherApplicants(voucherId);

      expect(result.statusCode).toBe(200);
      expect(result.data.applicants).toHaveLength(4);
      expect(mockVoucherFormsService.getVoucherApplicants).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should bubble up NotFoundException from service', async () => {
      mockVoucherFormsService.getVoucherApplicants.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.getVoucherApplicants(voucherId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockVoucherFormsService.getVoucherApplicants).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should handle applicants with only first name', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Voucher applicants fetched successfully.',
        data: {
          applicants: [
            {
              value: 'VID-12345678/1',
              name: 'John',
              isMinor: false,
            },
          ],
        },
      };
      mockVoucherFormsService.getVoucherApplicants.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getVoucherApplicants(voucherId);

      expect(result.data.applicants[0].name).toBe('John');
      expect(mockVoucherFormsService.getVoucherApplicants).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should handle internal errors gracefully', async () => {
      const error = new Error('Database error');
      mockVoucherFormsService.getVoucherApplicants.mockRejectedValue(error);

      await expect(controller.getVoucherApplicants(voucherId)).rejects.toThrow(
        error,
      );

      expect(mockVoucherFormsService.getVoucherApplicants).toHaveBeenCalledWith(
        voucherId,
      );
    });
  });

  describe('requestCancellation', () => {
    it('should request cancellation successfully', async () => {
      const requestCancellationDto = {
        voucherId: 'VID-12345678',
        cancelReason: 'I want to cancel my voucher due to personal reasons',
      };
      const mockResponse = {
        success: true,
        message: 'Cancellation requested successfully',
        data: null,
      };
      mockVoucherFormsService.requestCancellation.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.requestCancellation(
        requestCancellationDto,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Cancellation requested successfully');
      expect(mockVoucherFormsService.requestCancellation).toHaveBeenCalledWith(
        requestCancellationDto,
      );
    });

    it('should bubble up NotFoundException when voucher not found', async () => {
      const requestCancellationDto = {
        voucherId: 'INVALID-VID',
        cancelReason: 'I want to cancel my voucher',
      };
      mockVoucherFormsService.requestCancellation.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.requestCancellation(requestCancellationDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockVoucherFormsService.requestCancellation).toHaveBeenCalledWith(
        requestCancellationDto,
      );
    });

    it('should bubble up BadRequestException when voucher already cancelled', async () => {
      const requestCancellationDto = {
        voucherId: 'VID-12345678',
        cancelReason: 'I want to cancel my voucher',
      };
      mockVoucherFormsService.requestCancellation.mockRejectedValue(
        new BadRequestException(
          'The voucher has already been sent for cancellation',
        ),
      );

      await expect(
        controller.requestCancellation(requestCancellationDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockVoucherFormsService.requestCancellation).toHaveBeenCalledWith(
        requestCancellationDto,
      );
    });

    it('should handle internal errors gracefully', async () => {
      const requestCancellationDto = {
        voucherId: 'VID-12345678',
        cancelReason: 'I want to cancel my voucher',
      };
      const error = new Error('Database error');
      mockVoucherFormsService.requestCancellation.mockRejectedValue(error);

      await expect(
        controller.requestCancellation(requestCancellationDto),
      ).rejects.toThrow(error);
    });
  });

  describe('getRelatedVouchers', () => {
    const voucherId = 'VID-12345678';

    it('should return related vouchers successfully', async () => {
      const mockResponse = {
        data: {
          vouchers: [
            { voucherId: 'VID-11111111', uniqueReferenceId: 'REF-001' },
            { voucherId: 'VID-22222222', uniqueReferenceId: 'REF-002' },
          ],
          count: 2,
        },
      };
      mockVoucherFormsService.myVoucherslisting.mockResolvedValue(mockResponse);

      const result = await controller.getRelatedVouchers(voucherId);

      expect(result.data.vouchers).toHaveLength(2);
      expect(result.data.count).toBe(2);
      expect(mockVoucherFormsService.myVoucherslisting).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should return empty vouchers array when no related vouchers exist', async () => {
      const mockResponse = {
        data: {
          vouchers: [],
          count: 0,
        },
      };
      mockVoucherFormsService.myVoucherslisting.mockResolvedValue(mockResponse);

      const result = await controller.getRelatedVouchers(voucherId);

      expect(result.data.vouchers).toHaveLength(0);
      expect(result.data.count).toBe(0);
      expect(mockVoucherFormsService.myVoucherslisting).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should bubble up NotFoundException when voucher not found', async () => {
      mockVoucherFormsService.myVoucherslisting.mockRejectedValue(
        new NotFoundException('Voucher record not found'),
      );

      await expect(controller.getRelatedVouchers(voucherId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockVoucherFormsService.myVoucherslisting).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should bubble up BadRequestException when tracking info missing', async () => {
      mockVoucherFormsService.myVoucherslisting.mockRejectedValue(
        new BadRequestException(
          'Record is missing user voucher tracking information',
        ),
      );

      await expect(controller.getRelatedVouchers(voucherId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVoucherFormsService.myVoucherslisting).toHaveBeenCalledWith(
        voucherId,
      );
    });

    it('should handle internal errors gracefully', async () => {
      const error = new Error('Database connection error');
      mockVoucherFormsService.myVoucherslisting.mockRejectedValue(error);

      await expect(controller.getRelatedVouchers(voucherId)).rejects.toThrow(
        error,
      );
    });
  });

  describe('renderBookingPreview', () => {
    const voucherId = 'VID-12345678';

    it('should render voucher preview successfully', async () => {
      const mockResponse = {
        voucher: { voucherId, uniqueReferenceId: 'REF-001' },
        termsCondition: {},
        pickListData: {},
        paymentModeEnum: {},
        SecondarySourceEnum: {},
        occupationEnum: {},
        voucherFormType: {},
        DISPLAY_DATE_FORMAT: 'DD/MM/YYYY',
        IMAGE_BASE_URL: 'https://s3.amazonaws.com',
        PROJECT_IMAGES_URL: 'https://images.example.com',
        hideEmailMobile: false,
      };
      mockVoucherFormsService.renderVoucherPreview.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.renderBookingPreview(voucherId);

      expect(result.voucher.voucherId).toBe(voucherId);
      expect(mockVoucherFormsService.renderVoucherPreview).toHaveBeenCalledWith(
        voucherId,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should render voucher preview with hideEmailMobile query param', async () => {
      const mockResponse = {
        voucher: { voucherId },
        hideEmailMobile: true,
      };
      mockVoucherFormsService.renderVoucherPreview.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.renderBookingPreview(voucherId, true);

      expect(result.hideEmailMobile).toBe(true);
      expect(mockVoucherFormsService.renderVoucherPreview).toHaveBeenCalledWith(
        voucherId,
        true,
        undefined,
        undefined,
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Voucher not found');
      mockVoucherFormsService.renderVoucherPreview.mockRejectedValue(error);

      await expect(
        controller.renderBookingPreview(voucherId, true),
      ).rejects.toThrow(error);
      expect(mockVoucherFormsService.renderVoucherPreview).toHaveBeenCalledWith(
        voucherId,
        true,
        undefined,
        undefined,
      );
    });
  });

  describe('downloadPdf', () => {
    const voucherId = 'VID-12345678';

    it('should download PDF successfully', async () => {
      const mockResponse = {
        message: 'PDF exported successfully',
        data: { filePath: 'export/VID-12345678/voucher-form-REF-001.pdf' },
      };
      mockVoucherFormsService.downloadVoucherFormPDF.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.downloadPdf(voucherId);

      expect(result.message).toBe('PDF exported successfully');
      expect(result.data.filePath).toContain('export/VID-12345678');
      expect(
        mockVoucherFormsService.downloadVoucherFormPDF,
      ).toHaveBeenCalledWith(voucherId);
    });

    it('should bubble up NotFoundException when voucher not found', async () => {
      mockVoucherFormsService.downloadVoucherFormPDF.mockRejectedValue(
        new NotFoundException('Voucher not found.'),
      );

      await expect(controller.downloadPdf(voucherId)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        mockVoucherFormsService.downloadVoucherFormPDF,
      ).toHaveBeenCalledWith(voucherId);
    });

    it('should handle internal errors gracefully', async () => {
      const error = new Error('PDF generation failed');
      mockVoucherFormsService.downloadVoucherFormPDF.mockRejectedValue(error);

      await expect(controller.downloadPdf(voucherId)).rejects.toThrow(error);
      expect(
        mockVoucherFormsService.downloadVoucherFormPDF,
      ).toHaveBeenCalledWith(voucherId);
    });
  });
});
