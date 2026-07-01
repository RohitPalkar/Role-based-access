import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EoiCampaignService } from '../eoi_manager/eoi_campaign/eoi_campaign.service';
import { logger } from 'src/logger/logger';
import { CustomConfigService } from 'src/config/custom-config.service';

@Injectable()
export class EoiPhaseLaunchCron {
  private readonly enabled: boolean;

  constructor(
    private readonly eoiCampaignService: EoiCampaignService,
    private readonly configService: CustomConfigService,
  ) {
    this.enabled = this.configService.get('CRONS_ENABLED') === 'true';
  }

  @Cron('30 00 * * *', { timeZone: 'Asia/Kolkata' })
  async handleCase5PhaseLaunchBackfill(): Promise<void> {
    if (!this.enabled) {
      logger.info('Case 5 phase launch cron disabled.');
      return;
    }

    logger.info('Case 5 phase launch cron started.');
    const results =
      await this.eoiCampaignService.backfillCase5ForLaunchingCampaigns();
    const totalUpdated = results.reduce((sum, row) => sum + row.updated, 0);
    logger.info(
      `Case 5 phase launch cron completed. campaigns=${results.length}, updatedVouchers=${totalUpdated}`,
    );
  }
}
