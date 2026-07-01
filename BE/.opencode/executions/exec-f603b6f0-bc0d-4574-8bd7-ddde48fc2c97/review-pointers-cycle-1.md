# PE-587 Reception Desk — Review Pointers (Cycle 1)

## Verdict

**Request changes** — Core structure matches the plan (GRE guards, reception routes, entity/migration, OTP + check-in flow, visibility joins). Fix must-fix items before merge; address should-fix items for spec fidelity.

## Scope Reviewed

| Area | Status |
|------|--------|
| 10 GRE endpoints in [`slot.controller.ts`](src/modules/eoi_manager/batch_manager/slot.controller.ts) | OK — `RmAdminAuthGuard`, `RolesGuard`, `RolesEnum.GRE` on all reception routes |
| Visibility (`OPEN`/`ACTIVE`, non-deleted slots) | OK — `GRE_ELIGIBLE_SLOT_STATUSES`, `buildGreVisibilityJoin`, `assertGreEligibleBatchVoucher` |
| Migration + entity columns | OK — [`1779600000000-AddReceptionDeskAttendanceToBatchVouchers.ts`](src/migrations/1779600000000-AddReceptionDeskAttendanceToBatchVouchers.ts), `headCount` / `checkedInAt` / `checkedInBy` |
| OTP (hash, Redis, rate limits, verify gate) | Mostly OK — see R5 |
| Check-in (transaction, pessimistic lock, audit interceptor) | OK |
| Extra working-tree files (`.opencode/executions/`, streams) | Out of scope for product code — do not commit |

---

## Findings

### R1 — Must-fix: `proratedInvites` duplicates `invited` on dashboard

**File:** [`slot.service.ts`](src/modules/eoi_manager/batch_manager/slot.service.ts) (`getReceptionDashboard`, ~L1226–1250)

`expectedWalkin` and `proratedInvites` run the **same** query (sum `filledCount` for OPEN+ACTIVE eligible slots). Response always returns identical values for `invited` and `proratedInvites`.

**Spec/plan:** [implementation-plan.md](docs/ai/stories/PE-587/implementation-plan.md) §Phase 2 step 8 and open-question table — `proratedInvites` should follow `getSlotStatistics` `proratedWalkin` (sum `filledCount` for **ACTIVE** slots, with GRE-appropriate scope). Existing reference:

```750:758:src/modules/eoi_manager/batch_manager/slot.service.ts
      const proratedWalkin =
        (await this.slotRepo.sum('filledCount', {
          batchId,
          status: In([
            SlotStatusEnum.ACTIVE,
            SlotStatusEnum.COMPLETED,
            SlotStatusEnum.ELAPSED,
          ]),
        })) || 0;
```

For GRE dashboard, restrict to ACTIVE-only (or ACTIVE within OPEN/ACTIVE visibility) — **not** the same query as `invited`.

---

### R2 — Must-fix: Unvalidated `sortBy` in `listGreBatches` (SQL injection / query break)

**File:** [`slot.service.ts`](src/modules/eoi_manager/batch_manager/slot.service.ts) (~L919–924)

```typescript
baseQuery.orderBy(`batch.${field}`, ...);
```

No allowlist (unlike `listGreSlots` / `listSlots`). Arbitrary `sortBy` can inject invalid column names or break the query.

**Fix:** Mirror `allowedSortFields` pattern used elsewhere in the same service (`createdAt`, `name`, `startDate`, etc.).

---

### R3 — Must-fix: N+1 queries in `listGreSlots` attended counts

**File:** [`slot.service.ts`](src/modules/eoi_manager/batch_manager/slot.service.ts) (~L1048–1058)

After `getManyAndCount`, code runs `batchVoucherRepo.count` **per slot** in `Promise.all(slots.map(...))`.

**Spec/plan:** Spec §View records — “avoid N+1”; plan acceptance — optimized QueryBuilder patterns.

**Fix:** Single grouped query, e.g. `SELECT slotId, COUNT(*) ... WHERE status = ATTENDED GROUP BY slotId`, then map in memory.

---

### R4 — Should-fix: Listing/search mobile does not match “registered mobile” used for OTP

**Files:** [`slot.service.ts`](src/modules/eoi_manager/batch_manager/slot.service.ts) — `mapViewRecordRow`, `createViewRecordsQuery`

- `mapViewRecordRow` sets `mobileNumber: row.phone ?? null` only.
- `resolveRegisteredMobile` falls back to `voucher.applicant1.personalDetails.mobile`.
- Universal/search OR clause includes `bv.phone` but not voucher applicant mobile fields.

**Spec:** Mobile Number is required in view-records rows and is the OTP target ([spec.md](docs/ai/stories/PE-587/spec.md) §View records, planner Q6).

**Fix:** Shared helper for display/search that mirrors `resolveRegisteredMobile` (COALESCE in SQL or post-map fallback). Extend search OR clause accordingly.

---

### R5 — Should-fix: `markAttendance` should reject check-in for already-attended records

**File:** [`slot.service.ts`](src/modules/eoi_manager/batch_manager/slot.service.ts) (`markAttendance`)

`sendReceptionOtp` / `resendReceptionOtp` reject `BatchVoucherStatus.ATTENDED`; the unified attendance check-in endpoint must also enforce the same guard before OTP validation to prevent stale or repeated check-ins.

**Fix:** Ensure `markAttendance` rejects already-attended vouchers before validating / consuming OTP.

---

### R6 — Advisory: No unit tests for reception surface

Planner listed [`slot.service.spec.ts`](src/modules/eoi_manager/batch_manager/slot.service.spec.ts); unit_test_writer produced [test-plan.md](docs/ai/stories/PE-587/test-plan.md) but **0** test files in the diff. Not blocking if story did not require tests, but visibility/OTP-gate regressions are high-value targets.

---

### R7 — Advisory: Do not commit execution artifacts

Untracked `.opencode/executions/exec-f603b6f0-.../` (context-packs, handoffs, cursor-streams) appear in the working tree. Keep docs under `docs/ai/stories/PE-587/` if desired; exclude execution noise from the PR.

---

## Acceptance Criteria Traceability (spot-check)

| Criterion | Result |
|-----------|--------|
| GRE guards on all reception endpoints | Pass |
| Listings/search only OPEN/ACTIVE non-deleted slots | Pass (read paths) |
| View records fields + QueryBuilder joins | Pass (mobile fallback: R4) |
| Dashboard metrics | **Fail** (R1) |
| OTP verify before check-in | Pass |
| Resend cooldown / max resend | Pass |
| Check-in persists headcount, timestamp, GRE user | Pass |
| UserActivityInterceptor on check-in | Pass |
| Migration for new columns | Pass |

---

## Suggested Validation (post-fix)

```bash
npm run lint
npm run build
npm run migration:run   # verify migration applies
# Manual: GRE token → batches → slots → records → OTP send/verify → check-in → dashboard metrics
```

---

## Auto-fix Hints (for downstream agent)

| ID | Priority | Action |
|----|----------|--------|
| R1 | Must | Differentiate `proratedInvites` query (ACTIVE `filledCount` sum per plan) |
| R2 | Must | Allowlist `sortBy` in `listGreBatches` |
| R3 | Must | Replace per-slot `count` loop with one aggregation |
| R4 | Should | Align mobile display/search with `resolveRegisteredMobile` |
| R5 | Should | Add `ATTENDED` guard in `verifyReceptionOtp` |
| R6–R7 | Advisory | Tests + PR hygiene |
