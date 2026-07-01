import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceptionDeskAttendanceToBatchVouchers1779600000000 implements MigrationInterface {
  name = 'AddReceptionDeskAttendanceToBatchVouchers1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_vouchers\`
      ADD COLUMN \`head_count\` int NULL,
      ADD COLUMN \`checked_in_at\` datetime(6) NULL,
      ADD COLUMN \`checked_in_by\` varchar(36) NULL,
      ADD COLUMN \`booked_at\` datetime(6) NULL,
      ADD COLUMN \`agreement_signed_at\` datetime(6) NULL,
      ADD COLUMN \`booking_paid_amount\` DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN \`voucher_paid_amount\` DECIMAL(15,2) NULL DEFAULT 0,
      ADD COLUMN \`booking_id\` int NULL,
      ADD CONSTRAINT \`FK_EOI_BATCH_VOUCHERS_BOOKING\`
      FOREIGN KEY (\`booking_id\`)
      REFERENCES \`bookings\`(\`id\`)
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`eoi_batch_vouchers\`
      DROP COLUMN \`head_count\`,
      DROP COLUMN \`checked_in_at\`,
      DROP COLUMN \`checked_in_by\`,
      DROP COLUMN \`booked_at\`,
      DROP COLUMN \`agreement_signed_at\`,
      DROP COLUMN \`voucher_paid_amount\`,
      DROP COLUMN \`booking_paid_amount\`,
      DROP COLUMN \`booking_id\`
    `);
  }
}
