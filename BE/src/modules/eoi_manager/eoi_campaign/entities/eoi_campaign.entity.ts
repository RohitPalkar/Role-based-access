import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  DeleteDateColumn,
} from 'typeorm';
import { VoucherForm } from '../../../eoi_manager/voucher_forms/entities/voucher_form.entity';
import {
  VoucherFormType,
  EoiFormType,
  EOITypeEnum,
  CampaignStatusEnum,
  EoiCampaignStageType,
  DisplayUnitType,
} from 'src/enums/eoi-form.enums';
import {
  Brands,
  CityMaster,
  InventoryType,
  DevelopmentType,
  Projects,
  Users,
} from 'src/entities';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';

@Entity('eoi_campaigns')
export class EoiCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campaign_name' })
  campaignName: string;

  @Column({ name: 'enquiry_initials' })
  enquiryInitials: string;

  @Column({ name: 'voucher_id_initials', nullable: true })
  voucherIdInitials: string;

  @Column({ name: 'std_eoi_initials', nullable: true })
  stdEoiInitials: string;

  @Column({ name: 'pre_eoi_initials', nullable: true })
  preEoiInitials: string;

  @Column({ name: 'voucher_start_date', type: 'timestamp', nullable: true })
  voucherStartDate: Date | null;

  @Column({ name: 'voucher_end_date', type: 'timestamp', nullable: true })
  voucherEndDate: Date | null;

  @Column({ name: 'vqi_counter', default: 0 })
  vqiCounter: number;

  @Column({ name: 'std_counter', default: 0 })
  stdCounter: number;

  @Column({ name: 'pre_counter', default: 0 })
  preCounter: number;

  @Column({ name: 'enquiry_counter', default: 0 })
  enquiryCounter: number;

  @Column({ name: 'voucher_id_counter', default: 0 })
  voucherIdCounter: number;

  @Column({ name: 'std_eoi_counter', default: 0 })
  stdEoiCounter: number;

  @Column({ name: 'pre_eoi_counter', default: 0 })
  preEoiCounter: number;

  @OneToMany(() => VoucherForm, (voucherForm) => voucherForm.campaign)
  voucherForms: VoucherForm[];

  @Column({
    name: 'stage',
    type: 'enum',
    enum: EoiCampaignStageType,
    default: EoiCampaignStageType.PRE_FILL,
  })
  stage: EoiCampaignStageType;

  @Column({
    name: 'phase',
    type: 'json',
    nullable: false,
  })
  phase: VoucherFormType[];

  @ManyToOne(() => Brands, { nullable: false })
  @JoinColumn({ name: 'brand_id' })
  brand: Brands;

  @ManyToMany(() => CityMaster)
  @JoinTable({
    name: 'eoi_campaign_cities',
    joinColumn: { name: 'campaign_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'city_id', referencedColumnName: 'id' },
  })
  cities: CityMaster[];

  @Column({ name: 'push_to_sfdc', type: 'boolean', default: false })
  pushToSfdc: boolean;

  @Column({ name: 'sfdc_project_name', nullable: true })
  sfdcProjectName: string;

  @ManyToMany(() => DevelopmentType)
  @JoinTable({
    name: 'eoi_campaign_development_types',
    joinColumn: { name: 'campaign_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'development_type_id',
      referencedColumnName: 'id',
    },
  })
  developmentTypes: DevelopmentType[];

  @ManyToMany(() => InventoryType)
  @JoinTable({
    name: 'eoi_campaign_inventory_types',
    joinColumn: { name: 'campaign_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'inventory_type_id',
      referencedColumnName: 'id',
    },
  })
  inventoryTypes: InventoryType[];

  @Column({ name: 'indicative_base_price', nullable: true })
  indicativeBasePrice: string;

  @Column({ name: 'inventory_details', type: 'json', nullable: true })
  inventoryDetails: {
    type: string;
    minSBA?: number;
    maxSBA?: number;
    minPrice?: number;
    maxPrice?: number;
    voucherAmt?: number;
    standardEOIAmt?: number;
    preferentialEOIAmt?: number;
  }[];

  @Column({ name: 'account_details', type: 'json', nullable: true })
  accountDetails: {
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    swiftCode?: string;
  };

  @Column({ name: 'voucher_form_type', type: 'enum', enum: EoiFormType })
  voucherFormType: EoiFormType;

  @Column({ name: 'eoi_form_type', type: 'enum', enum: EoiFormType })
  eoiFormType: EoiFormType;

  @Column({
    name: 'voucher_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  voucherAmount: number;

  @Column({ name: 'voucher_terms_and_condition', type: 'text', nullable: true })
  voucherTermsAndCondition: string;

  @Column({ name: 'eoi_terms_and_condition', type: 'text', nullable: true })
  eoiTermsAndCondition: string;

  @Column({ name: 'unit_pref_static_content', type: 'text', nullable: true })
  unitPrefStaticContent: string;

  @Column({ name: 'is_inventory_mapped', type: 'boolean', default: false })
  isInventoryMapped: boolean;

  @Column({ name: 'unit_source_type', length: 15, nullable: true })
  unitSourceType: string | null;

  @Column({ name: 'voucher_amount_type', length: 15, nullable: true })
  voucherAmountType: string | null;

  @Column({ name: 'std_eoi_amount_type', length: 15, nullable: true })
  stdEoiAmountType: string | null;

  @Column({ name: 'pre_eoi_amount_type', length: 15, nullable: true })
  preEoiAmountType: string | null;

  @Column({ name: 'eoi_start_date', type: 'timestamp', nullable: true })
  eoiStartDate: Date | null;

  @Column({ name: 'eoi_end_date', type: 'timestamp', nullable: true })
  eoiEndDate: Date | null;

  @Column({
    name: 'eoi_type',
    type: 'json',
    nullable: true,
  })
  eoiType: EOITypeEnum[];

  @Column({
    name: 'std_eoi_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  stdEoiAmount: number;

  @Column({
    name: 'pre_eoi_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  preEoiAmount: number;

  @Column({
    name: 'threshold_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  thresholdAmount: number;

  @Column({
    name: 'unit_block_duration',
    type: 'int',
    nullable: true,
    default: 10,
  })
  unitBlockDuration: number;

  @Column({
    name: 'timer_extension',
    type: 'int',
    nullable: true,
    default: 5,
  })
  timerExtension: number;

  @Column({
    name: 'approval_window_hours',
    type: 'int',
    nullable: true,
    default: 12,
  })
  approvalWindowHours: number;

  @Column({ name: 'unit_approver_id', nullable: true })
  unitApproverId: number;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'unit_approver_id' })
  unitApprover?: Users;

  @Column({
    name: 'additional_approvers',
    type: 'json',
    nullable: true,
  })
  additionalApprovers: number[];

  @Column({
    name: 'display_unit_type',
    type: 'enum',
    enum: DisplayUnitType,
    nullable: true,
  })
  displayUnitType?: DisplayUnitType;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CampaignStatusEnum,
    default: CampaignStatusEnum.ACTIVE_VOUCHER,
  })
  status: CampaignStatusEnum;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;

  @ManyToOne(() => Projects, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Projects;

  @Column({ name: 'sub_merchant_id', nullable: true })
  subMerchantId: string;

  @Column({ name: 'easebuzz_key', nullable: true })
  easebuzzKey: string;

  @Column({ name: 'easebuzz_salt', nullable: true })
  easebuzzSalt: string;

  @Column({ name: 'razorpay_key', nullable: true })
  razorpayKey: string;

  @Column({ name: 'razorpay_secret', nullable: true })
  razorpaySecret: string;

  @Column({
    name: 'available_gateways',
    type: 'json',
    nullable: false,
  })
  availableGateways: PaymentGatewayEnum[];

  @Column({ name: 'queue_after_verified', type: 'boolean', default: false })
  queueAfterVerified: boolean;

  @Column({ name: 'display_queue_id' })
  displayQueueId: string;

  @Column({ name: 'enable_eois_all_rms', type: 'boolean', default: false })
  enableEOIsAllRms: boolean;

  @Column({ name: 'venue_name', nullable: true })
  venueName: string;

  @Column({ name: 'venue_map_link', type: 'text', nullable: true })
  venueMapLink: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy: number;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deletedByUser?: Users;

  @Column({ name: 'send_daily_report', default: false })
  sendDailyReport: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'boolean', name: 'show_agreement_value', default: false })
  showAgreementValue?: boolean;

  @Column({ name: 'agreement_doc_link', type: 'text', nullable: true })
  agreementDocLink: string;
}
