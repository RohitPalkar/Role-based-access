import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivatedAtToVouchers1767889440949 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the activated_at column
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN activated_at TIMESTAMP NULL DEFAULT NULL
        AFTER checked_at
    `);

    // Update existing records: copy checked_at to activated_at where checked_at is not null
    // Keep checked_at unchanged
    await queryRunner.query(`
      UPDATE vouchers
      SET activated_at = checked_at
      WHERE checked_at IS NOT NULL
      AND activated_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN activated_at
    `);
  }
}
