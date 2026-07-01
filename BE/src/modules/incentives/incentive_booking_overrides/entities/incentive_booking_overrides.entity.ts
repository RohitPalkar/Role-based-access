import { Users } from 'src/entities';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('incentive_booking_overrides')
export class IncentiveBookingOverride {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'booking_id', nullable: false })
  bookingId: string;

  @Column({ name: 'sap_booking_date', type: 'date', nullable: true })
  sapBookingDate: Date;

  @Column({ name: 'actual_booking_date', type: 'date', nullable: true })
  actualBookingDate: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'file_name', nullable: true })
  fileName: string;

  @ManyToOne(() => Users, { eager: false, nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: Users;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;
}
