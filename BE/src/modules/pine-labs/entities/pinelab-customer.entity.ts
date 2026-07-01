import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Brands } from 'src/entities';

@Entity('pinelab_customers')
export class PinelabCustomer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'brand_id', type: 'bigint' })
  brandId: number;

  @ManyToOne(() => Brands)
  @JoinColumn({ name: 'brand_id' })
  brand: Brands;

  @Column({ name: 'mobile_no', type: 'varchar', length: 15 })
  mobileNo: string;

  @Column({
    name: 'pinelab_customer_id',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  pinelabCustomerId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
