import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sfdc_logs')
export class SfdcLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'opportunity_id' })
  opportunityId: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'batch_id', nullable: true })
  batchId: string;

  @Column({ name: 'log_event' })
  logEvent: string;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  response: Record<string, any>;

  @Column()
  status: string;

  @Column({ name: 'attempt_no', default: 1 })
  attemptNo: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'modified_at', type: 'timestamp' })
  modifiedAt: Date;
}
