import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEoiCampaignsTable1761560959000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN brand_id INT NULL AFTER phase,
      ADD COLUMN city_id INT NULL AFTER brand_id,
      ADD COLUMN push_to_sfdc BOOLEAN NOT NULL DEFAULT FALSE AFTER city_id,
      ADD COLUMN sfdc_project_name VARCHAR(255) NULL AFTER push_to_sfdc,
      ADD COLUMN development_type_id INT NULL AFTER sfdc_project_name,
      ADD COLUMN inventory_type_id INT NULL AFTER development_type_id,
      ADD COLUMN sba_range VARCHAR(255) NULL AFTER inventory_type_id,
      ADD COLUMN price_range VARCHAR(255) NULL AFTER sba_range,
      ADD COLUMN account_details JSON NULL AFTER price_range,
      ADD COLUMN form_type ENUM('Basic', 'KYC') NOT NULL AFTER account_details,
      ADD COLUMN voucher_amount DECIMAL(12,2) NOT NULL AFTER form_type,
      ADD COLUMN voucher_terms_and_condition TEXT NULL AFTER voucher_amount,
      ADD COLUMN eoi_terms_and_condition TEXT NULL AFTER voucher_terms_and_condition,
      ADD COLUMN eoi_start_date TIMESTAMP NULL AFTER eoi_terms_and_condition,
      ADD COLUMN eoi_end_date TIMESTAMP NULL AFTER eoi_start_date,
      ADD COLUMN eoi_type JSON NULL AFTER eoi_end_date,
      ADD COLUMN std_eoi_amount DECIMAL(12,2) NULL AFTER eoi_type,
      ADD COLUMN pre_eoi_amount DECIMAL(12,2) NULL AFTER std_eoi_amount;
    `);

    // Modify phase column to array type
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN phase JSON NOT NULL;
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD CONSTRAINT fk_eoi_campaigns_brand 
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD CONSTRAINT fk_eoi_campaigns_city 
      FOREIGN KEY (city_id) REFERENCES city_master(id) ON DELETE RESTRICT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP FOREIGN KEY fk_eoi_campaigns_city;
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP FOREIGN KEY fk_eoi_campaigns_brand;
    `);

    // Revert phase column
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN phase ENUM('VOUCHER', 'EOI') NOT NULL DEFAULT 'VOUCHER';
    `);

    // Drop added columns
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN pre_eoi_amount,
      DROP COLUMN std_eoi_amount,
      DROP COLUMN eoi_type,
      DROP COLUMN eoi_end_date,
      DROP COLUMN eoi_start_date,
      DROP COLUMN eoi_terms_and_condition,
      DROP COLUMN voucher_terms_and_condition,
      DROP COLUMN voucher_amount,
      DROP COLUMN form_type,
      DROP COLUMN account_details,
      DROP COLUMN price_range,
      DROP COLUMN sba_range,
      DROP COLUMN inventory_type_id,
      DROP COLUMN development_type_id,
      DROP COLUMN sfdc_project_name,
      DROP COLUMN push_to_sfdc,
      DROP COLUMN city_id,
      DROP COLUMN brand_id;
    `);

    // Drop master tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS inventory_type_master;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS development_type_master;
    `);
  }
}
