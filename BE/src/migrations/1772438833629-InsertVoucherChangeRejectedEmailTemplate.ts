import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertVoucherChangeRejectedEmailTemplate1772438833629 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'voucher_change_rejected',
        'Request Rejected | PRID {prid}',
        '<p>Dear Team,</p>
        <p>The request raised for the below lead has been reviewed and cannot be approved at this time.</p>
        <p>────────────────────────────</p>
        <p>🔹 Lead Details</p>
        <p>PRID: {prid}</p>
        <p>Customer Name: {customer_name}</p>
        <p>────────────────────────────</p>
        <p>🔹 Reason for Rejection</p>
        <p>{mis_comments}</p>',
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
      WHERE event = 'voucher_change_rejected';
    `);
  }
}
