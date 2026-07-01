import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EoiBatch } from './batch.entity';
import { EoiBatchVoucher } from './batch_voucher.entity';
import { SlotStatusEnum } from 'src/enums/batch-manager.enums';

@Entity('eoi_batch_slots')
@Index(['batchId', 'date', 'sequence'], { unique: true })
export class EoiBatchSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'varchar' })
  batchId: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @ManyToOne(() => EoiBatch, (batch) => batch.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: EoiBatch;

  /** Date of this slot in YYYY-MM-DD format. */
  @Column({ name: 'date', type: 'date' })
  date: string;

  /** 1-based sequence of this slot within the day. Fixed after creation. */
  @Column({ name: 'sequence', type: 'int' })
  sequence: number;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  @Column({ name: 'duration', type: 'int' })
  duration: number;

  @Column({ name: 'filled_count', type: 'int', default: 0 })
  filledCount: number;

  @Column({ name: 'capacity', type: 'int' })
  capacity: number;

  @Column({
    type: 'enum',
    enum: SlotStatusEnum,
    default: SlotStatusEnum.LOCKED,
  })
  status: SlotStatusEnum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => EoiBatchVoucher, (bv) => bv.slot)
  batchVouchers: EoiBatchVoucher[];
}
