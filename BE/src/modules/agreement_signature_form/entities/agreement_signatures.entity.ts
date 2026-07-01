import { Users } from 'src/entities';
import { DocumentStatus } from 'src/enums/agreement-signature.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('agreement_signatures')
export class AgreementSignature {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'sales_order_id',
    nullable: true,
  })
  salesOrderId: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'enquiry_reference_number',
    nullable: true,
  })
  enquiryReferenceNumber: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'opportunity_id',
  })
  opportunityId: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'agreement_id',
    nullable: false,
    unique: true,
  })
  agreementId: string;

  @Column({ type: 'varchar', length: 100, name: 'project_name' })
  projectName: string;

  @Column({ type: 'varchar', length: 100, name: 'unit_no', nullable: true })
  unitNo: string;

  @Column({ type: 'int', name: 'number_of_applicants' })
  numberOfApplicants: number;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    name: 'document_status',
    default: DocumentStatus.IN_PROGRESS,
  })
  documentStatus: DocumentStatus;

  @Column({ type: 'datetime', name: 'signed_at', nullable: true })
  signedAt: Date | null;

  @Column({ type: 'json', name: 'applicant1', nullable: true })
  applicant1: Record<string, any> | null;

  @Column({ type: 'json', name: 'applicant2', nullable: true })
  applicant2: Record<string, any> | null;

  @Column({ type: 'json', name: 'applicant3', nullable: true })
  applicant3: Record<string, any> | null;

  @Column({ type: 'json', name: 'applicant4', nullable: true })
  applicant4: Record<string, any> | null;

  @Column({ type: 'json', name: 'documents', nullable: true })
  documents: Record<string, any> | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'document_type',
    nullable: true,
  })
  documentType: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'document_name',
    nullable: true,
  })
  documentName: string | null;

  @Column({
    type: 'boolean',
    name: 'internal_signatory_required',
    default: false,
  })
  internalSignatoryRequired: boolean;

  @Column({
    type: 'boolean',
    name: 'merge_docs',
    default: false,
  })
  mergeDocs: boolean;

  @Column({ type: 'json', name: 'invitees', nullable: true })
  invitees: Record<string, any> | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'unsigned_pdf',
    nullable: true,
  })
  unsignedPdf: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'signed_pdf',
    nullable: true,
  })
  signedPdf: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'customer_signed_pdf',
    nullable: true,
  })
  customerSignedPdf: string;

  @Column({ type: 'json', name: 'leegality_data', nullable: true })
  leegalityData: Record<string, any>;

  @CreateDateColumn({ type: 'datetime', name: 'sent_date' })
  sentDate: Date | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: Users;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
