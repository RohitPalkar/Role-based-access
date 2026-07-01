import { MigrationInterface, QueryRunner } from 'typeorm';

export class RevertPhaseAndSplitFormType1761630520000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Revert phase column from JSON back to ENUM
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN phase ENUM('VOUCHER', 'EOI') NOT NULL DEFAULT 'VOUCHER';
    `);

    // 2. Rename form_type to voucher_form_type
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      CHANGE COLUMN form_type voucher_form_type ENUM('Basic', 'KYC') NULL DEFAULT NULL;
    `);

    // 3. Add eoi_form_type column
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN eoi_form_type ENUM('Basic', 'KYC') NULL DEFAULT NULL AFTER voucher_form_type;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop eoi_form_type column
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN eoi_form_type;
    `);

    // 2. Rename voucher_form_type back to form_type
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      CHANGE COLUMN voucher_form_type form_type ENUM('Basic', 'KYC') NOT NULL;
    `);

    // 3. Change phase column back to JSON
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN phase JSON NOT NULL;
    `);
  }
}
