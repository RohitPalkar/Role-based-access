# PB-188 — Implementation Plan: Booking Stage Webhook

## Summary
Add a second SFDC inbound webhook (`POST /sfdc/webhooks/booking-stage`) on the existing `SfdcWebhookController` that authenticates via the reused `SfdcWebhookSignatureGuard`, validates a minimal two-field DTO, logs the payload, and returns `202 Accepted`. Stateless: no DB writes, no events, no notifications, no migrations.

## Context Budget
- Inspect target files first; do not perform broad repo scans.
- Open non-target files only when needed (direct imports such as `SkipDecryption`, `logger`, `logsAndErrorHandling`, `ACCEPTED`, or sibling test patterns).
- Use provider-native edit tools to apply changes. Do not print full file contents, full diffs, or large code blocks in chat — refer to file paths and the small new symbol names.
- Run only the validation commands listed below (lint + targeted Jest for changed files; full `npm run test` once at the end). Avoid `start:dev`/e2e unless something breaks.
- Do not touch DB, guards, encryption, or `IntegrationClient` code — they are explicitly out of scope.

## Target Files

### New files to create
- `src/modules/sfdc/dto/booking-stage-webhook.dto.ts` — `BookingStageWebhookDto` (two required string fields, `@Expose` remap, trim transform, class-validator).
- `src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts` — DTO unit spec mirroring `lead-change-webhook.dto.spec.ts`.
- `src/modules/sfdc/sfdc-webhook.service.spec.ts` — minimal AC11 spec for `processBookingStageWebhook` (added cycle-2 per review R1 / R4). Instantiates `SfdcWebhookService` directly with empty-object stubs for the two repositories and `EventEmitter2` (none touched on the booking-stage code path), spies on `logger.info`, and asserts: (a) the method resolves to the `{ statusCode: ACCEPTED, message, data: { opportunityId, bookingStage } }` envelope; (b) `logger.info` is invoked exactly once with metadata `objectContaining({ opportunityId, bookingStage, correlationId, rawPayload })`; (c) when `options.correlationId` is omitted, the metadata's `correlationId` is a non-empty string (from `crypto.randomUUID()`). See test-plan.md §3 for the matching coverage description.

### Existing files to edit
- `src/modules/sfdc/sfdc-webhook.controller.ts` — add `applyBookingStage` handler under `applyLeadChange`; add `BookingStageWebhookDto` import; add the `BookingStageWebhookResult` (or inline type) import from the service.
- `src/modules/sfdc/sfdc-webhook.service.ts` — add `processBookingStageWebhook` method (and a minimal `BookingStageWebhookResult` shape/interface or inline return type); import `BookingStageWebhookDto`.
- `src/modules/sfdc/sfdc-webhook.controller.spec.ts` — extend with a `describe('POST booking-stage', …)` block covering success (202), validation failure, guard rejection (mocked), and correlation-id forwarding.
- `src/modules/sfdc/dto/lead-change-webhook.dto.ts` — **in-scope regression fix:** add `@Expose({ name: 'PRID' })` to the existing `prid` property. The decorator was missing on `HEAD` and the co-located `lead-change-webhook.dto.spec.ts` cases asserting `instance.prid === 'PRID-001'` from `{ PRID: 'PRID-001' }` were red on the parent commit. This is the only edit permitted on the lead-change DTO; do not touch other fields, ordering, or transforms. See spec.md §Scope → In scope and AC14 for the rationale and scope-acceptance note.

### Files to verify only (no edits expected)
- `src/modules/sfdc/sfdc.module.ts` — confirm no new providers needed.
- `src/modules/sfdc/guards/sfdc-webhook-signature.guard.ts` — reused unchanged.
- `src/main.ts`, `src/validations/custom-pipe.validation.ts` — confirm global pipe stack is unchanged (read only if a test fails).

## Implementation Steps

### Step 1 — Create `BookingStageWebhookDto`
File: `src/modules/sfdc/dto/booking-stage-webhook.dto.ts`

- Imports: `Expose, Transform` from `class-transformer`; `IsDefined, IsNotEmpty, IsString` from `class-validator`.
- Class `BookingStageWebhookDto` with two properties:
  - `opportunityId: string` — `@Expose({ name: 'Opportunity ID' })`, `@IsDefined({ message: 'Opportunity ID is required' })`, `@IsString({ message: 'Opportunity ID must be a string' })`, `@IsNotEmpty({ message: 'Opportunity ID is required' })`, `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)`.
  - `bookingStage: string` — `@Expose({ name: 'Booking Stage' })`, `@IsDefined({ message: 'Booking Stage is required' })`, `@IsString({ message: 'Booking Stage must be a string' })`, `@IsNotEmpty({ message: 'Booking Stage is required' })`, same trim transform.
- Do **not** reuse `trimAndNullifyEmpty` (both fields are required; whitespace-only must fail, not pass through as `null`).
- Order class-validator decorators so `@IsString` runs before `@IsNotEmpty` and decorator order matches the existing DTO style. Apply `@Transform` last so trimming runs before `@IsNotEmpty` (note: `class-transformer` transforms run before `class-validator` validators in NestJS's `ValidationPipe` when `transform: true` — same behavior the existing DTO relies on).
- Brief docstring referencing the controller pipeline rationale (same as `LeadChangeWebhookDto`); keep concise.

### Step 2 — Add `processBookingStageWebhook` to `SfdcWebhookService`
File: `src/modules/sfdc/sfdc-webhook.service.ts`

- Add import: `BookingStageWebhookDto` from `./dto/booking-stage-webhook.dto`.
- Add a small return type next to `ApplyLeadChangeResult` (top-level for testability):
  - `BookingStageWebhookOptions { correlationId?: string; rawPayload?: Record<string, unknown> }`.
  - `BookingStageWebhookResult { statusCode: number; message: string; data: { opportunityId: string; bookingStage: string } }`.
- Add method on `SfdcWebhookService`:
  - Resolve `correlationId = options.correlationId || crypto.randomUUID()`.
  - Resolve `rawPayload = options.rawPayload ?? {}`.
  - Wrap body in `try { … } catch (error) { if (error instanceof HttpException) throw error; logsAndErrorHandling('SfdcWebhookService - processBookingStageWebhook', error, { opportunityId: dto.opportunityId, correlationId }); throw error; }`.
  - Inside `try`: emit a single `logger.info('SFDC webhook: booking stage accepted.', { opportunityId: dto.opportunityId, bookingStage: dto.bookingStage, correlationId, rawPayload });`.
  - Return `{ statusCode: ACCEPTED, message: 'Booking stage webhook accepted.', data: { opportunityId: dto.opportunityId, bookingStage: dto.bookingStage } }`.
- No repository calls, no event emission, no `notifyAdmins`. Do not modify `applyLeadChange` or any private helpers.

### Step 3 — Add `applyBookingStage` handler on `SfdcWebhookController`
File: `src/modules/sfdc/sfdc-webhook.controller.ts`

- Add imports: `BookingStageWebhookDto` from `./dto/booking-stage-webhook.dto`; add `BookingStageWebhookResult` to the existing `./sfdc-webhook.service` import.
- Below `applyLeadChange`, add `applyBookingStage` with the same decorator stack:
  - `@Post('booking-stage')`
  - `@HttpCode(HttpStatus.ACCEPTED)`
  - `@SkipDecryption()`
  - `@UseGuards(SfdcWebhookSignatureGuard)`
  - `@UsePipes(new ValidationPipe({ whitelist: true, transform: true, stopAtFirstError: true }))`
- Body:
  - Read `req.headers?.['x-request-id']`, normalize `string | string[] | undefined` → `string | undefined`.
  - Call `this.sfdcWebhookService.processBookingStageWebhook(dto, { correlationId, rawPayload: (req.body as Record<string, unknown>) ?? {} })` and return its result.
- Keep `applyLeadChange` and the controller-level `@Controller('sfdc/webhooks')` untouched.

### Step 4 — Verify module wiring
File: `src/modules/sfdc/sfdc.module.ts`

- Open once; confirm `SfdcWebhookController` is in `controllers` and `SfdcWebhookService` is in `providers`. Make no changes.

### Step 5 — DTO unit tests
File: `src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts`

- Mirror structure of `lead-change-webhook.dto.spec.ts`. Cover:
  - `plainToInstance` remap: `{ 'Opportunity ID': '006XXXXXXXXXXXX', 'Booking Stage': 'BOOKED' }` → `{ opportunityId, bookingStage }`.
  - Trim behavior on both fields (`'  006…  '` → `'006…'`, `'  BOOKED  '` → `'BOOKED'`).
  - `validate(plainToInstance(...))` failure cases (assert error `constraints` messages):
    - Missing `Opportunity ID` → `'Opportunity ID is required'`.
    - Missing `Booking Stage` → `'Booking Stage is required'`.
    - Whitespace-only `Opportunity ID` → `'Opportunity ID is required'` (post-trim).
    - Whitespace-only `Booking Stage` → `'Booking Stage is required'` (post-trim).
    - Non-string `Opportunity ID` (e.g. number) → `'Opportunity ID must be a string'`.
    - Non-string `Booking Stage` → `'Booking Stage must be a string'`.
  - Unknown SFDC keys are ignored (no validation error; the DTO instance has no extra properties — note `whitelist` stripping happens in the pipe, not in `plainToInstance`, so this can be expressed as "extra keys on the input do not produce validation errors").

### Step 6 — Controller unit tests
File: `src/modules/sfdc/sfdc-webhook.controller.spec.ts`

- Add a `describe('POST booking-stage', …)` block (or extend existing `describe(SfdcWebhookController)`):
  - Mock `SfdcWebhookService.processBookingStageWebhook` and assert it is called exactly once with the parsed DTO and `{ correlationId, rawPayload }`.
  - Build a request with `x-request-id` and assert `correlationId` is forwarded.
  - Build a request without `x-request-id`; assert handler still calls the service (service generates id internally — assertion only on call shape).
  - Assert HTTP 202 (verify via decorator metadata or call shape — keep style consistent with existing `lead-changes` tests).
  - Confirm existing `lead-changes` tests still pass unchanged (no regressions).
- If the existing spec mocks the guard globally, reuse the same override; do not introduce a new guard mock pattern.

### Step 7 — Quality gates
- `npm run lint` → must pass clean (no new warnings).
- `npm run test -- src/modules/sfdc` → fast targeted Jest run; expect new specs to pass and existing `lead-changes` specs to stay green.
- `npm run build` → confirm TypeScript compiles.
- Run `npm run test` once at the end to confirm no cross-module regressions.

## Validation Commands

```bash
npm run lint
npm run test -- src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts
npm run test -- src/modules/sfdc/sfdc-webhook.controller.spec.ts
npm run build
npm run test
```

Optional manual smoke (only if implementer wants to verify the live route — not required for AC sign-off):

```bash
npm run start:dev
# POST http://localhost:<port>/api/<NODE_ENV>/sfdc/webhooks/booking-stage
# Headers: X-API-Key, X-Timestamp, X-Signature (HMAC-SHA256 of `${timestamp}.${rawBody}` with client secret)
# Body: { "Opportunity ID": "006XXXXXXXXXXXX", "Booking Stage": "BOOKED" }
# Expect: HTTP 202 with { statusCode, message, data: { opportunityId, bookingStage } }
```

## Risks

1. **Pipe ordering / `@Expose` remap regression.** The DTO depends on the existing global `ValidationPipe` + `CustomValidationPipe` + route-scoped `ValidationPipe` chain documented in `SfdcWebhookController`. Do **not** add `excludeExtraneousValues: true` and do **not** change pipe config — would wipe the `@Expose`-remapped `opportunityId` / `bookingStage` values. Covered by the DTO `plainToInstance` test.
2. **Trim vs. `@IsNotEmpty` ordering.** If `@Transform` does not run before `@IsNotEmpty`, whitespace-only payloads would pass validation and fail AC6. The existing `LeadChangeWebhookDto` proves this ordering works under the project's pipe stack — keep the same decorator pattern.
3. **Accidental scope creep.** Easy to mistakenly add a repo injection, event emission, or `notifyAdmins` call by copy-pasting from `applyLeadChange`. The service method must be purely log + return; review the diff before committing to confirm zero DB/queue/event code paths.
4. **Logger payload size.** Logging the full raw payload is required by the spec, but the payload should be small (two fields). If extra SFDC keys arrive, they will appear in `rawPayload`; acceptable per spec and existing log patterns.
5. **Controller-spec guard mocking drift.** If `sfdc-webhook.controller.spec.ts` mocks `SfdcWebhookSignatureGuard` with `canActivate: () => true`, the new tests must reuse the same override (not introduce a parallel mock) to avoid flaky failures.
6. **Route prefix.** The `api[/{NODE_ENV}]` prefix is global in `src/main.ts`. Do not add a `/api` literal to the `@Controller` or `@Post` paths.

## Assumptions

- Log shape resolves the truncated spec sentence as: `logger.info('SFDC webhook: booking stage accepted.', { opportunityId, bookingStage, correlationId, rawPayload })`. If product wants a different message or field set, the service log call is the only place to change.
- Response body shape: `{ statusCode: ACCEPTED, message: 'Booking stage webhook accepted.', data: { opportunityId, bookingStage } }` — consistent with `ApplyLeadChangeResult`. SFDC only consumes the status code, so any minimal shape is acceptable.
- No `@IsIn`/enum validation on `bookingStage` for now — accept any non-empty trimmed string per the open-question note in the spec.
- Correlation id source remains `x-request-id` to match `applyLeadChange`. A future spec may align both endpoints on a different header.
- No new module providers needed; `SfdcWebhookController` and `SfdcWebhookService` are already registered in `SfdcModule`.
