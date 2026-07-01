import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { CustomConfigService } from 'src/config/custom-config.service';
import {
  SFDC_WEBHOOK_API_KEY_HEADER,
  SFDC_WEBHOOK_SIGNATURE_HEADER,
  SFDC_WEBHOOK_TIMESTAMP_DRIFT_MS,
  SFDC_WEBHOOK_TIMESTAMP_HEADER,
} from 'src/config/constants';
import { IntegrationClient } from '../entities/integration-client.entity';
import { logger } from 'src/logger/logger';

/**
 * Type-safe accessor for the raw request body that `main.ts` preserves
 * via the `verify` callback on `express.json` / `express.urlencoded`.
 * The body-parser ALWAYS runs (the route is JSON-only), so this should
 * be present on the request object — but we defensively treat its
 * absence as a 401 (we cannot verify a signature without the exact
 * bytes received).
 */
interface RequestWithRawBody extends Request {
  rawBody?: string;
}

/**
 * HMAC-SHA256 signature guard for the SFDC inbound webhook
 * (`POST /api/sfdc/webhooks/lead-changes`).
 *
 * Headers required on every inbound request:
 *   - `X-API-Key`    : opaque public client identifier; looked up
 *                      against `integration_clients.api_key`.
 *   - `X-Timestamp`  : Unix epoch in **seconds** (string) when SFDC
 *                      built the request. Drift > 5 minutes (in either
 *                      direction) is rejected as a replay candidate.
 *   - `X-Signature`  : hex-encoded HMAC-SHA256(canonicalString, secret),
 *                      where canonicalString = `timestamp + "." + rawBody`.
 *
 * Validation flow (all failures collapse to `401 Unauthorized` with a
 * generic message; details are logged at WARN with the correlation id
 * but never echoed to the client):
 *   1. Read + sanity-check all three headers.
 *   2. Load the matching `IntegrationClient` by `apiKey` and verify it
 *      is `isActive = true`.
 *   3. Validate timestamp freshness against `Date.now()` with a
 *      ±5-minute window (`SFDC_WEBHOOK_TIMESTAMP_DRIFT_MS`).
 *   4. Decrypt the client secret (`CustomConfigService.getDecrypted`),
 *      reconstruct the canonical string `timestamp + "." + rawBody`,
 *      and compute the HMAC-SHA256 digest.
 *   5. Compare to the inbound signature using `crypto.timingSafeEqual`
 *      over equal-length buffers (mismatched lengths short-circuit
 *      with a constant-time compare against a same-sized placeholder
 *      so we don't leak length via timing).
 *   6. On success: best-effort touch `last_used_at` (failures are
 *      swallowed; they must not block the webhook).
 *
 * Replay protection: the ±5-minute window combined with the
 * `(prid, normalized_payload_hash, status)` unique key on
 * `sfdc_voucher_change_requests` makes a replayed request a no-op even
 * if it slips inside the window. The (api_key, timestamp,
 * correlationId) tuple is logged on every accepted request for audit.
 *
 * Notes:
 *   - We deliberately do NOT trust `req.body` for the HMAC input; the
 *     guard reconstructs the canonical string from `req.rawBody`
 *     captured by the `verify` callback in `main.ts`. Re-serializing
 *     `req.body` would break the signature for any payload SFDC sends
 *     with a different whitespace / key-ordering than `JSON.stringify`
 *     produces.
 *   - The encrypted secret is materialized in memory for the duration
 *     of the request only. It is NOT logged anywhere.
 */
@Injectable()
export class SfdcWebhookSignatureGuard implements CanActivate {
  constructor(
    @InjectRepository(IntegrationClient)
    private readonly integrationClientRepo: Repository<IntegrationClient>,
    private readonly configService: CustomConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithRawBody>();
    const correlationId = this.extractCorrelationId(request);

    const apiKey = this.readSingleHeader(request, SFDC_WEBHOOK_API_KEY_HEADER);
    const timestamp = this.readSingleHeader(
      request,
      SFDC_WEBHOOK_TIMESTAMP_HEADER,
    );

    const signature = this.readSingleHeader(
      request,
      SFDC_WEBHOOK_SIGNATURE_HEADER,
    );

    if (!apiKey || !timestamp || !signature) {
      logger.warn(
        'SFDC webhook auth rejected: missing or malformed signature headers.',
        {
          correlationId,
          hasApiKey: !!apiKey,
          hasTimestamp: !!timestamp,
          hasSignature: !!signature,
        },
      );
      throw new UnauthorizedException('Invalid signature');
    }

    if (!this.isTimestampFresh(timestamp)) {
      logger.warn(
        'SFDC webhook auth rejected: timestamp outside drift window.',
        {
          correlationId,
          apiKey,
          timestamp,
        },
      );
      throw new UnauthorizedException('Invalid signature');
    }

    const client = await this.integrationClientRepo.findOne({
      where: { apiKey },
    });

    if (!client || !client.isActive) {
      logger.warn(
        'SFDC webhook auth rejected: unknown or inactive integration client.',
        { correlationId, apiKey, found: !!client },
      );
      throw new UnauthorizedException('Invalid signature');
    }

    const rawBody = typeof request.rawBody === 'string' ? request.rawBody : '';
    if (!rawBody) {
      // Without the exact bytes received we cannot reproduce SFDC's HMAC.
      // Treat this as auth failure rather than 500 — it is functionally
      // indistinguishable from a forged request.
      logger.warn(
        'SFDC webhook auth rejected: rawBody unavailable (body-parser misconfigured?).',
        { correlationId, apiKey },
      );
      throw new UnauthorizedException('Invalid signature');
    }

    const secret = this.decryptSecret(client.apiSecretEncrypted);
    if (!secret) {
      logger.error(
        'SFDC webhook auth rejected: integration client secret failed to decrypt.',
        { correlationId, apiKey, clientId: client.id },
      );
      throw new UnauthorizedException('Invalid signature');
    }

    const canonicalString = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(canonicalString, 'utf8')
      .digest('hex');

    if (!this.timingSafeHexEqual(signature, expectedSignature)) {
      logger.warn('SFDC webhook auth rejected: signature mismatch.', {
        correlationId,
        apiKey,
        clientId: client.id,
        timestamp,
      });
      throw new UnauthorizedException('Invalid signature');
    }

    logger.info('SFDC webhook auth accepted.', {
      correlationId,
      apiKey,
      clientId: client.id,
      timestamp,
    });

    // Best-effort audit touch. Never fail the webhook over this.
    void this.touchLastUsed(client.id).catch((err) => {
      logger.warn(
        'SFDC webhook: failed to update integration_clients.last_used_at.',
        {
          correlationId,
          clientId: client.id,
          error: (err as Error)?.message,
        },
      );
    });

    return true;
  }

  /**
   * Pull a single header value, normalizing to `null` if the header is
   * absent OR is sent as an array (which Express does for repeated
   * headers; we reject the request rather than guessing which value
   * SFDC signed).
   */
  private readSingleHeader(request: Request, name: string): string | null {
    const value = request.headers?.[name];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private extractCorrelationId(request: Request): string | undefined {
    const header = request.headers?.['x-request-id'];
    if (Array.isArray(header)) return header[0];
    return typeof header === 'string' ? header : undefined;
  }

  /**
   * Validate `X-Timestamp` is a Unix epoch in **seconds** within
   * ±`SFDC_WEBHOOK_TIMESTAMP_DRIFT_MS` of `Date.now()`. Returns false
   * for non-numeric, NaN, or otherwise unparseable values (which
   * also defends against a `Number(' ') === 0` style attack).
   */
  private isTimestampFresh(raw: string): boolean {
    if (!/^-?\d+$/.test(raw)) return false;
    const tsSeconds = Number(raw);
    if (!Number.isFinite(tsSeconds)) return false;
    const tsMs = tsSeconds * 1000;
    const drift = Math.abs(Date.now() - tsMs);
    return drift <= SFDC_WEBHOOK_TIMESTAMP_DRIFT_MS;
  }

  private decryptSecret(encrypted: string): string {
    if (!encrypted) return '';
    try {
      return this.configService.decryptString(encrypted);
    } catch (err) {
      logger.error('SFDC Webhook Signature Guard: Failed to decrypt secret.', {
        error: (err as Error)?.message,
      });
      return '';
    }
  }

  private async touchLastUsed(clientId: number): Promise<void> {
    await this.integrationClientRepo.update(
      { id: clientId },
      { lastUsedAt: new Date() },
    );
  }

  /**
   * Constant-time hex-string compare. When the two values differ in
   * length we still run `timingSafeEqual` against a same-sized
   * placeholder before returning `false` so the timing channel does
   * not leak the length of the expected signature.
   */
  private timingSafeHexEqual(a: string, b: string): boolean {
    let aBuf: Buffer;
    let bBuf: Buffer;
    try {
      aBuf = Buffer.from(a, 'hex');
      bBuf = Buffer.from(b, 'hex');
    } catch {
      return false;
    }

    // Buffer.from(hex) silently drops invalid characters; if the
    // resulting length is 0 while the input was non-empty, treat as
    // mismatch so a junk header cannot accidentally pass the
    // length-equality check below.
    if (aBuf.length === 0 || bBuf.length === 0) return false;

    if (aBuf.length !== bBuf.length) {
      const placeholder = Buffer.alloc(bBuf.length);
      crypto.timingSafeEqual(placeholder, bBuf);
      return false;
    }

    return crypto.timingSafeEqual(aBuf, bBuf);
  }
}
