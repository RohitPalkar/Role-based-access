import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSfdcLeadStatusToVouchers1766574880618 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      ADD COLUMN sfdc_lead_status VARCHAR(255) NULL DEFAULT NULL
        AFTER sfdc_enquiry_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vouchers
      DROP COLUMN sfdc_lead_status;
    `);
  }
}
