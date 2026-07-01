import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsChangeRequestPendingToVouchers1772025856442 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE vouchers ADD COLUMN is_change_request_pending BOOLEAN NOT NULL DEFAULT FALSE AFTER sfdc_synced_at`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE vouchers DROP COLUMN is_change_request_pending`,
    );
  }
}
