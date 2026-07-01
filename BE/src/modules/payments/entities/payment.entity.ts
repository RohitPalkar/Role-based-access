import {
  PaymentGatewayEnum,
  RazorpayTxStatusEnum,
} from 'src/enums/payment-status.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['gatewayName', 'gatewayPaymentId'], { unique: true })
@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  // What this payment is for
  @Column({ length: 50 })
  entityType: string; // e.g. 'booking', 'voucher', 'eoi'

  @Column()
  entityId: number; // ID from the related table

  // Internal & Gateway identifiers
  @Index()
  @Column({ length: 100, nullable: false })
  orderId: string; // Internal order reference

  @Column({ length: 100, nullable: true })
  gatewayOrderId?: string;

  @Column({ length: 100, nullable: true })
  gatewayPaymentId?: string;

  @Column({ length: 100, nullable: true })
  gatewaySignature?: string;

  @Column({ length: 50, nullable: true })
  method?: string;

  // Money
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'INR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: RazorpayTxStatusEnum,
    default: 'pending',
  })
  status: RazorpayTxStatusEnum;

  @Column({ type: 'enum', enum: PaymentGatewayEnum })
  gatewayName: PaymentGatewayEnum; // e.g. 'razorpay'

  @Column()
  projectId?: number;

  // Raw gateway data
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // notes
  @Column({ type: 'json', nullable: true })
  notes?: Record<string, any>;

  @Column({ nullable: true })
  userId?: number; // FK to user

  @Column({ name: 'paid_at', type: 'datetime', precision: 3, nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
