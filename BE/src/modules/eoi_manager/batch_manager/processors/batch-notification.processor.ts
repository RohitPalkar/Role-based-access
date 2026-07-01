import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';

import { BatchService } from '../batch.service';

import { BATCH_NOTIFICATION_QUEUE } from 'src/config/constants';

import { QueueJobAuditService } from 'src/modules/queue_audit/queue-job-audit.service';

import { QUEUE_JOB_AUDIT_EVENT } from 'src/modules/queue_audit/queue-job-audit.constants';
import { logger } from 'src/logger/logger';
import { BatchQueueJobs } from 'src/enums/batch-manager.enums';
import { BatchNotificationJobPayload } from '../interface/batch-notification-job-payload.interface';
@Injectable()
@Processor(BATCH_NOTIFICATION_QUEUE)
export class BatchNotificationProcessor extends WorkerHost {
  constructor(
    private readonly batchService: BatchService,
    private readonly queueJobAuditService: QueueJobAuditService,
  ) {
    super();
  }

  async process(
    job: Job<BatchNotificationJobPayload>,
  ): Promise<Record<string, unknown>> {
    const { batchId, userId, stage } = job.data;
    // Stable string id for DB audit rows (matches client poll path).
    const jobId = String(job.id);
    // Job type name from `add`; optional for audit metadata.
    const jobName = job.name ?? undefined;

    // ================= STARTED =================
    await this.queueJobAuditService.append({
      queueName: BATCH_NOTIFICATION_QUEUE,
      jobId,
      jobName,
      event: QUEUE_JOB_AUDIT_EVENT.STARTED,
      sourceModule: 'batch_manager',
      summary: `Batch notification started`,
      context: {
        userId,
        batchId,
      },
      triggeredByUserId: userId,
    });
    const processingStartedAt = Date.now();
    logger.info(`queue started: jobId=${job.id}, name=${job.name}}`);

    try {
      let result: {
        totalUsers: number;
        successCount: number;
        failureCount: number;
      };

      switch (job.name) {
        case BatchQueueJobs.BATCH_DELETE_NOTIFICATION:
          result =
            await this.batchService.sendBatchDeleteNotifications(batchId);
          break;

        case BatchQueueJobs.BATCH_STAGE_NOTIFICATION:
          result = await this.batchService.sendBatchCustomerNotifications(
            batchId,
            stage,
          );
          break;

        default:
          throw new Error(`Unsupported job name: ${job.name}`);
      }

      const totalUsers = Number(result.totalUsers ?? 0);
      const successCount = Number(result.successCount ?? 0);
      const failureCount = Number(result.failureCount ?? 0);
      const durationSec = formatDurationSeconds(processingStartedAt);

      // ================= COMPLETED =================
      await this.queueJobAuditService.append({
        queueName: BATCH_NOTIFICATION_QUEUE,
        jobId,
        jobName,
        event: QUEUE_JOB_AUDIT_EVENT.COMPLETED,
        sourceModule: 'batch_manager',
        summary: `Finished: ${totalUsers} users, ${successCount} sent, ${failureCount} failed (${durationSec}s)`,
        context: {
          userId,
          batchId,
          durationSec,
        },
        triggeredByUserId: userId,
      });
      return result;
    } catch (err: unknown) {
      let message = 'Unknown error';

      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }

      const durationSec = formatDurationSeconds(processingStartedAt);

      const failedSummary = `${message.slice(0, 450)} (${durationSec}s)`;

      // ================= FAILED =================
      await this.queueJobAuditService.append({
        queueName: BATCH_NOTIFICATION_QUEUE,
        jobId,
        jobName,
        event: QUEUE_JOB_AUDIT_EVENT.FAILED,
        sourceModule: 'batch_manager',
        summary: failedSummary.slice(0, 500),
        context: {
          userId,
          batchId,
        },
        triggeredByUserId: userId,
      });

      throw err;
    }
  }
}
/** Elapsed wall time since `startMs` (`Date.now()`), for audit summaries. */
function formatDurationSeconds(startMs: number): string {
  const sec = (Date.now() - startMs) / 1000;
  return sec >= 100 ? sec.toFixed(0) : sec.toFixed(1);
}
