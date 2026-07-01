import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertPaymentConfirmationEmailTemplate1763032309841 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'payment_confirmation',
        'Payment Confirmation – Purva Voucher',
        '<p>Dear {CUSTOMER_NAME},</p>
        <p>We have received your payment of ₹ {AMOUNT} made through {PAYMENT_MODE} for the Purva Voucher.</p>
        <h3>Transaction Details:</h3>
        <ul>
          <li><strong>Transaction ID:</strong> {TRANSACTION_ID}</li>
          <li><strong>Date:</strong> {DATE}</li>
        </ul>
        <p>Verification is in progress, and we''ll notify you once completed.</p>
        <p>Warm Regards,<br>Team Puravankara</p>',
        'default',
        TRUE,
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        subject = VALUES(subject),
        body = VALUES(body),
        updated_at = NOW();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM email_templates
      WHERE event = 'payment_confirmation';
    `);
  }
}
