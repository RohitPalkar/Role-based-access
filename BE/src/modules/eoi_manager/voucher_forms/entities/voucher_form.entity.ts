import {
  ChannelPartner,
  EoiCampaign,
  Users,
  VoucherUnitBlocking,
  VoucherUnitMapping,
} from 'src/entities';
import {
  VoucherFormStatusEnum,
  VoucherFormType,
  VoucherLeadStatus,
  VoucherPaymentStatus,
  VoucherChronologyEnum,
} from '../../../../enums/eoi-form.enums';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { VoucherPayment } from './voucher_payments.entity';

export interface VoucherDeletionRemarks {
  deletionReason?: string | null;
  restoreReason?: string | null;
}

@Entity('vouchers')
export class VoucherForm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campaign_id', type: 'int', nullable: true })
  campaignId?: number;

  @Column({ name: 'voucher_id', unique: true })
  voucherId: string;

  @Column({ name: 'resident_status', nullable: true })
  residentStatus?: string;

  @Column({ name: 'unique_reference_id', nullable: true })
  uniqueReferenceId: string;

  @Column({ name: 'user_voucher_tracking_id', nullable: true })
  userVoucherTrackingId: string;

  @Column({ name: 'sfdc_enquiry_id', nullable: true })
  sfdcEnquiryId: string;

  @Column({ name: 'sfdc_lead_status', nullable: true })
  sfdcLeadStatus: string;

  @Column({ name: 'no_of_applicants', default: 1 })
  noOfApplicants: number;

  @Column({ name: 'is_agreed_on_terms', default: false })
  isAgreedOnTerms: boolean;

  @Column({ name: 'last_step', nullable: false, default: 0 })
  lastStep: number;

  @Column({ name: 'primary_source', nullable: true })
  primarySource: string;

  @Column({ name: 'secondary_source', nullable: true })
  secondarySource: string;

  @Column({ name: 'tertiary_source', nullable: true })
  tertiarySource: string;

  // Storing multiple applicants' details as JSON
  @Column({ name: 'applicant1', type: 'json', nullable: true })
  applicant1: Record<string, any>;

  @Column({ name: 'applicant2', type: 'json', nullable: true })
  applicant2: Record<string, any>;

  @Column({ name: 'applicant3', type: 'json', nullable: true })
  applicant3: Record<string, any>;

  @Column({ name: 'applicant4', type: 'json', nullable: true })
  applicant4: Record<string, any>;

  // Storing payment details as JSON
  @Column({ name: 'payment_details', type: 'json', nullable: true })
  paymentDetails: Record<string, any>;

  // Storing unit details as JSON
  @Column({ name: 'unit_details', type: 'json', nullable: true })
  unitDetails: Record<string, any>;

  // Storing other details as JSON
  @Column({ name: 'source_details', type: 'json', nullable: true })
  sourceDetails: Record<string, any>;

  // Storing eoi details as JSON
  @Column({ name: 'eoi_details', type: 'json', nullable: true })
  eoiDetails: Record<string, any>;

  @ManyToOne(() => EoiCampaign, (campaign) => campaign.voucherForms, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: EoiCampaign;

  @OneToOne(() => VoucherUnitMapping, (unitMapping) => unitMapping.voucher)
  mappedUnit: VoucherUnitMapping;

  @OneToMany(() => VoucherUnitBlocking, (b) => b.voucher)
  blockings: VoucherUnitBlocking[];

  @Column({
    name: 'voucher_status',
    default: VoucherFormStatusEnum.IN_PROGRESS,
  })
  voucherFormStatus: VoucherFormStatusEnum;

  @Column({
    name: 'form_phase',
    default: VoucherFormType.VOUCHER,
  })
  formPhase: VoucherFormType;

  @Column({
    name: 'is_deleted',
    type: 'boolean',
    default: false,
  })
  isDeleted: boolean;

  @Column({
    name: 'deletion_remarks',
    type: 'json',
    nullable: true,
  })
  deletionRemarks?: VoucherDeletionRemarks | null;

  @Column({ name: 'payment_status', default: VoucherPaymentStatus.PENDING })
  paymentStatus: VoucherPaymentStatus;

  @Column({ name: 'lead_status', default: VoucherLeadStatus.NEW })
  leadStatus: VoucherLeadStatus;

  @Column({ name: 'finance_status', nullable: true })
  financeStatus: string;

  @Column({ name: 'booking_status', nullable: true })
  bookingStatus: string;

  @Column({ name: 'queue_id', nullable: true })
  queueId: string;

  @Column({ name: 'paid_voucher_id', nullable: true })
  paidVoucherId: string;

  @Column({ name: 'std_eoi_id', nullable: true })
  stdEoiId: string;

  @Column({ name: 'pre_eoi_id', nullable: true })
  preEoiId: string;

  @Column({ name: 'voucher_sequence_id', nullable: true })
  voucherSequenceId: string;

  @Column({ name: 'standard_sequence_id', nullable: true })
  standardSequenceId: string;

  @Column({ name: 'preferential_sequence_id', nullable: true })
  preferentialSequenceId: string;

  @Column({
    name: 'activated_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  activatedAt: Date | null;

  @Column({
    name: 'voucher_issued_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  voucherIssuedAt: Date | null;

  @Column({
    name: 'std_eoi_issued_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  stdEoiIssuedAt: Date | null;

  @Column({
    name: 'pre_eoi_issued_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  preEoiIssuedAt: Date | null;

  @Column({
    name: 'voucher_queue_issued_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  voucherQueueIssuedAt: Date | null;

  @Column({
    name: 'eoi_queue_issued_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  eoiQueueIssuedAt: Date | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: Users;

  @ManyToOne(() => Users, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closing_rm_id' })
  closingRm: Users;

  @Column({ name: 'cp_link_id', nullable: true })
  cpLinkId: number;

  @ManyToOne(() => ChannelPartner, { nullable: true })
  @JoinColumn({ name: 'cp_link_id' })
  channelPartner?: ChannelPartner;

  @Column({
    name: 'chronology',
    type: 'varchar',
    length: 10,
    default: VoucherChronologyEnum.V,
  })
  chronology: VoucherChronologyEnum;

  @Column({
    name: 'cancel_reason',
    type: 'json',
    nullable: true,
  })
  cancelReason?: Record<string, any>;

  @Column({
    name: 'checker_remarks',
    type: 'json',
    nullable: true,
  })
  checkerRemarks?: Record<string, any>;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'cancelled_by' })
  cancelledBy: Users;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({
    name: 'cancelled_from',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: null,
  })
  cancelledFrom: VoucherFormStatusEnum | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'mis_checker' })
  misChecker: Users;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'crm_checker' })
  crmChecker: Users;

  @Column({ name: 'checked_at', type: 'timestamp', nullable: true })
  checkedAt: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({
    name: 'convert_remarks',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  convertRemarks?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({
    name: 'customer_last_updated_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  customerLastUpdatedAt: Date | null;

  @Column({
    name: 'is_applicants_updated',
    type: 'boolean',
    default: false,
  })
  isApplicantsUpdated: boolean;

  @Column({
    name: 'applicants_updated_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  applicantsUpdatedAt: Date | null;

  @OneToMany(() => VoucherPayment, (payment) => payment.voucher, {
    cascade: true,
  })
  payments: VoucherPayment[];

  @Column({
    name: 'is_lead_created',
    type: 'boolean',
    default: false,
  })
  isLeadCreated: boolean;

  @Column({
    name: 'sfdc_push_attempted',
    type: 'boolean',
    default: false,
  })
  sfdcPushAttempted: boolean;

  @Column({
    name: 'opportunity_id',
    nullable: true,
  })
  opportunityId: string;

  @Column({ name: 'sfdc_synced_at', type: 'timestamp', nullable: true })
  sfdcSyncedAt: Date | null;

  @Column({
    name: 'is_change_request_pending',
    type: 'boolean',
    default: false,
  })
  isChangeRequestPending: boolean;

  @Column({ name: 'refund_documents', type: 'json', nullable: true })
  refundDocuments: Record<string, any>;
}
