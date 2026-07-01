import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RoleDefinition } from './role-definition.entity';
import { DeptRoleModuleMapping } from './dept-role-module-mapping.entity';

@Entity('levels')
export class Level {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RoleDefinition, (rd) => rd.level)
  roleDefinitions: RoleDefinition[];

  @OneToMany(() => DeptRoleModuleMapping, (drm) => drm.level)
  deptRoleModuleMappings: DeptRoleModuleMapping[];
}
