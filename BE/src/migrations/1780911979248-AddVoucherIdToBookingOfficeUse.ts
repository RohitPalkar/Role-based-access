import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoucherIdToBookingOfficeUse1780911979248 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE booking_office_use
            ADD COLUMN voucher_id INT NULL
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE booking_office_use
            DROP COLUMN voucher_id
          `);
  }
}
