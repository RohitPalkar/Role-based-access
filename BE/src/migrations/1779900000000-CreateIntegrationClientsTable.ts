import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PB-188 (revision): Registered clients for HMAC-based webhook
 * authentication (`POST /api/sfdc/webhooks/lead-changes`).
 *
 * Replaces the previous Basic Auth design — the webhook now identifies
 * clients via the `X-API-Key` header and verifies request authenticity
 * with an HMAC-SHA256 signature over `X-Timestamp + "." + rawRequestBody`.
 *
 * Column notes:
 *   - `api_key`            : opaque public identifier carried on every
 *                            inbound webhook. UNIQUE so the guard can
 *                            do a single indexed lookup.
 *   - `api_secret_encrypted`: shared HMAC secret encrypted via
 *                            `CustomConfigService.getEncrypted` (AES).
 *                            Stored TEXT to leave headroom for the
 *                            CryptoJS ciphertext length.
 *   - `is_active`          : soft-disable a client without deleting the
 *                            row (useful for revocation + audit).
 *   - `last_used_at`       : best-effort touched on each *successful*
 *                            signature match; never on failure (so a
 *                            failed brute-force does not move the
 *                            timestamp).
 */
export class CreateIntegrationClientsTable1779900000000 implements MigrationInterface {
  name = 'CreateIntegrationClientsTable1779900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`integration_clients\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`client_name\` VARCHAR(255) NOT NULL,
        \`api_key\` VARCHAR(128) NOT NULL,
        \`api_secret_encrypted\` TEXT NOT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`last_used_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_integration_clients_api_key\` (\`api_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`integration_clients\``);
  }
}
