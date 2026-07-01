import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Boosters, CronLog } from 'src/entities';
import { logger } from 'src/logger/logger';
import { updateBoosterStatuses } from '../incentives/booster_master/helper/deactivate-expired-boosters.helper';
import { CronStatus, CRONTYPES } from 'src/enums/crons.enum';
import { CronLogsService } from './cron-logs.service';
import { CustomConfigService } from 'src/config/custom-config.service';

@Injectable()
export class BoosterStatusCron {
  private readonly enabled: boolean;
  private readonly cronType = CRONTYPES.BOOSTER_DEACTIVATION;

  constructor(
    @InjectRepository(Boosters)
    private readonly boosterRepo: Repository<Boosters>,
    private readonly cronLogService: CronLogsService,
    private readonly configService: CustomConfigService,
  ) {
    this.enabled = this.configService.get('CRONS_ENABLED') === 'true';
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @Cron('36 22 * * *')
  async handleBoosterStatusUpdate() {
    logger.info('BoosterStatusCron: Job started...');
    if (!this.enabled) {
      logger.info(
        'Crons are disabled. Skipping execution. You can enable them via the CRONS_ENABLED config.',
      );
      return;
    }

    const startTime = new Date();

    const cronExecutionLog: Partial<CronLog> = {
      cronType: this.cronType,
      cronName: 'Booster Status Deactivation',
      startTime,
      status: CronStatus.PASS,
      description: 'Booster status update cron started.',
    };

    try {
      await updateBoosterStatuses(this.boosterRepo);
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      logger.info(`BoosterStatusCron: Job completed in ${durationMs}ms`);

      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = durationMs;
      cronExecutionLog.description = 'Booster status update completed.';
      cronExecutionLog.status = CronStatus.PASS;
    } catch (error) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      logger.error('BoosterStatusCron: Job failed', error);

      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = durationMs;
      cronExecutionLog.status = CronStatus.FAIL;
      cronExecutionLog.description = `Error: ${error.message}`;
    }

    await this.cronLogService.saveLog(cronExecutionLog);
  }
}
