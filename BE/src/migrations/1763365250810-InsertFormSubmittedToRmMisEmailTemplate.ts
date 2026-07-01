import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertFormSubmittedToRmMisEmailTemplate1763365250810 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'form_submitted_to_rm_mis',
        'Voucher – Submitted',
        '<p>Dear Team,</p>
        <p>A form has been submitted by {SUBMITTED_BY}.</p>
        <p>Details:</p>
        <p>Customer: {CUSTOMER_NAME}</p>
        <p>Unique Reference ID: {UNIQUE_REFERENCE_ID}</p>
        <p>Kindly review and proceed with verification.</p>
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
      WHERE event = 'form_submitted_to_rm_mis';
    `);
  }
}
