import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCxSignedDigitallyToCxSigned1777991330212 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE agreement_signatures
            SET document_status = 'Cx: Signed'
            WHERE document_status = 'Cx: Signed - Digitally'
          `);
  }

  public async down(): Promise<void> {
    // No revert required
  }
}
