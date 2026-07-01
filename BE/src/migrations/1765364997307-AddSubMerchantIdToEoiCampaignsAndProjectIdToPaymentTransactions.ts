import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubMerchantIdToEoiCampaignsAndProjectIdToPaymentTransactions1765364997307 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add sub_merchant_id column to eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN sub_merchant_id VARCHAR(255) NULL AFTER queue_after_verified;
    `);

    // Add projectId column to payment_transactions table
    await queryRunner.query(`
      ALTER TABLE payment_transactions
      ADD COLUMN projectId INT NULL AFTER gatewayName;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove projectId column from payment_transactions table
    await queryRunner.query(`
      ALTER TABLE payment_transactions
      DROP COLUMN projectId;
    `);

    // Remove sub_merchant_id column from eoi_campaigns table
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP COLUMN sub_merchant_id;
    `);
  }
}
