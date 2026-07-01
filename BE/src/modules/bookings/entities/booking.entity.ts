import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { BookingFormStatusEnum } from '../../../enums/booking-form-status.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingPayment } from './booking_payment.entity';
import { EoiCampaign, Projects, Users } from 'src/entities';
import { VoucherForm } from '../../eoi_manager/voucher_forms/entities/voucher_form.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  opportunityId: string;

  @Column({ nullable: true })
  enquiryId: string;

  @Column({ name: 'brand_id', nullable: true })
  brandId: number;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;

  @Column()
  noOfApplicants: number;

  @Column()
  fillingAs: number;

  @Column({ nullable: true })
  relationBtApplicants: string;

  @Column({ nullable: true })
  lastStep: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  isEOIBooking: boolean;

  @Column({ name: 'is_agreed_on_terms', default: false })
  isAgreedOnTerms: boolean;

  @Column({ nullable: true })
  rating: number;

  @Column({ nullable: true })
  feedback: string;

  // Storing multiple applicants' details as JSON
  @Column({ type: 'json', nullable: true })
  applicant1: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  applicant2: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  applicant3: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  applicant4: Record<string, any>;

  // Storing payment details as JSON
  @Column({ type: 'json', nullable: true })
  paymentDetails: Record<string, any>;

  // Storing unit details as JSON
  @Column({ type: 'json', nullable: true })
  unitDetails: Record<string, any>;

  // Storing other details as JSON
  @Column({ type: 'json', nullable: true })
  otherDetails: Record<string, any>;

  // Storing referrer details as JSON
  @Column({ type: 'json', nullable: true })
  referrerDetails: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  leegalityData: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  stepsCompleted: Record<string, any>;

  @Column({ nullable: true })
  unsignedPdf: string;

  @Column({ nullable: true })
  signedPdf: string;

  @Column({ nullable: true })
  mergedPdf: string;

  @Column({ nullable: true })
  officeUsePdf: string;

  @Column({ nullable: true })
  documentsNote: string;

  @Column({ default: BookingFormStatusEnum.IN_PROGRESS })
  bookingFormStatus: BookingFormStatusEnum;

  @Column({ name: 'primary_source_disabled', default: false })
  primarySourceDisabled: boolean;

  @Column({ type: 'timestamp', nullable: true, default: null })
  formFilledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  formSignedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modifiedAt: Date;

  @Column({
    name: 'booking_as',
    type: 'enum',
    enum: BookingAsEnum,
    default: BookingAsEnum.INDIVIDUAL,
  })
  bookingAs: BookingAsEnum;

  @Column({ name: 'company_details', type: 'json', nullable: true })
  companyDetails: {
    gstNumber?: string;
    companyName?: string;
    companyPan?: string;
    companyAddress?: string;
    documents?: Record<string, any>;
  } | null;

  @OneToMany(() => BookingPayment, (payment) => payment.booking, {
    cascade: true,
  })
  payments: BookingPayment[];

  @ManyToOne(() => Users, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closing_rm_id' })
  closingRm: Users;

  @Column({ name: 'groupId', type: 'char', length: 36, nullable: true })
  groupId: string;

  @ManyToOne(() => VoucherForm, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: VoucherForm;

  @Column({ name: 'voucher_id', nullable: true })
  voucherId: number;

  @ManyToOne(() => EoiCampaign, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: EoiCampaign;

  @Column({ name: 'campaign_id', nullable: true })
  campaignId: number;

  @Column({ name: 'is_nine_percent_agreement', default: false })
  isNinePercentAgreement: boolean;

  @ManyToOne(() => Projects)
  @JoinColumn({ name: 'project_id' })
  project: Projects;
}
