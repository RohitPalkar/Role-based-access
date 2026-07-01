import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Users } from 'src/modules/users/entities/user.entity';
import {
  IncentiveDeltaHistory,
  ProjectPhase,
} from '../../../../entities/index';
import {
  PaymentStatusEnum,
  ReraStatusEnum,
  UnitStatusEnum,
} from 'src/enums/booking-list.enums';
import { ProjectStage } from 'src/enums/project-stage.enum';
import { IncentivePolicy } from 'src/entities';

@Entity('incentive_bookings')
export class IncentiveBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, name: 'fy' })
  fy: string;

  @Column({ nullable: true, name: 'entity' })
  entity: string;

  @Column({ type: 'date', nullable: true, name: 'booking_date' })
  bookingDate: Date;

  @Column({ type: 'date', nullable: true, name: 'sap_booking_date' })
  sapBookingDate: Date;

  @Column({ type: 'date', nullable: true, name: 'booking_deadline' })
  bookingDeadline: Date;

  @Column({ nullable: true, name: 'stm_name' })
  stmName: string;

  @Column({ nullable: true, name: 'stm' })
  stm: string;

  @Column({ nullable: true, name: 'stm2' })
  stm2: string;

  @Column({ nullable: true, name: 'stm3' })
  stm3: string;

  @Column({ nullable: true, name: 'vendor' })
  vendor: string;

  @Column({ nullable: true, name: 'customer_code' })
  customerCode: string;

  @Column({ nullable: false, name: 'booking_id' })
  bookingId: string;

  @Column({ nullable: true, name: 'customer_name' })
  customerName: string;

  @Column({ nullable: true, name: 'property_number' })
  propertyNumber: string;

  @Column({ nullable: true, name: 'external_bp_number' })
  externalBPNumber: string;

  @Column({ nullable: true, name: 'sale_type' })
  saleType: string;

  @Column({ type: 'date', nullable: true, name: 'paid_date' })
  paidDate: Date;

  @Column({ type: 'date', nullable: true, name: 'agreement_received_date' })
  agreementReceivedDate: Date;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'gross_total_value',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  grossTotalValue: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'total_received',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  totalReceived: number;

  @Column({ nullable: true, name: 'status' })
  status: string;

  @Column({ type: 'date', nullable: true, name: 'cancellation_date' })
  cancellationDate: Date;

  @Column({ type: 'date', nullable: true, name: 'received_date' })
  receivedDate: Date;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.INELIGIBLE,
    nullable: true,
  })
  paymentStatus: PaymentStatusEnum;

  @Column({
    name: 'rera_status',
    type: 'enum',
    enum: ReraStatusEnum,
    default: ReraStatusEnum.NO,
  })
  ReraNonReraEligibility: ReraStatusEnum;

  @Column('decimal', {
    precision: 10,
    scale: 3,
    default: 0,
    nullable: true,
    name: 'sba',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(3)),
    },
  })
  sbaSold: number;

  @Column('decimal', {
    precision: 10,
    scale: 3,
    default: 0,
    nullable: true,
    name: 'carpet_area',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(3)),
    },
  })
  carpetAreaSold: number;

  @Column({ nullable: true, name: 'sales_office' })
  salesOffice: string;

  @Column('decimal', {
    precision: 6,
    scale: 3,
    default: 0,
    nullable: true,
    name: 'regularization_percentage',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(3)),
    },
  })
  regularizationPercentage: number;

  @Column('decimal', {
    precision: 6,
    scale: 3,
    default: 0,
    nullable: true,
    name: 'payable_percentage',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(3)),
    },
  })
  payablePercentage: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'regularized_amount',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  regularizedAmount: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'payable_amount',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  payableAmount: number;

  @Column('decimal', {
    precision: 15,
    scale: 3,
    default: 0,
    nullable: true,
    name: 'incentive_percentage',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(3)),
    },
  })
  incentivePercentage: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'incentive_amount',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(3)),
    },
  })
  incentiveAmount: number;

  @Column('decimal', {
    precision: 15,
    scale: 3,
    default: 0,
    nullable: true,
    name: 'incentive_delta',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(3)),
    },
  })
  incentiveDelta: number;

  @Column({ type: 'int', default: 1, name: 'split_factor' })
  splitFactor: number;

  @Column('decimal', {
    precision: 15,
    scale: 3,
    default: 0,
    nullable: true,
    name: 'base_incentive_amount',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(3)),
    },
  })
  baseIncentiveAmount: number;

  @Column({ type: 'json', nullable: true, name: 'shared_group_metadata' })
  sharedGroupMetadata: any;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'received_percent',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  receivedPercent: number;

  @Column({
    type: 'enum',
    enum: UnitStatusEnum,
    default: UnitStatusEnum.UNREGULARIZED,
    nullable: true,
    name: 'unit_status',
  })
  unitStatus: UnitStatusEnum;

  @Column({ default: false, name: 'is_deadline_approaching' })
  isDeadlineApproaching: boolean;

  @Column({ default: true, name: 'should_be_calculated' })
  shouldBeCalculated: boolean;

  @Column({ default: false, name: 'is_slab_missing' })
  areSlabsNull: boolean;

  @Column({
    type: 'enum',
    enum: ProjectStage,
    nullable: true,
    name: 'booking_project_type',
  })
  bookingProjectType: ProjectStage;

  @Column({ type: 'date', nullable: true, name: 'payable_received_date' })
  payableReceivedDate: Date;

  @Column({ type: 'date', nullable: true, name: 'disqualified_date' })
  disqualifiedDate: Date;

  @Column({
    type: 'int', // Changed from 'decimal' to 'int'
    name: 'max_qualification_days',
    nullable: false,
  })
  maxQualificationDays: number;

  @Column({ name: 'ineligibility_reason', nullable: true })
  ineligibilityReason: string;

  // ─────────────────────────────────────────
  // Relations
  // ─────────────────────────────────────────

  @ManyToOne(() => ProjectPhase, (projectPhase) => projectPhase.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_phase_id' })
  projectPhase: ProjectPhase;

  @ManyToOne(() => IncentivePolicy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'policy_used_id' })
  policyUsed: IncentivePolicy;

  @ManyToOne(() => Users, (user) => user.incentiveBookings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @OneToMany(() => IncentiveDeltaHistory, (delta) => delta.booking)
  deltas: IncentiveDeltaHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
