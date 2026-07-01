import { Users } from 'src/entities';
import { MultiBookingStatusEnum } from 'src/enums/booking-form-status.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { GroupBookingMapping } from './group-booking-mapping.entity';

@Entity('group_booking_master')
export class MultiBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'group_name',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  groupName: string;

  @Column({ name: 'no_of_units', type: 'int', default: 2 })
  noOfUnits: number;

  @OneToMany(() => GroupBookingMapping, (mapping) => mapping.group, {
    cascade: true,
  })
  mappings: GroupBookingMapping[];

  @Column({ name: 'payment_method', type: 'varchar', length: 255 })
  paymentMethod: string;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 45,
    default: MultiBookingStatusEnum.NOT_SIGNED,
  })
  status: MultiBookingStatusEnum;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: Users;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', type: 'tinyint', width: 1, default: 0 })
  isDeleted: number;
}
