# PB-188 — Final Review Summary

Scope of this pass: verify the user-requested change "use `eventEmitter.emit(EventMessagesEnum.CREATE_NOTIFICATIONS, ...)` instead of `await this.notificationService.create({ notifications: [...] })`" landed correctly, and re-confirm prior-cycle findings remain in the recorded state.

## Targeted Change — Verification

The webhook service no longer depends on `NotificationsService`. Admin fan-out is now an event emit, matching the convention used elsewhere in the codebase (`EoiManagementService`, `IncentivePayoutsService`).

- [src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) imports `EventEmitter2` (line 3) and `EventMessagesEnum` (line 16); the constructor injects `EventEmitter2` (line 110); `notifyAdmins` emits `EventMessagesEnum.CREATE_NOTIFICATIONS` with the `{ notifications: [{ type, title, message, isForAllAdmin: true }] }` envelope at lines 312–321. No `NotificationsService` is imported or injected.
- The emitter payload shape matches the existing `@OnEvent(EventMessagesEnum.CREATE_NOTIFICATIONS)` handler at [src/modules/notifications/notification.controller.ts](src/modules/notifications/notification.controller.ts) lines 43–46, which forwards `data` to `notificationService.create(data)`. The new SFDC call therefore reaches the same code path as the old direct invocation, only via the event bus.
- `EventEmitter2` is globally available — [src/app.module.ts](src/app.module.ts) line 84 registers `EventEmitterModule.forRoot()` — so [src/modules/sfdc/sfdc.module.ts](src/modules/sfdc/sfdc.module.ts) does not need an explicit `EventEmitterModule` import. The module no longer needs to import `NotificationsModule`, and it does not.
- The "best-effort" semantics around the notification are preserved: the emit is wrapped in `try { ... } catch (error) { logger.error(...) }` (lines 311–332) so a downstream listener failure cannot fail the webhook or block the `202 Accepted` response.
- [src/modules/sfdc/sfdc-webhook.service.spec.ts](src/modules/sfdc/sfdc-webhook.service.spec.ts) was updated to mirror the new contract: the suite mocks an `eventEmitter.emit` (line 42), constructs the service with it (lines 44–48), and asserts on lines 156–167 that emit was called once with `EventMessagesEnum.CREATE_NOTIFICATIONS` and the expected `{ notifications: [{ type: SFDC_WEBHOOK_NOTIFICATION_TYPE, isForAllAdmin: true, ... }] }` payload. The "voucher not found" (line 62), idempotent-duplicate (line 218), and "notification throws → still 202" (lines 271–284) tests all reference the same emitter mock, so the regression net around the change is intact.

## Carry-Forward Status of Prior Findings

No new R-IDs are introduced in this pass. Carry-forwards from [review-pointers-cycle-3.md](.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/review-pointers-cycle-3.md):

- Cycle-3 R1 (DTO + Guard specs created): resolved in tree — see [src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts](src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts) and [src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts](src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts).
- Cycle-3 R2 (re-run unit-test-runner log including the four SFDC specs + three unrelated specs): still required pre-merge.
- Cycle-3 R3 (entity class-level docstring states the three-column `(prid, normalized_payload_hash, status)` unique key by name): resolved.
- Cycle-3 R4 (inline `NOTE (PB-188)` on the two unrelated spec edits): resolved.
- Cycle-3 R5 (final-summary R2 "resolved" claim accuracy): resolved once R1 landed.
- Cycle-3 R6 (controller docstring + DTO end-to-end remap coverage): resolved by the new DTO spec.

Items deferred to follow-up tickets remain unchanged from the cycle-3 summary: R7 (broader dedupe predicate), R9 (hash docstring placement), R10 (boot-time canary on encrypted env values), and the historical cycle-1 R7 (DB index on `vouchers.unique_reference_id`).

## New Findings

Findings: None

## Recommendation

The requested correction (event-bus notification instead of direct `NotificationsService.create`) has landed cleanly: production code, spec, and module wiring are all consistent, and the existing `@OnEvent` listener already routes the new event to `notificationService.create(data)`, so behaviour is preserved.

Pre-merge actions (carry-forward only — no new blockers introduced by this change):

1. Required: re-run the unit test command from cycle-3 R2 and attach the fresh `unit-test-runner.log` showing the four new SFDC specs plus the three branch-touched unrelated specs.
2. Nice-to-have: confirm the cycle-2/3 doc deferrals (R7 / R9 / R10) are tracked as follow-up tickets so they are not lost.
