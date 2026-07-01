import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Projects } from '../../projects/entities/project.entity';
import { CityMaster, IncentivePolicy, ProjectPhase, Users } from 'src/entities';
import { decimalTransformer } from 'src/utils/transformers';

@Entity('brands')
export class Brands {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'logo', type: 'varchar', nullable: true })
  logo: string | null;

  @Column({ name: 'has_unique_policy', default: true })
  hasUniquePolicy: boolean;

  @Column({
    name: 'salary_multiplier',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: decimalTransformer,
  })
  salaryMultiplier: number;

  @OneToMany(() => Projects, (project) => project.brand)
  projects: Projects[];

  @OneToMany(() => ProjectPhase, (phase) => phase.brand) // Added ProjectPhase relation
  projectPhases: ProjectPhase[];

  @ManyToMany(() => CityMaster, (city) => city.brands)
  @JoinTable({
    name: 'brand_city_mapping', // Junction Table
    joinColumn: { name: 'brand_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'city_id', referencedColumnName: 'id' },
  })
  cities: CityMaster[];

  @OneToMany(() => Users, (user) => user.brand) // One role can have many users
  users: Users[];

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
    default: 0,
  })
  maxQualificationDays: number;

  // Optionally store the ID of the brand's original/old policy
  @ManyToOne(() => IncentivePolicy, { nullable: true })
  @JoinColumn({ name: 'default_policy_id' })
  defaultPolicy: IncentivePolicy | null;

  @Column({ name: 'razorpay_key', nullable: true })
  razorpayKey: string;

  @Column({ name: 'razorpay_secret', nullable: true })
  razorpaySecret: string;

  @Column({ name: 'easebuzz_booking_salt', nullable: true })
  easebuzzBookingSalt: string;

  @Column({ name: 'easebuzz_booking_key', nullable: true })
  easebuzzBookingKey: string;

  @Column({ name: 'easebuzz_milestone_salt', nullable: true })
  easebuzzMilestoneSalt: string;

  @Column({ name: 'easebuzz_milestone_key', nullable: true })
  easebuzzMilestoneKey: string;

  @Column({
    name: 'easebuzz_booking_mid',
    nullable: true,
  })
  easebuzzBookingmid: string;

  @Column({
    name: 'easebuzz_milestone_mid',
    nullable: true,
  })
  easebuzzMilestonemid: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
