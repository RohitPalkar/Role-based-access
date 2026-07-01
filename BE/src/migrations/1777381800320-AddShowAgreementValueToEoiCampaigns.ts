import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShowAgreementValueToEoiCampaigns1777381800320 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE eoi_campaigns
        ADD COLUMN show_agreement_value BOOLEAN DEFAULT FALSE
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE eoi_campaigns
        DROP COLUMN show_agreement_value
      `);
  }
}
