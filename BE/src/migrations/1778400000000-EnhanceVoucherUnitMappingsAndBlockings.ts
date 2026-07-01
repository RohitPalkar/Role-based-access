import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceVoucherUnitMappingsAndBlockings1778400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove denormalized columns from voucher_unit_mappings
    await queryRunner
      .query(`ALTER TABLE voucher_unit_mappings DROP COLUMN tower_name`)
      .catch(() => {});

    await queryRunner
      .query(`ALTER TABLE voucher_unit_mappings DROP COLUMN floor`)
      .catch(() => {});

    await queryRunner
      .query(`ALTER TABLE voucher_unit_mappings DROP COLUMN configuration`)
      .catch(() => {});

    await queryRunner
      .query(`ALTER TABLE voucher_unit_mappings DROP COLUMN facing`)
      .catch(() => {});

    await queryRunner
      .query(`ALTER TABLE voucher_unit_mappings DROP COLUMN area_sba`)
      .catch(() => {});

    await queryRunner
      .query(`ALTER TABLE voucher_unit_mappings DROP COLUMN sfdc_tower_id`)
      .catch(() => {});

    await queryRunner
      .query(`ALTER TABLE voucher_unit_mappings DROP COLUMN sfdc_unit_id`)
      .catch(() => {});

    // Add status column to voucher_unit_mappings
    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD COLUMN status VARCHAR(50) DEFAULT 'Pending Approval'`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD UNIQUE KEY uk_voucher_unit_mappings_inventory_unit_id (inventory_unit_id)`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD INDEX idx_voucher_unit_mappings_status (status)`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN mapping_id CHAR(36) NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE voucher_unit_mappings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_unit_mappings MODIFY id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE voucher_unit_blockings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD CONSTRAINT fk_voucher_unit_blockings_mapping_id FOREIGN KEY (mapping_id) REFERENCES voucher_unit_mappings(id) ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN approval_required BOOLEAN DEFAULT FALSE`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN approval_reason VARCHAR(100) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN blocking_initiated_by INT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN released_by INT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN approver_remark TEXT NULL COMMENT 'Optional remark from approver'`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN blocking_initiated_at TIMESTAMP NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN approve_jti VARCHAR(255) NULL;`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN reject_jti VARCHAR(255) NULL;`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN is_token_used boolean default false;`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD COLUMN approval_source VARCHAR(50) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD INDEX idx_voucher_unit_blockings_approval_expiry_status (approval_expiry, status)`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD INDEX idx_voucher_unit_blockings_block_expiry_status (unit_block_expiry, status)`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD INDEX idx_voucher_unit_blockings_inventory_status (inventory_unit_id, status)`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_blockings ADD INDEX idx_voucher_unit_blockings_voucher_status (voucher_id, status)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_blockings DROP INDEX idx_voucher_unit_blockings_voucher_status`,
      )
      .catch(() => {});

    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_blockings DROP INDEX idx_voucher_unit_blockings_inventory_status`,
      )
      .catch(() => {});

    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_blockings DROP INDEX idx_voucher_unit_blockings_block_expiry_status`,
      )
      .catch(() => {});

    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_blockings DROP INDEX idx_voucher_unit_blockings_approval_expiry_status`,
      )
      .catch(() => {});

    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_blockings DROP FOREIGN KEY fk_voucher_unit_blockings_mapping_id`,
      )
      .catch(() => {});

    await queryRunner
      .query(`ALTER TABLE voucher_unit_blockings DROP COLUMN approval_source`)
      .catch(() => {});
    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_blockings DROP COLUMN blocking_initiated_at`,
      )
      .catch(() => {});
    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_blockings DROP COLUMN blocking_initiated_by`,
      )
      .catch(() => {});
    await queryRunner
      .query(`ALTER TABLE voucher_unit_blockings DROP COLUMN approval_reason`)
      .catch(() => {});
    await queryRunner
      .query(`ALTER TABLE voucher_unit_blockings DROP COLUMN approval_required`)
      .catch(() => {});
    await queryRunner
      .query(`ALTER TABLE voucher_unit_blockings DROP COLUMN mapping_id`)
      .catch(() => {});

    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_mappings DROP INDEX idx_voucher_unit_mappings_status`,
      )
      .catch(() => {});

    await queryRunner
      .query(
        `ALTER TABLE voucher_unit_mappings DROP INDEX uk_voucher_unit_mappings_inventory_unit_id`,
      )
      .catch(() => {});

    await queryRunner
      .query(`ALTER TABLE voucher_unit_mappings DROP COLUMN status`)
      .catch(() => {});

    // Restore denormalized columns (as nullable - original data lost)
    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD COLUMN tower_name VARCHAR(255) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD COLUMN floor VARCHAR(50) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD COLUMN configuration VARCHAR(100) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD COLUMN facing VARCHAR(50) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD COLUMN area_sba VARCHAR(50) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD COLUMN sfdc_tower_id VARCHAR(50) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE voucher_unit_mappings ADD COLUMN sfdc_unit_id VARCHAR(50) NULL`,
    );
  }
}
