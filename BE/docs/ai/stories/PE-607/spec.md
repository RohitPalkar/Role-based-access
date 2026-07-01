# Story Spec: PE-607 — Update voucher status for RM

## Summary
Modify the `updateVoucherFormStatus()` method in the EOI management service so that, when invoked for the RM (Relationship Manager) flow, the resulting voucher status follows a new transition matrix. Records already at `UNVERIFIED` must not be regressed, and records at `CREATED` or `IN_PROGRESS` must move to `IN_PROGRESS` (not `UNVERIFIED`). Existing transitions for MIS and CRM flows and the `submittedAt` side-effect must remain intact.

## Scope
- In scope: status transition logic inside `updateVoucherFormStatus()` for the RM path in `src/modules/eoi_manager/eoi_management/eoi_management.service.ts`.
- In scope: any direct callers/tests that assert the previous RM transition behavior.
- Out of scope: MIS and CRM status transition logic (must be preserved as-is).
- Out of scope: schema/DB changes, new endpoints, new statuses, or unrelated EOI flows.

## Functional Requirements
1. RM voucher status transitions in `updateVoucherFormStatus()` must behave as follows:
   - If the current status is `UNVERIFIED` → leave the status unchanged (no overwrite).
   - If the current status is `CREATED` → set the status to `IN_PROGRESS`.
   - If the current status is `IN_PROGRESS` → keep/set the status to `IN_PROGRESS` (idempotent).
   - Any other current status not explicitly covered for RM continues to follow the pre-existing behavior unless it conflicts with the above (see Open Questions).
2. The MIS status transition logic in `updateVoucherFormStatus()` must remain functionally identical to today.
3. The CRM status transition logic in `updateVoucherFormStatus()` must remain functionally identical to today.
4. `submittedAt` must continue to be set in exactly the same situations it is set today (no new sets, no removed sets) for all three flows (RM, MIS, CRM).
5. The change must not alter the public method signature, the return contract, or the response envelope used by upstream API consumers (`success-response-errors` REST envelope).

## Non-Functional Requirements
- No regressions in existing unit/integration tests for EOI/voucher status updates.
- Logic should be implemented in a readable, switch/branching style consistent with the existing service file conventions.
- No additional DB round-trips beyond what the current implementation performs.

## Acceptance Criteria
- AC1: Given a voucher with `status = UNVERIFIED`, when `updateVoucherFormStatus()` is invoked through the RM flow, then the persisted status remains `UNVERIFIED` and is not overwritten.
- AC2: Given a voucher with `status = CREATED`, when `updateVoucherFormStatus()` is invoked through the RM flow, then the persisted status becomes `IN_PROGRESS` (not `UNVERIFIED`).
- AC3: Given a voucher with `status = IN_PROGRESS`, when `updateVoucherFormStatus()` is invoked through the RM flow, then the persisted status remains `IN_PROGRESS` (not changed to `UNVERIFIED`).
- AC4: Existing MIS flow behavior (status transitions and `submittedAt` updates) is unchanged and verified by existing/added tests.
- AC5: Existing CRM flow behavior (status transitions and `submittedAt` updates) is unchanged and verified by existing/added tests.
- AC6: `submittedAt` is set in the same conditions as before for every flow; no extra or missing writes to `submittedAt`.
- AC7: All existing tests pass (`npm run test`). New/updated tests cover AC1–AC3 for the RM flow.

## Implementation Notes
- Target file: `src/modules/eoi_manager/eoi_management/eoi_management.service.ts`, method `updateVoucherFormStatus()`.
- The change is localized to the RM branch of the existing status-decision logic. Treat it as a transition map rather than a single assignment:
  - RM transition map: `UNVERIFIED → UNVERIFIED`, `CREATED → IN_PROGRESS`, `IN_PROGRESS → IN_PROGRESS`.
- Do not touch the MIS and CRM branches; refactor only if strictly needed to isolate the RM branch without behavioral change.
- Preserve the current placement of the `submittedAt` assignment(s) — do not move them into or out of branches.
- Keep response shaping aligned with the project-wide `success-response-errors` envelope; no changes expected here.

## UI Notes
- N/A. Backend-only repository (`repositoryRole: backend-api-only`). No UI artifacts to update.

## Test Plan
- Unit tests for `updateVoucherFormStatus()` covering the RM flow:
  - Current status `UNVERIFIED` → expect unchanged.
  - Current status `CREATED` → expect `IN_PROGRESS`.
  - Current status `IN_PROGRESS` → expect `IN_PROGRESS`.
  - Verify `submittedAt` is/ isn’t set in the same cases as the prior implementation.
- Regression tests for MIS and CRM flows: ensure transitions and `submittedAt` behavior are byte-for-byte equivalent.
- Run: `npm run test` and, if applicable, `npm run test:e2e`.

## Assumptions
- The statuses `UNVERIFIED`, `CREATED`, and `IN_PROGRESS` are existing members of the voucher status enum used by `updateVoucherFormStatus()`; no new enum values are introduced by this story.
- "RM" in the title corresponds to the existing RM branch within `updateVoucherFormStatus()` (as opposed to MIS/CRM branches mentioned in the description).
- "Preserve the existing behavior for MIS and CRM" means no functional change — refactors that keep behavior identical are acceptable but not required.
- `submittedAt` semantics (which flow/status combination triggers it) are already correct today and only need to be preserved.

## Open Questions
- For RM, what should happen when the current status is something other than `UNVERIFIED`, `CREATED`, or `IN_PROGRESS` (e.g., a terminal/verified state)? The description only specifies these three; default behavior should follow the current implementation unless product clarifies otherwise.
- Should the RM branch ever set `submittedAt` when the status remains `UNVERIFIED` (no-op transition)? Assumed “no change vs. today” — confirm with product if this needs to differ.
- Are there callers outside `eoi_management.service.ts` that assert the old RM behavior (e.g., setting `UNVERIFIED` from `CREATED`)? If so, they must be updated; otherwise no caller changes are expected.

## References
- Primary file to modify: `src/modules/eoi_manager/eoi_management/eoi_management.service.ts` (method `updateVoucherFormStatus`).
- Repo conventions: REST API with `api` global prefix, `success-response-errors` response envelope, NestJS-style service module layout.
- Related docs (open only if needed): `README.md`, `docs/PE-483-bulk-transaction-api-flow.md`.
