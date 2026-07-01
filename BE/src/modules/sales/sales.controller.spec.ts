import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { BookingsService } from '../bookings/bookings.service';
import { SfdcService } from '../sfdc/sfdc.service';
import { PreBookingDto } from './dto/pre-booking.dto';
import { PostBookingDto } from './dto/post-booking.dto';
import { OfficeUseMainDto } from './dto/office-use.dto';
import { SendFormEmailDto } from './dto/send-form-email.dto';
import { UnitSwappingDto } from './dto/unit-swapping.dto';
import {
  ProfessionalDetailsDto,
  ResetBookingDto,
} from '../bookings/dto/update-booking.dto';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { SUCCESS, TEST_EXECUTION_TIME } from 'src/config/constants';
import {
  FormType,
  BookingFormStatusEnum,
  AmountAdjustmentEnum,
} from 'src/enums/booking-form-status.enum';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  CanActivate,
} from '@nestjs/common';
import { logger } from 'src/logger/logger';

// Import the real guards used in the controller
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { OppAccessGuard } from '../sso/gaurds/opp-access.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { ReferrerDto } from '../bookings/dto/update-referrer.dto';
import {
  GetGroupDetailsDto,
  CreateUpdateGroupDto,
  GetGroupInfoDto,
} from './dto/multi-booking.dto';
import { SendGroupLinkDto } from './dto/send-group-link.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingAsEnum } from 'src/enums/booking-as.enum';

// Mock Guards
class MockRmAdminAuthGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

class MockOppAccessGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

class MockRolesGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

// Mock the logger
jest.mock('src/logger/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SalesController', () => {
  let controller: SalesController;
  let salesService: jest.Mocked<SalesService>;
  let bookingsService: jest.Mocked<BookingsService>;

  const mockUser = {
    id: 1,
    dbId: 123,
    name: 'Test User',
    email: 'test@example.com',
    role: 'RM',
  };

  const mockBookingData = {
    Id: 'OPP123',
    enqrefno: 'ENQ123',
    unitno: 'A-101',
    Project: { Name: 'Test Project' },
    Name: 'Test Customer',
    primarysource: 'Website',
    Amount: 5000000,
    SalesValue: 5000000,
    BFstatus: BookingFormStatusEnum.IN_PROGRESS,
    status: BookingFormStatusEnum.IN_PROGRESS,
    isCompleted: false,
    name: 'Test Customer',
  };

  const mockOfficeUseData = {
    bookingSchemeName: 'Test Scheme',
    BookingRegionAsPerRM: 'Test Region',
    primarySource: 'Website',
    secondarySource: 'Social Media',
    tertiarySource: 'Referral',
    enquiryRefNumber: 'ENQ123',
    cpName: 'Test CP',
    isCorporateSale: false,
    employeeName: 'Test Employee',
    employeeId: 'EMP123',
    cpReraNumber: 'RERA123',
    companyName: 'Test Company',
    designation: 'Manager',
    remarks: 'Test remarks',
    salesTeam: [],
    preSales1Name: {
      id: 1,
      userId: 'user1',
      userName: 'User 1',
      signatureImage: 'sig1.jpg',
    },
    preSales2Name: {
      id: 2,
      userId: 'user2',
      userName: 'User 2',
      signatureImage: 'sig2.jpg',
    },
    preSalesHeadName: {
      id: 3,
      userId: 'user3',
      userName: 'User 3',
      signatureImage: 'sig3.jpg',
    },
    loyaltyTeamName: {
      id: 4,
      userId: 'user4',
      userName: 'User 4',
      signatureImage: 'sig4.jpg',
    },
    projectHeadName: {
      id: 5,
      userId: 'user5',
      userName: 'User 5',
      signatureImage: 'sig5.jpg',
    },
    businessHeadName: {
      id: 6,
      userId: 'user6',
      userName: 'User 6',
      signatureImage: 'sig6.jpg',
    },
    businessHead2Name: {
      id: 7,
      userId: 'user7',
      userName: 'User 7',
      signatureImage: 'sig7.jpg',
    },
    saveForLater: false,
  };

  const mockPreBookingDto: PreBookingDto = {
    isPreBookingSubmitted: true,
    primarySourceDisabled: false,
  };
  const mockPostBookingDto: PostBookingDto = {
    saveForLater: false,

    applicant1: {
      personalDetails: {
        image: ['https://cdn.example.com/app1/personal/img1.jpg'],
        panNumber: undefined,
        panImage: undefined,
        aadhaarNumber: undefined,
        aadhaarImage: undefined,
        passportNumber: undefined,
        passportImage: undefined,
        ociNumber: undefined,
        ociImage: undefined,
        OCIAlternateDocImage: undefined,
        legalGuardianDoc: undefined,
        addressProofImage: undefined,
      },
      professionalDetails: new ProfessionalDetailsDto(),
    },

    applicant2: {
      personalDetails: {
        image: ['https://cdn.example.com/app1/personal/img1.jpg'],
        panNumber: undefined,
        panImage: undefined,
        aadhaarNumber: undefined,
        aadhaarImage: undefined,
        passportNumber: undefined,
        passportImage: undefined,
        ociNumber: undefined,
        ociImage: undefined,
        OCIAlternateDocImage: undefined,
        legalGuardianDoc: undefined,
        addressProofImage: undefined,
      },
      professionalDetails: new ProfessionalDetailsDto(),
    },

    applicant3: {
      personalDetails: {
        image: ['https://cdn.example.com/app1/personal/img1.jpg'],
        panNumber: undefined,
        panImage: undefined,
        aadhaarNumber: undefined,
        aadhaarImage: undefined,
        passportNumber: undefined,
        passportImage: undefined,
        ociNumber: undefined,
        ociImage: undefined,
        OCIAlternateDocImage: undefined,
        legalGuardianDoc: undefined,
        addressProofImage: undefined,
      },
      professionalDetails: new ProfessionalDetailsDto(),
    },
    applicant4: {
      personalDetails: {
        image: ['https://cdn.example.com/app1/personal/img1.jpg'],
        panNumber: undefined,
        panImage: undefined,
        aadhaarNumber: undefined,
        aadhaarImage: undefined,
        passportNumber: undefined,
        passportImage: undefined,
        ociNumber: undefined,
        ociImage: undefined,
        OCIAlternateDocImage: undefined,
        legalGuardianDoc: undefined,
        addressProofImage: undefined,
      },
      professionalDetails: new ProfessionalDetailsDto(),
    },

    paymentProofs: [
      {
        transactionId: 'TXN123456',
        paymentProof: ['proof1.jpg'],
      },
    ],
  };

  const mockOfficeUseMainDto: OfficeUseMainDto = {
    officeUse: mockOfficeUseData,
    referrerDetails: {
      name: 'Test Referrer',
      email: 'referrer@example.com',
      address: 'Test Address',
      houseNumber: '123',
      relation: 'Friend',
      unitNumber: 'A-101',
      countryCode: '+91',
      mobileNumber: '9876543210',
      propertyName: 'Test Project',
      altCountryCode: '+91',
      altMobileNumber: '9876543211',
      postAgreement: 'Test Agreement',
      pointsAdjustment: false,
      signedStatus: 'PENDING',
      isSignedOffline: false,
      saveForLater: false,
      lastStep: 1,
      bookingAs: BookingAsEnum.INDIVIDUAL,
    } as ReferrerDto,
    saveForLater: false,
  };

  const mockSendFormEmailDto: SendFormEmailDto = {
    oppId: 'OPP123',
    formType: FormType.BOOKING,
    emailIds: 'test1@example.com,test2@example.com',
  };

  const mockUnitSwappingDto: UnitSwappingDto = {
    sourceOppId: 'OPP123',
    targetOppId: 'OPP456',
  };

  const mockResetBookingDto: ResetBookingDto = {
    reason: 'Test reset',
  };

  const mockQueryDto: CommonFindAllQueryDto = {
    page: 1,
    limit: 10,
    search: 'test',
    sortBy: 'createdAt',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        {
          provide: SalesService,
          useValue: {
            submitPreBooking: jest.fn(),
            updateOfficeUse: jest.fn(),
            uploadSignPdf: jest.fn(),
            updatePostBooking: jest.fn(),
            getAssignedOpportunities: jest.fn(),
            getCancelledOpportunities: jest.fn(),
            unitSwapping: jest.fn(),
            listGroups: jest.fn(),
            getMultiBookingGroup: jest.fn(),
            createBookingGroup: jest.fn(),
            updateBookingGroup: jest.fn(),
            getGroupApplicants: jest.fn(),
            getBookingApplicants: jest.fn(),
            manageApplicants: jest.fn(),
            sendGroupLink: jest.fn(),
          },
        },
        {
          provide: BookingsService,
          useValue: {
            getBookingByOppId: jest.fn(),
            getOfficeUseByOppId: jest.fn(),
            updateReferrer: jest.fn(),
            resetBookingForm: jest.fn(),
            resetReferrerForm: jest.fn(),
            renderPostBookingPreview: jest.fn(),
            getOpportunityDetailById: jest.fn(),
            sendFormEmail: jest.fn(),
            getMultiBookingGroup: jest.fn(),
            getAssignedOpportunities: jest.fn(),
            downloadApplicantPDF: jest.fn(),
          },
        },
        {
          provide: SfdcService,
          useValue: {
            // Add any SFDC service methods if needed
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    })
      // Override the guards to avoid CACHE_MANAGER dependency
      .overrideGuard(RmAdminAuthGuard)
      .useValue(new MockRmAdminAuthGuard())
      .overrideGuard(OppAccessGuard)
      .useValue(new MockOppAccessGuard())
      .overrideGuard(RolesGuard)
      .useValue(new MockRolesGuard())
      .compile();

    controller = module.get<SalesController>(SalesController);
    salesService = module.get<SalesService>(
      SalesService,
    ) as jest.Mocked<SalesService>;
    bookingsService = module.get(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBookingByOppId', () => {
    it('should return booking data for valid opportunity ID (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Booking retrieved successfully',
        data: mockBookingData,
      };

      bookingsService.getBookingByOppId.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.getBookingByOppId(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.getBookingByOppId).toHaveBeenCalledWith(
        oppId,
        true,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when booking not found (failure + response time)', async () => {
      const oppId = 'INVALID_OPP';
      const error = new NotFoundException('Booking not found');

      bookingsService.getBookingByOppId.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.getBookingByOppId(oppId)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getOfficeUseByOppId', () => {
    it('should return office use data for valid opportunity ID (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Office use data retrieved successfully',
        data: mockOfficeUseData,
      };

      bookingsService.getOfficeUseByOppId.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.getOfficeUseByOppId(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.getOfficeUseByOppId).toHaveBeenCalledWith(oppId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when office use data not found (failure + response time)', async () => {
      const oppId = 'INVALID_OPP';
      const error = new NotFoundException('Office use data not found');

      bookingsService.getOfficeUseByOppId.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.getOfficeUseByOppId(oppId)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('updateOfficeUse', () => {
    it('should update office use data successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Office use data updated successfully.',
        data: {
          officeUse: mockOfficeUseData,
          referrerDetails: mockOfficeUseMainDto.referrerDetails,
        },
      };

      salesService.updateOfficeUse.mockResolvedValue({
        data: mockOfficeUseData,
      });
      bookingsService.updateReferrer.mockResolvedValue({
        data: mockOfficeUseMainDto.referrerDetails,
      });

      const start = Date.now();
      const result = await controller.updateOfficeUse(
        mockUser,
        oppId,
        mockOfficeUseMainDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.updateOfficeUse).toHaveBeenCalledWith(
        mockUser,
        oppId,
        mockOfficeUseMainDto.officeUse,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should update office use data without referrer details (success + response time)', async () => {
      const oppId = 'OPP123';
      const officeUseDtoWithoutReferrer = {
        ...mockOfficeUseMainDto,
        referrerDetails: undefined,
      };

      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Office use data updated successfully.',
        data: {
          officeUse: mockOfficeUseData,
          referrerDetails: undefined,
        },
      };

      salesService.updateOfficeUse.mockResolvedValue({
        data: mockOfficeUseData,
      });

      const start = Date.now();
      const result = await controller.updateOfficeUse(
        mockUser,
        oppId,
        officeUseDtoWithoutReferrer,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.updateReferrer).not.toHaveBeenCalled();
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle save for later flag (success + response time)', async () => {
      const oppId = 'OPP123';
      const officeUseDtoWithSaveForLater = {
        ...mockOfficeUseMainDto,
        saveForLater: true,
      };

      salesService.updateOfficeUse.mockResolvedValue({
        data: mockOfficeUseData,
      });

      const start = Date.now();
      await controller.updateOfficeUse(
        mockUser,
        oppId,
        officeUseDtoWithSaveForLater,
      );
      const duration = Date.now() - start;

      expect(salesService.updateOfficeUse).toHaveBeenCalledWith(
        mockUser,
        oppId,
        { ...mockOfficeUseData, saveForLater: true },
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should log and rethrow error when update fails (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new BadRequestException('Update failed');

      salesService.updateOfficeUse.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.updateOfficeUse(mockUser, oppId, mockOfficeUseMainDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;

      expect(logger.error).toHaveBeenCalledWith(
        `Error updating office use for opportunity ${oppId}: ${error.message}`,
        {
          error,
          oppId,
        },
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('submitPreBooking', () => {
    it('should submit pre-booking successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Pre-booking submitted successfully',
        data: mockBookingData,
      };

      salesService.submitPreBooking.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.submitPreBooking(
        mockUser,
        oppId,
        mockPreBookingDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.submitPreBooking).toHaveBeenCalledWith(
        mockUser,
        oppId,
        mockPreBookingDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when pre-booking submission fails (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new BadRequestException('Pre-booking submission failed');

      salesService.submitPreBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.submitPreBooking(mockUser, oppId, mockPreBookingDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('resetBookingForm', () => {
    it('should reset booking form successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Booking form reset successfully',
      };

      bookingsService.resetBookingForm.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.resetBookingForm(
        oppId,
        mockResetBookingDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.resetBookingForm).toHaveBeenCalledWith(
        oppId,
        mockResetBookingDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when reset fails (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new BadRequestException('Reset failed');

      bookingsService.resetBookingForm.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.resetBookingForm(oppId, mockResetBookingDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('resetReferrerForm', () => {
    it('should reset referrer form successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Referrer form reset successfully',
      };

      bookingsService.resetReferrerForm.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.resetReferrerForm(
        oppId,
        mockResetBookingDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.resetReferrerForm).toHaveBeenCalledWith(
        oppId,
        mockResetBookingDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when reset fails (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new BadRequestException('Reset failed');

      bookingsService.resetReferrerForm.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.resetReferrerForm(oppId, mockResetBookingDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('uploadSignPdf', () => {
    it('should upload signed PDF successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const signedPdf = 'signed-document.pdf';
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Signed PDF uploaded successfully',
        data: { signedPdf },
      };

      salesService.uploadSignPdf.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.uploadSignPdf(oppId, signedPdf);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.uploadSignPdf).toHaveBeenCalledWith(oppId, signedPdf);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when upload fails (failure + response time)', async () => {
      const oppId = 'OPP123';
      const signedPdf = 'invalid.pdf';
      const error = new BadRequestException('Upload failed');

      salesService.uploadSignPdf.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.uploadSignPdf(oppId, signedPdf)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('updatePostBooking', () => {
    it('should update post booking successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Booking updated successfully.',
        data: {
          id: 123,
        },
      };

      salesService.updatePostBooking.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.updatePostBooking(
        oppId,
        mockPostBookingDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toBe('Booking updated successfully.');
      expect(result.data.id).toBe(123);
      expect(salesService.updatePostBooking).toHaveBeenCalledWith(
        oppId,
        mockPostBookingDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should update post booking with saveForLater flag (success + response time)', async () => {
      const oppId = 'OPP123';
      const saveForLaterDto = {
        ...mockPostBookingDto,
        saveForLater: true,
      };
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Booking updated successfully.',
        data: {
          id: 123,
        },
      };

      salesService.updatePostBooking.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.updatePostBooking(oppId, saveForLaterDto);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.updatePostBooking).toHaveBeenCalledWith(
        oppId,
        saveForLaterDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should update post booking with payment proofs (success + response time)', async () => {
      const oppId = 'OPP123';
      const dtoWithPayments = {
        ...mockPostBookingDto,
        paymentProofs: [
          {
            transactionId: '1' as any,
            paymentProof: ['proof1.pdf', 'proof2.pdf'],
          },
        ],
      };
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Booking updated successfully.',
        data: {
          id: 123,
        },
      };

      salesService.updatePostBooking.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.updatePostBooking(oppId, dtoWithPayments);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.updatePostBooking).toHaveBeenCalledWith(
        oppId,
        dtoWithPayments,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw NotFoundException when booking not found (failure + response time)', async () => {
      const oppId = 'INVALID_OPP';
      const error = new NotFoundException('Booking Details not found.');

      salesService.updatePostBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.updatePostBooking(oppId, mockPostBookingDto),
      ).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;

      expect(salesService.updatePostBooking).toHaveBeenCalledWith(
        oppId,
        mockPostBookingDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw BadRequestException when booking form not signed (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new BadRequestException(
        'Booking form not signed. Please ask customer to sign or upload if signed offline.',
      );

      salesService.updatePostBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.updatePostBooking(oppId, mockPostBookingDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;

      expect(salesService.updatePostBooking).toHaveBeenCalledWith(
        oppId,
        mockPostBookingDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when update fails (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new BadRequestException('Update failed');

      salesService.updatePostBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.updatePostBooking(oppId, mockPostBookingDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;

      expect(salesService.updatePostBooking).toHaveBeenCalledWith(
        oppId,
        mockPostBookingDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle internal server errors gracefully (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new InternalServerErrorException(
        'Database connection error',
      );

      salesService.updatePostBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.updatePostBooking(oppId, mockPostBookingDto),
      ).rejects.toThrow(InternalServerErrorException);
      const duration = Date.now() - start;

      expect(salesService.updatePostBooking).toHaveBeenCalledWith(
        oppId,
        mockPostBookingDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getAssignedOpportunities', () => {
    it('should return assigned opportunities successfully (success + response time)', async () => {
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Assigned opportunities retrieved successfully',
        data: {
          opportunities: [mockBookingData],
          totalRecords: 1,
          currentPage: 1,
          totalPages: 1,
        },
      };

      bookingsService.getAssignedOpportunities.mockResolvedValue(
        expectedResult,
      );

      const start = Date.now();
      const result = await controller.getAssignedOpportunities(
        mockUser,
        mockQueryDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.getAssignedOpportunities).toHaveBeenCalledWith(
        mockUser,
        mockQueryDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when retrieval fails (failure + response time)', async () => {
      const error = new BadRequestException('Retrieval failed');

      bookingsService.getAssignedOpportunities.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.getAssignedOpportunities(mockUser, mockQueryDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getCancelledOpportunities', () => {
    it('should return cancelled opportunities successfully (success + response time)', async () => {
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Cancelled opportunities retrieved successfully',
        data: {
          opportunities: [mockBookingData],
          totalRecords: 1,
          currentPage: 1,
          totalPages: 1,
        },
      };

      salesService.getCancelledOpportunities.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.getCancelledOpportunities(
        mockUser,
        mockQueryDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.getCancelledOpportunities).toHaveBeenCalledWith(
        mockUser,
        mockQueryDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when retrieval fails (failure + response time)', async () => {
      const error = new BadRequestException('Retrieval failed');

      salesService.getCancelledOpportunities.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.getCancelledOpportunities(mockUser, mockQueryDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('renderPostBookingPreview', () => {
    it('should render post booking preview successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const isOfficeUse = true;
      const expectedResult = {
        oppId,
        isOfficeUse,
        bookingData: mockBookingData,
      };

      bookingsService.renderPostBookingPreview.mockResolvedValue(
        expectedResult,
      );

      const start = Date.now();
      const result = await controller.renderPostBookingPreview(
        oppId,
        isOfficeUse,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.renderPostBookingPreview).toHaveBeenCalledWith(
        oppId,
        isOfficeUse,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should render post booking preview without office use flag (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        oppId,
        isOfficeUse: undefined,
        bookingData: mockBookingData,
      };

      bookingsService.renderPostBookingPreview.mockResolvedValue(
        expectedResult,
      );

      const start = Date.now();
      const result = await controller.renderPostBookingPreview(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.renderPostBookingPreview).toHaveBeenCalledWith(
        oppId,
        undefined,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('refreshOpportunity', () => {
    it('should refresh opportunity successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = true;

      bookingsService.getOpportunityDetailById.mockResolvedValue(
        expectedResult,
      );

      const start = Date.now();
      const result = await controller.refreshOpportunity(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.getOpportunityDetailById).toHaveBeenCalledWith(
        oppId,
        true,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when refresh fails (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new BadRequestException('Refresh failed');

      bookingsService.getOpportunityDetailById.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.refreshOpportunity(oppId)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('sendFormEmail', () => {
    it('should send form email successfully (success + response time)', async () => {
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Form email sent successfully',
        data: { sent: true },
      };

      bookingsService.sendFormEmail.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.sendFormEmail(
        mockUser,
        mockSendFormEmailDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.sendFormEmail).toHaveBeenCalledWith(
        mockUser,
        mockSendFormEmailDto.oppId,
        mockSendFormEmailDto.formType,
        mockSendFormEmailDto.emailIds,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when email sending fails (failure + response time)', async () => {
      const error = new BadRequestException('Email sending failed');

      bookingsService.sendFormEmail.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.sendFormEmail(mockUser, mockSendFormEmailDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('unitSwapping', () => {
    it('should perform unit swapping successfully (success + response time)', async () => {
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Unit swapping completed successfully',
        data: {
          sourceOppId: mockUnitSwappingDto.sourceOppId,
          targetOppId: mockUnitSwappingDto.targetOppId,
        },
      };

      salesService.unitSwapping.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.unitSwapping(
        mockUser,
        mockUnitSwappingDto,
      );
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.unitSwapping).toHaveBeenCalledWith(
        mockUser,
        mockUnitSwappingDto.sourceOppId,
        mockUnitSwappingDto.targetOppId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when unit swapping fails (failure + response time)', async () => {
      const error = new BadRequestException('Unit swapping failed');

      salesService.unitSwapping.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.unitSwapping(mockUser, mockUnitSwappingDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new InternalServerErrorException('Service error');

      salesService.submitPreBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.submitPreBooking(mockUser, oppId, mockPreBookingDto),
      ).rejects.toThrow(InternalServerErrorException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle validation errors (failure + response time)', async () => {
      const oppId = 'OPP123';
      const invalidDto = {} as PreBookingDto;
      const error = new BadRequestException('Validation failed');

      salesService.submitPreBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.submitPreBooking(mockUser, oppId, invalidDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle unexpected service errors (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new Error('Database connection failed');

      salesService.submitPreBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.submitPreBooking(mockUser, oppId, mockPreBookingDto),
      ).rejects.toThrow();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty opportunity ID (failure + response time)', async () => {
      const oppId = '';
      const error = new BadRequestException('Opportunity ID is required');

      salesService.submitPreBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.submitPreBooking(mockUser, oppId, mockPreBookingDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle null user object (failure + response time)', async () => {
      const oppId = 'OPP123';
      const nullUser = null;
      const error = new BadRequestException('User is required');

      salesService.submitPreBooking.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.submitPreBooking(nullUser, oppId, mockPreBookingDto),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle undefined DTO properties (success + response time)', async () => {
      const oppId = 'OPP123';
      const incompleteDto = { isPreBookingSubmitted: true } as PreBookingDto;

      salesService.submitPreBooking.mockResolvedValue({
        statusCode: SUCCESS,
        message: 'Success',
      });

      const start = Date.now();
      const result = await controller.submitPreBooking(
        mockUser,
        oppId,
        incompleteDto,
      );
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(salesService.submitPreBooking).toHaveBeenCalledWith(
        mockUser,
        oppId,
        incompleteDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('listGroups', () => {
    it('should return list of groups successfully (success + response time)', async () => {
      const queryDto: CommonFindAllQueryDto = {
        page: 1,
        limit: 10,
        search: 'test',
        sortBy: 'createdAt',
      };

      const expectedResult: any = {
        statusCode: SUCCESS,
        message: 'Group List fetched successfully.',
        data: {
          groups: [],
          totalRecords: 0,
          currentPage: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      salesService.listGroups.mockResolvedValueOnce(expectedResult);

      const start = Date.now();
      const result = await controller.listGroups(mockUser, queryDto);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);

      expect(salesService.listGroups).toHaveBeenCalledWith(queryDto, mockUser);

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should call service with undefined optional query params', async () => {
      const queryDto: CommonFindAllQueryDto = {};

      const expectedResult: any = {
        statusCode: SUCCESS,
        message: 'Group List fetched successfully.',
        data: {},
      };

      salesService.listGroups.mockResolvedValueOnce(expectedResult);

      const result = await controller.listGroups(mockUser, queryDto);

      expect(salesService.listGroups).toHaveBeenCalledWith(queryDto, mockUser);

      expect(result).toEqual(expectedResult);
    });

    it('should throw error when retrieval fails (failure + response time)', async () => {
      const queryDto: CommonFindAllQueryDto = {
        page: 1,
        limit: 10,
      };

      salesService.listGroups.mockRejectedValueOnce(
        new BadRequestException('Retrieval failed'),
      );

      const start = Date.now();

      await expect(controller.listGroups(mockUser, queryDto)).rejects.toThrow(
        BadRequestException,
      );

      const duration = Date.now() - start;

      expect(salesService.listGroups).toHaveBeenCalledWith(queryDto, mockUser);

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate unexpected errors', async () => {
      const queryDto: CommonFindAllQueryDto = { page: 1 };

      salesService.listGroups.mockRejectedValueOnce(
        new Error('Database failure'),
      );

      await expect(controller.listGroups(mockUser, queryDto)).rejects.toThrow(
        'Database failure',
      );
    });
  });

  describe('getGroupInfo', () => {
    it('should return group info with user successfully (success + response time)', async () => {
      const dto: GetGroupInfoDto = {
        id: 'group-123',
        page: 1,
        limit: 10,
        search: 'john',
      };

      const expectedResult: any = {
        statusCode: SUCCESS,
        message: 'Group data fetched successfully!',
        data: {
          opportunities: [],
          groupDetails: { id: 'group-123' },
          totalRecords: 0,
          currentPage: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      bookingsService.getMultiBookingGroup.mockResolvedValueOnce(
        expectedResult,
      );

      const start = Date.now();
      const result = await controller.getGroupInfo(mockUser, dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);

      expect(bookingsService.getMultiBookingGroup).toHaveBeenCalledWith(
        dto.id,
        dto.page,
        dto.limit,
        dto.search,
        mockUser,
      );

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should call service with undefined optional params', async () => {
      const dto: GetGroupInfoDto = {
        id: 'group-123',
      };

      const expectedResult: any = {
        statusCode: SUCCESS,
        message: 'Group data fetched successfully!',
        data: {},
      };

      bookingsService.getMultiBookingGroup.mockResolvedValueOnce(
        expectedResult,
      );

      const result = await controller.getGroupInfo(mockUser, dto);

      expect(bookingsService.getMultiBookingGroup).toHaveBeenCalledWith(
        dto.id,
        undefined,
        undefined,
        undefined,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
    });

    it('should propagate NotFoundException', async () => {
      const dto: GetGroupInfoDto = { id: 'invalid-group' };

      bookingsService.getMultiBookingGroup.mockRejectedValueOnce(
        new NotFoundException('No group exists with the given id'),
      );

      await expect(controller.getGroupInfo(mockUser, dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(bookingsService.getMultiBookingGroup).toHaveBeenCalledWith(
        dto.id,
        undefined,
        undefined,
        undefined,
        mockUser,
      );
    });

    it('should propagate generic errors', async () => {
      const dto: GetGroupInfoDto = { id: 'group-123' };

      bookingsService.getMultiBookingGroup.mockRejectedValueOnce(
        new Error('Database failure'),
      );

      await expect(controller.getGroupInfo(mockUser, dto)).rejects.toThrow(
        'Database failure',
      );

      expect(bookingsService.getMultiBookingGroup).toHaveBeenCalledWith(
        dto.id,
        undefined,
        undefined,
        undefined,
        mockUser,
      );
    });
  });

  describe('getMultiBookingGroup (without user)', () => {
    it('should return group details successfully (success + response time)', async () => {
      const dto: GetGroupDetailsDto = {
        id: 'group-123',
        page: 1,
        limit: 10,
        search: 'john',
      };

      const expectedResult: any = {
        statusCode: SUCCESS,
        message: 'Group data fetched successfully!',
        data: {
          opportunities: [],
          groupDetails: {
            id: 'group-123',
          },
          totalRecords: 0,
          currentPage: 1,
          limit: 10,
          totalPages: 0,
          isFirstFormFilled: false,
          firstFilledUnit: null,
          isAllFormsFilled: false,
        },
      };

      bookingsService.getMultiBookingGroup.mockResolvedValueOnce(
        expectedResult,
      );

      const start = Date.now();
      const result = await controller.getMultiBookingGroup(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);

      expect(bookingsService.getMultiBookingGroup).toHaveBeenCalledWith(
        dto.id,
        dto.page,
        dto.limit,
        dto.search,
      );

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should call service with undefined optional params', async () => {
      const dto: GetGroupDetailsDto = {
        id: 'group-123',
      };

      const expectedResult: any = {
        statusCode: SUCCESS,
        message: 'Group data fetched successfully!',
        data: {},
      };

      bookingsService.getMultiBookingGroup.mockResolvedValueOnce(
        expectedResult,
      );

      const result = await controller.getMultiBookingGroup(dto);

      expect(bookingsService.getMultiBookingGroup).toHaveBeenCalledWith(
        dto.id,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(expectedResult);
    });

    it('should propagate NotFoundException from service', async () => {
      const dto: GetGroupDetailsDto = { id: 'invalid-group' };

      bookingsService.getMultiBookingGroup.mockRejectedValueOnce(
        new NotFoundException('No group exists with the given id'),
      );

      await expect(controller.getMultiBookingGroup(dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(bookingsService.getMultiBookingGroup).toHaveBeenCalledWith(
        dto.id,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should propagate generic error from service', async () => {
      const dto: GetGroupDetailsDto = { id: 'group-123' };

      bookingsService.getMultiBookingGroup.mockRejectedValueOnce(
        new Error('Database failure'),
      );

      await expect(controller.getMultiBookingGroup(dto)).rejects.toThrow(
        'Database failure',
      );

      expect(bookingsService.getMultiBookingGroup).toHaveBeenCalledWith(
        dto.id,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('createBookingGroup', () => {
    it('should create booking group successfully (success + response time)', async () => {
      const body: CreateUpdateGroupDto = {
        groupName: 'Test Group',
        noOfUnits: 2,
        groupedOppoId: ['OPP1', 'OPP2'],
        paymentMethod: AmountAdjustmentEnum.LUMPSUM,
        amount: 1000000,
      };
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Group created successfully.',
        data: { id: 'group-123', ...body },
      };

      salesService.createBookingGroup.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.createBookingGroup(mockUser, body);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.createBookingGroup).toHaveBeenCalledWith(
        body,
        mockUser,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when validation fails (failure + response time)', async () => {
      const body: CreateUpdateGroupDto = {
        groupName: 'Test Group',
        noOfUnits: 2,
        groupedOppoId: ['OPP1'], // Only 1 opp, should be at least 2
        paymentMethod: AmountAdjustmentEnum.LUMPSUM,
        amount: 1000000,
      };
      const error = new BadRequestException(
        'Please select atleast 2 records to create a group',
      );

      salesService.createBookingGroup.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.createBookingGroup(mockUser, body),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('updateBookingGroup', () => {
    it('should update booking group successfully (success + response time)', async () => {
      const groupId = 'group-123';
      const body: CreateUpdateGroupDto = {
        groupName: 'Updated Group',
        noOfUnits: 3,
        groupedOppoId: ['OPP1', 'OPP2', 'OPP3'],
        paymentMethod: 'distinct',
        amount: 1500000,
      };
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Group updated successfully.',
        data: { id: groupId },
      };

      salesService.updateBookingGroup.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.updateBookingGroup(body, groupId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.updateBookingGroup).toHaveBeenCalledWith(
        groupId,
        body,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when group not found (failure + response time)', async () => {
      const groupId = 'invalid-group';
      const body: CreateUpdateGroupDto = {
        groupName: 'Updated Group',
        noOfUnits: 2,
        groupedOppoId: ['OPP1', 'OPP2'],
        paymentMethod: AmountAdjustmentEnum.LUMPSUM,
        amount: 1000000,
      };
      const error = new NotFoundException(
        `Group with ID ${groupId} not found.`,
      );

      salesService.updateBookingGroup.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.updateBookingGroup(body, groupId),
      ).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getGroupApplicants', () => {
    it('should return group applicants successfully (success + response time)', async () => {
      const dto: GetGroupDetailsDto = { id: 'group-123' };
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Group applicants fetched successfully.',
        data: {
          applicants: [
            { value: 'OPP1/1', name: 'John Doe' },
            { value: 'OPP2/1', name: 'Jane Smith' },
          ],
        },
      };

      salesService.getGroupApplicants.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.getGroupApplicants(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.getGroupApplicants).toHaveBeenCalledWith(dto.id);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when group not found (failure + response time)', async () => {
      const dto: GetGroupDetailsDto = { id: 'invalid-group' };
      const error = new NotFoundException(`Group with ID ${dto.id} not found.`);

      salesService.getGroupApplicants.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.getGroupApplicants(dto)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getBookingApplicants', () => {
    it('should return applicants map with count (success + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: 200,
        data: {
          noOfApplicants: 2,
          applicants: {
            applicant1: { value: 'OPP123/1', name: 'John Doe', isMinor: false },
            applicant2: { value: 'OPP123/2', name: 'Jane Roe', isMinor: true },
            applicant3: null,
            applicant4: null,
          },
        },
      };

      salesService.getBookingApplicants.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.getBookingApplicants(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.getBookingApplicants).toHaveBeenCalledWith(oppId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return empty applicants map when none exist (edge + response time)', async () => {
      const oppId = 'OPP123';
      const expectedResult = {
        statusCode: 200,
        data: {
          noOfApplicants: 0,
          applicants: {
            applicant1: null,
            applicant2: null,
            applicant3: null,
            applicant4: null,
          },
        },
      };

      salesService.getBookingApplicants.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.getBookingApplicants(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.getBookingApplicants).toHaveBeenCalledWith(oppId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when fetching applicants fails (failure + response time)', async () => {
      const oppId = 'OPP123';
      const error = new BadRequestException('Unable to fetch applicants');

      salesService.getBookingApplicants.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.getBookingApplicants(oppId)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;

      expect(salesService.getBookingApplicants).toHaveBeenCalledWith(oppId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('bookingsApplicantSwapping', () => {
    it('should swap applicants successfully (success + response time)', async () => {
      const oppId = 'OPP123';
      const body = {
        applicant1: 'OPP123/2',
        applicant2: 'New Applicant',
        applicant3: null,
        applicant4: 'OPP123/1',
        lastStep: 3,
        noOfApplicants: 2,
      };

      const expectedResult = {
        data: {
          bookingId: 1, // number
          opportunityId: 'OPP123',
          noOfApplicants: 2,
          applicants: {
            applicant1: { id: 'a2' }, // swapped from slot 2
            applicant2: null, // "New Applicant" => null
            applicant3: null, // explicit null kept as null
            applicant4: { id: 'a1' }, // swapped from slot 1
          },
        },
      };

      salesService.manageApplicants.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.bookingsApplicantSwapping(body, oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.manageApplicants).toHaveBeenCalledWith(oppId, body);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when booking not found (failure + response time)', async () => {
      const oppId = 'OPP404';
      const body = {
        applicant1: 'OPP404/1',
        lastStep: 2,
        noOfApplicants: 1,
      };
      const error = new BadRequestException('Booking not found');

      salesService.manageApplicants.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.bookingsApplicantSwapping(body, oppId),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;

      expect(salesService.manageApplicants).toHaveBeenCalledWith(oppId, body);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error on duplicate source slot (failure + response time)', async () => {
      const oppId = 'OPP123';
      const body = {
        applicant1: 'OPP123/1',
        applicant2: 'OPP123/1',
        lastStep: 2,
        noOfApplicants: 1,
      };
      const error = new BadRequestException(
        'Duplicate source applicantNo /1 used more than once (in applicant2)',
      );

      salesService.manageApplicants.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.bookingsApplicantSwapping(body, oppId),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;

      expect(salesService.manageApplicants).toHaveBeenCalledWith(oppId, body);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when primary applicant would be missing (failure + response time)', async () => {
      const oppId = 'OPP123';
      const body = {
        applicant1: null,
        applicant2: null,
        applicant3: null,
        applicant4: null,
        lastStep: 1,
        noOfApplicants: 0,
      };
      const error = new BadRequestException('Primary applicant is required');

      salesService.manageApplicants.mockRejectedValue(error);

      const start = Date.now();
      await expect(
        controller.bookingsApplicantSwapping(body, oppId),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;

      expect(salesService.manageApplicants).toHaveBeenCalledWith(oppId, body);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('sendGroupLink', () => {
    it('should send group link successfully (success + response time)', async () => {
      const dto: SendGroupLinkDto = {
        id: 'group-123',
        emailIds: 'test1@example.com,test2@example.com',
      };
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Group link sent successfully.',
        data: {
          groupId: dto.id,
          emailIds: dto.emailIds,
          groupLink: 'https://example.com/group/group-123',
        },
      };

      salesService.sendGroupLink.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.sendGroupLink(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.sendGroupLink).toHaveBeenCalledWith(
        dto.id,
        dto.emailIds,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should send group link without emailIds (success + response time)', async () => {
      const dto: SendGroupLinkDto = {
        id: 'group-123',
        emailIds: undefined,
      };
      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Group link sent successfully.',
        data: {
          groupId: dto.id,
          emailIds: dto.emailIds,
          groupLink: 'https://example.com/group/group-123',
        },
      };

      salesService.sendGroupLink.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.sendGroupLink(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(salesService.sendGroupLink).toHaveBeenCalledWith(
        dto.id,
        dto.emailIds,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when group not found (failure + response time)', async () => {
      const dto: SendGroupLinkDto = {
        id: 'invalid-group',
        emailIds: 'test@example.com',
      };
      const error = new NotFoundException(
        'No group found with the given groupId',
      );

      salesService.sendGroupLink.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.sendGroupLink(dto)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(salesService.sendGroupLink).toHaveBeenCalledWith(
        dto.id,
        dto.emailIds,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when email sending fails (failure + response time)', async () => {
      const dto: SendGroupLinkDto = {
        id: 'group-123',
        emailIds: 'invalid-email',
      };
      const error = new BadRequestException('Invalid email format');

      salesService.sendGroupLink.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.sendGroupLink(dto)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;

      expect(salesService.sendGroupLink).toHaveBeenCalledWith(
        dto.id,
        dto.emailIds,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('downloadApplicantPdf', () => {
    it('should download applicant PDF successfully (success + response time)', async () => {
      const oppId = 'OPP123';

      const expectedResult = {
        statusCode: SUCCESS,
        message: 'Applicant PDF downloaded successfully',
        data: {
          fileName: 'applicant.pdf',
          url: 'https://cdn.example.com/applicant.pdf',
        },
      };

      bookingsService.downloadApplicantPDF.mockResolvedValue(expectedResult);

      const start = Date.now();
      const result = await controller.downloadApplicantPdf(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(expectedResult);
      expect(bookingsService.downloadApplicantPDF).toHaveBeenCalledWith(oppId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw error when PDF download fails (failure + response time)', async () => {
      const oppId = 'INVALID_OPP';
      const error = new NotFoundException('Booking not found');

      bookingsService.downloadApplicantPDF.mockRejectedValue(error);

      const start = Date.now();
      await expect(controller.downloadApplicantPdf(oppId)).rejects.toThrow(
        NotFoundException,
      );

      const duration = Date.now() - start;

      expect(bookingsService.downloadApplicantPDF).toHaveBeenCalledWith(oppId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
