import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledFromToVouchers1762263451127 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN cancelled_from VARCHAR(50) NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN cancelled_from
    `);
  }
}
