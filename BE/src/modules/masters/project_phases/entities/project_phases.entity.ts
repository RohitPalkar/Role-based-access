import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  DeleteDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Brands } from '../../brands/entities/brand.entity';
import { CityMaster } from 'src/modules/masters/citymaster/entities/cityMaster.entity';
import { ProjectStage } from 'src/enums/project-stage.enum';
import {
  Projects,
  BillingEntity,
  IncentiveBooking,
} from '../../../../entities/index';
import { ReraStatusEnum } from 'src/enums/booking-list.enums';

@Entity('project_phases')
export class ProjectPhase {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({
    name: 'rera_status',
    type: 'enum',
    enum: ReraStatusEnum,
  })
  reraStatus: ReraStatusEnum;

  @Column({
    name: 'project_type',
    type: 'enum',
    enum: ProjectStage,
  })
  projectType: ProjectStage;

  @ManyToOne(
    () => BillingEntity,
    (billingEntity) => billingEntity.projectPhases,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'billing_entity_id' })
  billingEntity: BillingEntity;

  @ManyToOne(() => Projects, (project) => project.phases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Projects;

  @ManyToOne(() => CityMaster, (city) => city.projectPhases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'city_id' })
  city: CityMaster;

  @ManyToOne(() => Brands, (brand) => brand.projectPhases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'brand_id' })
  brand: Brands;

  @OneToMany(
    () => IncentiveBooking,
    (incentiveBooking) => incentiveBooking.projectPhase,
  )
  incentiveBookings: IncentiveBooking[];

  // New Columns
  @Column({
    name: 'sustenance_date',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  sustenanceDate: Date | null;

  @Column({ name: 'skip_launch', type: 'boolean', default: false })
  skipLaunch: boolean;

  @Column({
    name: 'launch_start_date',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  launchStartDate: Date | null;

  @Column({
    name: 'launch_end_date',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  launchEndDate: Date | null;

  @Column({
    name: 'possession_date',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  possessionDate: Date | null;

  @Column({
    name: 'easebuzz_booking_mid',
    nullable: true,
  })
  easebuzzBookingmid?: string;

  @Column({
    name: 'easebuzz_milestone_mid',
    nullable: true,
  })
  easebuzzMilestonemid?: string;

  @Column({ name: 'razorpay_booking_mid', nullable: true })
  razorpayBookingmid?: string;

  @Column({ name: 'razorpay_milestone_mid', nullable: true })
  razorpayMilestonemid?: string;

  @Column({
    name: 'region',
    type: 'json',
    nullable: true,
  })
  region?: number[];

  @Column({
    name: 'sap_phase_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sapPhaseName?: string;

  @Column({
    name: 'sfdc_phase_name',
    type: 'varchar',
    nullable: true,
  })
  sfdcPhaseName?: string;

  @Column({
    name: 'block_names',
    type: 'json',
    nullable: true,
  })
  blockNames?: string[];

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
