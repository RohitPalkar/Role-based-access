import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from './user.entity';

@Entity('user_availability')
@Index('idx_user_availability_user', ['userId'])
@Index('idx_user_availability_window', [
  'userId',
  'unavailableFrom',
  'unavailableTo',
])
export class UserAvailability {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ name: 'unavailable_from', type: 'datetime' })
  unavailableFrom: Date;

  @Column({ name: 'unavailable_to', type: 'datetime' })
  unavailableTo: Date;

  @Column({ name: 'marked_by', type: 'int' })
  markedBy: number;

  @ManyToOne(() => Users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'marked_by' })
  markedByUser: Users;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancelled_by', type: 'int', nullable: true })
  cancelledBy: number | null;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}
