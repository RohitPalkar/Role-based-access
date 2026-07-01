import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIomStatuses1780667985955 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE iom_statuses (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                label VARCHAR(100) NOT NULL,
                sequence INT NOT NULL,
                allow_edit SMALLINT DEFAULT 0,
                allowed_roles JSON DEFAULT NULL,
                is_deleted SMALLINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL
            ) ENGINE=InnoDB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE iom_statuses`);
  }
}
