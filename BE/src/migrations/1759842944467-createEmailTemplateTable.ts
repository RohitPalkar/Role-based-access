import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailTemplateTable1759842944467 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE email_templates (
            id INT NOT NULL AUTO_INCREMENT,
            event VARCHAR(255) NOT NULL UNIQUE,
            subject VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            layout VARCHAR(50) NOT NULL DEFAULT 'default',
            isActive BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_templates;`);
  }
}
