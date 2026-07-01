import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRmDashboardDailyReportLayoutToPlain1765528521035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE email_templates 
      SET layout = 'plain',
      updated_at = NOW()
      WHERE event = 'rm_dashboard_daily_report';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE email_templates 
      SET layout = 'default',
      updated_at = NOW()
      WHERE event = 'rm_dashboard_daily_report';
    `);
  }
}
