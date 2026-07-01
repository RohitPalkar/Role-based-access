import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertCancellationApprovedEmailTemplate1772453582283 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
            VALUES (
              'cancellation_approved',
              'Cancellation Request Approved – {PRID}',
              '<p>Dear Team,</p>
      
              <p>
              The cancellation request for <strong>{CUSTOMER_NAME}</strong> 
              (<strong>{PRID}</strong>) has been approved by <strong>{RSH_NAME}</strong>.
              </p>
      
              <p><strong>Cancellation Details:</strong></p>
      
              <p>
              <strong>PRID:</strong> {PRID}<br/>
              <strong>Requested By:</strong> {RM_NAME}<br/>
              <strong>Requested Date:</strong> {REQUESTED_DATE}<br/>
              <strong>Approved On:</strong> {APPROVED_DATE}<br/>
              <strong>Payment Status:</strong> {PAYMENT_STATUS}
              </p>
      
              <p>
              Please proceed with the necessary closure and refund actions as applicable.
              </p>
      
              <p>
              Regards,<br/>
              Puravankara System Notification
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
        WHERE event = 'cancellation_approved';
      `);
  }
}
