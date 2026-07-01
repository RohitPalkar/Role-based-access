import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewColumnsToVoucherPayments1757100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD COLUMN realisation_date TIMESTAMP NULL
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD COLUMN receipt_no INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD COLUMN comments TEXT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD COLUMN processed_by INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD CONSTRAINT fk_voucher_payments_processed_by
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE voucher_payments
      DROP FOREIGN KEY fk_voucher_payments_processed_by
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      DROP COLUMN processed_by
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      DROP COLUMN comments
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      DROP COLUMN receipt_no
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      DROP COLUMN realisation_date
    `);
  }
}
