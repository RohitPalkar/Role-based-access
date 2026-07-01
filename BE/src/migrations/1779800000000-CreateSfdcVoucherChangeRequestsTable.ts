import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PB-188: SFDC inbound webhook (`POST /api/sfdc/webhooks/lead-changes`)
 * persists each push as a `PENDING` change request awaiting admin review.
 *
 * The webhook ingestion path NO LONGER mutates the `vouchers` table
 * directly — instead, every payload lands here. Idempotency: a unique
 * constraint on `(prid, normalized_payload_hash, status)` ensures repeated
 * identical SFDC retries do not create duplicate PENDING rows.
 *
 * Auth: enforced by `SfdcWebhookSignatureGuard` (HMAC-SHA256 with
 * registered clients in `integration_clients`). See migration
 * `1779900000000-CreateIntegrationClientsTable` for that table.
 */
export class CreateSfdcVoucherChangeRequestsTable1779800000000 implements MigrationInterface {
  name = 'CreateSfdcVoucherChangeRequestsTable1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`sfdc_voucher_change_requests\` (
        \`id\` CHAR(36) NOT NULL,
        \`prid\` VARCHAR(255) NOT NULL,
        \`voucher_id\` INT NULL,
        \`raw_payload\` JSON NOT NULL,
        \`normalized_payload\` JSON NOT NULL,
        \`changed_fields\` JSON NOT NULL,
        \`normalized_payload_hash\` CHAR(64) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        \`correlation_id\` VARCHAR(128) NULL,
        \`requested_at\` TIMESTAMP NOT NULL,
        \`reviewed_at\` TIMESTAMP NULL,
        \`reviewed_by\` INT NULL,
        \`reviewer_remark\` TEXT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_sfdc_vcr_prid\` (\`prid\`),
        KEY \`idx_sfdc_vcr_status\` (\`status\`),
        KEY \`idx_sfdc_vcr_payload_hash\` (\`normalized_payload_hash\`),
        UNIQUE KEY \`uq_sfdc_vcr_prid_payload_status\`
          (\`prid\`, \`normalized_payload_hash\`, \`status\`),
        CONSTRAINT \`fk_sfdc_vcr_voucher\`
          FOREIGN KEY (\`voucher_id\`) REFERENCES \`vouchers\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_sfdc_vcr_reviewer\`
          FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`sfdc_voucher_change_requests\`
      DROP FOREIGN KEY \`fk_sfdc_vcr_voucher\`,
      DROP FOREIGN KEY \`fk_sfdc_vcr_reviewer\`
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`sfdc_voucher_change_requests\``,
    );
  }
}
