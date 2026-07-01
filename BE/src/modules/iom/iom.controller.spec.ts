import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { IomController } from './iom.controller';
import { IomCrmService } from './services/iom-crm.service';
import { IomEligibilityService } from './services/iom-eligibility.service';
import { IomListingService } from './services/iom-listing.service';
import { IomExportService } from './services/iom-export.service';
import { IomLoyaltyDetailsService } from './services/iom-loyalty-details.service';
import { IomLoyaltyUploadService } from './services/iom-loyalty-upload.service';
import { IomAgeingService } from './services/iom-ageing.service';
import { IomRejectService } from './services/iom-reject.service';
import { IomApproveService } from './services/iom-approve.service';
import { IomCancelService } from './services/iom-cancel.service';
import { IomAssignmentService } from './services/iom-assignment.service';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { RolesEnum } from 'src/enums/roles.enum';
import { AuthenticatedUser } from './services/iom-validation.service';
import { LoyaltyPointsUploadActionEnum } from './dto/upload-loyalty-points.dto';

const CRM_USER: AuthenticatedUser = {
  dbId: 7,
  email: 'crm@example.test',
  role: RolesEnum.CRM,
  crmProjects: [10],
};

describe('IomController', () => {
  let controller: IomController;
  const eligibilityService = { findEligible: jest.fn() };
  const iomListingService = { findIoms: jest.fn() };
  const iomExportService = { exportToExcel: jest.fn() };
  const loyaltyDetailsService = { getLoyaltyDetails: jest.fn() };
  const loyaltyUploadService = { uploadLoyaltyPoints: jest.fn() };
  const ageingService = { getAgeingTimeline: jest.fn() };
  const crmService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IomController],
      providers: [
        { provide: IomCrmService, useValue: crmService },
        { provide: IomEligibilityService, useValue: eligibilityService },
        { provide: IomListingService, useValue: iomListingService },
        { provide: IomExportService, useValue: iomExportService },
        { provide: IomLoyaltyDetailsService, useValue: loyaltyDetailsService },
        { provide: IomLoyaltyUploadService, useValue: loyaltyUploadService },
        { provide: IomAgeingService, useValue: ageingService },
        { provide: IomRejectService, useValue: {} },
        { provide: IomApproveService, useValue: {} },
        { provide: IomCancelService, useValue: {} },
        { provide: IomAssignmentService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    })
      .overrideGuard(RmAdminAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(IomController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('delegates to IomListingService', async () => {
      const expected = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      iomListingService.findIoms.mockResolvedValue(expected);

      const result = await controller.list(CRM_USER, { listType: 'ioms' });

      expect(iomListingService.findIoms).toHaveBeenCalledWith(CRM_USER, {
        listType: 'ioms',
      });
      expect(result).toEqual({ data: expected });
    });

    it('passes through Loyalty counts inside data', async () => {
      const expected = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        counts: {
          iomRequestInvoice: 2,
          pendingSubmission: 3,
          submittedInvoice: 1,
        },
      };
      iomListingService.findIoms.mockResolvedValue(expected);

      const loyaltyUser: AuthenticatedUser = {
        ...CRM_USER,
        role: RolesEnum.LOYALTY,
      };
      const result = await controller.list(loyaltyUser, {
        listType: 'pendingSubmission',
      });

      expect(result).toEqual({ data: expected });
    });
  });

  describe('exportExcel', () => {
    it('delegates to IomExportService', async () => {
      const expected = {
        data: {
          fileUrl: 'exports/iom-list-18Jun_2-30PM.xlsx',
          baseUrl: 'https://cdn.example.com/puravankara/',
        },
      };
      iomExportService.exportToExcel.mockResolvedValue(expected);

      const result = await controller.exportExcel(CRM_USER, {
        fields: ['iomNo', 'projectName'],
      });

      expect(iomExportService.exportToExcel).toHaveBeenCalledWith(CRM_USER, {
        fields: ['iomNo', 'projectName'],
      });
      expect(result).toBe(expected);
    });
  });

  describe('getLoyaltyDetails', () => {
    it('delegates to IomLoyaltyDetailsService and returns data envelope', async () => {
      const expected = {
        refereeDetails: { customerName: 'Referee' },
        referrerDetails: { customerName: 'Referrer' },
        paymentDetails: { saleValue: 1 },
      };
      loyaltyDetailsService.getLoyaltyDetails.mockResolvedValue(expected);

      const result = await controller.getLoyaltyDetails(CRM_USER, 42);

      expect(loyaltyDetailsService.getLoyaltyDetails).toHaveBeenCalledWith(
        CRM_USER,
        42,
      );
      expect(result).toEqual({ data: expected });
    });
  });

  describe('uploadLoyaltyPoints', () => {
    it('delegates to IomLoyaltyUploadService and returns data envelope', async () => {
      const dto = {
        loyaltyPointsReleaseType: LoyaltyPointsUploadActionEnum.ELIGIBLE,
      };
      const expected = {
        iomId: '42',
        loyaltyPointsReleaseType: 'ELIGIBLE',
        loyaltyPointsReleaseStatus: 'ELIGIBLE',
        message: 'ok',
      };
      loyaltyUploadService.uploadLoyaltyPoints.mockResolvedValue(expected);

      const loyaltyUser: AuthenticatedUser = {
        ...CRM_USER,
        role: RolesEnum.LOYALTY,
      };
      const result = await controller.uploadLoyaltyPoints(loyaltyUser, 42, dto);

      expect(loyaltyUploadService.uploadLoyaltyPoints).toHaveBeenCalledWith(
        loyaltyUser,
        42,
        dto,
      );
      expect(result).toEqual({ data: expected });
    });

    it('restricts upload route to LOYALTY, ADMIN, and SUPER_ADMIN roles only', () => {
      const roles: string[] = Reflect.getMetadata(
        'roles',
        IomController.prototype.uploadLoyaltyPoints,
      );

      expect(roles).toEqual([
        RolesEnum.LOYALTY,
        RolesEnum.ADMIN,
        RolesEnum.SUPER_ADMIN,
      ]);
      expect(roles).not.toContain(RolesEnum.CRM);
      expect(roles).not.toContain(RolesEnum.FINANCE_USER);
    });
  });
  describe('getAgeingTimeline', () => {
    it('delegates to IomAgeingService and returns data envelope', async () => {
      const expected = {
        summary: {
          iomId: 42,
          currentStage: 'CRM_TL_APPROVAL_PENDING',
        },
        timeline: [
          {
            statusId: 1,
            status: 'IOM_TO_BE_CREATED',
            isCurrentStage: false,
          },
        ],
      };
      ageingService.getAgeingTimeline.mockResolvedValue(expected);

      const result = await controller.getAgeingTimeline(CRM_USER, 42);

      expect(ageingService.getAgeingTimeline).toHaveBeenCalledWith(
        CRM_USER,
        42,
      );
      expect(result).toEqual({ data: expected });
    });
  });

  describe('validation pipe settings', () => {
    it('rejects unknown query keys on ListIomListingDto', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      });

      await expect(
        pipe.transform(
          { page: 1, unknownKey: 'x' },
          {
            type: 'query',
            metatype: (await import('./dto/list-iom-listing.dto'))
              .ListIomListingDto,
          },
        ),
      ).rejects.toThrow();
    });
  });
});
