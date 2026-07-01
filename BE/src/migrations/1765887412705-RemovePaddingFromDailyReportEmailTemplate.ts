import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePaddingFromDailyReportEmailTemplate1765887412705 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove padding divs from the top and bottom of the email template body
    await queryRunner.query(`
      UPDATE email_templates 
      SET body = TRIM(
        REPLACE(
          REPLACE(
            body,
            '<div style="padding-top: 30px; margin-bottom: 0;"></div>',
            ''
          ),
          '<div style="padding-bottom: 30px; margin-top: 0;"></div>',
          ''
        )
      ),
      updated_at = NOW()
      WHERE event = 'rm_dashboard_daily_report'
        AND (body LIKE '%<div style="padding-top: 30px;%' OR body LIKE '%<div style="padding-bottom: 30px;%');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore padding divs at the top and bottom
    await queryRunner.query(`
      UPDATE email_templates 
      SET body = CONCAT(
        '<div style="padding-top: 30px; margin-bottom: 0;"></div>',
        body,
        '<div style="padding-bottom: 30px; margin-top: 0;"></div>'
      ),
      updated_at = NOW()
      WHERE event = 'rm_dashboard_daily_report'
        AND body NOT LIKE '<div style="padding-top: 30px;%';
    `);
  }
}
