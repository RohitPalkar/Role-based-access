import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { deriveVoucherTransactionIdFromPaymentDetails } from 'src/utils/voucher-payment-transaction-id.util';
import { VoucherForm } from './voucher_form.entity';
import { PaymentTransaction, Users } from 'src/entities';
import { VoucherPaymentType } from 'src/enums/eoi-form.enums';
import {
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { dateTransformer } from 'src/utils/transformers';

@Entity('voucher_payments')
export class VoucherPayment {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => VoucherForm, (voucher) => voucher.payments)
  @JoinColumn({ name: 'voucher_id' })
  voucher: VoucherForm;

  @Column({ name: 'voucher_id' })
  voucherId: number;

  @Column('decimal', { precision: 12, scale: 2, name: 'paid_amount' })
  paidAmount: number;

  @Column({ type: 'enum', enum: PaymentModeEnum, name: 'payment_mode' })
  paymentMode: PaymentModeEnum;

  @ManyToOne(() => PaymentTransaction, { nullable: true })
  @JoinColumn({ name: 'payment_transaction_id' })
  paymentTransaction: PaymentTransaction;

  @Column({ name: 'payment_transaction_id', nullable: true })
  paymentTransactionId: number;

  @Column({
    type: 'timestamp',
    name: 'date',
    transformer: dateTransformer,
  })
  date: Date | null;

  @Column({ type: 'enum', enum: PaymentTxStatusEnum, name: 'status' })
  status: PaymentTxStatusEnum;

  @Column({
    name: 'payment_type',
    type: 'enum',
    enum: VoucherPaymentType,
    default: VoucherPaymentType.CUSTOMER,
  })
  paymentType: VoucherPaymentType;

  @Column({ type: 'json', nullable: true, name: 'payment_details' })
  paymentDetails: any;

  /**
   * Denormalized business transaction reference from `paymentDetails` (transactionNumber,
   * chequeNumber, gatewayPaymentId, …). Enables reliable joins/filters without JSON_EXTRACT.
   * Kept in sync on insert/update via hooks; QueryBuilder inserts must set explicitly.
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'voucher_transaction_id',
  })
  voucherTransactionId: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'realisation_date',
    transformer: dateTransformer,
  })
  realisationDate: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'receipt_no' })
  receiptNo: string;

  @Column({ name: 'receipt_image', nullable: true })
  receiptImage: string;

  @Column({ type: 'text', nullable: true, name: 'comments' })
  comments: string;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy: Users;

  @Column({ type: 'boolean', default: false, name: 'is_unit_mapped' })
  isUnitMapped: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  /**
   * Recomputes `voucherTransactionId` whenever the row is persisted through the entity
   * (`save`, `create`+`save`). Raw `QueryBuilder.insert()` / `upsert()` bypass this — set there too.
   */
  @BeforeInsert()
  @BeforeUpdate()
  private applyVoucherTransactionIdFromPaymentDetails(): void {
    this.voucherTransactionId = deriveVoucherTransactionIdFromPaymentDetails(
      this.paymentDetails,
    );
  }
}
