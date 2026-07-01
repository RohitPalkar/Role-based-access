import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameApplicantNumberToRequestBodyInDecentroLogs1758721568086 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`decentro_logs\` 
      DROP COLUMN \`applicant_number\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`decentro_logs\` 
      ADD COLUMN \`request_body\` JSON DEFAULT NULL AFTER \`request_payload\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`decentro_logs\` 
      DROP COLUMN \`request_body\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`decentro_logs\` 
      ADD COLUMN \`applicant_number\` int AFTER \`opportunity_id\`
    `);
  }
}
