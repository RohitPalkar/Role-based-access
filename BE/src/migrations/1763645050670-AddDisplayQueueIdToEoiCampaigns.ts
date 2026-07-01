import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisplayQueueIdToEoiCampaigns1763645050670 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN display_queue_id VARCHAR(255) NOT NULL DEFAULT '' AFTER queue_after_verified;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN display_queue_id;
    `);
  }
}
