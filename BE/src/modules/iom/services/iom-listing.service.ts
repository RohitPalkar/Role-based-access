import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';

import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/config/constants';
import { ProjectUserMapping } from 'src/entities';
import { RolesEnum } from 'src/enums/roles.enum';
import { Iom } from '../entities/iom.entity';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { ListIomListingDto } from '../dto/list-iom-listing.dto';
import { fromListIomListingDto } from '../mappers/iom-listing-filters.mapper';
import {
  IomListItem,
  IomListingResult,
  IomLoyaltyCounts,
} from '../types/iom-list-item.interface';
import { IomListingFilters } from '../types/iom-listing-filters.interface';
import { AuthenticatedUser } from './iom-validation.service';
import { toTitleCase } from 'src/helpers/stringHelper';
import { getAllowedIomStatusesByRole } from '../utils/iom-role-status.util';
import {
  applyLoyaltyListTypeFilter,
  buildLoyaltyCountsSelect,
  isLoyaltyListType,
} from '../utils/iom-loyalty-listing.util';
import { IomLoyaltyCountsCacheService } from './iom-loyalty-counts-cache.service';

const ALLOWED_SORT_FIELDS: Record<string, string> = {
  createdAt: 'i.createdAt',
  submittedAt: 'i.submittedAt',
  salePrice: 'i.salePrice',
  status: 'status.sequence',
};
const basePath = '';

const MS_PER_DAY = 86_400_000;

/**
 * Days elapsed between IOM creation and the workflow end-point.
 *
 * End-point rule:
 *   - If the IOM is in the terminal IOM_CLOSED status AND `completedAt`
 *     is populated, the ageing clock is frozen at `completedAt`.
 *   - Otherwise (still in-flight, or closed before `completedAt` was
 *     backfilled) the clock ticks against `Date.now()`.
 *
 * Returns a non-negative integer number of whole days.
 */
function computeAgeingDays(iom: Iom): number {
  if (!iom.createdAt) {
    return 0;
  }

  const isClosed = iom.status?.code === IomStatusCodeEnum.IOM_CLOSED;
  const endMs =
    isClosed && iom.completedAt
      ? new Date(iom.completedAt).getTime()
      : Date.now();

  const diffMs = endMs - new Date(iom.createdAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return 0;
  }
  return Math.floor(diffMs / MS_PER_DAY);
}

export interface FindIomsOptions {
  skipPagination?: boolean;
  skipCounts?: boolean;
}

@Injectable()
export class IomListingService {
  constructor(
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepo: Repository<ProjectUserMapping>,
    private readonly loyaltyCountsCache: IomLoyaltyCountsCacheService,
  ) {}

  async findIoms(
    user: AuthenticatedUser,
    query: ListIomListingDto | IomListingFilters,
    options?: FindIomsOptions,
  ): Promise<IomListingResult> {
    const skipPagination = options?.skipPagination === true;
    const skipCounts = options?.skipCounts === true;

    const isListingDto = this.isListIomListingDto(query);
    const page = isListingDto ? (query.page ?? DEFAULT_PAGE) : DEFAULT_PAGE;
    const limit = isListingDto ? (query.limit ?? DEFAULT_LIMIT) : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filters = isListingDto ? fromListIomListingDto(query) : query;

    const isLoyalty = user.role === RolesEnum.LOYALTY;
    const authorizedProjects = await this.resolveUserProjects(user);

    if (authorizedProjects.length === 0) {
      return this.emptyListingResult(page, limit, isLoyalty);
    }

    const projectScope = isLoyalty
      ? this.resolveLoyaltyProjectScope(filters, authorizedProjects)
      : this.resolveEffectiveProjects(filters.projects, authorizedProjects);

    if (projectScope.length === 0) {
      return this.emptyListingResult(page, limit, isLoyalty);
    }

    const effectiveStatuses = this.resolveEffectiveStatuses(
      user.role,
      filters.iomStatuses,
    );

    const qb = this.createBaseQueryBuilder(projectScope);
    this.applyListingFilters(qb, filters, effectiveStatuses);

    if (isLoyalty) {
      this.applyLoyaltyTabFilter(qb, filters.listType);
    }

    if (filters.sortBy) {
      const [field, direction] = filters.sortBy.split(':');
      const dir = (direction || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const column = ALLOWED_SORT_FIELDS[field];
      if (column) {
        qb.orderBy(column, dir as 'ASC' | 'DESC');
      }
    } else {
      qb.orderBy('i.createdAt', 'DESC');
    }

    if (!skipPagination) {
      qb.skip(skip).take(limit);
    }

    if (skipPagination) {
      const rows = await qb.getMany();
      return {
        items: rows.map((iom) => this.toListItem(iom)),
        total: rows.length,
        page: 1,
        limit: rows.length,
        totalPages: rows.length > 0 ? 1 : 0,
        ...(isLoyalty && !skipCounts
          ? { counts: await this.resolveLoyaltyCounts(projectScope) }
          : {}),
      };
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((iom) => this.toListItem(iom)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      ...(isLoyalty && !skipCounts
        ? { counts: await this.resolveLoyaltyCounts(projectScope) }
        : {}),
    };
  }

  async findAllForExport(
    user: AuthenticatedUser,
    query: ListIomListingDto = {},
  ): Promise<IomListItem[]> {
    const { items } = await this.findIoms(user, query, {
      skipPagination: true,
      skipCounts: true,
    });
    return items;
  }

  private isListIomListingDto(
    query: ListIomListingDto | IomListingFilters,
  ): query is ListIomListingDto {
    if ('iomStatuses' in query || 'invoiceStatuses' in query) {
      return false;
    }

    if ('iomStatus' in query && Array.isArray(query.iomStatus)) {
      return false;
    }

    if ('invoiceStatus' in query && Array.isArray(query.invoiceStatus)) {
      return false;
    }

    return true;
  }

  private resolveEffectiveProjects(
    requestedProjects: number[] | undefined,
    authorizedProjects: number[],
  ): number[] {
    if (!requestedProjects?.length) {
      return authorizedProjects;
    }

    const authorizedSet = new Set(authorizedProjects);
    return [...new Set(requestedProjects)].filter((projectId) =>
      authorizedSet.has(projectId),
    );
  }

  /**
   * Loyalty project scope: resolveEffectiveProjects applies only when the
   * request includes an explicit project filter on the active tab.
   */
  private resolveLoyaltyProjectScope(
    filters: IomListingFilters,
    authorizedProjects: number[],
  ): number[] {
    const hasProjectFilter = Boolean(filters.projects?.length);

    if (hasProjectFilter) {
      return this.resolveEffectiveProjects(
        filters.projects,
        authorizedProjects,
      );
    }

    return authorizedProjects;
  }

  private applyLoyaltyTabFilter(
    qb: SelectQueryBuilder<Iom>,
    listType?: string,
  ): void {
    if (listType && isLoyaltyListType(listType)) {
      applyLoyaltyListTypeFilter(qb, listType);
      return;
    }

    if (listType === 'ioms' || listType === 'eligible') {
      return;
    }

    // listType omitted — default Loyalty tab
    applyLoyaltyListTypeFilter(qb, 'iomRequestInvoice');
  }

  private zeroLoyaltyCounts(): IomLoyaltyCounts {
    return {
      iomRequestInvoice: 0,
      pendingSubmission: 0,
      submittedInvoice: 0,
    };
  }

  private emptyListingResult(
    page: number,
    limit: number,
    includeCounts: boolean,
  ): IomListingResult {
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      ...(includeCounts ? { counts: this.zeroLoyaltyCounts() } : {}),
    };
  }

  private async resolveLoyaltyCounts(
    projectScope: number[],
  ): Promise<IomLoyaltyCounts> {
    return this.loyaltyCountsCache.getCounts(projectScope, () =>
      this.computeLoyaltyCounts(projectScope),
    );
  }

  private async computeLoyaltyCounts(
    projectScope: number[],
  ): Promise<IomLoyaltyCounts> {
    const countsSelect = buildLoyaltyCountsSelect();
    const raw = await this.iomRepo
      .createQueryBuilder('i')
      .innerJoin('i.status', 'status')
      .leftJoin('i.invoice', 'inv')
      .where('i.projectId IN (:...projectScope)', { projectScope })
      .select(countsSelect.iomRequestInvoice, 'iomRequestInvoice')
      .addSelect(countsSelect.pendingSubmission, 'pendingSubmission')
      .addSelect(countsSelect.submittedInvoice, 'submittedInvoice')
      .getRawOne();

    return {
      iomRequestInvoice: Number(raw?.iomRequestInvoice ?? 0),
      pendingSubmission: Number(raw?.pendingSubmission ?? 0),
      submittedInvoice: Number(raw?.submittedInvoice ?? 0),
    };
  }

  private resolveEffectiveStatuses(
    userRole: string,
    queryStatuses?: IomStatusCodeEnum[],
  ): IomStatusCodeEnum[] | undefined {
    const roleStatuses = getAllowedIomStatusesByRole(userRole);

    if (!queryStatuses?.length) {
      return roleStatuses;
    }

    if (!roleStatuses) {
      return queryStatuses;
    }

    const allowedSet = new Set(roleStatuses);
    const intersection = queryStatuses.filter((status) =>
      allowedSet.has(status),
    );

    const disallowed = queryStatuses.filter(
      (status) => !allowedSet.has(status),
    );
    if (disallowed.length) {
      throw new BadRequestException(
        `iomStatus values not allowed for your role: ${disallowed.join(', ')}`,
      );
    }

    return intersection;
  }

  private createBaseQueryBuilder(
    crmProjects: number[],
  ): SelectQueryBuilder<Iom> {
    return this.iomRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.status', 'status')
      .innerJoinAndSelect('i.booking', 'booking')
      .innerJoinAndSelect('i.project', 'project')
      .leftJoinAndSelect('i.creator', 'creator')
      .leftJoinAndSelect('i.crmVerifier', 'crmVerifier')
      .leftJoinAndSelect('i.crmApprover', 'crmApprover')
      .leftJoinAndSelect('i.finVerifier', 'finVerifier')
      .leftJoinAndSelect('i.finApprover', 'finApprover')
      .leftJoinAndSelect('i.pointsUser', 'pointsUser')
      .leftJoinAndSelect('i.invoice', 'inv')
      .leftJoinAndSelect('inv.createdByUser', 'invoiceCreator')
      .leftJoinAndSelect('inv.updatedByUser', 'invoiceUpdater')
      .where('i.projectId IN (:...crmProjects)', { crmProjects });
  }

  private applyListingFilters(
    qb: SelectQueryBuilder<Iom>,
    filters: IomListingFilters,
    effectiveStatuses?: IomStatusCodeEnum[],
  ): void {
    if (filters.search) {
      const like = `%${filters.search}%`;
      qb.andWhere(
        '( booking.propertyNumber LIKE :like OR project.name LIKE :like OR i.iomNo LIKE :like)',
        { like },
      );
    }

    if (effectiveStatuses?.length) {
      qb.andWhere('status.code IN (:...effectiveStatuses)', {
        effectiveStatuses,
      });
    }

    if (filters.startDate) {
      qb.andWhere('i.submittedAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      qb.andWhere('i.submittedAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.invoiceStatuses?.length) {
      qb.andWhere('inv.status IN (:...invoiceStatuses)', {
        invoiceStatuses: filters.invoiceStatuses,
      });
    }
    if (filters.pointsClassification) {
      qb.andWhere('i.referralClassification = :referralClassification', {
        referralClassification: filters.pointsClassification,
      });
    }
  }

  /**
   * Resolves the set of project ids the caller may see by querying the
   * `project_user_mapping` table for active rows (`removed_at IS NULL`)
   * that reference the authenticated user. The same user may map to
   * the same project under multiple roles, so results are de-duplicated
   * before being returned.
   *
   * Returning an empty array is a valid outcome and short-circuits the
   * listing query upstream - never falls back to a hard-coded project.
   */
  private async resolveUserProjects(
    user: AuthenticatedUser,
  ): Promise<number[]> {
    if (user?.dbId == null) {
      return [];
    }

    const mappings = await this.projectUserMappingRepo.find({
      where: {
        user: { id: user.dbId },
        removedAt: IsNull(),
      },
      relations: ['project'],
    });

    const ids = new Set<number>();
    for (const mapping of mappings) {
      const projectId = mapping.project?.id;
      if (projectId != null) {
        ids.add(Number(projectId));
      }
    }
    return Array.from(ids);
  }

  private toListItem(iom: Iom): IomListItem {
    return {
      id: iom.id,
      iomNo: iom.iomNo,
      bookingId: iom.bookingId,
      projectId: iom.projectId,
      projectName: iom.project?.name ?? null,
      unitNo: iom.booking?.propertyNumber ?? null,
      customerName: this.resolveCustomerName(iom),
      saleValue: iom.salePrice,
      saleValueCollectedPercentage: null,
      saleValueAmountCollected: null,
      brokeragePercentage: iom.brokeragePercentage,
      totalBrokerageAmount: iom.totalBrokerageAmount,
      referrerPoints: iom.referrerPoints,
      refereePoints: iom.refereePoints,
      referralPointsEdited: iom.referralPointsEdited,
      referralClassification: iom.referralClassification,
      statusCode: iom.status.code,
      statusLabel: iom.status.label,
      iomCreatedAt: iom.submittedAt,
      createdAt: iom.createdAt,
      iomPdfAvailable: iom.iomPdf != null,
      pdfBasePath: basePath,
      pdflink: iom.iomPdf ?? null,
      crmCreatedByName: iom.creator?.name ?? null,
      crmVerifiedByName: iom.crmVerifier?.name ?? null,
      crmApprovedByName: iom.crmApprover?.name ?? null,
      financeVerifiedByName: iom.finVerifier?.name ?? null,
      financeApprovedByName: iom.finApprover?.name ?? null,
      pointsAllottedByName: iom.pointsUser?.name ?? null,
      crmVerifiedBy: iom.crmVerifiedBy ?? null,
      referralPointsAdjustment: iom.referralPointsAdjustment,
      referralSplitType: iom.referralSplitType ?? null,
      referralSplitRatio: iom.referralSplitRatio,
      loyaltyPointClassification: toTitleCase(iom.loyaltyPointClassification),
      thresholdPaymentReceivedAt: iom.thresholdPaymentReceivedAt,
      referralPointsEditedAt: iom.referralPointsEditedAt,
      invoiceNumber: iom.invoice?.invoiceNumber ?? null,
      invoiceStatus: iom.invoice?.status ?? null,
      invoiceRequestedAt: iom.invoice?.invoiceRequestedAt ?? null,
      invoiceDate: iom.invoice?.invoiceDate ?? null,
      invoiceCreatedBy: iom.invoice?.createdByUser?.name ?? null,
      invoiceUpdatedBy: iom.invoice?.updatedByUser?.name ?? null,
      invoiceCreatedAt: iom.invoice?.createdAt ?? null,
      invoiceUpdatedAt: iom.invoice?.updatedAt ?? null,
      invoiceReqNumber: iom.invoice?.iomInvoiceId ?? null,
      pointsUpdatedAt: iom.referralPointsEditedAt ?? null,
      salesOrderId: iom.salesOrderId ?? null,
      ageing: computeAgeingDays(iom),
    };
  }

  private resolveCustomerName(iom: Iom): string | null {
    const details = iom.customerDetails;
    if (!details || typeof details !== 'object') {
      return null;
    }

    for (const key of ['name', 'customerName', 'fullName']) {
      const value = details[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }
}
