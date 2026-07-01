import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToEoiCampaigns1761656700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN status ENUM('Active | Voucher', 'Active | EOI') NOT NULL DEFAULT 'Active | Voucher' AFTER pre_eoi_amount
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove status column
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN status
    `);
  }
}
