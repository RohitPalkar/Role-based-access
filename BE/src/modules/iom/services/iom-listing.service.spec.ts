import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { IomListingService } from './iom-listing.service';
import { IomLoyaltyCountsCacheService } from './iom-loyalty-counts-cache.service';
import { Iom } from '../entities/iom.entity';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { ListIomListingDto } from '../dto/list-iom-listing.dto';
import { fromListIomListingDto } from '../mappers/iom-listing-filters.mapper';
import { RolesEnum } from 'src/enums/roles.enum';
import { AuthenticatedUser } from './iom-validation.service';
import { ProjectUserMapping } from 'src/entities';

const CRM_USER: AuthenticatedUser = {
  dbId: 7,
  email: 'crm@example.test',
  role: RolesEnum.CRM,
  crmProjects: [10, 11],
};

/**
 * Build the minimal `project_user_mapping` row shape needed by
 * `IomListingService.resolveUserProjects`. Only `project.id` and the
 * `removedAt` timestamp are read.
 */
const makeMapping = (projectId: number): ProjectUserMapping =>
  ({
    project: { id: projectId },
  }) as unknown as ProjectUserMapping;

const makeIom = (overrides: Partial<Iom> = {}): Iom =>
  ({
    id: 1,
    bookingId: 100,
    projectId: 10,
    salePrice: 5_000_000,
    brokeragePercentage: 2.5,
    totalBrokerageAmount: 125_000,
    referrerPoints: 75_000,
    refereePoints: 50_000,
    referralPointsEdited: false,
    referralClassification: 'CLASS_A',
    loyaltyPointClassification: 'CLASS_A',
    customerDetails: null,
    submittedAt: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    iomPdf: 's3://bucket/iom.pdf',
    status: {
      code: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
      label: 'CRM TL Approval Pending',
    },
    booking: {
      customerName: 'Jane Doe',
      propertyNumber: 'A-1201',
      bookingId: 'BK-100',
    },
    project: { name: 'Tower One' },
    salesOrderId: 'SO-12345',
    ...overrides,
  }) as Iom;

describe('IomListingService', () => {
  let service: IomListingService;
  let listingQb: jest.Mocked<SelectQueryBuilder<Iom>>;
  let countQb: jest.Mocked<SelectQueryBuilder<Iom>>;
  let mappingRepo: jest.Mocked<Pick<Repository<ProjectUserMapping>, 'find'>>;
  let loyaltyCountsCache: jest.Mocked<
    Pick<IomLoyaltyCountsCacheService, 'getCounts'>
  >;
  let qbCallIndex: number;

  const LOYALTY_USER: AuthenticatedUser = {
    ...CRM_USER,
    role: RolesEnum.LOYALTY,
  };

  const makeCountQb = () =>
    ({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        iomRequestInvoice: '2',
        pendingSubmission: '3',
        submittedInvoice: '1',
      }),
    }) as unknown as jest.Mocked<SelectQueryBuilder<Iom>>;

  beforeEach(async () => {
    qbCallIndex = 0;
    listingQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([makeIom()]),
      getManyAndCount: jest.fn().mockResolvedValue([[makeIom()], 1]),
    } as unknown as jest.Mocked<SelectQueryBuilder<Iom>>;
    countQb = makeCountQb();

    const repo = {
      createQueryBuilder: jest.fn().mockImplementation(() => {
        return qbCallIndex++ % 2 === 0 ? listingQb : countQb;
      }),
    } as unknown as Repository<Iom>;

    mappingRepo = {
      find: jest.fn().mockResolvedValue([makeMapping(10), makeMapping(11)]),
    } as unknown as jest.Mocked<Pick<Repository<ProjectUserMapping>, 'find'>>;

    loyaltyCountsCache = {
      getCounts: jest.fn(async (_scope, compute) => compute()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IomListingService,
        { provide: getRepositoryToken(Iom), useValue: repo },
        {
          provide: getRepositoryToken(ProjectUserMapping),
          useValue: mappingRepo,
        },
        {
          provide: IomLoyaltyCountsCacheService,
          useValue: loyaltyCountsCache,
        },
      ],
    }).compile();

    service = module.get(IomListingService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns empty result when user has no project mappings', async () => {
    mappingRepo.find.mockResolvedValueOnce([]);

    const result = await service.findIoms(CRM_USER, {});

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    expect(listingQb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('scopes query to projects resolved from project_user_mapping', async () => {
    await service.findIoms(CRM_USER, {});

    expect(mappingRepo.find).toHaveBeenCalledWith({
      where: {
        user: { id: CRM_USER.dbId },
        removedAt: expect.anything(),
      },
      relations: ['project'],
    });
    expect(listingQb.where).toHaveBeenCalledWith(
      'i.projectId IN (:...crmProjects)',
      {
        crmProjects: [10, 11],
      },
    );
  });

  it('de-duplicates project ids when the same user maps to a project under multiple roles', async () => {
    mappingRepo.find.mockResolvedValueOnce([
      makeMapping(10),
      makeMapping(10),
      makeMapping(11),
    ]);

    await service.findIoms(CRM_USER, {});

    expect(listingQb.where).toHaveBeenCalledWith(
      'i.projectId IN (:...crmProjects)',
      {
        crmProjects: [10, 11],
      },
    );
  });

  it('applies search filter', async () => {
    await service.findIoms(CRM_USER, { search: 'jane' });

    expect(listingQb.andWhere).toHaveBeenCalledWith(
      '( booking.propertyNumber LIKE :like OR project.name LIKE :like OR i.iomNo LIKE :like)',
      { like: '%jane%' },
    );
  });

  it('throws BadRequestException for invalid iomStatus', async () => {
    await expect(
      service.findIoms(CRM_USER, {
        iomStatus: 'NOT_A_STATUS',
      } as unknown as ListIomListingDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(listingQb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('filters by valid iomStatus code', async () => {
    await service.findIoms(CRM_USER, {
      iomStatus: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
    } as unknown as ListIomListingDto);

    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'status.code IN (:...effectiveStatuses)',
      {
        effectiveStatuses: [IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING],
      },
    );
  });

  it('applies CRM_HEAD role status bucket filter', async () => {
    const crmHeadUser: AuthenticatedUser = {
      ...CRM_USER,
      role: RolesEnum.CRM_HEAD,
    };

    await service.findIoms(crmHeadUser, {});

    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'status.code IN (:...effectiveStatuses)',
      expect.objectContaining({
        effectiveStatuses: expect.arrayContaining([
          IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING,
          IomStatusCodeEnum.CRM_HEAD_REJECTED,
        ]),
      }),
    );
  });

  it('applies LOYALTY role status bucket filter', async () => {
    const loyaltyUser: AuthenticatedUser = {
      ...CRM_USER,
      role: RolesEnum.LOYALTY,
    };

    await service.findIoms(loyaltyUser, {});

    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'status.code IN (:...effectiveStatuses)',
      {
        effectiveStatuses: [
          IomStatusCodeEnum.POINTS_TO_BE_UPLOADED,
          IomStatusCodeEnum.POINTS_UPLOADED,
          IomStatusCodeEnum.INVOICE_SUBMITTED,
          IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR,
          IomStatusCodeEnum.IOM_CLOSED,
        ],
      },
    );
  });

  it('findAllForExport delegates to findIoms with skipPagination and skipCounts', async () => {
    const findIomsSpy = jest.spyOn(service, 'findIoms');

    const items = await service.findAllForExport(CRM_USER, {
      search: 'jane',
    });

    expect(findIomsSpy).toHaveBeenCalledWith(
      CRM_USER,
      { search: 'jane' },
      {
        skipPagination: true,
        skipCounts: true,
      },
    );
    findIomsSpy.mockRestore();

    expect(listingQb.skip).not.toHaveBeenCalled();
    expect(listingQb.take).not.toHaveBeenCalled();
    expect(listingQb.getMany).toHaveBeenCalled();
    expect(listingQb.getManyAndCount).not.toHaveBeenCalled();
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      '( booking.propertyNumber LIKE :like OR project.name LIKE :like OR i.iomNo LIKE :like)',
      { like: '%jane%' },
    );
    expect(items).toHaveLength(1);
    expect(items[0].projectName).toBe('Tower One');
  });

  it('findIoms with skipPagination applies filters without pagination', async () => {
    await service.findIoms(
      CRM_USER,
      {
        search: 'tower',
        iomStatus: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        invoiceStatus: 1,
      } as unknown as ListIomListingDto,
      { skipPagination: true },
    );

    expect(listingQb.skip).not.toHaveBeenCalled();
    expect(listingQb.take).not.toHaveBeenCalled();
    expect(listingQb.getMany).toHaveBeenCalled();
    expect(listingQb.getManyAndCount).not.toHaveBeenCalled();
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      '( booking.propertyNumber LIKE :like OR project.name LIKE :like OR i.iomNo LIKE :like)',
      { like: '%tower%' },
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'i.submittedAt >= :startDate',
      expect.objectContaining({ startDate: expect.any(Date) }),
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'inv.status IN (:...invoiceStatuses)',
      {
        invoiceStatuses: ['1'],
      },
    );
  });

  it('scopes query to a single authorized project filter', async () => {
    await service.findIoms(CRM_USER, {
      projects: [10],
    } as unknown as ListIomListingDto);

    expect(listingQb.where).toHaveBeenCalledWith(
      'i.projectId IN (:...crmProjects)',
      {
        crmProjects: [10],
      },
    );
  });

  it('intersects projects filter with authorized projects', async () => {
    await service.findIoms(CRM_USER, {
      projects: [10, 99],
    } as unknown as ListIomListingDto);

    expect(listingQb.where).toHaveBeenCalledWith(
      'i.projectId IN (:...crmProjects)',
      {
        crmProjects: [10],
      },
    );
  });

  it('returns empty result for unauthorized project filter without querying', async () => {
    const result = await service.findIoms(CRM_USER, {
      projects: [999],
    } as unknown as ListIomListingDto);

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    expect(listingQb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('deduplicates project filter values', async () => {
    await service.findIoms(CRM_USER, {
      projects: [10, 10, 11],
    } as unknown as ListIomListingDto);

    expect(listingQb.where).toHaveBeenCalledWith(
      'i.projectId IN (:...crmProjects)',
      {
        crmProjects: [10, 11],
      },
    );
  });

  it('filters by multiple invoice statuses from normalized filters', async () => {
    await service.findIoms(
      CRM_USER,
      {
        invoiceStatuses: ['PENDING', 'APPROVED'],
      },
      { skipPagination: true },
    );

    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'inv.status IN (:...invoiceStatuses)',
      { invoiceStatuses: ['PENDING', 'APPROVED'] },
    );
  });

  it('normalizes comma-separated listing filters to same shape as export', () => {
    const listingFilters = fromListIomListingDto({
      iomStatus: `${IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING},${IomStatusCodeEnum.IOM_CLOSED}`,
      projects: [10, 11],
      invoiceStatus: 1,
    } as unknown as ListIomListingDto);

    expect(listingFilters).toMatchObject({
      iomStatuses: [
        IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
        IomStatusCodeEnum.IOM_CLOSED,
      ],
      projects: [10, 11],
      invoiceStatuses: ['1'],
    });
  });

  it('applies date range on submittedAt', async () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31T23:59:59.999Z');

    await service.findIoms(CRM_USER, {
      startDate,
      endDate,
    } as unknown as ListIomListingDto);

    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'i.submittedAt >= :startDate',
      expect.objectContaining({ startDate: expect.any(Date) }),
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'i.submittedAt <= :endDate',
      expect.objectContaining({ endDate: expect.any(Date) }),
    );
  });

  it('defaults sort to createdAt DESC', async () => {
    await service.findIoms(CRM_USER, {});

    expect(listingQb.orderBy).toHaveBeenCalledWith('i.createdAt', 'DESC');
  });

  it('applies whitelisted sortBy', async () => {
    await service.findIoms(CRM_USER, { sortBy: 'salePrice:ASC' });

    expect(listingQb.orderBy).toHaveBeenCalledWith('i.salePrice', 'ASC');
  });

  it('ignores unknown sort fields', async () => {
    await service.findIoms(CRM_USER, { sortBy: 'unknown:DESC' });

    expect(listingQb.orderBy).not.toHaveBeenCalledWith(
      expect.stringContaining('unknown'),
      expect.anything(),
    );
  });

  it('maps rows to IomListItem shape', async () => {
    const result = await service.findIoms(CRM_USER, { page: 1, limit: 10 });

    expect(result.totalPages).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 1,
      bookingId: 100,
      projectId: 10,
      projectName: 'Tower One',
      unitNo: 'A-1201',
      customerName: null,
      saleValue: 5_000_000,
      brokeragePercentage: 2.5,
      totalBrokerageAmount: 125_000,
      referrerPoints: 75_000,
      refereePoints: 50_000,
      referralPointsEdited: false,
      referralClassification: 'CLASS_A',
      statusCode: IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING,
      statusLabel: 'CRM TL Approval Pending',
      iomCreatedAt: null,
      createdAt: new Date('2026-01-15T10:00:00Z'),
      iomPdfAvailable: true,
      salesOrderId: 'SO-12345',
      ageing: expect.any(Number),
    });
  });

  it('falls back to customer_details when booking name is missing', async () => {
    listingQb.getManyAndCount.mockResolvedValueOnce([
      [
        makeIom({
          booking: {
            customerName: null,
            propertyNumber: 'B-1',
            bookingId: 'BK-2',
          } as Iom['booking'],
          customerDetails: { fullName: '  John Smith  ' },
        }),
      ],
      1,
    ]);

    const result = await service.findIoms(CRM_USER, {});

    expect(result.items[0].customerName).toBe('John Smith');
  });

  describe('ageing', () => {
    const NOW = new Date('2026-06-25T12:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(NOW);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('ticks against now for in-flight IOMs', async () => {
      listingQb.getManyAndCount.mockResolvedValueOnce([
        [
          makeIom({
            createdAt: new Date('2026-06-15T12:00:00Z'),
          }),
        ],
        1,
      ]);

      const result = await service.findIoms(CRM_USER, {});
      expect(result.items[0].ageing).toBe(10);
    });

    it('freezes against completedAt when status is IOM_CLOSED', async () => {
      listingQb.getManyAndCount.mockResolvedValueOnce([
        [
          makeIom({
            createdAt: new Date('2026-01-15T00:00:00Z'),
            completedAt: new Date('2026-02-04T00:00:00Z'),
            status: {
              code: IomStatusCodeEnum.IOM_CLOSED,
              label: 'IOM Closed',
            } as Iom['status'],
          }),
        ],
        1,
      ]);

      const result = await service.findIoms(CRM_USER, {});
      expect(result.items[0].ageing).toBe(20);
    });

    it('falls back to now when status is IOM_CLOSED but completedAt is null (legacy rows)', async () => {
      listingQb.getManyAndCount.mockResolvedValueOnce([
        [
          makeIom({
            createdAt: new Date('2026-06-15T12:00:00Z'),
            completedAt: null,
            status: {
              code: IomStatusCodeEnum.IOM_CLOSED,
              label: 'IOM Closed',
            } as Iom['status'],
          }),
        ],
        1,
      ]);

      const result = await service.findIoms(CRM_USER, {});
      expect(result.items[0].ageing).toBe(10);
    });
  });

  describe('Loyalty listing and counts', () => {
    it('applies iomRequestInvoice tab filter when listType is omitted', async () => {
      await service.findIoms(LOYALTY_USER, {});

      expect(listingQb.andWhere).toHaveBeenCalledWith('i.invoiceId IS NULL');
      expect(listingQb.andWhere).toHaveBeenCalledWith(
        '(inv.id IS NULL OR inv.status IS NULL)',
      );
    });

    it('applies tab filter for iomRequestInvoice listType', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'iomRequestInvoice',
      } as unknown as ListIomListingDto);

      expect(listingQb.andWhere).toHaveBeenCalledWith('i.invoiceId IS NULL');
      expect(listingQb.andWhere).toHaveBeenCalledWith(
        '(inv.id IS NULL OR inv.status IS NULL)',
      );
    });

    it('applies tab filter for pendingSubmission listType', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'pendingSubmission',
      } as unknown as ListIomListingDto);

      expect(listingQb.andWhere).toHaveBeenCalledWith(
        'status.code = :pendingStatus',
        {
          pendingStatus: IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR,
        },
      );
    });

    it('applies tab filter for submittedInvoice listType', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'submittedInvoice',
      } as unknown as ListIomListingDto);

      expect(listingQb.andWhere).toHaveBeenCalledWith(
        'status.code = :submittedStatus',
        {
          submittedStatus: IomStatusCodeEnum.INVOICE_SUBMITTED,
        },
      );
    });

    it('applies tab filter and search together', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'pendingSubmission',
        search: 'jane',
      } as unknown as ListIomListingDto);

      expect(listingQb.andWhere).toHaveBeenCalledWith(
        'status.code = :pendingStatus',
        {
          pendingStatus: IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR,
        },
      );
      expect(listingQb.andWhere).toHaveBeenCalledWith(
        '( booking.propertyNumber LIKE :like OR project.name LIKE :like OR i.iomNo LIKE :like)',
        { like: '%jane%' },
      );
    });

    it('ignores CRM-only listType values for tab filtering', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'eligible',
      } as unknown as ListIomListingDto);

      expect(listingQb.andWhere).not.toHaveBeenCalledWith(
        'i.invoiceId IS NULL',
        expect.anything(),
      );
      expect(listingQb.andWhere).not.toHaveBeenCalledWith(
        'status.code = :pendingStatus',
        expect.anything(),
      );
      expect(listingQb.andWhere).not.toHaveBeenCalledWith(
        'status.code = :submittedStatus',
        expect.anything(),
      );
    });

    it('returns counts that ignore search and active tab filters', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'submittedInvoice',
        search: 'jane',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        iomStatus: IomStatusCodeEnum.INVOICE_SUBMITTED,
        invoiceStatus: '1',
      } as unknown as ListIomListingDto);

      expect(countQb.getRawOne).toHaveBeenCalled();
      expect(countQb.where).toHaveBeenCalledWith(
        'i.projectId IN (:...projectScope)',
        { projectScope: [10, 11] },
      );
      expect(countQb.andWhere).not.toHaveBeenCalled();
    });

    it('uses identical project scope for counts across different active tabs', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'iomRequestInvoice',
      } as unknown as ListIomListingDto);
      expect(countQb.where).toHaveBeenCalledWith(
        'i.projectId IN (:...projectScope)',
        { projectScope: [10, 11] },
      );

      await service.findIoms(LOYALTY_USER, {
        listType: 'submittedInvoice',
      } as unknown as ListIomListingDto);
      expect(countQb.where).toHaveBeenLastCalledWith(
        'i.projectId IN (:...projectScope)',
        { projectScope: [10, 11] },
      );
    });

    it('scopes listing and counts to project filter intersection for Loyalty', async () => {
      await service.findIoms(LOYALTY_USER, {
        projects: [10, 99],
        listType: 'pendingSubmission',
      } as unknown as ListIomListingDto);

      expect(listingQb.where).toHaveBeenCalledWith(
        'i.projectId IN (:...crmProjects)',
        { crmProjects: [10] },
      );
      expect(countQb.where).toHaveBeenCalledWith(
        'i.projectId IN (:...projectScope)',
        { projectScope: [10] },
      );
    });

    it('scopes to authorized projects without resolveEffectiveProjects when no project filter', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'pendingSubmission',
      } as unknown as ListIomListingDto);

      expect(listingQb.where).toHaveBeenCalledWith(
        'i.projectId IN (:...crmProjects)',
        { crmProjects: [10, 11] },
      );
      expect(countQb.where).toHaveBeenCalledWith(
        'i.projectId IN (:...projectScope)',
        { projectScope: [10, 11] },
      );
    });

    it('returns zero counts without a count query when authorized projects are empty', async () => {
      mappingRepo.find.mockResolvedValueOnce([]);

      const result = await service.findIoms(LOYALTY_USER, {
        listType: 'pendingSubmission',
      } as unknown as ListIomListingDto);

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        counts: {
          iomRequestInvoice: 0,
          pendingSubmission: 0,
          submittedInvoice: 0,
        },
      });
      expect(countQb.getRawOne).not.toHaveBeenCalled();
    });

    it('returns zero counts when project filter intersection is empty', async () => {
      const result = await service.findIoms(LOYALTY_USER, {
        projects: [999],
      } as unknown as ListIomListingDto);

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        counts: {
          iomRequestInvoice: 0,
          pendingSubmission: 0,
          submittedInvoice: 0,
        },
      });
      expect(countQb.getRawOne).not.toHaveBeenCalled();
    });

    it('includes parsed counts on the listing result', async () => {
      const result = await service.findIoms(LOYALTY_USER, {
        listType: 'pendingSubmission',
      } as unknown as ListIomListingDto);

      expect(result.counts).toEqual({
        iomRequestInvoice: 2,
        pendingSubmission: 3,
        submittedInvoice: 1,
      });
    });

    it('does not return counts for non-Loyalty roles', async () => {
      const result = await service.findIoms(CRM_USER, {
        listType: 'pendingSubmission',
      } as unknown as ListIomListingDto);

      expect(result.counts).toBeUndefined();
      expect(countQb.getRawOne).not.toHaveBeenCalled();
      expect(loyaltyCountsCache.getCounts).not.toHaveBeenCalled();
    });

    it('calls cache service for Loyalty listing counts', async () => {
      await service.findIoms(LOYALTY_USER, {
        listType: 'pendingSubmission',
      } as unknown as ListIomListingDto);

      expect(loyaltyCountsCache.getCounts).toHaveBeenCalledWith(
        [10, 11],
        expect.any(Function),
      );
    });

    it('does not call cache service when skipCounts is true', async () => {
      const result = await service.findIoms(
        LOYALTY_USER,
        {
          listType: 'pendingSubmission',
        } as unknown as ListIomListingDto,
        { skipCounts: true },
      );

      expect(loyaltyCountsCache.getCounts).not.toHaveBeenCalled();
      expect(result.counts).toBeUndefined();
    });

    it('ignores Loyalty listType tab filter for non-Loyalty roles', async () => {
      await service.findIoms(CRM_USER, {
        listType: 'pendingSubmission',
      } as unknown as ListIomListingDto);

      expect(listingQb.andWhere).not.toHaveBeenCalledWith(
        'status.code = :pendingStatus',
        expect.anything(),
      );
    });
  });
});
