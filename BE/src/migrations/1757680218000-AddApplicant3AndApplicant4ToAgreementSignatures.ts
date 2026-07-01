import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicant3AndApplicant4ToAgreementSignatures1757680218000 implements MigrationInterface {
  name = 'AddApplicant3AndApplicant4ToAgreementSignatures1757680218000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add applicant3 column
    await queryRunner.query(`
      ALTER TABLE \`agreement_signatures\` 
      ADD COLUMN \`applicant3\` JSON NULL
    `);

    // Add applicant4 column
    await queryRunner.query(`
      ALTER TABLE \`agreement_signatures\` 
      ADD COLUMN \`applicant4\` JSON NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove applicant4 column
    await queryRunner.query(`
      ALTER TABLE \`agreement_signatures\` 
      DROP COLUMN \`applicant4\`
    `);

    // Remove applicant3 column
    await queryRunner.query(`
      ALTER TABLE \`agreement_signatures\` 
      DROP COLUMN \`applicant3\`
    `);
  }
}
