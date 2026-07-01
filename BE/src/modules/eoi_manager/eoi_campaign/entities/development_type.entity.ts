import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryType } from './inventory_type.entity';

@Entity('development_types')
export class DevelopmentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToMany(() => InventoryType, (i) => i.developmentTypes)
  @JoinTable({
    name: 'development_inventory_types',
    joinColumn: { name: 'development_type_id' },
    inverseJoinColumn: { name: 'inventory_type_id' },
  })
  inventoryTypes: InventoryType[];
}
