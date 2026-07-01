import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIomInvoiceDetails1780668400538 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE iom_invoice_details (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                iom_ids JSON NOT NULL,
                invoice_number VARCHAR(100) NULL,
                status ENUM('invoice_created','invoice_submitted','invoice_rejected') NOT NULL,
                invoice_requested_at TIMESTAMP NULL,
                invoice_date DATE NULL,
                created_by BIGINT NOT NULL,
                updated_by BIGINT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL
            ) ENGINE=InnoDB;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE iom_invoice_details`);
  }
}
