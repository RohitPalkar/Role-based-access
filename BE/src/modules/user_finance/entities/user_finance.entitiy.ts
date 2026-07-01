import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Users } from '../../users/entities/user.entity';
import { Action } from '../../../enums/user_finance.enums';

@Entity('user_finances')
export class UserFinances {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Users, (user) => user.finances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({
    type: 'decimal',
    name: 'accumulated_balance',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  accumulatedBalance: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
  })
  amount: number;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({ type: 'enum', enum: Action, nullable: true })
  action: Action;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
  })
  balance: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
