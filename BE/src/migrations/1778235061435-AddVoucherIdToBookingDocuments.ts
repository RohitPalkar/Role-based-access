import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoucherIdToBookingDocuments1778235061435 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE booking_documents
            ADD COLUMN voucher_id INT NULL AFTER opportunity_id
          `);

    await queryRunner.query(`
            ALTER TABLE booking_office_use
            ADD COLUMN agreement_value DECIMAL(15,2) NULL,
            ADD COLUMN booking_amount INT NULL
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE booking_documents
    DROP COLUMN voucher_id
  `);
    await queryRunner.query(`
   ALTER TABLE booking_office_use
        DROP COLUMN agreement_value,
        DROP COLUMN booking_amount
  `);
  }
}
