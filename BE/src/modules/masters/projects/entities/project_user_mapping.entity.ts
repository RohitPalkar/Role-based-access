import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Projects } from './project.entity';
import { Users } from 'src/entities';

@Entity('project_user_mapping')
export class ProjectUserMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Projects)
  @JoinColumn({ name: 'project_id' })
  project: Projects;

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column()
  role: string;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({
    name: 'assigned_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  assignedAt: Date;

  @Column({ name: 'removed_at', type: 'timestamp', nullable: true })
  removedAt: Date;
}
