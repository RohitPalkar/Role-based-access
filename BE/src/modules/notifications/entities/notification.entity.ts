import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Users } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notifications {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column('text')
  title: string;

  @Column('text')
  message: string;

  @ManyToOne(() => Users, (user) => user.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' }) // use snake_case for consistency
  user: Users | null;

  @Column({ default: false })
  isRead: boolean;

  // New flag: if true, this notification is for all admins.
  @Column({ default: false })
  isForAllAdmin: boolean;

  @Column({ default: false })
  isForAllFinanceAdmin: boolean;

  // New flag: if true, this notification is for all RM users.
  @Column({ default: false })
  isForAllRm: boolean;

  @Column({ default: false })
  isForAllBackendCheckers: boolean;

  @Column({ default: false })
  isForAllSalesBH: boolean;

  @Column({ default: false })
  isForAllCRM: boolean;

  // This column stores an array of admin IDs who have read this broadcast notification.
  // For individual notifications, this can remain null.
  @Column({ type: 'json', nullable: true })
  adminReadIds: number[];

  // This column stores an array of RM IDs who have read this broadcast notification.
  // For individual notifications, this can remain null.
  @Column({ type: 'json', nullable: true })
  rmReadIds: number[];

  @Column({ type: 'json', nullable: true })
  financeAdminReadIds: number[];

  @Column({ type: 'json', nullable: true })
  backendCheckerReadIds: number[];

  @Column({ type: 'json', nullable: true })
  crmReadIds: number[];

  @Column({ type: 'json', nullable: true })
  salesBHReadIds: number[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
