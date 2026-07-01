import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPossessionDateToProjectPhases1774422457230 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project_phases
            ADD COLUMN possession_date TIMESTAMP NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE project_phases
            DROP COLUMN possession_date;
        `);
  }
}
