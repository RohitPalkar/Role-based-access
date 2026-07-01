import { CronStatus, CRONTYPES } from 'src/enums/crons.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'cron_logs' })
export class CronLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CRONTYPES })
  cronType: CRONTYPES; // Stores the cron type from enum

  @Column()
  cronName: string; // Stores a user-friendly name

  @Column({ type: 'timestamp' })
  startTime: Date; // Timestamp when cron started

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date; // Timestamp when cron finished

  @Column({ type: 'int', default: 0 })
  durationMs: number; // Duration in milliseconds (default: 0 in case of failure)

  @Column({ type: 'enum', enum: CronStatus, default: CronStatus.PASS })
  status: CronStatus; // Status of cron execution

  @Column({ type: 'text', nullable: true })
  description: string; // Additional details or error message

  @CreateDateColumn()
  createdAt: Date; // Auto-generated timestamp when log is created

  @UpdateDateColumn()
  updatedAt: Date; // Auto-updated timestamp when log is modified
}
