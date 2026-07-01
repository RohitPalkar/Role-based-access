import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConvertRemarksToVoucher1762000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN convert_remarks VARCHAR(500) NULL after checker_remarks;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN convert_remarks;
    `);
  }
}
