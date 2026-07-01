import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusCodeToDecentroLogs1758889005226 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`decentro_logs\`
      ADD COLUMN \`status_code\` VARCHAR(255) NULL AFTER \`id\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`decentro_logs\`
      DROP COLUMN \`status_code\`
    `);
  }
}
