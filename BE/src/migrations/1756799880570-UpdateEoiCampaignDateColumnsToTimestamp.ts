import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEoiCampaignDateColumnsToTimestamp1756799880570 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_start_date TIMESTAMP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_end_date TIMESTAMP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_start_date DATE NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_end_date DATE NOT NULL
    `);
  }
}
