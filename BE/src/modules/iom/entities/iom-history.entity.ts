import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IomStatus } from './iom-status.entity';

/**
 * Append-only audit trail. Rows are written by `IomHistoryListener` in
 * response to `IOM_HISTORY_EVENT`. Service code never INSERTs here
 * directly - it emits an event, the HTTP response is returned, and the
 * listener writes the row asynchronously.
 *
 * Two complementary uses:
 *   1. Status transitions  -> from_status_id != null, to_status_id set.
 *   2. Field-level edits   -> from_status_id == to_status_id (the current
 *      status), with prev_value/updated_value populated.
 */
@Entity('iom_history')
export class IomHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'iom_id', type: 'bigint' })
  iomId: number;

  @ManyToOne(() => IomStatus, { nullable: true })
  @JoinColumn({ name: 'from_status_id' })
  fromStatus: IomStatus | null;

  @Column({ name: 'from_status_id', type: 'bigint', nullable: true })
  fromStatusId: number | null;

  @ManyToOne(() => IomStatus, { nullable: false })
  @JoinColumn({ name: 'to_status_id' })
  toStatus: IomStatus;

  @Column({ name: 'to_status_id', type: 'bigint' })
  toStatusId: number;

  @Column({ name: 'changed_by', type: 'bigint' })
  changedBy: number;

  /**
   * Stable, machine-readable action label (e.g. `CRM_EDIT`,
   * `CRM_SUBMIT`). Nullable for backward compatibility with rows
   * written before the column was added; all new writes populate it.
   */
  @Column({ name: 'action', type: 'varchar', length: 50, nullable: true })
  action: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'prev_value', type: 'json', nullable: true })
  prevValue: Record<string, unknown> | null;

  @Column({ name: 'updated_value', type: 'json', nullable: true })
  updatedValue: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamp' })
  changedAt: Date;
}
