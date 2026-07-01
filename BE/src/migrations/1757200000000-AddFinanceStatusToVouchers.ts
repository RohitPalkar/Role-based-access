import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinanceStatusToVouchers1757200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN finance_status VARCHAR(255) NOT NULL DEFAULT 'Unverified' AFTER payment_status
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN finance_status
    `);
  }
}
