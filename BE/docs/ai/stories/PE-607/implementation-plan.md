# Implementation Plan: PE-607 — Update voucher status for RM

## Summary
Adjust the RM branch of `updateVoucherFormStatus()` in `eoi_management.service.ts` so it sets `IN_PROGRESS` (not `UNVERIFIED`) for vouchers currently in `CREATED` or `IN_PROGRESS`, leaves `UNVERIFIED` untouched, and preserves the MIS/CRM branches and `submittedAt` placement. Add a colocated unit spec for the method covering the new RM transition matrix and locking in the unchanged MIS/CRM behavior.

## Target Files
- `src/modules/eoi_manager/eoi_management/eoi_management.service.ts` — edit `updateVoucherFormStatus()` (currently lines ~1448–1468); change RM branch assignment from `VoucherFormStatusEnum.UNVERIFIED` to `VoucherFormStatusEnum.IN_PROGRESS`; do not modify MIS/CRM branches or the `submittedAt` write.
- `src/modules/eoi_manager/eoi_management/eoi_management.service.spec.ts` — **create new** unit test file targeting only `updateVoucherFormStatus()` (no other public methods need coverage for this story). Cover AC1–AC6.
- `docs/ai/stories/PE-607/implementation-plan.md` — this plan (written by the orchestrator, not by the implementer).

## Context Budget
- Inspect the target files first; do not perform broad repo scans.
- The method is fully self-contained at lines ~1448–1468 of `eoi_management.service.ts`. Read just that slice plus the `VoucherFormStatusEnum` import line at the top of the file (line 35).
- Open non-target files only if strictly needed:
  - `VoucherFormStatusEnum` definition — only if enum member names (`UNVERIFIED`, `CREATED`, `IN_PROGRESS`, `MIS_UPDATED`, `MIS_REQUESTED_CHANGES`, `CRM_UPDATED`, `CRM_REQUESTED_CHANGES`) need confirmation. Locate via the existing import in `eoi_management.service.ts`; do not grep widely.
  - `VoucherForm` entity — only if the test setup needs typed minimal fields (`voucherFormStatus`, `submittedAt`). Use `as unknown as VoucherForm` casts in the spec to avoid pulling unrelated relations.
  - `eoi_management.controller.spec.ts` — open only as a style reference for Nest unit test scaffolding if needed.
- Use provider-native edit tools directly. Do not print the full service file, full diffs, or large code blocks in chat.
- Run only the validation commands listed below; do not run the full e2e suite unless a regression is suspected.

## Implementation Steps

1. **Locate and read the target method.**
   - Open `src/modules/eoi_manager/eoi_management/eoi_management.service.ts` and read only lines ~1448–1468 to confirm the current shape.

2. **Edit the RM branch.**
   - In the third `else if` branch (matching `VoucherFormStatusEnum.CREATED` or `VoucherFormStatusEnum.IN_PROGRESS`), change the assignment:
     - From `voucherForm.voucherFormStatus = VoucherFormStatusEnum.UNVERIFIED;`
     - To `voucherForm.voucherFormStatus = VoucherFormStatusEnum.IN_PROGRESS;`
   - Keep the `voucherForm.submittedAt = new Date();` line exactly where it is, inside the same branch.
   - Do not add an explicit `UNVERIFIED` branch — the existing fall-through already leaves `UNVERIFIED` (and any other status) unchanged, which matches AC1.
   - Do not touch the MIS branch (`MIS_REQUESTED_CHANGES` / `MIS_UPDATED` → `MIS_UPDATED`) or the CRM branch (`CRM_REQUESTED_CHANGES` / `CRM_UPDATED` → `CRM_UPDATED`).

3. **Create the unit spec.**
   - File: `src/modules/eoi_manager/eoi_management/eoi_management.service.spec.ts`.
   - Instantiate `EoiManagementService` via a minimal `Test.createTestingModule` setup, providing stub/jest-mock implementations for every constructor dependency. Because the method under test is pure (operates on a passed `VoucherForm` reference and uses no `this` collaborators), tests can simply call `service.updateVoucherFormStatus(voucherForm)` on the constructed instance — no DB, repository, or HTTP mocks need real behavior; passing `{}` or `jest.fn()` is acceptable for each provider.
   - If wiring the full dependency graph proves heavy, fall back to instantiating the class directly: `const service = new EoiManagementService(...Array(N).fill({}) as any);` after confirming the constructor count, since the method does not invoke `this`.
   - Use small in-memory voucher fixtures: `{ voucherFormStatus, submittedAt: undefined } as unknown as VoucherForm`.
   - Test cases (one `describe('updateVoucherFormStatus')` with these `it` blocks):
     - **AC1 (RM/UNVERIFIED unchanged):** Given `voucherFormStatus = UNVERIFIED`, expect `voucherFormStatus` stays `UNVERIFIED` and `submittedAt` remains `undefined` (not set on a no-op).
     - **AC2 (RM/CREATED → IN_PROGRESS):** Given `voucherFormStatus = CREATED`, expect resulting status `IN_PROGRESS` and `submittedAt` is a `Date`.
     - **AC3 (RM/IN_PROGRESS → IN_PROGRESS, idempotent):** Given `voucherFormStatus = IN_PROGRESS`, expect status remains `IN_PROGRESS` and `submittedAt` is a `Date`.
     - **AC4 (MIS preserved):** Two cases — `MIS_REQUESTED_CHANGES` → `MIS_UPDATED`; `MIS_UPDATED` → `MIS_UPDATED`. Assert `submittedAt` is **not** modified (remains `undefined`) for both, matching current behavior.
     - **AC5 (CRM preserved):** Two cases — `CRM_REQUESTED_CHANGES` → `CRM_UPDATED`; `CRM_UPDATED` → `CRM_UPDATED`. Assert `submittedAt` remains `undefined` for both.
     - **AC6 (`submittedAt` invariant):** Combined assertion via the cases above: `submittedAt` is set only in the CREATED/IN_PROGRESS branch and nowhere else.
   - Use `jest.useFakeTimers().setSystemTime(...)` if precise `Date` equality is needed; otherwise `expect(voucherForm.submittedAt).toBeInstanceOf(Date)` is sufficient.

4. **No caller changes expected.**
   - The single in-file caller (line 1434) does not assert the returned status; the method mutates `voucherForm` in place. Do not modify it.
   - Per `Grep`, no other file references `updateVoucherFormStatus`, so no external callers or existing specs need updates.

5. **Lint and format the touched files.**

## Validation Commands

Run only what is needed for the changed surface:

```bash
npm run lint
npm run format
npx jest src/modules/eoi_manager/eoi_management/eoi_management.service.spec.ts
```

If the new spec passes, also run the existing controller spec to confirm no collateral regressions:

```bash
npx jest src/modules/eoi_manager/eoi_management
```

Only if any of the above fail or coverage gaps are flagged, fall back to the full suite:

```bash
npm run test
```

Do **not** run `npm run test:e2e` for this change — the modification is internal to a service method with no API surface, request/response, or DB schema impact.

## Risks

- **Hidden callers asserting old behavior.** Mitigation: a repo-wide ripgrep for `updateVoucherFormStatus` was performed and found only the in-file caller and the spec/plan docs. If any test fixture in another module hard-codes the `UNVERIFIED` outcome for a CREATED/IN_PROGRESS RM voucher, it will surface in `npm run test`.
- **`submittedAt` semantics drift.** The RM branch keeps `submittedAt = new Date()` even though it no longer transitions to `UNVERIFIED`. Per spec assumption (“`submittedAt` is set in exactly the same situations it is set today”), this is intentional and correct. If product later wants `submittedAt` gated on the `CREATED → IN_PROGRESS` transition only (skipping the idempotent `IN_PROGRESS → IN_PROGRESS` case), that is an Open Question and out of scope.
- **Constructor wiring in spec.** `EoiManagementService` likely has a large constructor signature. If instantiating via `Test.createTestingModule` becomes brittle, use direct instantiation with `as any` stubs — safe because `updateVoucherFormStatus` does not use `this.<collaborator>`.
- **Enum member typos.** Use the existing imported `VoucherFormStatusEnum` symbol both in the service edit and in the spec. Do not redeclare the enum.

## Assumptions

- The current behavior for any status not listed (e.g., terminal/verified states, `UNVERIFIED`) is to leave the voucher unchanged — preserved here via the natural fall-through, per spec Open Question #1.
- The RM “flow” maps to the third `else if` branch (`CREATED` / `IN_PROGRESS`) in the current method. MIS and CRM branches are the first two `else if`s. This matches the spec’s interpretation.
- No new enum members, DTOs, controllers, or DB migrations are required.
- The project uses Jest with the existing `jest.config.js` and pattern `src/**/*.spec.ts`, so a new colocated `*.spec.ts` will be picked up automatically by `npm run test`.
- The `success-response-errors` envelope and public method signature are unaffected; no controller or response-shape changes are needed.
