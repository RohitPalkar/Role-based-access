import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModifyBookingEntities1762239723094 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE bookings 
                CHANGE COLUMN fillingAs fillingAs INT NOT NULL DEFAULT 1 `,
    );

    await queryRunner.query(
      `ALTER TABLE bookings 
                ADD COLUMN groupId CHAR(36) NULL DEFAULT NULL AFTER closing_rm_id`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE bookings 
                CHANGE COLUMN fillingAs fillingAs INT NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE bookings 
                DROP COLUMN groupId`,
    );
  }
}
