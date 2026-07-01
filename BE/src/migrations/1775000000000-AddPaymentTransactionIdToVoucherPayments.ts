import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTransactionIdToVoucherPayments1775000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_transactions ADD CONSTRAINT unique_gateway_tx  UNIQUE (gatewayName, gatewayPaymentId);
    `);
    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD COLUMN payment_transaction_id INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD CONSTRAINT fk_voucher_payments_payment_transaction_id
      FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
        ALTER TABLE voucher_payments
        ADD CONSTRAINT unique_payment_tx
        UNIQUE (payment_transaction_id);
    `);

    await queryRunner.query(`
        UPDATE voucher_payments vp
        JOIN payment_transactions pt
        ON JSON_UNQUOTE(JSON_EXTRACT(vp.payment_details, '$.gatewayPaymentId')) = pt.gatewayPaymentId
        SET vp.payment_transaction_id = pt.id
        WHERE vp.payment_transaction_id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_transactions DROP FOREIGN KEY unique_gateway_tx;
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments DROP FOREIGN KEY unique_payment_tx;
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments
      DROP FOREIGN KEY fk_voucher_payments_payment_transaction_id;
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_payments DROP COLUMN payment_transaction_id;
    `);
  }
}
