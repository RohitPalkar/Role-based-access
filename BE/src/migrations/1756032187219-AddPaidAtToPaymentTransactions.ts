import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaidAtToPaymentTransactions1756032187219 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_transactions ADD COLUMN paid_at DATETIME(3) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('payment_transactions', 'paid_at');
  }
}
