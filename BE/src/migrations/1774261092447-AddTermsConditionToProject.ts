import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTermsConditionToProject1774261092447 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE projects 
            ADD COLUMN terms_conditions TEXT NULL
        `);
    await queryRunner.query(`
            UPDATE projects 
            SET terms_conditions = 'provident_terms'
            WHERE brand_id = 27
          `);

    await queryRunner.query(`
            UPDATE projects 
            SET terms_conditions = 'puravankara_land_terms'
            WHERE brand_id = 28
          `);

    await queryRunner.query(`
            UPDATE projects 
            SET terms_conditions = 'puravankara_terms'
            WHERE brand_id = 29
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE projects 
            DROP COLUMN terms_conditions
        `);
  }
}
