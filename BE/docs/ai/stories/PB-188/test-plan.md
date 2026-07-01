# Test Plan — PB-188: SFDC Booking Stage Webhook

> **Scope (this cycle).** PB-188 adds the **booking-stage** endpoint
> (`POST /sfdc/webhooks/booking-stage`) on the existing
> `SfdcWebhookController`. The endpoint is **stateless**: it
> authenticates via the reused `SfdcWebhookSignatureGuard`, validates a
> two-field DTO, emits one `logger.info` line, and returns `202 Accepted`.
> No DB writes, no entities, no migrations, no queues, no events, no
> notifications.
>
> This plan supersedes the cycle-1/cycle-2 coverage that targeted basic
> auth, voucher mutation, and the change-request queue — that design
> shipped under the `lead-changes` endpoint and is intentionally **not**
> re-asserted here (its `*.spec.ts` files remain unchanged and are run
> as regression).

## Scope & Framework
- **Framework (detected):** Jest, run via `npm test`. No new framework is bootstrapped, no new dependencies are added.
- **Patterns followed (existing repo convention):**
  - `src/modules/sfdc/sfdc-webhook.controller.spec.ts` — `Test.createTestingModule` with `useValue` mock service and `.overrideGuard(SfdcWebhookSignatureGuard).useValue({ canActivate: () => true })`; `buildRequest` helper for the `Express.Request` shape; `afterEach(() => jest.clearAllMocks())`.
  - `src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts` — `plainToInstance` + `validate` from `class-transformer` / `class-validator`, no Nest test module needed.
  - `src/modules/sales/sales.controller.spec.ts`, `src/modules/google/google.controller.spec.ts`, `src/app.controller.spec.ts` — same minimal-module + `useValue` mocks idiom for controller-level tests across the repo.
- **File locations / naming:** `*.spec.ts` co-located next to the production file (`src/**/*.spec.ts`, per `docs/ai/context-map.json` → `testing.unitPattern`). New files this story adds:
  - `src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts` (new spec for the new DTO).
  - `src/modules/sfdc/sfdc-webhook.controller.spec.ts` (extended — add a `describe('POST booking-stage', …)` block; do **not** create a parallel controller spec file).
- **Target commands** (no new scripts):
  - `npm run test -- src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts` — new DTO spec only.
  - `npm run test -- src/modules/sfdc/sfdc-webhook.controller.spec.ts` — extended controller spec, exercises both the existing `lead-changes` cases and the new `booking-stage` cases in one run.
  - `npm run test -- src/modules/sfdc` — fast targeted Jest run for the whole module before merge.
  - `npm test` — full unit sweep before merge.
- **Conventions to honor:**
  - Reuse Nest `Test.createTestingModule` with `useValue` mocks (no real DB, no real HTTP).
  - Reuse the existing `.overrideGuard(SfdcWebhookSignatureGuard).useValue({ canActivate: () => true })` pattern — do **not** introduce a parallel guard mock.
  - Reuse the existing `buildRequest(headers, body)` helper in `sfdc-webhook.controller.spec.ts` rather than re-implementing it; the new `describe` block must share the same fixture style for consistency.
  - DTO spec uses pure `class-transformer` / `class-validator` (no Nest test module).
  - Do **not** import or rely on global pipes, guards, interceptors, `AppModule`, or `main.ts`. Unit specs exercise only the unit under test.
  - `afterEach(() => jest.clearAllMocks())` (matches the existing controller spec).

## Hard Constraints Reflected in the Plan
- **Do not edit production code** in this stage. The implementation files for the booking-stage route (`BookingStageWebhookDto`, `processBookingStageWebhook`, `applyBookingStage` handler) do not exist yet; this plan describes the spec coverage the implementer will add alongside those files.
- **No new dependencies, no new test framework.** Jest + `class-validator` + `class-transformer` are already in the dev deps and used by the sibling DTO spec.
- **No broad final assertions on un-implemented internals.** Implementation-specific exact strings (the literal log message, the literal response `message`, the inline / exported return-type interface name) are marked `TODO` and resolved at implementation time.
- **No global response-envelope assertions inside unit specs.** The `ResponseInterceptor` (`src/interceptors/transform.interceptor.ts`) is not in the unit test pipeline; only assert on what the controller/service directly returns.
- **No log-content over-asserting.** Logs are observability, not contract; at most assert that a `logger.info` spy was invoked once with structured metadata containing the required keys.
- **Reuse, do not duplicate.** The new controller cases live inside the existing `describe('SfdcWebhookController', …)` block so the guard override and `buildRequest` helper are shared.

## What Each Spec Covers

### 1. `src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts` (new)

Mirrors the structure of `dto/lead-change-webhook.dto.spec.ts`. Uses
`plainToInstance(BookingStageWebhookDto, raw)` and `validate(instance)`;
no Nest test module.

Cases:
- **`@Expose` source-key remap (AC8):** `plainToInstance(BookingStageWebhookDto, { 'Opportunity ID': '006XXXXXXXXXXXX', 'Booking Stage': 'BOOKED' })` produces an instance where `instance.opportunityId === '006XXXXXXXXXXXX'` and `instance.bookingStage === 'BOOKED'`.
- **Trim behavior on both fields (AC9):** Whitespace-padded values are trimmed on both `opportunityId` and `bookingStage` (e.g. `'  006XXX  '` → `'006XXX'`, `'  BOOKED  '` → `'BOOKED'`). Assert via the resulting instance properties (the `@Transform` runs as part of `plainToInstance`).
- **Validation pass on the documented happy payload:** `await validate(instance)` returns `[]` when both fields are non-empty trimmed strings.
- **Validation fail — `Opportunity ID` missing (AC4):** Input without an `Opportunity ID` key produces an error on the `opportunityId` property; the joined `constraints` values include `'Opportunity ID is required'`. Assert error shape, not exact list of constraint keys.
- **Validation fail — `Booking Stage` missing (AC5):** Input without a `Booking Stage` key produces an error on the `bookingStage` property; the joined `constraints` values include `'Booking Stage is required'`.
- **Validation fail — whitespace-only `Opportunity ID` (AC6):** Input `{ 'Opportunity ID': '   ', 'Booking Stage': 'BOOKED' }` is rejected after trimming; the error on `opportunityId` includes `'Opportunity ID is required'`. Confirms `@Transform` runs before `@IsNotEmpty`.
- **Validation fail — whitespace-only `Booking Stage` (AC6):** Symmetric to the above for `bookingStage`.
- **Validation fail — non-string `Opportunity ID` (AC7):** Input `{ 'Opportunity ID': 42, 'Booking Stage': 'BOOKED' }` cast through `as unknown as string` produces an error on `opportunityId` whose constraint message includes `'Opportunity ID must be a string'`.
- **Validation fail — non-string `Booking Stage` (AC7):** Symmetric for `bookingStage`.
- **Unknown SFDC keys ignored at the DTO level (AC10):** `plainToInstance` with an extra key (e.g. `'Account Id': 'ACC-1'`) does not raise a validation error and does not produce a typed property for the unknown key. Note in the spec body that the actual stripping of unknown keys happens in the route-scoped `ValidationPipe` with `whitelist: true` — the DTO-level assertion only proves "extra input keys do not produce validation errors and do not bleed into typed properties".
- **TODO (impl-time):** Confirm the implemented constraint-message strings match exactly (`'Opportunity ID is required'`, `'Opportunity ID must be a string'`, `'Booking Stage is required'`, `'Booking Stage must be a string'`) per the implementation plan. If the implementer chooses a slightly different wording, update the matcher in the test to the exact string the DTO emits (the implementation plan freezes these strings, so an exact `.toContain(...)` is preferred over a loose `/required/i` match).

Mock surface:
- `class-transformer` `plainToInstance` and `class-validator` `validate` only. No Nest test module, no DI container.

Out of scope:
- Pipe-level `whitelist: true` stripping behavior — that lives in the global `CustomValidationPipe` / route-scoped `ValidationPipe`, not in the DTO; not a unit-test concern.
- HTTP transport, headers, guard behavior — covered in the controller spec.

### 2. `src/modules/sfdc/sfdc-webhook.controller.spec.ts` (extend existing)

Add a `describe('POST booking-stage', …)` block inside the existing
`describe('SfdcWebhookController', …)`. Reuse the `Test.createTestingModule`
setup, the `.overrideGuard(SfdcWebhookSignatureGuard).useValue({ canActivate: () => true })`
stub, and the `buildRequest(headers, body)` helper already in the file.

`beforeEach` extension:
- Add a `processBookingStageWebhook: jest.Mock` field to the same `service` mock object so the existing `applyLeadChange` cases continue to compile (TypeScript will require both methods on the mock if the controller import surface changes). Example:
  ```ts
  service = {
    applyLeadChange: jest.fn(),
    processBookingStageWebhook: jest.fn(),
  };
  ```
  Do **not** create a second `TestingModule` instance for the booking-stage cases; reuse the one already built in the outer `beforeEach`.

Cases:
- **Happy path — passes parsed DTO + headers to the service, returns its result verbatim (AC2, AC11, AC15):**
  - `dto = { opportunityId: '006XXXXXXXXXXXX', bookingStage: 'BOOKED' }`.
  - `rawBody = { 'Opportunity ID': '006XXXXXXXXXXXX', 'Booking Stage': 'BOOKED' }`.
  - `service.processBookingStageWebhook.mockResolvedValue(<expected envelope>)`.
  - Call `controller.applyBookingStage(dto, buildRequest({ 'x-request-id': 'req-1' }, rawBody))`.
  - Assert the returned value strictly equals the mocked envelope.
  - Assert `service.processBookingStageWebhook` was called exactly once with `(dto, { correlationId: 'req-1', rawPayload: rawBody })`.
  - **TODO (impl-time):** Replace `<expected envelope>` with the exact shape returned by the implemented service — per the implementation plan this is `{ statusCode: ACCEPTED, message: 'Booking stage webhook accepted.', data: { opportunityId, bookingStage } }`. Import `ACCEPTED` from `src/config/constants` as the existing tests already do.
- **Missing `x-request-id` header → `correlationId` forwarded as `undefined` (AC11):** Mirrors the existing `applyLeadChange` "passes undefined correlationId when the x-request-id header is absent" case. Assert call shape: `service.processBookingStageWebhook` called with `{ correlationId: undefined, rawPayload: {} }`.
- **`x-request-id` sent as an array → first value used (AC11):** Mirrors the existing `applyLeadChange` "uses the first value when x-request-id is sent as an array" case. Assert `correlationId === 'req-A'` is forwarded when the header is `['req-A', 'req-B']`.
- **Missing `req.body` → `rawPayload` defaults to `{}`:** Call `controller.applyBookingStage(dto, buildRequest({}, undefined as unknown as Record<string, unknown>))` (or set `body` to `null` via the helper). Assert `service.processBookingStageWebhook` was called with `{ correlationId: undefined, rawPayload: {} }`. Documents the `?? {}` fallback the implementation plan calls out.
- **Service rejection — `HttpException` subclasses propagate (AC14 regression contract):** Mock `service.processBookingStageWebhook.mockRejectedValue(new BadRequestException(...))` and assert `await expect(controller.applyBookingStage(...)).rejects.toBeInstanceOf(BadRequestException)`. Mirrors the existing `NotFoundException` propagation case for `applyLeadChange`. Documents that the controller does not swallow errors.
- **Guard is wired (AC3, defense-in-depth):** Because the guard is overridden to return `true` for unit tests, a direct assertion that "the real guard ran" is integration scope; instead assert that the controller class metadata declares the guard on the handler — i.e. `Reflect.getMetadata('__guards__', SfdcWebhookController.prototype.applyBookingStage)` resolves to an array that includes `SfdcWebhookSignatureGuard`. Keep this assertion loose (`expect(guards).toContain(SfdcWebhookSignatureGuard)`); if the existing `applyLeadChange` test does not use this pattern, mark this case as **TODO** and rely on the regression test for the existing handler instead.
  - **Note:** Real "missing/invalid HMAC headers → 401" behavior lives in the guard's own spec (already covered out-of-scope of this story by the existing `SfdcWebhookSignatureGuard`). Do not duplicate guard auth assertions here.
- **HTTP 202 contract (AC2):** Assert via decorator metadata — `Reflect.getMetadata('__httpCode__', SfdcWebhookController.prototype.applyBookingStage) === HttpStatus.ACCEPTED`. Mirror the assertion style on `applyLeadChange` if the existing spec already asserts it; otherwise mark **TODO** and rely on the route's `@HttpCode(HttpStatus.ACCEPTED)` decorator at the source level. Do not boot Nest's HTTP adapter just for this assertion.
- **Existing `lead-changes` cases continue to pass unchanged (AC14):** The five existing `it(...)` blocks in `sfdc-webhook.controller.spec.ts` must remain green. If extending the `service` mock object causes a TypeScript or `expect.objectContaining` mismatch in those tests, repair the fixture rather than weakening the existing assertions.

Mock surface:
- `SfdcWebhookService` → `{ applyLeadChange: jest.fn(), processBookingStageWebhook: jest.fn() }` (same `useValue` instance).
- `SfdcWebhookSignatureGuard` → `.overrideGuard().useValue({ canActivate: () => true })` (already in place).
- No `EventEmitter2`, no DB, no HTTP server, no logger spy at the controller level.

Out of scope at the controller-spec level:
- Real HMAC + API-Key verification (lives in `SfdcWebhookSignatureGuard` and its own spec — not part of this story).
- Pipe behavior (the route-scoped `ValidationPipe` is bypassed when invoking the handler method directly with a typed DTO; pipe behavior is asserted indirectly by the DTO spec).
- The global `ResponseInterceptor` envelope shape — the controller returns the raw service result per the existing `lead-changes` contract.

### 3. `src/modules/sfdc/sfdc-webhook.service.spec.ts` — minimal AC11 spec added this cycle

Rationale (updated after cycle-1 review):
- AC11 is the only direct behavioral contract of `processBookingStageWebhook` ("emits a structured `logger.info` line containing `opportunityId`, `bookingStage`, `correlationId`, and the raw payload"), and the controller spec cannot observe it because the service is mocked. A tiny co-located service spec closes that gap without bootstrapping Nest or touching the existing module-spec convention.
- The new file instantiates `SfdcWebhookService` directly with empty-object stubs for `Repository<VoucherForm>`, `Repository<SfdcVoucherChangeRequest>`, and `EventEmitter2` — none of those collaborators are exercised on this code path, so no `Test.createTestingModule` is needed.
- Spec asserts:
  1. The method resolves to `{ statusCode: ACCEPTED, message: 'Booking stage webhook accepted.', data: { opportunityId, bookingStage } }`.
  2. `logger.info` is called exactly once with metadata `expect.objectContaining({ opportunityId, bookingStage, correlationId, rawPayload })` — no assertion on the literal message string (honors the "no log-content over-asserting" rule above).
  3. When `options.correlationId` is omitted, the metadata's `correlationId` is a non-empty string (from `crypto.randomUUID()`).
- If a future story expands the service (idempotency, persistence, event emission), grow this file alongside it and adopt the `Test.createTestingModule` + `useValue` mocks pattern from `voucher_form.controller.spec.ts`.

## Mapping to Acceptance Criteria
| Acceptance Criterion (spec.md) | Covered By |
| --- | --- |
| AC1: Route registered (`/api/sfdc/webhooks/booking-stage` prod, `/api/{NODE_ENV}/...` non-prod) | Integration / manual smoke per implementation-plan §Validation. Not asserted in unit specs (no global prefix booted). |
| AC2: Valid request → HTTP `202 Accepted` | Controller spec — `@HttpCode(HttpStatus.ACCEPTED)` metadata assertion (TODO at impl-time) + service return-shape pass-through. |
| AC3: Missing/invalid HMAC headers rejected with no service call, no acceptance log | Lives in `SfdcWebhookSignatureGuard` and its own spec (out of this story). Controller spec asserts the guard is wired via decorator metadata. |
| AC4: Missing `Opportunity ID` → 400 with `'Opportunity ID is required'` | DTO spec (`validate()` failure on `opportunityId`). 400-on-the-wire is the global `ValidationPipe`'s job, asserted at integration scope. |
| AC5: Missing `Booking Stage` → 400 with `'Booking Stage is required'` | DTO spec (`validate()` failure on `bookingStage`). |
| AC6: Whitespace-only value rejected after trim | DTO spec (whitespace-only `opportunityId` / `bookingStage` cases). |
| AC7: Non-string value rejected with `'... must be a string'` | DTO spec (non-string cases for both fields). |
| AC8: `@Expose` remap (PascalCase → camelCase) | DTO spec (`plainToInstance` remap case). |
| AC9: String values trimmed before reaching the service | DTO spec (trim cases). |
| AC10: Unknown SFDC keys silently stripped, raw payload preserved | DTO spec (unknown-keys-ignored case) + controller spec (`rawPayload` forwarded verbatim from `req.body`). |
| AC11: Service invoked exactly once with the DTO and `{ correlationId, rawPayload }`; emits structured `logger.info` line | Controller spec (call-shape + correlationId forwarding) **and** `sfdc-webhook.service.spec.ts` (added this cycle — asserts exactly one `logger.info` call whose metadata includes `opportunityId`, `bookingStage`, `correlationId`, `rawPayload`; see §3). |
| AC12: Service performs zero DB ops, zero events, zero notifications | Enforced by the implementation (no repos / event emitter / notification helper injected for this method) and verified at code-review time; the service spec is intentionally omitted (no mock surface to assert against). The implementation plan and PR diff are the gating artifacts. |
| AC13: No new migrations / entities / repositories / queues / listeners | Verified at PR diff review. No test asserts the negative (would require AST inspection). |
| AC14: Existing `applyLeadChange` behavior is unchanged | The five existing `it(...)` blocks in `sfdc-webhook.controller.spec.ts` must remain green when the new `describe('POST booking-stage', …)` block is added. `dto/lead-change-webhook.dto.spec.ts` is untouched and continues to pass — note that this requires the in-scope regression fix on `LeadChangeWebhookDto.prid` (`@Expose({ name: 'PRID' })`); the spec was red on the parent commit without it. See spec.md §Scope → In scope. |
| AC15: New unit tests cover the DTO matrix + the new route; full `npm run test` passes | DTO spec (new file) + controller spec (extension) + `npm run test` final sweep. |
| AC16: `npm run lint` and `npm run build` pass | Implementation-plan §Validation; not a test-spec concern. |

## Risks & Mitigations (Test-Specific)
1. **`@Expose` remap drift.** The DTO is the only place in the repo that relies on `@Expose({ name })` for source-key remapping; the dedicated DTO spec asserts this end-to-end via `plainToInstance` so a future `class-transformer` upgrade or controller-pipe change cannot silently break the contract (mirrors the rationale already documented in `lead-change-webhook.dto.spec.ts`).
2. **Trim vs. `@IsNotEmpty` ordering.** If `@Transform` does not run before `@IsNotEmpty`, whitespace-only payloads would pass validation and fail AC6. The DTO spec's whitespace-only cases catch this. The existing `LeadChangeWebhookDto` proves this ordering works under the project's pipe stack; the new DTO must keep the same decorator pattern (validators first, `@Transform` last per the implementation plan).
3. **Service-mock shape drift across the existing `applyLeadChange` cases.** Extending the `service = { applyLeadChange: jest.fn() }` fixture to also expose `processBookingStageWebhook` must not change the call-signature expectations on the existing five cases. Repair any TypeScript / `toHaveBeenCalledWith` mismatches by adjusting the fixture, not by weakening the existing assertions.
4. **Controller-spec guard mocking drift.** The existing spec mocks `SfdcWebhookSignatureGuard` with `canActivate: () => true`. The new `describe('POST booking-stage', …)` block must reuse the same override (single `Test.createTestingModule` build in the outer `beforeEach`); do **not** introduce a parallel guard mock for the new cases.
5. **Decorator-metadata assertions are brittle.** `Reflect.getMetadata('__httpCode__', …)` and `Reflect.getMetadata('__guards__', …)` rely on Nest's internal metadata keys, which are stable but not part of Nest's public API. If asserting them is too noisy or version-fragile, drop those two assertions and rely on the existing controller-spec style (call-shape + return-value assertions) plus a source-level review of the decorators.
6. **Logger spy fragility (optional service spec).** If the optional `logger.info` spy in §3 is added, use `jest.spyOn(logger, 'info').mockImplementation(() => undefined)` and restore in `afterEach`. Assert call count + the metadata object's keys, not the exact log-message string (the message wording is implementation detail).
7. **No global pipe in unit specs.** Validation-pipe behavior (whitelist, transform, `excludeExtraneousValues`) is NOT under test in unit specs. AC4 / AC5 / AC7's "HTTP 400" wire-level behavior is integration scope; the unit-level coverage proves the DTO would produce the corresponding `class-validator` error, which is what the `ValidationPipe` translates into a 400.

## What Is Explicitly NOT Tested at the Unit Level
- The global `ResponseInterceptor` envelope shape (would require booting `AppModule`).
- The global `ValidationPipe` rejecting bad input with an HTTP 400 (integration / E2E concern).
- The global `api[/{NODE_ENV}]` prefix from `src/main.ts` (integration / manual smoke).
- The real `SfdcWebhookSignatureGuard` HMAC + API-Key verification (lives in the guard's own coverage; reused unchanged this story).
- The downstream consumers of the logged payload (audit / diagnostics tooling outside this repo).
- Real SFDC payload contract (auth-side, retry semantics) — handled by the SFDC team.
- TypeORM entities, migrations, queues, and notifications — explicitly out of story scope per AC12 / AC13; no negative tests are added because the implementation simply does not inject those collaborators on this code path.

## Starter Tests
**No new starter spec files are checked in by this stage.** Rationale:
- The implementation files this story introduces (`src/modules/sfdc/dto/booking-stage-webhook.dto.ts`, `processBookingStageWebhook` on `SfdcWebhookService`, `applyBookingStage` on `SfdcWebhookController`) do not exist yet. Creating spec files now that import `BookingStageWebhookDto` or call `controller.applyBookingStage` would either fail to compile or require committing red tests that disable themselves — both violate the hard constraint of "do not depend on changed implementation files as primary input" for this pre-implementation stage.
- The implementer should create `src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts` and extend `src/modules/sfdc/sfdc-webhook.controller.spec.ts` **alongside** (or just before) each production file lands, using the case lists in §1 and §2 as the test outline. This matches the cycle-1/cycle-2 approach already used by this story and the repo-wide convention of co-located `*.spec.ts`.

## Validation Commands
Run only what touches the changed surface:
- `npm run test -- src/modules/sfdc/dto/booking-stage-webhook.dto.spec.ts` — new DTO spec.
- `npm run test -- src/modules/sfdc/sfdc-webhook.controller.spec.ts` — extended controller spec (covers both the existing `lead-changes` cases and the new `booking-stage` cases).
- `npm run test -- src/modules/sfdc` — module-level Jest sweep, also runs `sfdc.controller.spec.ts` and `dto/lead-change-webhook.dto.spec.ts` as regression.
- `npm test` — final full unit sweep before merge.

Skip `test:e2e`, `test:cov`, and `start:dev` unless global wiring changes.
