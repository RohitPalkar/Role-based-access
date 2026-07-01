import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnableEOIsAllRmsToEoiCampaign1772613448000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE eoi_campaigns ADD enable_eois_all_rms tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE eoi_campaigns DROP COLUMN enable_eois_all_rms`,
    );
  }
}
