import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVoucherUnitBlockingsTable1775000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      ADD COLUMN threshold_amount DECIMAL(12, 2) NULL,
      ADD COLUMN unit_block_duration INT NULL DEFAULT 10,
      ADD COLUMN timer_extension INT NULL DEFAULT 5,
      ADD COLUMN approval_window_hours INT NULL DEFAULT 12,
      ADD COLUMN project_id INT NULL,
      ADD COLUMN unit_approver_id INT NULL,
      ADD COLUMN additional_approvers JSON NULL,
      ADD COLUMN deleted_at TIMESTAMP NULL,
      ADD COLUMN deleted_by INT NULL,
      ADD COLUMN send_daily_report BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN display_unit_type VARCHAR(45) NULL,
      ADD CONSTRAINT fk_eoi_campaign_project
      FOREIGN KEY (project_id) REFERENCES projects(id)
      ON DELETE SET NULL,
      ADD CONSTRAINT fk_eoi_campaign_user
      FOREIGN KEY (unit_approver_id) REFERENCES users(id)
      ON DELETE SET NULL,
      ADD CONSTRAINT fk_eoi_campaign_deleted_by
      FOREIGN KEY (deleted_by) REFERENCES users(id)
      ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      CREATE TABLE voucher_unit_blockings (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        campaign_id INT NOT NULL,
        inventory_unit_id VARCHAR(255) NOT NULL,
        voucher_id VARCHAR(255) NULL,
        customer_identifier VARCHAR(255) NOT NULL,
        amount_paid DECIMAL(15, 2) NULL,
        payment_mode VARCHAR(50) NULL,
        threshold_amount DECIMAL(15, 2) NOT NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
        unit_block_expiry TIMESTAMP NOT NULL,
        approval_expiry TIMESTAMP NULL,
        approved_by VARCHAR(255) NULL,
        approved_at TIMESTAMP NULL,
        rejected_reason TEXT NULL,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_inventory_unit_id (inventory_unit_id),
        INDEX idx_campaign_id (campaign_id),
        INDEX idx_voucher_id (voucher_id),
        INDEX idx_status (status)
      );
    `);

    // Add partial unique index for pending blockings
    await queryRunner.query(`
      CREATE UNIQUE INDEX unique_pending_blocking
      ON voucher_unit_blockings (inventory_unit_id)
      WHERE status = 'PENDING';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE eoi_campaigns
      DROP FOREIGN KEY fk_eoi_campaign_project,
      DROP FOREIGN KEY fk_eoi_campaign_user,
      DROP FOREIGN KEY fk_eoi_campaign_deleted_by,
      DROP COLUMN threshold_amount,
      DROP COLUMN unit_block_duration,
      DROP COLUMN timer_extension,
      DROP COLUMN approval_window_hours,
      DROP COLUMN project_id,
      DROP COLUMN unit_approver_id,
      DROP COLUMN additional_approvers,
      DROP COLUMN deleted_at,
      DROP COLUMN deleted_by,
      DROP COLUMN send_daily_report,
      DROP COLUMN display_unit_type;
    `);
    await queryRunner.query(`
      DROP INDEX unique_pending_blocking ON voucher_unit_blockings;
    `);
    await queryRunner.query(`
      DROP TABLE voucher_unit_blockings;
    `);
  }
}
