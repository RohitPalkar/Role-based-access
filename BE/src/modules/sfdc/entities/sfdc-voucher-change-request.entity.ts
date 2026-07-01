import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { VoucherForm } from 'src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity';
import { Users } from 'src/modules/users/entities/user.entity';

/**
 * Lifecycle status for an inbound SFDC change request awaiting admin review.
 *
 * The webhook ingestion path only ever creates rows in the `PENDING` state.
 * `APPROVED` / `REJECTED` are reserved for the admin-review action that will
 * mutate the underlying `VoucherForm` outside of this ingestion flow.
 */
export enum SfdcVoucherChangeRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * PB-188: Inbound SFDC webhook change requests.
 *
 * The SFDC webhook does NOT mutate the core `vouchers` table directly. Each
 * inbound payload is persisted here as a `PENDING` change request and an
 * admin notification is fired. The actual application of changes onto the
 * `VoucherForm` happens later via an admin-review flow (out of scope of the
 * webhook ingestion module).
 *
 * Idempotency: a three-column `(prid, normalized_payload_hash, status)`
 * unique constraint (`uq_sfdc_vcr_prid_payload_status`, declared by
 * migration `1779800000000-CreateSfdcVoucherChangeRequestsTable`) ensures
 * that repeated identical SFDC retries do not create duplicate PENDING
 * rows. `status` is part of the key because MySQL has no partial /
 * filtered unique indexes; see the `normalizedPayloadHash` column
 * docstring below for the per-status admissibility matrix.
 */
@Entity('sfdc_voucher_change_requests')
export class SfdcVoucherChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** PRID sent by SFDC (mirrors `VoucherForm.uniqueReferenceId`). */
  @Index('idx_sfdc_vcr_prid')
  @Column({ name: 'prid', type: 'varchar', length: 255, nullable: false })
  prid: string;

  /**
   * Optional FK to the resolved voucher (NULL when PRID does not currently
   * match a voucher — the webhook still records the request for the audit
   * trail, but the admin-review screen will see no target row).
   */
  @ManyToOne(() => VoucherForm, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: VoucherForm | null;

  @Column({ name: 'voucher_id', type: 'int', nullable: true })
  voucherId: number | null;

  /** Raw JSON body as received from SFDC, before any DTO normalization. */
  @Column({ name: 'raw_payload', type: 'json', nullable: false })
  rawPayload: Record<string, unknown>;

  /** DTO-normalized payload (camelCase keys, trimmed values, empty → null). */
  @Column({ name: 'normalized_payload', type: 'json', nullable: false })
  normalizedPayload: Record<string, unknown>;

  /**
   * Fields whose normalized SFDC value differs from the current `VoucherForm`
   * value at the time the request was ingested. Stored as a JSON string[].
   */
  @Column({ name: 'changed_fields', type: 'json', nullable: false })
  changedFields: string[];

  /**
   * Stable hash of the normalized payload. Used together with `prid` and
   * `status` to dedupe repeated identical SFDC retries — the underlying
   * MySQL unique index is `(prid, normalized_payload_hash, status)`.
   *
   * Practical implications of this constraint shape (MySQL has no partial /
   * filtered unique indexes, so we include `status` in the key):
   *   - At most one PENDING row can exist for a given `(prid, hash)` — this
   *     is the dedupe path the webhook ingestion service relies on at
   *     [src/modules/sfdc/sfdc-webhook.service.ts](sfdc-webhook.service.ts).
   *   - At most one APPROVED and one REJECTED row can also exist for the
   *     same `(prid, hash)`. A second SFDC retry with an identical payload
   *     after a previous request was REJECTED is therefore allowed to land
   *     as a fresh PENDING row (intentional — it represents a new business
   *     event), but a *third* retry after a *second* rejection of the same
   *     `(prid, hash)` will be blocked by this unique key. If that scenario
   *     becomes real, replace the unique constraint with a regular index
   *     plus an app-layer pre-check inside a SERIALIZABLE transaction
   *     (see PB-188 review pointer R6).
   */
  @Index('idx_sfdc_vcr_payload_hash')
  @Column({
    name: 'normalized_payload_hash',
    type: 'char',
    length: 64,
    nullable: false,
  })
  normalizedPayloadHash: string;

  @Index('idx_sfdc_vcr_status')
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: SfdcVoucherChangeRequestStatus.PENDING,
  })
  status: SfdcVoucherChangeRequestStatus;

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  correlationId: string | null;

  @Column({ name: 'requested_at', type: 'timestamp', nullable: false })
  requestedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ManyToOne(() => Users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: Users | null;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number | null;

  @Column({ name: 'reviewer_remark', type: 'text', nullable: true })
  reviewerRemark: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
