import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VoucherForm } from './voucher_form.entity';
import { ProjectInventoryUnit } from 'src/modules/inventory-unit/entities/project_inventory_units.entity';
import { MappingStatus } from 'src/enums/eoi-form.enums';

@Entity('voucher_unit_mappings')
@Index(['voucherId'], { unique: true })
@Index(['inventoryUnitId'], { unique: true })
@Index(['status'])
export class VoucherUnitMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'voucher_id', unique: true })
  voucherId: number;

  @OneToOne(() => VoucherForm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: VoucherForm;

  @Column({ name: 'inventory_unit_id', unique: true })
  inventoryUnitId: string;

  @ManyToOne(() => ProjectInventoryUnit)
  @JoinColumn({ name: 'inventory_unit_id' })
  inventoryUnit: ProjectInventoryUnit;

  @Column({
    name: 'status',
    type: 'enum',
    enum: MappingStatus,
    default: MappingStatus.PENDING_APPROVAL,
  })
  status: MappingStatus;

  @Column({ name: 'source', type: 'varchar', length: 50 })
  source: string;

  @Column({ name: 'unit_number' })
  unitNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
