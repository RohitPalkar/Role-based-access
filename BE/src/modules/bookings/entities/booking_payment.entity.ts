import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking, PaymentTransaction } from 'src/entities';
import {
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';

@Entity('booking_payments')
export class BookingPayment {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => Booking, (booking) => booking.payments)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => PaymentTransaction, { nullable: true })
  @JoinColumn({ name: 'payment_transaction_id' })
  paymentTransaction: PaymentTransaction;

  @Column({ nullable: true, name: 'payment_transaction_id' })
  paymentTransactionId: number;

  @Column('decimal', { precision: 12, scale: 2, name: 'paid_amount' })
  paidAmount: number;

  @Column({ type: 'enum', enum: PaymentModeEnum, name: 'payment_mode' })
  paymentMode: PaymentModeEnum;

  @Column({ type: 'timestamp', name: 'payment_date' })
  paymentDate: Date;

  @Column({ type: 'enum', enum: PaymentTxStatusEnum, name: 'status' })
  status: PaymentTxStatusEnum;

  @Column({ type: 'json', nullable: true, name: 'payment_details' })
  paymentDetails: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
