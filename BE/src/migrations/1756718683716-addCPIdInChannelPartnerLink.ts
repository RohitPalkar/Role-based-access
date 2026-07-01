import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCPIdInChannelPartnerLink1756718683716 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE channel_partners ADD COLUMN sfdc_cp_id VARCHAR(50) NULL DEFAULT NULL AFTER pan_number;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE channel_partners DROP COLUMN sfdc_cp_id`,
    );
  }
}
