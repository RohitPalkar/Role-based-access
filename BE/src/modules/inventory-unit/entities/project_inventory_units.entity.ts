import { EoiCampaign, VoucherUnitBlocking } from 'src/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('project_inventory_units')
@Index(['unitNumber'], { unique: true })
@Index(['campaignId', 'unitNumber'], { unique: true })
export class ProjectInventoryUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'int' })
  @Index()
  campaignId: number;

  @ManyToOne(() => EoiCampaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: EoiCampaign;

  @Column({ name: 'tower_id', type: 'varchar', length: 100 })
  towerId: string;

  @Column({ name: 'unit_id', type: 'varchar', length: 100, nullable: true })
  unitId: string;

  @Column({ name: 'tower_name', type: 'varchar', length: 150 })
  towerName: string;

  @Column({ name: 'floor', type: 'varchar' })
  floor: string;

  @Column({ name: 'unit_number', type: 'varchar', length: 150 })
  unitNumber: string;

  @Column({ name: 'series', type: 'varchar', length: 100, nullable: true })
  series?: string;

  @Column({
    name: 'configuration',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  configuration?: string;

  @Column({ name: 'facing', type: 'varchar', length: 100, nullable: true })
  facing?: string;

  @Column({
    name: 'car_park_type',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  carParkType?: string;

  @Column({ name: 'number_of_car_parks', type: 'int', nullable: true })
  numberOfCarParks?: number;

  @Column({
    name: 'area_sba',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  areaSba?: number;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'Available' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @Column({ name: 'is_mapped', default: false })
  isMapped: boolean;

  @Column({
    name: 'carpet_area',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  carpetArea?: number;

  @Column({
    name: 'agreement_value',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  agreementValue?: number;

  @OneToMany(() => VoucherUnitBlocking, (b) => b.inventoryUnit)
  blockings: VoucherUnitBlocking[];
}
