import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertCancellationEmailTemplate1772442441944 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
            VALUES (
              'crm_cancellation_request',
              'Cancellation & Refund Confirmation - {PRID}',
              '<p>Dear {CUSTOMER_NAME},</p>
      
      <p>Your cancellation request has been approved &amp; refund has been processed.</p>
      
      <p><strong>Please find the refund details below:</strong></p>
      
      <p>
      <strong>PRID:</strong> {PRID}<br/>
      <strong>Refund Amount:</strong> ₹{REFUND_AMOUNT}
      </p>
      
      <p>
      <strong>Refund Cheque Copy:</strong><br/>
      <a href="{REFUND_CHEQUE_LINK}" target="_blank">
      View Refund Cheque Copy
      </a>
      </p>
      
      <p>
      <strong>Deposit Slip:</strong><br/>
      <a href="{DEPOSIT_SLIP_LINK}" target="_blank">
      View Deposit Slip
      </a>
      </p>
      
      <p>
      <strong>Acknowledgement Form:</strong><br/>
      <a href="{ACKNOWLEDGEMENT_LINK}" target="_blank">
      View Acknowledgement Form
      </a>
      </p>
      
      <p>Please get in touch with your Relationship Manager for more information.</p>
      
      <p>Regards,<br/>
      Team Puravankara</p>',
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
        WHERE event = 'voucher_cancelled';
      `);
  }
}
