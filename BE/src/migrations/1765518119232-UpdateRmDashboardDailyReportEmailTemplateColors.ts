import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRmDashboardDailyReportEmailTemplateColors1765518119232 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE email_templates 
      SET body = CONCAT(
        '<div style="padding-top: 30px; margin-bottom: 0;"></div>',
        REPLACE(
          REPLACE(body, '#3b78d8', '#0F4761'),
          '#fff28a',
          '#F2F2F2'
        ),
        '<div style="padding-bottom: 30px; margin-top: 0;"></div>'
      ),
      updated_at = NOW()
      WHERE event = 'rm_dashboard_daily_report'
        AND body NOT LIKE '<div style="padding-top: 30px;%';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE email_templates 
      SET body = TRIM(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(body, '<div style="padding-top: 30px; margin-bottom: 0;"></div>', ''),
              '<div style="padding-bottom: 30px; margin-top: 0;"></div>',
              ''
            ),
            '#0F4761',
            '#3b78d8'
          ),
          '#F2F2F2',
          '#fff28a'
        )
      ),
      updated_at = NOW()
      WHERE event = 'rm_dashboard_daily_report';
    `);
  }
}
