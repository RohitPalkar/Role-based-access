import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReceiptImageToVoucherPayments1775561673738 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE voucher_payments
            ADD COLUMN receipt_image VARCHAR(255) NULL
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE voucher_payments
            DROP COLUMN receipt_image
          `);
  }
}
