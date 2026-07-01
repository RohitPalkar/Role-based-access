import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentNameToAgreementSignature1776781598512 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE agreement_signatures
            ADD COLUMN document_name VARCHAR(100) NULL
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE agreement_signatures
        DROP COLUMN document_name
      `);
  }
}
