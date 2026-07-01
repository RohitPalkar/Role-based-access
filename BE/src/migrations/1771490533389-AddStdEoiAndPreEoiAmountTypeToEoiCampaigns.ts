import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStdEoiAndPreEoiAmountTypeToEoiCampaigns1771490533389 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make voucher_amount_type nullable
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_amount_type VARCHAR(15) NULL
    `);

    // Add std_eoi_amount_type to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN std_eoi_amount_type VARCHAR(15) NULL AFTER voucher_amount_type
    `);

    // Add pre_eoi_amount_type to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN pre_eoi_amount_type VARCHAR(15) NULL AFTER std_eoi_amount_type
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN pre_eoi_amount_type
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN std_eoi_amount_type
    `);

    // Revert voucher_amount_type to NOT NULL with default
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_amount_type VARCHAR(15) NOT NULL DEFAULT 'Fixed'
    `);
  }
}
