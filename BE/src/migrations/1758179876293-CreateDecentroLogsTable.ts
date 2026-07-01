import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDecentroLogsTable1758179876293 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE \`decentro_logs\` (
            \`id\` INT NOT NULL AUTO_INCREMENT,
            \`reference_id\` VARCHAR(255) NOT NULL,
            \`request_type\` ENUM('Business Verification','Digilocker','OCR') NOT NULL,
            \`request_payload\` JSON NULL,
            \`response_payload\` JSON NULL,
            \`status\` ENUM('Initiated','Success','Failed','Pending') NOT NULL DEFAULT 'INITIATED',
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE \`decentro_logs\`;
    `);
  }
}
