import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DISPLAY_YEAR_MONTH,
  FY_START,
  MONTH_YEAR_FORMAT,
  ONE_CRORE,
} from '../../../config/constants';
import { formatAmount } from '../../../utils/formatAmount';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BoosterIncentiveSlabs,
  Boosters,
  IncentiveBooking,
  Projects,
  UserIncentivePayout,
  UserMonthlyGrossTotal,
  Users,
} from '../../../entities';
import { Between, In, Repository, EntityManager, Not } from 'typeorm';
import {
  PaymentStatusEnum,
  UnitStatusEnum,
} from 'src/enums/booking-list.enums';
import { IncentiveBookingService } from '../incentive_booking/incentive_booking.service';
import { logger } from 'src/logger/logger';
import { ProjectStage } from 'src/enums/project-stage.enum';
import { StatusEnum } from 'src/enums/status.enum';
import {
  addYears,
  endOfDay,
  endOfMonth,
  format,
  getMonth,
  getYear,
  parse,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { isIndianGroup } from 'src/utils/isIndianGroup';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';

@Injectable()
export class IncentiveDashboardService {
  constructor(
    private readonly entityManager: EntityManager,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(Projects)
    private readonly projectRepository: Repository<Projects>,

    @InjectRepository(IncentiveBooking)
    private readonly incentiveBookingRepository: Repository<IncentiveBooking>,

    @InjectRepository(Boosters)
    private readonly boosterRepository: Repository<Boosters>,

    @InjectRepository(BoosterIncentiveSlabs)
    private readonly boosterSlabRepository: Repository<BoosterIncentiveSlabs>,

    @InjectRepository(UserMonthlyGrossTotal)
    private readonly userGrossTotalRepository: Repository<UserMonthlyGrossTotal>,

    private readonly incentiveService: IncentiveBookingService,

    @InjectRepository(UserMonthlyGrossTotal)
    private readonly userSalesRepository: Repository<UserMonthlyGrossTotal>,

    @InjectRepository(UserIncentivePayout)
    private readonly userIncentivePayoutRepository: Repository<UserIncentivePayout>,
  ) {}

  /*
    Fetches incentive "cards" data (risk, earned, payable, paid) for a given user
    and optional projectIds/date range. If no date range is given, defaults to current month.
    For "Incentive Paid", we look up last month's record in the user_incentive_payouts table.
   */
  public async getIncentiveCardsData(
    userId: number,
    projectIds?: string[],
    monthInt?: number,
    year?: string,
  ): Promise<any> {
    try {
      if (!userId) {
        throw new BadRequestException('userId must be provided');
      }

      return await this.buildIncentiveCardsResponse(
        userId,
        projectIds,
        monthInt,
        year,
      );
    } catch (error) {
      logger.error(`Error fetching incentive cards data:
      User ID: ${userId}
      Project IDs: ${projectIds ? projectIds.join(', ') : 'N/A'}
      Error Message: ${error.message}
      Stack: ${error.stack}
    `);
      logsAndErrorHandling(
        'incentiveDashboardService',
        'getIncentiveCardsData',
        error,
      );
    }
  }

  private async buildIncentiveCardsResponse(
    userId: number,
    projectIds?: string[],
    monthInt?: number,
    year?: string,
  ) {
    const dateCtx = this.calculateIncentiveDateContext(monthInt, year);

    const [
      userDetails,
      paidYtdResult,
      incentivePayableResult,
      payouts,
      incentiveAtRisk,
      incentiveLostResult,
    ] = await this.fetchIncentiveCardData({
      userId,
      projectIds,
      ...dateCtx,
    });

    const paidYtd = Number(paidYtdResult?.total ?? 0);
    const incentivePayable = incentivePayableResult?.total ?? null;
    const incentivePaid = Array.isArray(payouts)
      ? payouts.reduce((acc, p) => acc + Number(p.incentivePaid ?? 0), 0)
      : 0;
    const incentiveLost = incentiveLostResult?.total ?? null;

    const paidDate = dateCtx.filtersApplied
      ? subMonths(dateCtx.selectedDate, 1)
      : subMonths(new Date(), 1);

    return {
      message: 'Incentive cards data fetched successfully',
      data: {
        rmName: userDetails?.name ?? '',
        cards: [
          {
            title: 'Incentive Paid YTD',
            amount: Number(paidYtd.toFixed(2)),
            status: 'paid_ytd',
            dateRange: dateCtx.filtersApplied
              ? `${format(dateCtx.startDate, MONTH_YEAR_FORMAT)} - ${format(dateCtx.endDate, MONTH_YEAR_FORMAT)}`
              : format(dateCtx.endDate, MONTH_YEAR_FORMAT),
          },
          {
            title: 'Incentive Payable',
            amount:
              incentivePayable === null
                ? '-'
                : Number(Number(incentivePayable).toFixed(2)),
            status: 'payable',
            dateRange: dateCtx.filtersApplied
              ? '-'
              : format(new Date(), MONTH_YEAR_FORMAT),
          },
          {
            title: 'Incentive Paid',
            amount: Number(Number(incentivePaid).toFixed(2)),
            status: 'paid',
            dateRange: format(paidDate, MONTH_YEAR_FORMAT),
          },
          {
            title: 'Incentive at Risk',
            amount: incentiveAtRisk === null ? '-' : Number(incentiveAtRisk),
            subtitle: 'Lost',
            subtitleAmount:
              incentiveLost === null
                ? '-'
                : Number(Number(incentiveLost).toFixed(2)),
            status: 'risk',
            dateRange: dateCtx.filtersApplied ? '-' : 'YTD',
          },
        ],
      },
    };
  }

  private fetchIncentiveCardData(params: {
    userId: number;
    projectIds?: string[];
    filtersApplied: boolean;
    selectedDate: Date;
    fyStart: Date;
    fyEnd: Date;
    monthFrom: number;
    yearFrom: number;
    monthTo: number;
    yearTo: number;
  }) {
    const {
      userId,
      projectIds,
      filtersApplied,
      selectedDate,
      fyStart,
      fyEnd,
      monthFrom,
      yearFrom,
      monthTo,
      yearTo,
    } = params;

    const userDetailsPromise = this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name'],
    });

    return Promise.all([
      userDetailsPromise,

      this.userIncentivePayoutRepository
        .createQueryBuilder('payout')
        .select('COALESCE(SUM(payout.incentivePaid), 0)', 'total')
        .where(
          `(payout.year > :yearFrom OR (payout.year = :yearFrom AND payout.month >= :monthFrom))`,
          { yearFrom, monthFrom },
        )
        .andWhere(
          `(payout.year < :yearTo OR (payout.year = :yearTo AND payout.month <= :monthTo))`,
          { yearTo, monthTo },
        )
        .andWhere('payout.userId = :userId', { userId })
        .getRawOne(),

      filtersApplied
        ? Promise.resolve(null)
        : (() => {
            const qb = this.incentiveBookingRepository
              .createQueryBuilder('booking')
              .select('COALESCE(SUM(booking.incentiveAmount), 0)', 'total')
              .where('booking.user_id = :userId', { userId })
              .andWhere('booking.unitStatus IN (:...unitStatuses)', {
                unitStatuses: [
                  UnitStatusEnum.QUALIFIED,
                  UnitStatusEnum.QUALIFIED_CANCELLED,
                ],
              })
              .andWhere('booking.paymentStatus = :paymentStatus', {
                paymentStatus: PaymentStatusEnum.PAYABLE,
              })
              .andWhere('booking.payableReceivedDate BETWEEN :start AND :end', {
                start: startOfMonth(new Date()),
                end: endOfMonth(new Date()),
              })
              .leftJoin('booking.projectPhase', 'projectPhase')
              .leftJoin('projectPhase.project', 'project');

            if (projectIds?.length) {
              qb.andWhere('project.id IN (:...projectIds)', { projectIds });
            }

            return qb.getRawOne();
          })(),

      (() => {
        const paidDate = filtersApplied
          ? subMonths(selectedDate, 1)
          : subMonths(new Date(), 1);

        return this.userIncentivePayoutRepository.find({
          where: {
            user: { id: userId },
            month: paidDate.getMonth() + 1,
            year: paidDate.getFullYear(),
          },
          select: ['incentivePaid'],
        });
      })(),

      filtersApplied
        ? Promise.resolve(null)
        : this.calculateIncentiveAtRiskForBookingTypes(userId),

      filtersApplied
        ? Promise.resolve(null)
        : (() => {
            const qb = this.incentiveBookingRepository
              .createQueryBuilder('booking')
              .select('COALESCE(SUM(booking.incentiveAmount), 0)', 'total')
              .where('booking.user_id = :userId', { userId })
              .andWhere('booking.unitStatus = :unitStatus', {
                unitStatus: UnitStatusEnum.DISQUALIFIED,
              })
              .andWhere('booking.disqualifiedDate BETWEEN :start AND :end', {
                start: fyStart,
                end: fyEnd,
              })
              .leftJoin('booking.projectPhase', 'projectPhase')
              .leftJoin('projectPhase.project', 'project');

            if (projectIds?.length) {
              qb.andWhere('project.id IN (:...projectIds)', { projectIds });
            }

            return qb.getRawOne();
          })(),
    ]);
  }

  private calculateIncentiveDateContext(monthInt?: number, year?: string) {
    const filtersApplied = !!(monthInt && year);
    const yearInt = Number.parseInt(year);

    if (filtersApplied && (isNaN(monthInt) || isNaN(yearInt))) {
      throw new BadRequestException('Invalid month or year format');
    }

    if ((monthInt && !year) || (!monthInt && year)) {
      throw new BadRequestException(
        'Please select both month and year to apply filters.',
      );
    }

    const selectedDate = filtersApplied
      ? parse(`${year}-${monthInt}-01`, 'yyyy-M-dd', new Date())
      : new Date();

    const fyBaseYear =
      getMonth(selectedDate) >= 3
        ? getYear(selectedDate)
        : getYear(selectedDate) - 1;

    const fyStart = parse(
      `${fyBaseYear}-${FY_START}`,
      'yyyy-MM-dd',
      new Date(),
    );
    const fyEnd = subDays(addYears(fyStart, 1), 1);

    const refMonth = filtersApplied
      ? subMonths(parse(`${year}-${monthInt}-01`, 'yyyy-MM-dd', new Date()), 1)
      : subMonths(new Date(), 1);

    const refMonthIndex = getMonth(refMonth);
    const refYear = getYear(refMonth);

    const fyStartYear = refMonthIndex >= 3 ? refYear : refYear - 1;
    const startDate = parse(
      `${fyStartYear}-${FY_START}`,
      'yyyy-MM-dd',
      new Date(),
    );
    const endDate = endOfDay(endOfMonth(refMonth));

    return {
      filtersApplied,
      selectedDate,
      fyStart,
      fyEnd,
      startDate,
      endDate,
      monthFrom: getMonth(startDate) + 1,
      yearFrom: getYear(startDate),
      monthTo: getMonth(endDate) + 1,
      yearTo: getYear(endDate),
    };
  }

  public async calculateIncentiveAtRiskForBookingTypes(
    userId: number,
  ): Promise<number> {
    const bookings = await this.incentiveBookingRepository.find({
      where: {
        user: { id: userId },
        bookingProjectType: In([
          ProjectStage.NEW_LAUNCH,
          ProjectStage.SUSTENANCE,
        ]),
        unitStatus: Not(
          In([UnitStatusEnum.DISQUALIFIED, UnitStatusEnum.CANCELLED]),
        ),
      },
      relations: [
        'projectPhase',
        'projectPhase.project',
        'user',
        'user.brand',
        'policyUsed',
        'policyUsed.incentiveSlabs',
      ] as any,
      select: [
        'id',
        'grossTotalValue',
        'incentiveAmount',
        'bookingDate',
        'unitStatus',
        'isDeadlineApproaching',
        'bookingProjectType',
        'projectPhase',
        'policyUsed',
      ],
    });

    const grossMap = new Map<string, number>();
    const eligibleBookingsMap = new Map<string, number>();

    for (const booking of bookings) {
      const month = format(new Date(booking.bookingDate), DISPLAY_YEAR_MONTH);
      const bookingType = booking.bookingProjectType;
      const grossKey = `${month}-${bookingType}`;
      const existing = grossMap.get(grossKey) ?? 0;
      grossMap.set(grossKey, existing + (booking.grossTotalValue ?? 0));

      if (
        [
          UnitStatusEnum.REGULARIZED,
          UnitStatusEnum.QUALIFIED,
          UnitStatusEnum.QUALIFIED_CANCELLED,
        ].includes(booking?.unitStatus)
      ) {
        const bookingCount = eligibleBookingsMap.get(month) ?? 0;
        eligibleBookingsMap.set(grossKey, bookingCount + 1);
      }
    }

    return this.computeIncentiveAtRiskFromAggregates(
      bookings,
      grossMap,
      eligibleBookingsMap,
    );
  }

  private computeIncentiveAtRiskFromAggregates(
    bookings: any[],
    grossMap: Map<string, number>,
    eligibleBookingsMap: Map<string, number>,
  ): number {
    let totalDelta = 0;

    for (const booking of bookings) {
      const bookingType = booking.bookingProjectType;
      const month = format(new Date(booking.bookingDate), DISPLAY_YEAR_MONTH);
      const grossKey = `${month}-${bookingType}`;
      const monthlyGross = grossMap.get(grossKey) ?? 0;
      const monthlyBookings = eligibleBookingsMap.get(month) ?? 0;

      const policy = booking.policyUsed;
      if (!policy?.incentiveSlabs?.length) continue;

      const { applicableSlab } = this.incentiveService.getApplicableSlab(
        booking.bookingProjectType,
        monthlyGross,
        policy,
        monthlyBookings,
      );

      if (!applicableSlab) continue;

      const newRate =
        booking.bookingProjectType === ProjectStage.NEW_LAUNCH
          ? (applicableSlab.launchIncentivePercentage ?? 0)
          : (applicableSlab.sustenanceIncentivePercentage ?? 0);

      const newIncentive = Number(
        (((booking.grossTotalValue ?? 0) * newRate) / 100).toFixed(2),
      );

      if (
        booking.unitStatus === UnitStatusEnum.UNREGULARIZED &&
        booking.isDeadlineApproaching
      ) {
        totalDelta += newIncentive;
      } else {
        const delta = newIncentive - (booking.incentiveAmount ?? 0);
        if (delta > 0) totalDelta += delta;
      }
    }

    return Number(totalDelta.toFixed(2));
  }

  getDateDifference(deadline: string): number {
    const currentDate = new Date();
    const deadlineDate = new Date(deadline);

    const diffTime = deadlineDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  async getUserPerformance(userId: number, type: 'monthly' | 'yearly') {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    try {
      // Declared variables needed
      let responseData: any;
      const divisor = ONE_CRORE;
      const unit = 'Cr';
      const incentiveMap: Record<number, number> = {};

      /* For yearly reports, fetch distinct years from incentive bookings.
       For monthly, we use the current year.*/
      const yearFilters: number[] =
        type === 'yearly'
          ? (
              await this.incentiveBookingRepository
                .createQueryBuilder('booking')
                .where('booking.user_id = :userId', { userId })
                .select('DISTINCT(YEAR(booking.bookingDate))', 'year')
                .orderBy('year', 'ASC')
                .getRawMany()
            ).map((y) => Number(y.year)) || [currentYear]
          : [currentYear];

      if (yearFilters.length === 0 && type === 'yearly') {
        const currentYear = new Date().getFullYear();
        const lastTenYears = Array.from(
          { length: 10 },
          (_, i) => currentYear - 9 + i,
        );

        const salesDataArray = new Array(10).fill(0);
        const regularizedDataArray = new Array(10).fill(0);
        const earnedDataArray = lastTenYears.map((year) =>
          Number(((incentiveMap[year] || 0) / divisor).toFixed(2)),
        );

        return {
          message: `No performance data available for user ${userId} (${type}).`,
          data: {
            unit,
            name: 'Yearly',
            categories: lastTenYears.map((y) => y.toString()),
            data: [
              { name: 'Sale', data: salesDataArray },
              { name: 'Regularized', data: regularizedDataArray },
              { name: 'Earned', data: earnedDataArray },
            ],
          },
        };
      }
      // Sales Data Query – aggregates gross sales and incentive amounts from incentive_bookings.
      const salesDataQuery = this.incentiveBookingRepository
        .createQueryBuilder('booking')
        .where('booking.user_id = :userId', { userId })
        .andWhere('booking.deleted_at IS NULL') // Ensure soft-deleted records are excluded
        .andWhere('YEAR(booking.booking_date) IN (:...yearFilters)', {
          yearFilters,
        })
        .andWhere('booking.unitStatus IN (:...statuses)', {
          statuses: [
            UnitStatusEnum.REGULARIZED,
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ],
        })
        .select([
          'YEAR(booking.booking_date) AS year',
          'SUM(booking.gross_total_value) AS totalGrossSales',
          'SUM(COALESCE(booking.incentive_amount, 0)) AS incentivesEarned',
        ]);

      if (type === 'monthly') {
        salesDataQuery
          .addSelect('MONTH(booking.booking_date) AS month')
          .groupBy('YEAR(booking.booking_date), MONTH(booking.booking_date)')
          .orderBy('MONTH(booking.booking_date)', 'ASC');
      } else {
        salesDataQuery
          .groupBy('YEAR(booking.booking_date)')
          .orderBy('YEAR(booking.booking_date)', 'ASC');
      }

      const salesData = await salesDataQuery.getRawMany();

      // Regularized Data Query – aggregates gross sales for bookings with unitStatus = REGULARIZED.
      const regularizedQuery = this.incentiveBookingRepository
        .createQueryBuilder('booking')
        .where('booking.user_id = :userId', { userId })
        .andWhere('booking.unitStatus = :status', {
          status: UnitStatusEnum.REGULARIZED,
        })
        .andWhere('booking.deleted_at IS NULL')
        .andWhere('YEAR(booking.bookingDate) IN (:...yearFilters)', {
          yearFilters,
        })
        .select([
          'YEAR(booking.bookingDate) AS year',
          'SUM(booking.grossTotalValue) AS totalRegularizedGross',
        ]);

      if (type === 'monthly') {
        regularizedQuery
          .addSelect('MONTH(booking.bookingDate) AS month')
          .groupBy('YEAR(booking.bookingDate), MONTH(booking.bookingDate)')
          .orderBy('MONTH(booking.bookingDate)', 'ASC');
      } else {
        regularizedQuery
          .groupBy('YEAR(booking.bookingDate)')
          .orderBy('YEAR(booking.bookingDate)', 'ASC');
      }
      const regularizedData = await regularizedQuery.getRawMany();

      /* Earned Incentive Query – using dynamic filters.
       For monthly reports, we now aggregate the incentive for the entire current year grouped by month.
       For yearly reports, we aggregate incentive amounts grouped by year.*/
      if (type === 'monthly') {
        const yearParam = currentYear;
        const incentiveResult = await this.incentiveBookingRepository
          .createQueryBuilder('booking')
          .select('MONTH(booking.payableReceivedDate)', 'month')
          .addSelect('SUM(booking.incentiveAmount)', 'totalIncentive')
          .where('booking.user_id = :userId', { userId })
          .andWhere('booking.unitStatus IN (:...statuses)', {
            statuses: [
              UnitStatusEnum.QUALIFIED,
              UnitStatusEnum.QUALIFIED_CANCELLED,
            ],
          })
          .andWhere('YEAR(booking.payableReceivedDate) = :year', {
            year: yearParam,
          })
          .andWhere('booking.deleted_at IS NULL')
          .groupBy('MONTH(booking.payableReceivedDate)')
          .orderBy('MONTH(booking.payableReceivedDate)', 'ASC')
          .getRawMany();
        // Build a map with month as key
        incentiveResult.forEach((row) => {
          incentiveMap[Number(row.month)] =
            Number.parseFloat(row.totalIncentive) || 0;
        });
      } else {
        const incentiveYearly = await this.incentiveBookingRepository
          .createQueryBuilder('booking')
          .select(
            'YEAR(booking.payableReceivedDate) AS year, SUM(booking.incentiveAmount) AS totalIncentive',
          )
          .where('booking.user_id = :userId', { userId })
          .andWhere('booking.unitStatus IN (:...statuses)', {
            statuses: [
              UnitStatusEnum.QUALIFIED,
              UnitStatusEnum.QUALIFIED_CANCELLED,
            ],
          })
          .andWhere('booking.deleted_at IS NULL')
          .groupBy('YEAR(booking.payableReceivedDate)')
          .orderBy('YEAR(booking.payableReceivedDate)', 'ASC')
          .getRawMany();
        incentiveYearly.forEach((row) => {
          incentiveMap[Number(row.year)] =
            Number.parseFloat(row.totalIncentive) || 0;
        });
      }

      // Merge Sales and Regularized Data – matching records by year (and by month for monthly reports)
      const allData = salesData.map((sale) => {
        let totalRegularizedGross = 0;
        if (type === 'monthly') {
          const match = regularizedData.find(
            (r) =>
              Number(r.month) === Number(sale.month) &&
              Number(r.year) === Number(sale.year),
          );
          totalRegularizedGross = match
            ? Number.parseFloat(match.totalRegularizedGross)
            : 0;
        } else {
          const match = regularizedData.find(
            (r) => Number(r.year) === Number(sale.year),
          );
          totalRegularizedGross = match
            ? Number.parseFloat(match.totalRegularizedGross)
            : 0;
        }
        return {
          year: sale.year,
          month: sale.month || null,
          totalGrossSales: Number.parseFloat(sale.totalGrossSales) || 0.0,
          incentivesEarned: Number.parseFloat(sale.incentivesEarned) || 0.0,
          regularizedGross: totalRegularizedGross,
        };
      });
      if (type === 'monthly') {
        const monthShortNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const salesDataArray = Array(12).fill(0);
        const regularizedDataArray = Array(12).fill(0);
        const earnedDataArray = Array(12).fill(0);

        allData.forEach((entry) => {
          if (entry.month >= 1 && entry.month <= 12) {
            const index = entry.month - 1;
            salesDataArray[index] = Number(
              (entry.totalGrossSales / divisor).toFixed(2),
            );
            regularizedDataArray[index] = Number(
              (entry.regularizedGross / divisor).toFixed(2),
            );
          }
        });
        // Fill the earnedDataArray using the incentiveMap built above.
        for (let m = 1; m <= 12; m++) {
          earnedDataArray[m - 1] = Number(
            ((incentiveMap[m] || 0) / divisor).toFixed(2),
          );
        }
        responseData = {
          unit,
          name: 'Monthly',
          categories: monthShortNames,
          data: [
            { name: 'Sale', data: salesDataArray },
            { name: 'Regularized', data: regularizedDataArray },
            { name: 'Earned', data: earnedDataArray },
          ],
        };
      } else {
        const yearlyCategories = allData.map(({ year }) => year.toString());
        const salesDataArray = allData.map(({ totalGrossSales }) =>
          Number.parseFloat((totalGrossSales / divisor).toFixed(2)),
        );
        const regularizedDataArray = allData.map(({ regularizedGross }) =>
          Number.parseFloat((regularizedGross / divisor).toFixed(2)),
        );
        const earnedDataArray = allData.map(({ year }) =>
          Number.parseFloat(((incentiveMap[year] || 0) / divisor).toFixed(2)),
        );
        responseData = {
          unit,
          name: 'Yearly',
          categories: yearlyCategories,
          data: [
            { name: 'Sale', data: salesDataArray },
            { name: 'Regularized', data: regularizedDataArray },
            { name: 'Earned', data: earnedDataArray },
          ],
        };
      }

      return {
        message: `Performance data for user ${userId} (${type}) fetched successfully.`,
        data: responseData,
      };
    } catch (error) {
      logger.error(
        `Error fetching user performance data: User ID: ${userId}, Type: ${type}, Error: ${error.message}`,
      );
      logsAndErrorHandling(
        'incentiveDashboardService - getUserPerformance',
        error,
        { userId, type },
      );
    }
  }

  private async fetchSalesForBoosterPeriod(
    userId: number,
    booster: Boosters,
  ): Promise<number> {
    const startDate = startOfDay(new Date(booster.startDate));
    const endDate = endOfDay(new Date(booster.endDate));

    // 1) figure out which project‐IDs this booster applies to:
    const rows: { project_id: number }[] = await this.entityManager.query(
      `SELECT project_id
         FROM booster_project_mapping
        WHERE booster_id = ?`,
      [booster.id],
    );
    const projectIds = rows.map((r) => r.project_id);
    if (projectIds.length === 0) return 0;

    // 2) fetch only those incentive‐bookings in the right window,
    //    for the mapped projects, and with an “approved” unit status
    const bookings = await this.incentiveBookingRepository.find({
      where: {
        user: { id: userId },
        projectPhase: { project: { id: In(projectIds) } },
        bookingDate: Between(startDate, endDate),
        unitStatus: In([
          UnitStatusEnum.QUALIFIED,
          UnitStatusEnum.REGULARIZED,
          UnitStatusEnum.QUALIFIED_CANCELLED,
        ]),
      },
      relations: ['projectPhase', 'projectPhase.project'],
    });

    // 3) sum up the grossTotalValue
    return bookings.reduce((sum, b) => sum + (b.grossTotalValue ?? 0), 0);
  }

  async getPrizeData(userId: number) {
    try {
      // Fetch the user & brand
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['brand', 'group'],
      });

      if (!user) {
        throw new BadRequestException(`User with ID ${userId} not found`);
      }

      const mappings = await this.fetchUserMappings(user);

      if (!mappings.length) {
        return {
          message: 'No boosters found for this user.',
          data: [],
        };
      }

      const uniqueBoosterIds = [
        ...new Set(mappings.map((m) => m.id ?? m.booster_id)),
      ];

      const activeBoosters = await this.boosterRepository.find({
        where: { id: In(uniqueBoosterIds), status: StatusEnum.ACTIVE },
      });

      if (!activeBoosters.length) {
        return {
          message: 'No active boosters found for this user.',
          data: [],
        };
      }

      // Fetch Booster Slabs
      const boosterSlabsRaw = await this.boosterSlabRepository
        .createQueryBuilder('slab')
        .leftJoin('slab.booster', 'booster')
        .select([
          'booster.id AS boosterId',
          'booster.name AS boosterName',
          'slab.start_range AS startRange',
          'slab.end_range AS endRange',
          'slab.prize_type AS prizeType',
          'slab.prize_value AS prizeValue',
        ])
        .where('booster.status = :status', { status: 'active' })
        .andWhere('booster.id IN (:...uniqueBoosterIds)', { uniqueBoosterIds })
        .getRawMany();

      if (!boosterSlabsRaw.length) {
        return { message: 'No slabs found for active boosters.', data: [] };
      }

      const boosterProgressData = await this.calculateBoosterProgress(
        userId,
        activeBoosters,
        boosterSlabsRaw,
      );

      return {
        message: 'Booster Prize fetched Successfully',
        data: boosterProgressData,
      };
    } catch (error) {
      logger.error(
        `Error while fetching Booster Prize for User ID: ${userId}, Error: ${error.message}`,
      );
      throw new BadRequestException(error.message);
    }
  }

  // --- Helper 1: Fetch mappings based on brand/group ---
  private async fetchUserMappings(user: any) {
    if (!isIndianGroup(user?.group?.name)) {
      return await this.boosterRepository.find({
        where: { group: { id: user.group.id }, status: StatusEnum.ACTIVE },
      });
    }

    if (!user.brand?.id) {
      throw new NotFoundException('User does not have a brand.');
    }

    const projects = await this.projectRepository.find({
      where: { brand: { id: user.brand.id } },
    });

    if (!projects.length) {
      return [];
    }

    const projectIds = projects.map((p) => p.id);

    const mappings = await this.entityManager.query(
      `SELECT * FROM booster_project_mapping WHERE project_id IN (?)`,
      [projectIds],
    );

    return mappings;
  }

  // --- Helper 2: Calculate booster progress & prize ---
  private async calculateBoosterProgress(
    userId: number,
    activeBoosters: any[],
    boosterSlabsRaw: any[],
  ) {
    const boosterProgressData = [];

    for (const booster of activeBoosters) {
      const slabsForBooster = boosterSlabsRaw
        .filter((s) => s.boosterId === booster.id)
        .map((s) => ({
          start: Number.parseFloat(s.startRange),
          end: Number.parseFloat(s.endRange),
          prizeType: s.prizeType,
          prizeValue: s.prizeValue,
        }))
        .sort((a, b) => a.start - b.start);

      if (!slabsForBooster.length) continue;

      const boosterSalesTotal = await this.fetchSalesForBoosterPeriod(
        userId,
        booster,
      );
      const boosterSalesInCrores = Number.parseFloat(
        (boosterSalesTotal / ONE_CRORE).toFixed(2),
      );

      let nextPrize = null;
      let progress = 0;
      let targetSales = null;

      for (let i = 0; i < slabsForBooster.length; i++) {
        const slab = slabsForBooster[i];
        const nextSlab = slabsForBooster[i + 1] || null;
        const start = slab.start;
        const end = slab.end;

        if (boosterSalesInCrores < start) {
          nextPrize = slab;
          targetSales = start;
          progress = (boosterSalesInCrores / targetSales) * 100;
          break;
        }

        if (boosterSalesInCrores < end) {
          nextPrize = nextSlab;
          targetSales = nextSlab ? nextSlab.start : end;
          progress =
            start === end ? 100 : (boosterSalesInCrores / targetSales) * 100;
          break;
        }
      }

      if (!nextPrize) {
        nextPrize = slabsForBooster[slabsForBooster.length - 1];
        targetSales = nextPrize.start;
        progress = 100;
      }

      let calculatedPrizeValue: any = nextPrize?.prizeValue ?? 'N/A';

      if (nextPrize?.prizeType === 'Percentage') {
        const percentage = Number.parseFloat(nextPrize.prizeValue);
        if (!isNaN(percentage)) {
          const rawValue =
            boosterSalesInCrores * ONE_CRORE * (percentage / 100);
          const formatted = formatAmount(rawValue);
          calculatedPrizeValue = `${formatted.value} ${formatted.unit} (${percentage}%)`;
        }
      }

      boosterProgressData.push({
        boosterName: booster.name,
        totalSales: boosterSalesInCrores.toFixed(2),
        progress: progress.toFixed(2),
        prizeValue: calculatedPrizeValue,
        PrizeType: nextPrize?.prizeType ?? 'N/A',
        targetSales: targetSales.toFixed(2),
      });
    }

    return boosterProgressData;
  }

  async getSalesData(userId: number, phaseType: string) {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // Fetch user details
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: [
          'group',
          'brand',
          'project',
          'brand.defaultPolicy',
          'brand.defaultPolicy.incentiveSlabs',
        ],
      });

      if (!user) {
        throw new BadRequestException(`User with ID ${userId} not found`);
      }

      const brandId = user?.brand?.id ?? null;

      // Determine the applicable incentive policy
      const policy = await this.incentiveService.determinePolicyToUse(
        this.userRepository.manager,
        user,
        brandId,
        null,
        startOfDay(new Date()), //current date
      );

      if (!policy) {
        return {
          message: 'No policy found for the user',
          data: [],
        };
      }

      // Fetch all sales data for the user
      const salesDataList = await this.userGrossTotalRepository.findOne({
        where: { user: { id: userId }, month: currentMonth, year: currentYear },
      });

      // Calculate gross total
      let grossTotal = 0;

      if (salesDataList) {
        if (phaseType === ProjectStage.NEW_LAUNCH) {
          grossTotal = salesDataList.launchGrossTotal || 0;
        } else {
          grossTotal = salesDataList.sustenanceGrossTotal || 0;
        }
      }

      // Fetch earned incentive from incentive-booking table
      const totalEarnedIncentive = await this.incentiveBookingRepository
        .createQueryBuilder('booking')
        .select('SUM(booking.incentiveAmount)', 'totalIncentive')
        .where('booking.user_id = :userId', { userId })
        .andWhere('booking.unitStatus IN (:...statuses)', {
          statuses: [
            UnitStatusEnum.QUALIFIED,
            UnitStatusEnum.QUALIFIED_CANCELLED,
          ],
        })
        .andWhere('booking.bookingProjectType = :phaseType', { phaseType })
        .andWhere('YEAR(booking.payable_received_date) = :year', {
          year: currentYear,
        })
        .andWhere('MONTH(booking.payable_received_date) = :month', {
          month: currentMonth,
        })
        .andWhere('booking.deleted_at IS NULL')
        .getRawOne();

      const earnedIncentive = totalEarnedIncentive?.totalIncentive || 0;

      let currentSlabIndex = -1;

      // Sort slabs based on start range before mapping
      const sortedSlabs = [...policy.incentiveSlabs].sort((a, b) => {
        const aStart =
          phaseType === ProjectStage.NEW_LAUNCH
            ? a.launchStartRange
            : a.sustenanceStartRange;

        const bStart =
          phaseType === ProjectStage.NEW_LAUNCH
            ? b.launchStartRange
            : b.sustenanceStartRange;

        return aStart - bStart;
      });

      let slabsProgress = sortedSlabs.map((slab, index) => {
        const startRange =
          phaseType === ProjectStage.NEW_LAUNCH
            ? slab.launchStartRange * ONE_CRORE
            : slab.sustenanceStartRange * ONE_CRORE;
        const endRange =
          phaseType === ProjectStage.NEW_LAUNCH
            ? slab.launchEndRange * ONE_CRORE
            : slab.sustenanceEndRange * ONE_CRORE;
        const incentiveRate =
          phaseType === ProjectStage.NEW_LAUNCH
            ? slab.launchIncentivePercentage
            : slab.sustenanceIncentivePercentage;

        let completedPercentage = 0;
        let isCurrent = false;

        // Identify the correct slab where grossTotal falls
        if (grossTotal >= startRange && grossTotal < endRange) {
          currentSlabIndex = index;
          isCurrent = true;
          completedPercentage =
            ((grossTotal - startRange) / (endRange - startRange)) * 100;
        } else if (grossTotal >= endRange) {
          completedPercentage = 100;
        }

        return {
          slabId: slab.id,
          startRange: formatAmount(startRange),
          endRange: formatAmount(endRange),
          incentiveRate: formatAmount(incentiveRate, 'percent'),
          completedPercentage: formatAmount(completedPercentage, 'percent'),
          isCurrentSlab: isCurrent,
        };
      });

      // Ensure only one slab is marked as the current slab
      slabsProgress = slabsProgress.map((slab, index) => ({
        ...slab,
        isCurrentSlab: index === currentSlabIndex,
      }));
      if (!salesDataList) {
        return {
          message: `No sales data found for user ${userId} in ${currentMonth}/${currentYear}`,
          data: {
            userId,
            month: currentMonth,
            year: currentYear,
            currentSales: formatAmount(grossTotal),
            earnedIncentive: formatAmount(earnedIncentive),
            slabs: slabsProgress,
          },
        };
      }
      return {
        message: 'Sales Data Retrieved Successfully',
        data: {
          userId,
          month: currentMonth,
          year: currentYear,
          currentSales: formatAmount(grossTotal),
          earnedIncentive: formatAmount(earnedIncentive),
          slabs: slabsProgress,
        },
      };
    } catch (error) {
      logger.error(
        `Error while fetching sales data for user ID ${userId}: ${error.message}`,
        error,
      );
      throw new BadRequestException(error.message);
    }
  }
}
