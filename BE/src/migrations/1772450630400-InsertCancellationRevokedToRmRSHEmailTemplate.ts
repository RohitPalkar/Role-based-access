import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertCancellationRevokedToRmRSHEmailTemplate1772450630400 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
            VALUES (
              'crm_cancellation_revoked',
              'Cancellation Revoked - {PRID}',
              '<p>Dear {RM_NAME},</p>
      
              <p>The cancellation request for <strong>{PRID}</strong> has been revoked successfully.</p>
      
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
        WHERE event = 'crm_cancellation_revoked';
      `);
  }
}
