/**
 * SFDC inbound webhook controller (PB-188).
 *
 * Route: `POST /api/sfdc/webhooks/lead-changes`
 * (non-prod: `POST /api/{NODE_ENV}/sfdc/webhooks/lead-changes` — global
 * prefix is applied in `src/main.ts`).
 *
 * Flow: Verify HMAC signature → Validate DTO → Find voucher by PRID →
 * Persist a `PENDING` row on `sfdc_voucher_change_requests` → Fire admin
 * notification → Respond `202 Accepted`. The webhook does NOT mutate the
 * `vouchers` table directly; an admin-review action (outside this module)
 * is responsible for applying approved changes.
 *
 * Auth: API-Key + HMAC-SHA256 signature, enforced by
 * `SfdcWebhookSignatureGuard`. SFDC sends three headers on every
 * request:
 *
 *   - `X-API-Key`   — public client identifier; looked up against
 *                     `integration_clients.api_key`
 *   - `X-Timestamp` — Unix epoch (seconds); ±5-minute drift window
 *   - `X-Signature` — hex-encoded HMAC-SHA256(`timestamp + "." +
 *                     rawBody`, clientSecret)
 *
 * The client secret is stored encrypted on `integration_clients.
 * api_secret_encrypted` via `CustomConfigService.getEncrypted` — it is
 * NOT bcrypt-hashed because HMAC verification needs the original
 * secret. Provisioning clients is an offline / admin-tooling concern
 * and is intentionally out of scope of this controller.
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';

import { BookingStageWebhookDto } from './dto/booking-stage-webhook.dto';
import { LeadChangeWebhookDto } from './dto/lead-change-webhook.dto';
import { SfdcWebhookSignatureGuard } from './guards/sfdc-webhook-signature.guard';
import {
  ApplyLeadChangeResult,
  BookingStageWebhookResult,
  SfdcWebhookService,
} from './sfdc-webhook.service';
import { SkipDecryption } from 'src/interceptors/decorators/skip-decryption.decorator';

@Controller('sfdc/webhooks')
export class SfdcWebhookController {
  constructor(private readonly sfdcWebhookService: SfdcWebhookService) {}

  /**
   * Accept an SFDC lead/voucher change push.
   *
   * Pipe chain (verified against `src/main.ts` lines 83-87):
   * 1. Global `ValidationPipe({ whitelist: true, stopAtFirstError: true })`
   *    — runs `plainToClass(LeadChangeWebhookDto, body)` for validation,
   *    which applies the `@Expose({ name })` source-key remap, then
   *    (because `transform` is NOT set) returns `classToPlain(entity)` so
   *    the parameter value retains the original `@Expose`-named keys.
   * 2. Global `CustomValidationPipe` (`src/validations/custom-pipe.validation.ts`)
   *    — extends `ValidationPipe` with `transform: true` and
   *    `enableImplicitConversion: true`; this is the first pipe that
   *    actually returns a typed `LeadChangeWebhookDto` instance with
   *    camelCase keys produced by `@Expose`.
   * 3. Route-scoped `ValidationPipe({ whitelist: true, transform: true,
   *    stopAtFirstError: true })` below — defence in depth in case the
   *    global pipe registration is ever reordered; running this pipe a
   *    second time on a class instance is a no-op.
   *
   * We deliberately do NOT use `excludeExtraneousValues: true` on this
   * route-scoped pipe: turning it on would force `plainToInstance` to
   * discard any property whose source key is not the `@Expose` name, so
   * if step (2) above has already produced a camelCase instance the
   * `prid` / `leadStatus` / ... values would be wiped. The DTO spec at
   * `src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts` asserts the
   * `@Expose` remap end-to-end (PB-188 AC6 / AC10).
   *
   * Returns `202 Accepted`: the payload has been queued as a `PENDING`
   * change request awaiting admin review and is not yet applied to the
   * voucher.
   */
  @Post('lead-changes')
  @HttpCode(HttpStatus.ACCEPTED)
  @SkipDecryption()
  @UseGuards(SfdcWebhookSignatureGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  )
  async applyLeadChange(
    @Body() dto: LeadChangeWebhookDto,
    @Req() req: Request,
  ): Promise<ApplyLeadChangeResult> {
    const correlationIdHeader = req.headers?.['x-request-id'];
    const correlationId = Array.isArray(correlationIdHeader)
      ? correlationIdHeader[0]
      : correlationIdHeader;

    return this.sfdcWebhookService.applyLeadChange(dto, {
      correlationId,
      rawPayload: (req.body as Record<string, unknown>) ?? {},
    });
  }

  /**
   * Accept an SFDC booking-stage push.
   *
   * Stateless: the service logs the payload and returns `202 Accepted`
   * with the normalized `{ opportunityId, bookingStage }` echo. No DB
   * write, no event emission, no notification — see
   * `SfdcWebhookService.processBookingStageWebhook` for rationale.
   *
   * Pipe chain matches `applyLeadChange` above so the `@Expose` source-key
   * remap from `BookingStageWebhookDto` is applied consistently with the
   * existing inbound SFDC route.
   */
  @Post('booking-stage')
  @HttpCode(HttpStatus.ACCEPTED)
  @SkipDecryption()
  @UseGuards(SfdcWebhookSignatureGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  )
  async applyBookingStage(
    @Body() dto: BookingStageWebhookDto,
    @Req() req: Request,
  ): Promise<BookingStageWebhookResult> {
    const correlationIdHeader = req.headers?.['x-request-id'];
    const correlationId = Array.isArray(correlationIdHeader)
      ? correlationIdHeader[0]
      : correlationIdHeader;

    return this.sfdcWebhookService.processBookingStageWebhook(dto, {
      correlationId,
      rawPayload: (req.body as Record<string, unknown>) ?? {},
    });
  }
}
