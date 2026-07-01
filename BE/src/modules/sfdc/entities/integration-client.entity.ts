import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Registered integration client for HMAC-based webhook authentication
 * (`POST /api/sfdc/webhooks/lead-changes`).
 *
 * Each inbound webhook carries an `X-API-Key` header which is looked up
 * against `api_key` (unique) on this table. The matching row's
 * `api_secret_encrypted` value is decrypted via the project's
 * `CustomConfigService.getDecrypted` convention (AES through
 * `CryptoJS`) and used as the HMAC-SHA256 key over
 * `X-Timestamp + "." + rawRequestBody`. The computed signature is
 * compared to the inbound `X-Signature` header using
 * `crypto.timingSafeEqual`.
 *
 * IMPORTANT: the secret is stored encrypted (NOT bcrypt-hashed) because
 * HMAC verification requires access to the original secret. Treat the
 * `api_secret_encrypted` column as sensitive — it is the only piece of
 * data needed to forge a request to the webhook.
 *
 * Lifecycle:
 *   - `is_active = false` disables a client without deleting the row
 *     (useful for revocation and post-mortems).
 *   - `last_used_at` is best-effort touched by the guard after a
 *     successful signature match; failures do NOT update it.
 */
@Entity('integration_clients')
export class IntegrationClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'client_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  clientName: string;

  /** Public identifier sent on inbound webhooks via `X-API-Key`. */
  @Index('uq_integration_clients_api_key', { unique: true })
  @Column({ name: 'api_key', type: 'varchar', length: 128, nullable: false })
  apiKey: string;

  /**
   * Shared secret used as the HMAC-SHA256 key, stored encrypted via
   * `CustomConfigService.getEncrypted` (AES). NEVER store the raw secret
   * or a one-way hash here — both break HMAC verification.
   */
  @Column({ name: 'api_secret_encrypted', type: 'text', nullable: false })
  apiSecretEncrypted: string;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
