import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('site_visit_form')
export class SiteVisitForm {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'project_id', type: 'bigint' })
  projectId: number;

  @Column({ name: 'mobile', type: 'varchar', length: 50 })
  mobile: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'residential_address', type: 'text' })
  residentialAddress: string;

  @Column({
    name: 'occupation',
    type: 'varchar',
    length: 255,
  })
  occupation: string;

  @Column({
    name: 'company_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  organizationName: string | null;

  @Column({
    name: 'designation',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  designation: string;

  @Column({
    name: 'current_accommodation',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  currentAccommodation: string | null;

  @Column({ name: 'owned_house_count', type: 'varchar', nullable: true })
  ownedHouseCount: string | null;

  @Column({
    name: 'purchase_duration',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  purchaseDuration: string;

  @Column({
    name: 'finance_source',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  financeSource: string;

  @Column({
    name: 'residential_status',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  residentialStatus: string;

  @Column({
    name: 'gender',
    type: 'varchar',
    length: 255,
  })
  gender: string;

  @Column({
    name: 'marital_status',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  maritalStatus: string | null;

  @Column({
    name: 'inventory_options',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  inventoryOptions: string;

  @Column({ name: 'company_address', type: 'text', nullable: true })
  organizationAddress: string;

  @Column({
    name: 'purchase_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  purchaseReason: string;

  @Column({ name: 'price_range', type: 'varchar', length: 255 })
  priceRange: string;

  @Column({
    name: 'current_residence_type',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  currentResidenceType: string;

  @Column({
    name: 'alternate_mobile',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  alternateMobile: string | null;

  @Column({ name: 'assigned_rm', type: 'varchar', nullable: true })
  assignedRM: string | null;

  @Column({ name: 'assigned_GRE', type: 'bigint', nullable: true })
  assignedGRE: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'enquiry_id', type: 'bigint', nullable: true })
  enquiryId: number;

  @Column({ name: 'visit_count', type: 'int', nullable: true })
  visitCount: number;

  @Column({
    name: 'project_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  projectName: string;

  @Column({
    name: 'primary_source',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  primarySource: string;

  @Column({
    name: 'channel_partner',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  channelPartner: string;

  @Column({ name: 'referred_by', type: 'varchar', length: 255, nullable: true })
  referredBy: string;

  @Column({
    name: 'ex_project_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  exProjectName: string;

  @Column({ name: 'unit_number', type: 'varchar', length: 255, nullable: true })
  unitNumber: string;

  @Column({ name: 'head_count', type: 'int', default: 1 })
  headCount: number;

  @Column({ name: 'exit_time', type: 'varchar', length: 45, nullable: true })
  exitTime: string;

  @Column({ name: 'status', type: 'varchar', length: 255, default: 'Pending' })
  status: string;

  @Column({ name: 'sourcing_rm', type: 'varchar', length: 255, nullable: true })
  sourcingRm: string;

  @Column({
    name: 'sourcing_rm_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sourcingRmName: string;

  @Column({
    name: 'assigned_rm_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  assignedRmName: string;

  @Column({ name: 'visit_type', type: 'varchar', length: 45, default: 'SV' })
  visitType: string;
}
