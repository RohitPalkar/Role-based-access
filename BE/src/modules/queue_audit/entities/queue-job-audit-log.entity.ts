import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only audit trail for **any** BullMQ (or similar) background job.
 * Not tied to a feature: use `queueName` + Bull `jobId` to correlate with Redis / ops tools.
 */
@Entity({ name: 'queue_job_audit_logs' })
@Index('idx_queue_job_audit_queue_job', ['queueName', 'jobId'])
@Index('idx_queue_job_audit_created', ['createdAt'])
export class QueueJobAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  /** Bull queue name, e.g. `bulk-transaction-updates`. */
  @Column({ name: 'queue_name', type: 'varchar', length: 128 })
  queueName: string;

  /** Bull job id (string in BullMQ). */
  @Column({ name: 'job_id', type: 'varchar', length: 128 })
  jobId: string;

  /** Optional Bull job name from `queue.add(name, …)`. */
  @Column({ name: 'job_name', type: 'varchar', length: 128, nullable: true })
  jobName: string | null;

  /**
   * Owning area for reporting (convention: e.g. `eoi_management`).
   * Not enforced — any module may set a distinct value.
   */
  @Column({
    name: 'source_module',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  sourceModule: string | null;

  /**
   * Lifecycle marker: `enqueued` (API), `started` (worker), `completed`, `failed`.
   * Kept as varchar so new values never require a migration.
   */
  @Column({ type: 'varchar', length: 32 })
  event: string;

  /** Short human-readable line for dashboards / quick scans. */
  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /** Structured payload (counts, S3 keys, etc.); keep large blobs bounded at write time. */
  @Column({ type: 'json', nullable: true })
  context: Record<string, unknown> | null;

  @Column({
    name: 'triggered_by_user_id',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  triggeredByUserId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
