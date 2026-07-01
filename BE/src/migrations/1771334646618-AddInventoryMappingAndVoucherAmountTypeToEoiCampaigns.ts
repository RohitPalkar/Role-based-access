import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryMappingAndVoucherAmountTypeToEoiCampaigns1771334646618 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_inventory_mapped to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN is_inventory_mapped BOOLEAN NOT NULL DEFAULT false AFTER unit_pref_static_content
    `);

    // Add unit_source_type to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN unit_source_type VARCHAR(15) NOT NULL DEFAULT 'SFDC' AFTER is_inventory_mapped
    `);

    // Add voucher_amount_type to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN voucher_amount_type VARCHAR(15) NOT NULL DEFAULT 'Fixed' AFTER unit_source_type
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN voucher_amount_type
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN unit_source_type
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN is_inventory_mapped
    `);
  }
}
