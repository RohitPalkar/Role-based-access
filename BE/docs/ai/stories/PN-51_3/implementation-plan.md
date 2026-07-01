# PN-51_3 Implementation Plan

## Summary

Extend the existing loyalty details GET API with additional referee/referrer fields (runtime-only, no DB persistence) and add a new POST endpoint to upload loyalty points to Pinelab for both participants. Upload orchestration calls existing `PineLabsExecutorService` (`MARK_ELIGIBLE` / `REDEEM_POINTS`) **before** mutating IOM state, with all-or-nothing semantics.

**Branch:** `feature/PN-51`  
**Base module:** `src/modules/iom/` (PN-65 loyalty details + PN-51 Pine Labs already present)

### Change request traceability

| Request | Date | Planning impact |
|---------|------|-----------------|
| **Upload roles:** only `LOYALTY`, `ADMIN`, `SUPER_ADMIN` | 2026-06-29 (plan-approval) | Upload route `@Roles` must list exactly these three roles. GET `/:id/loyalty-details` keeps its existing broader CRM/Finance role list unchanged. |
| **Interim Pinelab success drives status update; do not block FE** | 2026-06-29 (final-review) | On `{ success: true }` from `PineLabsExecutorService.execute()`, persist `loyaltyPointClassification` and return `loyaltyPointsReleaseStatus` immediately. Do **not** defer IOM status updates until live Pinelab request/response contracts are finalized. Live Pinelab wiring is a follow-up inside private invocation methods only — upload API contract stays stable. |

---

## Critical Codebase Findings

| Topic | Current state | Plan decision |
|-------|---------------|---------------|
| IOM state column | Entity field `loyaltyPointClassification` → DB `loyalty_points_release_type` | Use entity field in code |
| Enum values | `LoyaltyPointsReleaseTypeEnum`: `ELIGIBLE`, `REDEEMABLE` only | **No `REDEEMED` in DB.** Persist `REDEEMABLE` after successful redeem upload; map API response `loyaltyPointsReleaseStatus` to `"REDEEMED"` |
| Duplicate-eligible guard | Block when state is `ELIGIBLE` or `REDEEMABLE` (redeemed) | Treat DB `REDEEMABLE` as redeemed/post-upload state |
| Pine Labs integration | `PineLabsExecutorService.execute()` | **Interim:** `result.success === true` is sufficient to update IOM status. Swap payload/response parsing later without changing upload endpoint contract |
| Route prefix | `@Controller('iom')` + global `api` prefix | `POST /api/iom/:id/loyalty-points/upload` |
| GET guards/roles | CRM, CRM_TL, CRM_HEAD, FINANCE_USER, FINANCE_HEAD, LOYALTY, ADMIN | **Unchanged** |
| **Upload guards/roles** | New endpoint | `RmAdminAuthGuard`, `RolesGuard`, roles: **`LOYALTY`, `ADMIN`, `SUPER_ADMIN` only** |
| `SUPER_ADMIN` in `RolesGuard` | No automatic bypass | Must appear explicitly in `@Roles(...)` |

---

## Part 1 — Extend Loyalty Details Response (R1)

### 1.1 Extend types

Update `LoyaltyParticipantDetails` in `src/modules/iom/types/loyalty-details.interface.ts`:

- Add: `firstName`, `lastName`, `sfdcId`, `gender`, `email` (`string | null`)
- Add nested `address: { addressLine1, addressLine2, pincode, location }` (all `string | null`)
- Add: `projectName2`, `unitNo2` (`string | null`)
- Export `EMPTY_LOYALTY_ADDRESS`; update `EMPTY_PARTICIPANT` in the service with `null` defaults for all new fields

### 1.2 Shared participant mapper

Create `src/modules/iom/helpers/loyalty-participant.mapper.ts` with pure functions:

- `mapParticipantAddress(details)` → `LoyaltyAddress`
- `mapExtendedParticipantFields(details, sfdcIdFallbacks?)` → personal + address fields
- Reuse `pickStringField` from `iom-pdf-template.mapper.ts`

### 1.3 Field sourcing map (runtime only)

Use `pickStringField` with camelCase + snake_case aliases. Return `null` when missing.

#### Referee (buyer — primary IOM/booking data)

| API field | Source (priority order) |
|-----------|-------------------------|
| `firstName` | `iom.customerDetails` → `firstName`, `first_name` |
| `lastName` | `iom.customerDetails` → `lastName`, `last_name` |
| `sfdcId` | `customerDetails` → `sfdcId`, `sfdc_id`, `customerId`, `customer_id`; fallback `iom.bpCode`; fallback `iom.booking?.customerCode` |
| `gender` | `customerDetails` → `gender` |
| `email` | `customerDetails` → `email`, `emailId`, `email_id` |
| `address.addressLine1` | `customerDetails` → `addressLine1`, `address_line1`, `address`, `fullAddress` |
| `address.addressLine2` | `customerDetails` → `addressLine2`, `address_line2` |
| `address.pincode` | `customerDetails` → `pincode`, `pinCode`, `postalCode`, `zip` |
| `address.location` | Direct `location` key, or comma-join `city`, `state`, `projectLocation` |
| `projectName2` | Referrer's project — `resolveReferrerProjectName(referrerDetails.projectId)` |
| `unitNo2` | `iom.referrerDetails` → `unitNo`, `unit_no` |

#### Referrer (from `iom.referrerDetails` JSON)

| API field | Source |
|-----------|--------|
| `firstName` | `referrerDetails` → `firstName`, `first_name` |
| `lastName` | `referrerDetails` → `lastName`, `last_name` |
| `sfdcId` | `referrerDetails` → `sfdcId`, `sfdc_id`, `bpCode`, `bp_code`, `referrerBpCode` |
| `gender` | `referrerDetails` → `gender` |
| `email` | `referrerDetails` → `email`, `emailId`, `email_id` |
| `address.*` | Same address mapping applied to `referrerDetails` |
| `projectName2` | Referee's project — `iom.project?.name` |
| `unitNo2` | `iom.unitNumber` ?? `iom.booking?.propertyNumber` ?? `customerDetails.unitNo` |

> `projectName`/`unitNumber` = participant's own booking; `projectName2`/`unitNo2` = the other party's booking reference.

### 1.4 Wire into `getLoyaltyDetails`

In `iom-loyalty-details.service.ts`:

1. Build extended fields via mapper for referee (always) and referrer (when `hasReferrer`).
2. Spread into existing `refereeDetails` / `referrerDetails` — preserve all PN-65 fields and verification flags.
3. **No DB writes** for Part 1 fields.

### 1.5 Optional name-source fix

Align referee `customerName` with `pickStringField(customerDetails, 'name', 'customerName', 'fullName')` if tests/fixtures expect buyer name from `customerDetails` (not `referrerDetails`).

---

## Part 2 — Upload Loyalty Points API (R2)

### 2.1 Interim Pinelab strategy (final-review CR — mandatory)

**Goal:** Unblock frontend integration now; refine Pinelab module later.

| Concern | This iteration | Deferred follow-up |
|---------|----------------|-------------------|
| Pinelab call success criteria | `PineLabsExecutorService.execute()` returns `{ success: true }` | Live request/response schema validation |
| IOM status update | Update `loyaltyPointClassification` **only after both** referee + referrer executor calls succeed | No change to upload API contract |
| Response to FE | Return stable `loyaltyPointsReleaseStatus` (`ELIGIBLE` or `REDEEMED`) reflecting persisted state | — |
| Code structure | Private `invokePinelabForParticipant()` method in upload service | Replace internals when live Pinelab contracts arrive |

**Do not:** gate status updates on final Pinelab payload shapes, add feature flags that block FE, or change the upload endpoint contract while waiting for Pinelab.

### 2.2 New DTO

Create `src/modules/iom/dto/upload-loyalty-points.dto.ts`:

- `LoyaltyPointsUploadActionEnum`: `ELIGIBLE` | `REDEEMABLE` (separate from DB enum)
- `UploadLoyaltyPointsDto` with `@IsEnum` on `loyaltyPointsReleaseType`

### 2.3 Response type

Create `src/modules/iom/types/loyalty-upload.interface.ts`:

```typescript
export interface LoyaltyPointsUploadResponse {
  iomId: string;
  loyaltyPointsReleaseType: 'ELIGIBLE' | 'REDEEMABLE';
  loyaltyPointsReleaseStatus: 'ELIGIBLE' | 'REDEEMED';
  message: string;
}
```

### 2.4 Upload orchestration service

Create `src/modules/iom/services/iom-loyalty-upload.service.ts` (sibling to GET service).

**Method:** `uploadLoyaltyPoints(user, iomId, dto): Promise<LoyaltyPointsUploadResponse>`

**Flow:**

1. **Load & authorize** — `loadIomOrThrow` + `validator.assertProjectAccess` (same as GET).
2. **Read current state** — `iom.loyaltyPointClassification` (nullable).
3. **Pre-validate:**

   | Request | Reject when current state is |
   |---------|------------------------------|
   | `ELIGIBLE` | `ELIGIBLE` or `REDEEMABLE` |
   | `REDEEMABLE` | `REDEEMABLE` only |

   Allow `REDEEMABLE` from `null` or `ELIGIBLE` (spec default).

4. **Require both participants** — `hasReferrer` check; reject if referrer missing.
5. **Require Pinelab IDs** — `iom.refereePinelabCustomerId` and `iom.referrerPinelabCustomerId` must be non-empty.
6. **Invoke Pinelab (interim success semantics):**
   - `ELIGIBLE` → `execute(MARK_ELIGIBLE, { customerId })`
   - `REDEEMABLE` → `execute(REDEEM_POINTS, { customerId, points, referenceId })`
   - `points` = `iom.refereePoints` / `iom.referrerPoints`; `referenceId` = `iom.iomNo ?? String(iom.id)`
   - Call referee first, then referrer (sequential). Either failure → throw, **no IOM update**.
   - Treat `result.success === true` as Pinelab success for status purposes.
7. **On full success — persist** inside `dataSource.transaction`:
   - `ELIGIBLE` → `loyaltyPointClassification = ELIGIBLE`
   - `REDEEMABLE` → `loyaltyPointClassification = REDEEMABLE`
8. **Return success payload:**
   - `loyaltyPointsReleaseStatus`: `"ELIGIBLE"` or `"REDEEMED"` (API label for redeem path)

### 2.5 Error handling

| Scenario | Approach |
|----------|----------|
| IOM not found | `throwIomError(IOM_NOT_FOUND)` |
| Unauthorized project | `throwIomError(UNAUTHORIZED_PROJECT_ACCESS)` |
| Duplicate / invalid state | `throwIomError(INVALID_STATUS_FOR_ACTION)` with readable message |
| Missing referrer / Pinelab ID | `LOYALTY_UPLOAD_PREREQUISITE_MISSING` with descriptive message |
| Pinelab failure | `PINELAB_UPLOAD_FAILED` — friendly message, no raw vendor error |
| Wrong role | `RolesGuard` → `403 Forbidden` before service |

### 2.6 Controller endpoint (plan-approval CR — mandatory)

In `iom.controller.ts`, add **immediately after** `GET :id/loyalty-details`:

```typescript
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.LOYALTY, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
@Post(':id/loyalty-points/upload')
async uploadLoyaltyPoints(...) {
  const result = await this.loyaltyUploadService.uploadLoyaltyPoints(user, id, dto);
  return { data: result };
}
```

**Do not** copy GET's CRM/Finance roles onto this route.

---

## Part 3 — Module Wiring

`iom.module.ts` already imports `PineLabsModule`. Register `IomLoyaltyUploadService` in `providers`. Inject `InjectDataSource`, `PineLabsExecutorService`, `IomValidationService`. No new module imports or migrations.

---

## Implementation Steps (ordered)

1. **Verify Part 1 types** — `loyalty-details.interface.ts` has all extended fields + `EMPTY_LOYALTY_ADDRESS`.
2. **Verify/create mapper** — `loyalty-participant.mapper.ts` per field-sourcing table; add `loyalty-participant.mapper.spec.ts` if mapper logic is non-trivial.
3. **Wire GET enrichment** — `iom-loyalty-details.service.ts` spreads extended fields; fix referee `customerName` source if needed.
4. **Verify DTO + response types** — `upload-loyalty-points.dto.ts`, `loyalty-upload.interface.ts`.
5. **Verify upload service** — orchestration follows flow above; **interim Pinelab success updates IOM status** (final-review CR); private `invokePinelabForParticipant` for future swap-in.
6. **Verify error codes** — `LOYALTY_UPLOAD_PREREQUISITE_MISSING` in enum + util if missing.
7. **Verify controller** — upload route with **LOYALTY / ADMIN / SUPER_ADMIN only**; GET roles unchanged.
8. **Verify module registration** — `IomLoyaltyUploadService` in `iom.module.ts`.
9. **Complete/finish unit tests** (see Testing Plan).
10. **Run validation commands**; fix any failures.

---

## Testing Plan

### `iom-loyalty-details.service.spec.ts`

- Extended field mapping for referee and referrer (all new fields from fixture JSON).
- `null` when source keys absent.
- `projectName2`/`unitNo2` cross-reference mapping.
- Existing PN-65 verification tests remain green.

### `loyalty-participant.mapper.spec.ts` (if created)

- Address composition (`location` direct vs city/state join).
- `sfdcId` fallback chain.

### `iom-loyalty-upload.service.spec.ts`

| Case | Expect |
|------|--------|
| ELIGIBLE success | `MARK_ELIGIBLE` for referee + referrer; IOM → `ELIGIBLE`; Pinelab before DB; response status `ELIGIBLE` |
| REDEEMABLE success | `REDEEM_POINTS` for both; IOM → `REDEEMABLE`; response status `REDEEMED` |
| Duplicate ELIGIBLE (state=ELIGIBLE or REDEEMABLE) | Reject; no Pinelab; no DB update |
| Duplicate REDEEMABLE (state=REDEEMABLE) | Reject |
| Referee Pinelab fails | Reject; no DB update |
| Referee succeeds, referrer fails | Reject; no DB update |
| Missing referrer / Pinelab ID | Business error |
| IOM not found / unauthorized | Standard IOM errors |

Mock `pineLabsExecutor.execute` → `{ success: true }` or `{ success: false, error: {...} }`.

### `iom.controller.spec.ts`

- Route delegates to upload service; returns `{ data: ... }` envelope.
- `@Roles` metadata on `uploadLoyaltyPoints` includes `LOYALTY`, `ADMIN`, `SUPER_ADMIN` and excludes CRM/Finance roles.

---

## Validation Commands

Run changed-surface tests first:

```bash
npm run test -- src/modules/iom/helpers/loyalty-participant.mapper.spec.ts
npm run test -- src/modules/iom/services/iom-loyalty-details.service.spec.ts
npm run test -- src/modules/iom/services/iom-loyalty-upload.service.spec.ts
npm run test -- src/modules/iom/iom.controller.spec.ts
npm run lint
npm run build
```

Optional broader sweep:

```bash
npm run test -- src/modules/iom/
```

No e2e or migration run expected.

---

## Target Files

| Action | Path |
|--------|------|
| Edit | `src/modules/iom/types/loyalty-details.interface.ts` |
| Create | `src/modules/iom/helpers/loyalty-participant.mapper.ts` |
| Create | `src/modules/iom/helpers/loyalty-participant.mapper.spec.ts` |
| Edit | `src/modules/iom/services/iom-loyalty-details.service.ts` |
| Edit | `src/modules/iom/services/iom-loyalty-details.service.spec.ts` |
| Create | `src/modules/iom/services/iom-loyalty-upload.service.ts` |
| Create | `src/modules/iom/services/iom-loyalty-upload.service.spec.ts` |
| Create | `src/modules/iom/dto/upload-loyalty-points.dto.ts` |
| Create | `src/modules/iom/types/loyalty-upload.interface.ts` |
| Edit | `src/modules/iom/iom.controller.ts` |
| Edit | `src/modules/iom/iom.module.ts` |
| Edit | `src/modules/iom/enums/iom-error-code.enum.ts` |
| Edit | `src/modules/iom/utils/iom-error.util.ts` |
| Edit | `src/modules/iom/iom.controller.spec.ts` |

**Do not edit:** migrations, Pine Labs module internals (except if compile requires enum import), frontend.

**Import-only references:**

- `src/modules/iom/helpers/iom-pdf-template.mapper.ts` — `pickStringField`, `computeBrokerageSplit`
- `src/modules/pine-labs/pine-labs-executor.service.ts`
- `src/modules/pine-labs/enums/pine-labs-api-name.enum.ts`
- `src/modules/iom/entities/iom.entity.ts`
- `src/modules/iom/services/iom-validation.service.ts`
- `src/enums/roles.enum.ts`

---

## Context Budget

For the code-implementer agent:

- Inspect **target files first**; avoid broad repo scans.
- Open non-target files only for direct imports, callers, tests, or required config (`pickStringField`, `PineLabsExecutorService`, `throwIomError`, `RolesEnum`, entity fields).
- Use native edit tools directly; do not print full file contents, full diffs, or large code blocks in chat.
- Run only the validation commands above for the changed surface.
- Do not read `docs/ai/stories/`, `.opencode/executions/`, `node_modules/`, or migration history unless a compile error requires a specific enum check.

---

## Risks

| Risk | Mitigation |
|------|------------|
| `REDEEMED` vs `REDEEMABLE` terminology | Persist DB `REDEEMABLE`; expose `REDEEMED` only in response status field |
| JSON key variance in `customerDetails` / `referrerDetails` | `pickStringField` with multiple aliases; realistic fixture tests |
| Missing Pinelab customer IDs at upload | Validate before Pinelab calls; actionable business error |
| Sequential Pinelab partial success | No IOM update; sufficient for interim phase |
| **Narrow upload roles vs GET** | Upload = `LOYALTY`, `ADMIN`, `SUPER_ADMIN` only; document in controller comment |
| **FE blocked waiting for live Pinelab** | Interim executor success drives status update now (final-review CR) |
| `SUPER_ADMIN` project access | Still requires `assertProjectAccess` via `project_user_mapping` like other IOM endpoints |

---

## Assumptions

1. `loyalty_points_release_type` column exists; nullable pre-upload; values `ELIGIBLE` | `REDEEMABLE` | `null`.
2. PN-65 GET endpoint and PN-51 Pine Labs executor are present on `feature/PN-51`.
3. **Interim Pinelab success semantics apply:** executor `{ success: true }` is sufficient to update IOM status and unblock FE; live Pinelab payload handling is a follow-up inside private methods, not a blocker for this story.
4. `REDEEMABLE` upload allowed when current state is `null` or `ELIGIBLE`.
5. No DB migration required for Part 1 or Part 2.
6. No participant-level results in upload success response (IOM-level status only).
7. **Upload endpoint roles are `LOYALTY`, `ADMIN`, `SUPER_ADMIN` only** (plan-approval CR). GET loyalty-details roles remain the broader existing set.
8. Dummy-phase partial Pinelab success requires no vendor-side compensation — "no IOM update + error response" is sufficient.
