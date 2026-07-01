import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ChannelPartner } from './entities/channel-partner.entity';
import { CreateChannelPartnerDto } from './dto/create-channel-partner.dto';
import { VoucherForm } from '../voucher_forms/entities/voucher_form.entity';
import { logger } from 'src/logger/logger';
import { generateRandomId } from 'src/utils/generateRandomNumber';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DISPLAY_DATE_TIME_FORMAT_FOR_FILE_NAME,
  UPCOMING_ESTATES_NAME,
} from 'src/config/constants';
import { Users } from 'src/entities';
import { RolesEnum } from 'src/enums/roles.enum';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { buildChannelPartnersExcelSheet } from 'src/helpers/cpListingExport.helper';
import { AwsService } from '../../aws/aws.service';
import { PassThrough } from 'node:stream';
import * as ExcelJS from 'exceljs';
import * as moment from 'moment-timezone';
import { QueryChannelPartnerDto } from './dto/query-channel-partner.dto';
import { CpDropdownQueryDto } from './dto/cp-dropdown-query.dto';

/**
 * Service for managing channel partner operations including CRUD operations,
 * voucher data aggregation, and financial metrics calculation.
 *
 * This service implements optimized database queries to eliminate N+1 query problems
 * and provides efficient pagination, search, and sorting capabilities for channel partners.
 *
 * Key Features:
 * - Channel partner creation with unique link generation
 * - Paginated listing with search and sort functionality
 * - Optimized voucher data aggregation for financial metrics
 * - Batch processing to improve performance for large datasets
 * - Comprehensive error handling and logging
 */
@Injectable()
export class ChannelPartnerService {
  constructor(
    @InjectRepository(ChannelPartner)
    private readonly channelPartnerRepository: Repository<ChannelPartner>,
    @InjectRepository(VoucherForm)
    private readonly voucherFormRepository: Repository<VoucherForm>,

    private readonly awsService: AwsService,
  ) {}

  /**
   * Function to retrieve a paginated list of channel partners with optimized voucher data aggregation.
   * Implements efficient batch querying to eliminate N+1 query problems and provides comprehensive
   * financial metrics including voucher counts, values, amounts collected, and last payment dates.
   *
   * Features:
   * - Pagination with configurable page size and limits
   * - Search functionality across channel partner names (case-insensitive)
   * - Sorting by multiple fields with direction control
   * - Optimized batch voucher data fetching
   * - In-memory financial metrics calculation
   * - Graceful error handling for JSON parsing
   *
   * @param page - Page number for pagination (defaults to 1)
   * @param limit - Number of items per page (defaults to 10, max 100)
   * @param search - Optional search term for filtering by channel partner name (case-insensitive)
   * @param sortBy - Optional sorting field with direction (e.g., 'name:asc', 'createdAt:desc')
   * @returns Paginated list of channel partners with financial metrics and voucher data
   * @throws Error when database operations fail or data processing errors occur
   */
  async findAll(
    user: any,
    queryDto: QueryChannelPartnerDto,
    isExcel?: boolean,
  ): Promise<any> {
    try {
      const queryData = await this.fetchPartnersWithRawData(
        queryDto,
        user,
        isExcel,
      );

      return this.enrichPartnersWithVoucherMetrics({
        partners: queryData.partners,
        rawRows: queryData.rawRows,
        skip: queryData.skip,
        limit: queryData.limit,
        total: queryData.total,
        page: queryData.page,
        needsInMemorySort: queryData.needsInMemorySort,
        sortField: queryData.sortField,
        sortDirection: queryData.sortDirection,
        isExcel,
      });
    } catch (error) {
      logger.error('Error retrieving channel partners:', error);
      logsAndErrorHandling('channelPartnerService - findAll', error, {
        queryDto,
        user,
        isExcel,
      });
    }
  }

  /**
   * Function to apply filters
   */
  private applyPartnerFilters(
    qb: SelectQueryBuilder<ChannelPartner>,
    queryDto: QueryChannelPartnerDto,
    user: any,
    isAdmin: boolean,
  ) {
    const {
      search,
      campaignId,
      createdBy,
      startDate,
      endDate,
      cpType,
      cpStatus,
    } = queryDto;

    if (search) {
      qb.andWhere('LOWER(partner.cpName) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    if (cpType) {
      qb.andWhere('LOWER(partner.cpType) = LOWER(:cpType)', {
        cpType,
      });
    }

    if (cpStatus) {
      qb.andWhere('partner.status = :cpStatus', {
        cpStatus,
      });
    }

    if (campaignId) {
      qb.andWhere('partner.campaign_id = :campaignId', {
        campaignId,
      });
    }

    if (!isAdmin && !createdBy) {
      qb.andWhere('partner.created_by = :createdBy', {
        createdBy: user.dbId,
      });
    }

    if (Array.isArray(createdBy) && createdBy.length > 0) {
      qb.andWhere('partner.created_by IN (:...createdBy)', {
        createdBy,
      });
    }

    if (startDate && endDate) {
      qb.andWhere('partner.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    return qb;
  }

  /**
   * Helper function to fetch channel partners with raw data for further processing.
   * Implements pagination, search filtering, and initial sorting.
   *
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @param search - Optional search term for filtering by channel partner name
   * @param sortBy - Optional sorting field with direction
   * @param user - Logged-in user for access control
   * @param isExcel - Flag indicating if the request is for Excel export
   * @returns Object containing fetched partners, raw data, pagination info, and sorting flags
   */
  private async fetchPartnersWithRawData(
    queryDto: QueryChannelPartnerDto,
    user: any,
    isExcel?: boolean,
  ) {
    let { page, limit } = queryDto;
    const { sortBy } = queryDto;

    let skip = 0;

    if (isExcel) {
      page = DEFAULT_PAGE;
      limit = 999999;
    } else {
      if (!page || page < 1) page = DEFAULT_PAGE;
      if (!limit || limit < 1 || limit > 100) limit = DEFAULT_LIMIT;
      skip = (page - 1) * limit;
    }

    const userRole = user?.role;
    const isAdmin = [
      RolesEnum.SUPER_ADMIN,
      RolesEnum.ADMIN,
      RolesEnum.SALES_RSH,
      RolesEnum.SALES_TL,
    ].includes(userRole);

    // -------- COUNT QUERY (NO JOINS) --------
    const countQuery = this.applyPartnerFilters(
      this.channelPartnerRepository.createQueryBuilder('partner'),
      queryDto,
      user,
      isAdmin,
    );

    const total = await countQuery.getCount();

    // -------- MAIN DATA QUERY --------
    const mainQuery = this.applyPartnerFilters(
      this.channelPartnerRepository.createQueryBuilder('partner'),
      queryDto,
      user,
      isAdmin,
    )
      .leftJoin(Users, 'users', 'users.id = partner.created_by')
      .leftJoin('partner.campaign', 'campaign')
      .addSelect('campaign.campaignName', 'campaign_name')
      .addSelect('users.name', 'creator_name');

    // -------- SORTING --------
    const calculatedFields = [
      'amountCollected',
      'voucherValue',
      'noOfVouchers',
    ];

    let sortField: string | null = null;
    let sortDirection: 'ASC' | 'DESC' = 'DESC';
    let needsInMemorySort = false;

    if (sortBy) {
      const [field, direction] = sortBy.split(':');
      const validFields = ['name', 'email', 'createdAt', 'updatedAt'];

      sortDirection = direction?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      if (validFields.includes(field)) {
        mainQuery.orderBy(`partner.${field}`, sortDirection);
      } else if (calculatedFields.includes(field)) {
        sortField = field;
        needsInMemorySort = true;
      }
    } else {
      mainQuery.orderBy('partner.createdAt', 'DESC');
    }

    if (!isExcel && !needsInMemorySort) {
      mainQuery.skip(skip).take(limit);
    }

    const { entities: partners, raw: rawRows } =
      await mainQuery.getRawAndEntities();

    return {
      partners,
      rawRows,
      total,
      skip,
      limit,
      page,
      needsInMemorySort,
      sortField,
      sortDirection,
    };
  }

  /**
   * Helper function to enrich channel partners with voucher metrics.
   * Calculates voucher counts, values, amounts collected, and last payment dates.
   * Supports in-memory sorting for calculated fields when required.
   *
   * @param partners - Array of channel partners to enrich
   * @param rawRows - Raw database rows corresponding to the partners
   * @param skip - Number of items to skip for pagination
   * @param limit - Number of items per page
   * @param total - Total number of channel partners
   * @param page - Current page number
   * @param needsInMemorySort - Flag indicating if in-memory sorting is needed
   * @param sortField - Field to sort by if in-memory sorting is needed
   * @param sortDirection - Direction of sorting ('ASC' or 'DESC')
   * @param isExcel - Flag indicating if the request is for Excel export
   * @returns Paginated response with enriched channel partners and voucher metrics
   */
  private async enrichPartnersWithVoucherMetrics(options) {
    const {
      partners,
      rawRows,
      skip,
      limit,
      total,
      page,
      needsInMemorySort,
      sortField,
      sortDirection,
      isExcel,
    } = options;

    if (partners.length === 0) {
      return {
        success: true,
        message: 'No channel partners found',
        data: {
          result: [],
          page: 0,
          total: 0,
          pageSize: limit,
          pageCount: 0,
        },
      };
    }

    const partnerIds = partners.map((p) => p.id);

    const voucherData =
      partnerIds.length > 0
        ? await this.voucherFormRepository
            .createQueryBuilder('voucher')
            .select(['voucher.cpLinkId', 'voucher.paymentDetails'])
            .where('voucher.cpLinkId IN (:...partnerIds)', { partnerIds })
            .andWhere('voucher.paymentDetails IS NOT NULL')
            .getRawMany()
        : [];

    const paymentDatesData =
      partnerIds.length > 0
        ? await this.voucherFormRepository
            .createQueryBuilder('voucher')
            .select('voucher.cpLinkId', 'cpLinkId')
            .addSelect('MAX(voucher.createdAt)', 'latestCreationDate')
            .where('voucher.cpLinkId IN (:...partnerIds)', { partnerIds })
            .groupBy('voucher.cpLinkId')
            .getRawMany()
        : [];

    const voucherCountMap = new Map<number, number>();
    const voucherValueMap = new Map<number, number>();
    const amountCollectedMap = new Map<number, number>();
    const lastCreationDateMap = new Map<number, Date | null>();

    paymentDatesData.forEach((row: any) => {
      if (row.cpLinkId && row.latestCreationDate) {
        lastCreationDateMap.set(row.cpLinkId, new Date(row.latestCreationDate));
      }
    });

    voucherData.forEach((voucher: any) => {
      const cpLinkId = voucher.voucher_cp_link_id;
      const paymentDetails = voucher.voucher_payment_details;

      if (!cpLinkId || !paymentDetails) return;

      voucherCountMap.set(cpLinkId, (voucherCountMap.get(cpLinkId) || 0) + 1);

      const parsed =
        typeof paymentDetails === 'string'
          ? JSON.parse(paymentDetails)
          : paymentDetails;

      if (parsed.amountPayable) {
        voucherValueMap.set(
          cpLinkId,
          (voucherValueMap.get(cpLinkId) || 0) + Number(parsed.amountPayable),
        );
      }

      if (parsed.totalAmountPaid) {
        amountCollectedMap.set(
          cpLinkId,
          (amountCollectedMap.get(cpLinkId) || 0) +
            Number(parsed.totalAmountPaid),
        );
      }
    });

    let result = partners.map((partner: any, index: number) => {
      const raw = rawRows[index] ?? {};
      return {
        ...partner,
        campaignName: raw.campaign_name ?? null,
        createdByName: raw.creator_name ?? null,
        noOfVouchers: voucherCountMap.get(partner.id) || 0,
        voucherValue: Number((voucherValueMap.get(partner.id) || 0).toFixed(2)),
        amountCollected: Number(
          (amountCollectedMap.get(partner.id) || 0).toFixed(2),
        ),
        lastCollectedDate: lastCreationDateMap.get(partner.id) ?? null,
      };
    });

    if (needsInMemorySort && sortField) {
      result.sort((a: any, b: any) =>
        sortDirection === 'DESC'
          ? b[sortField] - a[sortField]
          : a[sortField] - b[sortField],
      );
    }

    if (needsInMemorySort && !isExcel) {
      result = result.slice(skip, skip + limit);
    }

    return {
      success: true,
      message: 'Channel partners retrieved successfully',
      data: {
        result,
        page,
        total,
        pageSize: limit,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Function to create a new channel partner with unique link generation.
   * Validates partner uniqueness based on name and campaign combination, generates
   * a unique channel partner link ID, and stores the partner information.
   *
   * @param dto - Data Transfer Object containing channel partner creation details
   * @param createdBy - Optional ID of the user creating the channel partner
   * @returns Success response with the newly created channel partner details
   * @throws BadRequestException when a partner with the same name already exists in the campaign
   * @throws Error when database operations fail or link generation fails
   */
  async create(dto: CreateChannelPartnerDto, createdBy?: number): Promise<any> {
    try {
      // Validate newCpName requirement for 'Upcoming Estates'
      if (
        dto.cpName === UPCOMING_ESTATES_NAME &&
        (!dto.name || dto.name.trim() === '')
      ) {
        throw new BadRequestException(
          `Name is required when cp name is "${UPCOMING_ESTATES_NAME}"`,
        );
      }

      // Check if partner with same name already exists in the campaign
      // This prevents duplicate partner names within the same campaign
      const exists =
        dto.cpName === UPCOMING_ESTATES_NAME
          ? await this.channelPartnerRepository.findOne({
              where: {
                name: dto.name,
                campaignId: dto.campaignId,
                createdBy: createdBy,
              },
            })
          : await this.channelPartnerRepository.findOne({
              where: {
                cpName: dto.cpName,
                campaignId: dto.campaignId,
                createdBy: createdBy,
              },
            });
      if (exists)
        throw new BadRequestException(
          'Channel partner with this name already exists',
        );

      // Generate unique channel partner link ID
      // Uses helper function to ensure uniqueness across the system
      const linkId = generateRandomId();

      // Create channel partner entity with generated link ID
      const partner = this.channelPartnerRepository.create({
        ...dto,
        linkId,
        createdBy,
      });

      // Save and return the newly created partner
      const savedPartner = await this.channelPartnerRepository.save(partner);

      return {
        success: true,
        message: 'Channel Partner Link created successfully',
        data: savedPartner,
      };
    } catch (error) {
      logger.error('Error creating Channel Partner', error);
      logsAndErrorHandling('channelPartnerService - create', error, {
        dto,
        createdBy,
      });
    }
  }

  /**
   * Function to retrieve a single channel partner by their unique identifier.
   * Fetches complete partner information including all stored details and metadata.
   *
   * @param id - Unique identifier of the channel partner to retrieve
   * @returns Success response with the found channel partner details
   * @throws NotFoundException when no channel partner exists with the specified ID
   * @throws Error when database operations fail
   */
  async findOne(id: number): Promise<any> {
    try {
      // Retrieve channel partner by ID
      // Returns complete partner information including all stored fields
      const partner = await this.channelPartnerRepository.findOne({
        where: { id },
      });
      if (!partner) {
        throw new NotFoundException('Channel partner not found');
      }
      return {
        success: true,
        message: 'Channel partner retrieved successfully',
        data: partner,
      };
    } catch (error) {
      logger.error('Error retrieving channel partner', error);
      logsAndErrorHandling('channelPartnerService - findOne', error, { id });
    }
  }

  /**
   * Function to retrieve a channel partner by their unique link ID.
   * Returns essential partner information including ID, name, and status.
   * This method is typically used for link validation and partner identification.
   *
   * @param linkId - Unique link identifier of the channel partner to retrieve
   * @returns Success response with essential channel partner details (id, name, status)
   * @throws NotFoundException when no channel partner exists with the specified link ID
   * @throws Error when database operations fail
   */
  async findByLinkId(linkId: string): Promise<any> {
    try {
      // Validate linkId
      if (!linkId || linkId === 'undefined' || linkId === 'null') {
        throw new BadRequestException('Invalid linkId provided');
      }

      // Retrieve channel partner by link ID
      // Returns only essential fields: id, name, and status
      const partner = await this.channelPartnerRepository.findOne({
        where: { linkId },
        select: ['id', 'cpName', 'status'],
      });

      if (!partner) {
        throw new NotFoundException('Channel partner not found');
      }

      return {
        success: true,
        message: 'Channel partner retrieved successfully',
        data: partner,
      };
    } catch (error) {
      logger.error('Error retrieving channel partner by link ID', error);
      logsAndErrorHandling('channelPartnerService - findByLinkId', error, {
        linkId,
      });
    }
  }

  /**
   * Export channel partners to Excel and upload to S3.
   */
  async exportChannelPartners(user: any, filterDto: any): Promise<any> {
    try {
      // prepare export filter (no pagination)
      const exportFilter = { ...filterDto };
      delete exportFilter.page;
      delete exportFilter.limit;
      exportFilter.isExcel = true;

      // Provide page=1 and a large limit to fetch all
      const partnersResult = await this.findAll(user, exportFilter, true);
      const partners = partnersResult?.data?.result ?? [];

      if (!partners || partners.length === 0) {
        return {
          message: 'No channel partners found to export',
          data: [],
        };
      }
      const workbook = new ExcelJS.Workbook();
      buildChannelPartnersExcelSheet(workbook, { partners });

      const buffer = await workbook.xlsx.writeBuffer();

      const timeStamp = moment().format(DISPLAY_DATE_TIME_FORMAT_FOR_FILE_NAME);
      const s3Key = `exports/channel-partners/channel-partners-${timeStamp}.xlsx`;

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(s3Key, stream, true);

      return {
        message: 'Channel partners exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Channel partners export failed:', error);
      logsAndErrorHandling(
        'channelPartnerService - exportChannelPartners',
        error,
        {
          user,
          filterDto,
        },
      );
    }
  }

  /**
   * Retrieve channel partner dropdown list for the logged-in user.
   * Supports optional search filtering by channel partner name.
   *
   * @param user - The logged-in user requesting the dropdown list
   * @param queryDto - Query parameters including optional search term
   * @returns Success response with the filtered list of channel partners
   * @throws Error when database operations fail
   */
  async cpDropdown(user: any, queryDto: CpDropdownQueryDto): Promise<any> {
    try {
      const { search, campaignId } = queryDto;
      // Build base query for partners
      let baseQuery = this.channelPartnerRepository
        .createQueryBuilder('cp')
        .select(['cp.id', 'cp.cpName', 'cp.sfdcCPId']);

      // Apply search filter to base query
      if (search) {
        baseQuery = baseQuery.andWhere('LOWER(cp.cpName) LIKE LOWER(:search)', {
          search: `%${search}%`,
        });
      }

      if (campaignId?.length > 0) {
        baseQuery = baseQuery.andWhere('cp.campaignId IN (:campaignIds)', {
          campaignIds: campaignId.map(Number),
        });
      }

      // Filter by creator (logged-in user)
      if (user?.dbId && user?.role === RolesEnum.RM) {
        baseQuery = baseQuery.andWhere('cp.created_by = :createdBy', {
          createdBy: Number(user?.dbId),
        });
      }

      // Execute query to get partners
      const partners = await baseQuery.orderBy('cp.cpName', 'ASC').getMany();

      return {
        success: true,
        message: 'Channel partner dropdown retrieved successfully',
        data: partners,
      };
    } catch (error) {
      logger.error('Error retrieving channel partner dropdown', error);
      logsAndErrorHandling('channelPartnerService - cpDropdown', error, {
        user,
        queryDto,
      });
    }
  }
}
