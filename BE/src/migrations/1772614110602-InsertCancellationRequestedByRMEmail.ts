import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertCancellationRequestedByRMEmail1772614110602 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
            VALUES (
              'rm_cancellation_requested',
              'Cancellation Request - {PRID}',
              '<p>Dear {RSH_NAME},</p>
      
              <p>
              We have received a cancellation request from the customer and request for your approval.
              </p>
      
              <p><strong>Please find the details below:</strong></p>
      
              <p>
              <strong>PRID:</strong> {PRID}<br/>
              <strong>Customer Name:</strong> {CUSTOMER_NAME}<br/>
              <strong>Request Raised Date:</strong> {REQUEST_DATE}<br/>
              <strong>Reason for Cancellation:</strong> {CANCELLATION_REASON}<br/>
              <strong>Payment Status:</strong> {PAYMENT_STATUS}<br/>
              <strong>Created By:</strong> {RM_NAME}
              </p>
      
              <p>
              <strong>Link:</strong>
              <a href="{CANCELLATION_LINK}" target="_blank">
             {CANCELLATION_LINK}
              </a>
              </p>
      
              <p>
              Warm Regards,<br/>
              Team Puravankara
              </p>',
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
        WHERE event = 'rm_cancellation_requested';
      `);
  }
}
