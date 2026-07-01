import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from '../../users/entities/user.entity';
import { UploadStatus } from '../../../enums/user_finance.enums';

@Entity('file_upload_logs')
export class FileUploadLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'emp_id', nullable: true })
  empId: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', name: 'file_name', length: 255 })
  fileName: string;

  @Column({
    type: 'enum',
    enum: UploadStatus,
    default: UploadStatus.SUCCESSFUL,
  })
  status: UploadStatus;

  @ManyToOne(() => Users, (user) => user.uploadLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
