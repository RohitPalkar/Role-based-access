/** Allowed `event` values for `queue_job_audit_logs` (varchar — add more without migration). */
export const QUEUE_JOB_AUDIT_EVENT = {
  ENQUEUED: 'enqueued',
  STARTED: 'started',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type QueueJobAuditEvent =
  (typeof QUEUE_JOB_AUDIT_EVENT)[keyof typeof QUEUE_JOB_AUDIT_EVENT];
