import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Master table for IOM statuses. Rows are seeded by
 * SeedIomStatuses1780669000001 and consumed by `WorkflowValidationService`.
 */
@Entity('iom_statuses')
export class IomStatus {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ name: 'is_deleted', type: 'smallint', default: 0 })
  isDeleted: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}
