import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTypeInVoucherPayments1757500907568 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE voucher_payments
        ADD COLUMN payment_type ENUM('Customer', 'Refund') NOT NULL DEFAULT 'Customer' AFTER status
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE voucher_payments
        DROP COLUMN payment_type
    `);
  }
}
