import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IOM_HISTORY_EVENT } from '../constants';
import { Iom } from '../entities/iom.entity';
import { IomHistoryEvent } from '../events/iom-history.event';
import { IomLoyaltyCountsCacheService } from './iom-loyalty-counts-cache.service';

@Injectable()
export class IomLoyaltyCountsCacheListener {
  private readonly logger = new Logger(IomLoyaltyCountsCacheListener.name);

  constructor(
    @InjectRepository(Iom)
    private readonly iomRepo: Repository<Iom>,
    private readonly cacheService: IomLoyaltyCountsCacheService,
  ) {}

  @OnEvent(IOM_HISTORY_EVENT, { async: true, promisify: true })
  async handle(event: IomHistoryEvent): Promise<void> {
    try {
      const iom = await this.iomRepo.findOne({
        where: { id: event.iomId },
        select: ['id', 'projectId', 'statusId'],
      });

      if (iom?.projectId == null) {
        return;
      }

      await this.cacheService.invalidateForProject(iom.projectId);
    } catch (err) {
      this.logger.error(
        `Failed to invalidate loyalty counts cache for iom=${event.iomId}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
    }
  }
}
