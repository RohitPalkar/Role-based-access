import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Users } from '../../../entities/index';

@Entity({ name: 'iom_invoice_details' })
export class IomInvoiceDetails {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100 })
  invoiceNumber: string;

  @Column({ name: 'invoice_id', type: 'varchar', length: 50 })
  iomInvoiceId: string;

  @Column({ name: 'status', type: 'varchar', length: 50 })
  status: string;

  @Column({ name: 'invoice_requested_at', type: 'timestamp', nullable: true })
  invoiceRequestedAt: Date | null;

  @Column({ name: 'invoice_date', type: 'date', nullable: true })
  invoiceDate: Date | null;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: number;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'created_by' })
  createdByUser?: Users;

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: Users | null;
}
