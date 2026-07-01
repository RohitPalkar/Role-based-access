import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IncentiveSlab } from './incentive_slabs.entity';
import { StatusEnum } from 'src/enums/status.enum';
import { Group } from '../../../users/entities/group.entity';

@Entity('incentive_policies')
export class IncentivePolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.INACTIVE,
  })
  status: StatusEnum;

  @Column({ name: 'region_ids', type: 'json', nullable: true })
  regionIds: number[];

  @Column({ name: 'brand_ids', type: 'json', nullable: true })
  brandIds: number[]; // Array of brand IDs

  @Column({ name: 'projects_array', type: 'json', nullable: true })
  projectsArray: number[];

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({
    type: 'decimal',
    name: 'max_payable_incentive',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  maxPayableIncentive: number;

  @OneToMany(() => IncentiveSlab, (slab) => slab.incentivePolicy, {
    cascade: true,
  })
  incentiveSlabs: IncentiveSlab[];

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'created_by', default: 'system' })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'updated_by', default: 'system' })
  updatedBy: string;
}
