/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncentiveBooking, Role, Users } from '../../../entities';
import { logger } from 'src/logger/logger';
import { StatusEnum } from '../../../enums/status.enum';
import { UnitStatusEnum } from 'src/enums/booking-list.enums';
import {
  FINANCIAL_YEAR_FORMAT,
  ONE_CRORE,
  ONE_LAKH,
  ONE_THOUSAND,
} from 'src/config/constants';
import {
  formatDateUtil,
  getCurrentFinancialYear,
} from 'src/helpers/date.helper';
import { RolesEnum } from 'src/enums/roles.enum';
import { getDateFieldByUnitStatus } from 'src/utils/resolveDateFieldForStatus';
import * as ExcelJS from 'exceljs';
import { PassThrough } from 'stream';
import { AwsService } from '../../aws/aws.service';

@Injectable()
export class LeaderBoardService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(IncentiveBooking)
    private readonly incentiveBookingRepository: Repository<IncentiveBooking>,

    private readonly awsService: AwsService,
  ) {}

  async getHighestUnitsSold(financialYear?: string) {
    try {
      const rmRole = await this.roleRepository.findOne({
        where: { name: RolesEnum.RM },
      });

      if (!rmRole) {
        throw new NotFoundException('No RM role found.');
      }

      // Retrieve the current financial year boundaries.
      // getCurrentFinancialYear() returns [startDate, endDate] in "YYYY-MM-DD" format.
      const [financialStart, financialEnd] =
        getCurrentFinancialYear(financialYear);

      const userBookingsStats = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin(
          'user.incentiveBookings',
          'booking',
          'booking.unitStatus != :cancelled',
        )
        .where('user.status = :status', {
          status: StatusEnum.ACTIVE,
        })
        .andWhere('user.role_id = :roleId', { roleId: rmRole.id })
        .andWhere('booking.unitStatus IN (:...statuses)', {
          statuses: [
            UnitStatusEnum.REGULARIZED,
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ],
        })
        .andWhere('booking.id IS NOT NULL')
        // Filter bookings only for the current financial year.
        .andWhere(
          'booking.booking_date BETWEEN :financialStart AND :financialEnd',
          { financialStart, financialEnd },
        )
        .select([
          'user.id AS id',
          'user.name AS name',
          'COUNT(booking.id) AS bookingsCount',
        ])
        .setParameter('cancelled', UnitStatusEnum.CANCELLED)
        .groupBy('user.id')
        .having('COUNT(booking.id) > 0')
        .orderBy('bookingsCount', 'DESC')
        .limit(10)
        .getRawMany();

      const formattedUserBookingsStats = userBookingsStats.map((user) => ({
        ...user,
        bookingsCount: Number(user.bookingsCount),
      }));

      return {
        message: 'Successfully fetched highest units sold data.',
        data: {
          users: formattedUserBookingsStats,
        },
      };
    } catch (error) {
      logger.error(
        `Error while fetching highest units sold. Query Parameters: status=${StatusEnum.ACTIVE}, excludedStatus=${UnitStatusEnum.CANCELLED}. Error Details: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException(
        'Error occurred while fetching highest units sold.',
      );
    }
  }

  async getMostEfficientRMs(financialYear?: string) {
    try {
      const rmRole = await this.roleRepository.findOne({
        where: { name: RolesEnum.RM },
      });

      if (!rmRole) {
        throw new NotFoundException('No RM role found.');
      }

      // Retrieve the current financial year boundaries
      // financialStart and financialEnd will be in "YYYY-MM-DD" format.
      const [financialStart, financialEnd] =
        getCurrentFinancialYear(financialYear);

      // Fetch total bookings (excluding specific statuses) and qualified bookings,
      // including a filter based on booking_date for the current financial year.
      const userBookingsStats = await this.userRepository
        .createQueryBuilder('user')
        // Left join for total bookings with a filter on booking_date.
        .leftJoin(
          'user.incentiveBookings',
          'booking',
          `booking.unitStatus NOT IN (:...excludedStatuses)
           AND booking.booking_date BETWEEN :financialStart AND :financialEnd`,
        )
        // Left join for qualified bookings with a filter on booking_date.
        .leftJoin(
          'user.incentiveBookings',
          'qualifiedBooking',
          `qualifiedBooking.unitStatus IN (:...qualifiedStatuses)
           AND qualifiedBooking.booking_date BETWEEN :financialStart AND :financialEnd`,
        )
        .where('user.status = :status', { status: StatusEnum.ACTIVE })
        .andWhere('user.role_id = :roleId', { roleId: rmRole.id })
        .select([
          'user.id AS id',
          'user.name AS name',
          'COUNT(DISTINCT booking.id) AS totalBookings',
          'COUNT(DISTINCT qualifiedBooking.id) AS qualifiedBookings',
        ])
        .setParameters({
          qualifiedStatuses: [
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ],
          excludedStatuses: [UnitStatusEnum.USER_PROJECT_POLICY_NOT_FOUND],
          financialStart,
          financialEnd,
        })
        .groupBy('user.id')
        .having('COUNT(DISTINCT booking.id) > 0')
        .orderBy('totalBookings', 'DESC')
        .limit(4)
        .getRawMany();

      // Format the counts as numbers.
      const formattedUserBookingsStats = userBookingsStats.map((user) => ({
        ...user,
        totalBookings: Number(user.totalBookings),
        qualifiedBookings: Number(user.qualifiedBookings),
      }));

      // Calculate the efficiency for each RM.
      // Efficiency is calculated as: (qualifiedBookings / totalBookings) * 100.
      // The resulting efficiency is formatted to 2 decimal places.
      const mostEfficientRMs = formattedUserBookingsStats
        .map((user) => {
          const efficiency =
            user.totalBookings > 0
              ? (user.qualifiedBookings / user.totalBookings) * 100
              : 0;
          return { ...user, efficiency: efficiency.toFixed(2) };
        })
        .sort((a, b) => b.efficiency - a.efficiency);

      return {
        message: 'Successfully fetched most efficient users list.',
        data: {
          users: mostEfficientRMs,
        },
      };
    } catch (error) {
      logger.error(
        `Error occurred while fetching most efficient RMs. Query Parameters: status=${StatusEnum.ACTIVE}, excludedStatuses=[${UnitStatusEnum.CANCELLED}, ${UnitStatusEnum.USER_PROJECT_POLICY_NOT_FOUND}], qualifiedStatus=${UnitStatusEnum.QUALIFIED}. Error Details: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException(
        'Error occurred while fetching most efficient RMs.',
      );
    }
  }

  async getRmSummary(options: {
    unitStatus?: string;
    brandId?: number[];
    cityIds?: number[];
    projectIds?: number[];
    startDate?: Date;
    endDate?: Date;
    search?: string;
    isExcel?: boolean;
    page?: number;
    limit?: number;
  }) {
    try {
      const { search, isExcel, page, limit, startDate, endDate } = options;

      let message = '';
      const offset = (page - 1) * limit || 0;

      const query = this.incentiveBookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.projectPhase', 'projectPhase')
        .leftJoinAndSelect('projectPhase.project', 'project')
        .leftJoinAndSelect('booking.user', 'user')
        .leftJoin('user.role', 'role')
        .where('role.name LIKE :roleName', { roleName: RolesEnum.RM })
        .andWhere('user.status = :status', { status: StatusEnum.ACTIVE });

      const { today, financialStart, hasDateRange, hasAnyFiltersApplied } =
        this.applyRmSummaryFilters(query, options);

      query
        .select([
          'user.name AS rmName',
          'COUNT(DISTINCT booking.id) AS totalBookings',
          'SUM(booking.gross_total_value) AS totalAgreementValue',
          'SUM(booking.incentive_amount) AS totalIncentiveAmount',
          'IFNULL(ROUND(SUM(booking.incentive_amount) / NULLIF(SUM(booking.gross_total_value), 0) * 100, 2), 0) AS percentageReceived',
        ])
        .groupBy('user.id')
        .orderBy('totalAgreementValue', 'DESC');

      const data = await query.getRawMany();

      if (isExcel) {
        return { data };
      }

      const paginatedData = data.slice(offset, offset + limit);

      if (!search) {
        if (hasDateRange) {
          message = `Bookings from Given Range Days - ${formatDateUtil(startDate, 'date')} to ${formatDateUtil(endDate, 'date')}`;
        } else if (!hasAnyFiltersApplied) {
          message = `Bookings In Current Financial Year - ${formatDateUtil(financialStart, 'date')} to ${formatDateUtil(today, 'date')}`;
        }
      }

      return {
        success: true,
        statusCode: 200,
        message:
          paginatedData.length > 0
            ? 'RM Summary fetched successfully'
            : 'No Data Found',
        data: {
          rmSummary: paginatedData,
          total: data.length,
          currentPage: page,
          totalPages: Math.ceil(data.length / limit),
          message,
        },
      };
    } catch (error) {
      logger.error(
        `Error while fetching RM Summary. Type: Error: ${error.message}`,
        error,
      );

      return {
        success: false,
        statusCode: 500,
        message: 'Error occurred while fetching RM Summary.',
        data: null,
      };
    }
  }

  private applyRmSummaryFilters(
    query,
    options: {
      unitStatus?: string;
      brandId?: number[];
      cityIds?: number[];
      projectIds?: number[];
      startDate?: Date;
      endDate?: Date;
      search?: string;
    },
  ) {
    const {
      unitStatus,
      brandId,
      cityIds,
      projectIds,
      startDate,
      endDate,
      search,
    } = options;

    const today = new Date();
    const [financialStart] = getCurrentFinancialYear();

    const hasDateRange = !!startDate && !!endDate;

    const hasAnyFiltersApplied =
      !!search ||
      !!brandId?.length ||
      !!projectIds?.length ||
      !!cityIds?.length ||
      !!unitStatus ||
      hasDateRange;

    const dateField = getDateFieldByUnitStatus(unitStatus as UnitStatusEnum);

    if (search) {
      query.andWhere('LOWER(user.name) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    if (brandId?.length) {
      query.andWhere('project.brand_id IN (:...brandId)', { brandId });
    }

    if (cityIds?.length) {
      query.andWhere('project.city_id IN (:...cityIds)', { cityIds });
    }

    if (projectIds?.length) {
      query.andWhere('project.id IN (:...projectIds)', { projectIds });
    }

    if (hasDateRange) {
      query.andWhere(`${dateField} BETWEEN :start AND :end`, {
        start: startDate,
        end: endDate,
      });
    }

    if (unitStatus) {
      const unitStatuses =
        unitStatus === UnitStatusEnum.QUALIFIED
          ? [UnitStatusEnum.QUALIFIED, UnitStatusEnum.QUALIFIED_CANCELLED]
          : [unitStatus];

      query.andWhere('booking.unit_status IN (:...unitStatuses)', {
        unitStatuses,
      });
    }

    if (!hasAnyFiltersApplied) {
      query.andWhere(`${dateField} BETWEEN :start AND :end`, {
        start: financialStart,
        end: today,
      });
    }

    return { today, financialStart, hasDateRange, hasAnyFiltersApplied };
  }

  async exportRmSummary(options: {
    unitStatus?: string;
    brandId?: number[];
    cityIds?: number[];
    projectIds?: number[];
    startDate?: Date;
    endDate?: Date;
    search?: string;
    isExcel?: boolean;
  }) {
    try {
      const {
        unitStatus,
        brandId,
        cityIds,
        projectIds,
        startDate,
        endDate,
        search,
        isExcel,
      } = options;
      const result = await this.getRmSummary({
        unitStatus,
        brandId,
        cityIds,
        projectIds,
        startDate,
        endDate,
        search,
        isExcel,
      });

      const data = (result as { data: any[] })?.data || [];
      if (!data.length) {
        return {
          success: true,
          statusCode: 200,
          message: 'No qualified bookings found to export.',
          data: [],
        };
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('RM Summary');

      // Header row
      worksheet.columns = [
        { header: 'RM Name', key: 'rmName', width: 25 },
        { header: 'No. of Bookings', key: 'totalBookings', width: 16 },
        {
          header: 'Total Agreement Value(AV)',
          key: 'totalAgreementValue',
          width: 22,
        },
        {
          header: 'Amount Received',
          key: 'totalIncentiveAmount',
          width: 22,
        },
        { header: 'AV % Received', key: 'percentageReceived', width: 12 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.columns.forEach((column) => {
        column.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      data.forEach((d) => {
        worksheet.addRow({
          rmName: d?.rmName,
          totalBookings: d?.totalBookings ?? 0,
          totalAgreementValue: d?.totalAgreementValue ?? 0,
          totalIncentiveAmount: d?.totalIncentiveAmount ?? 0,
          percentageReceived: d?.percentageReceived ?? 0,
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();

      const timestamp = formatDateUtil(undefined, 'timestamp');
      const s3Key = `exports/leaderboard-reports/Leaderboard_${timestamp}.xlsx`;

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(s3Key, stream, true);

      return {
        success: true,
        statusCode: 200,
        message: 'RM Summary exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Error exporting RM Summary:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to export RM Summary');
    }
  }

  async getTopPerformers(
    type: 'brand' | 'project' | 'city',
    id: number,
    page: number,
    limit: number,
    financialYear?: string,
  ) {
    try {
      // Validate type.
      const validTypes = ['brand', 'project', 'city'];
      if (!validTypes.includes(type)) {
        throw new BadRequestException('Invalid type parameter.');
      }

      // Validate ID.
      if (!id || isNaN(id)) {
        throw new BadRequestException('Invalid ID parameter.');
      }

      const offset = (page - 1) * limit || 0;

      let filterCondition = '';
      if (type === 'brand') {
        filterCondition = 'project.brand_id = :id';
      } else if (type === 'project') {
        filterCondition = 'project.id = :id';
      } else if (type === 'city') {
        filterCondition = 'project.city_id = :id';
      }

      const rmRole = await this.roleRepository.findOne({
        where: { name: RolesEnum.RM },
      });

      if (!rmRole) {
        throw new NotFoundException('No RM role found.');
      }

      // Get current financial year boundaries in "YYYY-MM-DD" format.
      const [financialStart, financialEnd] =
        getCurrentFinancialYear(financialYear);

      const topPerformers = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.incentiveBookings', 'booking')
        .leftJoin('booking.projectPhase', 'projectPhase')
        .leftJoin('projectPhase.project', 'project')
        .select([
          'user.id AS userId',
          'user.name AS name',
          'ROUND(COALESCE(SUM(booking.grossTotalValue), 0), 2) AS totalSales',
          'COUNT(booking.id) AS totalUnits',
        ])
        .where('user.status = :status', { status: StatusEnum.ACTIVE })
        .andWhere('user.role_id = :roleId', { roleId: rmRole.id })
        .andWhere(filterCondition, { id })
        .andWhere('booking.unitStatus IN (:...statuses)', {
          statuses: [
            UnitStatusEnum.REGULARIZED,
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ],
        })
        // Filter bookings to the current financial year based on booking_date.
        .andWhere(
          'booking.booking_date BETWEEN :financialStart AND :financialEnd',
          { financialStart, financialEnd },
        )
        .groupBy('user.id')
        .orderBy('totalSales', 'DESC')
        .limit(10)
        .getRawMany();

      const paginatedUsers = topPerformers.slice(offset, offset + limit);

      const formattedUsers = paginatedUsers.map((rm) => ({
        id: rm.userId,
        name: rm.name,
        totalSales: `${(+rm.totalSales / ONE_CRORE).toFixed(2)}`,
        bookingsCount: +rm.totalUnits,
      }));

      return {
        success: true,
        message:
          formattedUsers.length > 0
            ? 'Top performers fetched successfully.'
            : 'No top performers found for the given filter.',
        data: {
          performers: formattedUsers,
          total: topPerformers.length,
          currentPage: page,
          totalPages: Math.ceil(topPerformers.length / limit),
        },
      };
    } catch (error) {
      logger.error(
        `Error while fetching top RM performers. Type: ${type}, ID: ${id} Error: ${error.message}`,
        error,
      );
      return {
        success: false,
        statusCode: 500,
        message: 'Error occurred while fetching top RM performers.',
        data: null,
      };
    }
  }

  async getTopTenRm(page: number, limit: number, financialYear?: string) {
    try {
      const rmRole = await this.roleRepository.findOne({
        where: { name: RolesEnum.RM },
      });

      if (!rmRole) {
        throw new NotFoundException('RM Role not found.');
      }

      const offset = (page - 1) * limit;

      // Retrieve the current financial year's boundaries in "YYYY-MM-DD" format.
      const [financialStart, financialEnd] =
        getCurrentFinancialYear(financialYear);

      const topRMs = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.incentiveBookings', 'booking')
        .select([
          'user.id AS userId',
          'user.name AS name',
          'COALESCE(SUM(booking.grossTotalValue), 0) AS totalSales',
          'COUNT(booking.id) AS totalUnits',
        ])
        .where('user.status = :status', { status: StatusEnum.ACTIVE })
        .andWhere('user.role_id = :roleId', { roleId: rmRole.id })
        .andWhere('booking.unitStatus IN (:...statuses)', {
          statuses: [
            UnitStatusEnum.REGULARIZED,
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ],
        })
        // Filter bookings within the current financial year.
        .andWhere(
          'booking.booking_date BETWEEN :financialStart AND :financialEnd',
          { financialStart, financialEnd },
        )
        .groupBy('user.id')
        .orderBy('totalSales', 'DESC')
        .limit(10)
        .getRawMany();

      const paginatedRMs = topRMs.slice(offset, offset + limit);

      const formattedRMs = paginatedRMs.map((rm) => ({
        id: rm.userId,
        name: rm.name,
        totalSales: `${(+rm.totalSales / ONE_CRORE).toFixed(2)}`,
        bookingsCount: +rm.totalUnits,
      }));

      return {
        success: true,
        message:
          formattedRMs.length > 0
            ? 'Top 10 RMs fetched successfully.'
            : 'No RMs found.',
        data: {
          rms: formattedRMs,
          total: topRMs.length,
          currentPage: page,
          totalPages: Math.ceil(topRMs.length / limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching Top 10 RMs. Error: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Error occurred while fetching Top 10 RMs.',
      );
    }
  }

  async getCancellationsData(
    type: 'brand' | 'project' | 'city',
    id: number,
    financialYear?: string,
  ) {
    try {
      // Validate Type
      const validTypes = ['brand', 'project', 'city'];
      if (!validTypes.includes(type)) {
        throw new BadRequestException(
          'Invalid type parameter. Allowed values: brand, project, city.',
        );
      }

      // Validate ID
      if (!id || isNaN(id)) {
        throw new BadRequestException(
          'Invalid ID parameter. It must be a number.',
        );
      }

      let filterCondition = '';
      if (type === 'brand') {
        filterCondition = 'project.brand_id = :id';
      } else if (type === 'project') {
        filterCondition = 'project.id = :id';
      } else if (type === 'city') {
        filterCondition = 'project.city_id = :id';
      }

      const rmRole = await this.roleRepository.findOne({
        where: { name: RolesEnum.RM },
      });

      if (!rmRole) {
        throw new NotFoundException('No RM role found.');
      }

      // Retrieve the current financial year boundaries in MySQL date format ("YYYY-MM-DD")
      const [financialStart, financialEnd] =
        getCurrentFinancialYear(financialYear);

      const cancellations = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.incentiveBookings', 'booking')
        .leftJoin('booking.projectPhase', 'projectPhase')
        .leftJoin('projectPhase.project', 'project')
        .select([
          'user.id AS userId',
          'user.name AS name',
          `ROUND(COALESCE(SUM(CASE
            WHEN booking.unit_status IN (:...cancelledStatuses) THEN booking.gross_total_value
            ELSE 0 END), 0)) AS totalSales`,
          `COUNT(CASE
            WHEN booking.unit_status IN (:...cancelledStatuses) THEN booking.id
            ELSE NULL END) AS totalCancellations`,
        ])
        .where(filterCondition, { id })
        .andWhere('user.status = :status', { status: StatusEnum.ACTIVE })
        .andWhere('user.role_id = :roleId', { roleId: rmRole.id })
        // Filter bookings for the current financial year using booking_date
        .andWhere(
          'booking.booking_date BETWEEN :financialStart AND :financialEnd',
          { financialStart, financialEnd },
        )
        .groupBy('user.id')
        .orderBy('totalSales', 'DESC')
        .having('totalSales > 0')
        .limit(10)
        .setParameter('cancelledStatuses', [
          UnitStatusEnum.CANCELLED,
          UnitStatusEnum.QUALIFIED_CANCELLED,
        ])
        .getRawMany();

      const formattedUsers = cancellations.map((rm) => ({
        id: rm.userId,
        name: rm.name,
        totalSales: `${(+rm.totalSales / ONE_CRORE).toFixed(2)}`,
        totalCancellations: rm.totalCancellations,
      }));

      return {
        success: true,
        message:
          formattedUsers.length > 0
            ? 'Cancellations data fetched successfully.'
            : 'No cancellations found for the given filter.',
        data: {
          cancellations: formattedUsers,
        },
      };
    } catch (error) {
      logger.error(
        `Error fetching cancellations data. Type: ${type}, ID: ${id}, Error: ${error.message}`,
        error,
      );
      throw new InternalServerErrorException(
        'Error occurred while fetching cancellations data.',
      );
    }
  }

  async getHighestRevenue(years?: string) {
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1; // JS month is 0-based

      // 1. Determine Financial Year Start and End
      let fyStartYear: number;
      let fyEndYear: number;

      if (years && FINANCIAL_YEAR_FORMAT.test(years)) {
        const [startStr, endStr] = years.split('-');
        fyStartYear = parseInt(startStr, 10);
        fyEndYear = parseInt(endStr, 10);
      } else {
        // fallback to current FY
        const currentYear = today.getFullYear();
        fyStartYear = currentMonth < 4 ? currentYear - 1 : currentYear;
        fyEndYear = currentMonth < 4 ? currentYear : currentYear + 1;
      }

      const filters = [
        {
          type: 'YTD',
          startMonth: 4,
          startYear: fyStartYear,
          endMonth: 3,
          endYear: fyEndYear,
        },
        {
          type: 'QTD',
          startMonth: Math.floor((currentMonth - 1) / 3) * 3 + 1,
          startYear: fyEndYear,
          endMonth: currentMonth,
          endYear: fyEndYear,
        },
        {
          type: 'MTD',
          startMonth: currentMonth,
          startYear: fyEndYear,
          endMonth: currentMonth,
          endYear: fyEndYear,
        },
      ];
      const allIncentives = await Promise.all(
        filters.map(async (filter) => {
          const incentives = await this.incentiveBookingRepository
            .createQueryBuilder('booking')
            .leftJoin('booking.user', 'user')
            .leftJoin('user.role', 'role')
            .where('user.status = :status', {
              status: StatusEnum.ACTIVE.toString(),
            })
            .andWhere('booking.unitStatus IN (:...statuses)', {
              statuses: [
                UnitStatusEnum.REGULARIZED,
                UnitStatusEnum.QUALIFIED,
                UnitStatusEnum.QUALIFIED_CANCELLED,
              ],
            })
            .andWhere('role.name LIKE :roleName', { roleName: RolesEnum.RM })
            .andWhere(
              `(YEAR(booking.booking_date) > :startYear
                OR (YEAR(booking.booking_date) = :startYear AND MONTH(booking.booking_date) >= :startMonth))
               AND
               (YEAR(booking.booking_date) < :endYear
                OR (YEAR(booking.booking_date) = :endYear AND MONTH(booking.booking_date) <= :endMonth))`,
              {
                startYear: filter.startYear,
                startMonth: filter.startMonth,
                endYear: filter.endYear,
                endMonth: filter.endMonth,
              },
            )
            .select([
              'user.id AS id',
              'user.name AS name',
              'SUM(booking.gross_total_value) AS totalSales',
            ])
            .groupBy('user.id, user.name')
            .orderBy('totalSales', 'DESC')
            .getRawMany();

          const topRM = incentives.length
            ? incentives.reduce(
                (max, rm) =>
                  parseFloat(rm.totalSales) > parseFloat(max.totalSales)
                    ? rm
                    : max,
                incentives[0],
              )
            : null;

          return {
            type: filter.type,
            user: topRM ? { id: topRM.id, name: topRM.name } : 'NA',
            totalSales: topRM ? parseFloat(topRM.totalSales) || 0 : 0,
          };
        }),
      );

      const highestSales = Math.max(
        ...allIncentives.map((data) => data.totalSales),
        0,
      );

      let divisor = 1;
      let unit = '';

      if (highestSales >= ONE_CRORE) {
        divisor = ONE_CRORE;
        unit = 'crore';
      } else if (highestSales >= ONE_LAKH) {
        divisor = ONE_LAKH;
        unit = 'lakh';
      } else {
        divisor = ONE_THOUSAND;
        unit = 'thousand';
      }

      const results = allIncentives.map((data) => ({
        type: data.type,
        user: data.user,
        totalSales: Number((data.totalSales / divisor).toFixed(2)),
      }));

      return {
        message: 'Highest revenue earned RM users fetched successfully',
        data: { unit, results },
      };
    } catch (error) {
      logger.error(`Error in getHighestRevenue: ${error.message}`, error);
      throw new InternalServerErrorException('Failed to fetch data.');
    }
  }
}
