import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('booking_office_use')
export class BookingOfficeUse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'opportunity_id' })
  opportunityId: string;

  // office_use —> office_info
  @Column({ name: 'office_info', type: 'json', nullable: true })
  officeInfo?: Record<string, any> | null;

  // Newly added fields
  @Column({ name: 'documents', type: 'json', nullable: true })
  documents?: string[] | null;

  @Column({ name: 'enq_ref_no', type: 'varchar', length: 50, nullable: true })
  enqRefNo?: string | null;

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks?: string | null;

  @Column({ name: 'nri_country', type: 'varchar', length: 100, nullable: true })
  nriCountry?: string | null;

  @Column({
    name: 'booking_region_as_per_rm',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bookingRegionAsPerRM?: string | null;

  @Column({
    name: 'primary_source',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  primarySource?: string | null;

  @Column({
    name: 'booking_scheme_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bookingSchemeName?: string | null;

  @Column({ name: 'cp_name', type: 'varchar', length: 150, nullable: true })
  cpName?: string | null;

  @Column({ name: 'primary_source_disabled', default: false, type: 'tinyint' })
  primarySourceDisabled: boolean;

  @Column({ name: 'closing_rm_id', type: 'int', nullable: true, default: null })
  closingRmId: number | null;

  @Column({
    name: 'is_sold_under_scheme',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  isSoldUnderScheme?: string | null;

  @Column({
    name: 'is_unit_sold_mtp',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  isUnitSoldMTP?: string | null;

  @Column({
    name: 'is_payment_plan',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  isPaymentPlan?: string | null;

  @Column({
    name: 'is_pdc_collected',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  isPDCCollected?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  modified_at: Date;

  @Column({
    name: 'agreement_value',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  agreementValue?: number;

  @Column({ name: 'booking_amount', nullable: true })
  bookingAmount?: number;

  @Column({ name: 'voucher_id', nullable: true })
  voucherId: number;
}
