Reading the context pack and context map first, then pulling in handoff/spec only if needed for accurate target files.
Reading the spec for API details and locating batch_manager slot files for accurate target paths.
Inspecting batch_manager slot files and related entities for existing patterns.
# PE-587 Implementation Plan: Reception Desk (GRE)

## Summary

Add ten GRE-only Reception Desk endpoints under the existing Batch Manager module, implemented in `slot.controller.ts` and `slot.service.ts`. Reuse `SlotStatusEnum` (`Open`, `Active`) for visibility, `BatchVoucherStatus` (`Invited` → `Attended`) for attendance state, and existing statistics patterns from `getSlotStatistics`. Extend `eoi_batch_vouchers` for headcount and check-in audit fields. Implement mobile OTP via Redis + SMS using the same approach as `site_visit_logIn` (not voucher email OTP).

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Module placement | Extend `batch_manager` only | Spec requires `slot.controller.ts` / `slot.service.ts`; no new Nest module |
| Route prefix | `batch-slots/reception-desk/...` | Keeps GRE APIs grouped under existing `@Controller('batch-slots')` |
| Auth | `RmAdminAuthGuard` + `RolesGuard` + `@Roles(RolesEnum.GRE)` | Matches `user.controller.ts` GRE usage |
| Visibility filter | Central helper: `In([SlotStatusEnum.OPEN, SlotStatusEnum.ACTIVE])` on slot joins; exclude soft-deleted slots (`deletedAt IS NULL`) | Spec + `slot.entity.ts` soft delete |
| Batch listing scope | Batches with ≥1 eligible slot (and `BatchStatus.ACTIVE`, not archived/deleted) | GRE only sees operable reception context |
| Attendance persistence | Update `eoi_batch_vouchers.status` to `ATTENDED` + new columns | Status enum already exists; avoids new table unless product insists |
| OTP channel | SMS to `eoi_batch_vouchers.phone` (fallback `voucher.applicant1.personalDetails.mobile`) | Spec: registered mobile; mirror `SiteVisitLogInService.issueOtpAndSms` |
| OTP storage | Redis keys scoped by `batchVoucherId`: `reception_otp:{id}`, attempts keys | Isolated from voucher/email OTP keys |
| Check-in concurrency | `pessimistic_write` on `EoiBatchVoucher` inside transaction (same as `allocation.service.ts` move flow) | Prevents duplicate/concurrent check-in |
| Listing queries | TypeORM QueryBuilder, selective `.select()`, single query + count | Spec performance requirement |
| Dashboard metrics | Adapt `getSlotStatistics`: `expectedWalkin` → invited, `proratedWalkin`, `attended`, add `SUM(head_count)` for total headcount | Existing naming in codebase |

---

## Target Files

### Primary (edit)

- `src/modules/eoi_manager/batch_manager/slot.controller.ts` — GRE route handlers + guards
- `src/modules/eoi_manager/batch_manager/slot.service.ts` — business logic, QueryBuilders, OTP, attendance transactions
- `src/modules/eoi_manager/batch_manager/entities/batch_voucher.entity.ts` — attendance columns
- `src/modules/eoi_manager/batch_manager/batch_manager.module.ts` — inject `Cache`, `ConfigService`, `HttpService` (if SMS inlined) or shared OTP helper provider
- `src/enums/event-messages.enum.ts` — add user-activity action enums if interceptors used on mutating routes

### New (create)

- `src/modules/eoi_manager/batch_manager/dto/reception-desk.dto.ts` — query/body DTOs for all 10 APIs
- `src/migrations/<timestamp>-AddReceptionDeskAttendanceToBatchVouchers.ts` — `head_count`, `checked_in_at`, `checked_in_by`
- `src/modules/eoi_manager/batch_manager/slot.service.spec.ts` or `slot.controller.spec.ts` — focused unit tests for visibility filter, duplicate check-in, OTP verify gate (only if implementer adds tests; not mandatory unless requested)

### Reference-only (read, do not duplicate logic blindly)

- `src/modules/eoi_manager/batch_manager/allocation.service.ts` — `getBatchVouchers`, pessimistic lock pattern
- `src/modules/site_visit_logIn/site_visit_logIn.service.ts` — `issueOtpAndSms`, verify/resend rate limits
- `src/config/constants.ts` — `OTP_*` TTL constants
- `src/enums/batch-manager.enums.ts` — `SlotStatusEnum`, `BatchVoucherStatus`
- `src/helpers/dto/commonFindAll.dto.ts` — pagination base for listing DTOs

---

## Context Budget

- Open **target files first**; do not scan `src/modules/eoi_manager/` broadly.
- Open non-target files only for: direct imports (`allocation.service` lock pattern), OTP SMS (`site_visit_logIn.service`), `OTP_*` constants, and voucher field names (`voucher_form.entity.ts`).
- Do **not** read `src/migrations/` except the batch-manager create migration for column naming consistency.
- Do **not** open `.opencode/`, `docs/ai/stories/` (beyond spec already consumed), or full `voucher_form.service.ts`.
- Use native edit tools; do not paste full files or large diffs in chat.
- Validation: run only commands listed in **Validation** below for touched surface.

---

## API Contract (proposed routes)

All under `@Controller('batch-slots')`, guarded with `@Roles(RolesEnum.GRE)`.

| Method | Path | Purpose | Listing semantics |
|--------|------|---------|-------------------|
| GET | `reception-desk/batches` | Campaign/batch list for GRE | Yes — extend `ListBatchesDto` pattern + `campaignId`, `stage` |
| GET | `reception-desk/slots` | OPEN/ACTIVE slots | Yes — extend `ListSlotsDto`; **force** status filter |
| GET | `reception-desk/records` | View records for batch/slot | Yes — required query: `batchId` and/or `slotId` |
| GET | `reception-desk/dashboard/:batchId` | Aggregate metrics | No pagination |
| GET | `reception-desk/search` | Universal search | Yes — same visibility joins |
| POST | `reception-desk/otp/send` | Send OTP to registered mobile | Body: `batchVoucherId` |
| POST | `reception-desk/otp/verify` | Verify OTP | Body: `batchVoucherId`, `otp` |
| POST | `reception-desk/otp/resend` | Resend with cooldown | Body: `batchVoucherId` |
| POST | `reception-desk/attendance/check-in` | Finalize check-in | Body: `batchVoucherId`, `headcount`; requires prior OTP verify flag in Redis |
| GET | `reception-desk/attendance/:batchVoucherId` | Attendance detail | No listing |

**Response envelope:** `{ statusCode, message, data }` per existing batch-manager handlers.

**4xx rules:** `NotFoundException` when mapping missing; `BadRequestException` when slot not OPEN/ACTIVE, already ATTENDED, OTP invalid/expired, or headcount invalid; `ConflictException` optional for duplicate concurrent check-in.

---

## Implementation Steps

### Phase 1 — Schema and shared helpers

1. **Migration** — Add to `eoi_batch_vouchers`:
   - `head_count` INT NULL
   - `checked_in_at` DATETIME NULL
   - `checked_in_by` VARCHAR(36) NULL (GRE user `dbId` from `@User()`)
2. **Entity** — Mirror columns on `EoiBatchVoucher` with `@Column` names matching migration.
3. **Service helpers** (private methods in `slot.service.ts`):
   - `assertGreEligibleSlot(slotId)` — load slot with `status IN (OPEN, ACTIVE)` and `deletedAt IS NULL`; else 4xx
   - `assertGreEligibleBatchVoucher(batchVoucherId)` — join slot; same visibility
   - `resolveRegisteredMobile(batchVoucher)` — `phone` → else voucher `applicant1.personalDetails` mobile
   - `buildGreVisibilityJoin(qb)` — reusable `andWhere('slot.status IN (:...eligible)', { eligible: [OPEN, ACTIVE] })`

### Phase 2 — Read APIs (listings + dashboard + detail)

4. **`listGreBatches`** — QueryBuilder on `eoi_batches`:
   - Join slots filtered to OPEN/ACTIVE
   - `BatchStatus.ACTIVE` (exclude archived/deleted batches per `BatchStatus` enum)
   - Support `campaignId`, `stage`, `search` (batch name / campaign name), `sortBy`, `page`, `limit` from `ListBatchesDto`-style DTO
   - Return batch id, name, campaign name, stage, slot counts in eligible states
5. **`listGreSlots`** — Clone `listSlots` QueryBuilder but:
   - **Always** apply eligible status filter (ignore client status override for locked/completed)
   - Require `batchId` (recommended) for reception UX
6. **`listViewRecords`** — QueryBuilder:
   - `eoi_batch_vouchers` → `slot` → `batch` → `voucher` (+ `closingRm`, `createdBy` as sourcing RM per `voucher_form.service` `extractRmNames`)
   - Selective columns per spec: `uniqueReferenceId` (payment ref), `voucher.voucherId`, `stdEoiId`, `preEoiId`, `customerName`, `phone`, slot `date`/`startTime`/batch name (batch no), `status` as attendance status, `head_count`, RM names, `checked_in_at`
   - Filter `voucher.isDeleted = false`
   - Scope: `batchId` and/or `slotId` query params; enforce eligible slot via join
7. **`universalSearch`** — Same base query as view records; `search` OR-clause across:
   - `voucher.uniqueReferenceId`, `voucher.voucherId`, `voucher.stdEoiId`, `voucher.preEoiId`, `batchVoucher.customerName`, `batchVoucher.phone`, `batch.name` (batch number)
8. **`getReceptionDashboard`** — For `batchId`:
   - Reuse statistics logic: invited = sum `slot.filledCount` (or count INVITED mappings — align with `getSlotStatistics` `expectedWalkin`)
   - `proratedWalkin` = sum filledCount for ACTIVE slots only (adjust: spec says OPEN/ACTIVE scope — use both OPEN and ACTIVE for prorated denominator or document deviation)
   - `attended` = count `BatchVoucherStatus.ATTENDED`
   - `totalHeadcount` = `SUM(head_count)` where attended
   - `liveAttendanceCounters` = counts ATTENDED today / last N minutes (simple `checked_in_at >= startOfDay`)
9. **`getAttendanceDetail`** — Single `batchVoucherId`; return status, headcount, timestamp, checked-in-by user display name (optional join `Users`)

Wire controller methods with DTO validation (`class-validator`).

### Phase 3 — OTP APIs

10. **Inject dependencies** in `batch_manager.module.ts`: global `CacheModule` already in app; inject `CACHE_MANAGER`, `ConfigService`, `HttpService` into `SlotService` (or extract `ReceptionDeskOtpService` in same folder if file grows too large — prefer minimal scope, keep in `slot.service.ts` unless >150 lines OTP code).
11. **Send OTP**:
    - Validate eligible mapping + mobile present
    - Generate OTP (`generateOtp`), hash SHA-256, store in Redis with `OTP_EXPIRY_TTL_MS`
    - Send SMS via Versatile Hub / `SMS_URL` pattern from `site_visit_logIn.service.ts` (copy private method structure, new template/message for reception check-in)
    - Log audit: `logger.info` with `batchVoucherId`, GRE user id (no OTP in logs)
12. **Verify OTP** — Match hashed OTP, attempt limits (`OTP_MAX_ATTEMPTS`), set Redis flag `reception_otp_verified:{batchVoucherId}` with short TTL (e.g. 15 min) for check-in step
13. **Resend OTP** — Enforce `OTP_RESEND_TTL_MS` / max resend count consistent with `sso.service` / site visit patterns

### Phase 4 — Attendance check-in (transactional)

14. **`markAttendance`**:
    - Preconditions: eligible slot; mapping `status !== ATTENDED`; Redis verified flag present
    - `dataSource.transaction` / `manager.transaction`:
      - `findOne` batch voucher with `pessimistic_write`
      - Re-check status + slot eligibility inside transaction
      - Set `status = ATTENDED`, `head_count`, `checked_in_at = now`, `checked_in_by = user.dbId`
      - Clear OTP Redis keys
    - `@UseInterceptors(UserActivityInterceptor(..., 'eoi_batch_vouchers'))` on check-in route
15. **Duplicate prevention** — If already ATTENDED before transaction, return 400 with clear message; concurrent race handled by lock + second status check

### Phase 5 — Controller wiring and polish

16. Add all routes to `slot.controller.ts` with GRE-only guards (do not widen existing admin routes).
17. Map response DTO field names to UI columns (Payment Ref ID → `uniqueReferenceId`, Batch No. → `batch.name`, etc.).
18. Ensure non-listing endpoints return single objects without paginated `result` arrays.

---

## Field Mapping Reference

| Spec / UI label | Source |
|-----------------|--------|
| Payment Reference ID | `voucher.uniqueReferenceId` |
| Voucher ID | `voucher.voucherId` |
| Standard EOI ID | `voucher.stdEoiId` |
| Preferential EOI ID | `voucher.preEoiId` |
| Customer Name | `batchVoucher.customerName` |
| Mobile Number | `batchVoucher.phone` |
| Batch No. / Date / Start Time | `batch.name`, `slot.date`, `slot.startTime` |
| Attendance Status | `batchVoucher.status` (Invited vs Attended) |
| Headcount | `batchVoucher.head_count` |
| Closing RM | `voucher.closingRm.name` |
| Sourcing RM | `voucher.createdBy.name` (existing convention) |
| Attendance timestamp | `batchVoucher.checked_in_at` |

---

## Validation

Run from repo root after implementation:

```bash
npm run migration:run
npm run build
npm run lint
npm run test -- --testPathPattern=batch_manager/slot
```

Manual smoke (dev server):

1. GRE JWT → `GET api/{env}/batch-slots/reception-desk/batches` — only batches with OPEN/ACTIVE slots.
2. `GET .../records?batchId=` — paginated rows with required columns; no rows for LOCKED-only batches.
3. OTP send/verify/resend on test mobile; check-in without verify → 400; double check-in → 400.
4. `GET .../attendance/:id` reflects ATTENDED state.

---

## Risks

| Risk | Mitigation |
|------|------------|
| No mobile SMS template for reception | Confirm with product; reuse site-visit SMS infra and message copy |
| `phone` snapshot empty on old mappings | Fallback to voucher applicant mobile; 400 if none |
| Prorated invites definition ambiguous | Match `getSlotStatistics` `proratedWalkin` (ACTIVE/COMPLETED/ELAPSED filledCount) but restrict GRE dashboard to OPEN/ACTIVE slots only — document in API response comments |
| Large listing scans | Mandatory `batchId` or `slotId` on records/search; index-friendly filters on `slot_id`, `batch_id` |
| OTP logic duplication | Extract minimal private methods; do not refactor site_visit module in this story |
| `batch.service.listBatches` not GRE-safe | Implement separate `listGreBatches`; do not change admin list behavior |

---

## Assumptions (implementer may confirm with PM if blocked)

1. **Scope params:** View records and search require `batchId`; `slotId` optional narrowing. Dashboard keyed by `batchId` only.
2. **Attendance entity:** Persist on `eoi_batch_vouchers` (no new table).
3. **Campaign batch listing:** GRE sees batches under campaigns they can access (no extra project mapping unless product adds GRE–campaign filter later).
4. **Archived batches:** Excluded via `BatchStatus` / slot visibility, not returned in GRE listings.
5. **OTP:** 6-digit, 10-minute expiry, 60s resend cooldown — use existing `OTP_*` constants from `src/config/constants.ts`.
6. **Check-in headcount:** Required positive integer on finalize; min 1.

---

## Open Questions — Recommended Resolutions

| # | Question | Planner recommendation |
|---|----------|------------------------|
| 1 | Prorated Invites | Use `getSlotStatistics` `proratedWalkin` for ACTIVE-slot filledCount sum; label response `proratedInvites` for GRE |
| 2 | Scope parameters | `batchId` required for records/search/dashboard; `slotId` optional filter |
| 3 | OTP provider | Reuse site-visit SMS HTTP integration + Redis; do not use SSO email OTP |
| 4 | Attendance entity | `eoi_batch_vouchers` columns + `status=ATTENDED` |
| 5 | RM fields | `closingRm`, `createdBy` (sourcing) on `VoucherForm` |
| 6 | Mobile in API | Always return `phone` in listings though UI may hide column |

---

## Acceptance Criteria Traceability

- **Visibility:** `assertGreEligibleSlot` / join filters on every read and mutating path.
- **Listings:** pagination via `CommonFindAllQueryDto` extensions on reception DTOs.
- **View records:** single QueryBuilder, no `find` + loop relations.
- **OTP:** verify required before `markAttendance`; resend rate-limited.
- **Attendance:** transaction + pessimistic lock + duplicate status check.
- **Quality:** `UserActivityInterceptor` on check-in; structured logging without PII/OTP.
