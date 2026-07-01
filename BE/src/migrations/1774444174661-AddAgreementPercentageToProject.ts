import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgreementPercentageToProject1774444174661 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE projects
            ADD COLUMN agreement_percentage INT NULL;
        `);
    await queryRunner.query(`
            UPDATE projects
            SET agreement_percentage = 9
            WHERE agreement_percentage IS NULL;
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE projects
            DROP COLUMN agreement_percentage;
        `);
  }
}
