import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRmNameFromAgreementSignatures1758712773509 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the rm_name column from agreement_signatures table
    await queryRunner.query(`
            ALTER TABLE \`agreement_signatures\` 
            DROP COLUMN \`rm_name\`
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the rm_name column if migration is reverted
    await queryRunner.query(`
            ALTER TABLE \`agreement_signatures\` 
            ADD COLUMN \`rm_name\` VARCHAR(255) DEFAULT NULL
        `);
  }
}
