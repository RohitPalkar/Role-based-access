# Review Pointers — PB-188 Cycle 1

Findings:

## R1 — Out-of-scope, undocumented edit to `LeadChangeWebhookDto` (severity: medium)

[src/modules/sfdc/dto/lead-change-webhook.dto.ts](src/modules/sfdc/dto/lead-change-webhook.dto.ts) adds `@Expose({ name: 'PRID' })` to the pre-existing `prid` field (line 30). The PB-188 cycle-3 [implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md) (§Target Files) and [spec.md](docs/ai/stories/PB-188/spec.md) (§Scope, §Out of scope) both scope this story to the new booking-stage endpoint and do **not** list `lead-change-webhook.dto.ts` as a target file. AC14 explicitly states "the existing `POST /api/sfdc/webhooks/lead-changes` endpoint continues to work unchanged (no regressions in `applyLeadChange` behavior or its controller-spec test)" — adding the `@Expose` decorator changes how SFDC's `PRID` source key is consumed at runtime (previously the property name `prid` did not auto-remap from the spaced/PascalCase `PRID` source key).

The change is almost certainly a real fix — `src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts` lines 18-28 assert `instance.prid === 'PRID-001'` from input `{ PRID: 'PRID-001' }`, which only works once this decorator is present. Confirmed via `git show HEAD:src/modules/sfdc/dto/lead-change-webhook.dto.ts` that the prior committed file did not have it, suggesting the existing DTO spec was either green by accident (e.g. due to `enableImplicitConversion` in the global pipe) or already silently red on `Feature/PB-188/sfdc-webhook` HEAD.

Action — pick one:
- Document the fix in [implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md), [spec.md](docs/ai/stories/PB-188/spec.md), and [test-plan.md](docs/ai/stories/PB-188/test-plan.md) (and tighten AC14 wording so it does not contradict the change), OR
- Split the `LeadChangeWebhookDto` patch out into its own bug-fix PR/story so PB-188 contains booking-stage code only.

Either way, run `npm run test -- src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts` against `Feature/PB-188/sfdc-webhook~1` (the parent commit) to confirm whether the lead-change DTO spec was passing or failing before this PR — if it was failing, call that out explicitly in the commit message / PR body so reviewers understand it as a regression fix rather than scope creep.

## R2 — Missing `HttpException` propagation test for `applyBookingStage` (severity: low)

[docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) §"What Each Spec Covers" item 2 lists "Service rejection — `HttpException` subclasses propagate (AC14 regression contract)" as a required controller-spec case for the new route, mirroring the existing lead-change `NotFoundException` propagation case at [src/modules/sfdc/sfdc-webhook.controller.spec.ts](src/modules/sfdc/sfdc-webhook.controller.spec.ts) lines 107-116. The implemented `describe('POST booking-stage', …)` block (lines 118-217) covers happy paths, correlation-id forwarding, and lead-change handler isolation, but no case asserts that a rejected service promise propagates as the same exception instance.

Add a case such as:

```ts
it('propagates HttpException raised by the service', async () => {
  service.processBookingStageWebhook.mockRejectedValue(
    new BadRequestException('bad'),
  );
  const dto: BookingStageWebhookDto = {
    opportunityId: '006XXXXXXXXXXXX',
    bookingStage: 'BOOKED',
  };
  await expect(
    controller.applyBookingStage(dto, buildRequest()),
  ).rejects.toBeInstanceOf(BadRequestException);
});
```

This guards against any future controller change (e.g. adding a `try/catch`) silently swallowing service errors.

## R3 — `rawPayload ?? {}` defensive fallback is not exercised by any test (severity: low)

[src/modules/sfdc/sfdc-webhook.controller.ts](src/modules/sfdc/sfdc-webhook.controller.ts) line 148 uses `(req.body as Record<string, unknown>) ?? {}`. The test plan §"What Each Spec Covers" item 2 explicitly calls for: "Missing `req.body` → `rawPayload` defaults to `{}`. Documents the `?? {}` fallback the implementation plan calls out."

The current `buildRequest` helper at [src/modules/sfdc/sfdc-webhook.controller.spec.ts](src/modules/sfdc/sfdc-webhook.controller.spec.ts) lines 39-46 always provides `body = {}` (the parameter default), so the booking-stage cases at lines 162 and 199 only exercise the truthy branch of the coalesce. Add a case that drives `req.body` to `undefined` / `null`, e.g.:

```ts
it('defaults rawPayload to {} when req.body is undefined', async () => {
  service.processBookingStageWebhook.mockResolvedValue(bookingStageSuccess());
  const req = { headers: {}, body: undefined } as unknown as Request;
  const dto: BookingStageWebhookDto = {
    opportunityId: '006XXXXXXXXXXXX',
    bookingStage: 'BOOKED',
  };

  await controller.applyBookingStage(dto, req);

  expect(service.processBookingStageWebhook).toHaveBeenCalledWith(
    dto,
    expect.objectContaining({ rawPayload: {} }),
  );
});
```

If the same coverage gap exists for `applyLeadChange`, add the symmetric case there too — but only if you accept the wider scope; otherwise this is booking-stage-only.

## R4 — AC11 log-line contract is not asserted by any test (severity: low / suggestion)

AC11 from [docs/ai/stories/PB-188/spec.md](docs/ai/stories/PB-188/spec.md) is the only direct behavioral contract of `processBookingStageWebhook`: "emits a structured `logger.info` line containing `opportunityId`, `bookingStage`, `correlationId`, and the raw payload". The implementation at [src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) lines 248-253 emits the call, but no test verifies it because no service-level spec was added.

[docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) §3 marks this coverage as optional ("only if the implementer wants belt-and-braces coverage"), so this is a soft finding rather than a must-fix. Recommendation:

- Add a minimal `src/modules/sfdc/sfdc-webhook.service.spec.ts` that constructs the service with stub repositories + `EventEmitter2` (none of those are touched on this code path), spies on `logger.info`, and asserts:
  1. The method resolves to `{ statusCode: ACCEPTED, message: 'Booking stage webhook accepted.', data: { opportunityId, bookingStage } }`.
  2. `logger.info` was called exactly once with metadata `expect.objectContaining({ opportunityId, bookingStage, correlationId, rawPayload })` — no assertion on the exact message string per the test plan's "no log-content over-asserting" rule.
  3. When `options.correlationId` is omitted, the metadata's `correlationId` is a non-empty string (from `crypto.randomUUID()`).

Without this, AC11 is review-gated only — fine if the team accepts that trade-off, but worth flagging in the PR description so reviewers know to inspect the log call site directly.
