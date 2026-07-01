import { Brands } from 'src/entities';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('project_terms')
export class ProjectTerm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'brand_id', nullable: false })
  brandId: number;

  @ManyToOne(() => Brands, { nullable: false })
  @JoinColumn({ name: 'brand_id' })
  brand: Brands;

  @Column()
  projectName: string;

  @Column()
  brandName: string;

  @Column({ nullable: true })
  brandLogo: string;

  @Column({ nullable: true })
  logoImage: string;

  @Column({ nullable: true })
  city: string;

  @Column()
  termsConditions: string;

  @Column({ name: 'sub_merchant_id', nullable: true })
  subMerchantId: string;

  @Column({ name: 'easebuzz_key', nullable: true })
  easebuzzKey: string;

  @Column({ name: 'easebuzz_salt', nullable: true })
  easebuzzSalt: string;

  @Column({ name: 'project_id', nullable: true })
  projectId: number;
}
