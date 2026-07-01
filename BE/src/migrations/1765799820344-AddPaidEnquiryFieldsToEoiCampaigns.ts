import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaidEnquiryFieldsToEoiCampaigns1765799820344 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add voucher_id_initials column to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN voucher_id_initials VARCHAR(255) NULL AFTER enquiry_initials;
    `);

    // Add voucher_id_counter column to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN voucher_id_counter INT DEFAULT 0 AFTER enquiry_counter;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove voucher_id_counter column from eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN voucher_id_counter;
    `);

    // Remove voucher_id_initials column from eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN voucher_id_initials;
    `);
  }
}
