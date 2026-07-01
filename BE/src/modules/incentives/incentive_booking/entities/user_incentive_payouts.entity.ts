import { Users } from 'src/entities';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_incentive_payouts' })
export class UserIncentivePayout {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  user: Users;

  @Column()
  year: number;

  @Column()
  month: number;

  @Column('decimal', {
    name: 'incentive_paid',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  incentivePaid: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'incentive_delta',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  incentiveDelta: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    default: 0,
    name: 'total_incentive',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  totalIncentive: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'accrual_amount',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  accrualAmount: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'utilized_delta',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  utilizedDelta: number;

  @Column('decimal', {
    precision: 15,
    scale: 2,
    default: 0,
    nullable: true,
    name: 'carry_forward_amount',
    transformer: {
      to: (val: number) => val,
      from: (val: string) => parseFloat(parseFloat(val).toFixed(2)),
    },
  })
  carryForwardAmount: number;

  @Column({
    type: 'decimal',
    name: 'max_multiplier',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
  })
  maxMultiplier: number;

  @Column({
    type: 'decimal',
    name: 'salary',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
  })
  salary: number;

  @Column({ type: 'json', nullable: true, name: 'booking_ids' })
  bookingIds: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
