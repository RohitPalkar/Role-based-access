/**
 * BullMQ worker for PE-483 bulk finance transaction uploads. Jobs are enqueued from
 * `EoiManagementService.bulkUpdateTransactions` after the client uploads the Excel to S3.
 * Delegates workbook handling to `EoiManagementService.runBulkTransactionUpdateJob`.
 * End-to-end flow: `docs/PE-483-bulk-transaction-api-flow.md`.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { EoiManagementService } from '../eoi_management.service';
import { BULK_TRANSACTION_UPDATE_QUEUE } from 'src/config/constants';
import { BulkTransactionUpdateJobPayload } from '../interfaces/bulk-transaction-update-job-payload.interface';
import { QueueJobAuditService } from 'src/modules/queue_audit/queue-job-audit.service';
import { QUEUE_JOB_AUDIT_EVENT } from 'src/modules/queue_audit/queue-job-audit.constants';
import { logger } from 'src/logger/logger';

const MAX_FAILURE_ROWS_IN_AUDIT_CONTEXT = 200;

/** Consumes the `bulk-transaction-updates` queue; runs in the same Nest process as the API unless you split workers. */
@Injectable()
@Processor(BULK_TRANSACTION_UPDATE_QUEUE)
export class BulkTransactionUpdateProcessor extends WorkerHost {
  constructor(
    private readonly eoiManagementService: EoiManagementService,
    private readonly queueJobAuditService: QueueJobAuditService,
  ) {
    super();
  }

  /**
   * BullMQ entry: one invocation per queued job. Payload = `queue.add('process', { userId, key, fileName })`.
   * Writes STARTED → (work) → COMPLETED or FAILED to `queue_job_audit_logs`; return becomes job `returnvalue`.
   */
  async process(
    job: Job<BulkTransactionUpdateJobPayload>,
  ): Promise<Record<string, unknown>> {
    // Same fields the API enqueued; used for S3 fetch, row updates, and access control on poll.
    const { userId, key, fileName } = job.data;

    // Corrupt/malformed payload: UnrecoverableError → no wasted retries.
    if (!userId || !key || !fileName) {
      throw new UnrecoverableError('Invalid bulk job payload');
    }

    // Stable string id for DB audit rows (matches client poll path).
    const jobId = String(job.id);
    // Job type name from `add`; optional for audit metadata.
    const jobName = job.name ?? undefined;

    // DB timeline: worker has claimed the job (visible before long Excel run finishes).
    await this.queueJobAuditService.append({
      queueName: BULK_TRANSACTION_UPDATE_QUEUE, // Must match `@Processor` / enqueue queue.
      jobId,
      jobName,
      event: QUEUE_JOB_AUDIT_EVENT.STARTED,
      sourceModule: 'eoi_management',
      summary: `Processing bulk transaction file: ${fileName}`,
      context: { key, fileName, userId },
      triggeredByUserId: userId,
    });

    const processingStartedAt = Date.now();
    logger.info(
      `queue started: jobId=${job.id}, name=${job.name}, fileName=${fileName}`,
    );
    try {
      // S3 download, parse sheet, per-row `updateTransaction`; may complete with partial row failures.
      const result =
        await this.eoiManagementService.runBulkTransactionUpdateJob(job);

      // Coerce for summary string if return shape ever loosens.
      const totalRows = Number(result.totalRows ?? 0);
      const successCount = Number(result.successCount ?? 0);
      const failureCount = Number(result.failureCount ?? 0);
      const durationSec = formatDurationSeconds(processingStartedAt);

      // SUCCESS path: counts in summary; failures list truncated in context if huge.
      await this.queueJobAuditService.append({
        queueName: BULK_TRANSACTION_UPDATE_QUEUE,
        jobId,
        jobName,
        event: QUEUE_JOB_AUDIT_EVENT.COMPLETED,
        sourceModule: 'eoi_management',
        summary: `Finished: ${totalRows} rows, ${successCount} ok, ${failureCount} failed (${durationSec}s)`,
        context: truncateFailuresInAuditContext(result),
        triggeredByUserId: userId,
      });

      // Bull stores this on the job; GET job status exposes it as `returnvalue`.
      return result;
    } catch (err: unknown) {
      // Normalize for audit `summary` (cap length below).
      let message = 'Unknown error';
      if (err instanceof Error) message = err.message;
      else if (typeof err === 'string') message = err;
      const durationSec = formatDurationSeconds(processingStartedAt);
      const failedSummary = `${message.slice(0, 450)} (${durationSec}s)`;
      // FAILURE path: e.g. S3 down, parse throw, UnrecoverableError from service — then rethrow for Bull retries/rules.
      await this.queueJobAuditService.append({
        queueName: BULK_TRANSACTION_UPDATE_QUEUE,
        jobId,
        jobName,
        event: QUEUE_JOB_AUDIT_EVENT.FAILED,
        sourceModule: 'eoi_management',
        summary: failedSummary.slice(0, 500),
        context: { key, fileName, userId },
        triggeredByUserId: userId,
      });
      throw err; // Propagate so BullMQ marks attempt failed and may retry per job options.
    }
  }
}

/** Elapsed wall time since `startMs` (`Date.now()`), for audit summaries. */
function formatDurationSeconds(startMs: number): string {
  const sec = (Date.now() - startMs) / 1000;
  return sec >= 100 ? sec.toFixed(0) : sec.toFixed(1);
}

/** Avoid huge JSON in `context` when many rows failed (audit row still records counts in `summary`). */
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
