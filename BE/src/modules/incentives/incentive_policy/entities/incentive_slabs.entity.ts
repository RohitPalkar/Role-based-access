import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  Check,
} from 'typeorm';
import { IncentivePolicy } from './incentive_policy.entity';
import {
  convertFromDecimal,
  convertFromIncentive,
  convertToDecimal,
  convertToIncentive,
} from 'src/helpers/number-transform';

@Entity('incentive_slabs')
@Check('"launch_start_range" < "launch_end_range"')
@Check('"sustenance_start_range" < "sustenance_end_range"')
@Check('"incentive_percentage" >= 0 AND "incentive_percentage" <= 100')
export class IncentiveSlab {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => IncentivePolicy, (structure) => structure.incentiveSlabs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incentive_policy_id' })
  incentivePolicy: IncentivePolicy;

  @Column({
    type: 'decimal',
    precision: 17, // 10 digits + 7 decimal places
    scale: 7,
    name: 'launch_start_range',
    nullable: true,
    transformer: {
      to: convertToDecimal,
      from: convertFromDecimal,
    },
  })
  launchStartRange: number | null;

  @Column({
    type: 'decimal',
    precision: 22, // 15 digits + 7 decimal places
    scale: 7,
    name: 'launch_end_range',
    nullable: true,
    transformer: {
      to: convertToDecimal,
      from: convertFromDecimal,
    },
  })
  launchEndRange: number | null;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 3,
    name: 'launch_incentive_percentage',
    nullable: true,
    transformer: {
      to: convertToIncentive,
      from: convertFromIncentive,
    },
  })
  launchIncentivePercentage: number | null;

  @Column({
    type: 'decimal',
    precision: 17, // 10 digits + 7 decimal places
    scale: 7,
    name: 'sustenance_start_range',
    nullable: true,
    transformer: {
      to: convertToDecimal,
      from: convertFromDecimal,
    },
  })
  sustenanceStartRange: number | null;

  @Column({
    type: 'decimal',
    precision: 22, // 15 digits + 7 decimal places
    scale: 7,
    name: 'sustenance_end_range',
    nullable: true,
    transformer: {
      to: convertToDecimal,
      from: convertFromDecimal,
    },
  })
  sustenanceEndRange: number | null;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 3,
    name: 'sustenance_incentive_percentage',
    nullable: true,
    transformer: {
      to: convertToIncentive,
      from: convertFromIncentive,
    },
  })
  sustenanceIncentivePercentage: number | null;

  @Column({
    type: 'int',
    name: 'launch_min_bookings',
    nullable: true,
  })
  launchMinBookings: number;

  @Column({
    type: 'int',
    name: 'sustenance_min_bookings',
    nullable: true,
  })
  sustenanceMinBookings: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
