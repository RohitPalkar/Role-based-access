import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  DeleteDateColumn,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Brands } from '../../brands/entities/brand.entity';
import { Boosters, Users, ProjectPhase } from '../../../../entities/index';
import { CityMaster } from 'src/modules/masters/citymaster/entities/cityMaster.entity';
import { CompanyMaster } from 'src/modules/masters/company_master/entities/company_master.entity';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';

@Entity('projects')
export class Projects {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    name: 'rera_regularization',
    nullable: true,
  })
  reraRegularization: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    name: 'rera_payable',
    nullable: true,
  })
  reraPayable: number;

  @Column({
    name: 'buddy_rms',
    nullable: true,
    type: 'json',
  })
  buddyRMs?: number[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    name: 'rtm_regularization',
    nullable: true,
  })
  rtmRegularization: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    name: 'rtm_payable',
    nullable: true,
  })
  rtmPayable: number;

  @Column({
    type: 'int', // Changed from 'decimal' to 'int'
    name: 'max_qualification_days',
    nullable: false,
  })
  maxQualificationDays: number;

  @Column({
    name: 'max_qualification_effective_from',
    type: 'date',
    nullable: true,
  })
  maxQualificationEffectiveFrom: Date | null;

  @ManyToOne(() => CityMaster, (city) => city.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city: CityMaster;

  @Column({ name: 'brand_id' })
  brandId: number;

  @ManyToOne(() => Brands, (brand) => brand.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brands;

  @OneToMany(() => ProjectPhase, (phase) => phase.project, {
    cascade: true, // Automatically save phases when saving project
  })
  phases: ProjectPhase[];

  @ManyToMany(() => Boosters, (booster) => booster.projects)
  @JoinTable({
    name: 'booster_project_mapping',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'booster_id', referencedColumnName: 'id' },
  })
  boosters: Boosters[];

  @OneToMany(() => Users, (user) => user.project)
  users: Users[];

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({
    type: 'json',
    name: 'inventory_options',
    nullable: true,
  })
  inventoryOptions: string[];

  @Column({
    type: 'json',
    name: 'price_range',
    nullable: false,
  })
  priceRange: { min: number; max: number }[];

  @Column({ name: 'easebuzz_booking_mid', nullable: true })
  easebuzzBookingmid: string;

  @Column({ name: 'easebuzz_milestone_mid', nullable: true })
  easebuzzMilestonemid: string;

  @Column({ name: 'easebuzz_booking_salt', nullable: true })
  easebuzzBookingSalt: string;

  @Column({ name: 'easebuzz_booking_key', nullable: true })
  easebuzzBookingKey: string;

  @Column({ name: 'easebuzz_milestone_salt', nullable: true })
  easebuzzMilestoneSalt: string;

  @Column({ name: 'easebuzz_milestone_key', nullable: true })
  easebuzzMilestoneKey: string;

  @Column({ name: 'razorpay_key', nullable: true })
  razorpayKey: string;

  @Column({ name: 'razorpay_secret', nullable: true })
  razorpaySecret: string;

  @Column({ name: 'razorpay_booking_mid', nullable: true })
  razorpayBookingmid?: string;

  @Column({ name: 'razorpay_milestone_mid', nullable: true })
  razorpayMilestonemid?: string;

  @Column({
    name: 'available_gateways',
    type: 'json',
    nullable: false,
  })
  availableGateways: PaymentGatewayEnum[];

  @Column({ name: 'company_id', type: 'int', nullable: true })
  companyId: number | null;

  @ManyToOne(() => CompanyMaster, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyMaster | null;

  @Column({ name: 'project_image', type: 'varchar', nullable: true })
  projectImage: string | null;

  @Column({ name: 'sfdc_project_name', type: 'varchar', nullable: true })
  sfdcProjectName: string | null;

  @Column({
    type: 'json',
    name: 'codename',
    nullable: true,
  })
  codename: string[];

  @Column({ name: 'jv_partner_logo', type: 'varchar', nullable: true })
  jvPartnerLogo: string | null;

  @Column({ name: 'terms_Conditions', type: 'varchar', nullable: true })
  termsConditions?: string;

  @Column({
    name: 'agreement_percentage',
    type: 'int',
    nullable: true,
  })
  agreementPercentage: number;

  /**
   * Per-project ceiling on CRM-edited `brokerage_percentage` on the
   * IOM. Enforced by `IomCrmService.editIom`. Stored as a percentage
   * value (e.g. 5.00 = 5%). Defaulted org-wide to 5.00 via migration.
   */
  @Column({
    name: 'max_brokerage_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 5.0,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => (v == null ? null : parseFloat(v)),
    },
  })
  maxBrokeragePercentage: number;
}
