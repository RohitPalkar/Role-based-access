import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from 'src/modules/users/entities/user.entity';

@Entity('user_sales')
@Unique(['user', 'month', 'year']) // Ensures only one record per user per month+year
export class UserMonthlyGrossTotal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false })
  month: number; // (1 = Jan, ... 12 = Dec)

  @Column({ type: 'int', nullable: false })
  year: number;

  @Column({ name: 'eligible_bookings', type: 'int', nullable: false })
  eligibleBookings: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
  })
  launchGrossTotal: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(2)),
    },
  })
  sustenanceGrossTotal: number;

  /**
   * NEW COLUMNS for storing the user’s “current” incentive percentage
   * for launch vs. sustenance. Example: 0.10, 0.20, etc.
   */
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 3,
    default: 0,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(3)),
    },
  })
  currentLaunchIncentivePercentage: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 3,
    default: 0,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(parseFloat(value).toFixed(3)),
    },
  })
  currentSustenanceIncentivePercentage: number;

  @ManyToOne(() => Users, (user) => user.id, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: Users;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
