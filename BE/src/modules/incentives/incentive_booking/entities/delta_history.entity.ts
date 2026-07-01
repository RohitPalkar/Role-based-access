import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Users } from 'src/modules/users/entities/user.entity';
import { IncentiveBooking } from './incentive_booking.entity';

@Entity('incentive_delta_history')
export class IncentiveDeltaHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', {
    precision: 15,
    scale: 3,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
  })
  deltaAmount: number;

  @ManyToOne(() => IncentiveBooking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: IncentiveBooking;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ default: false })
  isUtilized: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
