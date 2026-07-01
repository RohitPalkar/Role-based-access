// NOTE (PB-188): two mock DTOs in this spec gained `residentStatus: 'INDIAN'`
// to match an upstream `CreateVoucherFormDto` field addition that landed
// before this branch was cut. The SFDC webhook work in PB-188 does not
// touch `EoiManagementController` itself; this edit is purely test-drift
// maintenance surfaced when the test runner was widened to include this
// spec (see review-pointers-cycle-3.md R4). If preferred at review time,
// this one-key addition can be lifted into its own PR.
import { Test, TestingModule } from '@nestjs/testing';
import { EoiManagementController } from './eoi_management.controller';
import { EoiManagementService } from './eoi_management.service';
import { CreateVoucherFormDto } from './dto/create-voucher-form.dto';
import { UpdateVoucherDetailsDto } from './dto/update-voucher-details.dto';
import { ListVouchersFilterDto } from './dto/list-vouchers-filter.dto';
import { ListTransactionsFilterDto } from './dto/list-transactions-filter.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  EOITypeEnum,
  VoucherFormStatusEnum,
  PrimarySourceEnum,
  VoucherDeletionStatusEnum,
  VoucherChangeRequestStatus,
  VoucherChangeEnum,
  EoiLeaderboardView,
  EoiLeaderboardSortBy,
} from '../../../enums/eoi-form.enums';
import { RolesEnum } from 'src/enums/roles.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CancelEoiDto } from './dto/cancel-eoi.dto';
import { AssignClosingRmDto } from './dto/assign-closing-rm.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CheckerUpdatesDto } from './dto/checker-updates.dto';
import { RefundEOIPaymentDto } from './dto/refund-eoi-payment.dto';
import {
  PaymentMethodEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { SUCCESS, TEST_EXECUTION_TIME } from 'src/config/constants';
import { ApproveCancelRequestDTO } from './dto/approve-cancel-request.dto';
import { RmDashboardFilterDto } from './dto/rm-dashboard-filter.dto';
import { DeleteRestoreVoucherDto } from './dto/delete-restore-voucher.dto';
import { EoiLeaderboardFilterDto } from './dto/eoi-leaderboard-filter.dto';
import { GetReferredVoucherDto } from './dto/get-referred-voucher.dto';
import { InventoryWiseSplitQueryDto } from './dto/inventory-wise-split.dto';
import { DailyTrackerQueryDto } from './dto/daily-tracker-query.dto';
import { GetVoucherByEnquiryIdDto } from './dto/get-voucher-by-enquiry.dto';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { CreateVoucherChangeRequestDto } from './dto/create-source-change-request.dto';
import { GetVoucherByPridDto } from './dto/get-voucher-by-prid.dto';
import { GetVoucherChangeRequestDto } from './dto/get-source-change-request.dto';
import { ApproveVoucherChangeRequestDto } from './dto/approve-source-change-request.dto';

describe('EoiManagementController', () => {
  let controller: EoiManagementController;

  const mockService = {
    getVoucherFormById: jest.fn(),
    createVoucherForm: jest.fn(),
    updateVoucherDetails: jest.fn(),
    listVouchers: jest.fn(),
    getPrimarySourcesForDropdown: jest.fn(),
    getDashboardData: jest.fn(),
    cancelEOI: jest.fn(),
    assignClosingRm: jest.fn(),
    sendFormLink: jest.fn(),
    exportVouchers: jest.fn(),
    listTransactions: jest.fn(),
    updateTransaction: jest.fn(),
    updateBackendCheckerStatus: jest.fn(),
    refundEOIPayment: jest.fn(),
    approveCancelRequest: jest.fn(),
    exportRmDashboard: jest.fn(),
    deleteRestoreVoucher: jest.fn(),
    getEoiLeaderboard: jest.fn(),
    exportEoiLeaderboard: jest.fn(),
    getReferredVoucher: jest.fn(),
    campaignInventoryDropdown: jest.fn(),
    sendDailyDashboardReport: jest.fn(),
    getInventoryWiseSplit: jest.fn(),
    getDailyTracker: jest.fn(),
    getVoucherByEnquiryId: jest.fn(),
    getPrimarySourceProjects: jest.fn(),
    downloadEoiFormPDF: jest.fn(),
    pushVouchersToSfdc: jest.fn(),
    getEoiToConvert: jest.fn(),
    getFloorDropdown: jest.fn(),
    getInventoryByFloor: jest.fn(),
    fetchVoucherForMapping: jest.fn(),
    mapAndConvert: jest.fn(),
    revertToEOI: jest.fn(),
    createVoucherChangeRequest: jest.fn(),
    getVoucherByPrid: jest.fn(),
    getVoucherChangeRequest: jest.fn(),
    listVoucherChangeRequests: jest.fn(),
    approveVoucherChangeRequest: jest.fn(),
    getTabCounts: jest.fn(),
    updateSfdcIds: jest.fn(),
    bulkUpdateTransactions: jest.fn(),
    getBulkTransactionJobStatus: jest.fn(),
    uploadReceipt: jest.fn(),
  };

  const mockCreateVoucherFormDto: CreateVoucherFormDto = {
    firstName: 'John',
    lastName: 'Doe',
    countryCode: '+91',
    contactNumber: '9876543210',
    emailId: 'john@example.com',
    campaignId: 1,
    primarySource: PrimarySourceEnum.DIRECT_WALKIN,
    residentStatus: 'INDIAN',
  };

  const mockUpdateVoucherDetailsDto: UpdateVoucherDetailsDto = {
    eoiDetails: {
      eoiType: EOITypeEnum.STANDARD,
      eoiAmount: 100000,
      typology: 'PLOTS',
      unitType: 'Apartment',
    } as any,
    paymentDetails: {
      amount: 100000,
      transactions: [
        {
          transactionId: 'TXN123456',
          transactionDate: '2024-01-15',
          amount: 100000,
          paymentDetails: {
            method: PaymentMethodEnum.EDC_MACHINE,
            transactionNumber: 'EDC123456',
            bankName: 'HDFC Bank',
            branchName: 'Mumbai Main',
          },
        },
      ],
      lastStep: 3,
    } as any,
    residentStatus: 'INDIAN',
  };

  const mockUser = {
    dbId: 123,
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EoiManagementController],
      providers: [
        {
          provide: EoiManagementService,
          useValue: mockService,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            emitAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EoiManagementController>(EoiManagementController);

    jest.clearAllMocks();
  });

  describe('uploadReceipt', () => {
    const paymentId = 1;

    it('should upload receipt successfully', async () => {
      const dto = { receiptImage: 'receipts/test.jpg' };

      const mockResponse = {
        message: 'Receipt saved successfully',
        data: { paymentId },
      };

      mockService.uploadReceipt.mockResolvedValue(mockResponse);

      const result = await controller.uploadReceipt(paymentId, dto as any);

      expect(result).toEqual(mockResponse);
      expect(mockService.uploadReceipt).toHaveBeenCalledWith(paymentId, dto);
    });

    it('should delete receipt when null is passed', async () => {
      const dto = { receiptImage: null };

      const mockResponse = {
        message: 'Receipt deleted successfully',
        data: { paymentId },
      };

      mockService.uploadReceipt.mockResolvedValue(mockResponse);

      const result = await controller.uploadReceipt(paymentId, dto as any);

      expect(result).toEqual(mockResponse);
      expect(mockService.uploadReceipt).toHaveBeenCalledWith(paymentId, dto);
    });

    it('should throw NotFoundException when payment not found', async () => {
      const dto = { receiptImage: 'receipts/test.jpg' };

      mockService.uploadReceipt.mockRejectedValue(
        new NotFoundException('Transaction not found'),
      );

      await expect(
        controller.uploadReceipt(paymentId, dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid receipt', async () => {
      const dto = { receiptImage: '' };

      mockService.uploadReceipt.mockRejectedValue(
        new BadRequestException('Invalid receipt'),
      );

      await expect(
        controller.uploadReceipt(paymentId, dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getVoucherFormById', () => {
    it('should return voucher form when found (success + response time)', async () => {
      const mockVoucherForm = {
        id: 1,
        voucherId: 12345678,
        uniqueReferenceId: 'PHL-BR-0100',
        projectId: 1,
        applicant1: {
          personalDetails: { firstName: 'John', lastName: 'Doe' },
          contactDetails: {
            countryCode: '+91',
            contactNumber: '9876543210',
            emailAddress: 'john@example.com',
          },
        },
        voucherFormStatus: VoucherFormStatusEnum.CREATED,
        customerLastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        isUpgradableToEOI: false,
      };

      const mockResponse = {
        success: true,
        message: 'Voucher form retrieved successfully',
        data: mockVoucherForm,
      };

      mockService.getVoucherFormById.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getVoucherFormById(12345678);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.voucherId).toBe(12345678);
      expect(result.data.isUpgradableToEOI).toBe(false);
      expect(mockService.getVoucherFormById).toHaveBeenCalledWith(
        12345678,
        undefined,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return voucher form with isUpgradableToEOI flag when campaign end date has passed', async () => {
      const mockVoucherForm = {
        id: 1,
        voucherId: 12345678,
        uniqueReferenceId: 'PHL-BR-0100',
        projectId: 1,
        applicant1: {
          personalDetails: { firstName: 'John', lastName: 'Doe' },
          contactDetails: {
            countryCode: '+91',
            contactNumber: '9876543210',
            emailAddress: 'john@example.com',
          },
        },
        voucherFormStatus: VoucherFormStatusEnum.CREATED,
        customerLastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
        createdAt: new Date('2024-01-10T09:00:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        isUpgradableToEOI: true,
      };

      const mockResponse = {
        success: true,
        message: 'Voucher form retrieved successfully',
        data: mockVoucherForm,
      };

      mockService.getVoucherFormById.mockResolvedValue(mockResponse);

      const result = await controller.getVoucherFormById(12345678);

      expect(result.success).toBe(true);
      expect(result.data.isUpgradableToEOI).toBe(true);
      expect(result.data.customerLastUpdatedAt).toBeInstanceOf(Date);
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.updatedAt).toBeInstanceOf(Date);
      expect(mockService.getVoucherFormById).toHaveBeenCalledWith(
        12345678,
        undefined,
      );
    });

    it('should throw NotFoundException when voucher form not found (failure + response time)', async () => {
      mockService.getVoucherFormById.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      const start = Date.now();
      await expect(controller.getVoucherFormById(99999999)).rejects.toThrow(
        NotFoundException,
      );
      const duration = Date.now() - start;

      expect(mockService.getVoucherFormById).toHaveBeenCalledWith(
        99999999,
        undefined,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.getVoucherFormById.mockRejectedValue(dbError);

      await expect(controller.getVoucherFormById(12345678)).rejects.toThrow(
        dbError,
      );
      expect(mockService.getVoucherFormById).toHaveBeenCalledWith(
        12345678,
        undefined,
      );
    });

    it('should handle empty voucher ID', async () => {
      mockService.getVoucherFormById.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.getVoucherFormById(Number.NaN)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockService.getVoucherFormById).toHaveBeenCalledWith(
        Number.NaN,
        undefined,
      );
    });

    it('should handle special characters in voucher ID', async () => {
      const specialVoucherId = 987654321;
      mockService.getVoucherFormById.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.getVoucherFormById(specialVoucherId),
      ).rejects.toThrow(NotFoundException);
      expect(mockService.getVoucherFormById).toHaveBeenCalledWith(
        specialVoucherId,
        undefined,
      );
    });
  });

  describe('createVoucherForm', () => {
    it('should create voucher form successfully (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher form created successfully',
        data: {
          voucherFormUrl: 'http://localhost:3000/voucher-form/VID-12345678',
          voucherForm: {
            id: 1,
            voucherId: 12345678,
            uniqueReferenceId: 'PHL-BR-0001',
            campaignId: 1,
            campaignName: 'Project Alpha',
            voucherFormStatus: VoucherFormStatusEnum.CREATED,
            createdBy: 123,
          },
        },
      };

      mockService.createVoucherForm.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.createVoucherForm(
        mockCreateVoucherFormDto,
        mockUser,
      );
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.voucherFormUrl).toContain('voucher-form');
      expect(result.data.voucherForm.campaignName).toBe('Project Alpha');
      expect(mockService.createVoucherForm).toHaveBeenCalledWith(
        mockCreateVoucherFormDto,
        mockUser,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw NotFoundException when project not found (failure + response time)', async () => {
      mockService.createVoucherForm.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      const start = Date.now();
      await expect(
        controller.createVoucherForm(mockCreateVoucherFormDto, mockUser),
      ).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;

      expect(mockService.createVoucherForm).toHaveBeenCalledWith(
        mockCreateVoucherFormDto,
        mockUser,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle validation errors', async () => {
      const validationError = new BadRequestException('Invalid input data');
      mockService.createVoucherForm.mockRejectedValue(validationError);

      await expect(
        controller.createVoucherForm(mockCreateVoucherFormDto, mockUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.createVoucherForm).toHaveBeenCalledWith(
        mockCreateVoucherFormDto,
        mockUser,
      );
    });

    it('should handle database transaction errors', async () => {
      const transactionError = new Error('Database transaction failed');
      mockService.createVoucherForm.mockRejectedValue(transactionError);

      await expect(
        controller.createVoucherForm(mockCreateVoucherFormDto, mockUser),
      ).rejects.toThrow(transactionError);
      expect(mockService.createVoucherForm).toHaveBeenCalledWith(
        mockCreateVoucherFormDto,
        mockUser,
      );
    });

    it('should handle different user objects', async () => {
      const differentUser = { dbId: 456, name: 'Another User' };
      const mockResponse = {
        success: true,
        message: 'Voucher form created successfully',
      };
      mockService.createVoucherForm.mockResolvedValue(mockResponse);

      const result = await controller.createVoucherForm(
        mockCreateVoucherFormDto,
        differentUser,
      );

      expect(result.success).toBe(true);
      expect(mockService.createVoucherForm).toHaveBeenCalledWith(
        mockCreateVoucherFormDto,
        differentUser,
      );
    });

    it('should handle missing user dbId', async () => {
      const userWithoutDbId = { name: 'User without dbId' } as any;
      const mockResponse = {
        success: true,
        message: 'Voucher form created successfully',
      };
      mockService.createVoucherForm.mockResolvedValue(mockResponse);

      const result = await controller.createVoucherForm(
        mockCreateVoucherFormDto,
        userWithoutDbId,
      );

      expect(result.success).toBe(true);
      expect(mockService.createVoucherForm).toHaveBeenCalledWith(
        mockCreateVoucherFormDto,
        userWithoutDbId,
      );
    });
  });

  describe('updateVoucherDetails', () => {
    it('should update voucher details successfully (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher details updated successfully',
        data: {
          id: 1,
          voucherId: 12345678,
          uniqueReferenceId: 'PHL-BR-0100',
          projectId: 1,
          unitDetails: {
            primarySource: 'Direct',
            eoiType: EOITypeEnum.STANDARD,
            eoiAmount: 100000,
            typology: 'PLOTS',
            type: 'Apartment',
          },
          voucherFormStatus: VoucherFormStatusEnum.CREATED,
        },
      };

      mockService.updateVoucherDetails.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.updateVoucherDetails(
        12345678,
        mockUpdateVoucherDetailsDto,
      );
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.voucherId).toBe(12345678);
      expect(mockService.updateVoucherDetails).toHaveBeenCalledWith(
        12345678,
        mockUpdateVoucherDetailsDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw NotFoundException when voucher form not found (failure + response time)', async () => {
      mockService.updateVoucherDetails.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      const start = Date.now();
      await expect(
        controller.updateVoucherDetails(99999999, mockUpdateVoucherDetailsDto),
      ).rejects.toThrow(NotFoundException);
      const duration = Date.now() - start;

      expect(mockService.updateVoucherDetails).toHaveBeenCalledWith(
        99999999,
        mockUpdateVoucherDetailsDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle validation errors', async () => {
      const validationError = new BadRequestException('Invalid update data');
      mockService.updateVoucherDetails.mockRejectedValue(validationError);

      await expect(
        controller.updateVoucherDetails(12345678, mockUpdateVoucherDetailsDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.updateVoucherDetails).toHaveBeenCalledWith(
        12345678,
        mockUpdateVoucherDetailsDto,
      );
    });

    it('should handle database save errors', async () => {
      const saveError = new Error('Database save failed');
      mockService.updateVoucherDetails.mockRejectedValue(saveError);

      await expect(
        controller.updateVoucherDetails(12345678, mockUpdateVoucherDetailsDto),
      ).rejects.toThrow(saveError);
      expect(mockService.updateVoucherDetails).toHaveBeenCalledWith(
        12345678,
        mockUpdateVoucherDetailsDto,
      );
    });

    it('should handle different EOI types', async () => {
      const preferentialDto = {
        ...mockUpdateVoucherDetailsDto,
        eoiType: EOITypeEnum.PREFERENTIAL,
      };

      const mockResponse = {
        success: true,
        message: 'Voucher details updated successfully',
      };
      mockService.updateVoucherDetails.mockResolvedValue(mockResponse);

      const result = await controller.updateVoucherDetails(
        12345678,
        preferentialDto,
      );

      expect(result.success).toBe(true);
      expect(mockService.updateVoucherDetails).toHaveBeenCalledWith(
        12345678,
        preferentialDto,
      );
    });

    it('should handle different typology types', async () => {
      const threeBhkDto = {
        ...mockUpdateVoucherDetailsDto,
        typology: 'ONE_BHK',
      };

      const mockResponse = {
        success: true,
        message: 'Voucher details updated successfully',
      };
      mockService.updateVoucherDetails.mockResolvedValue(mockResponse);

      const result = await controller.updateVoucherDetails(
        12345678,
        threeBhkDto,
      );

      expect(result.success).toBe(true);
      expect(mockService.updateVoucherDetails).toHaveBeenCalledWith(
        12345678,
        threeBhkDto,
      );
    });
  });

  describe('listVouchers', () => {
    it('should return list of vouchers successfully (success + response time)', async () => {
      const mockVouchers = [
        {
          id: 1,
          voucherId: 12345678,
          uniqueReferenceId: 'PHL-BR-0100',
          campaignId: 1,
          voucherFormStatus: VoucherFormStatusEnum.CREATED,
          customerLastUpdatedAt: new Date('2025-01-15T10:30:00Z'),
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15'),
        },
        {
          id: 2,
          voucherId: 87654321,
          uniqueReferenceId: 'PHL-BR-0101',
          campaignId: 1,
          voucherFormStatus: VoucherFormStatusEnum.IN_PROGRESS,
          customerLastUpdatedAt: new Date('2025-01-14T09:15:00Z'),
          createdAt: new Date('2025-01-14'),
          updatedAt: new Date('2025-01-14'),
        },
      ];

      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: mockVouchers,
          page: 1,
          total: 2,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(2);
      expect(result.data.result[0].voucherId).toBe(12345678);
      expect(result.data.result[1].voucherId).toBe(87654321);
      expect(mockService.listVouchers).toHaveBeenCalledWith(
        mockUser,
        {} as ListVouchersFilterDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return empty array when no vouchers exist', async () => {
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [],
          page: 1,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(0);
      expect(mockService.listVouchers).toHaveBeenCalledWith(
        mockUser,
        {} as ListVouchersFilterDto,
      );
    });

    it('should handle database query errors', async () => {
      const queryError = new Error('Database query failed');
      mockService.listVouchers.mockRejectedValue(queryError);

      await expect(
        controller.listVouchers(mockUser, {} as ListVouchersFilterDto),
      ).rejects.toThrow(queryError);
      expect(mockService.listVouchers).toHaveBeenCalledWith(
        mockUser,
        {} as ListVouchersFilterDto,
      );
    });

    it('should maintain correct order of vouchers', async () => {
      const mockVouchers = [
        {
          id: 1,
          voucherId: 12345678,
          uniqueReferenceId: 'PHL-BR-0100',
          customerLastUpdatedAt: new Date('2025-01-15T10:30:00Z'),
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15'),
        },
        {
          id: 2,
          voucherId: 87654321,
          uniqueReferenceId: 'PHL-BR-0101',
          customerLastUpdatedAt: new Date('2025-01-14T09:15:00Z'),
          createdAt: new Date('2025-01-14'),
          updatedAt: new Date('2025-01-14'),
        },
      ];

      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: mockVouchers,
          total: 2,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result.data.result).toHaveLength(2);
      expect(result.data.result[0].id).toBe(1); // First in array (most recent)
      expect(result.data.result[1].id).toBe(2); // Second in array (older)

      // Verify new fields are included
      expect(result.data.result[0].customerLastUpdatedAt).toBeInstanceOf(Date);
      expect(result.data.result[0].createdAt).toBeInstanceOf(Date);
      expect(result.data.result[0].updatedAt).toBeInstanceOf(Date);
      expect(result.data.result[1].customerLastUpdatedAt).toBeInstanceOf(Date);
      expect(result.data.result[1].createdAt).toBeInstanceOf(Date);
      expect(result.data.result[1].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      mockService.getVoucherFormById.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.getVoucherFormById(null as any)).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        controller.getVoucherFormById(undefined as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle very large numeric voucher IDs', async () => {
      const longVoucherId = Number.MAX_SAFE_INTEGER;
      mockService.getVoucherFormById.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.getVoucherFormById(longVoucherId),
      ).rejects.toThrow(NotFoundException);
      expect(mockService.getVoucherFormById).toHaveBeenCalledWith(
        longVoucherId,
        undefined,
      );
    });

    it('should handle malformed DTOs', async () => {
      const malformedDto = {
        firstName: '', // Empty string
        lastName: null, // Null value
        campaignId: 'invalid', // String instead of number
        emailId: 'invalid-email', // Invalid email format
      } as any;

      mockService.createVoucherForm.mockRejectedValue(
        new BadRequestException('Invalid input data'),
      );

      await expect(
        controller.createVoucherForm(malformedDto, mockUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.createVoucherForm).toHaveBeenCalledWith(
        malformedDto,
        mockUser,
      );
    });

    it('should handle service returning unexpected data structure', async () => {
      const unexpectedResponse = {
        unexpectedField: 'unexpected value',
        data: null,
      };

      mockService.getVoucherFormById.mockResolvedValue(unexpectedResponse);

      const result = await controller.getVoucherFormById(12345678);

      expect(result).toEqual(unexpectedResponse);
      expect(mockService.getVoucherFormById).toHaveBeenCalledWith(
        12345678,
        undefined,
      );
    });
  });

  describe('getTabCounts', () => {
    it('should return tab counts from service', async () => {
      const result = { total: 5, completed: 3, pending: 2 };
      mockService.getTabCounts.mockResolvedValue(result);

      const response = await controller.getTabCounts(mockUser);

      expect(response).toEqual(result);
      expect(mockService.getTabCounts).toHaveBeenCalledWith(mockUser);
    });

    it('should throw when service fails', async () => {
      const error = new Error('failed');
      mockService.getTabCounts.mockRejectedValue(error);

      await expect(controller.getTabCounts(mockUser)).rejects.toThrow(error);
      expect(mockService.getTabCounts).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('updateSfdcIds', () => {
    it('should update SFDC IDs and return service response', async () => {
      const dto = { sfdcIds: [1, 2, 3] } as any;
      const result = { success: true };
      mockService.updateSfdcIds.mockResolvedValue(result);

      const response = await controller.updateSfdcIds(mockUser, dto);

      expect(response).toEqual(result);
      expect(mockService.updateSfdcIds).toHaveBeenCalledWith(mockUser, dto);
    });

    it('should propagate errors from service', async () => {
      const dto = { sfdcIds: [1, 2, 3] } as any;
      const error = new Error('update failed');
      mockService.updateSfdcIds.mockRejectedValue(error);

      await expect(controller.updateSfdcIds(mockUser, dto)).rejects.toThrow(
        error,
      );
      expect(mockService.updateSfdcIds).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle complete workflow: create -> update -> delete', async () => {
      // Create voucher
      const createResponse = {
        success: true,
        message: 'Voucher form created successfully',
        data: { voucherId: 12345678, uniqueReferenceId: 'PHL-BR-0001' },
      };
      mockService.createVoucherForm.mockResolvedValue(createResponse);

      const createResult = await controller.createVoucherForm(
        mockCreateVoucherFormDto,
        mockUser,
      );
      expect(createResult.success).toBe(true);

      // Update voucher
      const updateResponse = {
        success: true,
        message: 'Voucher details updated successfully',
        data: { voucherId: 12345678 },
      };
      mockService.updateVoucherDetails.mockResolvedValue(updateResponse);

      const updateResult = await controller.updateVoucherDetails(
        12345678,
        mockUpdateVoucherDetailsDto,
      );
      expect(updateResult.success).toBe(true);

      // Verify all service methods were called
      expect(mockService.createVoucherForm).toHaveBeenCalledWith(
        mockCreateVoucherFormDto,
        mockUser,
      );
      expect(mockService.updateVoucherDetails).toHaveBeenCalledWith(
        12345678,
        mockUpdateVoucherDetailsDto,
      );
    });

    it('should handle concurrent requests gracefully', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher form retrieved successfully',
      };
      mockService.getVoucherFormById.mockResolvedValue(mockResponse);

      // Simulate concurrent requests
      const promises = [
        controller.getVoucherFormById(12345678),
        controller.getVoucherFormById(87654321),
        controller.getVoucherFormById(11111111),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      expect(mockService.getVoucherFormById).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // First call succeeds
      const successResponse = { success: true, message: 'Success' };
      mockService.getVoucherFormById.mockResolvedValueOnce(successResponse);

      // Second call fails
      const error = new NotFoundException('Not found');
      mockService.getVoucherFormById.mockRejectedValueOnce(error);

      // Third call succeeds again
      mockService.getVoucherFormById.mockResolvedValueOnce(successResponse);

      // Execute calls
      const result1 = await controller.getVoucherFormById(12345678);
      expect(result1.success).toBe(true);

      await expect(controller.getVoucherFormById(99999999)).rejects.toThrow(
        NotFoundException,
      );

      const result3 = await controller.getVoucherFormById(11111111);
      expect(result3.success).toBe(true);

      expect(mockService.getVoucherFormById).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance and Response Time Tests', () => {
    it('should complete all operations within acceptable time limits', async () => {
      const mockUser = { id: 1, name: 'Test Admin', role: 'ADMIN' };
      const mockResponse = { success: true, message: 'Operation completed' };

      mockService.getVoucherFormById.mockResolvedValue(mockResponse);
      mockService.createVoucherForm.mockResolvedValue(mockResponse);
      mockService.updateVoucherDetails.mockResolvedValue(mockResponse);
      mockService.listVouchers.mockResolvedValue(mockResponse);

      const start = Date.now();

      // Execute all operations
      await controller.getVoucherFormById(12345678);
      await controller.createVoucherForm(mockCreateVoucherFormDto, mockUser);
      await controller.updateVoucherDetails(
        12345678,
        mockUpdateVoucherDetailsDto,
      );

      await controller.listVouchers(mockUser, {} as ListVouchersFilterDto);

      const duration = Date.now() - start;

      // All operations should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle rapid successive calls', async () => {
      const mockResponse = { success: true, message: 'Success' };
      mockService.getVoucherFormById.mockResolvedValue(mockResponse);

      const start = Date.now();

      // Make 10 rapid successive calls
      const promises = Array.from({ length: 10 }, (_, i) =>
        controller.getVoucherFormById(i),
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('getPrimarySourcesForDropdown', () => {
    it('should return primary sources dropdown list successfully (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message: 'Primary sources retrieved successfully',
        data: [
          { value: 'DIRECT_WALKIN', label: 'Direct Walk-in' },
          { value: 'REFERRAL', label: 'Referral' },
          { value: 'DIGITAL_MARKETING', label: 'Digital Marketing' },
          { value: 'CHANNEL_PARTNER', label: 'Channel Partner' },
        ],
      };

      mockService.getPrimarySourcesForDropdown.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getPrimarySourcesForDropdown();
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
      expect(result.data[0].value).toBe('DIRECT_WALKIN');
      expect(result.data[0].label).toBe('Direct Walk-in');
      expect(mockService.getPrimarySourcesForDropdown).toHaveBeenCalled();
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return empty array when no primary sources exist', async () => {
      const mockResponse = {
        success: true,
        message: 'Primary sources retrieved successfully',
        data: [],
      };

      mockService.getPrimarySourcesForDropdown.mockResolvedValue(mockResponse);

      const result = await controller.getPrimarySourcesForDropdown();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(mockService.getPrimarySourcesForDropdown).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.getPrimarySourcesForDropdown.mockRejectedValue(dbError);

      await expect(controller.getPrimarySourcesForDropdown()).rejects.toThrow(
        dbError,
      );
      expect(mockService.getPrimarySourcesForDropdown).toHaveBeenCalled();
    });

    it('should handle internal server errors', async () => {
      const internalError = new Error('Failed to fetch primary sources');
      mockService.getPrimarySourcesForDropdown.mockRejectedValue(internalError);

      await expect(controller.getPrimarySourcesForDropdown()).rejects.toThrow(
        internalError,
      );
      expect(mockService.getPrimarySourcesForDropdown).toHaveBeenCalled();
    });
  });

  describe('getDashboard', () => {
    const mockUser: any = { dbId: 123456, role: 'RM' };

    const mockDto: RmDashboardFilterDto = {
      view: 'cards',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      page: 1,
      limit: 10,
      // add more fields only if required: viewBy, unitType, sortBy, campaignId...
    } as any;

    it('should return dashboard data successfully (success + response time)', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Dashboard data fetched successfully',
        data: {
          page: 1,
          limit: 10,
          totalCount: 2,
          campaigns: [],
          cards: {
            totalCompaigns: 1,
            vouchersCollected: 10,
            totalAmountPayable: 15.5,
            amountCollected: 12.35,
            amountRefunded: 0,
            unitsRefunded: 0,
          },
          sourceWise: [{ source: 'Direct Walkin', count: 5 }],
          unitWise: [{ typology: '2BHK', count: 3 }],
          topCps: [{ cpLinkId: '123', cpName: 'CP Alpha', count: 4 }],
        },
      };

      mockService.getDashboardData = jest.fn().mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getDashboard(mockUser, mockDto);
      const duration = Date.now() - start;

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toBe('Dashboard data fetched successfully');
      expect(result.data.cards.vouchersCollected).toBe(10);
      expect(result.data.cards.amountCollected).toBeCloseTo(12.35, 2);
      expect(result.data.topCps[0].cpName).toBe('CP Alpha');
      expect(mockService.getDashboardData).toHaveBeenCalledWith(
        mockDto,
        mockUser,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle errors thrown by service', async () => {
      const error = new Error('Failed to fetch dashboard data');
      mockService.getDashboardData = jest.fn().mockRejectedValue(error);

      await expect(controller.getDashboard(mockUser, mockDto)).rejects.toThrow(
        error,
      );

      expect(mockService.getDashboardData).toHaveBeenCalledWith(
        mockDto,
        mockUser,
      );
    });

    it('should handle empty dashboard data gracefully', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Dashboard data fetched successfully',
        data: {
          page: 1,
          limit: 10,
          totalCount: 0,
          campaigns: [],
          cards: {
            totalCompaigns: 0,
            vouchersCollected: 0,
            totalAmountPayable: 0,
            amountCollected: 0,
            amountRefunded: 0,
            unitsRefunded: 0,
          },
          sourceWise: [],
          unitWise: [],
          topCps: [],
        },
      };

      mockService.getDashboardData = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getDashboard(mockUser, mockDto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.cards.vouchersCollected).toBe(0);
      expect(result.data.topCps).toHaveLength(0);
      expect(mockService.getDashboardData).toHaveBeenCalledWith(
        mockDto,
        mockUser,
      );
    });
  });

  // CANCEL EOI
  describe('cancelEOI', () => {
    const mockUser = { id: 1, name: 'Test User' };
    const cancelEoiDto: CancelEoiDto = {
      voucherId: 1,
      remarks: 'Cancellation reason with more than 10 chars',
    };

    it('should cancel voucher successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher form cancelled successfully',
      };

      mockService.cancelEOI.mockResolvedValue(mockResponse);

      const result = await controller.cancelEOI(mockUser, cancelEoiDto);

      expect(result).toEqual(mockResponse);
      expect(mockService.cancelEOI).toHaveBeenCalledWith(
        mockUser,
        cancelEoiDto,
      );
    });

    it('should throw NotFoundException if voucher not found', async () => {
      mockService.cancelEOI.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.cancelEOI(mockUser, cancelEoiDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockService.cancelEOI).toHaveBeenCalledWith(
        mockUser,
        cancelEoiDto,
      );
    });

    it('should handle internal errors gracefully', async () => {
      const error = new Error('DB error');
      mockService.cancelEOI.mockRejectedValue(error);

      await expect(
        controller.cancelEOI(mockUser, cancelEoiDto),
      ).rejects.toThrow(error);
      expect(mockService.cancelEOI).toHaveBeenCalledWith(
        mockUser,
        cancelEoiDto,
      );
    });

    it('should respond within 500ms (performance test)', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher form cancelled successfully',
      };

      mockService.cancelEOI.mockResolvedValue(mockResponse);

      const start = Date.now();
      await controller.cancelEOI(mockUser, cancelEoiDto);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('deleteRestoreVoucher', () => {
    const adminUser = { id: 1, role: RolesEnum.ADMIN };
    const dto: DeleteRestoreVoucherDto = {
      voucherId: 10,
      action: VoucherDeletionStatusEnum.DELETE,
      remarks: 'Duplicate entry cleanup',
    };

    it('should update deletion status successfully', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher deleted successfully',
        data: { id: 10, isDeleted: true },
      };

      mockService.deleteRestoreVoucher.mockResolvedValue(mockResponse);

      const result = await controller.deleteRestoreVoucher(adminUser, dto);

      expect(result).toEqual(mockResponse);
      expect(mockService.deleteRestoreVoucher).toHaveBeenCalledWith(
        adminUser,
        dto,
      );
    });

    it('should propagate errors from the service', async () => {
      const error = new BadRequestException('Voucher cannot be deleted');
      mockService.deleteRestoreVoucher.mockRejectedValue(error);

      await expect(
        controller.deleteRestoreVoucher(adminUser, dto),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.deleteRestoreVoucher).toHaveBeenCalledWith(
        adminUser,
        dto,
      );
    });
  });

  describe('assignClosingRm', () => {
    const mockAssignClosingRmDto: AssignClosingRmDto = {
      id: 1,
      closingRmId: 123,
      sourcingRmId: 123,
    };

    it('should assign closing RM successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Closing RM assigned successfully',
        data: {
          voucherId: 'VOUCHER123',
          closingRmId: 123,
          closingRmName: 'John Doe',
          campaignName: 'Test Campaign',
        },
      };

      mockService.assignClosingRm.mockResolvedValue(mockResponse);

      const result = await controller.assignClosingRm(mockAssignClosingRmDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Closing RM assigned successfully');
      expect(result.data.closingRmId).toBe(123);
      expect(result.data.closingRmName).toBe('John Doe');
      expect(mockService.assignClosingRm).toHaveBeenCalledWith(
        mockAssignClosingRmDto,
      );
    });

    it('should throw NotFoundException when voucher form not found', async () => {
      mockService.assignClosingRm.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(
        controller.assignClosingRm(mockAssignClosingRmDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockService.assignClosingRm).toHaveBeenCalledWith(
        mockAssignClosingRmDto,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockService.assignClosingRm.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.assignClosingRm(mockAssignClosingRmDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockService.assignClosingRm).toHaveBeenCalledWith(
        mockAssignClosingRmDto,
      );
    });

    it('should throw BadRequestException when user does not have RM role', async () => {
      mockService.assignClosingRm.mockRejectedValue(
        new BadRequestException(
          'User must have RM role to be assigned as closing RM',
        ),
      );

      await expect(
        controller.assignClosingRm(mockAssignClosingRmDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.assignClosingRm).toHaveBeenCalledWith(
        mockAssignClosingRmDto,
      );
    });

    it('should respond within 500ms (performance test)', async () => {
      const mockResponse = {
        success: true,
        message: 'Closing RM assigned successfully',
        data: {
          voucherId: 'VOUCHER123',
          closingRmId: 123,
          closingRmName: 'John Doe',
          campaignName: 'Test Campaign',
        },
      };

      mockService.assignClosingRm.mockResolvedValue(mockResponse);

      const start = Date.now();
      await controller.assignClosingRm(mockAssignClosingRmDto);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('sendFormLink', () => {
    it('should send form link successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher form email sent successfully',
        data: {
          voucherId: 'VOUCHER123',
          customerEmail: 'customer@example.com',
          customerName: 'John Doe',
          campaignName: 'Test Campaign',
        },
      };

      mockService.sendFormLink.mockResolvedValue(mockResponse);

      const result = await controller.sendFormEmail(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Voucher form email sent successfully');
      expect(result.data.customerEmail).toBe('customer@example.com');
      expect(mockService.sendFormLink).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when voucher form not found', async () => {
      mockService.sendFormLink.mockRejectedValue(
        new NotFoundException('Voucher form not found'),
      );

      await expect(controller.sendFormEmail(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockService.sendFormLink).toHaveBeenCalledWith(999);
    });

    it('should throw BadRequestException when customer email not found', async () => {
      mockService.sendFormLink.mockRejectedValue(
        new BadRequestException('Customer email not found in voucher form'),
      );

      await expect(controller.sendFormEmail(1)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.sendFormLink).toHaveBeenCalledWith(1);
    });

    it('should respond within 500ms (performance test)', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher form email sent successfully',
        data: {
          voucherId: 'VOUCHER123',
          customerEmail: 'customer@example.com',
          customerName: 'John Doe',
          campaignName: 'Test Campaign',
        },
      };

      mockService.sendFormLink.mockResolvedValue(mockResponse);

      const start = Date.now();
      await controller.sendFormEmail(1);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });
  });

  describe('exportVouchers', () => {
    const mockUser = { id: 123, name: 'Admin User', role: 'ADMIN' };

    it('should export vouchers successfully with filters', async () => {
      const filterDto = {
        campaignId: 1,
        primarySource: PrimarySourceEnum.DIRECT_WALKIN,
        page: 1,
        limit: 10,
      } as ListVouchersFilterDto;

      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.exportVouchers(mockUser, filterDto);
      const duration = Date.now() - start;

      expect(result.message).toBe('Vouchers exported successfully');
      expect(result.data.filePath).toContain(
        'exports/eoi-management/vouchers/',
      );
      expect(result.data.filePath).toContain('.xlsx');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );

      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should export vouchers successfully without filters', async () => {
      const filterDto = {} as ListVouchersFilterDto;
      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(mockUser, filterDto);

      expect(result.message).toBe('Vouchers exported successfully');
      expect(result.data.filePath).toContain('.xlsx');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should handle empty voucher list gracefully', async () => {
      const filterDto = {
        campaignId: 999,
        page: 1,
        limit: 10,
      } as ListVouchersFilterDto;

      const mockResponse = {
        message: 'No vouchers found to export',
        data: [],
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(mockUser, filterDto);

      expect(result.message).toBe('No vouchers found to export');
      expect(result.data).toEqual([]);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should handle export with date range filters', async () => {
      const filterDto = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        campaignId: 1,
        page: 1,
        limit: 10,
      } as ListVouchersFilterDto;

      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(mockUser, filterDto);

      expect(result.message).toBe('Vouchers exported successfully');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should handle export with search filters', async () => {
      const filterDto = {
        search: 'John Doe',
        primarySource: PrimarySourceEnum.WORD_OF_MOUTH,
        formStatus: [VoucherFormStatusEnum.UNVERIFIED],
        page: 1,
        limit: 10,
      } as ListVouchersFilterDto;

      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(mockUser, filterDto);

      expect(result.message).toBe('Vouchers exported successfully');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should handle export errors gracefully', async () => {
      const filterDto = {
        campaignId: 1,
        page: 1,
        limit: 10,
      } as ListVouchersFilterDto;

      const error = new Error('Export failed');
      mockService.exportVouchers.mockRejectedValue(error);

      await expect(
        controller.exportVouchers(mockUser, filterDto),
      ).rejects.toThrow(error);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should handle AWS S3 upload errors', async () => {
      const filterDto = { campaignId: 1 } as ListVouchersFilterDto;
      const s3Error = new Error('S3 upload failed');

      mockService.exportVouchers.mockRejectedValue(s3Error);

      await expect(
        controller.exportVouchers(mockUser, filterDto),
      ).rejects.toThrow(s3Error);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should handle Excel generation errors', async () => {
      const filterDto = { campaignId: 1 } as ListVouchersFilterDto;
      const excelError = new Error('Excel generation failed');

      mockService.exportVouchers.mockRejectedValue(excelError);

      await expect(
        controller.exportVouchers(mockUser, filterDto),
      ).rejects.toThrow(excelError);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should respond within acceptable time limits', async () => {
      const filterDto = { campaignId: 1, page: 1, limit: 10 };
      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const start = Date.now();
      await controller.exportVouchers(mockUser, filterDto);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME); // Export should complete within 2 seconds
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should handle large dataset exports', async () => {
      const filterDto = { campaignId: 1, page: 1, limit: 10000 };
      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(mockUser, filterDto);

      expect(result.message).toBe('Vouchers exported successfully');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        filterDto,
      );
    });

    it('should handle malformed filter DTOs', async () => {
      const malformedFilterDto = {
        campaignId: 'invalid',
        startDate: 'invalid-date',
        endDate: null,
        page: -1,
        limit: 0,
      } as any;

      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(
        mockUser,
        malformedFilterDto,
      );

      expect(result.message).toBe('Vouchers exported successfully');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        malformedFilterDto,
      );
    });

    it('should handle query parameters correctly for GET endpoint', async () => {
      const queryParams = {
        campaignId: '1',
        primarySource: 'DIRECT_WALKIN',
        search: 'John Doe',
        page: '1',
        limit: '10',
      };

      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      // Simulate how the controller would receive query parameters
      const result = await controller.exportVouchers(
        mockUser,
        queryParams as any,
      );

      expect(result.message).toBe('Vouchers exported successfully');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        queryParams,
      );
    });

    it('should handle empty query parameters', async () => {
      const emptyQueryParams = {};
      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(
        mockUser,
        emptyQueryParams as any,
      );

      expect(result.message).toBe('Vouchers exported successfully');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        emptyQueryParams,
      );
    });

    it('should handle special characters in query parameters', async () => {
      const queryParams = {
        search: 'John & Jane Doe',
        primarySource: 'WORD_OF_MOUTH',
        campaignId: '1',
      };

      const mockResponse = {
        message: 'Vouchers exported successfully',
        data: {
          filePath:
            'exports/eoi-management/vouchers/vouchers-20250115-123456.xlsx',
        },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(
        mockUser,
        queryParams as any,
      );

      expect(result.message).toBe('Vouchers exported successfully');
      expect(mockService.exportVouchers).toHaveBeenCalledWith(
        mockUser,
        queryParams,
      );
    });
  });

  describe('listTransactions', () => {
    it('should return list of transactions successfully', async () => {
      const mockTransactions = [
        {
          srNo: 'T1',
          id: 1,
          paidAmount: 50000,
          paymentMode: 'GATEWAY',
          date: new Date('2025-01-15T10:30:00Z'),
          status: PaymentTxStatusEnum.VERIFIED,
          transactionId: 'txn_123456',
          realisationDate: new Date('2025-01-16T09:00:00Z'),
          comments: 'Payment processed successfully',
          receiptNo: '12345',
          createdAt: new Date('2025-01-15T10:30:00Z'),
          updatedAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          srNo: 'T2',
          id: 2,
          paidAmount: 25000,
          paymentMode: 'OFFLINE',
          date: new Date('2025-01-14T09:15:00Z'),
          status: PaymentTxStatusEnum.UNVERIFIED,
          transactionId: null,
          realisationDate: null,
          comments: null,
          receiptNo: null,
          createdAt: new Date('2025-01-14T09:15:00Z'),
          updatedAt: new Date('2025-01-14T09:15:00Z'),
        },
      ];

      const mockResponse = {
        success: true,
        message: 'Transactions retrieved successfully',
        data: {
          referenceId: 'PHL-BR-0100',
          result: mockTransactions,
          total: 2,
          currentPage: 1,
          pageSize: 10,
          totalPages: 1,
        },
      };

      const filterDto: ListTransactionsFilterDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
      };

      mockService.listTransactions.mockResolvedValue(mockResponse);

      const result = await controller.listTransactions(123, filterDto);

      expect(result).toEqual(mockResponse);
      expect(mockService.listTransactions).toHaveBeenCalledWith(123, filterDto);
    });

    it('should handle empty transactions list', async () => {
      const mockResponse = {
        success: true,
        message: 'Transactions retrieved successfully',
        data: {
          referenceId: 'PHL-BR-0100',
          result: [],
          total: 0,
          currentPage: 1,
          pageSize: 10,
          totalPages: 0,
        },
      };

      const filterDto: ListTransactionsFilterDto = {
        page: 1,
        limit: 10,
      };

      mockService.listTransactions.mockResolvedValue(mockResponse);

      const result = await controller.listTransactions(123, filterDto);

      expect(result).toEqual(mockResponse);
      expect(mockService.listTransactions).toHaveBeenCalledWith(123, filterDto);
    });

    it('should handle voucher not found error', async () => {
      const error = new NotFoundException('Voucher not found');
      mockService.listTransactions.mockRejectedValue(error);

      await expect(controller.listTransactions(999, {})).rejects.toThrow(
        NotFoundException,
      );
      expect(mockService.listTransactions).toHaveBeenCalledWith(999, {});
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        success: true,
        message: 'Transactions retrieved successfully',
        data: {
          referenceId: 'PHL-BR-0100',
          result: [],
          total: 25,
          currentPage: 2,
          pageSize: 5,
          totalPages: 5,
        },
      };

      const filterDto: ListTransactionsFilterDto = {
        page: 2,
        limit: 5,
        sortBy: 'date',
      };

      mockService.listTransactions.mockResolvedValue(mockResponse);

      const result = await controller.listTransactions(123, filterDto);

      expect(result).toEqual(mockResponse);
      expect(mockService.listTransactions).toHaveBeenCalledWith(123, filterDto);
    });

    it('should handle search by transactionId', async () => {
      const mockTransactions = [
        {
          srNo: 'T1',
          id: 1,
          paidAmount: 50000,
          paymentMode: 'GATEWAY',
          date: new Date('2025-01-15T10:30:00Z'),
          status: PaymentTxStatusEnum.VERIFIED,
          transactionId: 'txn_123456',
          realisationDate: new Date('2025-01-16T09:00:00Z'),
          comments: 'Payment processed successfully',
          receiptNo: '12345',
          createdAt: new Date('2025-01-15T10:30:00Z'),
          updatedAt: new Date('2025-01-15T10:30:00Z'),
        },
      ];

      const mockResponse = {
        success: true,
        message: 'Transactions retrieved successfully',
        data: {
          referenceId: 'PHL-BR-0100',
          result: mockTransactions,
          total: 1,
          currentPage: 1,
          pageSize: 10,
          totalPages: 1,
        },
      };

      const filterDto: ListTransactionsFilterDto = {
        page: 1,
        limit: 10,
        search: 'txn_123456',
      };

      mockService.listTransactions.mockResolvedValue(mockResponse);

      const result = await controller.listTransactions(123, filterDto);

      expect(result).toEqual(mockResponse);
      expect(mockService.listTransactions).toHaveBeenCalledWith(123, filterDto);
    });

    it('should handle search by receiptNo', async () => {
      const mockTransactions = [
        {
          srNo: 'T1',
          id: 1,
          paidAmount: 50000,
          paymentMode: 'OFFLINE',
          date: new Date('2025-01-15T10:30:00Z'),
          status: PaymentTxStatusEnum.VERIFIED,
          transactionId: null,
          realisationDate: new Date('2025-01-16T09:00:00Z'),
          comments: 'Payment processed successfully',
          receiptNo: '12345',
          createdAt: new Date('2025-01-15T10:30:00Z'),
          updatedAt: new Date('2025-01-15T10:30:00Z'),
        },
      ];

      const mockResponse = {
        success: true,
        message: 'Transactions retrieved successfully',
        data: {
          referenceId: 'PHL-BR-0100',
          result: mockTransactions,
          total: 1,
          currentPage: 1,
          pageSize: 10,
          totalPages: 1,
        },
      };

      const filterDto: ListTransactionsFilterDto = {
        page: 1,
        limit: 10,
        search: '12345',
      };

      mockService.listTransactions.mockResolvedValue(mockResponse);

      const result = await controller.listTransactions(123, filterDto);

      expect(result).toEqual(mockResponse);
      expect(mockService.listTransactions).toHaveBeenCalledWith(123, filterDto);
    });

    it('should handle search with no results', async () => {
      const mockResponse = {
        success: true,
        message: 'Transactions retrieved successfully',
        data: {
          referenceId: 'PHL-BR-0100',
          result: [],
          total: 0,
          currentPage: 1,
          pageSize: 10,
          totalPages: 0,
        },
      };

      const filterDto: ListTransactionsFilterDto = {
        page: 1,
        limit: 10,
        search: 'nonexistent',
      };

      mockService.listTransactions.mockResolvedValue(mockResponse);

      const result = await controller.listTransactions(123, filterDto);

      expect(result).toEqual(mockResponse);
      expect(mockService.listTransactions).toHaveBeenCalledWith(123, filterDto);
    });

    it('should handle search with partial matches', async () => {
      const mockTransactions = [
        {
          srNo: 'T1',
          id: 1,
          paidAmount: 50000,
          paymentMode: 'GATEWAY',
          date: new Date('2025-01-15T10:30:00Z'),
          status: PaymentTxStatusEnum.VERIFIED,
          transactionId: 'txn_123456',
          realisationDate: new Date('2025-01-16T09:00:00Z'),
          comments: 'Payment processed successfully',
          receiptNo: '12345',
          createdAt: new Date('2025-01-15T10:30:00Z'),
          updatedAt: new Date('2025-01-15T10:30:00Z'),
        },
        {
          srNo: 'T2',
          id: 2,
          paidAmount: 25000,
          paymentMode: 'OFFLINE',
          date: new Date('2025-01-14T09:15:00Z'),
          status: PaymentTxStatusEnum.VERIFIED,
          transactionId: null,
          realisationDate: new Date('2025-01-15T09:00:00Z'),
          comments: 'Payment verified',
          receiptNo: '12346',
          createdAt: new Date('2025-01-14T09:15:00Z'),
          updatedAt: new Date('2025-01-14T09:15:00Z'),
        },
      ];

      const mockResponse = {
        success: true,
        message: 'Transactions retrieved successfully',
        data: {
          referenceId: 'PHL-BR-0100',
          result: mockTransactions,
          total: 2,
          currentPage: 1,
          pageSize: 10,
          totalPages: 1,
        },
      };

      const filterDto: ListTransactionsFilterDto = {
        page: 1,
        limit: 10,
        search: '1234',
      };

      mockService.listTransactions.mockResolvedValue(mockResponse);

      const result = await controller.listTransactions(123, filterDto);

      expect(result).toEqual(mockResponse);
      expect(mockService.listTransactions).toHaveBeenCalledWith(123, filterDto);
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction successfully', async () => {
      const mockUpdateDto: UpdateTransactionDto = {
        status: PaymentTxStatusEnum.VERIFIED,
        realisationDate: '2025-01-16T09:00:00Z',
        comments: 'Payment verified after bank confirmation',
        receiptNo: '12345',
      };

      const mockResponse = {
        success: true,
        message: 'Transaction updated successfully',
        data: {
          id: 123,
          updatedTransaction: {
            id: 123,
            status: PaymentTxStatusEnum.VERIFIED,
            realisationDate: new Date('2025-01-16T09:00:00Z'),
            comments: 'Payment verified after bank confirmation',
            receiptNo: '12345',
            processedBy: { id: 456 },
            updatedAt: new Date('2025-01-16T10:30:00Z'),
          },
        },
      };

      mockService.updateTransaction.mockResolvedValue(mockResponse);

      const result = await controller.updateTransaction(
        123,
        mockUpdateDto,
        456,
      );

      expect(result).toEqual(mockResponse);
      expect(mockService.updateTransaction).toHaveBeenCalledWith(
        123,
        mockUpdateDto,
        456,
      );
    });

    it('should handle transaction not found error', async () => {
      const mockUpdateDto: UpdateTransactionDto = {
        status: PaymentTxStatusEnum.REJECTED,
        realisationDate: '2025-01-16T09:00:00Z',
        comments: 'Payment rejected due to insufficient funds',
        receiptNo: '12346',
      };

      const error = new NotFoundException('Transaction not found');
      mockService.updateTransaction.mockRejectedValue(error);

      await expect(
        controller.updateTransaction(999, mockUpdateDto, 456),
      ).rejects.toThrow(NotFoundException);
      expect(mockService.updateTransaction).toHaveBeenCalledWith(
        999,
        mockUpdateDto,
        456,
      );
    });

    it('should handle different transaction statuses', async () => {
      const statuses = [
        PaymentTxStatusEnum.VERIFIED,
        PaymentTxStatusEnum.REJECTED,
        PaymentTxStatusEnum.REVERSED,
      ];

      for (const status of statuses) {
        const mockUpdateDto: UpdateTransactionDto = {
          status,
          realisationDate: '2025-01-16T09:00:00Z',
          comments: `Transaction ${status.toLowerCase()}`,
          receiptNo: '12345',
        };

        const mockResponse = {
          success: true,
          message: 'Transaction updated successfully',
          data: {
            id: 123,
            updatedTransaction: {
              id: 123,
              status,
              realisationDate: new Date('2025-01-16T09:00:00Z'),
              comments: `Transaction ${status.toLowerCase()}`,
              receiptNo: '12345',
              processedBy: { id: 456 },
              updatedAt: new Date('2025-01-16T10:30:00Z'),
            },
          },
        };

        mockService.updateTransaction.mockResolvedValue(mockResponse);

        const result = await controller.updateTransaction(
          123,
          mockUpdateDto,
          456,
        );

        expect(result).toEqual(mockResponse);
        expect(mockService.updateTransaction).toHaveBeenCalledWith(
          123,
          mockUpdateDto,
          456,
        );
      }
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        status: 'INVALID_STATUS',
        realisationDate: 'invalid-date',
        comments: '',
        receiptNo: 'not-a-number',
      };

      const error = new BadRequestException('Validation failed');
      mockService.updateTransaction.mockRejectedValue(error);

      await expect(
        controller.updateTransaction(123, invalidDto as any, 456),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateBackendCheckerStatus', () => {
    it('should call service and return success response', async () => {
      const dto: CheckerUpdatesDto = {
        voucherId: 1,
        voucherStatus: VoucherFormStatusEnum.MIS_VERIFIED,
        checkerRemarks: 'Looks good',
      };

      const mockResponse = {
        success: true,
        message: 'Voucher status updated successfully',
      };

      mockService.updateBackendCheckerStatus.mockResolvedValueOnce(
        mockResponse,
      );

      const result = await controller.updateBackendCheckerStatus(mockUser, dto);

      expect(mockService.updateBackendCheckerStatus).toHaveBeenCalledWith(
        mockUser,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw if service throws', async () => {
      const dto: CheckerUpdatesDto = {
        voucherId: 99,
        voucherStatus: VoucherFormStatusEnum.MIS_REQUESTED_CHANGES,
        checkerRemarks: 'Invalid data',
      };

      mockService.updateBackendCheckerStatus.mockRejectedValueOnce(
        new Error('Voucher not found'),
      );

      await expect(
        controller.updateBackendCheckerStatus(mockUser, dto),
      ).rejects.toThrow('Voucher not found');
    });
  });

  describe('refundEOIPayment', () => {
    it('should call service and return success response', async () => {
      const refundDetails: RefundEOIPaymentDto = {
        voucherId: 1001,
        paidAmount: 50000,
        internalRefNumber: 'REF-123',
        refundTransactionId: 'TXN-9999',
        refundDate: '2025-09-08',
        comments: 'Test refund',
      };

      const mockResponse = {
        success: true,
        message: 'Voucher Amount Refunded successfully',
      };

      mockService.refundEOIPayment.mockResolvedValueOnce(mockResponse);

      const result = await controller.refundEOIPayment(mockUser, refundDetails);

      expect(mockService.refundEOIPayment).toHaveBeenCalledWith(
        mockUser,
        refundDetails,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw if service throws', async () => {
      const refundDetails: RefundEOIPaymentDto = {
        voucherId: 1001,
        paidAmount: 50000,
        refundTransactionId: 'TXN-ERROR',
        refundDate: '2025-09-08',
        comments: 'Test refund error',
      };

      mockService.refundEOIPayment.mockRejectedValueOnce(
        new Error('Voucher not found'),
      );

      await expect(
        controller.refundEOIPayment(mockUser, refundDetails),
      ).rejects.toThrow('Voucher not found');
    });
  });

  describe('Role-Based Filtering for listVouchers', () => {
    const mockVoucherData = {
      id: 1,
      voucherId: 'V123456',
      uniqueReferenceId: 'PHL-BR-0100',
      customerName: 'John Doe',
      email: 'john@example.com',
      mobile: '9876543210',
      campaignName: 'Test Campaign',
      projectName: 'Test Project',
      primarySource: 'Website',
      cpName: 'Test CP',
      referrerName: 'Test Referrer',
      typologyPreference: '2BHK',
      unitPreference: 'North Facing',
      leadStatus: 'Hot',
      formStatus: 'CREATED',
      paymentStatus: 'PENDING',
      financeStatus: 'UNVERIFIED',
      queueId: 'Q001',
      sequenceNo: 'S001',
      chronology: 'V',
      sourcingRm: { id: 1, name: 'Sourcing RM' },
      closingRm: { id: 2, name: 'Closing RM' },
      amountPaid: 50000,
      voucherCount: 1,
      finalPaidDate: '2025-01-15',
      createdAt: '2025-01-15T10:30:00Z',
      updatedAt: '2025-01-15T10:30:00Z',
      createdBy: 1,
      rmUniqueId: 'encrypted_id_123',
    };

    beforeEach(() => {
      mockService.listVouchers.mockClear();
    });

    it('should filter fields for ADMIN role - show all fields', async () => {
      const mockUser = { role: 'ADMIN', dbId: 1 };
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [mockVoucherData], // Admin sees everything
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result.data.result[0]).toEqual(mockVoucherData); // Admin sees everything
      expect(mockService.listVouchers).toHaveBeenCalledWith(mockUser, {});
    });

    it('should filter fields for FINANCE_ADMIN role - limited fields', async () => {
      const mockUser = { role: 'FINANCE_ADMIN', dbId: 1 };

      // Mock filtered data that Finance Admin should see
      const filteredVoucherData = {
        id: 1,
        voucherId: 'V123456',
        uniqueReferenceId: 'PHL-BR-0100',
        mobile: '9876543210',
        campaignName: 'Test Campaign',
        typologyPreference: '2BHK',
        unitPreference: 'North Facing',
        leadStatus: 'Hot',
        formStatus: 'CREATED',
        paymentStatus: 'PENDING',
        financeStatus: 'UNVERIFIED',
        queueId: 'Q001',
        sequenceNo: 'S001',
        chronology: 'V',
        sourcingRm: { id: 1, name: 'Sourcing RM' },
        closingRm: { id: 2, name: 'Closing RM' },
        amountPaid: 50000,
        voucherCount: 1,
        finalPaidDate: '2025-01-15',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
        createdBy: 1,
        rmUniqueId: 'encrypted_id_123',
      };

      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [filteredVoucherData],
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      const filteredVoucher = result.data.result[0];

      // Finance should see these fields
      expect(filteredVoucher).toHaveProperty('id');
      expect(filteredVoucher).toHaveProperty('voucherId');
      expect(filteredVoucher).toHaveProperty('uniqueReferenceId');
      expect(filteredVoucher).toHaveProperty('mobile');
      expect(filteredVoucher).toHaveProperty('campaignName');
      expect(filteredVoucher).toHaveProperty('typologyPreference');
      expect(filteredVoucher).toHaveProperty('leadStatus');
      expect(filteredVoucher).toHaveProperty('formStatus');
      expect(filteredVoucher).toHaveProperty('paymentStatus');
      expect(filteredVoucher).toHaveProperty('financeStatus');
      expect(filteredVoucher).toHaveProperty('amountPaid');

      // Finance should NOT see these fields
      expect(filteredVoucher).not.toHaveProperty('customerName');
      expect(filteredVoucher).not.toHaveProperty('email');
      expect(filteredVoucher).not.toHaveProperty('projectName');
      expect(filteredVoucher).not.toHaveProperty('primarySource');
      expect(filteredVoucher).not.toHaveProperty('cpName');
      expect(filteredVoucher).not.toHaveProperty('referrerName');
    });

    it('should filter fields for RM role - most fields visible', async () => {
      const mockUser = { role: 'RM', dbId: 1 };
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [mockVoucherData],
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      const filteredVoucher = result.data.result[0];

      // RM should see most fields including sensitive ones
      expect(filteredVoucher).toHaveProperty('customerName');
      expect(filteredVoucher).toHaveProperty('email');
      expect(filteredVoucher).toHaveProperty('mobile');
      expect(filteredVoucher).toHaveProperty('projectName');
      expect(filteredVoucher).toHaveProperty('primarySource');
      expect(filteredVoucher).toHaveProperty('cpName');
      expect(filteredVoucher).toHaveProperty('referrerName');
      expect(filteredVoucher).toHaveProperty('sourcingRm');
      expect(filteredVoucher).toHaveProperty('closingRm');
    });

    it('should filter fields for MIS role - all fields visible', async () => {
      const mockUser = { role: 'MIS', dbId: 1 };
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [mockVoucherData],
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      const filteredVoucher = result.data.result[0];

      // Backend checker should see all fields
      expect(filteredVoucher).toEqual(mockVoucherData);
    });

    it('should filter fields for SALES_TL role - limited fields', async () => {
      const mockUser = { role: 'SALES_TL', dbId: 1 };

      // Mock filtered data that Sales TL should see
      const filteredVoucherData = {
        id: 1,
        voucherId: 'V123456',
        uniqueReferenceId: 'PHL-BR-0100',
        mobile: '9876543210',
        campaignName: 'Test Campaign',
        projectName: 'Test Project',
        primarySource: 'Website',
        cpName: 'Test CP',
        referrerName: 'Test Referrer',
        typologyPreference: '2BHK',
        unitPreference: 'North Facing',
        leadStatus: 'Hot',
        formStatus: 'CREATED',
        paymentStatus: 'PENDING',
        financeStatus: 'UNVERIFIED',
        queueId: 'Q001',
        sequenceNo: 'S001',
        chronology: 'V',
        sourcingRm: { id: 1, name: 'Sourcing RM' },
        closingRm: { id: 2, name: 'Closing RM' },
        amountPaid: 50000,
        voucherCount: 1,
        finalPaidDate: '2025-01-15',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
        createdBy: 1,
        rmUniqueId: 'encrypted_id_123',
      };

      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [filteredVoucherData],
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      const filteredVoucher = result.data.result[0];

      // Sales TL should see business fields but not sensitive customer data
      expect(filteredVoucher).toHaveProperty('voucherId');
      expect(filteredVoucher).toHaveProperty('uniqueReferenceId');
      expect(filteredVoucher).toHaveProperty('mobile');
      expect(filteredVoucher).toHaveProperty('projectName');
      expect(filteredVoucher).toHaveProperty('primarySource');
      expect(filteredVoucher).toHaveProperty('cpName');
      expect(filteredVoucher).toHaveProperty('referrerName');

      // Should NOT see sensitive customer data
      expect(filteredVoucher).not.toHaveProperty('customerName');
      expect(filteredVoucher).not.toHaveProperty('email');
    });

    it('should filter fields for CRM role - business fields visible', async () => {
      const mockUser = { role: 'CRM', dbId: 1 };

      // Mock filtered data that CRM should see
      const filteredVoucherData = {
        id: 1,
        voucherId: 'V123456',
        uniqueReferenceId: 'PHL-BR-0100',
        mobile: '9876543210',
        campaignName: 'Test Campaign',
        projectName: 'Test Project',
        primarySource: 'Website',
        referrerName: 'Test Referrer',
        typologyPreference: '2BHK',
        unitPreference: 'North Facing',
        leadStatus: 'Hot',
        formStatus: 'CREATED',
        paymentStatus: 'PENDING',
        financeStatus: 'UNVERIFIED',
        queueId: 'Q001',
        sequenceNo: 'S001',
        chronology: 'V',
        sourcingRm: { id: 1, name: 'Sourcing RM' },
        closingRm: { id: 2, name: 'Closing RM' },
        amountPaid: 50000,
        voucherCount: 1,
        finalPaidDate: '2025-01-15',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
        createdBy: 1,
        rmUniqueId: 'encrypted_id_123',
      };

      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [filteredVoucherData],
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      const filteredVoucher = result.data.result[0];

      // CRM should see business fields
      expect(filteredVoucher).toHaveProperty('voucherId');
      expect(filteredVoucher).toHaveProperty('uniqueReferenceId');
      expect(filteredVoucher).toHaveProperty('mobile');
      expect(filteredVoucher).toHaveProperty('projectName');
      expect(filteredVoucher).toHaveProperty('primarySource');
      expect(filteredVoucher).toHaveProperty('referrerName');

      // Should NOT see sensitive customer data or CP details
      expect(filteredVoucher).not.toHaveProperty('customerName');
      expect(filteredVoucher).not.toHaveProperty('email');
      expect(filteredVoucher).not.toHaveProperty('cpName');
    });

    it('should handle empty voucher list with role filtering', async () => {
      const mockUser = { role: 'FINANCE_ADMIN', dbId: 1 };
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [],
          total: 0,
          page: 1,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result.data.result).toEqual([]);
      expect(result.data.total).toBe(0);
    });

    it('should handle multiple vouchers with role filtering', async () => {
      const mockUser = { role: 'RM', dbId: 1 };
      const mockVouchers = [
        mockVoucherData,
        { ...mockVoucherData, id: 2, voucherId: 'V123457' },
      ];
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: mockVouchers,
          total: 2,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result.data.result).toHaveLength(2);
      result.data.result.forEach((voucher) => {
        expect(voucher).toHaveProperty('customerName'); // RM should see customer name
        expect(voucher).toHaveProperty('email'); // RM should see email
      });
    });

    it('should preserve pagination metadata after role filtering', async () => {
      const mockUser = { role: 'MIS', dbId: 1 };
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [mockVoucherData],
          total: 25,
          page: 2,
          pageSize: 10,
          pageCount: 3,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result.data.total).toBe(25);
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
      expect(result.data.pageCount).toBe(3);
    });

    it('should handle unknown role gracefully', async () => {
      const mockUser = { role: 'UNKNOWN_ROLE', dbId: 1 };
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [], // Unknown role should return empty result (no permissions)
          total: 0,
          page: 1,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      // Unknown role should return empty result (no permissions)
      expect(result.data.result).toEqual([]);
    });

    it('should filter fields for GRE role - same as RM', async () => {
      const mockUser = { role: 'GRE', dbId: 1 };
      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [mockVoucherData],
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      const filteredVoucher = result.data.result[0];

      // GRE should have same permissions as RM
      expect(filteredVoucher).toHaveProperty('customerName');
      expect(filteredVoucher).toHaveProperty('email');
      expect(filteredVoucher).toHaveProperty('mobile');
      expect(filteredVoucher).toHaveProperty('projectName');
    });

    it('should work with exportVouchers and role filtering', async () => {
      const mockUser = { role: 'FINANCE_ADMIN', dbId: 1 };
      const mockResponse = {
        message: 'Vouchers/EOIs exported successfully',
        data: { filePath: 'exports/vouchers-123.xlsx' },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result).toEqual(mockResponse);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(mockUser, {});
    });

    it('should export only visible columns for FINANCE_ADMIN role', async () => {
      const mockUser = { role: 'FINANCE_ADMIN', dbId: 1 };
      const mockResponse = {
        message: 'Vouchers/EOIs exported successfully',
        data: { filePath: 'exports/vouchers-123.xlsx' },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result).toEqual(mockResponse);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(mockUser, {});
    });

    it('should export all columns for ADMIN role', async () => {
      const mockUser = { role: 'ADMIN', dbId: 1 };
      const mockResponse = {
        message: 'Vouchers/EOIs exported successfully',
        data: { filePath: 'exports/vouchers-123.xlsx' },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result).toEqual(mockResponse);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(mockUser, {});
    });

    it('should export limited columns for SALES_TL role', async () => {
      const mockUser = { role: 'SALES_TL', dbId: 1 };
      const mockResponse = {
        message: 'Vouchers/EOIs exported successfully',
        data: { filePath: 'exports/vouchers-123.xlsx' },
      };

      mockService.exportVouchers.mockResolvedValue(mockResponse);

      const result = await controller.exportVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      expect(result).toEqual(mockResponse);
      expect(mockService.exportVouchers).toHaveBeenCalledWith(mockUser, {});
    });

    it('should handle complex voucher data with nested objects', async () => {
      const mockUser = { role: 'RM', dbId: 1 };
      const complexVoucherData = {
        ...mockVoucherData,
        sourcingRm: {
          id: 1,
          name: 'Sourcing RM',
          email: 'sourcing@example.com',
        },
        closingRm: { id: 2, name: 'Closing RM', phone: '9876543210' },
        unitPreference: {
          floor: 'High',
          view: 'Garden',
          amenities: ['Pool', 'Gym'],
        },
      };

      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [complexVoucherData],
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      const filteredVoucher = result.data.result[0];

      // Should preserve nested object structure
      expect(filteredVoucher.sourcingRm).toEqual(complexVoucherData.sourcingRm);
      expect(filteredVoucher.closingRm).toEqual(complexVoucherData.closingRm);
      expect(filteredVoucher.unitPreference).toEqual(
        complexVoucherData.unitPreference,
      );
    });

    it('should handle null/undefined values in voucher data', async () => {
      const mockUser = { role: 'MIS', dbId: 1 };
      const voucherWithNulls = {
        ...mockVoucherData,
        customerName: null,
        email: undefined,
        sourcingRm: null,
        closingRm: undefined,
        unitPreference: null,
      };

      const mockResponse = {
        success: true,
        message: 'Vouchers retrieved successfully',
        data: {
          result: [voucherWithNulls],
          total: 1,
          page: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVouchers.mockResolvedValue(mockResponse);

      const result = await controller.listVouchers(
        mockUser,
        {} as ListVouchersFilterDto,
      );

      const filteredVoucher = result.data.result[0];

      // Should handle null/undefined values gracefully
      expect(filteredVoucher.customerName).toBeNull();
      expect(filteredVoucher.email).toBeUndefined();
      expect(filteredVoucher.sourcingRm).toBeNull();
      expect(filteredVoucher.closingRm).toBeUndefined();
    });
  });

  describe('approveCancelRequest', () => {
    it('should call service.approveCancelRequest with correct arguments', async () => {
      const mockUser = { id: 1, name: 'John Doe' };
      const mockDto: ApproveCancelRequestDTO = {
        requestId: 'REQ123',
        approved: true,
        reason: 'Valid reason',
      } as any;

      const mockResponse = { success: true };
      jest
        .spyOn(mockService, 'approveCancelRequest')
        .mockResolvedValue(mockResponse);

      const result = await controller.approveCancelRequest(mockUser, mockDto);

      expect(mockService.approveCancelRequest).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from the service', async () => {
      const mockUser = { id: 1 };
      const mockDto = { requestId: 'REQ123' } as any;

      const mockError = new Error('Service error');
      jest
        .spyOn(mockService, 'approveCancelRequest')
        .mockRejectedValue(mockError);

      await expect(
        controller.approveCancelRequest(mockUser, mockDto),
      ).rejects.toThrow('Service error');
    });
  });

  describe('exportRmDashboard', () => {
    it('should export RM dashboard successfully (success + response time)', async () => {
      const userId = 1;
      const mockFilterDto: RmDashboardFilterDto = {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        projectId: 1,
      } as any;

      const mockResponse = {
        message: 'RM dashboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/rm-dashboard/rm-dashboard-2024-01-15_103000.xlsx',
        },
      };

      mockService.exportRmDashboard.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.exportRmDashboard(userId, mockFilterDto);
      const duration = Date.now() - start;

      expect(result.message).toBe('RM dashboard exported successfully');
      expect(result.data.filePath).toContain(
        'exports/eoi-management/rm-dashboard',
      );
      expect(mockService.exportRmDashboard).toHaveBeenCalledWith(
        userId,
        mockFilterDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return message when no RM dashboard data found to export', async () => {
      const userId = 1;
      const mockFilterDto: RmDashboardFilterDto = {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      } as any;

      const mockResponse = {
        message: 'No RM dashboard data found to export',
        data: [],
      };

      mockService.exportRmDashboard.mockResolvedValue(mockResponse);

      const result = await controller.exportRmDashboard(userId, mockFilterDto);

      expect(result.message).toBe('No RM dashboard data found to export');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
      expect(mockService.exportRmDashboard).toHaveBeenCalledWith(
        userId,
        mockFilterDto,
      );
    });

    it('should export RM dashboard in source-wise view when view is set to source', async () => {
      const userId = 1;
      const mockFilterDto: RmDashboardFilterDto = {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        view: 'source',
      } as any;

      const mockResponse = {
        message: 'RM dashboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/rm-dashboard/rm-dashboard-2024-01-15_103000.xlsx',
        },
      };

      mockService.exportRmDashboard.mockResolvedValue(mockResponse);

      const result = await controller.exportRmDashboard(userId, mockFilterDto);

      expect(result.message).toBe('RM dashboard exported successfully');
      expect(result.data.filePath).toContain('.xlsx');
      // Just making sure controller passes the view flag through to the service:
      expect(mockService.exportRmDashboard).toHaveBeenCalledWith(
        userId,
        mockFilterDto,
      );
    });

    it('should handle missing pagination and other optional filters', async () => {
      const userId = 1;
      const mockFilterDto: RmDashboardFilterDto = {
        projectId: 1,
      } as any;

      const mockResponse = {
        message: 'RM dashboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/rm-dashboard/rm-dashboard-2024-01-15_103000.xlsx',
        },
      };

      mockService.exportRmDashboard.mockResolvedValue(mockResponse);

      const result = await controller.exportRmDashboard(userId, mockFilterDto);

      expect(result.message).toBe('RM dashboard exported successfully');
      expect(result.data.filePath).toMatch(/rm-dashboard-.*\.xlsx$/);
      expect(mockService.exportRmDashboard).toHaveBeenCalledWith(
        userId,
        mockFilterDto,
      );
    });

    it('should throw error when export fails (failure + response time)', async () => {
      const userId = 1;
      const mockFilterDto: RmDashboardFilterDto = {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      } as any;

      const exportError = new Error('RM dashboard export failed');
      mockService.exportRmDashboard.mockRejectedValue(exportError);

      const start = Date.now();
      await expect(
        controller.exportRmDashboard(userId, mockFilterDto),
      ).rejects.toThrow(exportError);
      const duration = Date.now() - start;

      expect(mockService.exportRmDashboard).toHaveBeenCalledWith(
        userId,
        mockFilterDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should handle undefined / empty filter DTO gracefully', async () => {
      const userId = 1;
      const mockFilterDto = {} as RmDashboardFilterDto;

      const mockResponse = {
        message: 'RM dashboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/rm-dashboard/rm-dashboard-2024-01-15_103000.xlsx',
        },
      };

      mockService.exportRmDashboard.mockResolvedValue(mockResponse);

      const result = await controller.exportRmDashboard(userId, mockFilterDto);

      expect(result.message).toBe('RM dashboard exported successfully');
      expect(result.data.filePath).toContain(
        'exports/eoi-management/rm-dashboard',
      );
      expect(mockService.exportRmDashboard).toHaveBeenCalledWith(
        userId,
        mockFilterDto,
      );
    });
  });

  describe('getEoiLeaderboard', () => {
    const mockDto: EoiLeaderboardFilterDto = {
      view: EoiLeaderboardView.CHANNEL_PARTNER,
      page: 1,
      limit: 10,
    } as any;

    it('should return channel partner leaderboard successfully (success + response time)', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'EOI leaderboard fetched successfully',
        data: {
          result: [
            {
              cpId: 1,
              cpName: 'CP Alpha',
              campaignId: 39,
              campaignName: 'Test Campaign',
              noOfVouchers: 10,
              voucherValue: 1000000,
              amountCollected: 800000,
              cancellations: 2,
            },
          ],
          cards: {
            totalEOIs: 100,
            cpEois: 50,
            cpEoiCollected: 5000000,
            cpEoiValues: 6000000,
            activeCps: 5,
            onboardedCps: 10,
          },
          page: 1,
          total: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.getEoiLeaderboard.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getEoiLeaderboard(mockDto);
      const duration = Date.now() - start;

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toBe('EOI leaderboard fetched successfully');
      expect(result.data.result).toHaveLength(1);
      expect(result.data.result[0].cpName).toBe('CP Alpha');
      expect(result.data.cards.totalEOIs).toBe(100);
      expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(mockDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return relationship manager leaderboard successfully', async () => {
      const rmDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.RELATIONSHIP_MANAGER,
        page: 1,
        limit: 10,
      } as any;

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'EOI leaderboard fetched successfully',
        data: {
          result: [
            {
              rmId: 1,
              rmName: 'John Doe',
              userGroupId: 1,
              userGroupName: 'Sales Team',
              campaignId: 39,
              campaignName: 'Test Campaign',
              noOfVouchers: 15,
              voucherValue: 1500000,
              amountCollected: 1200000,
              cancellations: 1,
            },
          ],
          cards: {
            totalEOIs: 200,
            eoiValue: 20000000,
            eoisCollected: 15000000,
            formFillInProgress: 5,
            formLinksShared: 10,
            topRmValues: 5000000,
            topRmContributions: 25.5,
          },
          page: 1,
          total: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.getEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.getEoiLeaderboard(rmDto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.result[0].rmName).toBe('John Doe');
      expect(result.data.cards.totalEOIs).toBe(200);
      expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(rmDto);
    });

    it('should handle pagination correctly', async () => {
      const paginatedDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.CHANNEL_PARTNER,
        page: 2,
        limit: 5,
      } as any;

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'EOI leaderboard fetched successfully',
        data: {
          result: [],
          cards: {},
          page: 2,
          total: 10,
          pageSize: 5,
          pageCount: 2,
        },
      };

      mockService.getEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.getEoiLeaderboard(paginatedDto);

      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(5);
      expect(result.data.pageCount).toBe(2);
      expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(paginatedDto);
    });

    it('should handle filters correctly', async () => {
      const filteredDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.CHANNEL_PARTNER,
        campaignId: [39, 40],
        channelPartnerId: [1, 2],
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        sortBy: EoiLeaderboardSortBy.VOUCHER_VALUE,
        page: 1,
        limit: 10,
      } as any;

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'EOI leaderboard fetched successfully',
        data: {
          result: [],
          cards: {},
          page: 1,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockService.getEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.getEoiLeaderboard(filteredDto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(filteredDto);
    });

    it('should handle empty leaderboard data', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'EOI leaderboard fetched successfully',
        data: {
          result: [],
          cards: {
            totalEOIs: 0,
            cpEois: 0,
            cpEoiCollected: 0,
            cpEoiValues: 0,
            activeCps: 0,
            onboardedCps: 0,
          },
          page: 1,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockService.getEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.getEoiLeaderboard(mockDto);

      expect(result.data.result).toHaveLength(0);
      expect(result.data.total).toBe(0);
      expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(mockDto);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.getEoiLeaderboard.mockRejectedValue(dbError);

      await expect(controller.getEoiLeaderboard(mockDto)).rejects.toThrow(
        dbError,
      );
      expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(mockDto);
    });

    it('should handle invalid date range', async () => {
      const invalidDateDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.CHANNEL_PARTNER,
        startDate: '2025-01-31',
        endDate: '2025-01-01', // End date before start date
        page: 1,
        limit: 10,
      } as any;

      const error = new BadRequestException('Invalid date range');
      mockService.getEoiLeaderboard.mockRejectedValue(error);

      await expect(
        controller.getEoiLeaderboard(invalidDateDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(
        invalidDateDto,
      );
    });

    it('should handle RM view with filters', async () => {
      const rmFilteredDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.RELATIONSHIP_MANAGER,
        rmId: [1, 2, 3],
        userGroupId: [1],
        campaignId: [39],
        sortBy: EoiLeaderboardSortBy.AMOUNT_COLLECTED,
        page: 1,
        limit: 10,
      } as any;

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'EOI leaderboard fetched successfully',
        data: {
          result: [],
          cards: {},
          page: 1,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockService.getEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.getEoiLeaderboard(rmFilteredDto);

      expect(result.statusCode).toBe(SUCCESS);
      expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(rmFilteredDto);
    });

    it('should handle different sort options', async () => {
      const sortOptions = [
        EoiLeaderboardSortBy.NO_OF_VOUCHERS,
        EoiLeaderboardSortBy.VOUCHER_VALUE,
        EoiLeaderboardSortBy.AMOUNT_COLLECTED,
      ];

      for (const sortBy of sortOptions) {
        const sortedDto: EoiLeaderboardFilterDto = {
          view: EoiLeaderboardView.CHANNEL_PARTNER,
          sortBy,
          page: 1,
          limit: 10,
        } as any;

        const mockResponse = {
          statusCode: SUCCESS,
          message: 'EOI leaderboard fetched successfully',
          data: {
            result: [],
            cards: {},
            page: 1,
            total: 0,
            pageSize: 10,
            pageCount: 0,
          },
        };

        mockService.getEoiLeaderboard.mockResolvedValue(mockResponse);

        const result = await controller.getEoiLeaderboard(sortedDto);

        expect(result.statusCode).toBe(SUCCESS);
        expect(mockService.getEoiLeaderboard).toHaveBeenCalledWith(sortedDto);
      }
    });
  });

  describe('exportEoiLeaderboard', () => {
    const mockDto: EoiLeaderboardFilterDto = {
      view: EoiLeaderboardView.CHANNEL_PARTNER,
    } as any;

    it('should export channel partner leaderboard successfully (success + response time)', async () => {
      const mockResponse = {
        message: 'EOI leaderboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/leaderboard/eoi-leaderboard-cp-2025-01-15_103000.xlsx',
        },
      };

      mockService.exportEoiLeaderboard.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.exportEoiLeaderboard(mockDto);
      const duration = Date.now() - start;

      expect(result.message).toBe('EOI leaderboard exported successfully');
      expect(result.data.filePath).toContain(
        'exports/eoi-management/leaderboard/eoi-leaderboard-cp-',
      );
      expect(result.data.filePath).toContain('.xlsx');
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(mockDto);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should export relationship manager leaderboard successfully', async () => {
      const rmDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.RELATIONSHIP_MANAGER,
      } as any;

      const mockResponse = {
        message: 'EOI leaderboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/leaderboard/eoi-leaderboard-rm-2025-01-15_103000.xlsx',
        },
      };

      mockService.exportEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.exportEoiLeaderboard(rmDto);

      expect(result.message).toBe('EOI leaderboard exported successfully');
      expect(result.data.filePath).toContain('eoi-leaderboard-rm-');
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(rmDto);
    });

    it('should return message when no data found to export', async () => {
      const mockResponse = {
        message: 'No leaderboard data found to export',
        data: [],
      };

      mockService.exportEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.exportEoiLeaderboard(mockDto);

      expect(result.message).toBe('No leaderboard data found to export');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(mockDto);
    });

    it('should handle export with filters', async () => {
      const filteredDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.CHANNEL_PARTNER,
        campaignId: [39, 40],
        channelPartnerId: [1, 2],
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        sortBy: EoiLeaderboardSortBy.VOUCHER_VALUE,
      } as any;

      const mockResponse = {
        message: 'EOI leaderboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/leaderboard/eoi-leaderboard-cp-2025-01-15_103000.xlsx',
        },
      };

      mockService.exportEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.exportEoiLeaderboard(filteredDto);

      expect(result.message).toBe('EOI leaderboard exported successfully');
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(
        filteredDto,
      );
    });

    it('should handle export errors gracefully', async () => {
      const exportError = new Error('Export failed');
      mockService.exportEoiLeaderboard.mockRejectedValue(exportError);

      await expect(controller.exportEoiLeaderboard(mockDto)).rejects.toThrow(
        exportError,
      );
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(mockDto);
    });

    it('should handle invalid date range in export', async () => {
      const invalidDateDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.CHANNEL_PARTNER,
        startDate: '2025-01-31',
        endDate: '2025-01-01',
      } as any;

      const error = new BadRequestException('Invalid date range');
      mockService.exportEoiLeaderboard.mockRejectedValue(error);

      await expect(
        controller.exportEoiLeaderboard(invalidDateDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(
        invalidDateDto,
      );
    });

    it('should handle AWS S3 upload errors', async () => {
      const s3Error = new Error('S3 upload failed');
      mockService.exportEoiLeaderboard.mockRejectedValue(s3Error);

      await expect(controller.exportEoiLeaderboard(mockDto)).rejects.toThrow(
        s3Error,
      );
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(mockDto);
    });

    it('should handle Excel generation errors', async () => {
      const excelError = new Error('Excel generation failed');
      mockService.exportEoiLeaderboard.mockRejectedValue(excelError);

      await expect(controller.exportEoiLeaderboard(mockDto)).rejects.toThrow(
        excelError,
      );
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(mockDto);
    });

    it('should export RM leaderboard with filters', async () => {
      const rmFilteredDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.RELATIONSHIP_MANAGER,
        rmId: [1, 2, 3],
        userGroupId: [1],
        campaignId: [39],
        sortBy: EoiLeaderboardSortBy.AMOUNT_COLLECTED,
      } as any;

      const mockResponse = {
        message: 'EOI leaderboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/leaderboard/eoi-leaderboard-rm-2025-01-15_103000.xlsx',
        },
      };

      mockService.exportEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.exportEoiLeaderboard(rmFilteredDto);

      expect(result.message).toBe('EOI leaderboard exported successfully');
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(
        rmFilteredDto,
      );
    });

    it('should handle empty filter DTO gracefully', async () => {
      const emptyDto: EoiLeaderboardFilterDto = {
        view: EoiLeaderboardView.CHANNEL_PARTNER,
      } as any;

      const mockResponse = {
        message: 'EOI leaderboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/leaderboard/eoi-leaderboard-cp-2025-01-15_103000.xlsx',
        },
      };

      mockService.exportEoiLeaderboard.mockResolvedValue(mockResponse);

      const result = await controller.exportEoiLeaderboard(emptyDto);

      expect(result.message).toBe('EOI leaderboard exported successfully');
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(emptyDto);
    });

    it('should respond within acceptable time limits', async () => {
      const mockResponse = {
        message: 'EOI leaderboard exported successfully',
        data: {
          filePath:
            'exports/eoi-management/leaderboard/eoi-leaderboard-cp-2025-01-15_103000.xlsx',
        },
      };

      mockService.exportEoiLeaderboard.mockResolvedValue(mockResponse);

      const start = Date.now();
      await controller.exportEoiLeaderboard(mockDto);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
      expect(mockService.exportEoiLeaderboard).toHaveBeenCalledWith(mockDto);
    });
  });

  describe('getVoucherApplicantDetails', () => {
    it('should return voucher applicant details successfully', async () => {
      const dto: GetReferredVoucherDto = {
        campaignId: 1,
        uniqueRefId: 'PHL-BR-0100',
      };
      const mockResponse = {
        success: true,
        message: 'Voucher applicant details retrieved successfully',
        data: {
          customerName: 'John Doe',
          countryCode: '+91',
          contactNumber: '9876543210',
          email: 'john@example.com',
        },
      };
      mockService.getReferredVoucher.mockResolvedValue(mockResponse);

      const result = await controller.getVoucherApplicantDetails(dto);

      expect(result.success).toBe(true);
      expect(result.data.customerName).toBe('John Doe');
      expect(mockService.getReferredVoucher).toHaveBeenCalledWith(
        1,
        'PHL-BR-0100',
      );
    });

    it('should throw NotFoundException when voucher not found', async () => {
      const dto: GetReferredVoucherDto = {
        campaignId: 1,
        uniqueRefId: 'INVALID-REF',
      };
      mockService.getReferredVoucher.mockRejectedValue(
        new NotFoundException('Voucher not found'),
      );

      await expect(controller.getVoucherApplicantDetails(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockService.getReferredVoucher).toHaveBeenCalledWith(
        1,
        'INVALID-REF',
      );
    });

    it('should handle internal errors gracefully', async () => {
      const dto: GetReferredVoucherDto = {
        campaignId: 1,
        uniqueRefId: 'PHL-BR-0100',
      };
      const error = new Error('Database error');
      mockService.getReferredVoucher.mockRejectedValue(error);

      await expect(controller.getVoucherApplicantDetails(dto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('campaignInventoryDropdown', () => {
    it('should return campaign inventory dropdown successfully', async () => {
      const campaignId = 1;
      const mockResponse = {
        success: true,
        message: 'Campaign inventory retrieved successfully',
        data: [
          { id: 1, name: '2BHK', available: 10 },
          { id: 2, name: '3BHK', available: 5 },
        ],
      };
      mockService.campaignInventoryDropdown.mockResolvedValue(mockResponse);

      const result = await controller.campaignInventoryDropdown(campaignId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockService.campaignInventoryDropdown).toHaveBeenCalledWith(
        campaignId,
      );
    });

    it('should return empty array when no inventory exists', async () => {
      const campaignId = 999;
      const mockResponse = {
        success: true,
        message: 'Campaign inventory retrieved successfully',
        data: [],
      };
      mockService.campaignInventoryDropdown.mockResolvedValue(mockResponse);

      const result = await controller.campaignInventoryDropdown(campaignId);

      expect(result.data).toHaveLength(0);
      expect(mockService.campaignInventoryDropdown).toHaveBeenCalledWith(
        campaignId,
      );
    });

    it('should throw NotFoundException when campaign not found', async () => {
      const campaignId = 999;
      mockService.campaignInventoryDropdown.mockRejectedValue(
        new NotFoundException('Campaign not found'),
      );

      await expect(
        controller.campaignInventoryDropdown(campaignId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendDailyDashboardReport', () => {
    it('should send daily dashboard report successfully', async () => {
      const recipientEmail = ['admin@example.com', 'manager@example.com'];
      const mockResponse = {
        success: true,
        message: 'Daily dashboard report sent successfully',
        data: {
          sentTo: recipientEmail,
          timestamp: new Date(),
        },
      };
      mockService.sendDailyDashboardReport.mockResolvedValue(mockResponse);

      const result = await controller.sendDailyDashboardReport(recipientEmail);

      expect(result.success).toBe(true);
      expect(result.data.sentTo).toEqual(recipientEmail);
      expect(mockService.sendDailyDashboardReport).toHaveBeenCalledWith(
        recipientEmail,
      );
    });

    it('should send report without recipient email (default recipients)', async () => {
      const mockResponse = {
        success: true,
        message: 'Daily dashboard report sent successfully',
        data: {
          sentTo: ['default@example.com'],
          timestamp: new Date(),
        },
      };
      mockService.sendDailyDashboardReport.mockResolvedValue(mockResponse);

      const result = await controller.sendDailyDashboardReport();

      expect(result.success).toBe(true);
      expect(mockService.sendDailyDashboardReport).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('should handle errors gracefully', async () => {
      const recipientEmail = ['admin@example.com'];
      const error = new Error('Failed to send report');
      mockService.sendDailyDashboardReport.mockRejectedValue(error);

      await expect(
        controller.sendDailyDashboardReport(recipientEmail),
      ).rejects.toThrow(error);
    });
  });

  describe('inventoryWiseSplit', () => {
    it('should return inventory wise split successfully', async () => {
      const query: InventoryWiseSplitQueryDto = {
        campaignId: 1,
        page: 1,
        limit: 10,
      } as any;
      const mockResponse = {
        success: true,
        message: 'Inventory wise split retrieved successfully',
        data: {
          result: [
            { typology: '2BHK', total: 100, booked: 50, available: 50 },
            { typology: '3BHK', total: 80, booked: 30, available: 50 },
          ],
          total: 2,
          page: 1,
          pageSize: 10,
        },
      };
      mockService.getInventoryWiseSplit.mockResolvedValue(mockResponse);

      const result = await controller.inventoryWiseSplit(query);

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(2);
      expect(mockService.getInventoryWiseSplit).toHaveBeenCalledWith(query);
    });

    it('should handle empty results', async () => {
      const query: InventoryWiseSplitQueryDto = {
        campaignId: 999,
      } as any;
      const mockResponse = {
        success: true,
        message: 'Inventory wise split retrieved successfully',
        data: {
          result: [],
          total: 0,
        },
      };
      mockService.getInventoryWiseSplit.mockResolvedValue(mockResponse);

      const result = await controller.inventoryWiseSplit(query);

      expect(result.data.result).toHaveLength(0);
      expect(mockService.getInventoryWiseSplit).toHaveBeenCalledWith(query);
    });

    it('should handle errors gracefully', async () => {
      const query: InventoryWiseSplitQueryDto = {
        campaignId: 1,
      } as any;
      const error = new Error('Database error');
      mockService.getInventoryWiseSplit.mockRejectedValue(error);

      await expect(controller.inventoryWiseSplit(query)).rejects.toThrow(error);
    });
  });

  describe('dailyTracker', () => {
    it('should return daily tracker data successfully', async () => {
      const query: DailyTrackerQueryDto = {
        campaignId: 1,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      } as any;
      const mockResponse = {
        success: true,
        message: 'Daily tracker data retrieved successfully',
        data: {
          result: [
            { date: '2025-01-15', vouchers: 10, amount: 1000000 },
            { date: '2025-01-16', vouchers: 15, amount: 1500000 },
          ],
          total: 2,
        },
      };
      mockService.getDailyTracker.mockResolvedValue(mockResponse);

      const result = await controller.dailyTracker(query);

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(2);
      expect(mockService.getDailyTracker).toHaveBeenCalledWith(query);
    });

    it('should handle empty tracker data', async () => {
      const query: DailyTrackerQueryDto = {
        campaignId: 999,
      } as any;
      const mockResponse = {
        success: true,
        message: 'Daily tracker data retrieved successfully',
        data: {
          result: [],
          total: 0,
        },
      };
      mockService.getDailyTracker.mockResolvedValue(mockResponse);

      const result = await controller.dailyTracker(query);

      expect(result.data.result).toHaveLength(0);
      expect(mockService.getDailyTracker).toHaveBeenCalledWith(query);
    });

    it('should handle errors gracefully', async () => {
      const query: DailyTrackerQueryDto = {
        campaignId: 1,
      } as any;
      const error = new Error('Database error');
      mockService.getDailyTracker.mockRejectedValue(error);

      await expect(controller.dailyTracker(query)).rejects.toThrow(error);
    });
  });

  describe('getVoucherByEnquiryId', () => {
    it('should return voucher by enquiry ID successfully', async () => {
      const query: GetVoucherByEnquiryIdDto = {
        enquiryId: 'ENQ-123456',
      } as any;
      const mockResponse = {
        success: true,
        message: 'Voucher retrieved successfully',
        data: {
          id: 1,
          voucherId: 12345678,
          uniqueReferenceId: 'PHL-BR-0100',
          enquiryId: 'ENQ-123456',
        },
      };
      mockService.getVoucherByEnquiryId.mockResolvedValue(mockResponse);

      const result = await controller.getVoucherByEnquiryId(query);

      expect(result.success).toBe(true);
      expect(result.data.enquiryId).toBe('ENQ-123456');
      expect(mockService.getVoucherByEnquiryId).toHaveBeenCalledWith(query);
    });

    it('should throw NotFoundException when voucher not found', async () => {
      const query: GetVoucherByEnquiryIdDto = {
        enquiryId: 'ENQ-INVALID',
      } as any;
      mockService.getVoucherByEnquiryId.mockRejectedValue(
        new NotFoundException('Voucher not found for this enquiry ID'),
      );

      await expect(controller.getVoucherByEnquiryId(query)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockService.getVoucherByEnquiryId).toHaveBeenCalledWith(query);
    });

    it('should handle errors gracefully', async () => {
      const query: GetVoucherByEnquiryIdDto = {
        enquiryId: 'ENQ-123456',
      } as any;
      const error = new Error('Database error');
      mockService.getVoucherByEnquiryId.mockRejectedValue(error);

      await expect(controller.getVoucherByEnquiryId(query)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getPrimarySourceProjects', () => {
    it('should return primary source projects successfully', async () => {
      const query: CommonFindAllQueryDto = {
        search: 'Project',
        page: 1,
        limit: 10,
      } as any;
      const mockResponse = {
        success: true,
        message: 'Primary source projects retrieved successfully',
        data: {
          result: [
            { id: 1, name: 'Project Alpha', primarySource: 'DIRECT_WALKIN' },
            { id: 2, name: 'Project Beta', primarySource: 'REFERRAL' },
          ],
          total: 2,
        },
      };
      mockService.getPrimarySourceProjects.mockResolvedValue(mockResponse);

      const result = await controller.getPrimarySourceProjects(query);

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(2);
      expect(mockService.getPrimarySourceProjects).toHaveBeenCalledWith(
        'Project',
      );
    });

    it('should return projects without search term', async () => {
      const query: CommonFindAllQueryDto = {
        page: 1,
        limit: 10,
      } as any;
      const mockResponse = {
        success: true,
        message: 'Primary source projects retrieved successfully',
        data: {
          result: [{ id: 1, name: 'Project Alpha' }],
          total: 1,
        },
      };
      mockService.getPrimarySourceProjects.mockResolvedValue(mockResponse);

      const result = await controller.getPrimarySourceProjects(query);

      expect(result.success).toBe(true);
      expect(mockService.getPrimarySourceProjects).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('should handle empty results', async () => {
      const query: CommonFindAllQueryDto = {
        search: 'NonExistent',
      } as any;
      const mockResponse = {
        success: true,
        message: 'Primary source projects retrieved successfully',
        data: {
          result: [],
          total: 0,
        },
      };
      mockService.getPrimarySourceProjects.mockResolvedValue(mockResponse);

      const result = await controller.getPrimarySourceProjects(query);

      expect(result.data.result).toHaveLength(0);
      expect(mockService.getPrimarySourceProjects).toHaveBeenCalledWith(
        'NonExistent',
      );
    });

    it('should handle errors gracefully', async () => {
      const query: CommonFindAllQueryDto = {
        search: 'Project',
      } as any;
      const error = new Error('Database error');
      mockService.getPrimarySourceProjects.mockRejectedValue(error);

      await expect(controller.getPrimarySourceProjects(query)).rejects.toThrow(
        error,
      );
    });
  });

  describe('downloadPdf', () => {
    it('should download PDF successfully', async () => {
      const voucherId = 'VID-12345678';
      const mockResponse = {
        message: 'PDF exported successfully',
        data: {
          filePath: 'export/VID-12345678/eoi-form-PHL-BR-0100.pdf',
        },
      };
      mockService.downloadEoiFormPDF.mockResolvedValue(mockResponse);

      const result = await controller.downloadPdf(voucherId);

      expect(result.message).toBe('PDF exported successfully');
      expect(result.data.filePath).toContain('export/VID-12345678');
      expect(mockService.downloadEoiFormPDF).toHaveBeenCalledWith(voucherId);
    });

    it('should throw NotFoundException when voucher not found', async () => {
      const voucherId = 'VID-INVALID';
      mockService.downloadEoiFormPDF.mockRejectedValue(
        new NotFoundException('Voucher not found'),
      );

      await expect(controller.downloadPdf(voucherId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockService.downloadEoiFormPDF).toHaveBeenCalledWith(voucherId);
    });

    it('should handle PDF generation errors', async () => {
      const voucherId = 'VID-12345678';
      const error = new Error('PDF generation failed');
      mockService.downloadEoiFormPDF.mockRejectedValue(error);

      await expect(controller.downloadPdf(voucherId)).rejects.toThrow(error);
      expect(mockService.downloadEoiFormPDF).toHaveBeenCalledWith(voucherId);
    });

    it('should handle S3 upload errors', async () => {
      const voucherId = 'VID-12345678';
      const error = new Error('S3 upload failed');
      mockService.downloadEoiFormPDF.mockRejectedValue(error);

      await expect(controller.downloadPdf(voucherId)).rejects.toThrow(error);
    });
  });

  describe('fetchVoucherForMapping', () => {
    const queryDto = { campaignId: 160, search: 'PRID-001' };

    it('should return voucher matches from service', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Voucher(s) fetched successfully',
        data: [
          {
            id: 1,
            uniqueReferenceId: 'PRID-001',
            isMapped: false,
          },
        ],
      };
      mockService.fetchVoucherForMapping.mockResolvedValue(mockResponse);

      const result = await controller.fetchVoucherForMapping(queryDto as any);

      expect(result).toEqual(mockResponse);
      expect(mockService.fetchVoucherForMapping).toHaveBeenCalledWith(queryDto);
    });

    it('should propagate service errors', async () => {
      const error = new Error('Search failed');
      mockService.fetchVoucherForMapping.mockRejectedValue(error);

      await expect(
        controller.fetchVoucherForMapping(queryDto as any),
      ).rejects.toThrow(error);
    });
  });

  describe('mapAndConvert', () => {
    it('should map and convert unit successfully', async () => {
      const mockUser = { dbId: 1, name: 'Test User' };
      const mockDto = {
        voucherId: 123,
        unitNumber: 'U-101',
        sfdcTowerId: '0025564455dfs',
        towerName: 'AS',
        floor: 2,
        sfdcUnitId: 'a0025564455dfs',
      };
      const mockResponse = {
        success: true,
        message: 'Unit mapped successfully',
        data: { id: 123 },
      };
      mockService.mapAndConvert.mockResolvedValue(mockResponse);
      const result = await controller.mapAndConvert(mockUser, mockDto);
      expect(result).toEqual(mockResponse);
      expect(mockService.mapAndConvert).toHaveBeenCalledWith(mockUser, mockDto);
    });
    it('should handle errors', async () => {
      const mockUser = { dbId: 1 };
      const mockDto = {
        voucherId: 123,
        unitNumber: 'U-101',
        sfdcTowerId: '0025564455dfs',
        towerName: 'AS',
        floor: 2,
        sfdcUnitId: 'a0025564455dfs',
      };
      const error = new Error('Mapping failed');
      mockService.mapAndConvert.mockRejectedValue(error);
      await expect(controller.mapAndConvert(mockUser, mockDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('revertToEOI', () => {
    it('should revert unit mapping to EOI successfully', async () => {
      const mockUser = { dbId: 1 };
      const mockDto = { voucherId: 123 };
      const mockResponse = {
        success: true,
        message: 'Unit reverted successfully',
        data: { id: 123 },
      };
      mockService.revertToEOI.mockResolvedValue(mockResponse);
      const result = await controller.revertToEOI(mockUser, mockDto);
      expect(result).toEqual(mockResponse);
      expect(mockService.revertToEOI).toHaveBeenCalledWith(mockUser, mockDto);
    });
    it('should handle errors', async () => {
      const mockUser = { dbId: 1 };
      const mockDto = { voucherId: 123 };
      const error = new Error('Revert failed');
      mockService.revertToEOI.mockRejectedValue(error);
      await expect(controller.revertToEOI(mockUser, mockDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getInventoryByFloor', () => {
    it('should fetch inventory by floor successfully', async () => {
      const mockDto = { projectName: 'Project', tower: 'Tower1', floor: 5 };
      const mockResponse = {
        success: true,
        message: 'Inventory fetched successfully',
        data: [{ unitNumber: 'U-101' }],
      };
      mockService.getInventoryByFloor.mockResolvedValue(mockResponse);
      const result = await controller.getInventoryByFloor(mockDto);
      expect(result).toEqual(mockResponse);
      expect(mockService.getInventoryByFloor).toHaveBeenCalledWith(mockDto);
    });
    it('should handle errors', async () => {
      const mockDto = { projectName: 'Project', tower: 'Tower1', floor: 5 };
      const error = new Error('Inventory fetch failed');
      mockService.getInventoryByFloor.mockRejectedValue(error);
      await expect(controller.getInventoryByFloor(mockDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getFloorDropdown', () => {
    it('should fetch floor dropdown successfully', async () => {
      const mockDto = { projectName: 'Project', tower: 'Tower1' };
      const mockResponse = {
        success: true,
        message: 'Floor dropdown fetched successfully',
        data: [{ name: 5, value: 5 }],
      };
      mockService.getFloorDropdown.mockResolvedValue(mockResponse);
      const result = await controller.getFloorDropdown(mockDto);
      expect(result).toEqual(mockResponse);
      expect(mockService.getFloorDropdown).toHaveBeenCalledWith(mockDto);
    });
    it('should handle errors', async () => {
      const mockDto = { projectName: 'Project', tower: 'Tower1' };
      const error = new Error('Dropdown fetch failed');
      mockService.getFloorDropdown.mockRejectedValue(error);
      await expect(controller.getFloorDropdown(mockDto)).rejects.toThrow(error);
    });
  });

  describe('getEoiToConvert', () => {
    it('should fetch EOI to convert successfully', async () => {
      const id = 123;
      const mockResponse = {
        success: true,
        message: 'Voucher campaign details retrieved successfully',
        data: { campaignId: 1 },
      };
      mockService.getEoiToConvert.mockResolvedValue(mockResponse);
      const result = await controller.getEoiToConvert(id);
      expect(result).toEqual(mockResponse);
      expect(mockService.getEoiToConvert).toHaveBeenCalledWith(id);
    });
    it('should handle errors', async () => {
      const id = 123;
      const error = new Error('Fetch failed');
      mockService.getEoiToConvert.mockRejectedValue(error);
      await expect(controller.getEoiToConvert(id)).rejects.toThrow(error);
    });
  });

  describe('pushVouchersToSfdc', () => {
    it('should push vouchers to SFDC successfully', async () => {
      const mockUser = { dbId: 1 };
      const mockDto = { campaignId: 1, voucherId: 18, pushConverted: false };
      const mockResponse = {
        statusCode: 200,
        message: 'SFDC Lead Push Completed',
        data: { id: 1 },
      };
      mockService.pushVouchersToSfdc.mockResolvedValue(mockResponse);
      const result = await controller.pushVouchersToSfdc(mockUser, mockDto);
      expect(result).toEqual(mockResponse);
      expect(mockService.pushVouchersToSfdc).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
    });
    it('should handle errors', async () => {
      const mockUser = { dbId: 1 };
      const mockDto = { campaignId: 1, pushConverted: false };
      const error = new Error('Push failed');
      mockService.pushVouchersToSfdc.mockRejectedValue(error);
      await expect(
        controller.pushVouchersToSfdc(mockUser, mockDto),
      ).rejects.toThrow(error);
    });
  });

  describe('createVoucherChangeRequest', () => {
    const mockUser = { dbId: 1, name: 'Test User' };
    const mockDto: CreateVoucherChangeRequestDto = {
      voucherId: 123,
      currentData: {
        firstName: 'John',
        lastName: 'Doe',
        emailId: 'john@example.com',
        countryCode: '+91',
        contactNumber: '9876543210',
        primarySource: 'DIRECT_WALKIN',
      },
      newData: {
        firstName: 'Jane',
        lastName: 'Smith',
        emailId: 'jane@example.com',
        countryCode: '+91',
        contactNumber: '9876543211',
        primarySource: 'REFERRAL',
      },
      swappedFields: ['firstName', 'lastName', 'emailId', 'primarySource'],
      reason: 'Customer requested voucher change',
      changeSource: VoucherChangeEnum.SFDC,
    };

    it('should create voucher change request successfully (success + response time)', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change request created successfully',
        data: {
          id: 'uuid-123',
          voucherId: 123,
          status: VoucherChangeRequestStatus.REQUESTED,
          createdAt: new Date(),
        },
      };

      mockService.createVoucherChangeRequest.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.createVoucherChangeRequest(
        mockUser,
        mockDto,
      );
      const duration = Date.now() - start;

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.voucherId).toBe(123);
      expect(result.data.status).toBe(VoucherChangeRequestStatus.REQUESTED);
      expect(mockService.createVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should update existing voucher change request when id is provided', async () => {
      const updateDto: CreateVoucherChangeRequestDto = {
        ...mockDto,
        id: 'existing-uuid-123',
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change request updated successfully',
        data: {
          id: 'existing-uuid-123',
          voucherId: 123,
          status: VoucherChangeRequestStatus.REQUESTED,
        },
      };

      mockService.createVoucherChangeRequest.mockResolvedValue(mockResponse);

      const result = await controller.createVoucherChangeRequest(
        mockUser,
        updateDto,
      );

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.id).toBe('existing-uuid-123');
      expect(mockService.createVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        updateDto,
      );
    });

    it('should throw NotFoundException when voucher not found', async () => {
      mockService.createVoucherChangeRequest.mockRejectedValue(
        new NotFoundException('Voucher not found'),
      );

      await expect(
        controller.createVoucherChangeRequest(mockUser, mockDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockService.createVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
    });

    it('should throw BadRequestException when request is already approved/rejected', async () => {
      mockService.createVoucherChangeRequest.mockRejectedValue(
        new BadRequestException(
          'Cannot update voucher change request that is already approved or rejected',
        ),
      );

      await expect(
        controller.createVoucherChangeRequest(mockUser, {
          ...mockDto,
          id: 'existing-uuid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        ...mockDto,
        voucherId: -1,
      } as any;

      mockService.createVoucherChangeRequest.mockRejectedValue(
        new BadRequestException('Invalid input data'),
      );

      await expect(
        controller.createVoucherChangeRequest(mockUser, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getVoucherByPrid', () => {
    const mockQuery: GetVoucherByPridDto = {
      prid: 'PRID-123456',
      campaignId: 1,
    };

    it('should return voucher by PRID successfully (success + response time)', async () => {
      const mockResponse = {
        success: true,
        message: 'Voucher retrieved successfully',
        data: {
          id: 1,
          voucherId: 12345678,
          uniqueReferenceId: 'PHL-BR-0100',
          prid: 'PRID-123456',
        },
      };

      mockService.getVoucherByPrid.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getVoucherByPrid(mockQuery);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.data.prid).toBe('PRID-123456');
      expect(mockService.getVoucherByPrid).toHaveBeenCalledWith(mockQuery);
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should throw NotFoundException when voucher not found', async () => {
      mockService.getVoucherByPrid.mockRejectedValue(
        new NotFoundException('Voucher not found for this PRID and Campaign'),
      );

      await expect(controller.getVoucherByPrid(mockQuery)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockService.getVoucherByPrid).toHaveBeenCalledWith(mockQuery);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.getVoucherByPrid.mockRejectedValue(dbError);

      await expect(controller.getVoucherByPrid(mockQuery)).rejects.toThrow(
        dbError,
      );
      expect(mockService.getVoucherByPrid).toHaveBeenCalledWith(mockQuery);
    });

    it('should handle empty PRID', async () => {
      const emptyQuery = { prid: '', campaignId: 1 } as any;
      mockService.getVoucherByPrid.mockRejectedValue(
        new BadRequestException('PRID is required'),
      );

      await expect(controller.getVoucherByPrid(emptyQuery)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVoucherChangeRequest', () => {
    const mockQuery: GetVoucherChangeRequestDto = {
      voucherId: 123,
      id: 'uuid-123',
    };

    it('should return voucher change request with history successfully (success + response time)', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change request retrieved successfully',
        data: {
          request: {
            id: 'uuid-123',
            voucherId: 123,
            status: VoucherChangeRequestStatus.REQUESTED,
            createdAt: new Date(),
          },
          history: [
            {
              id: 'uuid-122',
              voucherId: 123,
              status: VoucherChangeRequestStatus.APPROVED,
              createdAt: new Date('2025-01-01'),
            },
          ],
        },
      };

      mockService.getVoucherChangeRequest.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.getVoucherChangeRequest(mockQuery);
      const duration = Date.now() - start;

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.request.id).toBe('uuid-123');
      expect(result.data.history).toHaveLength(1);
      expect(mockService.getVoucherChangeRequest).toHaveBeenCalledWith(
        mockQuery,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return only history when id is not provided', async () => {
      const queryWithoutId: GetVoucherChangeRequestDto = {
        voucherId: 123,
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change request history retrieved successfully',
        data: {
          history: [
            {
              id: 'uuid-123',
              voucherId: 123,
              status: VoucherChangeRequestStatus.REQUESTED,
              createdAt: new Date(),
            },
            {
              id: 'uuid-122',
              voucherId: 123,
              status: VoucherChangeRequestStatus.APPROVED,
              createdAt: new Date('2025-01-01'),
            },
          ],
        },
      };

      mockService.getVoucherChangeRequest.mockResolvedValue(mockResponse);

      const result = await controller.getVoucherChangeRequest(queryWithoutId);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.history).toHaveLength(2);
      expect(result.data.request).toBeUndefined();
      expect(mockService.getVoucherChangeRequest).toHaveBeenCalledWith(
        queryWithoutId,
      );
    });

    it('should throw NotFoundException when voucher change request not found', async () => {
      mockService.getVoucherChangeRequest.mockRejectedValue(
        new NotFoundException('Voucher change request not found'),
      );

      await expect(
        controller.getVoucherChangeRequest(mockQuery),
      ).rejects.toThrow(NotFoundException);
      expect(mockService.getVoucherChangeRequest).toHaveBeenCalledWith(
        mockQuery,
      );
    });

    it('should throw NotFoundException when voucher not found', async () => {
      mockService.getVoucherChangeRequest.mockRejectedValue(
        new NotFoundException('Voucher not found'),
      );

      await expect(
        controller.getVoucherChangeRequest(mockQuery),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle validation errors', async () => {
      const invalidQuery = {
        voucherId: -1,
      } as any;

      mockService.getVoucherChangeRequest.mockRejectedValue(
        new BadRequestException('Invalid voucher ID'),
      );

      await expect(
        controller.getVoucherChangeRequest(invalidQuery),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listVoucherChangeRequests', () => {
    const mockQuery: CommonFindAllQueryDto = {
      page: 1,
      limit: 10,
      search: 'PHL-BR-0100',
      sortBy: 'createdAt',
    };

    it('should return list of voucher change requests successfully (success + response time)', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change requests retrieved successfully',
        data: {
          result: [
            {
              id: 'uuid-123',
              voucherId: 123,
              uniqueReferenceId: 'PHL-BR-0100',
              paidVoucherId: 'VID-12345678',
              sfdcEnquiryId: 'ENQ-123',
              primarySource: 'DIRECT_WALKIN',
              customerName: 'John Doe',
              campaignName: 'Test Campaign',
              requestedDate: new Date(),
              reviewedDate: null,
              status: VoucherChangeRequestStatus.REQUESTED,
            },
            {
              id: 'uuid-124',
              voucherId: 124,
              uniqueReferenceId: 'PHL-BR-0101',
              paidVoucherId: 'VID-12345679',
              sfdcEnquiryId: 'ENQ-124',
              primarySource: 'REFERRAL',
              customerName: 'Jane Smith',
              campaignName: 'Test Campaign',
              requestedDate: new Date('2025-01-01'),
              reviewedDate: new Date('2025-01-02'),
              status: VoucherChangeRequestStatus.APPROVED,
            },
          ],
          page: 1,
          total: 2,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVoucherChangeRequests.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.listVoucherChangeRequests(mockQuery);
      const duration = Date.now() - start;

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.result).toHaveLength(2);
      expect(result.data.result[0].uniqueReferenceId).toBe('PHL-BR-0100');
      expect(result.data.result[1].status).toBe(
        VoucherChangeRequestStatus.APPROVED,
      );
      expect(mockService.listVoucherChangeRequests).toHaveBeenCalledWith(
        mockQuery,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should return empty array when no voucher change requests exist', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change requests retrieved successfully',
        data: {
          result: [],
          page: 1,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockService.listVoucherChangeRequests.mockResolvedValue(mockResponse);

      const result = await controller.listVoucherChangeRequests(mockQuery);

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.data.result).toHaveLength(0);
      expect(result.data.total).toBe(0);
      expect(mockService.listVoucherChangeRequests).toHaveBeenCalledWith(
        mockQuery,
      );
    });

    it('should handle pagination correctly', async () => {
      const paginatedQuery: CommonFindAllQueryDto = {
        page: 2,
        limit: 5,
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change requests retrieved successfully',
        data: {
          result: [],
          page: 2,
          total: 10,
          pageSize: 5,
          pageCount: 2,
        },
      };

      mockService.listVoucherChangeRequests.mockResolvedValue(mockResponse);

      const result = await controller.listVoucherChangeRequests(paginatedQuery);

      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(5);
      expect(result.data.pageCount).toBe(2);
      expect(mockService.listVoucherChangeRequests).toHaveBeenCalledWith(
        paginatedQuery,
      );
    });

    it('should handle search functionality', async () => {
      const searchQuery: CommonFindAllQueryDto = {
        search: 'VID-12345678',
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change requests retrieved successfully',
        data: {
          result: [
            {
              id: 'uuid-123',
              paidVoucherId: 'VID-12345678',
              uniqueReferenceId: 'PHL-BR-0100',
            },
          ],
          page: 1,
          total: 1,
          pageSize: 10,
          pageCount: 1,
        },
      };

      mockService.listVoucherChangeRequests.mockResolvedValue(mockResponse);

      const result = await controller.listVoucherChangeRequests(searchQuery);

      expect(result.data.result).toHaveLength(1);
      expect(result.data.result[0].paidVoucherId).toBe('VID-12345678');
      expect(mockService.listVoucherChangeRequests).toHaveBeenCalledWith(
        searchQuery,
      );
    });

    it('should handle sorting by uniqueReferenceId', async () => {
      const sortedQuery: CommonFindAllQueryDto = {
        sortBy: 'voucher.uniqueReferenceId',
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change requests retrieved successfully',
        data: {
          result: [],
          page: 1,
          total: 0,
          pageSize: 10,
          pageCount: 0,
        },
      };

      mockService.listVoucherChangeRequests.mockResolvedValue(mockResponse);

      await controller.listVoucherChangeRequests(sortedQuery);

      expect(mockService.listVoucherChangeRequests).toHaveBeenCalledWith(
        sortedQuery,
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockService.listVoucherChangeRequests.mockRejectedValue(dbError);

      await expect(
        controller.listVoucherChangeRequests(mockQuery),
      ).rejects.toThrow(dbError);
      expect(mockService.listVoucherChangeRequests).toHaveBeenCalledWith(
        mockQuery,
      );
    });
  });

  describe('approveVoucherChangeRequest', () => {
    const mockUser = { dbId: 1, name: 'MIS User', role: RolesEnum.MIS };
    const mockDto: ApproveVoucherChangeRequestDto = {
      id: 'uuid-123',
      voucherId: 123,
      status: VoucherChangeRequestStatus.APPROVED,
      approvalProof: 'Approval document URL',
      remark: 'Approved after verification',
    };

    it('should approve voucher change request successfully (success + response time)', async () => {
      const mockResponse = {
        statusCode: SUCCESS,
        message:
          'Voucher change request approved and voucher updated successfully',
        data: null,
      };

      mockService.approveVoucherChangeRequest.mockResolvedValue(mockResponse);

      const start = Date.now();
      const result = await controller.approveVoucherChangeRequest(
        mockUser,
        mockDto,
      );
      const duration = Date.now() - start;

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toContain('approved');
      expect(mockService.approveVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
      expect(duration).toBeLessThan(TEST_EXECUTION_TIME);
    });

    it('should reject voucher change request successfully', async () => {
      const rejectDto: ApproveVoucherChangeRequestDto = {
        id: 'uuid-123',
        voucherId: 123,
        status: VoucherChangeRequestStatus.REJECTED,
        remark: 'Rejected due to insufficient documentation',
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change request rejected successfully',
        data: null,
      };

      mockService.approveVoucherChangeRequest.mockResolvedValue(mockResponse);

      const result = await controller.approveVoucherChangeRequest(
        mockUser,
        rejectDto,
      );

      expect(result.statusCode).toBe(SUCCESS);
      expect(result.message).toContain('rejected');
      expect(mockService.approveVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        rejectDto,
      );
    });

    it('should throw NotFoundException when voucher change request not found', async () => {
      mockService.approveVoucherChangeRequest.mockRejectedValue(
        new NotFoundException('Voucher change request not found'),
      );

      await expect(
        controller.approveVoucherChangeRequest(mockUser, mockDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockService.approveVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
    });

    it('should throw BadRequestException when request is already approved/rejected', async () => {
      mockService.approveVoucherChangeRequest.mockRejectedValue(
        new BadRequestException('Voucher change request is already Approved'),
      );

      await expect(
        controller.approveVoucherChangeRequest(mockUser, mockDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.approveVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
    });

    it('should throw BadRequestException when voucher does not match', async () => {
      mockService.approveVoucherChangeRequest.mockRejectedValue(
        new BadRequestException(
          'Voucher change request does not belong to the provided voucher',
        ),
      );

      await expect(
        controller.approveVoucherChangeRequest(mockUser, mockDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        id: 'invalid-uuid',
        voucherId: -1,
        status: 'INVALID_STATUS',
      } as any;

      mockService.approveVoucherChangeRequest.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(
        controller.approveVoucherChangeRequest(mockUser, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle database transaction errors', async () => {
      const transactionError = new Error('Database transaction failed');
      mockService.approveVoucherChangeRequest.mockRejectedValue(
        transactionError,
      );

      await expect(
        controller.approveVoucherChangeRequest(mockUser, mockDto),
      ).rejects.toThrow(transactionError);
      expect(mockService.approveVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        mockDto,
      );
    });

    it('should handle approval without approvalProof when status is APPROVED', async () => {
      const dtoWithoutProof: ApproveVoucherChangeRequestDto = {
        id: 'uuid-123',
        voucherId: 123,
        status: VoucherChangeRequestStatus.APPROVED,
        remark: 'Approved without proof',
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message:
          'Voucher change request approved and voucher updated successfully',
        data: null,
      };

      mockService.approveVoucherChangeRequest.mockResolvedValue(mockResponse);

      const result = await controller.approveVoucherChangeRequest(
        mockUser,
        dtoWithoutProof,
      );

      expect(result.statusCode).toBe(SUCCESS);
      expect(mockService.approveVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        dtoWithoutProof,
      );
    });

    it('should handle rejection without remark', async () => {
      const rejectDto: ApproveVoucherChangeRequestDto = {
        id: 'uuid-123',
        voucherId: 123,
        status: VoucherChangeRequestStatus.REJECTED,
      };

      const mockResponse = {
        statusCode: SUCCESS,
        message: 'Voucher change request rejected successfully',
        data: null,
      };

      mockService.approveVoucherChangeRequest.mockResolvedValue(mockResponse);

      const result = await controller.approveVoucherChangeRequest(
        mockUser,
        rejectDto,
      );

      expect(result.statusCode).toBe(SUCCESS);
      expect(mockService.approveVoucherChangeRequest).toHaveBeenCalledWith(
        mockUser,
        rejectDto,
      );
    });
  });
});
