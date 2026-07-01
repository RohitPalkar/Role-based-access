import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelReasonInVoucher1756474247362 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN cancel_reason VARCHAR(500) NULL,
      ADD COLUMN cancelled_by INT NULL,
      ADD COLUMN cancelled_at DATETIME(3) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN cancel_reason,
      DROP COLUMN cancelled_by,
      DROP COLUMN cancelled_at
    `);
  }
}
