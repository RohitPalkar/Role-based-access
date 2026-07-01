import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  FormType,
  AmendmentStatus,
  BookingFormStatusEnum,
} from 'src/enums/booking-form-status.enum';

@Entity('form_amendment_requests')
export class FormAmendmentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'form_type', type: 'enum', enum: FormType })
  formType: FormType;

  @Column({ name: 'opportunity_id' })
  opportunityId: string;

  @Column('text')
  reason: string;

  @Column({ name: 'requested_by' })
  requestedBy: number;

  @Column({
    name: 'form_status_at_request',
    type: 'enum',
    enum: BookingFormStatusEnum,
  })
  formStatusAtRequest: string;

  @Column({ name: 'needs_approval', default: false })
  needsApproval: boolean;

  @Column({
    type: 'enum',
    enum: AmendmentStatus,
    default: AmendmentStatus.PENDING,
  })
  status: AmendmentStatus;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
