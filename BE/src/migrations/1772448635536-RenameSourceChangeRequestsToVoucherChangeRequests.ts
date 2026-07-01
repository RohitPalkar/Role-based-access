import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSourceChangeRequestsToVoucherChangeRequests1772448635536 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the table
    await queryRunner.query(`
      RENAME TABLE source_change_requests TO voucher_change_requests;
    `);

    // Update the email template event name
    await queryRunner.query(`
      UPDATE email_templates 
      SET event = 'voucher_change_request_approval',
          updated_at = NOW()
      WHERE event = 'source_change_request_approval';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the email template event name
    await queryRunner.query(`
      UPDATE email_templates 
      SET event = 'source_change_request_approval',
          updated_at = NOW()
      WHERE event = 'voucher_change_request_approval';
    `);

    // Revert the table name
    await queryRunner.query(`
      RENAME TABLE voucher_change_requests TO source_change_requests;
    `);
  }
}
