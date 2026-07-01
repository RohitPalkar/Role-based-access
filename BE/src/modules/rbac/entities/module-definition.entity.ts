import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { SubModuleDefinition } from './sub-module-definition.entity';
import { ActionDefinition } from './action-definition.entity';
import { DeptRoleModuleMapping } from './dept-role-module-mapping.entity';
import { UserProjectModuleAccess } from './user-project-module-access.entity';

@Entity('module_definitions')
export class ModuleDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number;

  @Column({ nullable: true })
  icon: string;

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

  @ManyToOne(() => ModuleDefinition, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: ModuleDefinition;

  @OneToMany(() => ModuleDefinition, (md) => md.parent)
  children: ModuleDefinition[];

  @OneToMany(() => SubModuleDefinition, (sm) => sm.module)
  subModules: SubModuleDefinition[];

  @OneToMany(() => ActionDefinition, (ad) => ad.module)
  actions: ActionDefinition[];

  @OneToMany(() => DeptRoleModuleMapping, (drm) => drm.module)
  deptRoleModuleMappings: DeptRoleModuleMapping[];

  @OneToMany(() => UserProjectModuleAccess, (upma) => upma.module)
  userProjectModuleAccesses: UserProjectModuleAccess[];
}
