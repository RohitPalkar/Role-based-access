import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('GRE_project_mapping')
export class GREProjectMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'email' })
  email: string;

  @Column({ name: 'project_name', type: 'json' })
  projectName: any;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;
}
