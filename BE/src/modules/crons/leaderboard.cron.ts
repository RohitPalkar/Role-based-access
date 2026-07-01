import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import { Users } from 'src/modules/users/entities/user.entity';
import { CronLog, IncentiveBooking, UserMonthlyGrossTotal } from 'src/entities';
import { IncentiveBookingService } from '../incentives/incentive_booking/incentive_booking.service';
import { logger } from 'src/logger/logger';
import { ONE_CRORE } from 'src/config/constants';
import { NotificationService } from '../notifications/notification.service';
import { LeaderBoardService } from '../incentives/leaderboard/leaderboard.service';
import { CronStatus, CRONTYPES } from 'src/enums/crons.enum';
import { CronLogsService } from './cron-logs.service';
import * as moment from 'moment';
import { CustomConfigService } from 'src/config/custom-config.service';

export const CRON_TIMINGS = {
  EVERY_10_SECONDS: '*/10 * * * * *', // Runs every 10 seconds
  EVERY_DAY_10_AM: '0 10 * * *', // Runs every day at 10 AM
  EVERY_DAY_11_AM: '0 11 * * *', // Runs every day at 11 AM
  EVERY_DAY_10_30_AM: '30 10 * * *', // Runs every day at 10:30 AM
  EVERY_DAT_12: '1 0 1 * *',
};

@Injectable()
export class AccrualsCronService {
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,

    @InjectRepository(IncentiveBooking)
    private readonly incentiveBookingRepository: Repository<IncentiveBooking>,
    private readonly em: EntityManager, // Inject EntityManager
    private readonly notificationService: NotificationService,
    private readonly incentiveService: IncentiveBookingService, //
    private readonly leadeBoardService: LeaderBoardService,
    @InjectRepository(UserMonthlyGrossTotal)
    private readonly userMonthlyGrossTotal: Repository<UserMonthlyGrossTotal>,

    private readonly cronLogService: CronLogsService,
    private readonly configService: CustomConfigService,
  ) {
    this.enabled = this.configService.get('CRONS_ENABLED') === 'true';
  }

  @Cron(CRON_TIMINGS.EVERY_DAY_10_AM)
  async sendDisqualificationReminders() {
    logger.info(`Cron job started: ${CRONTYPES.NOTIFICATIONS}`);
    if (!this.enabled) {
      logger.info(
        'Crons are disabled. Skipping execution. You can enable them via the CRONS_ENABLED config.',
      );
      return;
    }
    const startTime = new Date();

    //  Create a log object to track execution details
    const cronExecutionLog: Partial<CronLog> = {
      cronType: CRONTYPES.NOTIFICATIONS,
      cronName: 'Disqualification Reminder',
      startTime,
      status: CronStatus.PASS,
      description: 'Cron started successfully',
    };

    try {
      await this.getBookingsForDisqualificationReminder();

      const endTime = new Date();
      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = endTime.getTime() - startTime.getTime();
      cronExecutionLog.status = CronStatus.PASS;
      cronExecutionLog.description = 'Cron executed successfully';
    } catch (error) {
      logger.error(
        'Critical error occurred during disqualification reminders',
        error,
      );

      cronExecutionLog.endTime = new Date();
      cronExecutionLog.durationMs =
        cronExecutionLog.endTime.getTime() - startTime.getTime();
      cronExecutionLog.status = CronStatus.FAIL;
      cronExecutionLog.description = `Cron failed: ${error.message}`;
    }

    //  Save the final execution log to the database (only one DB write)
    await this.cronLogService.saveLog(cronExecutionLog);
  }

  async getBookingsForDisqualificationReminder() {
    try {
      const bookings = await this.incentiveBookingRepository.find({
        where: {
          isDeadlineApproaching: true,
        },
        relations: ['user'],
      });

      if (bookings.length === 0) {
        logger.warn('No bookings found for disqualification reminder.');
        return; // Exit early if no bookings are found
      }

      const notifications = bookings
        .filter((booking) => booking.user?.id) // Exclude bookings without a userId
        .map((booking) => {
          const dayRemain = this.calculateRemainingDays(booking.bookingDate);
          if (dayRemain === 0) return null; // Skip notifications where 0 days remain

          return {
            title: 'Disqualification Alert',
            message: `In ${dayRemain} days, ${booking.customerName}'s booking ${booking.bookingId} may get disqualified. Ensure the sale is regularized before that to earn the incentive on this booking.`,
            type: 'Disqualification Alert',
            userIds: [booking?.user?.id], // Ensured that userId exists
          };
        })
        .filter(Boolean);

      if (notifications.length === 0) {
        logger.error('No valid notifications to send.');
      } else {
        try {
          await this.notificationService.create({ notifications });
        } catch (e) {
          logger.error(
            e,
            'Error creating notifications for disqualification reminder',
          );
        }
      }

      return bookings;
    } catch (error) {
      logger.error(
        'Error fetching bookings for disqualification reminder:',
        error,
      );
    }
  }

  @Cron(CRON_TIMINGS.EVERY_DAY_10_30_AM)
  async updateLeaderboardAndHigherPerformer(): Promise<void> {
    logger.info(`Cron job started: ${CRONTYPES.NOTIFICATIONS}`);
    if (!this.enabled) {
      logger.info(
        'Crons are disabled. Skipping execution. You can enable them via the CRONS_ENABLED config.',
      );
      return;
    }
    const startTime = new Date();

    const cronExecutionLog: Partial<CronLog> = {
      cronType: CRONTYPES.NOTIFICATIONS,
      cronName: 'Leaderboard And Highest Performer',
      startTime,
      status: CronStatus.PASS,
      description: 'Cron started successfully',
    };
    try {
      const yesterdayRankings = await this.fetchYesterdayRankings();
      const todayRankings = await this.fetchTodayTopTenUsers();

      // CASE 1: If no yesterday's data AND no today's data → Do nothing & return
      if (yesterdayRankings.length === 0 && todayRankings.length === 0) {
        return;
      }

      // getting for hiest performer notification
      const newTopPerformers = this.getNewTopPerformers(
        yesterdayRankings,
        todayRankings,
      );

      if (newTopPerformers.length > 0) {
        await this.sendNewTopPerformerNotifications(
          newTopPerformers,
          todayRankings,
        );
      }

      if (yesterdayRankings.length === 0) {
        await this.storeTodayRankings(todayRankings); // we should add in notitifcation
        return;
      }

      if (todayRankings.length === 0) {
        return;
      }

      const droppedUsers = this.getDroppedOrRankedDownUsers(
        yesterdayRankings,
        todayRankings,
      );

      if (droppedUsers.length > 0) {
        await this.notifyDroppedUsers(droppedUsers);
      }

      await this.updateUserRankings(todayRankings);
      cronExecutionLog.endTime = new Date();
      cronExecutionLog.durationMs =
        cronExecutionLog.endTime.getTime() - startTime.getTime();
      cronExecutionLog.status = CronStatus.PASS;
      cronExecutionLog.description = `Cron Successful`;
    } catch (error) {
      logger.error(
        'Error in updating leaderboard and higher performer:',
        error,
      );
      cronExecutionLog.endTime = new Date();
      cronExecutionLog.durationMs =
        cronExecutionLog.endTime.getTime() - startTime.getTime();
      cronExecutionLog.status = CronStatus.FAIL;
      cronExecutionLog.description = `Cron failed: ${error.message}`;
    }
    await this.cronLogService.saveLog(cronExecutionLog);
  }
  @Cron(CRON_TIMINGS.EVERY_DAY_11_AM)
  async slabUpgradeOpportunity() {
    logger.info(`Cron job started: ${CRONTYPES.NOTIFICATIONS}`);

    if (!this.enabled) {
      logger.info(
        'Crons are disabled. Skipping execution. You can enable them via the CRONS_ENABLED config.',
      );
      return;
    }

    const startTime = new Date();

    const cronExecutionLog: Partial<CronLog> = {
      cronType: CRONTYPES.NOTIFICATIONS,
      cronName: 'Leaderboard And Highest Performer',
      startTime,
      status: CronStatus.PASS,
      description: 'Cron started successfully',
    };

    try {
      await this.processSlabUpgradeOpportunities();

      cronExecutionLog.endTime = new Date();
      cronExecutionLog.durationMs =
        cronExecutionLog.endTime.getTime() - startTime.getTime();
      cronExecutionLog.status = CronStatus.PASS;
      cronExecutionLog.description = `Cron Successful`;
    } catch (error) {
      logger.error('Error in slabUpgradeOpportunity:', error);

      cronExecutionLog.endTime = new Date();
      cronExecutionLog.durationMs =
        cronExecutionLog.endTime.getTime() - startTime.getTime();
      cronExecutionLog.status = CronStatus.FAIL;
      cronExecutionLog.description = `Cron failed: ${error.message}`;
    }

    await this.cronLogService.saveLog(cronExecutionLog);
  }

  private async processSlabUpgradeOpportunities() {
    const users = await this.getCurrentMonthSales();

    if (!users || users.length === 0) {
      logger.error(
        'No sales records found for the current month. Exiting for Send notification.',
      );
      return;
    }

    for (const salesRecord of users) {
      const user = salesRecord.user;
      const brandId = user?.brand?.id;
      const project = user?.project;

      if (!brandId) continue;

      const policy = await this.incentiveService.determinePolicyToUse(
        this.em,
        user,
        brandId,
        project,
        moment().startOf('day').toDate(),
      );

      if (!policy) continue;

      const slabs = policy.incentiveSlabs;

      await this.evaluateNextSlabAndNotify(
        slabs,
        salesRecord.launchGrossTotal,
        'launchStartRange',
        'launchEndRange',
        user,
      );

      await this.evaluateNextSlabAndNotify(
        slabs,
        salesRecord.sustenanceGrossTotal,
        'sustenanceStartRange',
        'sustenanceEndRange',
        user,
      );
    }
  }

  private async evaluateNextSlabAndNotify(
    slabs: any[],
    userGrossTotal: number,
    startKey: 'launchStartRange' | 'sustenanceStartRange',
    endKey: 'launchEndRange' | 'sustenanceEndRange',
    user: any,
  ) {
    let currentSlab = null;

    for (const slab of slabs) {
      if (
        userGrossTotal >= slab[startKey] * ONE_CRORE &&
        userGrossTotal <= slab[endKey] * ONE_CRORE
      ) {
        currentSlab = slab;
        break;
      }
    }

    if (!currentSlab) return;

    const sortedSlabs = slabs
      .slice()
      .sort((a, b) => a[startKey] * ONE_CRORE - b[startKey] * ONE_CRORE);

    const currentIndex = sortedSlabs.findIndex(
      (slab) => slab.id === currentSlab.id,
    );

    const nextSlab = sortedSlabs[currentIndex + 1];
    if (!nextSlab) return;

    const currentSlabStart = currentSlab[startKey] * ONE_CRORE;
    const nextSlabStart = nextSlab[startKey] * ONE_CRORE;

    const requiredIncrease = nextSlabStart - userGrossTotal;
    const slabRange = nextSlabStart - currentSlabStart;

    const progress = ((userGrossTotal - currentSlabStart) / slabRange) * 100;
    const requiredPercentage = 100 - progress;

    if (Math.round(requiredIncrease) <= 0) return;

    if (requiredPercentage <= 25) {
      await this.sendSlabUpgradeNotification(
        user,
        requiredIncrease,
        requiredPercentage,
      );
    }
  }

  async sendSlabUpgradeNotification(
    user,
    requiredIncrease,
    requiredPercentage,
  ) {
    const notifications = [
      {
        title: 'Slab Upgrade Opportunity',
        message: `"If you Regularize sales by  ₹ ${requiredIncrease.toFixed(2)} more , you will move to the next incentive slab, increasing your incentive by ${requiredPercentage.toFixed(2)}%`,
        type: 'Slab Upgrade Opportunity',
        userIds: [user.id],
      },
    ];
    await this.notificationService.create({ notifications });
  }

  private async fetchYesterdayRankings(): Promise<
    { id: number; rank: number }[]
  > {
    return this.userRepository.find({
      select: ['id', 'rank'],
      where: { rank: Not(IsNull()) },
    });
  }
  private async fetchTodayTopTenUsers(): Promise<
    { id: number; rank: number }[]
  > {
    const { data } = await this.leadeBoardService.getTopTenRm(1, 10);
    if (!data?.rms) {
      throw new Error('Failed to fetch top 10 users.');
    }
    return data.rms.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
  private getNewTopPerformers(
    yesterdayRankings: any[],
    todayRankings: any[],
  ): number[] {
    const yesterdayRankedIds = new Set(
      yesterdayRankings.map((user) => user.id),
    );
    return todayRankings
      .filter((user) => !yesterdayRankedIds.has(user.id))
      .map((user) => user.id);
  }

  private async sendNewTopPerformerNotifications(
    newUserIds: number[],
    todayRankings: any[],
  ): Promise<void> {
    const notifications = newUserIds.map((userId) => {
      const userRank = todayRankings.find((user) => user.id === userId)?.rank;
      return {
        title: 'Highest Performer Notification',
        message: `Congratulations! You are ranked ${userRank} among the Top Performers this month. Keep up the great work!`,
        type: 'Highest Performer Notification',
        userIds: [userId],
      };
    });
    await this.notificationService.create({ notifications });
  }

  private async storeTodayRankings(todayRankings: any[]): Promise<void> {
    await Promise.all(
      todayRankings.map((user) =>
        this.userRepository.update(user.id, { rank: user.rank }),
      ),
    );
  }
  private getDroppedOrRankedDownUsers(
    yesterdayRankings: any[],
    todayRankings: any[],
  ): number[] {
    const todayRankMap = new Map(
      todayRankings.map((user) => [user.id, user.rank]),
    );
    return yesterdayRankings
      .filter((user) => {
        const newRank = todayRankMap.get(user.id);
        return newRank === undefined || newRank > user.rank;
      })
      .map((user) => user.id);
  }
  private async notifyDroppedUsers(userIds: number[]): Promise<void> {
    const notifications = userIds.map((userId) => ({
      title: 'Leaderboard update',
      message: `Your rank in the leaderboard rankings has changed. Check where you stand and push for the top spot!`,
      type: 'Leaderboard update',
      userIds: [userId],
    }));
    await this.notificationService.create({ notifications });
  }
  private async updateUserRankings(todayRankings: any[]): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(Users)
      .set({ rank: null })
      .execute();

    await Promise.all(
      todayRankings.map((user) =>
        this.userRepository.update(user.id, { rank: user.rank }),
      ),
    );
  }

  private calculateRemainingDays(deadline: Date | string): number {
    if (!deadline) return 0;

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) return 0;

    const today = new Date();
    const remainingDays = Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return remainingDays > 0 ? remainingDays : 0;
  }

  async getCurrentMonthSales() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const salesData = await this.userMonthlyGrossTotal.find({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      relations: [
        'user',
        'user.group',
        'user.project',
        'user.brand',
        'user.brand.defaultPolicy',
        'user.brand.defaultPolicy.incentiveSlabs',
      ],
    });

    return salesData;
  }
}
