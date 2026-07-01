import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { EoiBatch } from './batch.entity';

@Entity('eoi_batch_days')
@Index(['batchId', 'date'], { unique: true }) // prevent duplicate dates
export class EoiBatchDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'varchar' })
  batchId: string;

  @ManyToOne(() => EoiBatch, (batch) => batch.days, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'batch_id' })
  batch: EoiBatch;

  /** YYYY-MM-DD */
  @Column({ name: 'date', type: 'date' })
  date: string;

  /** HH:mm */
  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  /** HH:mm */
  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
