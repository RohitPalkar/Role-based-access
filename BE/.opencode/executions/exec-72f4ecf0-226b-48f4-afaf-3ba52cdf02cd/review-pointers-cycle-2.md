# Review Pointers — PB-188 Cycle 2

Findings:

## R1 — `sfdc-webhook.service.spec.ts` promised by the test plan is missing (severity: medium)

[docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) §3 ("`sfdc-webhook.service.spec.ts` — minimal AC11 spec **added this cycle**", lines 120–129) and the AC mapping row at line 144 — `AC11: ... Covered By Controller spec ... **and** sfdc-webhook.service.spec.ts (added this cycle ...)` — explicitly assert that a service-level spec asserting the structured `logger.info` contract is shipped this cycle. The file does not exist on disk.

Verified:

- `ls src/modules/sfdc/*.spec.ts` → only `sfdc-webhook.controller.spec.ts` and `sfdc.controller.spec.ts` (the booking-stage controller spec is present, but no service spec).
- The implementation at [src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) lines 248–253 does emit the required `logger.info('SFDC webhook: booking stage accepted.', { opportunityId, bookingStage, correlationId, rawPayload })`, so AC11 is satisfied **functionally** but is **unverified by automated tests**. The controller spec cannot close this gap because `SfdcWebhookService` is mocked there, so no assertion ever sees the real `logger.info` call.
- [.opencode/executions/exec-72f4ecf0-226b-48f4-afaf-3ba52cdf02cd/final-summary.md](.opencode/executions/exec-72f4ecf0-226b-48f4-afaf-3ba52cdf02cd/final-summary.md) lines 18–22 claim the file was added at lines 49–98 with three cases. That claim is incorrect — the artifact is stale relative to the working tree.
- Doc drift: [docs/ai/stories/PB-188/implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md) §"New files to create" (lines 15–17) lists only `booking-stage-webhook.dto.ts` and `booking-stage-webhook.dto.spec.ts`, never the service spec. The test plan and implementation plan now disagree.

Action — pick one:

- Add `src/modules/sfdc/sfdc-webhook.service.spec.ts` with the three cases described in test-plan.md §3:
  1. Resolves to `{ statusCode: ACCEPTED, message: 'Booking stage webhook accepted.', data: { opportunityId, bookingStage } }`.
  2. `logger.info` invoked exactly once with metadata `expect.objectContaining({ opportunityId, bookingStage, correlationId, rawPayload })` (no assertion on the literal message string per the test-plan's "no log-content over-asserting" rule).
  3. When `options.correlationId` is omitted, the metadata's `correlationId` is a non-empty string (from `crypto.randomUUID()`).

  Construct `SfdcWebhookService` directly with empty-object stubs for both repositories and `EventEmitter2` — the booking-stage code path does not touch any of them, so no `Test.createTestingModule` is required. Also add the file to implementation-plan.md §"New files to create" so both planning artifacts agree.

- OR revert test-plan.md §3 and the AC11 mapping row at line 144 back to the cycle-1 wording ("optional / belt-and-braces"), and add a short PR-description note that AC11's `logger.info` contract is review-gated rather than test-gated. This keeps the planning docs honest about shipped coverage.

Either path resolves the drift; the first path also closes the AC11 coverage gap that cycle-1 R4 originally flagged as a soft finding.
