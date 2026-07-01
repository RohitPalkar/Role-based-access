import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDigitallyFromOfficeUseReminderEmailTemplate1773764745706 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE email_templates
      SET body = REPLACE(body, 'filled and digitally signed', 'filled and signed'),
          updated_at = NOW()
      WHERE event = 'office_use_reminder';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE email_templates
      SET body = REPLACE(body, 'filled and signed', 'filled and digitally signed'),
          updated_at = NOW()
      WHERE event = 'office_use_reminder';
    `);
  }
}
