import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `voucher_transaction_id`: stable business transaction reference for finance export / bulk update.
 * Backfilled from existing `payment_details` JSON using the same field order as application code.
 */
export class AddVoucherTransactionIdToVoucherPayments1778100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE voucher_payments
      ADD COLUMN voucher_transaction_id VARCHAR(255) NULL
        COMMENT 'Business txn ref: transactionNumber / chequeNumber / gatewayPaymentId / etc.'
    `);

    // Backfill: same precedence as deriveVoucherTransactionIdFromPaymentDetails()
    await queryRunner.query(`
      UPDATE voucher_payments
      SET voucher_transaction_id = TRIM(
        COALESCE(
          NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payment_details, '$.transactionNumber'))), ''),
          NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payment_details, '$.chequeNumber'))), ''),
          NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payment_details, '$.gatewayPaymentId'))), ''),
          NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payment_details, '$.transactionId'))), ''),
          NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(payment_details, '$.easepayid'))), '')
        )
      )
      WHERE payment_details IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE voucher_payments
      DROP COLUMN voucher_transaction_id
    `);
  }
}
