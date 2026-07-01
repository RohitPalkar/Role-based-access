import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Projects } from '../../projects/entities/project.entity';
import { Brands, ProjectPhase } from 'src/entities';
import { Regions } from '../../region/entities/region.entities';

@Entity('city_master')
export class CityMaster {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string; //naming convention changed from cityName to name

  @OneToMany(() => Projects, (project) => project.city)
  projects: Projects[];

  @OneToMany(() => ProjectPhase, (phase) => phase.city) // Added ProjectPhase relation
  projectPhases: ProjectPhase[];

  @ManyToMany(() => Brands, (brand) => brand.cities)
  brands: Brands[];

  @ManyToOne(() => Regions, (region) => region.cities, { nullable: true })
  @JoinColumn({ name: 'region_id' })
  region: Regions;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', default: 'system' })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'varchar', default: 'null' })
  updatedBy: string;
}
