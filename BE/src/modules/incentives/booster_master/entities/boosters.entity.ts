import { Projects } from 'src/modules/masters/projects/entities/project.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BoosterIncentiveSlabs } from './booster_slabs.entity';
import { Group } from 'src/entities';

@Entity('boosters')
export class Boosters {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ type: 'timestamp', name: 'start_date', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', name: 'end_date', nullable: true })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'active',
    name: 'status',
  })
  status: 'active' | 'inactive';

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @ManyToMany(() => Projects, (project) => project.boosters)
  projects: Projects[];

  @OneToMany(() => BoosterIncentiveSlabs, (slab) => slab.booster)
  boosterSlabs: BoosterIncentiveSlabs[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
