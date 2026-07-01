## Summary
Add a second inbound SFDC webhook to the existing `SfdcWebhookController` that accepts Booking Stage updates from Salesforce. The endpoint mirrors the existing `POST /api/sfdc/webhooks/lead-changes` security and validation pattern but is intentionally **stateless**: it authenticates, validates, logs the incoming payload via a new dedicated service method, and immediately returns `202 Accepted` — no database writes, no migrations, no entities, no queues, no notifications.

This is the second endpoint on the existing `sfdc/webhooks` controller route group introduced under PB-188.

## Scope

### In scope
- New route handler `POST /sfdc/webhooks/booking-stage` on the existing `SfdcWebhookController` (`src/modules/sfdc/sfdc-webhook.controller.ts`).
- New DTO `BookingStageWebhookDto` (new file under `src/modules/sfdc/dto/`).
- New service method `processBookingStageWebhook` on the existing `SfdcWebhookService` (`src/modules/sfdc/sfdc-webhook.service.ts`).
- Reuse of the existing `SfdcWebhookSignatureGuard` (HMAC-SHA256 + API key, identical to the Lead Change webhook).
- Reuse of the same validation pipe configuration (global `ValidationPipe` + `CustomValidationPipe` + route-scoped `ValidationPipe`) and the same `@SkipDecryption()` decorator already used by `applyLeadChange`.
- Structured info-level log line capturing the inbound payload + correlation id when the request is accepted.
- Unit tests for the new DTO and the new controller route, mirroring the structure of `dto/lead-change-webhook.dto.spec.ts` and the booking-stage block of `sfdc-webhook.controller.spec.ts`.
- **In-scope regression fix on `LeadChangeWebhookDto`:** add `@Expose({ name: 'PRID' })` to the existing `prid` property in `src/modules/sfdc/dto/lead-change-webhook.dto.ts`. The decorator was missing on `HEAD` and the co-located `lead-change-webhook.dto.spec.ts` (cases that assert `instance.prid === 'PRID-001'` from `{ PRID: 'PRID-001' }`) was failing on the parent commit. AC14 below is updated to permit this single-line correction so the lead-change DTO spec stays green and SFDC's `PRID` source key continues to remap to the `prid` property consistently with every other field. Runtime behavior of `applyLeadChange` is otherwise unchanged.

### Out of scope (explicitly excluded by the story)
- No migrations.
- No new TypeORM entities, repositories, or relations.
- No mutation of any existing entity (`VoucherForm`, `SfdcVoucherChangeRequest`, etc.).
- No queues, no event-emitter dispatch, no admin notifications.
- No new HMAC/guard work — reuse `SfdcWebhookSignatureGuard` unchanged.
- No changes to the integration-client provisioning flow.

## Requirements

### 1. Endpoint
- Route: `POST /sfdc/webhooks/booking-stage`
  - Resolves to `POST /api/sfdc/webhooks/booking-stage` in prod and `POST /api/{NODE_ENV}/sfdc/webhooks/booking-stage` in non-prod (the `api[/{NODE_ENV}]` prefix is applied globally in `src/main.ts`; no controller-level change required).
- HTTP status on success: `202 Accepted` (use `@HttpCode(HttpStatus.ACCEPTED)`).
- Decorators / guard / pipes must match the existing `applyLeadChange` handler:
  - `@SkipDecryption()` — SFDC posts plain JSON, not the encrypted client envelope.
  - `@UseGuards(SfdcWebhookSignatureGuard)` — same API-Key + HMAC-SHA256 verification as `lead-changes` (headers `X-API-Key`, `X-Timestamp`, `X-Signature`).
  - `@UsePipes(new ValidationPipe({ whitelist: true, transform: true, stopAtFirstError: true }))` — defence-in-depth alongside the global pipes; do **not** set `excludeExtraneousValues: true` for the same reason documented in the existing controller (it would wipe `@Expose`-remapped values).

### 2. DTO — `BookingStageWebhookDto`
- New file: `src/modules/sfdc/dto/booking-stage-webhook.dto.ts`.
- Exactly two fields, both required, both strings, both trimmed:

  | SFDC source key (PascalCase) | DTO property (camelCase) |
  |---|---|
  | `Opportunity ID` | `opportunityId` |
  | `Booking Stage`  | `bookingStage`  |

- Validation rules per field:
  - `@Expose({ name: '<SFDC key>' })` for the source-key remap (consistent with `LeadChangeWebhookDto`).
  - `@IsDefined({ message: '<Field> is required' })`.
  - `@IsString({ message: '<Field> must be a string' })`.
  - `@IsNotEmpty({ message: '<Field> is required' })` — applied **after** trimming so a payload of only whitespace is rejected.
  - `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)` for trimming. Do **not** reuse the `trimAndNullifyEmpty` helper from `lead-change-webhook.dto.ts` for these fields — both are required, so nullifying empties would be inconsistent with the `@IsNotEmpty` contract (an empty string should fail validation, not pass through as `null`).
- Unknown SFDC keys must be silently stripped by `whitelist: true` (no extra DTO fields, no `forbidNonWhitelisted`).

### 3. Service — `processBookingStageWebhook`
- New method on the existing `SfdcWebhookService` class in `src/modules/sfdc/sfdc-webhook.service.ts`.
- Signature should follow the established pattern, e.g.:
  ```ts
  async processBookingStageWebhook(
    dto: BookingStageWebhookDto,
    options: { correlationId?: string; rawPayload?: Record<string, unknown> } = {},
  ): Promise<{ statusCode: number; message: string; data: { opportunityId: string; bookingStage: string } }>
  ```
- Behavior:
  - Resolve `correlationId` from `options.correlationId`, falling back to `crypto.randomUUID()` (same as `applyLeadChange`).
  - **Do not** query or write any repository. Do **not** emit any event. Do **not** call `notifyAdmins`.
  - Emit one structured `logger.info` call recording acceptance of the webhook with the following structured metadata (resolves the truncated "Log the following usi…" requirement — see Open Questions):
    - `opportunityId` (from DTO)
    - `bookingStage` (from DTO)
    - `correlationId`
    - the raw payload (so audit/diagnostics retain SFDC's original key casing)
  - Wrap the body in `try { … } catch (error) { … }` consistent with `applyLeadChange`: rethrow `HttpException` as-is, otherwise hand off to `logsAndErrorHandling('SfdcWebhookService - processBookingStageWebhook', error, { opportunityId, correlationId })` and rethrow defensively.
- Return shape: status `ACCEPTED` (from `src/config/constants`), a short message (e.g. `'Booking stage webhook accepted.'`), and a `data` payload echoing `opportunityId` + `bookingStage` so the response envelope is informative for SFDC. The exact wording can be finalized at implementation time.

### 4. Controller wiring
- Add the new handler method to `SfdcWebhookController` (do **not** create a new controller class — the `@Controller('sfdc/webhooks')` route group already exists).
- Handler must:
  1. Run the guard (HMAC + API key authentication).
  2. Run the validation pipes (DTO validation + `@Expose` remap).
  3. Resolve `x-request-id` into `correlationId` exactly as `applyLeadChange` does (handle the `string | string[] | undefined` shape).
  4. Call `sfdcWebhookService.processBookingStageWebhook(dto, { correlationId, rawPayload: req.body })`.
  5. Return the service result (Nest will respond with the configured `202` status).

### 5. Module wiring
- No changes expected in `src/modules/sfdc/sfdc.module.ts` — `SfdcWebhookController` and `SfdcWebhookService` are already registered there. Confirm during implementation that no new providers need to be added.

### 6. Tests
- DTO spec: new file `src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts` mirroring `lead-change-webhook.dto.spec.ts`. Cover:
  - `@Expose` end-to-end remap: `{ "Opportunity ID": "006…", "Booking Stage": "BOOKED" }` → instance with `opportunityId` / `bookingStage`.
  - Trim behavior on both fields.
  - Rejection when either field is missing, non-string, empty, or whitespace-only.
  - Unknown keys stripped (no error).
- Controller spec: extend `sfdc-webhook.controller.spec.ts` (or co-locate) to cover the new route — success path returns `202` + expected body, guard is applied, validation pipe rejects bad payloads, correlation id is forwarded to the service from `x-request-id`.

## Acceptance Criteria
1. `POST /api/sfdc/webhooks/booking-stage` (prod) and `POST /api/{NODE_ENV}/sfdc/webhooks/booking-stage` (non-prod) exist and are reachable on the running app.
2. A request that passes HMAC verification and contains valid `Opportunity ID` and `Booking Stage` returns HTTP `202 Accepted`.
3. Missing or invalid HMAC headers (API key / timestamp / signature) are rejected by `SfdcWebhookSignatureGuard` with the same behavior as the Lead Change endpoint (no service call, no log of acceptance).
4. A request missing `Opportunity ID` is rejected with HTTP `400` and an "Opportunity ID is required" validation error.
5. A request missing `Booking Stage` is rejected with HTTP `400` and a "Booking Stage is required" validation error.
6. A request where either field is present but only whitespace (e.g. `"   "`) is rejected with the corresponding "is required" validation error after trimming.
7. A request where either field is a non-string type is rejected with HTTP `400` and the corresponding "must be a string" validation error.
8. SFDC's PascalCase keys are remapped to camelCase DTO properties via `@Expose` and surface as `opportunityId` / `bookingStage` to the service.
9. String values are trimmed before reaching the service.
10. Unknown SFDC keys in the payload are silently stripped (no error, not forwarded into the typed DTO instance) — the raw payload is still preserved for logging.
11. `SfdcWebhookService.processBookingStageWebhook` is invoked exactly once per accepted request and emits a structured `logger.info` line containing `opportunityId`, `bookingStage`, `correlationId`, and the raw payload.
12. The service performs zero database operations, emits zero events, and does not call any notification helper.
13. No new migration files, entity files, repository injections, queues, or event listeners are introduced.
14. The existing `POST /api/sfdc/webhooks/lead-changes` endpoint continues to work unchanged (no regressions in `applyLeadChange` behavior or its controller-spec test). The single-line `@Expose({ name: 'PRID' })` addition on `LeadChangeWebhookDto.prid` is permitted as an in-scope regression fix (see §Scope → In scope): the parent commit's `lead-change-webhook.dto.spec.ts` cases that assert `instance.prid === 'PRID-001'` from `{ PRID: 'PRID-001' }` were red without it, and the service-level diff/persist behavior is unaffected because `prid` was already being populated correctly end-to-end (the missing decorator only surfaced in the unit spec).
15. New unit tests cover the DTO validation matrix and the new controller route; the full `npm run test` suite passes.
16. `npm run lint` and `npm run build` pass.

## Implementation Notes
- Place the new handler beneath `applyLeadChange` in `SfdcWebhookController` to keep the file ordered by route path (`lead-changes` then `booking-stage`).
- Use the same imports already present in the controller; the only new import should be `BookingStageWebhookDto`.
- Use the constants and helpers already imported by `SfdcWebhookService` (`ACCEPTED` from `src/config/constants`, `logger` from `src/logger/logger`, `logsAndErrorHandling` from `src/utils/errorLogHandler`, `crypto.randomUUID()` for correlation id fallback). Do **not** introduce new logger frameworks or constants.
- The `SkipDecryption()` decorator path is `src/interceptors/decorators/skip-decryption.decorator` (already imported by the controller).
- Do not export `processBookingStageWebhook`'s return type as a top-level interface unless tests need it; an inline return-type object is acceptable given the small surface area. If it grows, prefer mirroring the `ApplyLeadChangeResult` interface convention already used in the service.
- Response envelope: this controller currently returns raw service results rather than going through the success-response interceptor — keep the same pattern so the `lead-changes` and `booking-stage` endpoints behave identically from SFDC's perspective.
- Do **not** touch `SfdcWebhookSignatureGuard`, `IntegrationClient`, or the `sfdc_voucher_change_requests` entity / migration — they are explicitly out of scope.

## Open Questions / Assumptions
- **Description truncation.** The story description in Jira ends mid-sentence at `Log the following usi…`. The most defensible interpretation, consistent with the existing `applyLeadChange` log lines (`logger.info('SFDC webhook: …', { prid, voucherId, … })`), is: *log via `logger.info` from `src/logger/logger`, including `opportunityId`, `bookingStage`, `correlationId`, and the raw payload*. The acceptance criteria above codify this. If product wants a different log shape, level, or field set, the AC for log content and the service log statement should be adjusted before implementation.
- **Response body.** The story specifies the HTTP status (`202`) but not the response body shape. Assumption: return a small JSON object with `statusCode`, `message`, and `data` (echoing `opportunityId` + `bookingStage`) consistent with `ApplyLeadChangeResult`. SFDC only needs the status code, so any minimal shape is acceptable; flag if the SFDC consumer expects an empty body.
- **Idempotency / deduplication.** Not mentioned in the story. Assumption: none required for this stage because no state is persisted. SFDC retries will simply produce duplicate log lines.
- **Allowed Booking Stage values.** The story shows `"BOOKED"` as an example but does not constrain the enum. Assumption: accept any non-empty trimmed string for now (no `@IsIn`/enum validation). Confirm whether an allow-list (`BOOKED`, `CANCELLED`, etc.) is needed downstream — easy to add later, but adding it now risks rejecting valid stages SFDC may send.
- **Correlation id header name.** Mirrors the existing webhook by reading `x-request-id`. If SFDC standardizes on a different header (e.g. `X-Correlation-Id`), we should align both endpoints in a follow-up.

## References
- Existing controller pattern to mirror: `src/modules/sfdc/sfdc-webhook.controller.ts` (route `lead-changes`, lines 86–110).
- Existing service pattern to extend: `src/modules/sfdc/sfdc-webhook.service.ts` (`applyLeadChange`, lines 110–208; logging style; `logsAndErrorHandling` usage).
- Existing DTO pattern to mirror: `src/modules/sfdc/dto/lead-change-webhook.dto.ts` (`@Expose` + class-validator + trim transforms).
- Existing DTO test pattern: `src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts`.
- Existing controller test pattern: `src/modules/sfdc/sfdc-webhook.controller.spec.ts`.
- Guard (reused as-is): `src/modules/sfdc/guards/sfdc-webhook-signature.guard.ts`.
- Module registration (verify, expected to need no changes): `src/modules/sfdc/sfdc.module.ts`.
- Global prefix + pipe wiring referenced by the controller docstring: `src/main.ts` (lines ~83–87) and `src/validations/custom-pipe.validation.ts`.
- Repo conventions and commands: README.md and the `selectedEntries` block of `docs/ai/context-map.json` (REST style, `api[/{NODE_ENV}]` prefix, `success-response-errors` envelope, `npm run build` / `lint` / `test`).
