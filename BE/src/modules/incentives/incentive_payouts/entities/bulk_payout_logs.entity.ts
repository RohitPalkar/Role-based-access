import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Users } from 'src/entities';

@Entity('bulk_payout_logs')
export class BulkPayoutLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rm_name', type: 'varchar', length: 100 })
  rMName: string;

  @Column({ name: 'emp_code', type: 'varchar', length: 50 })
  empCode: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: number;

  @Column({ type: 'bigint' })
  vendor: number;

  @Column({ name: 'unit_status', type: 'varchar', length: 50 })
  unitStatus: string;

  @Column({ name: 'payment_status', type: 'varchar', length: 50 })
  paymentStatus: string;

  @Column({ name: 'amount_type', type: 'varchar', length: 50 })
  amountType: string;

  @Column({
    name: 'incentive_payable',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  incentivePayable: number;

  @Column({ name: 'already_paid', type: 'decimal', precision: 12, scale: 2 })
  alreadyPaid: number;

  @Column({ name: 'finance_remarks', type: 'varchar', length: 255 })
  financeRemarks: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string;

  @ManyToOne(() => Users, { nullable: true, eager: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: Users;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
