import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { EoiBatch } from './batch.entity';
import { EoiBatchSlot } from './slot.entity';
import { BatchStage, BatchVoucherStatus } from 'src/enums/batch-manager.enums';
import { Booking, VoucherForm } from 'src/entities';

/**
 * Maps a voucher to a specific slot inside a batch.
 * Snapshot fields preserve applicant data
 * at mapping time.
 */
@Entity('eoi_batch_vouchers')
@Index(['voucherId', 'stage'], {
  unique: true,
})
export class EoiBatchVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'batch_id',
    type: 'varchar',
  })
  batchId: string;

  @ManyToOne(() => EoiBatch, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'batch_id' })
  batch: EoiBatch;

  @Column({
    name: 'slot_id',
    type: 'varchar',
  })
  slotId: string;

  @ManyToOne(() => EoiBatchSlot, (slot) => slot.batchVouchers)
  @JoinColumn({ name: 'slot_id' })
  slot: EoiBatchSlot;

  @Column({
    name: 'voucher_id',
    type: 'int',
  })
  voucherId: number;

  @ManyToOne(() => VoucherForm)
  @JoinColumn({ name: 'voucher_id' })
  voucher: VoucherForm;

  /**
   * Business uniqueness scope.
   * Same voucher can participate
   * in different stages.
   */
  @Column({
    type: 'enum',
    enum: BatchStage,
  })
  stage: BatchStage;

  /**
   * Snapshot fields
   */

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  customerName?: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  email?: string;

  @Column({
    name: 'phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phone?: string;

  @CreateDateColumn({
    name: 'assigned_at',
  })
  assignedAt: Date;

  @Column({
    type: 'enum',
    enum: BatchVoucherStatus,
    default: BatchVoucherStatus.MAPPED,
  })
  status: BatchVoucherStatus;

  @Column({ type: 'text', nullable: true, name: 'comments' })
  comments: string;

  @Column({ name: 'head_count', type: 'int', nullable: true })
  headCount?: number;

  @Column({ name: 'checked_in_at', type: 'datetime', nullable: true })
  checkedInAt?: Date;

  @Column({
    name: 'checked_in_by',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  checkedInBy?: string;

  @Column({
    name: 'booked_at',
    type: 'datetime',
    nullable: true,
  })
  bookedAt?: Date;

  @Column({
    name: 'agreement_signed_at',
    type: 'datetime',
    nullable: true,
  })
  agreementSignedAt?: Date;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    name: 'booking_paid_amount',
    default: 0,
  })
  bookingPaidAmount?: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    name: 'voucher_paid_amount',
    default: 0,
  })
  voucherPaidAmount?: number;

  @Column({
    name: 'booking_id',
    type: 'int',
    nullable: true,
  })
  bookingId?: number;

  @OneToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;
}
