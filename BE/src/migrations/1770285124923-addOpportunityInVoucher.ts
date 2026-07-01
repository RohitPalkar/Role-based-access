import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpportunityInVoucher1770285124923 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE vouchers ADD COLUMN is_lead_created BOOLEAN NOT NULL DEFAULT FALSE',
    );
    await queryRunner.query(
      'ALTER TABLE vouchers ADD COLUMN opportunity_id VARCHAR(50) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE vouchers ADD COLUMN sfdc_synced_at TIMESTAMP NULL DEFAULT NULL',
    );
    await queryRunner.query(
      `ALTER TABLE sfdc_logs ADD COLUMN entity_type VARCHAR(32) NOT NULL DEFAULT 'opportunity', ADD COLUMN batch_id VARCHAR(64) NULL, ADD COLUMN attempt_no INT NOT NULL DEFAULT 1;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE vouchers DROP COLUMN is_lead_created, DROP COLUMN opportunity_id',
    );
  }
}
