import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIomNumberAndDate1781263399490 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE ioms
                ADD COLUMN iom_no VARCHAR(50) NULL COMMENT 'Human readable IOM number' AFTER id,
                ADD COLUMN payment_15_percent_received_at TIMESTAMP NULL COMMENT 'Date when minimum (15%) payment was received' AFTER brokerage_percentage,
                ADD UNIQUE KEY uq_iom_no (iom_no)
            `);

    await queryRunner.query(`
            ALTER TABLE iom_invoice_details
                ADD COLUMN invoice_id VARCHAR(50) NULL COMMENT 'Human readable invoice id genered by system' AFTER ID
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE ioms
            DROP COLUMN iom_no,
            DROP COLUMN payment_15_percent_received_at
        `);

    await queryRunner.query(`
        ALTER TABLE iom_invoice_details
            DROP COLUMN invoice_id
        `);
  }
}
