import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectIdInProjectTerms1773118445515 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE project_terms ADD project_id INT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project_terms DROP COLUMN project_id`);
  }
}
