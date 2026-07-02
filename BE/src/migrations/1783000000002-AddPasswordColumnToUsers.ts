import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordColumnToUsers1783000000002 implements MigrationInterface {
  name = 'AddPasswordColumnToUsers1783000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`password\` VARCHAR(255) NULL AFTER \`email\`,
      ADD INDEX \`idx_users_password\` (\`password\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP INDEX \`idx_users_password\`,
      DROP COLUMN \`password\`
    `);
  }
}