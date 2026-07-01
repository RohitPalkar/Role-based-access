import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { logger } from 'src/logger/logger';
import { QueueJobAuditLog } from './entities/queue-job-audit-log.entity';
import type { QueueJobAuditEvent } from './queue-job-audit.constants';

export interface AppendQueueJobAuditParams {
  queueName: string;
  jobId: string;
  event: QueueJobAuditEvent;
  jobName?: string | null;
  sourceModule?: string | null;
  summary?: string | null;
  context?: Record<string, unknown> | null;
  triggeredByUserId?: number | null;
}

/**
 * Generic append-only audit for queue workers. Failures to persist must never break job processing.
 */
@Injectable()
export class QueueJobAuditService {
  constructor(
    @InjectRepository(QueueJobAuditLog)
    private readonly repo: Repository<QueueJobAuditLog>,
  ) {}

  async append(params: AppendQueueJobAuditParams): Promise<void> {
    try {
      await this.repo.insert({
        queueName: params.queueName,
        jobId: params.jobId,
        jobName: params.jobName ?? null,
        sourceModule: params.sourceModule ?? null,
        event: params.event,
        summary: params.summary ?? null,
        context: params.context ?? null,
        triggeredByUserId: params.triggeredByUserId ?? null,
      });
    } catch (error) {
      logger.error(
        'QueueJobAuditService.append failed (audit row not persisted)',
        {
          error,
          queueName: params.queueName,
          jobId: params.jobId,
          event: params.event,
        },
      );
    }
  }

  /** Ordered audit rows for a queue + job (any module that uses `append`). */
  async findTimelineForJob(
    queueName: string,
    jobId: string,
  ): Promise<
    Array<{
      event: string;
      summary: string | null;
      sourceModule: string | null;
      jobName: string | null;
      createdAt: Date;
    }>
  > {
    const rows = await this.repo.find({
      where: { queueName, jobId },
      order: { createdAt: 'ASC' },
      select: ['event', 'summary', 'sourceModule', 'jobName', 'createdAt'],
    });
    return rows;
  }
}
