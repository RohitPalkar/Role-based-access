import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VoucherForm } from '../../../eoi_manager/voucher_forms/entities/voucher_form.entity';
import { EoiCampaign } from '../../eoi_campaign/entities/eoi_campaign.entity';
import {
  VoucherChangeEnum,
  VoucherChangeRequestStatus,
} from 'src/enums/eoi-form.enums';
@Entity('voucher_change_requests')
export class VoucherChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VoucherForm, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: VoucherForm;

  @Column({ name: 'voucher_id', nullable: false })
  voucherId: number;

  @ManyToOne(() => EoiCampaign, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: EoiCampaign;

  @Column({ name: 'campaign_id', nullable: false })
  campaignId: number;

  @Column({ name: 'target_prid', nullable: true })
  targetPRID: string;

  @Column({ name: 'target_enquiry_id', nullable: true })
  targetEnquiryId: string;

  @Column({
    name: 'change_source',
    type: 'enum',
    enum: VoucherChangeEnum,
    default: VoucherChangeEnum.NONE,
  })
  changeSource: VoucherChangeEnum;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'current_data', type: 'json', nullable: true })
  currentData: Record<string, any>;

  @Column({ name: 'new_data', type: 'json', nullable: true })
  newData: Record<string, any>;

  @Column({ name: 'swapped_fields', type: 'json', nullable: true })
  swappedFields: string[];

  @Column({
    type: 'varchar',
    length: 50,
    default: VoucherChangeRequestStatus.REQUESTED,
  })
  status: VoucherChangeRequestStatus;

  @Column({ name: 'approval_proof', nullable: true })
  approvalProof: string;

  @Column({ name: 'reviewer_remark', type: 'text', nullable: true })
  reviewerRemark: string;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: number;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', width: 1, default: 0 })
  isDeleted: number;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
