import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeVoucherDatesNullable1761656363000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make voucher_start_date nullable
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_start_date TIMESTAMP NULL DEFAULT NULL
    `);

    // Make voucher_end_date nullable
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_end_date TIMESTAMP NULL DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert voucher_end_date to NOT NULL (will fail if NULL values exist)
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_end_date TIMESTAMP NOT NULL
    `);

    // Revert voucher_start_date to NOT NULL (will fail if NULL values exist)
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      MODIFY COLUMN voucher_start_date TIMESTAMP NOT NULL
    `);
  }
}
