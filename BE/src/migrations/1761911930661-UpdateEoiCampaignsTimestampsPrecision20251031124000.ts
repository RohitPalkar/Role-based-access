import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEoiCampaignsTimestampsPrecision202510311240001761911930661 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
        MODIFY voucher_start_date TIMESTAMP(6) NULL DEFAULT NULL,
        MODIFY voucher_end_date TIMESTAMP(6) NULL DEFAULT NULL,
        MODIFY eoi_start_date TIMESTAMP(6) NULL DEFAULT NULL,
        MODIFY eoi_end_date TIMESTAMP(6) NULL DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
        MODIFY voucher_start_date TIMESTAMP NULL DEFAULT NULL,
        MODIFY voucher_end_date TIMESTAMP NULL DEFAULT NULL,
        MODIFY eoi_start_date TIMESTAMP NULL DEFAULT NULL,
        MODIFY eoi_end_date TIMESTAMP NULL DEFAULT NULL;
    `);
  }
}
