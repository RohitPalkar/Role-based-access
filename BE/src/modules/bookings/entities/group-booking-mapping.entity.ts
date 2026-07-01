import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MultiBooking } from './group-bookings.entity';

@Entity('group_booking_mappings')
@Index(['group_id', 'is_deleted'])
@Index(['opportunity_id', 'is_deleted'])
export class GroupBookingMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_id', type: 'char', length: 36 })
  @Index()
  group_id: string;

  @Column({ name: 'opportunity_id', type: 'varchar', length: 255 })
  @Index()
  opportunity_id: string;

  @ManyToOne(() => MultiBooking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: MultiBooking;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', width: 1, default: 0 })
  is_deleted: number;
}
