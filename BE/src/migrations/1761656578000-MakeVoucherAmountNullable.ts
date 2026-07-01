import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeVoucherAmountNullable1761656578000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make voucher_amount nullable
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_amount DECIMAL(12,2) NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert voucher_amount to NOT NULL (will fail if NULL values exist)
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_amount DECIMAL(12,2) NOT NULL
    `);
  }
}
