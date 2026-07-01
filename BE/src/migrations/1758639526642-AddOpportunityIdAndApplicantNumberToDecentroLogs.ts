import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpportunityIdAndApplicantNumberToDecentroLogs1758639526642 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add opportunity_id column
    await queryRunner.query(`
            ALTER TABLE \`decentro_logs\` 
            ADD COLUMN \`opportunity_id\` varchar(255) NOT NULL DEFAULT '' AFTER \`reference_id\`
        `);

    // Add applicant_number column
    await queryRunner.query(`
            ALTER TABLE \`decentro_logs\` 
            ADD COLUMN \`applicant_number\` int AFTER \`opportunity_id\`
        `);

    // Create index on opportunity_id for better query performance
    await queryRunner.query(`
            CREATE INDEX \`IDX_decentro_logs_opportunity_id\` 
            ON \`decentro_logs\` (\`opportunity_id\`)
        `);

    // Create index on reference_id and opportunity_id combination for webhook lookups
    await queryRunner.query(`
            CREATE INDEX \`IDX_decentro_logs_reference_opportunity\` 
            ON \`decentro_logs\` (\`reference_id\`, \`opportunity_id\`)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
            DROP INDEX \`IDX_decentro_logs_reference_opportunity\`
        `);

    await queryRunner.query(`
            DROP INDEX \`IDX_decentro_logs_opportunity_id\`
        `);

    // Drop columns
    await queryRunner.query(`
            ALTER TABLE \`decentro_logs\` 
            DROP COLUMN \`applicant_number\`
        `);

    await queryRunner.query(`
            ALTER TABLE \`decentro_logs\` 
            DROP COLUMN \`opportunity_id\`
        `);
  }
}
