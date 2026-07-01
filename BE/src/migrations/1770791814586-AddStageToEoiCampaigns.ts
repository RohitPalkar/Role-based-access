import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStageToEoiCampaigns1770791814586 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add stage column to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN stage ENUM('Launch', 'Pre-fill Booking Form') NOT NULL DEFAULT 'Pre-fill Booking Form' AFTER phase
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove stage column
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN stage
    `);
  }
}
