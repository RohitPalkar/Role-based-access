import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserActivityLogsTable1756831171885 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE \`user_activity_logs\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`user_id\` INT NULL,
            \`action\` VARCHAR(50) NOT NULL,
            \`entity\` VARCHAR(100) NULL,
            \`entity_id\` VARCHAR(100) NULL,
            \`payload_hash\` VARCHAR(64) NULL,
            \`details\` JSON NULL,
            \`ip_address\` VARCHAR(45) NULL,
            \`device_details\` VARCHAR(255) NULL,
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE \`user_activity_logs\`;
    `);
  }
}
