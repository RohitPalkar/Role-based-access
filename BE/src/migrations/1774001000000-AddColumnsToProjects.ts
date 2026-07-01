import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnsToProjects1774001000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`projects\`
        ADD COLUMN \`company_id\` INT NULL,
        ADD COLUMN \`project_image\` VARCHAR(255) NULL,
        ADD COLUMN \`sfdc_project_name\` VARCHAR(255) NULL,
        ADD COLUMN \`codename\` JSON NULL,
        ADD COLUMN \`jv_partner_logo\` VARCHAR(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`brands\`
        ADD COLUMN \`logo\` VARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`brands\`
        DROP COLUMN \`logo\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`projects\`
        DROP COLUMN \`company_id\`,
        DROP COLUMN \`project_image\`,
        DROP COLUMN \`sfdc_project_name\`,
        DROP COLUMN \`codename\`,
        DROP COLUMN \`jv_partner_logo\`
    `);
  }
}
