import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertVoucherChangeApprovedEmailTemplate1772440730858 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'voucher_change_approved',
        'Request Approved | PRID {prid}',
        '<p>Dear Team,</p>
        <p>The requested changes for the below lead have been reviewed and approved. Kindly refer the approval attached.</p>
        <p>────────────────────────────</p>
        <p>🔹 Lead Details</p>
        <p>PRID: {prid}</p>
        <p>Customer Name: {customer_name}</p>
        <p>────────────────────────────</p>
        <p>🔹 Approved Changes</p>
        {APPROVED_CHANGES}
        <p>────────────────────────────</p>
        <p>🔹 Approver''s Remarks</p>
        <p>{mis_comments}</p>
        <p>The changes have been successfully updated in the system.</p>
        <p>For any further clarifications, please reach out to the MIS team.</p>',
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
      WHERE event = 'voucher_change_approved';
    `);
  }
}
