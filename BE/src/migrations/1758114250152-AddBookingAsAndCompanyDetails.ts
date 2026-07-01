import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingAsAndCompanyDetails1726560000000 implements MigrationInterface {
  name = 'AddBookingAsAndCompanyDetails1726560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD COLUMN booking_as ENUM('Individuals','Corporate','Partnership Firm') NOT NULL DEFAULT 'Individuals' AFTER feedback,
      ADD COLUMN company_details JSON NULL AFTER booking_as
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS IDX_bookings_booking_as ON bookings`,
    );
    await queryRunner.query(`
      ALTER TABLE bookings
      DROP COLUMN company_details,
      DROP COLUMN booking_as
    `);
  }
}
