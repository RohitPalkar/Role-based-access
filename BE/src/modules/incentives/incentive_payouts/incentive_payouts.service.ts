import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomConfigService } from 'src/config/custom-config.service';
import {
  IncentiveBooking,
  IncentiveDeltaHistory,
  UserIncentivePayout,
} from 'src/entities';
import { Users } from 'src/modules/users/entities/user.entity';
import {
  PaymentStatusEnum,
  UnitStatusEnum,
} from 'src/enums/booking-list.enums';
import { logger } from 'src/logger/logger';
import {
  In,
  Repository,
  MoreThanOrEqual,
  Brackets,
  EntityManager,
} from 'typeorm';
import * as moment from 'moment';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { PassThrough } from 'stream';
import * as ExcelJS from 'exceljs';
import { isIndianGroup } from 'src/utils/isIndianGroup';
import { formatDateUtil } from 'src/helpers/date.helper';
import { AwsService } from '../../aws/aws.service';
import { PayoutFileDto } from './dto/payout-file.dto';
import {
  ExcelColumnDefinition,
  normalizeData,
  parseExcelFile,
  validateExcelFile,
} from 'src/utils/excel.utils';
import { BulkPayoutLog } from './entities/bulk_payout_logs.entity';
import { BRAND_PURAVANKARA, SUCCESS } from 'src/config/constants';

@Injectable()
export class IncentivePayoutsService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(IncentiveBooking)
    private readonly incentiveBookingRepository: Repository<IncentiveBooking>,

    @InjectRepository(UserIncentivePayout)
    private readonly userIncentivePayoutRepository: Repository<UserIncentivePayout>,

    @InjectRepository(BulkPayoutLog)
    private readonly bulkPayoutLogRepository: Repository<BulkPayoutLog>,
    private readonly configService: CustomConfigService,
    private readonly awsService: AwsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Fetches payable bookings based on the provided query parameters.
   * @param queryDto - The query parameters for fetching bookings.
   * @returns A promise that resolves to the list of payable bookings.
   */
  async getPayableBookings(options: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    brandIds?: number[];
    projectIds?: number[];
    rmIds?: number[];
    sortBy?: string;
  }): Promise<any> {
    try {
      const {
        page,
        limit,
        search,
        startDate,
        endDate,
        brandIds,
        projectIds,
        rmIds,
        sortBy,
      } = options;
      const query = this.incentiveBookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.user', 'user')
        .leftJoin('booking.deltas', 'delta')
        .select([
          'booking.id AS id',
          'booking.incentiveAmount AS incentiveAmount',
          'booking.payableReceivedDate AS payableReceivedDate',
          'booking.unitStatus AS unitStatus',
          'booking.paymentStatus AS paymentStatus',
          'booking.bookingId AS bookingId',
          'booking.vendor AS vendor',
          'user.id AS userId',
          'user.name AS rmName',
          'user.empCode AS empCode',
        ])
        .addSelect(
          'COALESCE(SUM(CASE WHEN delta.isUtilized = false THEN delta.deltaAmount ELSE 0 END), 0)',
          'unusedDelta',
        )
        .addSelect(
          'COALESCE(SUM(CASE WHEN delta.isUtilized = true THEN delta.deltaAmount ELSE 0 END), 0)',
          'utilizedDelta',
        )
        .where('booking.unitStatus IN (:...unitStatuses)', {
          unitStatuses: [
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ],
        })
        .andWhere(
          new Brackets((qb) => {
            qb.where('booking.paymentStatus IN (:...statuses)', {
              statuses: [PaymentStatusEnum.PAYABLE, PaymentStatusEnum.HOLD],
            }).orWhere('booking.paymentStatus = :paidStatus', {
              paidStatus: PaymentStatusEnum.PAID,
            });
          }),
        )
        .andWhere('booking.incentiveAmount > 0')
        .groupBy('booking.id')
        .addGroupBy('user.id')
        .having(
          `
            booking.paymentStatus != :paidStatus OR COALESCE(SUM(delta.deltaAmount), 0) != 0
          `,
          {
            paidStatus: PaymentStatusEnum.PAID,
          },
        )
        .orderBy('booking.payableReceivedDate', 'ASC');

      if (rmIds?.length) {
        query.andWhere('user.id IN (:...rmIds)', { rmIds });
      }
      if (brandIds?.length) {
        query.andWhere('booking.brandId IN (:...brandIds)', { brandIds });
      }
      if (projectIds?.length) {
        query.andWhere('booking.projectId IN (:...projectIds)', { projectIds });
      }

      if (search) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('user.name LIKE :search', {
              search: `%${search}%`,
            }).orWhere('booking.bookingId LIKE :search', {
              search: `%${search}%`,
            });
          }),
        );
      }

      if (sortBy) {
        const [field, order] = sortBy.split(':');
        query.orderBy(
          `booking.${field}`,
          order.toUpperCase() as 'ASC' | 'DESC',
        );
      }

      if (startDate && endDate) {
        query.andWhere(`booking.payableReceivedDate BETWEEN :start AND :end`, {
          start: startDate,
          end: endDate,
        });
      }

      if (limit !== -1) {
        query.skip((page - 1) * limit).take(limit);
      }
      const bookings = await query.getRawMany();

      if (bookings && bookings.length > 0) {
        bookings.forEach((booking) => {
          booking.incentiveAmount = Number(booking.incentiveAmount);
          booking.unusedDelta = Number(booking.unusedDelta);
          booking.utilizedDelta = Number(booking.utilizedDelta);
          booking.payableReceivedDate = moment(
            booking.payableReceivedDate,
          ).toDate();
          booking.amountType =
            booking.unusedDelta > 0 ? 'Delta Amount' : 'Incentive Amount';
          booking.alreadyPaid =
            booking.paymentStatus === PaymentStatusEnum.PAID
              ? Number(booking.utilizedDelta) + Number(booking.incentiveAmount)
              : 0;
          booking.payableIncentive =
            booking.paymentStatus === PaymentStatusEnum.PAID
              ? Number(booking.unusedDelta)
              : Number(booking.incentiveAmount);
        });
      }

      return {
        statusCode: SUCCESS,
        data: {
          bookings,
          total: bookings?.length || 0,
          page,
          limit,
        },
        message: 'Payable bookings fetched successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch payable bookings',
        error,
      );
    }
  }

  async exportPayableBookings(options: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    brandIds?: number[];
    projectIds?: number[];
    rmIds?: number[];
    sortBy?: string;
  }) {
    try {
      const {
        page,
        limit,
        search,
        startDate,
        endDate,
        brandIds,
        projectIds,
        rmIds,
        sortBy,
      } = options;
      const result = await this.getPayableBookings({
        page,
        limit: -1,
        search,
        startDate,
        endDate,
        brandIds,
        projectIds,
        rmIds,
        sortBy,
      });

      const bookings =
        (result as { data: { bookings: any[] } })?.data?.bookings || [];

      if (!bookings.length) {
        return {
          message: 'No payable bookings found to export.',
          data: [],
          limit,
        };
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Payable Bookings');

      // Header row
      worksheet.columns = [
        { header: 'RM Name', key: 'rmName', width: 30 },
        { header: 'Emp Code', key: 'empCode', width: 15 },
        { header: 'Booking Id', key: 'bookingId', width: 15 },
        { header: 'Vendor', key: 'vendor', width: 15 },
        { header: 'Unit Status', key: 'unitStatus', width: 15 },
        { header: 'Payment Status', key: 'paymentStatus', width: 16 },
        { header: 'Amount Type', key: 'amountType', width: 18 },
        { header: 'Incentive Payable', key: 'payableIncentive', width: 18 },
        { header: 'Already Paid', key: 'alreadyPaid', width: 15 },
        { header: 'Finance Remarks', key: 'remarks', width: 18 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.columns.forEach((column, index) => {
        column.alignment = { vertical: 'middle', horizontal: 'center' };
        if (index == 0) {
          column.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });

      worksheet.protect(BRAND_PURAVANKARA, {
        selectLockedCells: true,
        selectUnlockedCells: true,
      });

      bookings.forEach((b) => {
        const row = worksheet.addRow({
          rmName: b.rmName || 'N/A',
          empCode: b.empCode || 'N/A',
          bookingId: b.bookingId || 'N/A',
          vendor: b.vendor || 'N/A',
          unitStatus: b.unitStatus || 'N/A',
          paymentStatus: b.paymentStatus || 0,
          amountType: b.amountType ?? 'N/A',
          payableIncentive: b.payableIncentive ?? 0,
          alreadyPaid: b.alreadyPaid ?? 0,
          remarks: b.remarks ?? '',
        });

        const cell = worksheet.getCell(`J${row.number}`);
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Paid,Hold"'],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid Entry',
          error: 'Please select either Paid or Hold',
        };
        const remarksCell = worksheet.getCell(`J${row.number}`);
        remarksCell.protection = { locked: false };
      });
      const buffer = await workbook.xlsx.writeBuffer();

      const timestamp = formatDateUtil(undefined, 'timestamp');
      const s3Key = `exports/incentive-payout/Payable-Bookings-${timestamp}.xlsx`;

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

  async bulkPayout(user: any, payoutFileDto: PayoutFileDto): Promise<any> {
    try {
      const { key, fileName } = payoutFileDto;

      const normalizedRows = await this.validateAndParsePayoutFile(
        key,
        fileName,
      );

      return await this.bulkPayoutLogRepository.manager.transaction(
        async (manager) => {
          const { toInsert, bookingMap, userDeltaMap } =
            await this.preparePayoutBaseData(manager, normalizedRows, user);

          if (toInsert.length === 0) {
            return {
              message: 'No new records to insert. All records are duplicates.',
              data: {
                totalRecords: normalizedRows.length,
                inserted: 0,
                skipped: normalizedRows.length,
              },
            };
          }

          const { payoutRecords, bookingsToMarkPaid } =
            await this.calculateUserPayouts(
              manager,
              toInsert,
              bookingMap,
              userDeltaMap,
            );

          await this.persistBulkPayoutResults(
            manager,
            toInsert,
            payoutRecords,
            bookingsToMarkPaid,
            bookingMap,
          );

          const inserted = toInsert.length;
          const skipped = normalizedRows.length - inserted;

          return {
            message: `${inserted} records inserted successfully, ${skipped} skipped due to duplicates.`,
            data: {
              totalRecords: normalizedRows.length,
              inserted,
              skipped,
            },
          };
        },
      );
    } catch (error) {
      logger.error(
        `Bulk Payout upload failed: ${error.message || 'Unknown error'}`,
        error,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Bulk Payout upload failed: ${error.message || 'Unknown error'}`,
      );
    }
  }

  private async validateAndParsePayoutFile(key: string, fileName: string) {
    if (!key.endsWith('.xlsx')) {
      throw new BadRequestException(
        `Only .xlsx files are allowed. ${fileName} have different extension`,
      );
    }

    const fileBuffer = await this.awsService.fetchFileFromS3(key);
    if (!fileBuffer) {
      throw new BadRequestException(`File not found : ${fileName}`);
    }

    const fileColumns: ExcelColumnDefinition[] = [
      { key: 'rMName', label: 'RM Name', required: true, type: 'string' },
      { key: 'empCode', label: 'Emp Code', required: true, type: 'string' },
      { key: 'bookingId', label: 'Booking Id', required: true, type: 'number' },
      { key: 'vendor', label: 'Vendor', required: true, type: 'number' },
      {
        key: 'unitStatus',
        label: 'Unit Status',
        required: true,
        type: 'string',
      },
      {
        key: 'paymentStatus',
        label: 'Payment Status',
        required: true,
        type: 'string',
      },
      {
        key: 'amountType',
        label: 'Amount Type',
        required: true,
        type: 'string',
      },
      {
        key: 'incentivePayable',
        label: 'Incentive Payable',
        required: true,
        type: 'number',
      },
      {
        key: 'alreadyPaid',
        label: 'Already Paid',
        required: true,
        type: 'number',
      },
      {
        key: 'financeRemarks',
        label: 'Finance Remarks',
        required: true,
        type: 'string',
      },
    ];

    const validationErrors = await validateExcelFile(
      fileBuffer,
      fileColumns,
      (row, rowIndex) => {
        const errors = [];
        if (
          row.financeRemarks &&
          ![PaymentStatusEnum.PAID, PaymentStatusEnum.HOLD].includes(
            row.financeRemarks as PaymentStatusEnum,
          )
        ) {
          errors.push(`Invalid Financial Remarks (row ${rowIndex}).`);
        }
        return errors;
      },
    );

    if (validationErrors.length > 0) {
      throw new BadRequestException(
        validationErrors
          ?.map((error, index) => `Error ${index + 1}: ${error}`)
          .join(', '),
      );
    }

    const rawData = await parseExcelFile(fileBuffer);
    return normalizeData(rawData, fileColumns);
  }

  private async preparePayoutBaseData(
    manager: EntityManager,
    normalizedRows: any[],
    user: any,
  ) {
    const uniqueKeys = normalizedRows.map((row) => ({
      bookingId: row.bookingId,
      vendor: row.vendor,
      incentivePayable: row.incentivePayable,
      alreadyPaid: row.alreadyPaid,
    }));

    const toInsert = await this.getPayoutLogsToInsert(
      manager,
      uniqueKeys,
      normalizedRows,
      user,
    );

    if (toInsert.length === 0) {
      return {
        toInsert: [],
        bookingMap: new Map(),
        userDeltaMap: new Map(),
      };
    }

    const bookingKeys = toInsert.map((row) => ({
      bookingId: String(row.bookingId),
      vendor: String(row.vendor),
    }));

    const dbBookings = await manager.find(IncentiveBooking, {
      where: bookingKeys,
      relations: ['user', 'user.brand', 'user.group'],
      select: ['id', 'bookingId', 'vendor', 'user'],
    });

    const bookingMap = new Map<string, IncentiveBooking>();
    for (const b of dbBookings) {
      bookingMap.set(`${b.bookingId}_${b.vendor}`, b);
    }

    const deltaRows = toInsert.filter(
      (row) =>
        row.amountType === 'Delta Amount' &&
        row.financeRemarks === PaymentStatusEnum.PAID,
    );

    const userDeltaMap = new Map<number, number>();
    for (const row of deltaRows) {
      const key = `${row.bookingId}_${row.vendor}`;
      const booking = bookingMap.get(key);
      if (!booking) continue;

      const delta = userDeltaMap.get(booking?.user?.id) || 0;
      userDeltaMap.set(booking?.user?.id, delta + Number(row.incentivePayable));

      await manager.update(
        IncentiveDeltaHistory,
        {
          booking: { id: booking?.id },
          user: { id: booking?.user?.id },
        },
        { isUtilized: true },
      );
    }

    return { toInsert, bookingMap, userDeltaMap };
  }

  private async calculateUserPayouts(
    manager: EntityManager,
    toInsert: any[],
    bookingMap: Map<string, IncentiveBooking>,
    userDeltaMap: Map<number, number>,
  ) {
    const { rmBookingMap, userMap } = this.buildRmBookingMapAndUsers(
      toInsert,
      bookingMap,
    );

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const payoutRecords: Partial<UserIncentivePayout>[] = [];
    const bookingsToMarkPaid = new Set<number>();

    for (const [userId, data] of rmBookingMap.entries()) {
      const user = userMap.get(userId);
      if (!user) continue;

      const { rmSalary, maxMultiplier, maxCap } =
        this.resolveUserFinancials(user);

      const { finalIncentive, localAccruals, newDelta } =
        await this.computeFinalPayout({
          manager,
          user,
          data,
          userDeltaMap,
          rmSalary,
          maxMultiplier,
          maxCap,
          currentMonth,
          currentYear,
        });

      if (finalIncentive <= 0) continue;

      payoutRecords.push({
        user: { id: userId } as Users,
        year: currentYear,
        month: currentMonth,
        totalIncentive: data.totalIncentive,
        incentivePaid: finalIncentive,
        accrualAmount: localAccruals,
        utilizedDelta: (userDeltaMap.get(userId) || 0) - newDelta,
        salary: rmSalary,
        maxMultiplier,
        carryForwardAmount: 0,
        bookingIds: data.bookingIds,
      });

      for (const id of data.bookingIds) {
        bookingsToMarkPaid.add(id);
      }

      if (newDelta < 0) {
        await manager.insert(IncentiveDeltaHistory, {
          user: { id: userId },
          deltaAmount: newDelta,
          isUtilized: false,
        });
      }

      if (user.accruals || localAccruals) {
        await manager.update(
          Users,
          { id: userId },
          { accruals: (user.accruals || 0) + localAccruals },
        );
      }
    }

    return { payoutRecords, bookingsToMarkPaid };
  }

  private buildRmBookingMapAndUsers(
    toInsert: any[],
    bookingMap: Map<string, IncentiveBooking>,
  ) {
    const rmBookingMap = new Map<
      number,
      {
        rows: Partial<BulkPayoutLog>[];
        bookingIds: number[];
        totalIncentive: number;
        payoutStartMonth: moment.Moment;
      }
    >();

    const userMap = new Map<number, Users>();

    for (const row of toInsert) {
      const booking = bookingMap.get(`${row.bookingId}_${row.vendor}`);
      if (!booking) continue;

      const userId = booking.user.id;
      userMap.set(userId, booking.user);

      if (!rmBookingMap.has(userId)) {
        rmBookingMap.set(userId, {
          rows: [],
          bookingIds: [],
          totalIncentive: 0,
          payoutStartMonth: moment(booking.payableReceivedDate).startOf(
            'month',
          ),
        });
      }

      const entry = rmBookingMap.get(userId);
      entry.rows.push(row);
      entry.bookingIds.push(booking.id);

      if (
        row.financeRemarks === PaymentStatusEnum.PAID &&
        row.amountType === 'Incentive Amount'
      ) {
        entry.totalIncentive += Number(row.incentivePayable) || 0;
      }
    }

    return { rmBookingMap, userMap };
  }

  private resolveUserFinancials(user: Users) {
    const maxMultiplier =
      isIndianGroup(user?.group?.name) && !isNaN(user.brand?.salaryMultiplier)
        ? (user.brand?.salaryMultiplier ?? 0)
        : 0;

    const rmSalary = user.salary
      ? Number(this.configService.decryptData(user.salary))
      : 0;

    const maxCap =
      rmSalary > 0 && maxMultiplier > 0 ? rmSalary * maxMultiplier : null;

    return { rmSalary, maxMultiplier, maxCap };
  }

  private async computeFinalPayout(options: {
    manager: EntityManager;
    user: Users;
    data: {
      rows: Partial<BulkPayoutLog>[];
      bookingIds: number[];
      totalIncentive: number;
      payoutStartMonth: moment.Moment;
    };
    userDeltaMap: Map<number, number>;
    rmSalary: number;
    maxMultiplier: number;
    maxCap: number | null;
    currentMonth: number;
    currentYear: number;
  }) {
    const {
      manager,
      user,
      data,
      userDeltaMap,
      rmSalary,
      maxMultiplier,
      maxCap,
      currentMonth,
      currentYear,
    } = options;
    const bookingStartDate = data.payoutStartMonth;

    const previousPayouts = await this.userIncentivePayoutRepository.find({
      where: {
        user: { id: user.id },
        year: MoreThanOrEqual(bookingStartDate.year()),
        month: MoreThanOrEqual(bookingStartDate.month() + 1),
      },
      order: { year: 'ASC', month: 'ASC' },
    });

    const totalIncentivePaidThisMonth = await manager
      .createQueryBuilder(UserIncentivePayout, 'p')
      .select('SUM(p.incentivePaid)', 'total')
      .where('p.userId = :userId AND p.month = :month AND p.year = :year', {
        userId: user.id,
        month: currentMonth,
        year: currentYear,
      })
      .getRawOne();

    const previousPayoutMap = new Map<
      string,
      { incentivePaid: number; multiplier: number; salary: number }
    >();

    previousPayouts.forEach((payout) => {
      const key = `${payout.year}-${payout.month}`;
      const existingEntry = previousPayoutMap.get(key) || {
        incentivePaid: 0,
        multiplier: payout.maxMultiplier,
        salary: payout.salary,
      };

      previousPayoutMap.set(key, {
        incentivePaid: existingEntry.incentivePaid + payout.incentivePaid,
        multiplier: existingEntry.multiplier,
        salary: existingEntry.salary,
      });
    });

    let carryForwardAmount = 0;
    const currentMonthStart = moment().startOf('month');
    const iterationDate = bookingStartDate.clone();

    while (iterationDate.isBefore(currentMonthStart)) {
      const key = `${iterationDate.year()}-${iterationDate.month() + 1}`;
      const payoutEntry = previousPayoutMap.get(key) || {
        incentivePaid: 0,
        multiplier: maxMultiplier,
        salary: rmSalary,
      };

      const { incentivePaid, multiplier, salary } = payoutEntry;
      const monthMaxCap = salary * multiplier;
      if (monthMaxCap !== null) {
        carryForwardAmount += Math.max(0, monthMaxCap - incentivePaid);
      }

      iterationDate.add(1, 'month');
    }

    const alreadyPaid = Number(totalIncentivePaidThisMonth.total || 0);
    const netDelta = userDeltaMap.get(user.id) || 0;
    let newDelta = 0;

    let incentivePayable = Number(data.totalIncentive) + netDelta;
    let localAccruals = 0;

    if (incentivePayable < 0) {
      newDelta = incentivePayable;
      incentivePayable = 0;
    }

    let availableCap = maxCap ?? Infinity;
    if (maxCap !== null) {
      availableCap = Math.max(0, maxCap + carryForwardAmount - alreadyPaid);
    }

    if (incentivePayable > availableCap) {
      localAccruals = incentivePayable - availableCap;
      incentivePayable = availableCap;
    }

    return {
      finalIncentive: incentivePayable,
      localAccruals,
      newDelta,
    };
  }

  private async persistBulkPayoutResults(
    manager: EntityManager,
    toInsert: any[],
    payoutRecords: Partial<UserIncentivePayout>[],
    bookingsToMarkPaid: Set<number>,
    bookingMap: Map<string, IncentiveBooking>,
  ) {
    if (bookingsToMarkPaid.size > 0) {
      const bookingStatusMap: Record<number, string> = {};
      for (const row of toInsert) {
        const booking = bookingMap.get(`${row.bookingId}_${row.vendor}`);
        if (!booking || !bookingsToMarkPaid.has(booking.id)) continue;
        bookingStatusMap[booking.id] = row.financeRemarks!;
      }

      const bookingIds = Object.keys(bookingStatusMap).map(Number);
      if (bookingIds.length) {
        const caseStatements = bookingIds
          .map((id) => `WHEN id = ${id} THEN '${bookingStatusMap[id]}'`)
          .join(' ');

        const query = `
        UPDATE incentive_bookings
        SET payment_status = CASE ${caseStatements} END
        WHERE id IN (${bookingIds.join(', ')})
      `;
        await manager.query(query);
      }
    }

    await manager.insert(BulkPayoutLog, toInsert);
    if (payoutRecords.length) {
      await manager.insert(UserIncentivePayout, payoutRecords);
    }
  }

  private async getPayoutLogsToInsert(
    manager: any,
    uniqueKeys: any[],
    normalizedRows: any[],
    user: any,
  ): Promise<Partial<BulkPayoutLog>[]> {
    const toInsert: Partial<BulkPayoutLog>[] = [];
    const existingEntries = await manager.find(BulkPayoutLog, {
      where: uniqueKeys.map((entry) => ({
        bookingId: entry.bookingId,
        vendor: entry.vendor,
        incentivePayable: entry.incentivePayable,
        alreadyPaid: entry.alreadyPaid,
        financeRemarks: PaymentStatusEnum.PAID,
      })),
    });

    const existingSet: Set<string> = new Set(
      existingEntries.map(
        (e) =>
          `${e.bookingId}_${e.vendor}_${Math.round(e.incentivePayable)}_${Math.round(
            e.alreadyPaid,
          )}_${e.financeRemarks}`,
      ),
    );

    for (const row of normalizedRows) {
      const key = `${row.bookingId}_${row.vendor}_${Math.round(row.incentivePayable)}_${Math.round(row.alreadyPaid)}_${row.financeRemarks}`;
      if (!existingSet.has(key)) {
        toInsert.push({
          rMName: row.rMName,
          empCode: row.empCode,
          bookingId: row.bookingId,
          vendor: row.vendor,
          unitStatus: row.unitStatus,
          paymentStatus: row.paymentStatus,
          amountType: row.amountType,
          incentivePayable: row.incentivePayable,
          alreadyPaid: row.alreadyPaid,
          financeRemarks: row.financeRemarks,
          fileName: key,
          createdBy: { id: user.dbId } as Users,
        });
      }
    }

    return toInsert;
  }

  /**
   * To release payout for selected bookings
   * @param bookingIds
   * @returns
   */
  async processSelectedIncentivePayments(bookingIds: number[]) {
    const notifications = [];
    // Fetch selected bookings list
    const incentivesBookings = await this.incentiveBookingRepository.find({
      where: {
        id: In(bookingIds),
        paymentStatus: In([PaymentStatusEnum.PAYABLE, PaymentStatusEnum.HOLD]),
      },
      order: { payableReceivedDate: 'ASC' },
      relations: ['user'],
    });
    if (!incentivesBookings.length) {
      logger.info(`No valid incentives found for processing.`);
      return;
    }

    // Group bookings by RM ID
    const groupedByRM: Record<number, IncentiveBooking[]> = {};
    for (const incentive of incentivesBookings) {
      if (!groupedByRM[incentive?.user?.id]) {
        groupedByRM[incentive?.user?.id] = [];
      }
      groupedByRM[incentive?.user?.id].push(incentive);
    }

    // Process incentives for each RM separately
    for (const [rmId, rmBookings] of Object.entries(groupedByRM)) {
      await this.processRmIncentives(Number(rmId), rmBookings, notifications);
    }

    if (notifications.length > 0) {
      try {
        this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
          notifications,
        });
      } catch (e) {
        logger.error(
          'Error while creating notifications for Brand, City, or Phase',
          e,
        );
      }
    }
  }

  private async processRmIncentives(
    rmId: number,
    bookings: IncentiveBooking[],
    notifications: any[],
  ) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: rmId },
        relations: [
          'group',
          'project',
          'project.brand',
          'project.brand.defaultPolicy',
          'project.brand.defaultPolicy.incentiveSlabs',
          'brand',
          'brand.defaultPolicy',
          'brand.defaultPolicy.incentiveSlabs',
        ],
      });

      let maxMultiplier = 0;
      if (isIndianGroup(user?.group?.name)) {
        maxMultiplier = user?.brand.salaryMultiplier || 0;
      }

      const rmSalary = user?.salary
        ? Number(this.configService.decryptData(user?.salary))
        : 0;
      // Use a constant for the initial cap based on salary and multiplier
      const maxCapInitial: number | null =
        rmSalary > 0 && maxMultiplier > 0 ? rmSalary * maxMultiplier : null;

      // Sort bookings by payable received date (oldest first)
      bookings.sort((a, b) =>
        moment(a.payableReceivedDate).diff(moment(b.payableReceivedDate)),
      );

      // Aggregate payable amounts per RM per month
      const incentiveMap = new Map<
        string,
        {
          totalIncentive: number;
          user: any;
          bookingIds: number[];
        }
      >();

      // Loop through bookings to aggregate data
      for (const booking of bookings) {
        if (!booking.payableReceivedDate)
          booking.payableReceivedDate = new Date();
        const key = `${user.id}`;
        if (!incentiveMap.has(key)) {
          incentiveMap.set(key, {
            totalIncentive: 0,
            user,
            bookingIds: [],
          });
        }
        // Aggregate total incentive amount and booking ids for that month
        incentiveMap.get(key).totalIncentive += booking.incentiveAmount;
        incentiveMap.get(key).bookingIds.push(booking.id);
      }

      // Fetch previous unpaid incentives and adjust carry-forward
      const bookingStartDate = moment(bookings[0]?.payableReceivedDate).startOf(
        'month',
      );

      const previousPayouts = await this.userIncentivePayoutRepository.find({
        where: {
          user: { id: user.id },
          year: MoreThanOrEqual(bookingStartDate.year()),
          month: MoreThanOrEqual(bookingStartDate.month() + 1), // Month is zero-based in JS
        },
        order: { year: 'ASC', month: 'ASC' },
      });

      // Create a map to store total payout per month
      const payoutMap = new Map<
        string,
        { incentivePaid: number; multiplier: number; salary: number }
      >();

      previousPayouts.forEach((payout) => {
        const key = `${payout.year}-${payout.month}`;
        const existingEntry = payoutMap.get(key) || {
          incentivePaid: 0,
          multiplier: payout.maxMultiplier,
          salary: payout.salary,
        };

        payoutMap.set(key, {
          incentivePaid: existingEntry.incentivePaid + payout.incentivePaid,
          multiplier: existingEntry.multiplier, // Assuming this remains constant per month
          salary: existingEntry.salary, // Assuming salary remains constant per month
        });
      });

      // Calculate carry-forward only for months strictly before the current month
      let carryForwardAmount = 0;
      const currentMonthStart = moment().startOf('month');
      const iterationDate = bookingStartDate.clone();

      while (iterationDate.isBefore(currentMonthStart)) {
        const key = `${iterationDate.year()}-${iterationDate.month() + 1}`;
        const payoutEntry = payoutMap.get(key) || {
          incentivePaid: 0,
          multiplier: maxMultiplier,
          salary: rmSalary,
        };

        const { incentivePaid, multiplier, salary } = payoutEntry;
        const maxCap = salary * multiplier; // maxCap is calculated based on that month
        if (maxCap !== null) {
          carryForwardAmount += Math.max(0, maxCap - incentivePaid);
        }
        iterationDate.add(1, 'month');
      }

      // Process entries in a transaction
      await this.userIncentivePayoutRepository.manager.transaction(
        async (manager) => {
          const { netDelta } = await this.fetchAndMarkDelta(manager, user);

          await this.savePayoutsAndAccruals({
            manager,
            rmId,
            user,
            incentiveMap,
            rmSalary,
            maxMultiplier,
            maxCapInitial,
            carryForwardAmount,
            netDelta,
          });
        },
      );

      // Emit event for successful payout processing
      notifications.push({
        title: 'Payment Successful',
        message: `Your incentive payment has been successfully processed. Check the statement section for incentive calculation!`,
        type: 'Payment',
        userIds: [user.id], // Or admin IDs or whoever needs this notification
      });
    } catch (error) {
      logger.error('Failed to processed payout.', error);
      throw new InternalServerErrorException('Something went wrong!');
    }
  }
  private async fetchAndMarkDelta(
    manager: EntityManager,
    user: Users,
  ): Promise<{ netDelta: number }> {
    const deltaRecords = await manager.find(IncentiveDeltaHistory, {
      where: { user: { id: user.id }, isUtilized: false },
    });

    let netDelta = 0;
    const deltaIds: number[] = [];
    for (const delta of deltaRecords) {
      netDelta += delta.deltaAmount;
      deltaIds.push(delta.id);
    }

    if (deltaRecords.length > 0) {
      await manager.update(
        IncentiveDeltaHistory,
        { id: In(deltaIds) },
        { isUtilized: true },
      );
    }

    return { netDelta };
  }

  private calculateIncentiveAmounts(
    totalIncentive: number,
    netDelta: number,
    rmSalary: number,
    maxMultiplier: number,
    maxCapInitial: number,
    carryForwardAmount: number,
    incentivePaidSum: number,
  ) {
    let incentivePayable = totalIncentive + netDelta;
    let localAccruals = 0;
    let newDelta = 0;

    if (incentivePayable < 0) {
      newDelta = incentivePayable;
      incentivePayable = 0;
    }

    if (rmSalary <= 0 && maxMultiplier > 0 && incentivePayable > 0) {
      localAccruals = incentivePayable;
      incentivePayable = 0;
    }

    let currentCap = maxCapInitial || 0;
    if (incentivePaidSum && currentCap > 0) currentCap -= incentivePaidSum;
    currentCap += carryForwardAmount;

    if (currentCap && incentivePayable > currentCap) {
      localAccruals = incentivePayable - currentCap;
      incentivePayable = currentCap;
    }

    if (maxMultiplier > 0 && (!currentCap || currentCap === 0)) {
      localAccruals = incentivePayable;
      incentivePayable = 0;
    }

    return { incentivePayable, localAccruals, newDelta };
  }

  private async savePayoutsAndAccruals(options: {
    manager: EntityManager;
    rmId: number;
    user: Users;
    incentiveMap: Map<string, any>;
    rmSalary: number;
    maxMultiplier: number;
    maxCapInitial: number;
    carryForwardAmount: number;
    netDelta: number;
  }) {
    const {
      manager,
      rmId,
      user,
      incentiveMap,
      rmSalary,
      maxMultiplier,
      maxCapInitial,
      carryForwardAmount,
      netDelta,
    } = options;

    let userAccruals = user?.accruals ?? 0;
    let newDelta = 0;
    const currentYear = moment().year();
    const currentMonth = moment().month() + 1;

    // Pre-fetch total incentive paid for current month
    const totalIncentivePaidResult = await manager
      .createQueryBuilder(UserIncentivePayout, 'payout')
      .select('SUM(payout.incentivePaid)', 'total')
      .where('payout.userId = :userId', { userId: user.id })
      .andWhere('payout.year = :year', { year: currentYear })
      .andWhere('payout.month = :month', { month: currentMonth })
      .getRawOne();

    const incentivePaidSum = totalIncentivePaidResult?.total || 0;

    for (const { totalIncentive, bookingIds } of incentiveMap.values()) {
      const {
        incentivePayable,
        localAccruals,
        newDelta: delta,
      } = this.calculateIncentiveAmounts(
        totalIncentive,
        netDelta,
        rmSalary,
        maxMultiplier,
        maxCapInitial,
        carryForwardAmount,
        incentivePaidSum,
      );

      newDelta = delta;

      userAccruals += localAccruals;

      const newPayout = manager.create(UserIncentivePayout, {
        user,
        year: currentYear,
        month: currentMonth,
        totalIncentive,
        incentivePaid: incentivePayable,
        accrualAmount: localAccruals,
        utilizedDelta: netDelta - newDelta || 0,
        salary: rmSalary,
        carryForwardAmount,
        maxMultiplier,
        bookingIds,
      });

      await manager.save(UserIncentivePayout, newPayout);
      logger.info(
        `Processed incentives for RM ${rmId}, total paid: ${incentivePayable}, accruals: ${userAccruals}`,
      );
    }

    if (userAccruals) {
      await manager.update(Users, { id: rmId }, { accruals: userAccruals });
    }

    if (newDelta < 0) {
      await manager.insert(IncentiveDeltaHistory, {
        user,
        deltaAmount: newDelta,
        isUtilized: false,
      });
    }
  }
}
