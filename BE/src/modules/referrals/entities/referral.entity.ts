import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('referrals')
@Unique('unique_opportunity_mobile', ['opportunityId', 'mobileNumber'])
export class Referral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  countryCode: string;

  @Column()
  mobileNumber: string;

  @Column()
  opportunityId: string;

  @Column()
  primarySource: string;

  @Column({ default: 'Referral at booking' })
  secondarySource: string;

  @Column({ nullable: true })
  projectName: string;

  @Column({ nullable: true })
  projectCity: string;

  @Column({ nullable: true })
  referredApartment: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
