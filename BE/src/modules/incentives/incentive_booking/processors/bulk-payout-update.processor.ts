import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { IncentiveBookingService } from '../incentive_booking.service';
import { BULK_PAYOUT_UPDATE_QUEUE } from 'src/config/constants';
import { QueueJobAuditService } from 'src/modules/queue_audit/queue-job-audit.service';
import { QUEUE_JOB_AUDIT_EVENT } from 'src/modules/queue_audit/queue-job-audit.constants';
import { NotificationService } from 'src/modules/notifications/notification.service';
import { logger } from 'src/logger/logger';

const MAX_FAILURE_ROWS_IN_AUDIT_CONTEXT = 200;

type BulkPayoutUpdateJobPayload = {
  filePath: string;
  fileName: string;
  updateOnlyDates?: boolean;
};

@Injectable()
@Processor(BULK_PAYOUT_UPDATE_QUEUE)
export class BulkPayoutUpdateProcessor extends WorkerHost {
  constructor(
    private readonly incentiveBookingService: IncentiveBookingService,
    private readonly queueJobAuditService: QueueJobAuditService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(
    job: Job<BulkPayoutUpdateJobPayload>,
  ): Promise<Record<string, unknown>> {
    const { filePath, fileName, updateOnlyDates } = job.data;

    if (!filePath || !fileName) {
      throw new UnrecoverableError('Invalid bulk payout job payload');
    }

    const jobId = String(job.id);
    const jobName = job.name ?? undefined;

    await this.queueJobAuditService.append({
      queueName: BULK_PAYOUT_UPDATE_QUEUE,
      jobId,
      jobName,
      event: QUEUE_JOB_AUDIT_EVENT.STARTED,
      sourceModule: 'incentive_booking',
      summary: `Processing bulk payout update file: ${fileName}`,
      context: { filePath, fileName },
    });

    const processingStartedAt = Date.now();
    logger.info(
      `queue started: jobId=${job.id}, name=${job.name}, fileName=${fileName}`,
    );

    try {
      const result =
        await this.incentiveBookingService.runBulkUpdatePayableReceivedDatesJob(
          { filePath, fileName, updateOnlyDates },
        );

      const totalRows = Number(result.totalRows ?? 0);
      const successCount = Number(result.updatedRecords ?? 0);
      const failureCount = Number(result.skippedRecords ?? 0);
      const durationSec = formatDurationSeconds(processingStartedAt);

      await this.queueJobAuditService.append({
        queueName: BULK_PAYOUT_UPDATE_QUEUE,
        jobId,
        jobName,
        event: QUEUE_JOB_AUDIT_EVENT.COMPLETED,
        sourceModule: 'incentive_booking',
        summary: `Finished: ${totalRows} rows, ${successCount} ok, ${failureCount} failed (${durationSec}s)`,
        context: truncateFailuresInAuditContext(result),
      });

      await this.notificationService.create({
        notifications: [
          {
            title: 'Bulk Payout Update Completed',
            message: `Successfully processed ${totalRows} rows: ${successCount} updated, ${failureCount} skipped, Duration: ${durationSec}s.`,
            type: 'Bulk Payout Processing',
            isForAllAdmin: true,
          },
        ],
      });

      return result;
    } catch (err: unknown) {
      let message = 'Unknown error';
      if (err instanceof Error) message = err.message;
      else if (typeof err === 'string') message = err;
      const durationSec = formatDurationSeconds(processingStartedAt);
      const failedSummary = `${message.slice(0, 450)} (${durationSec}s)`;

      await this.queueJobAuditService.append({
        queueName: BULK_PAYOUT_UPDATE_QUEUE,
        jobId,
        jobName,
        event: QUEUE_JOB_AUDIT_EVENT.FAILED,
        sourceModule: 'incentive_booking',
        summary: failedSummary.slice(0, 500),
        context: { filePath, fileName },
      });

      await this.notificationService.create({
        notifications: [
          {
            title: 'Bulk Payout Update Failed',
            message: `Job failed during processing. Error: ${message.slice(0, 200)}. Duration: ${durationSec}s.`,
            type: 'Bulk Payout Processing',
            isForAllAdmin: true,
          },
        ],
      });

      throw err;
    }
  }
}

function formatDurationSeconds(startMs: number): string {
  const sec = (Date.now() - startMs) / 1000;
  return sec >= 100 ? sec.toFixed(0) : sec.toFixed(1);
}

function truncateFailuresInAuditContext(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const failures = result.failures;
  if (
    !Array.isArray(failures) ||
    failures.length <= MAX_FAILURE_ROWS_IN_AUDIT_CONTEXT
  ) {
    return { ...result };
  }
  return {
    ...result,
    failures: failures.slice(0, MAX_FAILURE_ROWS_IN_AUDIT_CONTEXT),
    failuresTruncated: true,
    failuresOmitted: failures.length - MAX_FAILURE_ROWS_IN_AUDIT_CONTEXT,
  };
}
