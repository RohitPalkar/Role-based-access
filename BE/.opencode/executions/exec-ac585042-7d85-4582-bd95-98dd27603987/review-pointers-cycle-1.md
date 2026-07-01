# PB-188 Review Pointers — Cycle 1

The application will write the review markdown to `.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/review-pointers-cycle-1.md`. This plan reproduces the markdown body to be returned.

## Summary

The implementation matches the spec and plan in shape: a new `SfdcWebhookController` under the existing `SfdcModule`, a `SfdcWebhookBasicAuthGuard` using `crypto.timingSafeEqual`, a `SfdcWebhookService` that resolves `VoucherForm` by `uniqueReferenceId` (PRID) and updates inside a transaction, a DTO with `@Expose({ name: 'PRID' })` style mapping, and a TypeORM migration adding 11 nullable columns to `vouchers`. Co-located unit specs exist for controller, service, and guard. Findings below.

## Findings

### R1 — New SFDC webhook specs not exercised by the unit-test runner [must-fix]

The recorded test-runner log at [.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/unit-test-runner.log](.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/unit-test-runner.log) invokes Jest with an explicit list of `*.controller.spec.ts` files and does NOT include any of the new specs:
- [src/modules/sfdc/sfdc-webhook.controller.spec.ts](src/modules/sfdc/sfdc-webhook.controller.spec.ts)
- [src/modules/sfdc/sfdc-webhook.service.spec.ts](src/modules/sfdc/sfdc-webhook.service.spec.ts)
- [src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts](src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts)

There is no recorded evidence that the new specs compile or pass. Run them explicitly (per the implementation plan §Validation Commands) and attach output before merge:

```bash
npx jest src/modules/sfdc/sfdc-webhook.controller.spec.ts \
         src/modules/sfdc/sfdc-webhook.service.spec.ts \
         src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts
```

### R2 — Stacked ValidationPipes may break the `@Expose({ name: 'PRID' })` mapping in real traffic [verify]

[src/modules/sfdc/sfdc-webhook.controller.ts](src/modules/sfdc/sfdc-webhook.controller.ts) declares a route-scoped pipe with `transformOptions: { excludeExtraneousValues: true }` (lines 55–62), but [src/main.ts](src/main.ts) (lines 84–87) already registers two global pipes (`ValidationPipe({ whitelist: true })` and `CustomValidationPipe` with `transform: true`). Pipes run global → method-scoped, each consuming the previous pipe's output.

After the two global pipes run, the input to the route-scoped pipe is already a transformed class instance with camelCase property names (`prid`, `leadStatus`, …) and the original PascalCase keys are gone. The route-scoped pipe then re-runs `plainToInstance` with `excludeExtraneousValues: true`, which only retains `@Expose`'d source keys — and the source key for `prid` is `'PRID'` (PascalCase), not `'prid'`. The final DTO is at risk of having `prid: undefined` for valid SFDC traffic.

This is the only place in the repo that uses `@Expose({ name: 'PascalCase' })` for input mapping, and there is no integration/E2E test. Pick one:
- Drop `transformOptions: { excludeExtraneousValues: true }` from the route-scoped pipe; rely on `whitelist: true` to strip unknown keys.
- Move PascalCase → camelCase normalization into a small dedicated transform pipe that runs first on this route, and bypass the global pipes for this controller.
- Add an integration test that POSTs `{ "PRID": "PRID-001", "Lead Status": "Hot" }` and asserts the service receives `dto.prid === 'PRID-001'`.

### R3 — `IsNotEmptyTrimmed` returns `true` for `undefined`, masking missing-field semantics [should-fix]

[src/validations/common-validator/isNotEmptyTrimmed.validator.ts](src/validations/common-validator/isNotEmptyTrimmed.validator.ts) lines 13–16:

```
validate(value: any) {
  return String(value).trim().length > 0;
}
```

For `undefined`, `String(undefined) === 'undefined'` (length 9), so this validator silently passes. On `prid`, `@IsString` still catches undefined, but the user-facing error message is `"PRID must be a string"` instead of `"PRID is required"`. Combined with R2 the contract is fragile. Replace `@IsNotEmptyTrimmed` on `prid` with `@IsNotEmpty()`/`@IsDefined()` from `class-validator`, or add a defensive `if (!dto.prid) throw new BadRequestException(...)` at the top of `SfdcWebhookService.applyLeadChange`.

### R4 — Test plan references stale file paths [doc fix]

[docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) references files under `src/modules/sfdc/webhooks/...` (lines 9–11, 13, 47, 94, 138). Actual implementation places them at `src/modules/sfdc/...` (no `webhooks/` subdir). Update the paths and the `npx jest src/modules/sfdc/webhooks` command on line 138 to match.

### R5 — Three unrelated test specs were modified outside the plan [scope]

The following diffs are not in [docs/ai/stories/PB-188/implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md) and have no relation to the SFDC webhook:
- [src/modules/agreement_signature_form/agreement_signature_form.controller.spec.ts](src/modules/agreement_signature_form/agreement_signature_form.controller.spec.ts) — replaces `jest.mock('debug', ...)` factory and adds `EventEmitter2` provider.
- [src/modules/eoi_manager/eoi_campaign/eoi_campaign.controller.spec.ts](src/modules/eoi_manager/eoi_campaign/eoi_campaign.controller.spec.ts) — adds `venueName` and `agreementDocLink` to mock DTOs in three places.
- [src/modules/eoi_manager/eoi_management/eoi_management.controller.spec.ts](src/modules/eoi_manager/eoi_management/eoi_management.controller.spec.ts) — adds `residentStatus: 'INDIAN'` to two mock DTOs.

Likely fixes for previously-drifted mocks. Move to a separate PR or document why they belong here.

### R6 — No-diff webhook does not bump audit columns [confirm intent]

[src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) lines 88–106 short-circuit when `changedFields.length === 0`, so `sfdc_last_webhook_at` and `sfdc_updated_by` are not written. Spec FR §7 requires audit information for "when … fields were changed by SFDC". A heartbeat-style timestamp bump is currently absent for no-diff hits. Confirm intended behavior; if heartbeat is desired, write only the audit columns even when `updates` is empty.

### R7 — `unique_reference_id` lookup column has no DB index [follow-up]

[src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity.ts](src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity.ts) lines 47–48 declare `unique_reference_id` without `@Index()`/uniqueness. The plan defers indexing, but the SFDC webhook hot path runs `findOne({ where: { uniqueReferenceId: dto.prid } })` per call. Confirm a DB-level index exists or schedule a follow-up migration.

### R8 — Unreachable `throw new InternalServerErrorException` after `logsAndErrorHandling` [minor]

[src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) lines 137–143 have a trailing `throw new InternalServerErrorException('SFDC webhook update failed.')` after a `logsAndErrorHandling` call that "always throws". If `logsAndErrorHandling`'s contract changes, two competing exceptions could be raised. Type the helper as `(...) => never` (and rely solely on its throw) or have it only log and rely solely on the new throw — but don't keep both implicit.
