import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IomHistory } from '../entities/iom-history.entity';
import { IomHistoryEvent } from '../events/iom-history.event';
import { IOM_HISTORY_EVENT } from '../constants';

/**
 * Subscribes to `IOM_HISTORY_EVENT` and writes a row into `iom_history`.
 */
@Injectable()
export class IomHistoryListener {
  private readonly logger = new Logger(IomHistoryListener.name);

  constructor(
    @InjectRepository(IomHistory)
    private readonly historyRepo: Repository<IomHistory>,
  ) {}

  @OnEvent(IOM_HISTORY_EVENT, { async: true, promisify: true })
  async handle(event: IomHistoryEvent): Promise<void> {
    try {
      await this.historyRepo.insert({
        iomId: event.iomId,
        fromStatusId: event.fromStatusId,
        toStatusId: event.toStatusId,
        changedBy: event.changedBy,
        action: event.action,
        remarks: event.remarks,
        prevValue: event.prevValue,
        updatedValue: event.updatedValue,
      });
    } catch (err) {
      // Audit failure must never bubble to the originating request.
      // Log loudly so monitoring picks it up.
      this.logger.error(
        `Failed to persist iom_history for iom=${event.iomId}: ${
          (err as Error)?.message ?? err
        }`,
        (err as Error)?.stack,
      );
    }
  }
}
