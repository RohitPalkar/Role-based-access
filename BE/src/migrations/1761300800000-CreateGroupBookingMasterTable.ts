import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupBookingMasterTable1761300800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE group_booking_master (
            id CHAR(36) NOT NULL PRIMARY KEY,
            group_name VARCHAR(255) NOT NULL UNIQUE,
            no_of_units INT NOT NULL DEFAULT 2,
            grouped_oppo_id JSON NULL,
            payment_method VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            status VARCHAR(45) NOT NULL DEFAULT 'not signed',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS group_booking_master;
    `);
  }
}
