import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSourceChangeRequestsTable1770787657541 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create source_change_requests table
    await queryRunner.query(`
      CREATE TABLE source_change_requests (
        id CHAR(36) NOT NULL,
        voucher_id INT NOT NULL,
        campaign_id INT NOT NULL,
        target_prid VARCHAR(255) NULL,
        target_enquiry_id VARCHAR(255) NULL,
        reason TEXT NULL,
        current_data JSON NULL,
        new_data JSON NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Requested',
        approval_proof VARCHAR(50) NULL,
        reviewer_remark TEXT NULL,
        reviewed_by INT NULL,
        reviewed_at TIMESTAMP NULL,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        deleted_at TIMESTAMP NULL,
        PRIMARY KEY (id),
        INDEX idx_voucher_id (voucher_id),
        INDEX idx_campaign_id (campaign_id),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by),
        INDEX idx_reviewed_by (reviewed_by),
        INDEX idx_is_deleted (is_deleted),
        CONSTRAINT fk_source_change_requests_voucher
          FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
        CONSTRAINT fk_source_change_requests_campaign
          FOREIGN KEY (campaign_id) REFERENCES eoi_campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_source_change_requests_created_by
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_source_change_requests_reviewed_by
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE source_change_requests
      DROP FOREIGN KEY fk_source_change_requests_voucher,
      DROP FOREIGN KEY fk_source_change_requests_campaign,
      DROP FOREIGN KEY fk_source_change_requests_created_by,
      DROP FOREIGN KEY fk_source_change_requests_reviewed_by;
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE source_change_requests;
    `);
  }
}
