import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRazorpayKeyAndSecretInBrand1769673733574 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE brands
      ADD COLUMN razorpay_key VARCHAR(255) NULL AFTER default_policy_id,
      ADD COLUMN razorpay_secret VARCHAR(255) NULL AFTER razorpay_key;
    `);

    await queryRunner.query(`
      ALTER TABLE bookings
      ADD COLUMN brand_id INT NULL AFTER enquiryId,
      ADD COLUMN project_id INT NULL AFTER brand_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE brands
      DROP COLUMN razorpay_key,
      DROP COLUMN razorpay_secret;
    `);
    await queryRunner.query(`
      ALTER TABLE bookings
      DROP COLUMN brand_id,
      DROP COLUMN project_id;
    `);
  }
}
