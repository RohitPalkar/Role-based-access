import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQueueIdTimeColumns1766077734191 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
        ADD COLUMN voucher_queue_issued_at TIMESTAMP NULL DEFAULT NULL
          AFTER eoi_issued_at,
        ADD COLUMN eoi_queue_issued_at TIMESTAMP NULL DEFAULT NULL
          AFTER voucher_queue_issued_at
    `);

    await queryRunner.query(`
      UPDATE vouchers
        SET voucher_queue_issued_at = voucher_issued_at
        WHERE voucher_queue_issued_at IS NULL
        AND voucher_issued_at IS NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE vouchers
        SET eoi_queue_issued_at = eoi_issued_at
        WHERE eoi_queue_issued_at IS NULL
        AND eoi_issued_at IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE vouchers
        ADD COLUMN sfdc_enquiry_id VARCHAR(50) NULL DEFAULT NULL
          AFTER user_voucher_tracking_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
        DROP COLUMN voucher_queue_issued_at,
        DROP COLUMN eoi_queue_issued_at
    `);
    await queryRunner.query(`
      ALTER TABLE vouchers
        DROP COLUMN sfdc_enquiry_id
    `);
  }
}
