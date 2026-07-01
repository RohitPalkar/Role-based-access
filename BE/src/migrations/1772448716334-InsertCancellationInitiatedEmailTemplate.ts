import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertCancellationInitiatedEmailTemplate1772448716334 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
            VALUES (
              'crm_cancellation_initiated',
              'Cancellation Request Initiated',
              '<p>Dear {RM_NAME},</p>
      
              <p>We have received your request for cancellation &amp; initiated the process. We will keep you posted.</p>
              
              <p>Warm Regards,<br/>
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
        WHERE event = 'crm_cancellation_initiated';
      `);
  }
}
