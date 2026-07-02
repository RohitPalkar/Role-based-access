import {
  Brands,
  IncentiveBooking,
  Notifications,
  Projects,
  Role,
} from '../../../entities/index';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Group } from './group.entity';
import { Department } from './department.entity';
import { UserFinances } from 'src/modules/user_finance/entities/user_finance.entitiy';
import { FileUploadLogs } from 'src/modules/salary_upload/entities/upload_logs.entity';
import { StatusEnum } from 'src/enums/status.enum';
import { UserIncentivePayout } from 'src/modules/incentives/incentive_booking/entities/user_incentive_payouts.entity';
import { EmployeeStatus } from 'src/enums/employee-status.enum';
import { UserGroupAssignment } from './user_group_assignment.entity';
import { Zone } from 'src/modules/rbac/entities/zone.entity';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'username', unique: true })
  userName: string;

  @Column({ name: 'email' })
  email: string;

  @Column({ name: 'password', nullable: true, select: false })
  password: string;

  @Column({ name: 'emp_code', nullable: true })
  empCode: string;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @Column({ nullable: true })
  salary: string;

  @Column({ name: 'signature_image', nullable: true })
  signatureImage: string;

  @Column({ name: 'reporting_to', nullable: true })
  reportingTo: number;

  @Column({ name: 'contact_number', nullable: true })
  contactNumber: string;

  @Column({ name: 'country_code', nullable: true })
  countryCode: string;

  @Column({ name: 'is_signatory', default: false })
  isSignatory: boolean;

  @Column({ name: 'get_office_use_mail', default: false })
  getOfficeUseMail: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
  })
  accruals: number;

  @Column({ name: 'rank', type: 'int', nullable: true })
  rank: number;

  @Column({
    name: 'employee_status',
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.AVAILABLE,
    nullable: true,
  })
  employeeStatus: EmployeeStatus;

  @Column({ name: 'crm_projects', type: 'json', nullable: true })
  crmProjects: number[];

  @Column({ name: 'region_ids', type: 'json', nullable: true })
  regionIds: number[];

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToMany(() => UserGroupAssignment, (uga) => uga.user)
  groupAssignments: UserGroupAssignment[];

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @ManyToOne(() => Brands, (brand) => brand.users, { onDelete: 'SET NULL' }) // Add brand relation
  @JoinColumn({ name: 'brand_id' })
  brand: Brands;

  @ManyToOne(() => Department, (department) => department.users, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department: Group;

  @OneToMany(() => Notifications, (notification) => notification.user)
  notifications: Notifications[];

  @OneToMany(
    () => IncentiveBooking,
    (incentiveBooking) => incentiveBooking.user,
  )
  incentiveBookings: IncentiveBooking[];

  @OneToMany(() => UserFinances, (finance) => finance.user)
  finances: UserFinances[];

  @OneToMany(() => FileUploadLogs, (uploadLog) => uploadLog.user)
  uploadLogs: FileUploadLogs[];

  @ManyToOne(() => Projects, (project) => project.users, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'project_id' })
  project: Projects;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: number;

  @ManyToOne(() => Zone, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ name: 'employment_status', nullable: true })
  employmentStatus: string;

  @Column({ name: 'user_group', nullable: true })
  userGroup: string;

  @Column({ name: 'group_start_date', type: 'date', nullable: true })
  groupStartDate: string;

  @Column({ name: 'group_end_date', type: 'date', nullable: true })
  groupEndDate: string;

  @OneToMany(() => UserIncentivePayout, (payout) => payout.user)
  userIncentivePayouts: UserIncentivePayout[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
