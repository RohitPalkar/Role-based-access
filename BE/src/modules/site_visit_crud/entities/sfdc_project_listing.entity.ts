import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sfdc_project_listing')
export class SfdcProjectListing {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  @Column({ name: 'project_name', type: 'varchar', length: 255 })
  projectName: string;

  @Column({
    name: 'inventory_options',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  inventoryOptions: any;

  @Column({ name: 'brand_name', type: 'varchar', length: 255, nullable: true })
  brandName: string;

  @Column({ name: 'price_range', type: 'varchar', length: 255, nullable: true })
  priceRange: any;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'GRE_id', type: 'int' })
  greId: number;
}
