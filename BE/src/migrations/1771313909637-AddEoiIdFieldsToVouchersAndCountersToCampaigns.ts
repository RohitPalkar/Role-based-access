import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEoiIdFieldsToVouchersAndCountersToCampaigns1771313909637 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add std_eoi_initials and pre_eoi_initials to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN std_eoi_initials VARCHAR(25) NULL AFTER voucher_id_initials
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN pre_eoi_initials VARCHAR(25) NULL AFTER std_eoi_initials
    `);

    // Add std_eoi_counter and pre_eoi_counter to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN std_eoi_counter INT NOT NULL DEFAULT 0 AFTER voucher_id_counter
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN pre_eoi_counter INT NOT NULL DEFAULT 0 AFTER std_eoi_counter
    `);

    // Add std_eoi_id and pre_eoi_id to vouchers table
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN std_eoi_id VARCHAR(255) NULL AFTER paid_voucher_id
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN pre_eoi_id VARCHAR(255) NULL AFTER std_eoi_id
    `);

    // Add unit_pref_static_content to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN unit_pref_static_content TEXT NULL AFTER eoi_terms_and_condition
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from vouchers table
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN pre_eoi_id
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN std_eoi_id
    `);

    // Remove columns from eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN pre_eoi_counter
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN std_eoi_counter
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN pre_eoi_initials
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN std_eoi_initials
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN unit_pref_static_content
    `);
  }
}
