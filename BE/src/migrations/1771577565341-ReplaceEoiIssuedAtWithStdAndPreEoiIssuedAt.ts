import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceEoiIssuedAtWithStdAndPreEoiIssuedAt1771577565341 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the two new columns: std_eoi_issued_at and pre_eoi_issued_at
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN std_eoi_issued_at TIMESTAMP NULL DEFAULT NULL
      AFTER pre_eoi_id
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN pre_eoi_issued_at TIMESTAMP NULL DEFAULT NULL
      AFTER std_eoi_issued_at
    `);

    // Migrate data from eoi_issued_at to pre_eoi_issued_at where preferential_sequence_id is not null
    // Priority: preferential_sequence_id takes precedence
    await queryRunner.query(`
      UPDATE vouchers
      SET pre_eoi_issued_at = eoi_issued_at
      WHERE eoi_issued_at IS NOT NULL
        AND preferential_sequence_id IS NOT NULL
    `);

    // Migrate data from eoi_issued_at to std_eoi_issued_at where standard_sequence_id is not null
    // This handles cases where only standard_sequence_id exists, or both exist (preferential already updated above)
    await queryRunner.query(`
      UPDATE vouchers
      SET std_eoi_issued_at = eoi_issued_at
      WHERE eoi_issued_at IS NOT NULL
        AND standard_sequence_id IS NOT NULL
    `);

    // Drop the old eoi_issued_at column
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN eoi_issued_at
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the eoi_issued_at column
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN eoi_issued_at TIMESTAMP NULL DEFAULT NULL
      AFTER pre_eoi_issued_at
    `);

    // Migrate data back: prefer pre_eoi_issued_at if it exists, otherwise use std_eoi_issued_at
    await queryRunner.query(`
      UPDATE vouchers
      SET eoi_issued_at = pre_eoi_issued_at
      WHERE pre_eoi_issued_at IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE vouchers
      SET eoi_issued_at = std_eoi_issued_at
      WHERE eoi_issued_at IS NULL
        AND std_eoi_issued_at IS NOT NULL
    `);

    // Drop the new columns
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN pre_eoi_issued_at
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN std_eoi_issued_at
    `);
  }
}
