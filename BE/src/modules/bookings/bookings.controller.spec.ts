jest.mock('puppeteer');
import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SUCCESS, TEST_EXECUTION_TIME } from 'src/config/constants';
import {
  BookingApplicantDto,
  DeleteBookingPaymentsDto,
  PaymentDetailsDto,
} from './dto/update-booking.dto';
import {
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { UpdateCompanyDetailsDto } from './dto/update-company-details.dto';
import { LeegalityService } from '../leegality/leegality.service';
import { SameAddressEnum } from 'src/enums/same-address.enum';
import { ApplicantMappingDto } from './dto/applicant-mapping.dto';
import { MapVoucherApplicantsDto } from './dto/map-voucher-applicants.dto';

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: jest.Mocked<BookingsService>;
  let leegalityService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: {
            createBooking: jest.fn(),
            getBookingFormMasters: jest.fn(),
            getBookingPDF: jest.fn(),
            getBookingByOppId: jest.fn(),
            getOpportunityDetailById: jest.fn(),
            updateOtherDetails: jest.fn(),
            updateReferrerData: jest.fn(),
            renderBookingPreview: jest.fn(),
            renderReferrerPreview: jest.fn(),
            downloadBookingPDF: jest.fn(),
            getBookingDocs: jest.fn(),
            updateBookingImages: jest.fn(),
            updateReferrer: jest.fn(),
            updatePaymentDetails: jest.fn(),
            updateAuthorisedSignatory: jest.fn(),
            updateCompanyDocuments: jest.fn(),
            deleteAuthorisedSignatory: jest.fn(),
            updateUnitDetails: jest.fn(),
            updateDocumentComment: jest.fn(),
            agreedOnTerms: jest.fn(),
            submitForSignature: jest.fn(),
            handleWebhook: jest.fn(),
            referrerWebhook: jest.fn(),
            saveBookingFeedback: jest.fn(),
            deleteBooking: jest.fn(),
            deletePaymentDetails: jest.fn(),
            updateCompanyDetails: jest.fn(),
            updateBookingApplicant: jest.fn(),
            mapApplicants: jest.fn(),
            pushApplicantData: jest.fn(),
            mapVoucherApplicants: jest.fn(),
          },
        },
        {
          provide: LeegalityService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    service = module.get(BookingsService);
    leegalityService = module.get(LeegalityService);
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should create booking for CORPORATE (success + response time)', async () => {
      const dto: CreateBookingDto = {
        opportunityId: 'OPP-1',
        enquiryId: 'ENQ-2',
        noOfApplicants: 1,
        bookingAs: BookingAsEnum.CORPORATE,
        lastStep: 0,
        // fillingAs, relationBtApplicants, primarySourceDisabled are optional
      } as any;

      const saved = { id: 101, opportunityId: 'OPP-1', enquiryId: 'ENQ-2' };
      const mockResult = {
        message: 'Booking created successfully (Corporate/Partnership).',
        data: saved,
      };
      service.createBooking.mockResolvedValueOnce(mockResult);

      const start = Date.now();
      const result = await controller.createBooking(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResult);
      expect(service.createBooking).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should create booking for INDIVIDUAL flow (default when bookingAs not provided)', async () => {
      const dto: CreateBookingDto = {
        opportunityId: 'OPP-10',
        enquiryId: 'ENQ-20',
        noOfApplicants: 2,
        lastStep: 0,
      } as any;

      const saved = { id: 202, opportunityId: 'OPP-10', enquiryId: 'ENQ-20' };
      const mockResult = {
        message: 'Booking created successfully.',
        data: saved,
      };
      service.createBooking.mockResolvedValueOnce(mockResult);

      const result = await controller.createBooking(dto);

      expect(result).toEqual(mockResult);
      expect(service.createBooking).toHaveBeenCalledWith(dto);
    });

    it('should propagate BadRequestException from service (e.g., invalid opportunity)', async () => {
      const dto: CreateBookingDto = {
        opportunityId: 'OPP-9999',
        enquiryId: 'ENQ-3',
        noOfApplicants: 1,
        bookingAs: BookingAsEnum.CORPORATE,
        lastStep: 0,
      } as any;

      service.createBooking.mockRejectedValueOnce(
        new BadRequestException('Invalid Opportunity details.'),
      );

      const start = Date.now();
      await expect(controller.createBooking(dto)).rejects.toThrow(
        BadRequestException,
      );
      const duration = Date.now() - start;

      expect(service.createBooking).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate generic errors from the service', async () => {
      const dto: CreateBookingDto = {
        opportunityId: 'OPP-3',
        enquiryId: 'ENQ-4',
        noOfApplicants: 1,
        bookingAs: BookingAsEnum.PARTNERSHIP_FIRM,
        lastStep: 1,
      } as any;

      const err = new Error('DB write failed');
      service.createBooking.mockRejectedValueOnce(err);

      await expect(controller.createBooking(dto)).rejects.toThrow(err);
      expect(service.createBooking).toHaveBeenCalledWith(dto);
    });

    it('should pass the dto through unchanged (preserve fields/spacing)', async () => {
      const dto: CreateBookingDto = {
        opportunityId: 'OPP-7',
        enquiryId: 'ENQ-8',
        noOfApplicants: 1,
        bookingAs: BookingAsEnum.CORPORATE,
        lastStep: 2,
        relationBtApplicants: '  Sibling & Partner  ',
        primarySourceDisabled: true,
      } as any;

      const mockResult = { message: 'ok', data: { id: 303 } };
      service.createBooking.mockResolvedValueOnce(mockResult as any);

      const result = await controller.createBooking(dto);

      expect(result).toEqual(mockResult);
      expect(service.createBooking).toHaveBeenCalledWith(dto);
    });
  });

  describe('misc routes', () => {
    it('should get booking form masters', async () => {
      const expected = { data: { masters: [] } };
      service.getBookingFormMasters.mockResolvedValueOnce(expected as any);

      const result = await controller.getBookingFormMasters();

      expect(result).toEqual(expected);
      expect(service.getBookingFormMasters).toHaveBeenCalled();
    });

    it('should get booking PDF', async () => {
      const oppId = 'OPP123';
      const expected = { url: 'http://pdf' };
      service.getBookingPDF.mockResolvedValueOnce(expected as any);

      const result = await controller.getBookingPDF(oppId);

      expect(result).toEqual(expected);
      expect(service.getBookingPDF).toHaveBeenCalledWith(oppId);
    });

    it('should get opportunity detail by id', async () => {
      const oppId = 'OPP123';
      const expected = { id: oppId, name: 'Test' };
      service.getOpportunityDetailById.mockResolvedValueOnce(expected as any);

      const result = await controller.getOppDetailById(oppId);

      expect(result).toEqual(expected);
      expect(service.getOpportunityDetailById).toHaveBeenCalledWith(oppId);
    });

    it('should update other details', async () => {
      const oppId = 'OPP123';
      const value = { reason: 'change' } as any;
      const expected = { id: oppId };
      service.updateOtherDetails.mockResolvedValueOnce(expected as any);

      const result = await controller.updateOtherDetails(oppId, value);

      expect(result).toEqual(expected);
      expect(service.updateOtherDetails).toHaveBeenCalledWith(oppId, value);
    });

    it('should activate invitation and call leegalityService', async () => {
      const signUrl = 'https://sign.url';
      leegalityService.activateInvitation = jest
        .fn()
        .mockResolvedValue({ status: 'ok' });

      const result = await controller.activateInvitation(signUrl);

      expect(result).toEqual({ status: 'ok' });
      expect(leegalityService.activateInvitation).toHaveBeenCalledWith(signUrl);
    });

    it('should resend notifications and update isRedirectable from service', async () => {
      const payload = {
        opportunityId: 'OPP123',
        signUrls: ['https://sign.url'],
        bookingAs: BookingAsEnum.INDIVIDUAL,
      } as any;
      service.updateSignLaterStatus = jest.fn().mockResolvedValue(true);
      leegalityService.resendNotifications = jest
        .fn()
        .mockResolvedValue({ data: {} });

      const result = await controller.resendNotifications(payload);

      expect(result.data.isRedirectable).toBe(true);
      expect(service.updateSignLaterStatus).toHaveBeenCalledWith(
        payload.opportunityId,
        payload.signUrls,
        payload.bookingAs,
      );
      expect(leegalityService.resendNotifications).toHaveBeenCalledWith(
        payload.signUrls,
      );
    });

    it('should update booking images', async () => {
      const dto = {
        opportunityId: 'OPP123',
        path: '/images',
        images: ['img1', 'img2'],
      } as any;
      const expected = { success: true };
      service.updateBookingImages.mockResolvedValueOnce(expected as any);

      const result = await controller.updateBookingImages(dto);

      expect(result).toEqual(expected);
      expect(service.updateBookingImages).toHaveBeenCalledWith(
        dto.opportunityId,
        dto.path,
        dto.images,
      );
    });

    it('should update referrer data', async () => {
      const oppId = 'OPP123';
      const dto = { referrer: 'ABC' } as any;
      const expected = { success: true };
      service.updateReferrerData.mockResolvedValueOnce(expected as any);

      const result = await controller.updateReferrerData(oppId, dto);

      expect(result).toEqual(expected);
      expect(service.updateReferrerData).toHaveBeenCalledWith(oppId, dto);
    });

    it('should update referrer', async () => {
      const oppId = 'OPP123';
      const dto = { referrer: 'ABC' } as any;
      const expected = { success: true };
      service.updateReferrer.mockResolvedValueOnce(expected as any);

      const result = await controller.updateReferrer(oppId, dto);

      expect(result).toEqual(expected);
      expect(service.updateReferrer).toHaveBeenCalledWith(oppId, dto, true);
    });

    it('should get booking docs', async () => {
      const oppId = 'OPP123';
      const expected = { docs: [] };
      service.getBookingDocs.mockResolvedValueOnce(expected as any);

      const result = await controller.getBookingDocs(oppId);

      expect(result).toEqual(expected);
      expect(service.getBookingDocs).toHaveBeenCalledWith(oppId);
    });
  });

  describe('updateAuthorisedSignatory', () => {
    it('should update applicant (success + response time)', async () => {
      const payload = {
        opportunityId: 'OPP-42',
        applicantNumber: 1,
        saveForLater: false,
        lastStep: 2,
        personalDetails: {
          salutation: 'Mr',
          firstName: 'John',
          lastName: 'Doe',
          image: ['s3://bucket/p1.jpg'],
          primaryDocument: 'PAN',
          contactNumber: '9876543210',
          emailAddress: 'john.doe@example.com',
        },
      };
      const mockResponse = {
        message: 'Applicant updated successfully',
        data: { opportunityId: payload.opportunityId, applicantNumber: 1 },
      };
      service.updateAuthorisedSignatory.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.updateAuthorisedSignatory(payload as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.updateAuthorisedSignatory).toHaveBeenCalledWith(payload);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle minimal saveForLater=true payload (GRE-like light flow)', async () => {
      const dto = {
        opportunityId: 'OPP-99',
        applicantNumber: 2,
        saveForLater: true,
      };
      const mockResponse = {
        message: 'Applicant partially saved',
        data: { opportunityId: dto.opportunityId, status: 'draft' },
      };
      service.updateAuthorisedSignatory.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateAuthorisedSignatory(dto as any);

      expect(result).toEqual(mockResponse);
      expect(service.updateAuthorisedSignatory).toHaveBeenCalledWith(dto);
    });

    it('should surface NotFoundException from service (failure + response time)', async () => {
      const dto = {
        opportunityId: 'OPP-404',
        applicantNumber: 1,
        saveForLater: false,
      };
      service.updateAuthorisedSignatory.mockRejectedValueOnce(
        new NotFoundException('Opportunity not found'),
      );

      const start = Date.now();
      await expect(
        controller.updateAuthorisedSignatory(dto as any),
      ).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;

      expect(service.updateAuthorisedSignatory).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should propagate generic errors from the service', async () => {
      const dto = {
        opportunityId: 'OPP-500',
        applicantNumber: 1,
        saveForLater: false,
      };
      const err = new Error('DB timeout');
      service.updateAuthorisedSignatory.mockRejectedValueOnce(err);

      await expect(
        controller.updateAuthorisedSignatory(dto as any),
      ).rejects.toThrow(err);
      expect(service.updateAuthorisedSignatory).toHaveBeenCalledWith(dto);
    });

    it('should pass through dto exactly (preserve spacing / fields)', async () => {
      const dto = {
        opportunityId: '  OPP-  7  ',
        applicantNumber: 3,
        saveForLater: false,
        lastStep: 1,
        personalDetails: {
          salutation: 'Ms',
          firstName: '  Jane  ',
          lastName: '  D  ',
          image: ['s3://bucket/p2.jpg'],
          primaryDocument: 'AADHAAR',
          contactNumber: '9123456789',
          emailAddress: 'jane@example.com',
        },
      };
      const mockResponse = { message: 'ok', data: {} };
      service.updateAuthorisedSignatory.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateAuthorisedSignatory(dto as any);

      expect(result).toEqual(mockResponse);
      expect(service.updateAuthorisedSignatory).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException when duplicate contact details are found (failure + response time)', async () => {
      const dto = {
        opportunityId: 'OPP-DUPLICATE',
        applicantNumber: 2,
        saveForLater: false,
        personalDetails: {
          salutation: 'Mr',
          firstName: 'John',
          lastName: 'Doe',
          contactNumber: '8888888888',
          emailAddress: 'app1@yopmail.com',
        },
      };
      service.updateAuthorisedSignatory.mockRejectedValueOnce(
        new BadRequestException(
          'The contact number (8888888888) and email address (app1@yopmail.com) is already present in applicant 1. Please use different contact details.',
        ),
      );

      const start = Date.now();
      await expect(
        controller.updateAuthorisedSignatory(dto as any),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;

      expect(service.updateAuthorisedSignatory).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('updateCompanyDocuments', () => {
    it('should update documents (success + response time)', async () => {
      const dto: any = {
        opportunityId: 123,
        lastStep: 3,
        saveForLater: false,
        documents: {
          pan: ['s3://bucket/pan.pdf'],
          GSTCertificate: ['s3://bucket/gst.pdf'],
          IncorporationCertificate: ['s3://bucket/inc.pdf'],
          MemoradumOfAssociation: ['s3://bucket/moa.pdf'],
          ArticlesOfAssociation: ['s3://bucket/aoa.pdf'],
          BoardResolutionPurchase: ['s3://bucket/board.pdf'],
        },
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Documents updated',
        data: {
          opportunityId: dto.opportunityId,
          companyDetails: {
            documents: dto.documents,
          },
        },
      };
      service.updateCompanyDocuments.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.updateCompanyDocuments(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.updateCompanyDocuments).toHaveBeenCalledWith(
        dto.opportunityId,
        dto,
      );
      expect(duration).toBeLessThan(1000);
    });

    it('should allow saveForLater=true (partial save flow)', async () => {
      const dto: any = {
        opportunityId: 55,
        lastStep: 1,
        saveForLater: true,
        documents: {},
      };

      const draftResponse = {
        statusCode: SUCCESS,
        message: 'Draft saved',
        data: {
          opportunityId: dto.opportunityId,
          companyDetails: { documents: {} },
        },
      };

      service.updateCompanyDocuments.mockResolvedValueOnce(draftResponse);

      const result = await controller.updateCompanyDocuments(dto);

      expect(result).toEqual(draftResponse);
      expect(service.updateCompanyDocuments).toHaveBeenCalledWith(
        dto.opportunityId,
        dto,
      );
    });

    it('should surface BadRequestException when service throws validation error (failure + response time)', async () => {
      const dto = {
        opportunityId: 9,
        lastStep: 2,
        saveForLater: false,
        documents: {
          pan: ['invalid-path'],
        },
      };
      service.updateCompanyDocuments.mockRejectedValueOnce(
        new BadRequestException('Invalid S3 paths'),
      );

      const start = Date.now();
      await expect(
        controller.updateCompanyDocuments(dto as any),
      ).rejects.toThrow(BadRequestException);
      const duration = Date.now() - start;

      expect(service.updateCompanyDocuments).toHaveBeenCalledWith(
        dto.opportunityId,
        dto,
      );
      expect(duration).toBeLessThan(1000);
    });

    it('should propagate generic service errors', async () => {
      const dto = {
        opportunityId: 66,
        lastStep: 1,
        saveForLater: false,
        documents: {},
      };
      const err = new Error('Write failed');
      service.updateCompanyDocuments.mockRejectedValueOnce(err);

      await expect(
        controller.updateCompanyDocuments(dto as any),
      ).rejects.toThrow(err);
      expect(service.updateCompanyDocuments).toHaveBeenCalledWith(
        dto.opportunityId,
        dto,
      );
    });

    it('should pass through params as provided (no trimming/transform at controller level)', async () => {
      const dto = {
        opportunityId: 777,
        lastStep: 5,
        saveForLater: false,
        documents: {
          pan: ['  s3://bucket/pan.pdf  '],
          GSTCertificate: ['s3://bucket/gst.pdf'],
          IncorporationCertificate: ['s3://bucket/inc.pdf'],
          MemoradumOfAssociation: ['s3://bucket/moa.pdf'],
          ArticlesOfAssociation: ['s3://bucket/aoa.pdf'],
          BoardResolutionPurchase: ['s3://bucket/board.pdf'],
        },
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'ok',
        data: {
          opportunityId: dto.opportunityId,
          companyDetails: {
            documents: dto.documents,
          },
        },
      };

      service.updateCompanyDocuments.mockResolvedValueOnce(mockResponse as any);

      const result = await controller.updateCompanyDocuments(dto as any);

      expect(result).toEqual(mockResponse);
      expect(service.updateCompanyDocuments).toHaveBeenCalledWith(
        dto.opportunityId,
        dto,
      );
    });
  });

  describe('deleteAuthorisedSignatory', () => {
    it('should delete applicant (success + response time)', async () => {
      const dto = { opportunityId: 'OPP-42', applicantId: 2 };
      const mockResponse = {
        statusCode: 200,
        message: `Applicant ${dto.applicantId} details deleted successfully`,
        data: { noOfApplicants: 1 },
      };
      service.deleteAuthorisedSignatory.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.deleteAuthorisedSignatory(dto as any);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.deleteAuthorisedSignatory).toHaveBeenCalledWith(
        dto.opportunityId,
        dto.applicantId,
      );
      expect(duration).toBeLessThan(1000);
    });

    it('should surface NotFoundException from service (failure + response time)', async () => {
      const dto = { opportunityId: 'OPP-404', applicantId: 2 };
      service.deleteAuthorisedSignatory.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();
      await expect(
        controller.deleteAuthorisedSignatory(dto as any),
      ).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;

      expect(service.deleteAuthorisedSignatory).toHaveBeenCalledWith(
        dto.opportunityId,
        dto.applicantId,
      );
      expect(duration).toBeLessThan(1000);
    });

    it('should surface BadRequest when booking is already completed', async () => {
      const dto = {
        opportunityId: 'OPP-LOCKED',
        applicantId: 2,
      };
      service.deleteAuthorisedSignatory.mockRejectedValueOnce(
        new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        ),
      );

      await expect(
        controller.deleteAuthorisedSignatory(dto as any),
      ).rejects.toThrow(BadRequestException);
      expect(service.deleteAuthorisedSignatory).toHaveBeenCalledWith(
        dto.opportunityId,
        dto.applicantId,
      );
    });

    it('should surface BadRequest for invalid applicantId bounds (<2 or >4)', async () => {
      const dto = { opportunityId: 'OPP-42', applicantId: 1 };
      service.deleteAuthorisedSignatory.mockRejectedValueOnce(
        new BadRequestException('applicantId must be between 1 and 5'),
      );

      await expect(
        controller.deleteAuthorisedSignatory(dto as any),
      ).rejects.toThrow(BadRequestException);
      expect(service.deleteAuthorisedSignatory).toHaveBeenCalledWith(
        dto.opportunityId,
        dto.applicantId,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const dto = { opportunityId: 'OPP-500', applicantId: 3 };
      const err = new Error('DB timeout');
      service.deleteAuthorisedSignatory.mockRejectedValueOnce(err);

      await expect(
        controller.deleteAuthorisedSignatory(dto as any),
      ).rejects.toThrow(err);
      expect(service.deleteAuthorisedSignatory).toHaveBeenCalledWith(
        dto.opportunityId,
        dto.applicantId,
      );
    });

    it('should pass through dto values exactly (preserve spacing / value)', async () => {
      const dto = { opportunityId: '  OPP-  7  ', applicantId: 3 };
      const mockResponse = { statusCode: 200, message: 'ok', data: {} };
      service.deleteAuthorisedSignatory.mockResolvedValueOnce(mockResponse);

      const result = await controller.deleteAuthorisedSignatory(dto as any);

      expect(result).toEqual(mockResponse);
      expect(service.deleteAuthorisedSignatory).toHaveBeenCalledWith(
        dto.opportunityId,
        dto.applicantId,
      );
    });
  });

  describe('updateUnitDetails', () => {
    const dto = {
      opportunityId: 'OPP-123',
      projectName: 'Test Project',
      projectBrandName: 'Test Brand',
      carParkType: 'Covered',
      unitNumber: 'A-101',
      floor: '5',
      bookingAs: BookingAsEnum.INDIVIDUAL,
      numOfCarPark: '2',
      blockTower: 'Tower A',
      type: '2BHK',
      primarySource: 'Website',
      channel: 'Online',
      unitDetailImage: 's3://bucket/unit.jpg',
      bookingAmount: 5000000,
      superBuiltArea: 1200,
      carpetArea: 1000,
      totalAgreementValue: 5000000,
      saveForLater: false,
      isPartialSaved: false,
      lastStep: 3,
    };

    it('should update unit details successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'Unit details updated successfully.',
        data: dto,
      };
      service.updateUnitDetails.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.updateUnitDetails(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.updateUnitDetails).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle saveForLater=true (partial save flow)', async () => {
      const partialDto = {
        opportunityId: 'OPP-456',
        saveForLater: true,
        lastStep: 1,
        projectName: 'Test Project',
        projectBrandName: 'Test Brand',
      } as any;
      const mockResponse = {
        message: 'Unit details updated successfully.',
        data: partialDto,
      };
      service.updateUnitDetails.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateUnitDetails(partialDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateUnitDetails).toHaveBeenCalledWith(partialDto);
    });

    it('should surface NotFoundException when booking not found (failure + response time)', async () => {
      service.updateUnitDetails.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();
      await expect(controller.updateUnitDetails(dto)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(service.updateUnitDetails).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface BadRequestException when booking is already completed', async () => {
      service.updateUnitDetails.mockRejectedValueOnce(
        new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        ),
      );

      await expect(controller.updateUnitDetails(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.updateUnitDetails).toHaveBeenCalledWith(dto);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.updateUnitDetails.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to update booking data.'),
      );

      await expect(controller.updateUnitDetails(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(service.updateUnitDetails).toHaveBeenCalledWith(dto);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Database connection failed');
      service.updateUnitDetails.mockRejectedValueOnce(err);

      await expect(controller.updateUnitDetails(dto)).rejects.toThrow(err);
      expect(service.updateUnitDetails).toHaveBeenCalledWith(dto);
    });

    it('should handle minimal required fields only', async () => {
      const minimalDto = {
        opportunityId: 'OPP-999',
        lastStep: 1,
        projectName: 'Minimal Project',
        projectBrandName: 'Minimal Brand',
      } as any;
      const mockResponse = {
        message: 'Unit details updated successfully.',
        data: minimalDto,
      };
      service.updateUnitDetails.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateUnitDetails(minimalDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateUnitDetails).toHaveBeenCalledWith(minimalDto);
    });

    it('should handle all optional fields populated', async () => {
      const fullDto = {
        opportunityId: 'OPP-888',
        projectName: 'Luxury Project',
        projectBrandName: 'Luxury Brand',
        carParkType: 'Open',
        unitNumber: 'B-202',
        floor: '10',
        bookingAs: BookingAsEnum.PARTNERSHIP_FIRM,
        numOfCarPark: '3',
        blockTower: 'Tower B',
        type: '4BHK',
        primarySource: 'Referral',
        channel: 'Offline',
        unitDetailImage: 's3://bucket/luxury-unit.jpg',
        bookingAmount: 10000000,
        superBuiltArea: 2000,
        carpetArea: 1800,
        totalAgreementValue: 10000000,
        saveForLater: false,
        isPartialSaved: false,
        lastStep: 5,
      };
      const mockResponse = {
        message: 'Unit details updated successfully.',
        data: fullDto,
      };
      service.updateUnitDetails.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateUnitDetails(fullDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateUnitDetails).toHaveBeenCalledWith(fullDto);
    });
  });

  describe('updateDocumentComment', () => {
    const dto = {
      opportunityId: 'OPP-123',
      documentsNote: 'All documents are verified and approved.',
      saveForLater: false,
      lastStep: 4,
      bookingAs: BookingAsEnum.INDIVIDUAL,
    };

    it('should update document comment successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'Comment updated successfully.',
        data: dto,
      };
      service.updateDocumentComment.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.updateDocumentComment(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.updateDocumentComment).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle saveForLater=true (partial save flow)', async () => {
      const partialDto = {
        opportunityId: 'OPP-456',
        documentsNote: 'Draft comment for review',
        saveForLater: true,
        lastStep: 2,
      } as any;
      const mockResponse = {
        message: 'Comment updated successfully.',
        data: partialDto,
      };
      service.updateDocumentComment.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateDocumentComment(partialDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateDocumentComment).toHaveBeenCalledWith(partialDto);
    });

    it('should handle empty comment (optional field)', async () => {
      const emptyCommentDto = {
        opportunityId: 'OPP-789',
        documentsNote: '',
        saveForLater: false,
        lastStep: 3,
        bookingAs: BookingAsEnum.CORPORATE,
      };
      const mockResponse = {
        message: 'Comment updated successfully.',
        data: emptyCommentDto,
      };
      service.updateDocumentComment.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateDocumentComment(emptyCommentDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateDocumentComment).toHaveBeenCalledWith(
        emptyCommentDto,
      );
    });

    it('should surface NotFoundException when booking not found (failure + response time)', async () => {
      service.updateDocumentComment.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();
      await expect(controller.updateDocumentComment(dto)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(service.updateDocumentComment).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface BadRequestException when booking is already completed', async () => {
      service.updateDocumentComment.mockRejectedValueOnce(
        new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        ),
      );

      await expect(controller.updateDocumentComment(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.updateDocumentComment).toHaveBeenCalledWith(dto);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.updateDocumentComment.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to update booking data.'),
      );

      await expect(controller.updateDocumentComment(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(service.updateDocumentComment).toHaveBeenCalledWith(dto);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Database connection failed');
      service.updateDocumentComment.mockRejectedValueOnce(err);

      await expect(controller.updateDocumentComment(dto)).rejects.toThrow(err);
      expect(service.updateDocumentComment).toHaveBeenCalledWith(dto);
    });

    it('should handle minimal required fields only', async () => {
      const minimalDto = {
        opportunityId: 'OPP-999',
        lastStep: 1,
      } as any;
      const mockResponse = {
        message: 'Comment updated successfully.',
        data: minimalDto,
      };
      service.updateDocumentComment.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateDocumentComment(minimalDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateDocumentComment).toHaveBeenCalledWith(minimalDto);
    });

    it('should handle all fields populated with different booking types', async () => {
      const fullDto = {
        opportunityId: 'OPP-888',
        documentsNote:
          'Comprehensive review completed. All documents verified and approved for signature process.',
        saveForLater: false,
        lastStep: 5,
        bookingAs: BookingAsEnum.PARTNERSHIP_FIRM,
      };
      const mockResponse = {
        message: 'Comment updated successfully.',
        data: fullDto,
      };
      service.updateDocumentComment.mockResolvedValueOnce(mockResponse);

      const result = await controller.updateDocumentComment(fullDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateDocumentComment).toHaveBeenCalledWith(fullDto);
    });
  });

  describe('agreedOnTerms', () => {
    const dto = {
      opportunityId: 'OPP-123',
      isAgreedOnTerms: true,
      saveForLater: false,
      lastStep: 5,
      bookingAs: BookingAsEnum.INDIVIDUAL,
    };

    it('should agree to terms successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'Terms and conditions consent submitted successfully.',
        data: {
          id: 1,
          opportunityId: dto.opportunityId,
          isAgreedOnTerms: true,
        },
      };
      service.agreedOnTerms.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.agreedOnTerms(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.agreedOnTerms).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle saveForLater=true (partial save flow)', async () => {
      const partialDto = {
        opportunityId: 'OPP-456',
        saveForLater: true,
      } as any;
      const mockResponse = {
        message: 'Terms and conditions consent submitted successfully.',
        data: { id: 2, opportunityId: partialDto.opportunityId },
      };
      service.agreedOnTerms.mockResolvedValueOnce(mockResponse);

      const result = await controller.agreedOnTerms(partialDto);

      expect(result).toEqual(mockResponse);
      expect(service.agreedOnTerms).toHaveBeenCalledWith(partialDto);
    });

    it('should handle terms agreement as false', async () => {
      const disagreeDto = {
        opportunityId: 'OPP-789',
        isAgreedOnTerms: false,
        saveForLater: false,
        lastStep: 4,
        bookingAs: BookingAsEnum.CORPORATE,
      };
      const mockResponse = {
        message: 'Terms and conditions consent submitted successfully.',
        data: {
          id: 3,
          opportunityId: disagreeDto.opportunityId,
          isAgreedOnTerms: false,
        },
      };
      service.agreedOnTerms.mockResolvedValueOnce(mockResponse);

      const result = await controller.agreedOnTerms(disagreeDto);

      expect(result).toEqual(mockResponse);
      expect(service.agreedOnTerms).toHaveBeenCalledWith(disagreeDto);
    });

    it('should surface NotFoundException when booking not found (failure + response time)', async () => {
      service.agreedOnTerms.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();
      await expect(controller.agreedOnTerms(dto)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(service.agreedOnTerms).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface BadRequestException when booking is already completed', async () => {
      service.agreedOnTerms.mockRejectedValueOnce(
        new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        ),
      );

      await expect(controller.agreedOnTerms(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.agreedOnTerms).toHaveBeenCalledWith(dto);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.agreedOnTerms.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to update booking data.'),
      );

      await expect(controller.agreedOnTerms(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(service.agreedOnTerms).toHaveBeenCalledWith(dto);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Database connection failed');
      service.agreedOnTerms.mockRejectedValueOnce(err);

      await expect(controller.agreedOnTerms(dto)).rejects.toThrow(err);
      expect(service.agreedOnTerms).toHaveBeenCalledWith(dto);
    });

    it('should handle minimal required fields only', async () => {
      const minimalDto = {
        opportunityId: 'OPP-999',
        isAgreedOnTerms: true,
        lastStep: 1,
      } as any;
      const mockResponse = {
        message: 'Terms and conditions consent submitted successfully.',
        data: { id: 4, opportunityId: minimalDto.opportunityId },
      };
      service.agreedOnTerms.mockResolvedValueOnce(mockResponse);

      const result = await controller.agreedOnTerms(minimalDto);

      expect(result).toEqual(mockResponse);
      expect(service.agreedOnTerms).toHaveBeenCalledWith(minimalDto);
    });

    it('should handle all fields populated', async () => {
      const fullDto = {
        opportunityId: 'OPP-888',
        isAgreedOnTerms: true,
        saveForLater: false,
        lastStep: 6,
        bookingAs: BookingAsEnum.PARTNERSHIP_FIRM,
      };
      const mockResponse = {
        message: 'Terms and conditions consent submitted successfully.',
        data: {
          id: 5,
          opportunityId: fullDto.opportunityId,
          isAgreedOnTerms: true,
        },
      };
      service.agreedOnTerms.mockResolvedValueOnce(mockResponse);

      const result = await controller.agreedOnTerms(fullDto);

      expect(result).toEqual(mockResponse);
      expect(service.agreedOnTerms).toHaveBeenCalledWith(fullDto);
    });
  });

  describe('submitForSignature', () => {
    const dto = {
      opportunityId: 'OPP-123',
      isCompleted: true,
      isSignedOffline: false,
      bookingAs: BookingAsEnum.INDIVIDUAL,
    };

    it('should submit for signature successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'Booking form submitted successfully.',
        data: { id: 1, opportunityId: dto.opportunityId, isCompleted: true },
      };
      service.submitForSignature.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.submitForSignature(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.submitForSignature).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle offline signature submission', async () => {
      const offlineDto = {
        opportunityId: 'OPP-456',
        isCompleted: true,
        isSignedOffline: true,
        bookingAs: BookingAsEnum.CORPORATE,
      };
      const mockResponse = {
        message: 'Booking form submitted successfully.',
        data: {
          id: 2,
          opportunityId: offlineDto.opportunityId,
          isCompleted: true,
        },
      };
      service.submitForSignature.mockResolvedValueOnce(mockResponse);

      const result = await controller.submitForSignature(offlineDto);

      expect(result).toEqual(mockResponse);
      expect(service.submitForSignature).toHaveBeenCalledWith(offlineDto);
    });

    it('should handle online signature submission', async () => {
      const onlineDto = {
        opportunityId: 'OPP-789',
        isCompleted: true,
        isSignedOffline: false,
        bookingAs: BookingAsEnum.PARTNERSHIP_FIRM,
      };
      const mockResponse = {
        message: 'Booking form submitted successfully.',
        data: {
          id: 3,
          opportunityId: onlineDto.opportunityId,
          isCompleted: true,
        },
      };
      service.submitForSignature.mockResolvedValueOnce(mockResponse);

      const result = await controller.submitForSignature(onlineDto);

      expect(result).toEqual(mockResponse);
      expect(service.submitForSignature).toHaveBeenCalledWith(onlineDto);
    });

    it('should handle partial completion (isCompleted: false)', async () => {
      const partialDto = {
        opportunityId: 'OPP-999',
        isCompleted: false,
        isSignedOffline: false,
        bookingAs: BookingAsEnum.INDIVIDUAL,
      };
      const mockResponse = {
        message: 'Booking form submitted successfully.',
        data: {
          id: 4,
          opportunityId: partialDto.opportunityId,
          isCompleted: false,
        },
      };
      service.submitForSignature.mockResolvedValueOnce(mockResponse);

      const result = await controller.submitForSignature(partialDto);

      expect(result).toEqual(mockResponse);
      expect(service.submitForSignature).toHaveBeenCalledWith(partialDto);
    });

    it('should surface NotFoundException when booking not found (failure + response time)', async () => {
      service.submitForSignature.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();
      await expect(controller.submitForSignature(dto)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(service.submitForSignature).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface BadRequestException when booking is already completed', async () => {
      service.submitForSignature.mockRejectedValueOnce(
        new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        ),
      );

      await expect(controller.submitForSignature(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.submitForSignature).toHaveBeenCalledWith(dto);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.submitForSignature.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to update booking data.'),
      );

      await expect(controller.submitForSignature(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(service.submitForSignature).toHaveBeenCalledWith(dto);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('PDF generation failed');
      service.submitForSignature.mockRejectedValueOnce(err);

      await expect(controller.submitForSignature(dto)).rejects.toThrow(err);
      expect(service.submitForSignature).toHaveBeenCalledWith(dto);
    });

    it('should handle minimal required fields only', async () => {
      const minimalDto = {
        opportunityId: 'OPP-888',
        isCompleted: true,
      } as any;
      const mockResponse = {
        message: 'Booking form submitted successfully.',
        data: { id: 5, opportunityId: minimalDto.opportunityId },
      };
      service.submitForSignature.mockResolvedValueOnce(mockResponse);

      const result = await controller.submitForSignature(minimalDto);

      expect(result).toEqual(mockResponse);
      expect(service.submitForSignature).toHaveBeenCalledWith(minimalDto);
    });

    it('should handle all fields populated', async () => {
      const fullDto = {
        opportunityId: 'OPP-777',
        isCompleted: true,
        isSignedOffline: true,
        bookingAs: BookingAsEnum.CORPORATE,
      };
      const mockResponse = {
        message: 'Booking form submitted successfully.',
        data: {
          id: 6,
          opportunityId: fullDto.opportunityId,
          isCompleted: true,
        },
      };
      service.submitForSignature.mockResolvedValueOnce(mockResponse);

      const result = await controller.submitForSignature(fullDto);

      expect(result).toEqual(mockResponse);
      expect(service.submitForSignature).toHaveBeenCalledWith(fullDto);
    });
  });

  describe('handleWebhook', () => {
    const successWebhookData = {
      webhookType: 'Success',
      documentStatus: 'Completed',
      documentId: 'DOC-123456',
      irn: 'IRN-1234-OPP-789',
      request: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '9876543210',
      },
    };

    const sentWebhookData = {
      webhookType: 'Success',
      documentStatus: 'Sent',
      documentId: 'DOC-123456',
      irn: 'IRN-5678-OPP-456',
      request: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '9876543211',
      },
    };

    const failedWebhookData = {
      webhookType: 'Failed',
      documentStatus: 'Failed',
      documentId: 'DOC-999999',
      irn: 'IRN-9999-OPP-999',
      request: {
        name: 'Bob Wilson',
        email: 'bob.wilson@example.com',
        phone: '9876543212',
      },
    };

    it('should handle success webhook with completed status (success + response time)', async () => {
      service.handleWebhook.mockResolvedValueOnce(undefined);

      const start = Date.now();
      const result = await controller.handleWebhook(successWebhookData);
      const duration = Date.now() - start;

      expect(result).toBeUndefined();
      expect(service.handleWebhook).toHaveBeenCalledWith(successWebhookData);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle success webhook with sent status', async () => {
      service.handleWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.handleWebhook(sentWebhookData);

      expect(result).toBeUndefined();
      expect(service.handleWebhook).toHaveBeenCalledWith(sentWebhookData);
    });

    it('should handle failed webhook', async () => {
      service.handleWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.handleWebhook(failedWebhookData);

      expect(result).toBeUndefined();
      expect(service.handleWebhook).toHaveBeenCalledWith(failedWebhookData);
    });

    it('should handle webhook with minimal data', async () => {
      const minimalWebhookData = {
        webhookType: 'Success',
        documentStatus: 'Completed',
        documentId: 'DOC-MIN',
        irn: 'IRN-MIN-OPP-MIN',
      };
      service.handleWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.handleWebhook(minimalWebhookData);

      expect(result).toBeUndefined();
      expect(service.handleWebhook).toHaveBeenCalledWith(minimalWebhookData);
    });

    it('should handle webhook with complex request data', async () => {
      const complexWebhookData = {
        webhookType: 'Success',
        documentStatus: 'Completed',
        documentId: 'DOC-COMPLEX',
        irn: 'IRN-COMPLEX-OPP-COMPLEX',
        request: {
          name: 'Complex User',
          email: 'complex@example.com',
          phone: '9876543213',
          address: '123 Main St, City, State',
          company: 'Test Company',
          role: 'Manager',
        },
      };
      service.handleWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.handleWebhook(complexWebhookData);

      expect(result).toBeUndefined();
      expect(service.handleWebhook).toHaveBeenCalledWith(complexWebhookData);
    });

    it('should propagate service errors', async () => {
      const err = new Error('Webhook processing failed');
      service.handleWebhook.mockRejectedValueOnce(err);

      await expect(
        controller.handleWebhook(successWebhookData),
      ).rejects.toThrow(err);
      expect(service.handleWebhook).toHaveBeenCalledWith(successWebhookData);
    });

    it('should handle webhook with missing optional fields', async () => {
      const minimalWebhookData = {
        webhookType: 'Success',
        documentStatus: 'Completed',
        documentId: 'DOC-MINIMAL',
        irn: 'IRN-MINIMAL-OPP-MINIMAL',
      };
      service.handleWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.handleWebhook(minimalWebhookData);

      expect(result).toBeUndefined();
      expect(service.handleWebhook).toHaveBeenCalledWith(minimalWebhookData);
    });
  });

  describe('referrerWebhook', () => {
    const successWebhookData = {
      webhookType: 'Success',
      documentStatus: 'Completed',
      documentId: 'REF-DOC-123456',
      irn: 'REF-IRN-1234-OPP-789',
      request: {
        name: 'John Referrer',
        email: 'john.referrer@example.com',
        phone: '9876543210',
      },
    };

    const failedWebhookData = {
      webhookType: 'Failed',
      documentStatus: 'Failed',
      documentId: 'REF-DOC-999999',
      irn: 'REF-IRN-9999-OPP-999',
      request: {
        name: 'Bob Referrer',
        email: 'bob.referrer@example.com',
        phone: '9876543212',
      },
    };

    const sentWebhookData = {
      webhookType: 'Success',
      documentStatus: 'Sent',
      documentId: 'REF-DOC-123456',
      irn: 'REF-IRN-5678-OPP-456',
      request: {
        name: 'Jane Referrer',
        email: 'jane.referrer@example.com',
        phone: '9876543211',
      },
    };

    it('should handle success webhook with completed status (success + response time)', async () => {
      service.referrerWebhook.mockResolvedValueOnce(undefined);

      const start = Date.now();
      const result = await controller.referrerWebhook(successWebhookData);
      const duration = Date.now() - start;

      expect(result).toBeUndefined();
      expect(service.referrerWebhook).toHaveBeenCalledWith(successWebhookData);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle success webhook with sent status', async () => {
      service.referrerWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.referrerWebhook(sentWebhookData);

      expect(result).toBeUndefined();
      expect(service.referrerWebhook).toHaveBeenCalledWith(sentWebhookData);
    });

    it('should handle failed webhook', async () => {
      service.referrerWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.referrerWebhook(failedWebhookData);

      expect(result).toBeUndefined();
      expect(service.referrerWebhook).toHaveBeenCalledWith(failedWebhookData);
    });

    it('should handle webhook with minimal data', async () => {
      const minimalWebhookData = {
        webhookType: 'Success',
        documentStatus: 'Completed',
        documentId: 'REF-DOC-MIN',
        irn: 'REF-IRN-MIN-OPP-MIN',
      };
      service.referrerWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.referrerWebhook(minimalWebhookData);

      expect(result).toBeUndefined();
      expect(service.referrerWebhook).toHaveBeenCalledWith(minimalWebhookData);
    });

    it('should handle webhook with complex request data', async () => {
      const complexWebhookData = {
        webhookType: 'Success',
        documentStatus: 'Completed',
        documentId: 'REF-DOC-COMPLEX',
        irn: 'REF-IRN-COMPLEX-OPP-COMPLEX',
        request: {
          name: 'Complex Referrer',
          email: 'complex.referrer@example.com',
          phone: '9876543213',
          address: '123 Main St, City, State',
          company: 'Test Company',
          role: 'Manager',
          propertyName: 'Test Property',
          unitNumber: 'A-101',
        },
      };
      service.referrerWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.referrerWebhook(complexWebhookData);

      expect(result).toBeUndefined();
      expect(service.referrerWebhook).toHaveBeenCalledWith(complexWebhookData);
    });

    it('should propagate service errors', async () => {
      const err = new Error('Referrer webhook processing failed');
      service.referrerWebhook.mockRejectedValueOnce(err);

      await expect(
        controller.referrerWebhook(successWebhookData),
      ).rejects.toThrow(err);
      expect(service.referrerWebhook).toHaveBeenCalledWith(successWebhookData);
    });

    it('should handle webhook with missing optional fields', async () => {
      const minimalWebhookData = {
        webhookType: 'Success',
        documentStatus: 'Completed',
        documentId: 'REF-DOC-MINIMAL',
        irn: 'REF-IRN-MINIMAL-OPP-MINIMAL',
      };
      service.referrerWebhook.mockResolvedValueOnce(undefined);

      const result = await controller.referrerWebhook(minimalWebhookData);

      expect(result).toBeUndefined();
      expect(service.referrerWebhook).toHaveBeenCalledWith(minimalWebhookData);
    });
  });

  describe('saveBookingFeedback', () => {
    const dto = {
      opportunityId: 'OPP-123',
      rating: 5,
      feedback: 'Excellent service and smooth process!',
      bookingAs: BookingAsEnum.INDIVIDUAL,
    };

    it('should save rating and feedback successfully (success + response time)', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Rating and feedback saved successfully.',
        data: dto,
      };
      service.saveBookingFeedback.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.saveBookingFeedback(dto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.saveBookingFeedback).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle minimum rating (0)', async () => {
      const minRatingDto = {
        opportunityId: 'OPP-456',
        rating: 0,
        feedback: 'Poor experience',
        bookingAs: BookingAsEnum.CORPORATE,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Rating and feedback saved successfully.',
        data: minRatingDto,
      };
      service.saveBookingFeedback.mockResolvedValueOnce(mockResponse);

      const result = await controller.saveBookingFeedback(minRatingDto);

      expect(result).toEqual(mockResponse);
      expect(service.saveBookingFeedback).toHaveBeenCalledWith(minRatingDto);
    });

    it('should handle maximum rating (10)', async () => {
      const maxRatingDto = {
        opportunityId: 'OPP-789',
        rating: 10,
        feedback: 'Outstanding service!',
        bookingAs: BookingAsEnum.PARTNERSHIP_FIRM,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Rating and feedback saved successfully.',
        data: maxRatingDto,
      };
      service.saveBookingFeedback.mockResolvedValueOnce(mockResponse);

      const result = await controller.saveBookingFeedback(maxRatingDto);

      expect(result).toEqual(mockResponse);
      expect(service.saveBookingFeedback).toHaveBeenCalledWith(maxRatingDto);
    });

    it('should handle empty feedback', async () => {
      const emptyFeedbackDto = {
        opportunityId: 'OPP-999',
        rating: 7,
        feedback: '',
        bookingAs: BookingAsEnum.INDIVIDUAL,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Rating and feedback saved successfully.',
        data: emptyFeedbackDto,
      };
      service.saveBookingFeedback.mockResolvedValueOnce(mockResponse);

      const result = await controller.saveBookingFeedback(emptyFeedbackDto);

      expect(result).toEqual(mockResponse);
      expect(service.saveBookingFeedback).toHaveBeenCalledWith(
        emptyFeedbackDto,
      );
    });

    it('should handle maximum length feedback (500 characters)', async () => {
      const longFeedback = 'A'.repeat(500);
      const maxLengthDto = {
        opportunityId: 'OPP-888',
        rating: 8,
        feedback: longFeedback,
        bookingAs: BookingAsEnum.CORPORATE,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Rating and feedback saved successfully.',
        data: maxLengthDto,
      };
      service.saveBookingFeedback.mockResolvedValueOnce(mockResponse);

      const result = await controller.saveBookingFeedback(maxLengthDto);

      expect(result).toEqual(mockResponse);
      expect(service.saveBookingFeedback).toHaveBeenCalledWith(maxLengthDto);
    });

    it('should surface NotFoundException when booking not found (failure + response time)', async () => {
      service.saveBookingFeedback.mockRejectedValueOnce(
        new NotFoundException('Invalid booking details.'),
      );

      const start = Date.now();
      await expect(controller.saveBookingFeedback(dto)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(service.saveBookingFeedback).toHaveBeenCalledWith(dto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.saveBookingFeedback.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to Save rating and Feedback.'),
      );

      await expect(controller.saveBookingFeedback(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(service.saveBookingFeedback).toHaveBeenCalledWith(dto);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Database connection failed');
      service.saveBookingFeedback.mockRejectedValueOnce(err);

      await expect(controller.saveBookingFeedback(dto)).rejects.toThrow(err);
      expect(service.saveBookingFeedback).toHaveBeenCalledWith(dto);
    });

    it('should handle various rating values', async () => {
      const ratings = [1, 2, 3, 4, 6, 7, 8, 9];

      for (const rating of ratings) {
        const ratingDto = {
          opportunityId: `OPP-${rating}00`,
          rating,
          feedback: `Rating ${rating} feedback`,
          bookingAs: BookingAsEnum.INDIVIDUAL,
        };
        const mockResponse = {
          statusCode: SUCCESS,
          message: 'Rating and feedback saved successfully.',
          data: ratingDto,
        };
        service.saveBookingFeedback.mockResolvedValueOnce(mockResponse);

        const result = await controller.saveBookingFeedback(ratingDto);

        expect(result).toEqual(mockResponse);
        expect(service.saveBookingFeedback).toHaveBeenCalledWith(ratingDto);
      }
    });

    it('should handle feedback with special characters', async () => {
      const specialCharDto = {
        opportunityId: 'OPP-SPECIAL',
        rating: 9,
        feedback: 'Great service! @#$%^&*()_+-=[]{}|;:,.<>?',
        bookingAs: BookingAsEnum.PARTNERSHIP_FIRM,
      };
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Rating and feedback saved successfully.',
        data: specialCharDto,
      };
      service.saveBookingFeedback.mockResolvedValueOnce(mockResponse);

      const result = await controller.saveBookingFeedback(specialCharDto);

      expect(result).toEqual(mockResponse);
      expect(service.saveBookingFeedback).toHaveBeenCalledWith(specialCharDto);
    });
  });

  describe('deleteBooking', () => {
    const opportunityIdDto = { opportunityId: 'OPP-123' };

    it('should delete booking successfully (success + response time)', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Booking deleted successfully.',
        data: null,
      };
      service.deleteBooking.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.deleteBooking(opportunityIdDto);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.deleteBooking).toHaveBeenCalledWith(
        opportunityIdDto.opportunityId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle different opportunity ID formats', async () => {
      const differentOppIds = [
        'OPP-456',
        'OPP-789',
        'OPP-ABC-123',
        'OPP-999999',
        'OPP-SPECIAL-CHARS-!@#',
      ];

      for (const oppId of differentOppIds) {
        const opportunityIdDto = { opportunityId: oppId };
        const mockResponse = {
          statusCode: SUCCESS,
          message: 'Booking deleted successfully.',
          data: null,
        };
        service.deleteBooking.mockResolvedValueOnce(mockResponse);

        const result = await controller.deleteBooking(opportunityIdDto);

        expect(result).toEqual(mockResponse);
        expect(service.deleteBooking).toHaveBeenCalledWith(oppId);
      }
    });

    it('should surface NotFoundException when booking not found (failure + response time)', async () => {
      service.deleteBooking.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();
      await expect(controller.deleteBooking(opportunityIdDto)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(service.deleteBooking).toHaveBeenCalledWith(
        opportunityIdDto.opportunityId,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.deleteBooking.mockRejectedValueOnce(
        new InternalServerErrorException('Failed to delete booking.'),
      );

      await expect(controller.deleteBooking(opportunityIdDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(service.deleteBooking).toHaveBeenCalledWith(
        opportunityIdDto.opportunityId,
      );
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Database connection failed');
      service.deleteBooking.mockRejectedValueOnce(err);

      await expect(controller.deleteBooking(opportunityIdDto)).rejects.toThrow(
        err,
      );
      expect(service.deleteBooking).toHaveBeenCalledWith(
        opportunityIdDto.opportunityId,
      );
    });

    it('should handle empty opportunity ID', async () => {
      const emptyOppIdDto = { opportunityId: '' };
      service.deleteBooking.mockRejectedValueOnce(
        new BadRequestException('Opportunity ID is required.'),
      );

      await expect(controller.deleteBooking(emptyOppIdDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.deleteBooking).toHaveBeenCalledWith('');
    });

    it('should handle null opportunity ID', async () => {
      const nullOppIdDto = { opportunityId: null };
      service.deleteBooking.mockRejectedValueOnce(
        new BadRequestException('Opportunity ID is required.'),
      );

      await expect(controller.deleteBooking(nullOppIdDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.deleteBooking).toHaveBeenCalledWith(null);
    });

    it('should handle undefined opportunity ID', async () => {
      const undefinedOppIdDto = { opportunityId: undefined };
      service.deleteBooking.mockRejectedValueOnce(
        new BadRequestException('Opportunity ID is required.'),
      );

      await expect(controller.deleteBooking(undefinedOppIdDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.deleteBooking).toHaveBeenCalledWith(undefined);
    });

    it('should handle database constraint violations', async () => {
      service.deleteBooking.mockRejectedValueOnce(
        new BadRequestException(
          'Cannot delete booking due to foreign key constraints.',
        ),
      );

      await expect(controller.deleteBooking(opportunityIdDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.deleteBooking).toHaveBeenCalledWith(
        opportunityIdDto.opportunityId,
      );
    });
  });

  describe('renderBookingPreview', () => {
    const oppId = 'OPP-123';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render booking preview successfully (success + response time)', async () => {
      const mockResponse = {
        booking: { id: 1, opportunityId: oppId },
        termsCondition: { terms: 'Sample terms' },
        BookingSource: 'Website',
        DISPLAY_DATE_FORMAT: 'DD/MM/YYYY',
        IMAGE_BASE_URL: 'https://s3.amazonaws.com/bucket',
        PROJECT_IMAGES_URL: 'https://images.example.com',
      };
      service.renderBookingPreview.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.renderBookingPreview(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);

      // Updated line (add false as second param)
      expect(service.renderBookingPreview).toHaveBeenCalledWith(oppId, false);

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle different opportunity ID formats', async () => {
      const differentOppIds = [
        'OPP-456',
        'OPP-789',
        'OPP-ABC-123',
        'OPP-999999',
        'OPP-SPECIAL-CHARS-!@#',
      ];

      for (const testOppId of differentOppIds) {
        const mockResponse = {
          booking: { id: 1, opportunityId: testOppId },
          termsCondition: { terms: 'Sample terms' },
        };

        service.renderBookingPreview.mockResolvedValueOnce(mockResponse);

        const result = await controller.renderBookingPreview(testOppId);

        expect(result).toEqual(mockResponse);

        //  Updated
        expect(service.renderBookingPreview).toHaveBeenCalledWith(
          testOppId,
          false,
        );
      }
    });

    it('should surface NotFoundException when booking not found', async () => {
      service.renderBookingPreview.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();

      await expect(controller.renderBookingPreview(oppId)).rejects.toThrow(
        NotFoundException,
      );

      const duration = Date.now() - start;

      expect(service.renderBookingPreview).toHaveBeenCalledWith(oppId, false);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.renderBookingPreview.mockRejectedValueOnce(
        new InternalServerErrorException('Something went wrong!'),
      );

      await expect(controller.renderBookingPreview(oppId)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(service.renderBookingPreview).toHaveBeenCalledWith(oppId, false);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Template rendering failed');

      service.renderBookingPreview.mockRejectedValueOnce(err);

      await expect(controller.renderBookingPreview(oppId)).rejects.toThrow(err);

      expect(service.renderBookingPreview).toHaveBeenCalledWith(oppId, false);
    });

    it('should handle empty opportunity ID', async () => {
      const emptyOppId = '';

      service.renderBookingPreview.mockRejectedValueOnce(
        new BadRequestException('Opportunity ID is required.'),
      );

      await expect(controller.renderBookingPreview(emptyOppId)).rejects.toThrow(
        BadRequestException,
      );

      expect(service.renderBookingPreview).toHaveBeenCalledWith(
        emptyOppId,
        false,
      );
    });

    it('should pass applicantOnly=true when query is "true"', async () => {
      const mockResponse = { booking: { id: 99 } };

      service.renderBookingPreview.mockResolvedValueOnce(mockResponse);

      const result = await controller.renderBookingPreview(oppId, 'true');

      expect(result).toEqual(mockResponse);
      expect(service.renderBookingPreview).toHaveBeenCalledWith(oppId, true);
    });
  });

  describe('renderReferrerPreview', () => {
    const oppId = 'OPP-123';

    it('should render referrer preview successfully (success + response time)', async () => {
      const mockResponse = {
        booking: { id: 1, opportunityId: oppId },
        termsCondition: { terms: 'Referrer terms' },
        BookingSource: 'Referral',
        DISPLAY_DATE_FORMAT: 'DD/MM/YYYY',
        IMAGE_BASE_URL: 'https://s3.amazonaws.com/bucket',
        PROJECT_IMAGES_URL: 'https://images.example.com',
      };
      service.renderReferrerPreview.mockResolvedValueOnce(mockResponse);

      const start = Date.now();
      const result = await controller.renderReferrerPreview(oppId);
      const duration = Date.now() - start;

      expect(result).toEqual(mockResponse);
      expect(service.renderReferrerPreview).toHaveBeenCalledWith(oppId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle different opportunity ID formats', async () => {
      const differentOppIds = [
        'OPP-456',
        'OPP-789',
        'OPP-ABC-123',
        'OPP-999999',
        'OPP-SPECIAL-CHARS-!@#',
      ];

      for (const testOppId of differentOppIds) {
        const mockResponse = {
          booking: { id: 1, opportunityId: testOppId },
          termsCondition: { terms: 'Referrer terms' },
        };
        service.renderReferrerPreview.mockResolvedValueOnce(mockResponse);

        const result = await controller.renderReferrerPreview(testOppId);

        expect(result).toEqual(mockResponse);
        expect(service.renderReferrerPreview).toHaveBeenCalledWith(testOppId);
      }
    });

    it('should surface NotFoundException when booking not found (failure + response time)', async () => {
      service.renderReferrerPreview.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();
      await expect(controller.renderReferrerPreview(oppId)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(service.renderReferrerPreview).toHaveBeenCalledWith(oppId);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.renderReferrerPreview.mockRejectedValueOnce(
        new InternalServerErrorException('Something went wrong!'),
      );

      await expect(controller.renderReferrerPreview(oppId)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(service.renderReferrerPreview).toHaveBeenCalledWith(oppId);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('Template rendering failed');
      service.renderReferrerPreview.mockRejectedValueOnce(err);

      await expect(controller.renderReferrerPreview(oppId)).rejects.toThrow(
        err,
      );
      expect(service.renderReferrerPreview).toHaveBeenCalledWith(oppId);
    });

    it('should handle empty opportunity ID', async () => {
      const emptyOppId = '';
      service.renderReferrerPreview.mockRejectedValueOnce(
        new BadRequestException('Opportunity ID is required.'),
      );

      await expect(
        controller.renderReferrerPreview(emptyOppId),
      ).rejects.toThrow(BadRequestException);
      expect(service.renderReferrerPreview).toHaveBeenCalledWith(emptyOppId);
    });
  });

  describe('downloadPdf', () => {
    const oppId = 'OPP-123';

    it('should download PDF successfully (success + response time)', async () => {
      service.downloadBookingPDF.mockResolvedValueOnce(undefined);

      const start = Date.now();
      const result = await controller.downloadPdf(oppId);
      const duration = Date.now() - start;

      expect(result).toBeUndefined();
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, false);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should download PDF with offline flag set to true', async () => {
      service.downloadBookingPDF.mockResolvedValueOnce(undefined);

      const result = await controller.downloadPdf(oppId, true);

      expect(result).toBeUndefined();
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, true);
    });

    it('should download PDF with offline flag set to false', async () => {
      service.downloadBookingPDF.mockResolvedValueOnce(undefined);

      const result = await controller.downloadPdf(oppId, false);

      expect(result).toBeUndefined();
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, false);
    });

    it('should handle different opportunity ID formats', async () => {
      const differentOppIds = [
        'OPP-456',
        'OPP-789',
        'OPP-ABC-123',
        'OPP-999999',
        'OPP-SPECIAL-CHARS-!@#',
      ];

      for (const testOppId of differentOppIds) {
        service.downloadBookingPDF.mockResolvedValueOnce(undefined);

        const result = await controller.downloadPdf(testOppId);

        expect(result).toBeUndefined();
        expect(service.downloadBookingPDF).toHaveBeenCalledWith(
          testOppId,
          false,
        );
      }
    });

    it('should surface NotFoundException when booking not found (failure + response time)', async () => {
      service.downloadBookingPDF.mockRejectedValueOnce(
        new NotFoundException('Booking not found.'),
      );

      const start = Date.now();
      await expect(controller.downloadPdf(oppId)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, false);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should surface InternalServerErrorException when service fails', async () => {
      service.downloadBookingPDF.mockRejectedValueOnce(
        new InternalServerErrorException('PDF generation failed.'),
      );

      await expect(controller.downloadPdf(oppId)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, false);
    });

    it('should propagate generic errors from the service', async () => {
      const err = new Error('PDF generation failed');
      service.downloadBookingPDF.mockRejectedValueOnce(err);

      await expect(controller.downloadPdf(oppId)).rejects.toThrow(err);
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, false);
    });

    it('should handle empty opportunity ID', async () => {
      const emptyOppId = '';
      service.downloadBookingPDF.mockRejectedValueOnce(
        new BadRequestException('Opportunity ID is required.'),
      );

      await expect(controller.downloadPdf(emptyOppId)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(
        emptyOppId,
        false,
      );
    });

    it('should handle boolean conversion for isOffline parameter', async () => {
      service.downloadBookingPDF.mockResolvedValueOnce(undefined);

      // Test with string 'true' which should be converted to boolean true
      const result = await controller.downloadPdf(oppId, 'true' as any);

      expect(result).toBeUndefined();
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, 'true');
    });

    it('should handle PDF generation errors', async () => {
      service.downloadBookingPDF.mockRejectedValueOnce(
        new Error('Failed to generate PDF buffer'),
      );

      await expect(controller.downloadPdf(oppId)).rejects.toThrow(
        'Failed to generate PDF buffer',
      );
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, false);
    });

    it('should handle file system errors', async () => {
      service.downloadBookingPDF.mockRejectedValueOnce(
        new Error('Failed to write PDF file'),
      );

      await expect(controller.downloadPdf(oppId)).rejects.toThrow(
        'Failed to write PDF file',
      );
      expect(service.downloadBookingPDF).toHaveBeenCalledWith(oppId, false);
    });
  });

  describe('updatePaymentDetails', () => {
    const dto: PaymentDetailsDto = {
      opportunityId: 'OPP123',
      amount: 1000,
      amountInWords: 'One Thousand',
      bookingAs: BookingAsEnum.INDIVIDUAL,
      payments: [
        {
          paidAmount: 1000,
          paymentMode: PaymentModeEnum.OFFLINE,
          status: PaymentTxStatusEnum.VERIFIED,
        },
      ],
      saveForLater: false,
      isPartialSaved: false,
      lastStep: 2,
    };

    it('should call service.updatePaymentDetails and return result', async () => {
      const mockResult = { id: 1, opportunityId: dto.opportunityId };
      (service.updatePaymentDetails as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.updatePaymentDetails(dto);

      expect(service.updatePaymentDetails).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });

    it('should throw error when service throws', async () => {
      (service.updatePaymentDetails as jest.Mock).mockRejectedValue(
        new Error('Booking not found'),
      );

      await expect(controller.updatePaymentDetails(dto)).rejects.toThrow(
        'Booking not found',
      );
    });

    it('should resolve within 500ms', async () => {
      (service.updatePaymentDetails as jest.Mock).mockResolvedValue({
        id: 1,
        opportunityId: dto.opportunityId,
      });

      const start = Date.now();
      await controller.updatePaymentDetails(dto);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('deletePaymentDetails', () => {
    it('should call service.deletePaymentDetails with dto and return result', async () => {
      const dto: DeleteBookingPaymentsDto = {
        paymentId: 123,
        opportunityId: 'OPP-001',
      };

      const mockResult = { success: true, message: 'Payment deleted' };
      (service.deletePaymentDetails as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.deletePaymentDetails(dto);

      expect(service.deletePaymentDetails).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });

    it('should throw error if service throws', async () => {
      const dto: DeleteBookingPaymentsDto = {
        paymentId: 123,
        opportunityId: 'OPP-001',
      };

      (service.deletePaymentDetails as jest.Mock).mockRejectedValue(
        new Error('Something went wrong'),
      );

      await expect(controller.deletePaymentDetails(dto)).rejects.toThrow(
        'Something went wrong',
      );
    });

    it('should complete within 500ms', async () => {
      const dto: DeleteBookingPaymentsDto = {
        paymentId: 123,
        opportunityId: 'OPP-001',
      };

      const mockResult = { success: true, message: 'Payment deleted' };
      (service.deletePaymentDetails as jest.Mock).mockResolvedValue(mockResult);

      const start = Date.now();
      const result = await controller.deletePaymentDetails(dto);
      const end = Date.now();

      const duration = end - start;

      expect(result).toEqual(mockResult);
      expect(duration).toBeLessThanOrEqual(TEST_EXECUTION_TIME); // response time check
    });
  });

  describe('updateCompanyDetails', () => {
    it('should call service.updateCompanyDetails with dto and return result', async () => {
      const dto: UpdateCompanyDetailsDto = {
        opportunityId: 'OPP-001',
        bookingAs: BookingAsEnum.CORPORATE,
        gstNumber: '22AAAAA0000A1Z5',
        companyName: 'Acme Pvt Ltd',
        companyPan: 'ABCDE1234F',
        companyAddress: '123 Street, City',
        lastStep: 2,
        saveForLater: false,
      };

      const mockResult = { success: true, message: 'Company details updated' };
      (service.updateCompanyDetails as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.updateCompanyDetails(dto);

      expect(service.updateCompanyDetails).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });

    it('should throw error if service throws', async () => {
      const dto: UpdateCompanyDetailsDto = {
        opportunityId: 'OPP-001',
        bookingAs: BookingAsEnum.CORPORATE,
        gstNumber: '22AAAAA0000A1Z5',
        companyName: 'Acme Pvt Ltd',
        companyPan: 'ABCDE1234F',
        companyAddress: '123 Street, City',
        lastStep: 2,
      };

      (service.updateCompanyDetails as jest.Mock).mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(controller.updateCompanyDetails(dto)).rejects.toThrow(
        'Update failed',
      );
    });

    it('should complete within 500ms', async () => {
      const dto: UpdateCompanyDetailsDto = {
        opportunityId: 'OPP-001',
        bookingAs: BookingAsEnum.CORPORATE,
        gstNumber: '22AAAAA0000A1Z5',
        companyName: 'Acme Pvt Ltd',
        companyPan: 'ABCDE1234F',
        companyAddress: '123 Street, City',
        lastStep: 2,
      };

      const mockResult = { success: true, message: 'Company details updated' };
      (service.updateCompanyDetails as jest.Mock).mockResolvedValue(mockResult);

      const start = Date.now();
      const result = await controller.updateCompanyDetails(dto);
      const end = Date.now();

      const duration = end - start;

      expect(result).toEqual(mockResult);
      expect(duration).toBeLessThanOrEqual(TEST_EXECUTION_TIME); // response time check
    });
  });

  describe('Controller: PATCH /update-applicant (consolidated)', () => {
    let service: any;
    let controller: any;

    let bookingRepositoryUpdate: jest.Mock;

    beforeEach(() => {
      service = new (BookingsService as any)();
      service.getBookingByOppId = jest.fn();
      bookingRepositoryUpdate = jest.fn().mockResolvedValue(undefined);
      service.bookingRepository = { update: bookingRepositoryUpdate };

      controller = new (BookingsController as any)(service);
    });

    it('should call service with (dto.opportunityId, dto) and return result', async () => {
      const dto: BookingApplicantDto = {
        opportunityId: 'OPP-123',
        applicantNumber: 2,
        contactDetails: { emailAddress: 'a@b.com' } as any,
      } as any;

      const mockResult = {
        message: 'Applicant details updated successfully.',
        data: { applicant2: { contactDetails: { emailAddress: 'a@b.com' } } },
      };

      const realImpl = service.updateBookingApplicant;
      service.updateBookingApplicant = jest
        .fn()
        .mockResolvedValueOnce(mockResult);

      const result = await controller.updateApplicant(dto);

      expect(result).toEqual(mockResult);
      expect(service.updateBookingApplicant).toHaveBeenCalledWith(
        dto.opportunityId,
        dto,
      );

      service.updateBookingApplicant = realImpl;
    });

    it('when service throws BadRequestException internally, controller resolves undefined (service swallows errors)', async () => {
      const dto: BookingApplicantDto = {
        opportunityId: undefined as any,
        applicantNumber: 1,
      } as any;

      const realImpl = service.updateBookingApplicant;
      service.updateBookingApplicant = jest
        .fn()
        .mockImplementationOnce(async () => {
          // mimic current service behavior: catches and does not rethrow → returns undefined
          return undefined;
        });

      await expect(controller.updateApplicant(dto)).resolves.toBeUndefined();
      expect(service.updateBookingApplicant).toHaveBeenCalledWith(
        undefined,
        dto,
      );

      service.updateBookingApplicant = realImpl;
    });

    it('when service hits generic error, it is caught and controller resolves undefined', async () => {
      const dto: BookingApplicantDto = { opportunityId: 'OPP-X' } as any;

      const realImpl = service.updateBookingApplicant;
      service.updateBookingApplicant = jest
        .fn()
        .mockImplementationOnce(async () => undefined);

      await expect(controller.updateApplicant(dto)).resolves.toBeUndefined();
      expect(service.updateBookingApplicant).toHaveBeenCalledWith('OPP-X', dto);

      service.updateBookingApplicant = realImpl;
    });

    // ---- Updated tests for merged details ----

    it('updates correct applicant key (default applicantNumber=1) and merges only allowed fields; personalDetails encrypted before save', async () => {
      const oppId = 'OPP-A1';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        personalDetails: { firstName: 'John' } as any,
        contactDetails: { emailAddress: 'john@example.com' } as any,
      } as any;

      const existingBooking = {
        opportunityId: oppId,
        isCompleted: false,
        noOfApplicants: 1,
        applicant1: {
          personalDetails: { lastName: 'Doe' },
          contactDetails: { emailAddress: 'old@example.com' },
        },
      };
      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: existingBooking,
      });

      const result = await controller.updateApplicant(dto);

      // repository receives encrypted payload; personalDetails becomes a string
      expect(bookingRepositoryUpdate).toHaveBeenCalledWith(
        { opportunityId: oppId },
        expect.objectContaining({
          applicant1: expect.objectContaining({
            personalDetails: expect.any(String),
            contactDetails: { emailAddress: 'john@example.com' },
          }),
          noOfApplicants: 1,
        }),
      );

      // controller echoes decrypted "updateData" (pre-encryption structure)
      expect(result).toEqual(
        expect.objectContaining({
          message: 'Applicant details updated successfully.',
          data: expect.objectContaining({
            applicant1: expect.objectContaining({
              personalDetails: expect.any(Object),
              contactDetails: { emailAddress: 'john@example.com' },
            }),
          }),
        }),
      );
    });

    it('forwards lastStep and ignores unrelated DTO fields', async () => {
      const oppId = 'OPP-STRIP';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 2,
        lastStep: 7,
        saveForLater: true as any, // not used
        contactDetails: { emailAddress: 'new@example.com' } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: { opportunityId: oppId, isCompleted: false, applicant2: {} },
      });

      await controller.updateApplicant(dto);

      const [, encryptedPayload] = bookingRepositoryUpdate.mock.calls[0];

      // We can only assert on fields that are not encrypted and on top-level fields
      expect(encryptedPayload).toEqual(
        expect.objectContaining({
          applicant2: expect.objectContaining({
            contactDetails: { emailAddress: 'new@example.com' },
          }),
          lastStep: 7,
        }),
      );

      // ensure ignored fields are not persisted under applicant key
      expect(encryptedPayload.applicant2?.saveForLater).toBeUndefined();
    });

    it('mirrors communicationAddress from permanentAddress when flag is YES', async () => {
      const oppId = 'OPP-MIRROR';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 1,
        contactDetails: {
          isSameAddress: SameAddressEnum.YES,
          permanentAddress: { line1: 'A-1', city: 'Pune' } as any,
        } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: { opportunityId: oppId, isCompleted: false, applicant1: {} },
      });

      await controller.updateApplicant(dto);

      const [, encryptedPayload] = bookingRepositoryUpdate.mock.calls[0];

      // contactDetails remain plain; personalDetails would be encrypted if present
      expect(
        encryptedPayload.applicant1.contactDetails.permanentAddress,
      ).toEqual({
        line1: 'A-1',
        city: 'Pune',
        fullAddress: 'Pune',
      });
      expect(
        encryptedPayload.applicant1.contactDetails.communicationAddress,
      ).toEqual({ line1: 'A-1', city: 'Pune', fullAddress: 'Pune' });
    });

    it('uses applicantNumber to choose applicant key (e.g., applicant2)', async () => {
      const oppId = 'OPP-KEY';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 2,
        contactDetails: { emailAddress: 'bbb@example.com' } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: {
          opportunityId: oppId,
          isCompleted: false,
          applicant2: { contactDetails: { emailAddress: 'old@example.com' } },
        },
      });

      await controller.updateApplicant(dto);

      expect(bookingRepositoryUpdate).toHaveBeenCalledWith(
        { opportunityId: oppId },
        expect.objectContaining({
          applicant2: expect.objectContaining({
            contactDetails: { emailAddress: 'bbb@example.com' },
          }),
        }),
      );
    });

    it('does not run duplicate validation unless both contactNumber and emailAddress are present', async () => {
      const oppId = 'OPP-NOVAL';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 1,
        contactDetails: {
          contactNumber: '9999999999',
          countryCode: '+91', // note: countryCode (not primaryCountryCode)
        } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: { opportunityId: oppId, isCompleted: false, applicant1: {} },
      });

      await controller.updateApplicant(dto);

      expect(bookingRepositoryUpdate).toHaveBeenCalledTimes(1);
    });

    it('returns success payload echoed by the service (message + data)', async () => {
      const oppId = 'OPP-RET';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 1,
        contactDetails: { emailAddress: 'ret@example.com' } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: { opportunityId: oppId, isCompleted: false, applicant1: {} },
      });

      const result = await controller.updateApplicant(dto);

      expect(result).toEqual(
        expect.objectContaining({
          message: 'Applicant details updated successfully.',
          data: expect.objectContaining({
            applicant1: expect.any(Object),
          }),
        }),
      );
    });

    it('if booking is already completed, service returns undefined (guard prevents update)', async () => {
      const oppId = 'OPP-COMPLETED';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 1,
        contactDetails: { emailAddress: 'done@example.com' } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: {
          opportunityId: oppId,
          isCompleted: true,
          applicant1: {},
        },
      });

      await expect(controller.updateApplicant(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(bookingRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('if applicant is minor, professionalDetails are removed even if provided', async () => {
      const oppId = 'OPP-MINOR';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 1,
        hasContinuedAsMinor: true,
        professionalDetails: { employer: 'ACME' } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: { opportunityId: oppId, isCompleted: false, applicant1: {} },
      });

      await controller.updateApplicant(dto);

      const [, encryptedPayload] = bookingRepositoryUpdate.mock.calls[0];
      expect(encryptedPayload.applicant1.professionalDetails).toBeUndefined();
    });

    it('if guardian needed for applicant1 and applicant2 absent, move applicant1 → applicant2, clear applicant1', async () => {
      const oppId = 'OPP-GUARD';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 1,
        isGuardianNeeded: true,
        personalDetails: { firstName: 'Kid' } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: {
          opportunityId: oppId,
          isCompleted: false,
          applicant1: {},
          applicant2: null,
          noOfApplicants: 1,
        },
      });

      await controller.updateApplicant(dto);

      const [, encryptedPayload] = bookingRepositoryUpdate.mock.calls[0];

      // applicant1 cleared, applicant2 gets data (with encrypted personalDetails)
      expect(encryptedPayload).toEqual(
        expect.objectContaining({
          applicant1: null,
          applicant2: expect.objectContaining({
            personalDetails: expect.any(String),
          }),
          noOfApplicants: 2,
        }),
      );
    });

    it('noOfApplicants is set to max(existing, applicantNumber)', async () => {
      const oppId = 'OPP-MAX';
      const dto: BookingApplicantDto = {
        opportunityId: oppId,
        applicantNumber: 3,
        contactDetails: { emailAddress: 'x@y.com' } as any,
      } as any;

      (service.getBookingByOppId as jest.Mock).mockResolvedValueOnce({
        data: {
          opportunityId: oppId,
          isCompleted: false,
          noOfApplicants: 2,
          applicant3: {},
        },
      });

      await controller.updateApplicant(dto);

      const [, encryptedPayload] = bookingRepositoryUpdate.mock.calls[0];
      expect(encryptedPayload.noOfApplicants).toBe(3);
    });
  });

  describe('mapApplicants', () => {
    it('should call bookingsService.mapApplicants with the provided DTO', async () => {
      const dto: ApplicantMappingDto = {
        applicantId: 1,
        bookingId: 100,
      } as any;
      const mockResponse = { success: true };

      (service.mapApplicants as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.mapApplicants(dto);

      expect(service.mapApplicants).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors thrown by the service', async () => {
      const dto: ApplicantMappingDto = {
        applicantId: 2,
        bookingId: 200,
      } as any;
      (service.mapApplicants as jest.Mock).mockRejectedValue(
        new Error('Service error'),
      );

      await expect(controller.mapApplicants(dto)).rejects.toThrow(
        'Service error',
      );
    });
  });
  describe('pushApplicantData', () => {
    const dto = { oppId: 'OPP-123' };

    it('should call service with dto and return response', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Applicant data successfully pushed to SFDC',
        data: null,
      };

      service.pushApplicantData.mockResolvedValueOnce(mockResponse);

      const result = await controller.pushApplicantData(dto);

      expect(service.pushApplicantData).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException if service throws it', async () => {
      service.pushApplicantData.mockRejectedValueOnce(
        new NotFoundException('Booking not found'),
      );

      await expect(controller.pushApplicantData(dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(service.pushApplicantData).toHaveBeenCalledWith(dto);
    });

    it('should propagate generic errors', async () => {
      const error = new Error('Unexpected error');

      service.pushApplicantData.mockRejectedValueOnce(error);

      await expect(controller.pushApplicantData(dto)).rejects.toThrow(error);

      expect(service.pushApplicantData).toHaveBeenCalledWith(dto);
    });
  });

  describe('mapVoucherApplicants', () => {
    const dto: MapVoucherApplicantsDto = {
      voucherId: 'VCH-123',
      opportunityId: 'OPP-456',
      mapping: {
        applicant1: 'SFDC-001',
        applicant2: 'SFDC-002',
      },
      bookingAs: BookingAsEnum.INDIVIDUAL,
    };

    it('should call bookingsService.mapVoucherApplicants with dto and return result', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Voucher applicants mapped successfully',
        data: dto,
      };

      service.mapVoucherApplicants.mockResolvedValueOnce(mockResponse);

      const result = await controller.mapVoucherApplicants(dto);

      expect(service.mapVoucherApplicants).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException if service throws', async () => {
      service.mapVoucherApplicants.mockRejectedValueOnce(
        new NotFoundException('Voucher not found'),
      );

      await expect(controller.mapVoucherApplicants(dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(service.mapVoucherApplicants).toHaveBeenCalledWith(dto);
    });

    it('should propagate generic errors', async () => {
      const error = new Error('Unexpected error');

      service.mapVoucherApplicants.mockRejectedValueOnce(error);

      await expect(controller.mapVoucherApplicants(dto)).rejects.toThrow(error);

      expect(service.mapVoucherApplicants).toHaveBeenCalledWith(dto);
    });

    it('should complete within execution time', async () => {
      service.mapVoucherApplicants.mockResolvedValueOnce({ success: true });

      const start = Date.now();
      await controller.mapVoucherApplicants(dto);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });
});
