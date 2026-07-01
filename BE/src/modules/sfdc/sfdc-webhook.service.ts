import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { VoucherForm } from 'src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity';
import { LeadChangeWebhookDto } from './dto/lead-change-webhook.dto';
import { BookingStageWebhookDto } from './dto/booking-stage-webhook.dto';
import {
  SfdcVoucherChangeRequest,
  SfdcVoucherChangeRequestStatus,
} from './entities/sfdc-voucher-change-request.entity';
import { logger } from 'src/logger/logger';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { ACCEPTED, SFDC_WEBHOOK_NOTIFICATION_TYPE } from 'src/config/constants';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';

/**
 * DTO key on `LeadChangeWebhookDto` → entity column on `VoucherForm`
 * (only for fields that currently exist on `VoucherForm`). Used to compute
 * a diff between the SFDC payload and the live voucher row. Any DTO field
 * NOT listed here has no backing column on `VoucherForm` and is therefore
 * treated as "changed" whenever it is present in the payload (so the
 * admin-review screen can see it as a candidate change).
 */
const VOUCHER_FIELD_MAP: Array<{
  dtoKey: keyof LeadChangeWebhookDto;
  entityKey: keyof VoucherForm;
}> = [
  { dtoKey: 'leadStatus', entityKey: 'sfdcLeadStatus' },
  { dtoKey: 'primarySource', entityKey: 'primarySource' },
  { dtoKey: 'secondarySource', entityKey: 'secondarySource' },
  { dtoKey: 'tertiarySource', entityKey: 'tertiarySource' },
];

/**
 * Ordered list of all DTO keys (used both for building the normalized
 * payload — with a stable key order so the hash is deterministic — and for
 * iterating during diff computation).
 */
const ALL_DTO_KEYS: Array<keyof LeadChangeWebhookDto> = [
  'prid',
  'leadStatus',
  'svhStatus',
  'primarySource',
  'secondarySource',
  'tertiarySource',
  'channelPartnerName',
  'referrerName',
  'referrerProjectName',
  'referrerUnitNo',
  'referredOpportunity',
  'referredEmployee',
  'leadOwner',
  'stm2',
];

export interface ApplyLeadChangeOptions {
  /** Optional correlation id from the inbound request (e.g. `x-request-id`). */
  correlationId?: string;
  /**
   * Raw JSON body as received from SFDC. Persisted verbatim on the change
   * request row so the admin-review screen can inspect the original
   * PascalCase / spaced field names. Optional in tests; the controller
   * always forwards `req.body`.
   */
  rawPayload?: Record<string, unknown>;
}

export interface ApplyLeadChangeResult {
  statusCode: number;
  message: string;
  data: {
    requestId: string;
    prid: string;
    /** `true` when an existing PENDING row matched the payload hash. */
    duplicate: boolean;
  };
}

export interface BookingStageWebhookOptions {
  /** Optional correlation id from the inbound request (e.g. `x-request-id`). */
  correlationId?: string;
  /**
   * Raw JSON body as received from SFDC. Logged verbatim alongside the
   * accepted booking-stage event so operators can audit the original
   * PascalCase / spaced field names without re-fetching the request.
   * Optional in tests; the controller always forwards `req.body`.
   */
  rawPayload?: Record<string, unknown>;
}

export interface BookingStageWebhookResult {
  statusCode: number;
  message: string;
  data: {
    opportunityId: string;
    bookingStage: string;
  };
}

/**
 * Inbound SFDC webhook service (PB-188).
 *
 * Flow:
 *   1. Resolve the voucher by `PRID` (`unique_reference_id`). Unknown PRID
 *      → `NotFoundException` (no DB writes).
 *   2. Compute the diff between the normalized SFDC payload and the live
 *      voucher row (only for fields with a backing column on `VoucherForm`).
 *   3. Persist a `PENDING` row on `sfdc_voucher_change_requests`. The unique
 *      `(prid, normalized_payload_hash, status)` constraint dedupes
 *      identical SFDC retries — on conflict we return the existing row
 *      without re-notifying.
 *   4. Fire a broadcast admin notification.
 *
 * This service does NOT mutate `VoucherForm`. The downstream admin-review
 * flow (out of scope of this module) is responsible for applying approved
 * changes onto the voucher and transitioning the request to APPROVED /
 * REJECTED.
 */
@Injectable()
export class SfdcWebhookService {
  constructor(
    @InjectRepository(VoucherForm)
    private readonly voucherRepo: Repository<VoucherForm>,
    @InjectRepository(SfdcVoucherChangeRequest)
    private readonly changeRequestRepo: Repository<SfdcVoucherChangeRequest>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async applyLeadChange(
    dto: LeadChangeWebhookDto,
    options: ApplyLeadChangeOptions = {},
  ): Promise<ApplyLeadChangeResult> {
    const correlationId = options.correlationId || crypto.randomUUID();
    const rawPayload = options.rawPayload ?? {};

    try {
      const voucher = await this.voucherRepo.findOne({
        where: { uniqueReferenceId: dto.prid },
      });

      if (!voucher) {
        logger.warn('SFDC webhook: voucher not found for PRID.', {
          prid: dto.prid,
          correlationId,
        });
        throw new NotFoundException('No voucher found for the given PRID');
      }

      const normalizedPayload = this.buildNormalizedPayload(dto);
      const normalizedPayloadHash = this.hashPayload(normalizedPayload);
      const changedFields = this.computeChangedFields(dto, voucher);

      // Idempotency: if an identical PENDING request already exists for this
      // PRID + payload, return it as-is (no new notification, no duplicate row).
      const existing = await this.changeRequestRepo.findOne({
        where: {
          prid: dto.prid,
          normalizedPayloadHash,
          status: SfdcVoucherChangeRequestStatus.PENDING,
        },
      });

      if (existing) {
        logger.info('SFDC webhook: duplicate PENDING request — no-op.', {
          prid: dto.prid,
          voucherId: voucher.id,
          requestId: existing.id,
          correlationId,
        });
        return {
          statusCode: ACCEPTED,
          message: 'SFDC change request already pending review.',
          data: {
            requestId: existing.id,
            prid: dto.prid,
            duplicate: true,
          },
        };
      }

      const requestedAt = new Date();
      const saved = await this.changeRequestRepo.save(
        this.changeRequestRepo.create({
          prid: dto.prid,
          voucherId: voucher.id,
          rawPayload,
          normalizedPayload,
          normalizedPayloadHash,
          changedFields,
          status: SfdcVoucherChangeRequestStatus.PENDING,
          correlationId,
          requestedAt,
        }),
      );

      logger.info('SFDC webhook: change request queued for admin review.', {
        prid: dto.prid,
        voucherId: voucher.id,
        requestId: saved.id,
        changedFields,
        correlationId,
      });

      await this.notifyAdmins(saved, voucher, changedFields, correlationId);

      return {
        statusCode: ACCEPTED,
        message: 'SFDC change request queued for admin review.',
        data: {
          requestId: saved.id,
          prid: dto.prid,
          duplicate: false,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      logsAndErrorHandling('SfdcWebhookService - applyLeadChange', error, {
        prid: dto.prid,
        correlationId,
      });
      // Defensive rethrow: `logsAndErrorHandling` is typed `: never` and is
      // expected to throw, but this guard keeps the `Promise<ApplyLeadChangeResult>`
      // contract intact even if the helper is ever refactored into a
      // logger-only utility.
      throw error;
    }
  }

  /**
   * Inbound SFDC booking-stage webhook handler (PB-188).
   *
   * Stateless by design: validates / logs the payload and returns `202
   * Accepted`. No voucher lookup, no DB write, no event emission, no
   * notification. A future story will wire downstream consumers; for
   * now the log line is the only side effect operators can audit.
   */
  async processBookingStageWebhook(
    dto: BookingStageWebhookDto,
    options: BookingStageWebhookOptions = {},
  ): Promise<BookingStageWebhookResult> {
    const correlationId = options.correlationId || crypto.randomUUID();
    const rawPayload = options.rawPayload ?? {};

    try {
      logger.info('SFDC webhook: booking stage accepted.', {
        opportunityId: dto.opportunityId,
        bookingStage: dto.bookingStage,
        correlationId,
        rawPayload,
      });

      return {
        statusCode: ACCEPTED,
        message: 'Booking stage webhook accepted.',
        data: {
          opportunityId: dto.opportunityId,
          bookingStage: dto.bookingStage,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      logsAndErrorHandling(
        'SfdcWebhookService - processBookingStageWebhook',
        error,
        {
          opportunityId: dto.opportunityId,
          correlationId,
        },
      );
      // Defensive rethrow: keeps the `Promise<BookingStageWebhookResult>`
      // contract intact even if `logsAndErrorHandling` is ever refactored
      // into a logger-only utility.
      throw error;
    }
  }

  /**
   * Build the normalized payload with a stable key order so the resulting
   * hash is deterministic across identical SFDC retries. Skips `undefined`
   * values (absent fields), preserves `null` (explicit clear). `prid` is
   * omitted from the hash input since it is already part of the dedupe
   * key, but is kept in the stored payload for traceability.
   */
  private buildNormalizedPayload(
    dto: LeadChangeWebhookDto,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of ALL_DTO_KEYS) {
      const value = (dto as unknown as Record<string, unknown>)[key];
      if (value === undefined) continue;
      out[key] = value;
    }
    return out;
  }

  /** SHA-256 hex digest of the canonical (sorted-key) JSON payload. */
  private hashPayload(payload: Record<string, unknown>): string {
    const canonical = JSON.stringify(
      Object.keys(payload)
        .filter((k) => k !== 'prid')
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = payload[k];
          return acc;
        }, {}),
    );
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Compute the list of fields whose normalized SFDC value differs from
   * the live `VoucherForm` value. For DTO fields without a backing column
   * on `VoucherForm`, the field is treated as "changed" whenever it is
   * present in the payload (the admin-review screen surfaces them as
   * candidate values for the new columns).
   */
  private computeChangedFields(
    dto: LeadChangeWebhookDto,
    voucher: VoucherForm,
  ): string[] {
    const mapped = new Set(VOUCHER_FIELD_MAP.map((m) => m.dtoKey as string));
    const changed: string[] = [];

    for (const key of ALL_DTO_KEYS) {
      if (key === 'prid') continue;
      const incoming = (dto as unknown as Record<string, unknown>)[key];
      if (incoming === undefined) continue;

      const mapping = VOUCHER_FIELD_MAP.find((m) => m.dtoKey === key);
      if (!mapping) {
        if (mapped.has(key)) continue;
        changed.push(key);
        continue;
      }

      const current = (voucher as unknown as Record<string, unknown>)[
        mapping.entityKey as string
      ];
      if (incoming === current) continue;
      if (
        (incoming === null || incoming === undefined) &&
        (current === null || current === undefined)
      ) {
        continue;
      }
      changed.push(key);
    }

    return changed;
  }

  /**
   * Fan out a broadcast admin notification (`isForAllAdmin: true`) so the
   * admin-review screen can pick it up. Notification failures are logged
   * but do NOT fail the webhook — the change request is already persisted
   * and the admin queue is the authoritative source of truth.
   */
  private async notifyAdmins(
    request: SfdcVoucherChangeRequest,
    voucher: VoucherForm,
    changedFields: string[],
    correlationId: string,
  ): Promise<void> {
    const summary =
      changedFields.length > 0
        ? `Changed fields: ${changedFields.join(', ')}.`
        : 'No field diffs detected; review payload for audit purposes.';

    try {
      this.eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, {
        notifications: [
          {
            type: SFDC_WEBHOOK_NOTIFICATION_TYPE,
            title: 'SFDC change request awaiting review',
            message: `SFDC pushed an update for PRID ${request.prid} (voucher #${voucher.id}). ${summary}`,
            isForAllAdmin: true,
          },
        ],
      });
    } catch (error) {
      logger.error(
        'SFDC webhook: failed to dispatch admin notification.',
        (error as Error)?.stack || (error as Error)?.message,
        {
          prid: request.prid,
          requestId: request.id,
          correlationId,
        },
      );
    }
  }
}
