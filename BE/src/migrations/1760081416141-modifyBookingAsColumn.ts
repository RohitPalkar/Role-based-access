import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyBookingAsColumn1760081416141 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE bookings SET booking_as = 'Individual' WHERE booking_as = 'Individuals';`,
    );

    await queryRunner.query(`ALTER TABLE bookings
MODIFY COLUMN booking_as ENUM('Individual', 'Corporate', 'Partnership Firm')
NOT NULL DEFAULT 'Individual';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE bookings SET booking_as = 'Individuals' WHERE booking_as = 'Individual';`,
    );
    await queryRunner.query(`ALTER TABLE bookings
MODIFY COLUMN booking_as ENUM('Individuals', 'Corporate', 'Partnership Firm')
NOT NULL DEFAULT 'Individuals';`);
  }
}
