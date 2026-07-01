import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'country_master' })
export class CountryMaster {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'iso_code', type: 'varchar', length: 3 })
  isoCode: string;

  @Column({ name: 'country_name', type: 'varchar', length: 128 })
  countryName: string;

  @Column({ name: 'country_code', type: 'varchar', length: 16 })
  countryCode: string;

  @Column({
    name: 'created_by',
    type: 'varchar',
    length: 64,
    default: 'system',
  })
  createdBy: string;

  @Column({
    name: 'updated_by',
    type: 'varchar',
    length: 64,
    default: 'system',
  })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;
}
