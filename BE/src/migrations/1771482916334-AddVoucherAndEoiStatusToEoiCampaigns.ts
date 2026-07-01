import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoucherAndEoiStatusToEoiCampaigns1771482916334 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns 
      MODIFY COLUMN status ENUM(
        'Active | Voucher',
        'Inactive | Voucher',
        'Active | EOI',
        'Inactive | EOI',
        'Active | Voucher to EOI',
        'Inactive | Voucher to EOI',
        'Active | Voucher and EOI',
        'Inactive | Voucher and EOI',
        'Project Launched',
        'Project on Hold',
        'Cancelled & Refunded',
        'Archived'
      ) 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci 
      NOT NULL 
      DEFAULT 'Active | Voucher'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns 
      MODIFY COLUMN status ENUM(
        'Active | Voucher',
        'Inactive | Voucher',
        'Active | EOI',
        'Inactive | EOI',
        'Active | Voucher to EOI',
        'Inactive | Voucher to EOI',
        'Project Launched',
        'Project on Hold',
        'Cancelled & Refunded',
        'Archived'
      ) 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci 
      NOT NULL 
      DEFAULT 'Active | Voucher'
    `);
  }
}
