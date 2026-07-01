import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Department } from '../../users/entities/department.entity';
import { RoleDefinition } from './role-definition.entity';
import { ModuleDefinition } from './module-definition.entity';
import { SubModuleDefinition } from './sub-module-definition.entity';
import { ActionDefinition } from './action-definition.entity';
import { Level } from './level.entity';
import { Users } from '../../users/entities/user.entity';

@Entity('dept_role_module_mappings')
export class DeptRoleModuleMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'department_id' })
  departmentId: number;

  @Column({ name: 'role_definition_id' })
  roleDefinitionId: number;

  @Column({ name: 'module_id' })
  moduleId: number;

  @Column({ name: 'sub_module_id', nullable: true })
  subModuleId: number;

  @Column({ name: 'action_id', nullable: true })
  actionId: number;

  @Column({ name: 'level_id' })
  levelId: number;

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => RoleDefinition, (rd) => rd.deptRoleModuleMappings, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'role_definition_id' })
  roleDefinition: RoleDefinition;

  @ManyToOne(() => ModuleDefinition, (md) => md.deptRoleModuleMappings, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: ModuleDefinition;

  @ManyToOne(() => SubModuleDefinition, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'sub_module_id' })
  subModule: SubModuleDefinition;

  @ManyToOne(() => ActionDefinition, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'action_id' })
  action: ActionDefinition;

  @ManyToOne(() => Level, (l) => l.deptRoleModuleMappings, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'level_id' })
  level: Level;

  @ManyToOne(() => Users, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: Users;
}
