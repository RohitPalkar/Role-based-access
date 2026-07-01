import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaidVoucherIdToVouchers1765867180927 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN paid_voucher_id VARCHAR(255) NULL AFTER queue_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN paid_voucher_id
    `);
  }
}
