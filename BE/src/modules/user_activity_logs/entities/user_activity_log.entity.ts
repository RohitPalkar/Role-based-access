import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('user_activity_logs')
export class UserActivityLog {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entity: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId: string;

  @Column({ name: 'payload_hash', type: 'varchar', length: 64, nullable: true })
  payloadHash: string;

  @Column({ name: 'details', type: 'json', nullable: true })
  details: any;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({
    name: 'device_details',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  deviceDetails: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
