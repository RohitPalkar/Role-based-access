import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvailableGatewaysAndRazorpayFieldsToEoiCampaignsAndProjects1773824088483 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE eoi_campaigns
            ADD COLUMN available_gateways JSON  NULL,
            ADD COLUMN razorpay_key VARCHAR(255) NULL,
            ADD COLUMN razorpay_secret VARCHAR(255) NULL
          `);

    await queryRunner.query(`
            ALTER TABLE projects
            ADD COLUMN available_gateways JSON  NULL,
            ADD COLUMN razorpay_key VARCHAR(255) NULL,
            ADD COLUMN razorpay_secret VARCHAR(255) NULL
          `);

    await queryRunner.query(`
      UPDATE payment_transactions
      SET gatewayName = CASE
        WHEN gatewayName = 'razorpay' THEN 'Razorpay'
        WHEN gatewayName = 'easebuzz' THEN 'Easebuzz'
        ELSE gatewayName
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE eoi_campaigns
        DROP COLUMN available_gateways,
        DROP COLUMN razorpay_key,
        DROP COLUMN razorpay_secret
      `);

    await queryRunner.query(`
        ALTER TABLE projects
        DROP COLUMN available_gateways,
        DROP COLUMN razorpay_key,
        DROP COLUMN razorpay_secret
      `);

    await queryRunner.query(`
        UPDATE payment_transactions
        SET gatewayName = CASE
          WHEN gatewayName = 'Razorpay' THEN 'razorpay'
          WHEN gatewayName = 'Easebuzz' THEN 'easebuzz'
          ELSE gatewayName
        END
      `);
  }
}
