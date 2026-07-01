import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from 'src/entities';

@Entity('iom_assignment_state')
export class IomAssignmentState {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'last_user_id', type: 'int', nullable: true })
  lastUserId: number | null;

  @ManyToOne(() => Users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_user_id' })
  lastUser?: Users | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}
