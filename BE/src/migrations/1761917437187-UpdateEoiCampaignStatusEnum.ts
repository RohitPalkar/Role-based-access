import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEoiCampaignStatusEnum1761917437187 implements MigrationInterface {
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
    // Revert to the previous 3-value enum (from your original schema)
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns 
      MODIFY COLUMN status ENUM(
        'Active | Voucher',
        'Active | EOI',
        'Active | Voucher to EOI'
      )
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci 
      NOT NULL 
      DEFAULT 'Active | Voucher'
    `);
  }
}
