# PN-51_4 Implementation Plan

## Summary

Introduce a brand-scoped `pinelab_customers` table and refactor IOM loyalty flows so Pinelab customer identity is resolved by **brand + mobile** (not IOM-stored IDs). Wire `GET :id/loyalty-details` and `POST :id/loyalty-points/upload` to the existing `PineLabsExecutorService` dummy APIs (`CUSTOMER_FETCH`, `MARK_ELIGIBLE`, `REDEEM_POINTS`). Persist Pinelab customer IDs only in `pinelab_customers`; update IOM `loyaltyPointClassification` only after all Pinelab calls succeed.

**Branch:** `feature/PN-51`  
**Depends on:** PN-65 (IOM Pinelab ID columns + `verifyParticipantViaPinelab` skeleton), PN-51_3 (loyalty upload endpoint)

---

## Planning Decisions (Open Questions)

| Question | Decision for this story |
|----------|-------------------------|
| API response naming | **Keep existing contract:** `refereeDetails` / `referrerDetails`, `isProfileDataMatching`, `pinelabCustomerId`, `paymentDetails.*` |
| Request body naming | **Keep** `loyaltyPointsReleaseType` in `UploadLoyaltyPointsDto` |
| IOM Pinelab columns | **Leave columns in place, stop using as source of truth.** Do not dual-write. Do not remove columns in this story |
| Profile matching | **Reuse existing logic:** name + mobile + address comparison in `verifyParticipantViaPinelab` |
| Upsert when ID changes | **Update** `pinelab_customers.pinelab_customer_id` when Pinelab returns a new ID for the same brand + mobile |

---

## Current State vs Target

| Area | Today | Target |
|------|-------|--------|
| Customer ID storage | `ioms.referee_pinelab_customer_id` / `referrer_pinelab_customer_id` | `pinelab_customers` keyed by `(brand_id, mobile_no)` |
| GET verification | Random `mockVerificationOutcome()`; executor not called | `PineLabsApiName.CUSTOMER_FETCH` via `verifyParticipantViaPinelab` |
| GET persistence | Writes discovered IDs to IOM columns | Upserts `pinelab_customers` only when Pinelab returns an ID |
| Upload prerequisites | Requires non-empty IOM-stored Pinelab IDs | Resolves IDs from `pinelab_customers` + Pinelab fetch by brand + mobile |
| Brand context | Not used in loyalty services | `iom.project.brandId` → brand scope for all lookups |
| Runtime flags | Already computed, not persisted | Unchanged (`isProfileDataMatching`, `shouldCreatePinelabProfile`) |

---

## Target Files

### Create

| File | Purpose |
|------|---------|
| `src/migrations/1782600000000-CreatePinelabCustomers.ts` | DDL for `pinelab_customers` |
| `src/modules/pine-labs/entities/pinelab-customer.entity.ts` | TypeORM entity |
| `src/modules/pine-labs/services/pinelab-customer.service.ts` | Brand + mobile lookup/upsert |
| `src/modules/pine-labs/utils/normalize-mobile.util.ts` | Shared mobile normalization for DB lookup |
| `src/modules/iom/helpers/resolve-brand-from-iom.helper.ts` | Pure helper: resolve `brandId` from loaded IOM |

### Modify

| File | Purpose |
|------|---------|
| `src/modules/pine-labs/pine-labs.module.ts` | Register/export `PinelabCustomerService` + entity |
| `src/modules/iom/iom.module.ts` | Import `PinelabCustomer` entity via `TypeOrmModule.forFeature` if needed for direct injection |
| `src/entities/index.ts` | Export `PinelabCustomer` entity (repo convention) |
| `src/modules/iom/services/iom-loyalty-details.service.ts` | Brand-wise resolution, executor wiring, `pinelab_customers` upsert |
| `src/modules/iom/services/iom-loyalty-upload.service.ts` | Brand-wise ID resolution; remove IOM-column prerequisite |
| `src/modules/iom/services/iom-loyalty-details.service.spec.ts` | Replace mock-outcome tests with executor + customer-repo tests |
| `src/modules/iom/services/iom-loyalty-upload.service.spec.ts` | Brand/mobile resolution + failure-no-update tests |
| `src/modules/pine-labs/services/pinelab-customer.service.spec.ts` | Unit tests for lookup/upsert (new) |

### Do not change (unless compile requires)

- `src/modules/iom/iom.controller.ts` — routes/guards already correct
- `src/modules/iom/dto/upload-loyalty-points.dto.ts` — keep `loyaltyPointsReleaseType`
- `src/modules/iom/types/loyalty-details.interface.ts` — response shape unchanged
- `src/modules/iom/entities/iom.entity.ts` — keep deprecated Pinelab ID columns

---

## Context Budget

- Inspect **Target Files** first; do not broad-scan `src/modules/` or `src/migrations/`.
- Open non-target files only for direct imports/callers: `pine-labs-executor.service.ts`, `pine-labs-api-name.enum.ts`, `pine-labs-api.definitions.ts`, `iom.entity.ts`, `project.entity.ts`, `brand.entity.ts`, `iom-error.util.ts`.
- Use provider-native edit tools; do not paste full file contents or large diffs in chat.
- Run only validation commands listed below for the changed surface.

---

## Part 1 — Database & Entity (R1)

### 1.1 Migration

Create `src/migrations/1782600000000-CreatePinelabCustomers.ts` following existing raw-SQL migration style (see `1782500000000-AddPinelabCustomerIdsToIoms.ts`, `1761560959000-UpdateEoiCampaignsTable.ts`).

```sql
CREATE TABLE pinelab_customers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id BIGINT NOT NULL,
  mobile_no VARCHAR(15) NOT NULL,
  pinelab_customer_id VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pinelab_customers_brand_mobile (brand_id, mobile_no),
  CONSTRAINT fk_pinelab_customers_brand
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT
);
```

`down`: drop FK, then table.

### 1.2 Entity

`PinelabCustomer` entity:

- Table: `pinelab_customers`
- Columns map to snake_case DB names
- `@ManyToOne(() => Brands)` on `brandId`
- No profile columns

### 1.3 Module wiring

- Add `TypeOrmModule.forFeature([PinelabCustomer])` to `PineLabsModule`
- Export `PinelabCustomerService` from `PineLabsModule`
- `IomModule` already imports `PineLabsModule` — inject service into loyalty services

---

## Part 2 — Shared Helpers (R2, R5)

### 2.1 Mobile normalization

`normalizeMobileForLookup(value: string | null | undefined): string | null`

- Trim; return `null` if empty
- Strip non-digits: `value.replace(/\D/g, '')`
- Use **everywhere** for `pinelab_customers` lookup and upsert keys

Store `mobile_no` as the normalized digits string (not raw formatted input) to keep uniqueness stable.

### 2.2 Brand resolution

`resolveBrandIdFromIom(iom: Iom): number`

- Read `iom.project?.brandId` (project is already joined in both loyalty services)
- If missing/`null`/`0`: `throwIomError(IomErrorCodeEnum.MANDATORY_FIELDS_MISSING, { iomId: iom.id, field: 'brandId' }, 'Unable to resolve brand for this IOM.')`
- Do **not** add new mapping tables or extra DB round-trips unless `project` join is absent in a code path

---

## Part 3 — `PinelabCustomerService` (R1, R4)

New injectable in `src/modules/pine-labs/services/pinelab-customer.service.ts`:

| Method | Behavior |
|--------|----------|
| `findByBrandAndMobile(brandId, mobile)` | Normalize mobile; `findOne({ brandId, mobileNo })` |
| `upsertCustomerId(brandId, mobile, pinelabCustomerId)` | No-op if `pinelabCustomerId` empty; else insert or update `pinelab_customer_id` + `updated_at` |

Use repository `save` with unique constraint or explicit find-then-update. On conflict, **update** the stored ID.

---

## Part 4 — Refactor `IomLoyaltyDetailsService` (R3, R5)

### 4.1 Inject dependencies

Add `PinelabCustomerService` to constructor.

### 4.2 `getLoyaltyDetails` flow changes

1. Load IOM + assert access (unchanged).
2. `const brandId = resolveBrandIdFromIom(iom)`.
3. For referee and referrer (when present):
   - Normalize mobile from `iom.customerMobile` / `iom.referrerMobile`
   - `const stored = await pinelabCustomerService.findByBrandAndMobile(brandId, mobile)`
   - Call refactored `verifyParticipant({ brandId, storedPinelabCustomerId: stored?.pinelabCustomerId ?? null, mobileNumber, iomName, iomAddress })`
4. After verification, if `verification.pinelabCustomerId` is non-null → `upsertCustomerId(brandId, mobile, id)`.
5. **Remove** `persistPinelabCustomerIds` IOM-column writes (delete method or make no-op removed).
6. Update `resolveDisplayedPinelabCustomerId`:
   - Input: verification result + `pinelab_customers` stored ID (not IOM columns)
   - When `shouldCreatePinelabProfile === true` → return `null` (existing PN-65 behavior)
   - Else → `verification.pinelabCustomerId ?? storedFromDb`

### 4.3 Replace mock with executor

In `verifyParticipant`:

- **Delete** `mockVerificationOutcome()` and the `Math.random()` switch
- **Call** existing `verifyParticipantViaPinelab(input)` directly
- Remove `TODO(PN-65)` swap comment; keep method private

`verifyParticipantViaPinelab` already:

- Builds fetch payload from stored ID or mobile
- Calls `PineLabsApiName.CUSTOMER_FETCH`
- Handles not-found → `shouldCreatePinelabProfile: true`
- Compares name/mobile/address with null-safe normalizers

Ensure all `.trim()`, `.replace()`, `.toLowerCase()` paths guard against `null`/`undefined` (most already do via optional chaining).

### 4.4 Payment / extended fields

Leave `computeBrokerageSplit`, `mapExtendedParticipantFields`, referrer project resolution unchanged.

---

## Part 5 — Refactor `IomLoyaltyUploadService` (R4)

### 5.1 Inject `PinelabCustomerService`

### 5.2 Replace IOM-column prerequisite block

Remove lines that read `iom.refereePinelabCustomerId` / `iom.referrerPinelabCustomerId` as prerequisites.

Replace with:

```ts
const brandId = resolveBrandIdFromIom(iom);
const refereePinelabId = await this.resolvePinelabCustomerIdForUpload(
  brandId, iom.customerMobile,
);
const referrerPinelabId = await this.resolvePinelabCustomerIdForUpload(
  brandId, iom.referrerMobile,
);
```

### 5.3 `resolvePinelabCustomerIdForUpload(brandId, mobile)`

1. Normalize mobile; if empty → prerequisite error
2. Lookup `pinelab_customers`
3. If row has `pinelabCustomerId` → return it
4. Else call `PineLabsExecutorService.execute(CUSTOMER_FETCH, { mobileNumber })` (or `customerId` if partial data)
5. On success with ID → upsert to `pinelab_customers`, return ID
6. On not-found / no ID → `throwIomError(LOYALTY_UPLOAD_PREREQUISITE_MISSING, { participant, iomId }, '...')`
7. On integration error → existing `PINELAB_UPLOAD_FAILED` path (do **not** update IOM)

**DRY option:** Extract shared fetch+extract logic from `IomLoyaltyDetailsService` into a small `PinelabCustomerResolverService` or static helper in `pine-labs/` if duplication exceeds ~30 lines. Prefer minimal scope: private method in upload service calling executor + `PinelabCustomerService` is acceptable.

### 5.4 Pinelab + IOM state (unchanged semantics)

- `assertValidStateTransition` — keep; handles `null` current state
- Invoke `MARK_ELIGIBLE` / `REDEEM_POINTS` for referee then referrer **before** DB transaction
- On any Pinelab failure → throw; IOM state unchanged
- On all success → transaction updates `loyaltyPointClassification` only

---

## Part 6 — Tests (AC-19)

### 6.1 `pinelab-customer.service.spec.ts`

- `findByBrandAndMobile` normalizes mobile before query
- `upsertCustomerId` inserts new row
- `upsertCustomerId` updates existing row when ID changes
- No-op when Pinelab ID is null/empty

### 6.2 `iom-loyalty-details.service.spec.ts`

**Remove** `mockOutcomeResult`, `stubMockOutcome`, `stubSequentialMockOutcomes`, and tests asserting executor is **not** called.

**Add/update:**

| Test | Assertion |
|------|-----------|
| Calls `CUSTOMER_FETCH` for referee (and referrer when present) | `pineLabsExecutor.execute` called with correct payload |
| Uses stored `pinelab_customers` ID in fetch when present | payload includes `customerId` |
| Falls back to mobile when no stored ID | payload includes `mobileNumber` |
| Upserts `pinelab_customers` when fetch returns ID | `pinelabCustomerService.upsertCustomerId` called |
| Does not upsert when fetch returns no ID | upsert not called |
| `shouldCreatePinelabProfile` on 404/not-found | response + no upsert |
| `resolveDisplayedPinelabCustomerId` uses DB ID, not IOM columns | baseIom has IOM IDs but response uses `pinelab_customers` |
| Brand missing | throws `MANDATORY_FIELDS_MISSING` |
| Pinelab integration failure | `PINELAB_INTEGRATION_ERROR` HttpException |
| Does not write to `iomRepo.update` for Pinelab IDs | `iomRepo.update` not called for customer ID fields |

Mock `PinelabCustomerService` in test setup alongside existing mocks.

### 6.3 `iom-loyalty-upload.service.spec.ts`

| Test | Assertion |
|------|-----------|
| Resolves IDs from `pinelab_customers` + fetch (not IOM columns) | baseIom with null IOM Pinelab IDs but mocked customer service returns IDs |
| Pinelab failure before transaction | `transactionalUpdate` not called |
| Success path | both `MARK_ELIGIBLE`/`REDEEM_POINTS` calls + IOM update |
| Missing mobile / unresolved customer | `LOYALTY_UPLOAD_PREREQUISITE_MISSING` |
| State guards | existing ELIGIBLE/REDEEMABLE rejection tests unchanged |

Update `baseIom` fixtures: set `project: { id: 10, name: '...', brandId: 1 }` for brand resolution.

---

## Implementation Steps (ordered)

1. Create migration `1782600000000-CreatePinelabCustomers.ts`.
2. Create `PinelabCustomer` entity + `normalize-mobile.util.ts`.
3. Create `PinelabCustomerService` + unit spec; wire `PineLabsModule`.
4. Create `resolve-brand-from-iom.helper.ts`.
5. Refactor `IomLoyaltyDetailsService`:
   - Brand resolution
   - Wire executor (remove random mock)
   - `pinelab_customers` lookup/upsert
   - Remove IOM Pinelab ID persistence
6. Refactor `IomLoyaltyUploadService`:
   - Brand + mobile ID resolution
   - Remove IOM-column prerequisites
7. Export entity from `src/entities/index.ts`.
8. Update loyalty service specs; add `pinelab-customer.service.spec.ts`.
9. Run validation commands.

---

## Validation Commands

```bash
# Migration (local/dev DB only — do not run against prod from agent)
npm run migration:run
npm run migration:revert   # verify rollback, then re-run migration:run

# Targeted unit tests
npm run test -- src/modules/pine-labs/services/pinelab-customer.service.spec.ts
npm run test -- src/modules/iom/services/iom-loyalty-details.service.spec.ts
npm run test -- src/modules/iom/services/iom-loyalty-upload.service.spec.ts

# Repo gates
npm run lint
npm run build
```

Manual smoke (optional, dev env with dummy Pinelab base URL configured):

- `GET /api/{env}/iom/:id/loyalty-details` — returns verification flags; upserts `pinelab_customers` on fetch success
- `POST /api/{env}/iom/:id/loyalty-points/upload` with `{ "loyaltyPointsReleaseType": "ELIGIBLE" }` — Pinelab called; IOM state updated only on success

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Dummy Pinelab env not configured → executor errors | Tests mock executor; dev needs `PINE_LABS_BASE_URL_*` — document in PR; integration errors already mapped to 502/503 |
| Mobile format mismatch (e.g. `+91` vs `9876543210`) | Centralize `normalizeMobileForLookup`; use for all reads/writes |
| `iom.project` join missing `brandId` | `resolveBrandIdFromIom` throws clear error; ensure `leftJoinAndSelect('iom.project')` remains in loaders |
| Existing rows in IOM Pinelab columns not migrated | Out of scope; new flows ignore IOM columns. First successful fetch populates `pinelab_customers` |
| Upload calls Pinelab before both IDs resolved | Resolve both participants first; fail fast on missing referee/referrer ID before any Pinelab mark/redeem |
| Unique constraint race on concurrent upsert | Acceptable for v1; use find-then-save; retry on duplicate key only if observed |

---

## Assumptions

- `projects.brand_id` is populated for all IOMs used in loyalty flows.
- Dummy Pinelab APIs behind `PineLabsExecutorService` return `{ success: true, data: { customer: { customerId, ... } } }` shapes compatible with existing extractors in `iom-loyalty-details.service.ts`.
- Referrer absence rules from PN-51_3 remain: upload requires referrer; GET returns empty referrer participant when absent.
- `loyaltyPointClassification` / `loyalty_points_release_type` continues as the IOM release-state column; `null` means not yet uploaded.
- No data backfill from `ioms.referee_pinelab_customer_id` / `referrer_pinelab_customer_id` into `pinelab_customers` in this story.
- Auth/roles on loyalty endpoints remain unchanged from PN-51_3.
