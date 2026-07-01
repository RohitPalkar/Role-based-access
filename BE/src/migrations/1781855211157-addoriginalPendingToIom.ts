import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginalPaymentDetailsToIoms1781264500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
      ADD COLUMN original_payment_details JSON NULL
      AFTER customer_details
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ioms
      DROP COLUMN original_payment_details
    `);
  }
}
