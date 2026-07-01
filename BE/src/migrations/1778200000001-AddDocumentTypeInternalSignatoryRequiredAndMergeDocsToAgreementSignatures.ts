import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentTypeInternalSignatoryRequiredAndMergeDocsToAgreementSignatures1778200000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE agreement_signatures
      ADD COLUMN document_type VARCHAR(100) NULL AFTER documents,
      ADD COLUMN internal_signatory_required tinyint(1) NOT NULL DEFAULT 0 AFTER document_type,
      ADD COLUMN merge_docs tinyint(1) NOT NULL DEFAULT 0 AFTER internal_signatory_required`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE agreement_signatures,
      DROP COLUMN merge_docs,
      DROP COLUMN internal_signatory_required,
      DROP COLUMN document_type`,
    );
  }
}
