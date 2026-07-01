import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsNinePercentAgreementInBookings1772716268644 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE bookings ADD is_nine_percent_agreement TINYINT(1) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE bookings DROP COLUMN is_nine_percent_agreement`,
    );
  }
}
