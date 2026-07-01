import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoucherIdToBookings1770642836745 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add voucher_id column (nullable)
    await queryRunner.query(`
      ALTER TABLE bookings ADD COLUMN voucher_id INT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE bookings ADD COLUMN campaign_id INT NULL
    `);

    // Step 2: Backfill existing data by matching opportunityId
    await queryRunner.query(`
      UPDATE bookings b
      INNER JOIN vouchers v ON b.opportunityId COLLATE utf8mb4_0900_ai_ci = v.opportunity_id COLLATE utf8mb4_0900_ai_ci
      SET b.voucher_id = v.id, b.campaign_id = v.campaign_id
      WHERE v.opportunity_id IS NOT NULL
        AND v.is_deleted = false
    `);

    // Step 3: Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD CONSTRAINT fk_bookings_voucher
      FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL
    `);

    // Step 4: Add index for performance
    await queryRunner.query(`
      CREATE INDEX idx_bookings_voucher_id ON bookings (voucher_id)
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers ADD COLUMN booking_status VARCHAR(30) NULL DEFAULT 'Pending' AFTER finance_status;
    `);
    await queryRunner.query(`
      ALTER TABLE vouchers ADD COLUMN sfdc_push_attempted BOOLEAN NOT NULL DEFAULT false AFTER is_lead_created;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop index
    await queryRunner.query(`
      DROP INDEX idx_bookings_voucher_id ON bookings
    `);

    // Step 2: Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE bookings
      DROP FOREIGN KEY fk_bookings_voucher
    `);

    // Step 3: Drop column
    await queryRunner.query(`
      ALTER TABLE bookings DROP COLUMN voucher_id
    `);
    await queryRunner.query(`
      ALTER TABLE bookings DROP COLUMN campaign_id
    `);
    await queryRunner.query(`
      ALTER TABLE vouchers DROP COLUMN booking_status
    `);
  }
}
