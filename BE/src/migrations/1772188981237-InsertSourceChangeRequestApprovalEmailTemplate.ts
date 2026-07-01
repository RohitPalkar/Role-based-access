import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertSourceChangeRequestApprovalEmailTemplate1772188981237 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'source_change_request_approval',
        'Approval Request: Lead Source Change | {PRID}',
        '<p>Dear Team,</p>
        <p>A request has been raised for review and verification in the EOI Dashboard for {PRID}</p>
        <p>Please find the details below:</p>
        <p><strong>Requested Changes</strong></p>
        {CHANGES_DETAILS}
        <p>────────────────────────────</p>
        <p>🔹 Reason for Request</p>
        <p>{RM_REASON}</p>
        <p>Kindly review the request and upload the necessary approval proof to proceed further.</p>
        <p>Regards,<br>{RM_NAME}</p>',
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
      WHERE event = 'source_change_request_approval';
    `);
  }
}
