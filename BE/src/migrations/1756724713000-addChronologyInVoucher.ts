import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChronologyInVoucher1756724713000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN chronology VARCHAR(10) DEFAULT 'V' NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN chronology
    `);
  }
}
