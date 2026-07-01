import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAllVerifiedToEoiCampaigns1763534350563 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN queue_after_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER status;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN queue_after_verified;
    `);
  }
}
