import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertTransactionVerifiedEmailTemplate1763375348896 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'transaction_verified',
        'Transaction Verified Successfully',
        '<p>Dear {CUSTOMER_NAME},</p>
        <p>We have verified your payment of ₹ {AMOUNT} [{TRANSACTION_ID}] for the Purva Voucher.</p>
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
      WHERE event = 'transaction_verified';
    `);
  }
}
