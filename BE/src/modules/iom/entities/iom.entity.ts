import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IomStatus } from './iom-status.entity';
import {
  IncentiveBooking,
  Projects,
  Users,
  IomInvoiceDetails,
} from '../../../entities/index';
import { LoyaltyPointsReleaseTypeEnum } from '../enums/iom.enums';

@Entity('ioms')
@Index('uq_ioms_active_booking', ['bookingId', 'isActive'], { unique: true })
export class Iom {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({
    name: 'iom_no',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'System generated IOM number (eg: IOM_20240611_123)',
  })
  iomNo: string | null;

  @Column({ name: 'booking_id', type: 'int' })
  bookingId: number;

  @ManyToOne(() => IncentiveBooking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: IncentiveBooking;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId: number | null;

  @ManyToOne(() => Projects, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project: Projects | null;

  // --- Financials -----------------------------------------------------------
  @Column('decimal', {
    name: 'sale_price',
    precision: 15,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(parseFloat(v).toFixed(2)),
    },
  })
  salePrice: number;

  @Column({ name: 'sale_price_edited', type: 'boolean', default: false })
  salePriceEdited: boolean;

  @Column({ name: 'sale_price_edited_at', type: 'timestamp', nullable: true })
  salePriceEditedAt: Date | null;

  @Column({ name: 'sale_price_edited_by', type: 'bigint', nullable: true })
  salePriceEditedBy: number | null;

  @Column({ name: 'total_brokerage_amount', type: 'float' })
  totalBrokerageAmount: number;

  @Column({
    name: 'brokerage_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  brokeragePercentage: number;

  @Column({
    name: 'payment_15_percent_received_at',
    type: 'datetime',
    nullable: true,
    comment:
      'Date when 15% payment of sale value was received and IOM became eligible',
  })
  thresholdPaymentReceivedAt: Date | null;

  // --- Customer & Referrer --------------------------------------------------
  @Column({ name: 'customer_mobile', type: 'varchar', length: 20 })
  customerMobile: string;

  @Column({ name: 'customer_details', type: 'json', nullable: true })
  customerDetails: Record<string, unknown> | null;

  @Column({
    name: 'referrer_mobile',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  referrerMobile: string | null;

  @Column({ name: 'referrer_details', type: 'json', nullable: true })
  referrerDetails: Record<string, unknown> | null;

  // --- Referral split -------------------------------------------------------
  @Column({ name: 'referral_split_type', type: 'varchar', length: 30 })
  referralSplitType: string;

  @Column({ name: 'referral_split_ratio', type: 'json', nullable: true })
  referralSplitRatio: Record<string, unknown> | null;

  @Column({ name: 'referrer_ratio', type: 'float', nullable: true })
  referrerRatio: number | null;

  @Column({ name: 'referee_ratio', type: 'float', nullable: true })
  refereeRatio: number | null;

  // --- Calculated allocation ------------------------------------------------
  @Column({ name: 'referrer_points', type: 'float' })
  referrerPoints: number;

  @Column({ name: 'referee_points', type: 'float' })
  refereePoints: number;

  @Column({
    name: 'loyalty_points_release_type',
    type: 'enum',
    enum: LoyaltyPointsReleaseTypeEnum,
    nullable: true,
  })
  loyaltyPointClassification: string | null;

  /**
   * CRM-editable signed adjustment applied on top of the calculated
   * referrer/referee points. Positive or negative. Recorded for audit
   * and consumed by downstream loyalty allocation.
   */
  @Column({
    name: 'referral_points_adjustment',
    type: 'float',
    nullable: true,
    default: 0,
  })
  referralPointsAdjustment: number | null;

  // --- Loyalty execution ----------------------------------------------------
  @Column({ name: 'referrer_points_released', type: 'float', nullable: true })
  referrerPointsReleased: number | null;

  @Column({ name: 'referee_points_released', type: 'float', nullable: true })
  refereePointsReleased: number | null;

  @Column({ name: 'referral_points_edited', type: 'boolean', default: false })
  referralPointsEdited: boolean;

  @Column({
    name: 'referral_points_edited_at',
    type: 'timestamp',
    nullable: true,
  })
  referralPointsEditedAt: Date | null;

  @Column({ name: 'referral_points_edited_by', type: 'bigint', nullable: true })
  referralPointsEditedBy: number | null;

  @Column({
    name: 'referral_points_edit_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  referralPointsEditReason: string | null;

  @Column({ name: 'referral_classification', type: 'varchar', length: 50 })
  referralClassification: string;

  @Column({ name: 'loyalty_details', type: 'json', nullable: true })
  loyaltyDetails: Record<string, unknown> | null;

  // --- Invoice (Finance side) ----------------------------------------------
  @Column({ name: 'invoice_id', type: 'bigint', nullable: true })
  invoiceId: number | null;

  @ManyToOne(() => IomInvoiceDetails, { nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice: IomInvoiceDetails | null;

  // --- Status / Workflow ----------------------------------------------------
  @Column({ name: 'status_id', type: 'bigint' })
  statusId: number;

  @ManyToOne(() => IomStatus, { eager: false })
  @JoinColumn({ name: 'status_id' })
  status: IomStatus;

  @Column({ name: 'assigned_to', type: 'int', nullable: true })
  assignedTo: number | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee?: Users;

  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  rejectionReason: string | null;

  // --- Actor audit (set by downstream services, not by CRM scope) -----------
  @Column({ name: 'crm_verified_by', type: 'bigint', nullable: true })
  crmVerifiedBy: number | null;

  @Column({ name: 'crm_approved_by', type: 'bigint', nullable: true })
  crmApprovedBy: number | null;

  @Column({ name: 'finance_verified_by', type: 'bigint', nullable: true })
  financeVerifiedBy: number | null;

  @Column({ name: 'finance_approved_by', type: 'bigint', nullable: true })
  financeApprovedBy: number | null;

  @Column({ name: 'points_allotted_by', type: 'bigint', nullable: true })
  pointsAllottedBy: number | null;

  @Column({ name: 'crm_verified_at', type: 'timestamp', nullable: true })
  crmVerifiedAt: Date | null;

  @Column({ name: 'crm_approved_at', type: 'timestamp', nullable: true })
  crmApprovedAt: Date | null;

  @Column({ name: 'finance_verified_at', type: 'timestamp', nullable: true })
  financeVerifiedAt: Date | null;

  @Column({ name: 'finance_approved_at', type: 'timestamp', nullable: true })
  financeApprovedAt: Date | null;

  @Column({ name: 'points_allotted_at', type: 'timestamp', nullable: true })
  pointsAllottedAt: Date | null;

  // --- Output --------------------------------------------------------------
  @Column({ name: 'iom_pdf', type: 'varchar', length: 255, nullable: true })
  iomPdf: string | null;

  // --- Identity / lifecycle ------------------------------------------------
  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: number;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  /**
   * MySQL generated column: 1 when not soft-deleted, NULL when deleted.
   * Used purely as the second member of the composite UNIQUE
   * `(booking_id, is_active)` to give DB-level dedup. Read-only.
   */
  @Column({
    name: 'is_active',
    type: 'tinyint',
    nullable: true,
    select: false,
    insert: false,
    update: false,
  })
  isActive: number | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Users;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'crm_verified_by' })
  crmVerifier?: Users;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'crm_approved_by' })
  crmApprover?: Users;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'finance_verified_by' })
  finVerifier?: Users;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'finance_approved_by' })
  finApprover?: Users;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'points_allotted_by' })
  pointsUser?: Users;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'referral_points_edited_by' })
  referralPointsEditor?: Users;

  /**
   * Optimistic-lock counter. TypeORM increments it automatically when
   * the entity is saved via the repository's standard `save` /
   * `update` flow on entities loaded via `findOne`. For direct `update`
   * calls we manage `version` explicitly (see IomCrmService.editIom).
   */
  @VersionColumn({ default: 0 })
  version: number;

  // --- Sales / Source --------------------------------------------------------
  @Column({ name: 'source_in_sales_force', type: 'varchar' })
  sourceInSalesForce: string;

  // --- Agreement -------------------------------------------------------------
  @Column({ name: 'agreement_date', type: 'date', nullable: true })
  agreementDate: Date | null;

  // --- Payout flags ----------------------------------------------------------
  @Column({ name: 'referrer_paid', type: 'bigint', default: 0 })
  referrerPaid: number;

  @Column({ name: 'referee_paid', type: 'bigint', default: 0 })
  refereePaid: number;

  // --- Brokerage edit audit --------------------------------------------------
  // Unlike `sale_price` and `referral_points`, the brokerage edit
  // audit has no dedicated boolean flag column in `ioms` - the FK
  // `brokerage_percentage_edited_by` IS the edit indicator
  // (NULL = never edited, non-NULL = edited by that user). The
  // service writes `_by` + `_at` together so the two stay consistent.
  @Column({
    name: 'brokerage_percentage_edited_by',
    type: 'bigint',
    nullable: true,
  })
  brokeragePercentageEditedBy: number | null;

  @Column({
    name: 'brokerage_percentage_edited_at',
    type: 'timestamp',
    nullable: true,
  })
  brokeragePercentageEditedAt: Date | null;

  // --- Business partner / unit info -----------------------------------------
  @Column({ name: 'bp_code', type: 'varchar', length: 50, nullable: true })
  bpCode: string | null;

  @Column({ name: 'unit_number', type: 'varchar', length: 50, nullable: true })
  unitNumber: string | null;

  @Column({ name: 'brokerage_adj_non_loyalty' })
  brokerageAdjNonLoyalty: number;

  // --- Pinelab customer linkage (persisted IDs only; verification flags are runtime) ---
  @Column({
    name: 'referee_pinelab_customer_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  refereePinelabCustomerId: string | null;

  @Column({
    name: 'referrer_pinelab_customer_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referrerPinelabCustomerId: string | null;
  @Column({ name: 'original_payment_details', type: 'json', nullable: true })
  originalPaymentDetails: object | null;
  @Column({
    name: 'sales_order_id',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  salesOrderId: string | null;
}
