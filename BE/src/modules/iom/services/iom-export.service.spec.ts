import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { resolveExportColumns } from 'src/constants/iom-export.columns';
import { generateExcelBuffer } from 'src/common/helpers/excel.helper';
import { CustomConfigService } from 'src/config/custom-config.service';
import { formatDateUtil } from 'src/helpers/date.helper';
import { AwsService } from 'src/modules/aws/aws.service';
import { RolesEnum } from 'src/enums/roles.enum';
import { IomExportService } from './iom-export.service';
import { IomListingService } from './iom-listing.service';
import { AuthenticatedUser } from './iom-validation.service';
import { ExportIomExcelDto } from '../dto/export-iom-excel.dto';
import { fromExportIomExcelDto } from '../mappers/iom-listing-filters.mapper';
import { IomListItem } from '../types/iom-list-item.interface';

jest.mock('src/common/helpers/excel.helper', () => ({
  generateExcelBuffer: jest.fn(),
}));

jest.mock('src/helpers/date.helper', () => ({
  formatDateUtil: jest.fn(),
}));

const CRM_USER: AuthenticatedUser = {
  dbId: 7,
  email: 'crm@example.test',
  role: RolesEnum.CRM,
  crmProjects: [10],
};

const CRM_TL_USER: AuthenticatedUser = {
  ...CRM_USER,
  role: RolesEnum.CRM_TL,
};

const SAMPLE_ITEM: IomListItem = {
  id: 1,
  bookingId: 100,
  projectId: 10,
  projectName: 'Tower One',
  unitNo: 'A-1201',
  customerName: 'Jane Doe',
  saleValue: 5_000_000,
  saleValueCollectedPercentage: null,
  saleValueAmountCollected: null,
  brokeragePercentage: 2.5,
  totalBrokerageAmount: 125_000,
  referrerPoints: 75_000,
  refereePoints: 50_000,
  referralPointsEdited: false,
  referralClassification: 'CLASS_A',
  statusCode: 'IOM_CREATED',
  statusLabel: 'IOM Created',
  iomCreatedAt: new Date('2026-01-15T10:00:00Z'),
  createdAt: new Date('2026-01-15T10:00:00Z'),
  iomPdfAvailable: true,
  pdfBasePath: '',
  pdflink: null,
  crmCreatedByName: null,
  crmVerifiedBy: null,
  crmVerifiedByName: null,
  crmApprovedByName: null,
  financeVerifiedByName: null,
  financeApprovedByName: null,
  pointsAllottedByName: null,
  loyaltyPointClassification: null,
  thresholdPaymentReceivedAt: null,
  referralPointsEditedAt: null,
  invoiceNumber: null,
  invoiceStatus: null,
  invoiceRequestedAt: null,
  invoiceDate: null,
  invoiceCreatedBy: null,
  invoiceUpdatedBy: null,
  invoiceCreatedAt: null,
  invoiceUpdatedAt: null,
  iomNo: 'IOM-001',
  invoiceReqNumber: null,
  pointsUpdatedAt: null,
  referralPointsAdjustment: null,
  referralSplitType: null,
  referralSplitRatio: null,
  salesOrderId: null,
  ageing: 0,
};

describe('IomExportService', () => {
  let service: IomExportService;
  const iomListingService = { findIoms: jest.fn() };
  const awsService = { uploadToS3: jest.fn() };
  const configService = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    (generateExcelBuffer as jest.Mock).mockResolvedValue(Buffer.from('excel'));
    (formatDateUtil as jest.Mock).mockImplementation((date, mode) => {
      if (mode === 'timestamp') return '18Jun_2-30PM';
      if (date instanceof Date) return '15 Jan 2026';
      return '';
    });
    configService.get.mockReturnValue('https://cdn.example.com/puravankara/');
    iomListingService.findIoms.mockResolvedValue({ items: [SAMPLE_ITEM] });
    awsService.uploadToS3.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IomExportService,
        { provide: IomListingService, useValue: iomListingService },
        { provide: AwsService, useValue: awsService },
        { provide: CustomConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(IomExportService);
  });

  it('exports with role-based columns by default and uploads to S3', async () => {
    const result = await service.exportToExcel(CRM_USER, {});

    expect(iomListingService.findIoms).toHaveBeenCalledWith(
      CRM_USER,
      {},
      { skipPagination: true, skipCounts: true },
    );
    expect(generateExcelBuffer).toHaveBeenCalledWith(
      resolveExportColumns(undefined, RolesEnum.CRM),
      expect.any(Array),
      'IOM Export',
    );
    expect(awsService.uploadToS3).toHaveBeenCalledWith(
      'exports/iom-list-18Jun_2-30PM.xlsx',
      expect.anything(),
      true,
    );
    expect(result).toEqual({
      data: {
        fileUrl: 'exports/iom-list-18Jun_2-30PM.xlsx',
        baseUrl: 'https://cdn.example.com/puravankara/',
      },
    });
  });

  it('forwards normalized listing filters to findIoms', async () => {
    const dto = {
      search: 'jane',
      iomStatus: ['CRM_TL_APPROVAL_PENDING'],
      invoiceStatus: ['1', '2'],
      projects: [10],
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
    } as unknown as ExportIomExcelDto;

    await service.exportToExcel(CRM_USER, dto);

    expect(iomListingService.findIoms).toHaveBeenCalledWith(
      CRM_USER,
      fromExportIomExcelDto(dto),
      { skipPagination: true, skipCounts: true },
    );
  });

  it('filters columns when fields are provided', async () => {
    await service.exportToExcel(CRM_TL_USER, {
      fields: ['iomNo', 'projectName', 'statusLabel'],
    });

    expect(generateExcelBuffer).toHaveBeenCalledWith(
      [
        expect.objectContaining({ key: 'iomNo' }),
        expect.objectContaining({ key: 'projectName' }),
        expect.objectContaining({ key: 'statusLabel' }),
      ],
      expect.any(Array),
      'IOM Export',
    );
  });

  it('omits role-disallowed fields without error', async () => {
    await service.exportToExcel(CRM_TL_USER, {
      fields: ['financeApprovedByName', 'iomNo'],
    });

    expect(generateExcelBuffer).toHaveBeenCalledWith(
      [expect.objectContaining({ key: 'iomNo' })],
      expect.any(Array),
      'IOM Export',
    );
  });

  it('throws BadRequestException for unknown fields', async () => {
    await expect(
      service.exportToExcel(CRM_USER, { fields: ['notAField'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(generateExcelBuffer).not.toHaveBeenCalled();
  });

  it('still uploads when export list is empty', async () => {
    iomListingService.findIoms.mockResolvedValueOnce({ items: [] });

    await service.exportToExcel(CRM_USER, {});

    expect(generateExcelBuffer).toHaveBeenCalledWith(
      resolveExportColumns(undefined, RolesEnum.CRM),
      [],
      'IOM Export',
    );
    expect(awsService.uploadToS3).toHaveBeenCalled();
  });

  it('throws InternalServerErrorException when Excel generation fails', async () => {
    (generateExcelBuffer as jest.Mock).mockRejectedValueOnce(
      new Error('excel failed'),
    );

    await expect(service.exportToExcel(CRM_USER, {})).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
