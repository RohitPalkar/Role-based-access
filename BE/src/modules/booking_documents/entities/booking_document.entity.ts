import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('booking_documents')
export class BookingDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'opportunity_id' })
  opportunityId: string;

  @Column({ name: 'voucher_id', nullable: true })
  voucherId: number;

  @Column()
  name: string;

  @Column()
  path: string;

  @Column()
  type: string;

  @Column()
  stage: string;

  @Column({ name: 'is_other_doc' })
  isOtherDoc: boolean;

  @Column({ name: 'is_signed' })
  isSigned: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modified_at: Date;
}
