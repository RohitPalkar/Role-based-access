import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertQueueIdGenerationEmailTemplate1763047817118 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO email_templates (event, subject, body, layout, isActive, created_at, updated_at)
      VALUES (
        'queue_id_generation',
        'Queue ID Assigned',
        '<p>Dear {CUSTOMER_NAME},</p>
        <p>Your Queue ID has been successfully allotted: <strong>{QUEUE_ID}</strong>.</p>
        <p><a href="{THANK_YOU_PAGE_LINK}">Thank you</a></p>
        <p>This Queue ID will be required for future transactions.</p>
        <p>Warm Regards,<br>Team Puravankara</p>',
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
      WHERE event = 'queue_id_generation';
    `);
  }
}
