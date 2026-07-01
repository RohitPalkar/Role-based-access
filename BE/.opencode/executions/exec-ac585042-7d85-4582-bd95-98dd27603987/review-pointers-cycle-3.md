# PB-188 Review Pointers — Cycle 3

## Summary

Cycle 2 raised 10 findings. The shipped architectural pivot (no `vouchers` mutation, `sfdc_voucher_change_requests` queue, `202 Accepted`) is correct and the story spec / implementation plan / test plan now match the code, so cycle-2 R1, R4, R7, R8, R9 are resolved or accepted-as-follow-up. Three issues are still open with concrete fixes:

- Cycle-2 R2 (DTO remap verification) and the cycle-1 R1 / cycle-2 R3 test-evidence carry-forward — the DTO and Guard unit specs do NOT exist in the tree, and the unit-test-runner log still does not exercise the two SFDC specs that do exist. The cycle-2 final-summary asserts both are resolved, which is factually wrong.
- Cycle-2 R5 (partial) — two unrelated spec edits still lack an inline rationale.
- Cycle-2 R6 (residual) — the entity's class-level docstring still misstates the migration's unique-key shape.

New cycle-3 findings are R1, R2, R5, R6. R3 / R4 are carry-forwards re-flagged with concrete fixes.

## Findings

### R1 — DTO and Guard unit specs were never created, contradicting the final-summary [must-fix]

A glob over `src/modules/sfdc/**/*.spec.ts` returns exactly three files: `sfdc.controller.spec.ts` (pre-existing), [src/modules/sfdc/sfdc-webhook.controller.spec.ts](src/modules/sfdc/sfdc-webhook.controller.spec.ts), and [src/modules/sfdc/sfdc-webhook.service.spec.ts](src/modules/sfdc/sfdc-webhook.service.spec.ts). Both required new specs are missing:

- `src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts` — required by [docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) §"What Each Spec Covers" item 4 (lines 101–114), by AC6 / AC10 in [docs/ai/stories/PB-188/spec.md](docs/ai/stories/PB-188/spec.md) lines 94 and 98, and explicitly listed under §Target Files / Create in [docs/ai/stories/PB-188/implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md) line 42.
- `src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts` — required by [docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) §"What Each Spec Covers" item 1 (lines 38–57), by AC10 ("auth guard accept/reject"), and listed in [docs/ai/stories/PB-188/implementation-plan.md](docs/ai/stories/PB-188/implementation-plan.md) line 43.

This is a regression vs. the prior cycle's recorded outcome: [.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/final-summary.md](.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/final-summary.md) line 46 states "Cycle-2 R2 — PascalCase remap not verified end-to-end [must-fix]: resolved. [src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts](src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts) now feeds the raw PascalCase / spaced-key payload through `plainToInstance(LeadChangeWebhookDto, ...)`...". That file does not exist on disk. The final-summary's Recommendation block (lines 66–73) likewise omits the missing-specs gap.

Practical impact: AC6 ("SFDC field names in the payload are correctly remapped via `@Expose({ name })`") and AC10 ("Unit tests cover: auth guard accept/reject, DTO `@Expose` remap + validation success/failure") are unverified.

Fix — pick one:

- Create both specs following the case lists in [docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) lines 38–114. At minimum the DTO spec must include:

```ts
const instance = plainToInstance(LeadChangeWebhookDto, {
  PRID: 'PRID-001',
  'Lead Status': 'Hot',
  'SVH Status': 'SVH-Y',
});
expect(instance.prid).toBe('PRID-001');
expect(instance.leadStatus).toBe('Hot');
expect(instance.svhStatus).toBe('SVH-Y');
```

- Or amend [docs/ai/stories/PB-188/spec.md](docs/ai/stories/PB-188/spec.md) AC6 / AC10 and [docs/ai/stories/PB-188/test-plan.md](docs/ai/stories/PB-188/test-plan.md) to drop the DTO/guard-spec requirement, and add an integration test that POSTs the raw PascalCase body and asserts the service receives the remapped DTO.

### R2 — Unit-test-runner.log still excludes every new SFDC webhook spec [must-fix]

[.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/unit-test-runner.log](.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/unit-test-runner.log) line 1 enumerates 32 pre-existing `*.controller.spec.ts` paths. None of the new SFDC specs appear:

- [src/modules/sfdc/sfdc-webhook.controller.spec.ts](src/modules/sfdc/sfdc-webhook.controller.spec.ts)
- [src/modules/sfdc/sfdc-webhook.service.spec.ts](src/modules/sfdc/sfdc-webhook.service.spec.ts)

There is therefore no recorded evidence that the new SFDC specs compile or pass on this branch. Carry-forward of cycle-1 R1 and cycle-2 R3; acknowledged but not closed in [.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/final-summary.md](.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/final-summary.md) lines 31–42.

Re-run and attach the log before merge. Include the missing specs from R1 once they exist, plus the three branch-touched unrelated specs so the R4 regression risk is captured in the same artifact:

```bash
npx jest \
  src/modules/sfdc/sfdc-webhook.controller.spec.ts \
  src/modules/sfdc/sfdc-webhook.service.spec.ts \
  src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts \
  src/modules/sfdc/guards/sfdc-webhook-basic-auth.guard.spec.ts \
  src/modules/sfdc/sfdc.controller.spec.ts \
  src/modules/agreement_signature_form/agreement_signature_form.controller.spec.ts \
  src/modules/eoi_manager/eoi_campaign/eoi_campaign.controller.spec.ts \
  src/modules/eoi_manager/eoi_management/eoi_management.controller.spec.ts
```

### R3 — Entity class-level docstring still misstates the unique-key shape [should-fix]

[src/modules/sfdc/entities/sfdc-voucher-change-request.entity.ts](src/modules/sfdc/entities/sfdc-voucher-change-request.entity.ts) lines 37–39:

```
 * Idempotency: a `(prid, normalized_payload_hash)` unique constraint exists
 * on the table so that repeated identical SFDC retries do not create
 * duplicate PENDING rows (see migration `sfdc_voucher_change_requests`).
```

The actual migration at [src/migrations/1779800000000-CreateSfdcVoucherChangeRequestsTable.ts](src/migrations/1779800000000-CreateSfdcVoucherChangeRequestsTable.ts) lines 41–42 declares a three-column unique key:

```sql
UNIQUE KEY `uq_sfdc_vcr_prid_payload_status`
  (`prid`, `normalized_payload_hash`, `status`)
```

The column-level docstring on `normalizedPayloadHash` (lines 78–97 of the same entity file) is already accurate; only the class-level block is stale. Carry-forward of cycle-2 R6 (residual flagged in cycle-2 final-summary line 52). Fix: update the class-level docstring to call out `status` as the third key and reference the migration's `uq_sfdc_vcr_prid_payload_status` constraint name.

### R4 — Two unrelated spec edits still lack inline rationale [should-fix]

Carry-forward of cycle-2 R5. Cycle 2 added an inline `NOTE (PB-188)` block to [src/modules/agreement_signature_form/agreement_signature_form.controller.spec.ts](src/modules/agreement_signature_form/agreement_signature_form.controller.spec.ts) lines 1–10, but the other two specs are still unannotated and unexplained in the branch:

- [src/modules/eoi_manager/eoi_campaign/eoi_campaign.controller.spec.ts](src/modules/eoi_manager/eoi_campaign/eoi_campaign.controller.spec.ts) — three mock DTOs gained `venueName: 'Sample Venue'` and `agreementDocLink: 'https://example.com/agreement.pdf'`.
- [src/modules/eoi_manager/eoi_management/eoi_management.controller.spec.ts](src/modules/eoi_manager/eoi_management/eoi_management.controller.spec.ts) — two mock DTOs gained `residentStatus: 'INDIAN'`.

Fix: either add a `NOTE (PB-188)` block at the top of each spec explaining why a PB-188 branch is editing them (test drift caused by an upstream DTO field addition is the most likely reason), or move both edits into a separate PR so they are reviewable in isolation.

### R5 — Cycle-2 final-summary contains an inaccurate "resolved" claim that needs correction before merge [should-fix]

[.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/final-summary.md](.opencode/executions/exec-ac585042-7d85-4582-bd95-98dd27603987/final-summary.md) line 46 says cycle-2 R2 is "resolved" because the DTO spec asserts the `@Expose` remap end-to-end. The file it cites does not exist on disk (see R1). The Recommendation block at lines 66–73 also lists only two pre-merge actions — re-run the test command and annotate the unrelated specs — and omits the missing-specs gap entirely.

This matters because the final-summary is the merge handoff artifact: a reviewer relying on it will believe AC6 and AC10 are covered when they are not. Fix — pick one:

- Rewrite the final-summary's R2 status to "open — DTO spec file was never committed" and add a third pre-merge action item alongside the existing R1/R3 and R5 follow-ups.
- Or create the missing specs from R1 first, after which the final-summary text will become accurate as written.

### R6 — Controller docstring's "global pipes already transformed the body" rationale is not fully supported by `src/main.ts` and remains unverified [minor]

[src/modules/sfdc/sfdc-webhook.controller.ts](src/modules/sfdc/sfdc-webhook.controller.ts) lines 52–61 justifies omitting `excludeExtraneousValues: true` from the route-scoped pipe by stating "by the time this pipe sees the body, the global pipes have already produced a transformed class instance keyed on camelCase".

Looking at the actual pipeline in [src/main.ts](src/main.ts) lines 83–87:

```ts
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, stopAtFirstError: true }),
  new CustomValidationPipe(),
);
```

The first global pipe is `ValidationPipe({ whitelist: true })` — note `transform` is NOT enabled. The second pipe ([src/validations/custom-pipe.validation.ts](src/validations/custom-pipe.validation.ts) lines 6–10) does run `transform: true`, but it receives the output of the first pipe. Combined with `whitelist: true` on the first pipe, this is the exact failure mode cycle-1 R2 / cycle-2 R2 raised about `@Expose({ name: 'PascalCase' })` source-key remapping — the spaced PascalCase keys are not declared as direct properties on `LeadChangeWebhookDto` and may be stripped before class-transformer ever applies the `@Expose` mapping.

This is the *only* place in the repo that depends on `@Expose({ name })` for input keys, and no test ([src/modules/sfdc/sfdc-webhook.controller.spec.ts](src/modules/sfdc/sfdc-webhook.controller.spec.ts) line 56 and [src/modules/sfdc/sfdc-webhook.service.spec.ts](src/modules/sfdc/sfdc-webhook.service.spec.ts) line 69 both pre-construct the DTO with camelCase keys) currently feeds a raw PascalCase payload through the real pipe chain. Fix — pick one:

- Add the DTO spec from R1 plus a focused controller-level test (Nest `INestApplication.init()` with a `request(...)` POST) that submits `{ "PRID": "PRID-001", "Lead Status": "Hot" }` and asserts `service.applyLeadChange` is called with `dto.prid === 'PRID-001'` and `dto.leadStatus === 'Hot'`.
- Or move PascalCase → camelCase normalization out of `@Expose` into a small dedicated transform pipe that runs before any whitelist pipe on this route, and update the controller docstring accordingly.

Until one of these lands, AC6 sits on an unverified assumption about Nest pipe ordering.
