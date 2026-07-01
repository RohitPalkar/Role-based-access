import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronLog, IncentivePolicy } from 'src/entities';
import { logger } from 'src/logger/logger';
import { updateIncentivePolicyStatuses } from '../incentives/incentive_policy/helper/deactivate-expired-policy.helper';
import { CronStatus, CRONTYPES } from 'src/enums/crons.enum';
import { CronLogsService } from './cron-logs.service';
import { CustomConfigService } from 'src/config/custom-config.service';

@Injectable()
export class IncentivePolicyStatusCron {
  private readonly enabled: boolean;
  private readonly cronType = CRONTYPES.INCENTIVE_POLICY_DEACTIVATION;

  constructor(
    @InjectRepository(IncentivePolicy)
    private readonly policyRepo: Repository<IncentivePolicy>,
    private readonly cronLogService: CronLogsService,
    private readonly configService: CustomConfigService,
  ) {
    this.enabled = this.configService.get('CRONS_ENABLED') === 'true';
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePolicyStatusUpdate() {
    logger.info('IncentivePolicyStatusCron: Job started...');
    if (!this.enabled) {
      logger.info(
        'Crons are disabled. Skipping execution. You can enable them via the CRONS_ENABLED config.',
      );
      return;
    }
    const startTime = new Date();

    const cronExecutionLog: Partial<CronLog> = {
      cronType: this.cronType,
      cronName: 'Incentive Policy Status Deactivation',
      startTime,
      status: CronStatus.PASS,
      description: 'Incentive policy cron started successfully.',
    };

    try {
      await updateIncentivePolicyStatuses(this.policyRepo);

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      logger.info(
        `IncentivePolicyStatusCron: Job completed in ${durationMs}ms`,
      );

      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = durationMs;
      cronExecutionLog.description =
        'Incentive policy status update completed.';
      cronExecutionLog.status = CronStatus.PASS;
    } catch (error) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      logger.error('IncentivePolicyStatusCron: Job failed', error);

      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = durationMs;
      cronExecutionLog.status = CronStatus.FAIL;
      cronExecutionLog.description = `Error: ${error.message}`;
    }

    await this.cronLogService.saveLog(cronExecutionLog);
  }
}
