import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Department } from '../../users/entities/department.entity';
import { Level } from './level.entity';
import { DeptRoleModuleMapping } from './dept-role-module-mapping.entity';
import { UserRoleAssignment } from './user-role-assignment.entity';

@Entity('role_definitions')
export class RoleDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ name: 'department_id' })
  departmentId: number;

  @Column({ name: 'level_id' })
  levelId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => Level, (level) => level.roleDefinitions, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'level_id' })
  level: Level;

  @OneToMany(() => DeptRoleModuleMapping, (drm) => drm.roleDefinition)
  deptRoleModuleMappings: DeptRoleModuleMapping[];

  @OneToMany(() => UserRoleAssignment, (ura) => ura.roleDefinition)
  userRoleAssignments: UserRoleAssignment[];
}
