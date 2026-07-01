import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTransactionIdToBookingPayments1777000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE booking_payments
      ADD COLUMN payment_transaction_id INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE booking_payments
      ADD CONSTRAINT fk_booking_payment_tx
      FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
        ALTER TABLE booking_payments
        ADD CONSTRAINT unique_booking_payment_tx
        UNIQUE (payment_transaction_id);
    `);

    await queryRunner.query(`
        UPDATE booking_payments bp
        JOIN payment_transactions pt
        ON JSON_UNQUOTE(JSON_EXTRACT(bp.payment_details, '$.gatewayPaymentId')) = pt.gatewayPaymentId
        SET bp.payment_transaction_id = pt.id
        WHERE bp.payment_transaction_id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE booking_payments
      DROP FOREIGN KEY fk_booking_payment_tx
    `);

    await queryRunner.query(`
      ALTER TABLE booking_payments
      DROP FOREIGN KEY unique_booking_payment_tx
    `);

    await queryRunner.query(`
      ALTER TABLE booking_payments
      DROP COLUMN payment_transaction_id
    `);
  }
}
