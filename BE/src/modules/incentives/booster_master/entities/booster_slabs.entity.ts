import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Boosters } from './boosters.entity';

@Entity('booster_incentive_slabs')
export class BoosterIncentiveSlabs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 17, scale: 7, name: 'start_range' })
  startRange: number;

  @Column({ type: 'decimal', precision: 17, scale: 7, name: 'end_range' })
  endRange: number;

  @Column({
    type: 'enum',
    enum: ['Perks', 'Percentage', 'Cash Prize'],
    name: 'prize_type',
  })
  rewardType: 'Perks' | 'Percentage' | 'Cash Prize';

  @Column({ type: 'varchar', length: 255, name: 'prize_value' })
  rewardValue: string;

  @ManyToOne(() => Boosters, (booster) => booster.boosterSlabs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booster_id' })
  booster: Boosters;
}
