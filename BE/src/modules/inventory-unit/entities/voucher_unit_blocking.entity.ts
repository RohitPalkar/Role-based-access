import {
  EoiCampaign,
  Users,
  VoucherForm,
  VoucherUnitMapping,
} from 'src/entities';
import { ProjectInventoryUnit } from './project_inventory_units.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BlockingStatus } from 'src/enums/eoi-form.enums';

@Entity('voucher_unit_blockings')
@Index(['inventoryUnitId', 'status'])
@Index(['voucherId', 'status'])
@Index(['approvalExpiry', 'status'])
export class VoucherUnitBlocking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'int' })
  campaignId: number;

  @ManyToOne(() => EoiCampaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: EoiCampaign;

  @Column({ name: 'inventory_unit_id', type: 'varchar' })
  inventoryUnitId: string;

  @ManyToOne(() => ProjectInventoryUnit)
  @JoinColumn({ name: 'inventory_unit_id' })
  inventoryUnit: ProjectInventoryUnit;

  @Column({ name: 'voucher_id', type: 'int', nullable: true })
  voucherId: number;

  @ManyToOne(() => VoucherForm)
  @JoinColumn({ name: 'voucher_id' })
  voucher: VoucherForm;

  @Column({ name: 'mapping_id', type: 'varchar', nullable: true })
  mappingId?: string;

  @OneToOne(() => VoucherUnitMapping)
  @JoinColumn({ name: 'mapping_id' })
  mapping?: VoucherUnitMapping;

  @Column({ name: 'customer_identifier', type: 'varchar', length: 255 })
  uniqueReferenceId: string;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  amountPaid?: number;

  @Column({ name: 'payment_mode', type: 'varchar', length: 50, nullable: true })
  paymentMode?: string;

  @Column({
    name: 'threshold_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  thresholdAmount: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BlockingStatus,
    default: BlockingStatus.PENDING,
  })
  status: BlockingStatus;

  @Column({ name: 'approval_required', type: 'boolean', default: false })
  approvalRequired: boolean;

  @Column({
    name: 'approval_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  approvalReason?: string;

  @Column({ name: 'unit_block_expiry', type: 'timestamp' })
  unitBlockExpiry: Date;

  @Column({ name: 'approval_expiry', type: 'timestamp', nullable: true })
  approvalExpiry?: Date;

  @Column({ name: 'approve_jti', type: 'varchar', nullable: true })
  approveJti?: string;

  @Column({ name: 'reject_jti', type: 'varchar', nullable: true })
  rejectJti?: string;

  @Column({ name: 'is_token_used', type: 'boolean', default: false })
  isTokenUsed: boolean;

  @Column({ name: 'blocking_initiated_by', type: 'varchar', nullable: true })
  blockingInitiatedBy?: string;

  @OneToOne(() => Users)
  @JoinColumn({ name: 'blocking_initiated_by' })
  blockingRM?: Users;

  @Column({ name: 'released_by', type: 'varchar', nullable: true })
  releasedBy?: string;

  @Column({
    name: 'blocking_initiated_at',
    type: 'timestamp',
    nullable: true,
  })
  blockingInitiatedAt?: Date;

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'approval_source', type: 'varchar', nullable: true })
  approvalSource?: string;

  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason?: string;

  @Column({ name: 'approver_remark', type: 'text', nullable: true })
  approverRemark?: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
