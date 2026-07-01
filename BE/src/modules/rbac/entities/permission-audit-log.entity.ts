import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from '../../users/entities/user.entity';

@Entity('permission_audit_log')
export class PermissionAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REVOKE', 'ENABLE', 'DISABLE'] })
  action: string;

  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column({ name: 'old_value', type: 'json', nullable: true })
  oldValue: any;

  @Column({ name: 'new_value', type: 'json', nullable: true })
  newValue: any;

  @Column({ name: 'performed_by' })
  performedBy: number;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Users, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'performed_by' })
  performedByUser: Users;
}
