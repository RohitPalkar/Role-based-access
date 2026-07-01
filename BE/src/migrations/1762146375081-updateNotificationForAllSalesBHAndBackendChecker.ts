import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNotificationForAllSalesBHAndBackendChecker1762146375081 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE notifications 
                ADD COLUMN isForAllBackendCheckers TINYINT(1) NOT NULL DEFAULT '0' AFTER isForAllRm,
                ADD COLUMN isForAllSalesBH TINYINT(1) NOT NULL DEFAULT '0' AFTER isForAllBackendCheckers`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE notifications 
                DROP COLUMN isForAllBackendCheckers,
                DROP COLUMN isForAllSalesBH`,
    );
  }
}
