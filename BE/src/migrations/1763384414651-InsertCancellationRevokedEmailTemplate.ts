import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertCancellationRevokedEmailTemplate1763384414651 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'cancellation_revoked',
        'Cancellation Revoked',
        '<p>Dear {CUSTOMER_NAME},</p>
        <p>Your cancellation request has been revoked successfully.</p>
        <p><a href="{VOUCHER_FORM_LINK}" style="color: #0066cc; text-decoration: underline;">Click here to view your voucher</a></p>
        <p>Regards,<br>Team Puravankara</p>',
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
      WHERE event = 'cancellation_revoked';
    `);
  }
}
