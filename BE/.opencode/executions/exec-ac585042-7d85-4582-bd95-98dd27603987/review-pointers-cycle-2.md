# PB-188 Review Pointers — Cycle 2

The application will write this markdown body to `.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/review-pointers-cycle-2.md`. This plan reproduces the markdown body to be returned.

## Summary

Cycle 1 raised eight findings (R1–R8). Between cycle 1 and cycle 2 the implementer rearchitected the webhook: the inbound flow no longer mutates `vouchers` at all. It now persists each push as a `PENDING` row on a new `sfdc_voucher_change_requests` table and fires an admin notification, returning `202 Accepted`. The cycle-1 final-summary (which marked R6 "resolved by writing audit columns inside the transaction") describes a code state that no longer exists — neither the transaction nor the voucher-column writes are present in the current tree. The DTO, guard, and module wiring are otherwise close to plan.

Cycle-1 R1 (test runner not exercising the new specs) and cycle-1 R2 (no test proves the `@Expose({ name: 'PRID' })` remap works end-to-end) carry forward unchanged. Cycle-1 R3, R6, and R8 are either no longer applicable in the new shape or were addressed. Cycle-1 R4, R5, and R7 are partially open.

New cycle-2 findings are R1, R4–R10 below.

## Findings

### R1 — Implementation diverges from spec and plan without documented amendment [must-fix]

The current [src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) writes a `PENDING` row to [src/modules/sfdc/entities/sfdc-voucher-change-request.entity.ts](src/modules/sfdc/entities/sfdc-voucher-change-request.entity.ts) and explicitly does NOT touch `VoucherForm` — the service docstring at lines 97–100 states "This service does NOT mutate `VoucherForm`." The controller at [src/modules/sfdc/sfdc-webhook.controller.ts](src/modules/sfdc/sfdc-webhook.controller.ts) lines 67–68 also returns `HttpStatus.ACCEPTED` (202) on success.

This contradicts the current spec and plan, which were not updated:

- [docs/ai/stories/PB-188/spec.md](docs/ai/stories/PB-188/spec.md) AC3 / FR §3 / FR §6:
  - AC3: "A valid request with all listed SFDC fields and a known `PRID` updates the corresponding voucher/lead record in the database and returns a success response".
  - FR §3: "If found: update the mapped columns with the incoming values, persist, and return success."
  - FR §6: "200/201 on successful update."
  - FR §7: audit info for "which fields were changed by SFDC".
- [docs/ai/stories/PB-188/implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md) lines 3, 28, 34, 39, 50, 67–75: "Resolves `VoucherForm` by `PRID`, applies mapped field updates inside a transaction", adds 11 nullable columns to `vouchers`, migration named `AddSfdcWebhookFieldsToVouchers`, sets `sfdcLastWebhookAt` / `sfdcUpdatedBy`.

There is no follow-up spec/plan revision documenting the pivot to an admin-review-queue model. The current migration file is also renamed to [src/migrations/1779800000000-CreateSfdcVoucherChangeRequestsTable.ts](src/migrations/1779800000000-CreateSfdcVoucherChangeRequestsTable.ts) and creates a new table instead.

Decide one path and align everything:

- Revert the service to the spec'd behavior (update `VoucherForm` columns transactionally, return 200/201, keep audit columns). The cycle-1 review pointed in this direction and cycle-1 final-summary asserted (incorrectly) that the audit-column path was in place.
- Or keep the change-request-queue design but update [docs/ai/stories/PB-188/spec.md](docs/ai/stories/PB-188/spec.md) (acceptance criteria, response codes, FR §3 / FR §6 / FR §7), [docs/ai/stories/PB-188/implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md), and obtain explicit product-owner sign-off — this is a different feature from "update the voucher".

Until one of the two happens, AC3 is not satisfied as written.

### R2 — `@Expose({ name: 'PascalCase' })` remap still not verified end-to-end [must-fix]

Cycle-1 R2 was patched in code (the route-scoped `ValidationPipe` no longer carries `excludeExtraneousValues: true`, see [src/modules/sfdc/sfdc-webhook.controller.ts](src/modules/sfdc/sfdc-webhook.controller.ts) lines 71–77) but verification is still missing.

The controller spec [src/modules/sfdc/sfdc-webhook.controller.spec.ts](src/modules/sfdc/sfdc-webhook.controller.spec.ts) line 56 builds the DTO as `{ prid: 'PRID-001', leadStatus: 'Hot' }` — i.e. already camelCase — and never feeds a raw PascalCase / spaced-key payload through `plainToInstance(LeadChangeWebhookDto, ...)`. The service spec [src/modules/sfdc/sfdc-webhook.service.spec.ts](src/modules/sfdc/sfdc-webhook.service.spec.ts) does the same.

In real traffic the body is parsed by the two global pipes registered in [src/main.ts](src/main.ts) lines 84–87 (`ValidationPipe({ whitelist: true })` then `CustomValidationPipe` with `transform: true`), then by the route-scoped pipe. Without `excludeExtraneousValues: true`, class-transformer's behaviour around `@Expose({ name })` remapping is conditional, and this is the only place in the repo that relies on it for input keys. The DTO comment at [src/modules/sfdc/dto/lead-change-webhook.dto.ts](src/modules/sfdc/dto/lead-change-webhook.dto.ts) lines 17–22 asserts the mapping happens, but no test confirms it.

Pick at least one of:

- Add a focused DTO unit spec that asserts:

```ts
const instance = plainToInstance(LeadChangeWebhookDto, {
  PRID: 'PRID-001',
  'Lead Status': 'Hot',
  'SVH Status': 'SVH-Y',
});
expect(instance.prid).toBe('PRID-001');
expect(instance.leadStatus).toBe('Hot');
```

- Or add a NestJS e2e/integration test that POSTs the spaced PascalCase body and asserts `service.applyLeadChange` is called with `dto.prid === 'PRID-001'`.

Without one of these, R2 stays open and AC6 ("SFDC field names in the payload are correctly mapped to internal columns") is unverified.

### R3 — Recorded unit-test runner log still does not exercise the new specs [must-fix]

Carry-forward of cycle-1 R1, re-flagged because no fresh log exists in [.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/](.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/) that includes any of:

- [src/modules/sfdc/sfdc-webhook.controller.spec.ts](src/modules/sfdc/sfdc-webhook.controller.spec.ts)
- [src/modules/sfdc/sfdc-webhook.service.spec.ts](src/modules/sfdc/sfdc-webhook.service.spec.ts)
- [src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts](src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts)

Run them — alongside the three unrelated spec files modified in this branch ([R5](#r5--two-unrelated-spec-edits-still-have-no-recorded-rationale-should-fix)) — and attach the log before merge:

```bash
npx jest \
  src/modules/sfdc/sfdc-webhook.controller.spec.ts \
  src/modules/sfdc/sfdc-webhook.service.spec.ts \
  src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts \
  src/modules/agreement_signature_form/agreement_signature_form.controller.spec.ts \
  src/modules/eoi_manager/eoi_campaign/eoi_campaign.controller.spec.ts \
  src/modules/eoi_manager/eoi_management/eoi_management.controller.spec.ts
```

### R4 — Spec, implementation plan, and test plan are stale vs. the actual code [should-fix]

If R1 is resolved by keeping the change-request-queue design, all three story artifacts need to be rewritten before merge. Concrete drift:

- [docs/ai/stories/PB-188/spec.md](docs/ai/stories/PB-188/spec.md) — AC3 / FR §3 / FR §6 / FR §7 + the entire "Updates the corresponding voucher/lead record" framing.
- [docs/ai/stories/PB-188/implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md) — Target Files lists `AddSfdcWebhookFieldsToVouchers.ts` (the actual migration is `CreateSfdcVoucherChangeRequestsTable.ts`); §Implementation Steps step 5 ("apply mapped field updates inside a transaction", `sfdcLastWebhookAt`, `sfdcUpdatedBy`) is no longer how the service works; Target File `src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity.ts` is no longer edited.
- [docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) — service-spec section asserts `repository.update({ id: voucher.id }, <mapped updates>)` and `DataSource.transaction`; neither exists in the current service. References `internalFieldMap` (now `VOUCHER_FIELD_MAP` / `ALL_DTO_KEYS`). Line 94 still references `src/modules/sfdc/webhooks/dto/lead-change-webhook.dto.spec.ts` (stale path, also flagged in cycle-1 R4).

### R5 — Two unrelated spec edits still have no recorded rationale [should-fix]

Cycle-1 R5 carry-forward, partially addressed. [src/modules/agreement_signature_form/agreement_signature_form.controller.spec.ts](src/modules/agreement_signature_form/agreement_signature_form.controller.spec.ts) lines 1–10 now carries an inline "NOTE (PB-188)" explaining the `debug` factory expansion and `EventEmitter2` provider. The other two specs were edited with no comment, no plan entry, and no PR-description rationale:

- [src/modules/eoi_manager/eoi_campaign/eoi_campaign.controller.spec.ts](src/modules/eoi_manager/eoi_campaign/eoi_campaign.controller.spec.ts) — adds `venueName` + `agreementDocLink` to three mock DTOs.
- [src/modules/eoi_manager/eoi_management/eoi_management.controller.spec.ts](src/modules/eoi_manager/eoi_management/eoi_management.controller.spec.ts) — adds `residentStatus: 'INDIAN'` to two mock DTOs.

Annotate them the same way (an inline NOTE explaining why a PB-188 branch is editing them) or move them to a separate PR.

### R6 — Migration unique key shape contradicts the entity docstring [should-fix]

[src/migrations/1779800000000-CreateSfdcVoucherChangeRequestsTable.ts](src/migrations/1779800000000-CreateSfdcVoucherChangeRequestsTable.ts) lines 41–42 declares an absolute unique constraint over `(prid, normalized_payload_hash, status)`:

```sql
UNIQUE KEY `uq_sfdc_vcr_prid_payload_status`
  (`prid`, `normalized_payload_hash`, `status`)
```

[src/modules/sfdc/entities/sfdc-voucher-change-request.entity.ts](src/modules/sfdc/entities/sfdc-voucher-change-request.entity.ts) lines 80–83 says the constraint is "only enforced for `PENDING` rows (other statuses are allowed to coexist via WHERE clause in the migration)". The migration does NOT add any `WHERE` clause — and MySQL does not support partial unique indexes anyway. Practically:

- Two REJECTED rows for the same `(prid, hash)` (e.g. SFDC retries after admin rejection) will be blocked by this unique key, not "allowed to coexist".
- A PENDING → REJECTED → PENDING re-submission of the same payload is also blocked.

Either update the entity docstring to reflect the actual constraint shape, or replace the unique key with an app-layer dedupe predicate restricted to PENDING (e.g. by partitioning on a generated column or by replacing the unique key with a regular index plus a `findOne` pre-check inside a SERIALIZABLE transaction).

### R7 — Idempotency contract narrower than the spec's "upsert-style" [should-fix]

[docs/ai/stories/PB-188/spec.md](docs/ai/stories/PB-188/spec.md) §Endpoint Specification: "Treat the call as an upsert-style update against the record identified by `PRID`. Repeated identical payloads must not corrupt state."

The new dedupe at [src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) lines 138–144 narrows this to `(prid, hash, status === PENDING)`. After a PENDING is APPROVED or REJECTED, an identical SFDC retry will create a brand-new PENDING row and re-notify admins — i.e. each downstream review action effectively "resets" idempotency. If that is intentional (treat post-review traffic as new business events), record it in the spec; otherwise widen the dedupe predicate or short-circuit on the most-recent terminal-status row for the same `(prid, hash)`.

### R8 — `applyLeadChange` return path relies on an undeclared `never` contract [minor]

[src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) lines 204–210:

```ts
} catch (error) {
  if (error instanceof HttpException) throw error;
  logsAndErrorHandling('SfdcWebhookService - applyLeadChange', error, {
    prid: dto.prid,
    correlationId,
  });
}
```

The declared signature is `Promise<ApplyLeadChangeResult>`. The catch path neither rethrows nor returns; the function is sound only because `logsAndErrorHandling` always throws. The helper at [src/utils/errorLogHandler.ts](src/utils/errorLogHandler.ts) is not typed `(...) => never`, so a future change that converts it into a logger-only helper silently makes `applyLeadChange` resolve to `undefined`, which the controller then returns directly into the response envelope. Either type the helper as `(...) => never`, add an explicit `throw` (or `throw new InternalServerErrorException(...)`) after the helper call with a comment that it is defensively unreachable, or rethrow the original error inside the catch.

### R9 — `hashPayload` docstring placement misleads about prid stripping [minor]

[src/modules/sfdc/sfdc-webhook.service.ts](src/modules/sfdc/sfdc-webhook.service.ts) lines 213–229 — the docstring on `buildNormalizedPayload` says "`prid` is omitted from the hash input since it is already part of the dedupe key, but is kept in the stored payload for traceability." That is correct in spirit, but the actual omission happens later in `hashPayload` (lines 233–244) via a `.filter((k) => k !== 'prid')`. Reading `buildNormalizedPayload` in isolation, it looks like the function strips `prid` — it does not. Move the comment to `hashPayload` (or split it across both) so the contract is clear at the point where stripping happens.

### R10 — `getDecrypted` assumes AES-encrypted env values; no boot canary [should-fix]

[src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.ts](src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.ts) lines 37–49 reads both creds via `CustomConfigService.getDecrypted`. Per [src/config/custom-config.service.ts](src/config/custom-config.service.ts) lines 21–26, `getDecrypted` always treats the env value as `crypto-js` AES-encrypted with `ENV_SECRET_KEY` and returns `''` for any plain-text value (the AES decode produces empty bytes). The guard's "creds not configured" branch then throws `InternalServerErrorException` on the first inbound request.

The only mention of this contract is the JSDoc at the top of [src/modules/sfdc/sfdc-webhook.controller.ts](src/modules/sfdc/sfdc-webhook.controller.ts) lines 22–24 and the migration comment in [src/migrations/1779800000000-CreateSfdcVoucherChangeRequestsTable.ts](src/migrations/1779800000000-CreateSfdcVoucherChangeRequestsTable.ts) lines 12–14. Both say the env keys exist but neither calls out the encryption step. Realistic risk: ops sets `SFDC_WEBHOOK_BASIC_USER=plain-user` and the webhook 500s for every SFDC retry until someone re-encrypts.

Add at least one of:

- A boot-time canary in `SfdcModule` / a `Bootstrap` provider that calls `getDecrypted` on both keys at startup and `logger.error`s + fails fast if either is empty, so the misconfig surfaces in deploy logs instead of in 500s.
- A README/runbook entry (or PR-description note) describing the encryption tool used (e.g. `CustomConfigService.getEncrypted`).
- Optionally: fall back to `configService.get` when `getDecrypted` returns empty, with a `logger.warn` flagging the unencrypted value — keeps existing deployments working while the encrypted convention is migrated.
