import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsUnitMappedToVoucherPayments1757600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD COLUMN is_unit_mapped BOOLEAN DEFAULT false NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE voucher_payments
      DROP COLUMN is_unit_mapped
    `);
  }
}
