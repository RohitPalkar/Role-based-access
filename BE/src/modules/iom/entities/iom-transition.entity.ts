import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { IomStatus } from './iom-status.entity';

/**
 * Allowed status transitions, scoped by role. Forms the edges of the IOM
 * state machine consumed by `WorkflowValidationService`. Rows are seeded
 * by SeedIomTransitions1780669000002.
 *
 * Note: there is no FK declared from `allowed_role_id` to `roles` at the
 * DB layer (the migration script only adds FKs to `iom_statuses`). We
 * keep the column id-only for now to avoid a BIGINT/INT FK mismatch
 * (`roles.id` is INT) - the seed migration enforces referential integrity
 * by joining against `roles.name`.
 */
@Entity('iom_transitions')
export class IomTransition {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => IomStatus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_status_id' })
  fromStatus: IomStatus;

  @Column({ name: 'from_status_id', type: 'bigint' })
  fromStatusId: number;

  @ManyToOne(() => IomStatus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_status_id' })
  toStatus: IomStatus;

  @Column({ name: 'to_status_id', type: 'bigint' })
  toStatusId: number;

  @Column({ name: 'allowed_role_id', type: 'bigint' })
  allowedRoleId: number;
}
