import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndicativeBasePriceToEoiCampaigns1762000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN indicative_base_price VARCHAR(255) NULL AFTER account_details;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN indicative_base_price;
    `);
  }
}
