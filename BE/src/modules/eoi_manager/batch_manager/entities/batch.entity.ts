import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BatchStage, BatchStatus } from 'src/enums/batch-manager.enums';
import { EoiBatchSlot } from './slot.entity';
import { EoiBatchDay } from './batch_day.entity';
import { EoiBatchVoucher, EoiCampaign } from 'src/entities';

@Entity('eoi_batches')
export class EoiBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'int', nullable: true })
  campaignId?: number;

  @ManyToOne(() => EoiCampaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: EoiCampaign;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'start_date', type: 'datetime', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'datetime', nullable: true })
  endDate?: Date;

  @Column({ name: 'stage', type: 'enum', enum: BatchStage })
  stage: BatchStage;

  @Column({ name: 'residential_status', type: 'varchar', length: 50 })
  residentialStatus: string;

  /** Slot duration in minutes */
  @Column({ name: 'slot_duration', type: 'int' })
  slotDuration: number;

  /** Max vouchers per slot */
  @Column({ name: 'capacity_per_slot', type: 'int' })
  capacityPerSlot: number;

  /** Expected users */
  @Column({ name: 'total_users', type: 'int' })
  totalUsers: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BatchStatus,
    default: BatchStatus.ACTIVE,
  })
  status: BatchStatus;

  @Column({
    name: 'preference_ids',
    type: 'json',
    nullable: true,
  })
  preferenceIds: string[];

  @Column({
    type: 'json',
    nullable: true,
  })
  typology: string[];

  @Column({ name: 'is_user_mapped', type: 'boolean', default: false })
  isUserMapped: boolean;

  @Column({ name: 'notify_at', type: 'datetime', nullable: true })
  notifyAt?: Date;

  @Column({
    name: 'is_notified',
    type: 'boolean',
    default: false,
  })
  isNotified: boolean;

  @Column({
    name: 'open_batch_before',
    type: 'int',
    nullable: true,
  })
  openBatchBefore?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  /** NEW: batch → multiple day configs */
  @OneToMany(() => EoiBatchDay, (day) => day.batch, {
    cascade: true,
  })
  days: EoiBatchDay[];

  @OneToMany(() => EoiBatchSlot, (slot) => slot.batch)
  slots: EoiBatchSlot[];

  @OneToMany(() => EoiBatchVoucher, (batchVoucher) => batchVoucher.batch)
  batchVouchers: EoiBatchVoucher[];
}
