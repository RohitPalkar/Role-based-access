import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClosingRmIdToOfficeUse1759148349366 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE booking_office_use
        ADD COLUMN closing_rm_id INT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE booking_office_use
        DROP COLUMN closing_rm_id
    `);
  }
}
