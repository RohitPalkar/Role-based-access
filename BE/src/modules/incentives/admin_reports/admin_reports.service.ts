import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { ILike, In, Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { Users } from '../../users/entities/user.entity';
import { IncentiveBooking } from '../incentive_booking/entities/incentive_booking.entity';
import { UserIncentivePayout } from '../incentive_booking/entities/user_incentive_payouts.entity';
import { logger } from 'src/logger/logger';
import { PassThrough } from 'stream';
import * as ExcelJS from 'exceljs';
import { ONE_CRORE } from 'src/config/constants';
import { AwsService } from '../../aws/aws.service';
import {
  PaymentStatusEnum,
  UnitStatusEnum,
} from 'src/enums/booking-list.enums';
import {
  formatDateUtil,
  getCurrentFinancialYear,
} from 'src/helpers/date.helper';
import { toTitleCase } from 'src/helpers/stringHelper';
import { IncentivePayoutsService } from '../incentive_payouts/incentive_payouts.service';
import { RolesEnum } from 'src/enums/roles.enum';
import { getDateFieldByUnitStatus } from 'src/utils/resolveDateFieldForStatus';
import { chunk } from 'lodash'; // use lodash chunk or write your own
import { format, isValid, parse } from 'date-fns';
@Injectable()
export class AdminReportsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,

    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,

    @InjectRepository(IncentiveBooking)
    private readonly bookingRepo: Repository<IncentiveBooking>,

    @InjectRepository(UserIncentivePayout)
    private readonly payoutRepo: Repository<UserIncentivePayout>,

    private readonly awsService: AwsService,

    private readonly payoutService: IncentivePayoutsService,
  ) {}

  /**
   * Fetches dashboard users with their incentive and booking details.
   * @param page - The page number for pagination.
   * @param limit - The number of records per page.
   * @param search - To filter users by name or email.
   * @returns User data and total count.
   */

  async getDashboardUsers(
    page?: number,
    limit?: number,
    search?: string,
    sortBy?: string,
    isExport: boolean = false,
  ) {
    try {
      const offset = !isExport ? (page - 1) * limit || 0 : null;

      const queryObj = {
        relations: ['role'],
        where: search
          ? [
              { role: { name: RolesEnum.RM }, name: ILike(`%${search}%`) },
              { role: { name: RolesEnum.RM }, email: ILike(`%${search}%`) },
              { role: { name: RolesEnum.RM }, empCode: ILike(`%${search}%`) },
            ]
          : { role: { name: RolesEnum.RM } },
      };

      const [users, total] = await this.userRepo.findAndCount(queryObj);
      if (!users || users.length === 0) {
        return {
          message: 'No users found.',
          total: 0,
          page,
          limit,
          data: [],
        };
      }

      const currentDate = new Date();
      const currentFYStart =
        currentDate.getMonth() + 1 < 4
          ? new Date(currentDate.getFullYear() - 1, 3, 1)
          : new Date(currentDate.getFullYear(), 3, 1);
      const currentFYEnd = new Date(currentFYStart.getFullYear() + 1, 2, 31);
      const lastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1,
      );
      const lastMonthEnd = new Date(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        0,
      );
      // Temporary change for testing: using previous month incentive data instead of second last month.
      const secondLastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1,
      );
      const targetYear = secondLastMonth.getFullYear();
      const targetMonth = secondLastMonth.getMonth() + 1;

      const userIds = users.map((user) => user.id).filter(Number.isInteger);

      // Temporary change for testing: fetching previous financial year incentivePaidYTD data instead of current financial year.
      const lastFYStart = new Date(currentFYStart.getFullYear() - 1, 3, 1);
      const lastFYEnd = new Date(currentFYStart.getFullYear(), 2, 31);

      // Fetch incentivePaid data ONCE
      const result = await this.payoutRepo
        .createQueryBuilder('payout')
        .select('payout.userId', 'userId')
        .addSelect(
          `
          SUM(
            CASE
              WHEN CONCAT(payout.year, LPAD(payout.month, 2, '0')) BETWEEN :fyStart AND :fyEnd
              THEN payout.incentive_paid
              ELSE 0
            END
          )
        `,
          'incentivePaidYTD',
        )
        .addSelect(
          `
          SUM(
            CASE
              WHEN payout.year = :targetYear AND payout.month = :targetMonth
              THEN payout.incentive_paid
              ELSE 0
            END
          )
        `,
          'incentivePaid',
        )
        .where('payout.userId IN (:...userIds)', { userIds })
        .setParameters({
          fyStart: `${lastFYStart.getFullYear()}04`,
          fyEnd: `${lastFYEnd.getFullYear()}03`,
          targetYear,
          targetMonth,
        })
        .groupBy('payout.userId')
        .getRawMany();

      // Chunk userIds (e.g., 500 each)
      const userIdChunks = chunk(userIds, 500);

      const spResults = [];

      for (const chunkedIds of userIdChunks) {
        const chunkJson = JSON.stringify(chunkedIds);
        const [spChunk] = await this.dataSource.query(
          'CALL get_incentive_summary(?, ?, ?, ?, ?)',
          [chunkJson, currentFYStart, currentFYEnd, lastMonth, lastMonthEnd],
        );

        if (Array.isArray(spChunk)) {
          spResults.push(...spChunk);
        }
      }

      // Final mapped data
      let data = users.map((user) => {
        const userId = user.id;
        const userStats = spResults.find((i) => i.userId === userId) || {
          incentivePayable: '0',
          bookingAmountYTD: '0',
          collectedAmountYTD: '0',
          totalBookings: '0',
          qualifiedBookings: '0',
          disqualifiedBookings: '0',
          cancelledBookings: '0',
          regularisedBookings: '0',
          unRegularisedBookings: '0',
        };

        const incentivePaidYTDValue =
          result.find((i) => i.userId === userId)?.incentivePaidYTD || 0;
        const incentivePaidValue =
          result.find((i) => i.userId === userId)?.incentivePaid || 0;

        return {
          id: user.id,
          empCode: user.empCode,
          name: user.name,
          email: user.email,
          incentivePaidYTD: Number(incentivePaidYTDValue).toFixed(0),
          incentivePaid: Number(incentivePaidValue).toFixed(0),
          incentivePayable: Number(userStats.incentivePayable).toFixed(0),
          bookingAmountYTD: (
            Number(userStats.bookingAmountYTD) / ONE_CRORE
          ).toFixed(2),
          collectedAmountYTD: (
            Number(userStats.collectedAmountYTD) / ONE_CRORE
          ).toFixed(2),
          totalBookings: userStats.totalBookings,
          qualifiedBookings: userStats.qualifiedBookings,
          disqualifiedBookings: userStats.disqualifiedBookings,
          cancelledBookings: userStats.cancelledBookings,
          regularisedBookings: userStats.regularisedBookings,
          unRegularisedBookings: userStats.unRegularisedBookings,
        };
      });

      // Sorting
      const validSortFields = {
        empCode: 'empCode',
        name: 'name',
        incentivePaidYTD: 'incentivePaidYTD',
        incentivePaid: 'incentivePaid',
        incentivePayable: 'incentivePayable',
        bookingAmountYTD: 'bookingAmountYTD',
        collectedAmountYTD: 'collectedAmountYTD',
        totalBookings: 'totalBookings',
        qualifiedBookings: 'qualifiedBookings',
        disqualifiedBookings: 'disqualifiedBookings',
        cancelledBookings: 'cancelledBookings',
        regularisedBookings: 'regularisedBookings',
        unRegularisedBookings: 'unRegularisedBookings',
      };

      if (sortBy) {
        const [field, directionRaw] = sortBy.split(':');
        const direction =
          directionRaw?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const dbField = validSortFields[field as keyof typeof validSortFields];
        if (dbField) {
          data = this.sortData(data, dbField, direction);
        } else {
          throw new BadRequestException(
            `Invalid sort field "${field}". Allowed fields: ${Object.keys(validSortFields).join(', ')}`,
          );
        }
      }

      const paginatedData = !isExport
        ? data.slice(offset, offset + limit)
        : data;

      return {
        message: 'Dashboard Users fetched successfully',
        data: { users: paginatedData, total, page, limit },
      };
    } catch (error) {
      logger.error(
        'Error fetching admin dashboard users:',
        JSON.stringify(error),
      );
      throw new InternalServerErrorException(
        'Failed to fetch admin dashboard users',
      );
    }
  }

  private sortData(data, field, direction = 'DESC') {
    if (!field) return data;

    return [...data].sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      // Normalize values: convert strings representing numbers to actual numbers
      const isNumeric = !isNaN(valA) && !isNaN(valB);
      if (isNumeric) {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = (valA ?? '').toString().toLowerCase();
        valB = (valB ?? '').toString().toLowerCase();
      }

      if (valA < valB) return direction === 'ASC' ? -1 : 1;
      if (valA > valB) return direction === 'ASC' ? 1 : -1;
      return 0;
    });
  }

  async exportDashboardUsers(
    page?: number,
    limit?: number,
    search?: string,
    sortBy?: string,
  ) {
    try {
      const result = await this.getDashboardUsers(
        page,
        limit,
        search,
        sortBy,
        true,
      );
      const users = (result as { data: { users: any[] } })?.data?.users || [];

      if (!users.length) {
        return {
          message: 'No users found to export',
          data: [],
        };
      }

      // Create Workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Dashboard Users');

      // Define headers
      worksheet.columns = [
        { header: 'Emp Code', key: 'empCode', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 40 },
        {
          header: 'Incentive Paid YTD',
          key: 'incentivePaidYTD',
          width: 20,
        },
        {
          header: 'Incentive Payable',
          key: 'incentivePayable',
          width: 20,
        },
        { header: 'Last Incentive Paid', key: 'incentivePaid', width: 20 },
        {
          header: 'Total Agreement Value (AV)​',
          key: 'bookingAmountYTD',
          width: 25,
        },
        {
          header: 'AV Collected YTD​',
          key: 'collectedAmountYTD',
          width: 25,
        },
        {
          header: 'Units Sold',
          key: 'totalBookings',
          width: 15,
        },
        {
          header: 'Qualified Bookings',
          key: 'qualifiedBookings',
          width: 22,
        },
        {
          header: 'Disqualified Bookings',
          key: 'disqualifiedBookings',
          width: 22,
        },
        {
          header: 'Cancelled Bookings',
          key: 'cancelledBookings',
          width: 22,
        },
        {
          header: 'Regularised Bookings',
          key: 'regularisedBookings',
          width: 22,
        },
        {
          header: 'Unregularised Bookings',
          key: 'unRegularisedBookings',
          width: 23,
        },
      ];

      worksheet.getRow(1).font = { bold: true };

      users.forEach((user) => {
        worksheet.addRow([
          user.empCode || 'N/A',
          user.name || 'N/A',
          user.email || 'N/A',
          user.incentivePaidYTD || '0.00',
          user.incentivePayable || '0.00',
          user.incentivePaid || '0.00',
          user.bookingAmountYTD || '0.00',
          user.collectedAmountYTD || '0.00',
          user.totalBookings || '0',
          user.qualifiedBookings || '0',
          user.disqualifiedBookings || '0',
          user.cancelledBookings || '0',
          user.regularisedBookings || '0',
          user.unRegularisedBookings || '0',
        ]);
      });

      // Generate Buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Upload to S3
      const timeStamp = formatDateUtil(undefined, 'timestamp');
      const s3Key = `exports/admin-reports/users/users-${timeStamp}.xlsx`;
      const stream = new PassThrough();
      stream.end(buffer);
      await this.awsService.uploadToS3(s3Key, stream, true);

      return {
        message: 'Users exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Dashboard user export failed:', error);
      throw new InternalServerErrorException(
        'Failed to export dashboard users',
      );
    }
  }

  async userBookings(options: {
    userId?: number;
    page?: number;
    limit?: number;
    search?: string;
    brandId?: number[];
    projectIds?: number[];
    unitStatus?: string;
    incentiveStatus?: PaymentStatusEnum;
    startDate?: Date;
    endDate?: Date;
    rmIds?: number[];
    sortBy?: string;
  }) {
    try {
      const {
        userId,
        page,
        limit,
        search,
        brandId,
        projectIds,
        unitStatus,
        incentiveStatus,
        startDate,
        endDate,
        rmIds,
        sortBy,
      } = options;

      let message = '';
      const today = new Date();
      const [financialStart] = getCurrentFinancialYear();

      // Base query
      const query = this.bookingRepo
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.projectPhase', 'projectPhase')
        .leftJoinAndSelect('booking.policyUsed', 'policyUsed')
        .leftJoinAndSelect('booking.user', 'user')
        .leftJoinAndSelect('projectPhase.project', 'project')
        .andWhere('booking.unitStatus != :status', {
          status: UnitStatusEnum.USER_PROJECT_POLICY_NOT_FOUND,
        });

      // Sorting
      this.applySorting(query, sortBy);

      // Text search
      this.applySearch(query, search);

      // Simple filters
      this.applyBrandAndProjectFilters(query, brandId, projectIds);
      this.applyIncentiveStatusFilter(query, incentiveStatus);

      // User / RM filters (+validation)
      const user = await this.applyUserFilters(query, userId, rmIds);

      // Date range filter (with dynamic date field logic)
      this.applyDateRangeFilter(query, {
        startDate,
        endDate,
        unitStatus,
        incentiveStatus,
      });

      // Unit status filter (QUALIFIED → [QUALIFIED, QUALIFIED_CANCELLED])
      this.applyUnitStatusFilter(
        query,
        unitStatus as UnitStatusEnum | undefined,
      );

      // Default range if nothing was filtered
      const hasAnyFiltersApplied = this.hasAnyFilters({
        userId,
        search,
        brandId,
        projectIds,
        unitStatus,
        incentiveStatus,
        rmIds,
        startDate,
        endDate,
      });
      if (!hasAnyFiltersApplied) {
        query.andWhere('booking.bookingDate BETWEEN :start AND :end', {
          start: financialStart,
          end: today,
        });
      }

      // Message construction
      message = this.buildMessage({
        user,
        userId,
        startDate,
        endDate,
        search,
        brandId,
        projectIds,
        unitStatus,
        incentiveStatus,
        rmIds,
        financialStart,
        today,
      });

      // Sums (clone of query with same parameters)
      const sumQuery = this.buildSumQuery(query, {
        brandId,
        projectIds,
        userId,
        rmIds,
        incentiveStatus,
        startDate,
        endDate,
        unitStatus: unitStatus as UnitStatusEnum | undefined,
      });

      // Pagination
      if (limit !== -1) {
        query.skip((page - 1) * limit).take(limit);
      }

      // Execute
      const [[bookings, total], sums] = await Promise.all([
        query.getManyAndCount(),
        sumQuery.getRawOne(),
      ]);

      const incentiveAmountSum = Number(sums?.incentiveAmountSum) || 0;
      const grossTotalValueSum = Number(sums?.grossTotalValueSum) || 0;

      if (!bookings.length) {
        return {
          message,
          data: {
            bookings: [],
            total: 0,
            page,
            limit,
            incentiveAmountSum: 0,
            grossTotalValueSum: 0,
          },
        };
      }

      // Map response
      const data = bookings.map((booking) => this.mapBookingRow(booking));

      return {
        message,
        data: {
          bookings: data,
          total,
          page,
          limit,
          incentiveAmountSum,
          grossTotalValueSum,
        },
      };
    } catch (error) {
      logger.error('Error fetching bookings:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to fetch bookings');
    }
  }

  /**
   * Builds a sum query based on the provided base query and filters.
   * @param baseQuery - The base SelectQueryBuilder to clone and build upon.
   * @param filters - The filters to apply to the sum query.
   * @returns A SelectQueryBuilder that calculates the sums.
   */
  async exportUserBookings(options: {
    userId: number;
    page?: number;
    limit?: number;
    search?: string;
    brandId?: number[];
    projectIds?: number[];
    unitStatus?: string;
    incentiveStatus?: PaymentStatusEnum;
    startDate?: Date;
    endDate?: Date;
    rmIds?: number[];
    sortBy?: string;
  }) {
    try {
      const { userId } = options;
      options.limit = -1; // Fetch all for export
      const result = await this.userBookings(options);

      const bookings =
        (result as { data: { bookings: any[] } })?.data?.bookings || [];

      if (!bookings.length) {
        return {
          message: 'No qualified bookings found to export.',
          data: [],
        };
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('User Bookings');

      // Header row
      worksheet.columns = [
        { header: 'RM Name', key: 'rmName', width: 20 },
        { header: 'Emp Code', key: 'empCode', width: 15 },
        { header: 'Booking Id', key: 'bookingId', width: 15 },
        { header: 'Vendor', key: 'vendor', width: 15 },
        { header: 'Unit Status', key: 'unitStatus', width: 15 },
        { header: 'Customer Name', key: 'customerName', width: 25 },
        { header: 'Project Name', key: 'projectName', width: 30 },
        { header: 'Phase Name', key: 'phaseName', width: 30 },
        { header: 'Property No', key: 'propertyNo', width: 20 },
        { header: 'Booking Date', key: 'bookingDate', width: 18 },
        { header: 'SAP Booking Date', key: 'sapBookingDate', width: 18 },
        {
          header: 'Agreement Recd. Date',
          key: 'agreementReceivedDate',
          width: 20,
        },
        { header: 'Reg. % Recd. Date', key: 'receivedDate', width: 18 },
        { header: 'Qualification Date', key: 'qualificationDate', width: 20 },
        { header: 'Incentive Paid Date', key: 'paidDate', width: 20 },
        { header: 'Amount Received %', key: 'receivedPercentage', width: 18 },
        { header: 'Agreement Value', key: 'grossTotalValue', width: 20 },
        { header: 'Incentive %', key: 'incentivePercentage', width: 15 },
        { header: 'Incentive Payable', key: 'incentiveAmount', width: 20 },
        { header: 'Policy Applied', key: 'policyUsed', width: 40 },
        { header: 'Sale Type', key: 'saleType', width: 18 },
        { header: 'Stage', key: 'stage', width: 15 },
        { header: 'Cancelled Date', key: 'cancellationDate', width: 15 },
        { header: 'Incentive Status', key: 'paymentStatus', width: 20 },
        {
          header: 'Ineligibility Reason',
          key: 'ineligibilityReason',
          width: 40,
        },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.columns.forEach((column) => {
        column.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      function buildBookingRow(b) {
        const na = 'N/A';

        const formatDate = (date) => {
          const parsed = parse(date, 'do MMM yyyy', new Date());
          return isValid(parsed) ? format(parsed, 'dd-MM-yyyy') : na;
        };

        const pick = (value) => value || na;
        const pickNullable = (value) => value ?? na;

        return {
          rmName: pick(b.rmName),
          empCode: pick(b.empCode),
          bookingId: pick(b.bookingId),
          vendor: pick(b.vendor),
          unitStatus: pick(b.unitStatus),
          customerName: pick(b.customerName),
          projectName: pick(b.projectName),
          phaseName: pick(b.phaseName),
          propertyNo: pick(b.propertyNo),

          bookingDate: formatDate(b.bookingDate),
          sapBookingDate: formatDate(b.sapBookingDate),
          agreementReceivedDate: formatDate(b.agreementReceivedDate),
          receivedDate: formatDate(b.receivedDate),
          qualificationDate: formatDate(b.qualificationDate),
          paidDate: formatDate(b.paidDate),
          cancellationDate: formatDate(b.cancellationDate),

          receivedPercentage: pickNullable(b.receivedPercentage),
          grossTotalValue: pickNullable(b.grossTotalValue),
          incentivePercentage: pickNullable(b.incentivePercentage),
          incentiveAmount: pickNullable(b.incentiveAmount),

          policyUsed: pick(b.policyUsed),
          saleType: pick(b.saleType),
          stage: pick(b.stage),
          paymentStatus: pick(b.paymentStatus),
          ineligibilityReason: pick(b.ineligibilityReason),
        };
      }

      bookings.forEach((b) => {
        worksheet.addRow(buildBookingRow(b));
      });
      const buffer = await workbook.xlsx.writeBuffer();

      let s3Key = '';
      const timestamp = formatDateUtil(undefined, 'timestamp');

      if (userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });

        if (!user) {
          throw new NotFoundException(`User not found with ID ${userId}`);
        }

        s3Key = `exports/admin-reports/user-bookings/${toTitleCase(user.name)}-${timestamp}.xlsx`;
      } else {
        s3Key = `exports/admin-reports/user-bookings/Recent-Bookings-${timestamp}.xlsx`;
      }

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(s3Key, stream, true);

      return {
        message: 'User bookings exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Error exporting user bookings:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to export user bookings');
    }
  }

  async updatePaymentStatus(ids: number[], paymentStatus: PaymentStatusEnum) {
    try {
      const bookings = await this.bookingRepo.find({
        where: {
          id: In(ids),
          paymentStatus: In([
            PaymentStatusEnum.PAID,
            PaymentStatusEnum.HOLD,
            PaymentStatusEnum.PAYABLE,
          ]),
          unitStatus: In([
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ]),
        },
        relations: ['user'],
      });
      if (!bookings.length) {
        throw new NotFoundException(
          'No valid bookings found for the provided IDs',
        );
      }

      const alreadyPaid = bookings.filter(
        (b) => b.paymentStatus === PaymentStatusEnum.PAID,
      );

      const isTryingToChangePaid =
        alreadyPaid.length > 0 && paymentStatus !== PaymentStatusEnum.PAID;

      if (isTryingToChangePaid) {
        const paidBookingIds = alreadyPaid.map((b) => b.id).join(', ');
        throw new BadRequestException(
          `Cannot change status of already 'Paid' bookings: ${paidBookingIds}`,
        );
      }

      const currentDate = new Date();
      const bookingIds = bookings.map((booking) => booking.id);
      if (paymentStatus === PaymentStatusEnum.PAID)
        await this.payoutService.processSelectedIncentivePayments(bookingIds);
      for (const booking of bookings) {
        booking.paymentStatus = paymentStatus;
        if (paymentStatus === PaymentStatusEnum.PAID) {
          booking.paidDate = currentDate;
        } else {
          booking.paidDate = null;
        }
      }

      await this.bookingRepo.save(bookings);

      return {
        message: `${bookings.length} booking(s) updated successfully.`,
      };
    } catch (error) {
      logger.error('Error updating payment status:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to update payment status');
    }
  }

  private getValidSortFields() {
    return {
      projectName: 'project.name',
      bookingDate: 'booking.bookingDate',
      agreementReceivedDate: 'booking.agreementReceivedDate',
      qualificationDate: 'booking.payableReceivedDate',
      receivedDate: 'booking.receivedDate',
      paidDate: 'booking.paidDate',
      grossTotalValue: 'booking.grossTotalValue',
      incentivePercentage: 'booking.incentivePercentage',
      incentiveAmount: 'booking.incentiveAmount',
      receivedPercentage: 'booking.receivedPercent',
      rmName: 'user.name',
      paymentStatus: 'booking.paymentStatus',
      unitStatus: 'booking.unitStatus',
      stage: 'booking.bookingProjectType',
      saleType: 'booking.saleType',
      empCode: 'booking.empCode',
    } as const;
  }

  private applySorting(query: SelectQueryBuilder<any>, sortBy?: string) {
    const validSortFields = this.getValidSortFields();
    if (sortBy) {
      const [field, directionRaw] = sortBy.split(':');
      const direction = directionRaw?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const dbField = validSortFields[field as keyof typeof validSortFields];

      if (!dbField) {
        throw new BadRequestException(
          `Invalid sort field "${field}". Allowed fields: ${Object.keys(validSortFields).join(', ')}`,
        );
      }
      query.orderBy(dbField, direction);
      query.addOrderBy('booking.bookingId', 'ASC');
      return;
    }
    query.orderBy('booking.bookingDate', 'DESC');
    query.addOrderBy('booking.bookingId', 'ASC');
  }

  private applySearch(query: SelectQueryBuilder<any>, search?: string) {
    if (!search) return;
    query.andWhere(
      '(LOWER(booking.customer_name) LIKE :search OR LOWER(booking.property_number) LIKE :search)',
      { search: `%${search.toLowerCase()}%` },
    );
  }

  private applyBrandAndProjectFilters(
    query: SelectQueryBuilder<any>,
    brandId?: number[],
    projectIds?: number[],
  ) {
    if (brandId?.length) {
      query.andWhere('project.brand_id IN (:...brandId)', { brandId });
    }
    if (projectIds?.length) {
      query.andWhere('project.id IN (:...projectIds)', { projectIds });
    }
  }

  private applyIncentiveStatusFilter(
    query: SelectQueryBuilder<any>,
    incentiveStatus?: PaymentStatusEnum,
  ) {
    if (!incentiveStatus) return;
    query.andWhere('booking.payment_status = :incentiveStatus', {
      incentiveStatus,
    });
  }

  private async applyUserFilters(
    query: SelectQueryBuilder<any>,
    userId?: number,
    rmIds?: number[],
  ) {
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user)
        throw new BadRequestException(`User with Id ${userId} does not exist`);
      query.andWhere('booking.user_id = :userId', { userId });
      return user;
    }

    if (rmIds?.length) {
      const rmUsers = await this.userRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.id IN (:...rmIds)', { rmIds })
        .andWhere('role.name = :rmRole', { rmRole: RolesEnum.RM })
        .getMany();

      if (rmUsers.length !== rmIds.length) {
        throw new BadRequestException('One or more selected users are not RMs');
      }
      query.andWhere('booking.user_id IN (:...rmIds)', { rmIds });
    }
    return null;
  }

  private applyDateRangeFilter(
    query: SelectQueryBuilder<any>,
    params: {
      startDate?: Date;
      endDate?: Date;
      unitStatus?: UnitStatusEnum | string;
      incentiveStatus?: PaymentStatusEnum;
    },
  ) {
    const { startDate, endDate, unitStatus, incentiveStatus } = params;
    if (!(startDate && endDate)) return;

    let dateField = getDateFieldByUnitStatus(unitStatus as UnitStatusEnum);
    if (incentiveStatus === PaymentStatusEnum.PAID) {
      dateField = 'booking.paidDate';
    }
    query.andWhere(`${dateField} BETWEEN :start AND :end`, {
      start: startDate,
      end: endDate,
    });
  }

  private applyUnitStatusFilter(
    query: SelectQueryBuilder<any>,
    unitStatus?: UnitStatusEnum,
  ) {
    if (!unitStatus) return;
    const statusArray =
      unitStatus === UnitStatusEnum.QUALIFIED
        ? [UnitStatusEnum.QUALIFIED, UnitStatusEnum.QUALIFIED_CANCELLED]
        : [unitStatus];

    query.andWhere('booking.unit_status IN (:...unitStatuses)', {
      unitStatuses: statusArray,
    });
  }

  private hasAnyFilters(opts: {
    userId?: number;
    search?: string;
    brandId?: number[];
    projectIds?: number[];
    unitStatus?: string;
    incentiveStatus?: PaymentStatusEnum;
    rmIds?: number[];
    startDate?: Date;
    endDate?: Date;
  }) {
    const {
      userId,
      search,
      brandId,
      projectIds,
      unitStatus,
      incentiveStatus,
      rmIds,
      startDate,
      endDate,
    } = opts;

    return Boolean(
      userId ||
      search ||
      brandId?.length ||
      projectIds?.length ||
      unitStatus ||
      incentiveStatus ||
      rmIds?.length ||
      startDate ||
      endDate,
    );
  }

  private buildMessage(params: {
    user: any;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    brandId?: number[];
    projectIds?: number[];
    unitStatus?: string;
    incentiveStatus?: PaymentStatusEnum;
    rmIds?: number[];
    financialStart: Date | string;
    today: Date;
  }) {
    const {
      user,
      userId,
      startDate,
      endDate,
      search,
      brandId,
      projectIds,
      unitStatus,
      incentiveStatus,
      rmIds,
      financialStart,
      today,
    } = params;

    if (userId && user) return toTitleCase(user.name);

    const hasDateRange = !!startDate && !!endDate;
    const hasOtherFilters = Boolean(
      search ||
      brandId?.length ||
      projectIds?.length ||
      unitStatus ||
      incentiveStatus ||
      rmIds?.length,
    );

    if (hasDateRange) {
      return `Bookings from Given Range Days - ${formatDateUtil(startDate, 'date')} to ${formatDateUtil(endDate, 'date')}`;
    }
    if (hasOtherFilters) return '';

    return `Bookings In Current Financial Year - ${formatDateUtil(financialStart, 'date')} to ${formatDateUtil(today, 'date')}`;
  }

  private buildSumQuery(
    baseQuery: SelectQueryBuilder<any>,
    params: {
      brandId?: number[];
      projectIds?: number[];
      userId?: number;
      rmIds?: number[];
      incentiveStatus?: PaymentStatusEnum;
      startDate?: Date;
      endDate?: Date;
      unitStatus?: UnitStatusEnum;
    },
  ) {
    const {
      brandId,
      projectIds,
      userId,
      rmIds,
      incentiveStatus,
      startDate,
      endDate,
      unitStatus,
    } = params;

    const sumQuery = baseQuery.clone().select([
      'SUM(booking.incentive_amount) AS incentiveAmountSum',
      `(SELECT SUM(grossTotalValue) FROM (
      SELECT MAX(booking_inner.gross_total_value) AS grossTotalValue
      FROM incentive_bookings booking_inner
      LEFT JOIN project_phases projectPhase_inner ON projectPhase_inner.id = booking_inner.project_phase_id AND projectPhase_inner.deleted_at IS NULL
      LEFT JOIN projects project_inner ON project_inner.id = projectPhase_inner.project_id AND project_inner.deleted_at IS NULL
      LEFT JOIN users user_inner ON user_inner.id = booking_inner.user_id AND user_inner.deleted_at IS NULL
      WHERE booking_inner.unit_status != 'User Or Project Or Policy Not Found'
      ${brandId?.length ? 'AND project_inner.brand_id IN (:...brandId)' : ''}
      ${projectIds?.length ? 'AND project_inner.id IN (:...projectIds)' : ''}
      ${userId ? 'AND booking_inner.user_id = :userId' : ''}
      ${rmIds?.length ? 'AND booking_inner.user_id IN (:...rmIds)' : ''}
      ${incentiveStatus ? 'AND booking_inner.payment_status = :incentiveStatus' : ''}
      ${
        startDate && endDate
          ? (() => {
              let dateField = '';
              if (incentiveStatus === PaymentStatusEnum.PAID) {
                dateField = 'booking_inner.paid_date';
              } else if (unitStatus === UnitStatusEnum.QUALIFIED) {
                dateField = 'booking_inner.payable_received_date';
              } else {
                dateField = 'booking_inner.booking_date';
              }
              return `AND ${dateField} BETWEEN :startDate AND :endDate`;
            })()
          : ''
      }
      ${unitStatus ? 'AND booking_inner.unit_status IN (:...unitStatuses)' : ''}
      GROUP BY booking_inner.booking_id
    ) AS uniqueBookings) AS grossTotalValueSum`,
    ]);

    const sumParams: Record<string, any> = {
      brandId,
      projectIds,
      userId,
      rmIds,
      incentiveStatus,
      startDate,
      endDate,
    };

    if (unitStatus) {
      sumParams.unitStatuses =
        unitStatus === UnitStatusEnum.QUALIFIED
          ? [UnitStatusEnum.QUALIFIED, UnitStatusEnum.QUALIFIED_CANCELLED]
          : [unitStatus];
    }

    return sumQuery.setParameters(sumParams);
  }

  private formatDate(value: any): string {
    return formatDateUtil(value, 'date');
  }

  private orNA(value: any): string {
    return value ?? 'N/A';
  }

  private mapBookingRow(booking: any) {
    const { user, projectPhase } = booking;
    const project = projectPhase?.project;

    return {
      id: this.orNA(booking.id),
      bookingId: this.orNA(booking.bookingId),
      vendor: this.orNA(booking.vendor),
      unitStatus:
        booking.unitStatus === UnitStatusEnum.QUALIFIED_CANCELLED
          ? UnitStatusEnum.QUALIFIED
          : this.orNA(booking.unitStatus),
      customerName: this.orNA(booking.customerName),
      projectName: this.orNA(project?.name),
      phaseName: this.orNA(projectPhase?.name),
      propertyNo: this.orNA(booking.propertyNumber),
      bookingDate: this.formatDate(booking.bookingDate),
      sapBookingDate: this.formatDate(booking.sapBookingDate),
      agreementReceivedDate: this.formatDate(booking.agreementReceivedDate),
      receivedDate: this.formatDate(booking.receivedDate),
      receivedPercentage: this.orNA(booking.receivedPercent),
      grossTotalValue: this.orNA(booking.grossTotalValue),
      incentivePercentage: this.orNA(booking.incentivePercentage),
      incentiveAmount: this.orNA(booking.incentiveAmount),
      paymentStatus: this.orNA(booking.paymentStatus),
      saleType: this.orNA(booking.saleType),
      stage: this.orNA(booking.bookingProjectType),
      qualificationDate: this.formatDate(booking.payableReceivedDate),
      paidDate: this.formatDate(booking.paidDate),
      cancellationDate: this.formatDate(booking.cancellationDate),
      rmName: this.orNA(user?.name),
      empCode: this.orNA(user?.empCode),
      ineligibilityReason: booking?.ineligibilityReason || null,
      policyUsed: this.orNA(booking?.policyUsed?.name),
    };
  }
}
