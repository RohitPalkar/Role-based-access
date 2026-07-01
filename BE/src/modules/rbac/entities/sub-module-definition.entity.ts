import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ModuleDefinition } from './module-definition.entity';

@Entity('sub_module_definitions')
export class SubModuleDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ name: 'module_id' })
  moduleId: number;

  @Column({ name: 'route_path', nullable: true })
  routePath: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ModuleDefinition, (md) => md.subModules, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: ModuleDefinition;
}
