import { LogStatus, RequestType } from 'src/enums/decentro.enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('decentro_logs')
export class DecentroLogs {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'reference_id', type: 'varchar', length: 255 })
  referenceId: string;

  @Column({ name: 'opportunity_id', type: 'varchar', length: 255 })
  opportunityId: string;

  @Column({ name: 'request_body', type: 'json', nullable: true })
  requestBody?: any;

  @Column({
    name: 'transaction_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  transactionId?: string;

  @Column({ name: 'webhook_response', type: 'json', nullable: true })
  webhookResponse?: any;

  @Column({
    name: 'request_type',
    type: 'enum',
    enum: RequestType,
  })
  requestType: RequestType;

  @Column({ name: 'request_payload', type: 'json', nullable: true })
  requestPayload: any;

  @Column({ name: 'response_payload', type: 'json', nullable: true })
  responsePayload: any;

  @Column({ name: 'status_code', type: 'varchar', length: 255, nullable: true })
  statusCode?: string;

  @Column({
    type: 'enum',
    enum: LogStatus,
    default: LogStatus.INITIATED,
  })
  status: LogStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
