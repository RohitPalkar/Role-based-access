import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletionColumnsToVouchers1764001234567 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER form_phase,
      ADD COLUMN deletion_remarks JSON NULL AFTER is_deleted;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN deletion_remarks,
      DROP COLUMN is_deleted;
    `);
  }
}
