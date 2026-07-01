import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundDocumentsInVoucher1772273430328 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`vouchers\` ADD COLUMN \`refund_documents\` JSON NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`vouchers\` DROP COLUMN \`refund_documents\`;`,
    );
  }
}
