import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgreementIdToAgreementSignatures1758526761679 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`agreement_signatures\` 
      ADD COLUMN \`agreement_id\` VARCHAR(255) NOT NULL UNIQUE AFTER \`id\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`agreement_signatures\` 
      DROP COLUMN \`agreement_id\`
    `);
  }
}
