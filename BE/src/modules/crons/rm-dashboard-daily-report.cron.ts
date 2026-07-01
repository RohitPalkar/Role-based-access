import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EoiManagementService } from '../eoi_manager/eoi_management/eoi_management.service';
import { logger } from 'src/logger/logger';
import { CronStatus, CRONTYPES } from 'src/enums/crons.enum';
import { CronLogsService } from './cron-logs.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RmDashboardDailyReportCron {
  private readonly logger = new Logger(RmDashboardDailyReportCron.name);
  private readonly cronType = CRONTYPES.RM_DASHBOARD_DAILY_REPORT;
  private readonly LOCK_TTL_MS = 3600 * 1000; // 1 hour - enough time for the cron to complete

  constructor(
    private readonly eoiManagementService: EoiManagementService,
    private readonly cronLogService: CronLogsService,
    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,
  ) {}

  // Runs every day at 2 AM IST (8:30 PM UTC previous day)
  // IST is UTC+5:30, so 2 AM IST = 8:30 PM UTC (previous day)
  // Cron expression: minute hour day month dayOfWeek
  // '30 20 * * *' = 20:30 UTC = 02:00 IST next day
  // @Cron('30 20 * * *')
  @Cron('30 8,16 * * *', { timeZone: 'Asia/Kolkata' })
  async handleDailyDashboardReport() {
    // Generate unique lock key based on date to ensure only one execution per day
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lockKey = `cron:lock:${this.cronType}:${today}`;

    // Try to acquire distributed lock
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      this.logger.warn(
        `Cron job skipped: RM Dashboard Daily Report - already running in another cluster (lock: ${lockKey})`,
      );
      return;
    }

    this.logger.log('Cron job started: RM Dashboard Daily Report');
    const startTime = new Date();

    const cronExecutionLog: Partial<any> = {
      cronType: this.cronType,
      cronName: 'RM Dashboard Daily Report',
      startTime,
      status: CronStatus.PASS,
      description: 'Daily dashboard report cron started successfully',
    };

    try {
      // Send daily dashboard report email
      await this.eoiManagementService.sendDailyDashboardReport();

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      logger.info(
        `RmDashboardDailyReportCron: Job completed in ${durationMs}ms`,
      );

      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = durationMs;
      cronExecutionLog.description = 'Daily dashboard report sent successfully';
      cronExecutionLog.status = CronStatus.PASS;
    } catch (error) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      logger.error('RmDashboardDailyReportCron: Job failed', error);

      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = durationMs;
      cronExecutionLog.status = CronStatus.FAIL;
      cronExecutionLog.description = `Error: ${error.message}`;
    } finally {
      // Release the lock after execution (or let it expire naturally)
      await this.releaseLock(lockKey);
    }

    await this.cronLogService.saveLog(cronExecutionLog);
  }

  /**
   * Attempts to acquire a distributed lock using Redis cache.
   * Uses a simple get-and-set pattern with TTL to prevent duplicate executions.
   *
   * @param lockKey - Unique key for the lock
   * @returns true if lock was acquired, false if already locked
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    try {
      // Check if lock already exists
      const existingLock = await this.cacheService.get<string>(lockKey);
      if (existingLock) {
        return false; // Lock already held by another instance
      }

      // Try to set the lock with TTL
      // Use a timestamp as the lock value to identify when it was acquired
      const lockValue = new Date().toISOString();
      await this.cacheService.set(lockKey, lockValue, this.LOCK_TTL_MS);

      // Double-check: verify we actually got the lock
      // This helps handle race conditions between get and set
      const verifyLock = await this.cacheService.get<string>(lockKey);
      if (verifyLock === lockValue) {
        return true; // Successfully acquired lock
      }

      return false; // Another instance got the lock first
    } catch (error) {
      this.logger.error(
        `Error acquiring lock for ${lockKey}:`,
        error?.message || error,
      );
      // On error, allow execution to proceed (fail-open strategy)
      // This prevents cache issues from blocking cron execution
      return true;
    }
  }

  /**
   * Releases the distributed lock by deleting it from cache.
   *
   * @param lockKey - Unique key for the lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.cacheService.del(lockKey);
    } catch (error) {
      this.logger.warn(
        `Error releasing lock for ${lockKey}:`,
        error?.message || error,
      );
      // Non-critical error - lock will expire naturally via TTL
    }
  }
}
