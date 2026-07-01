# PN-51_4 — Loyalty Update (Dummy Pinelab Response)

## Overview

Introduce a minimal, brand-scoped Pinelab customer persistence model and refactor the existing IOM loyalty APIs to resolve Pinelab customers by **brand + mobile number** instead of storing customer IDs on the IOM record. Integrate with the **existing dummy Pinelab APIs** for customer lookup, eligibility, and redemption. Update IOM loyalty release state only when Pinelab calls succeed.

**Story key:** `PN-51_4`  
**Branch:** `feature/PN-51`  
**Repository role:** Backend API only (NestJS, TypeORM, MySQL migrations)

## Background & Context

- The `brands` table already exists; `name` is unique. Projects are mapped to brands via `projects.brand_id`.
- IOMs are generated in-system and already contain project and brand context.
- **SFDC ID is IOM-specific**, not user-specific — it remains on `ioms`, not in Pinelab tables.
- Do **not** store user profile fields (name, email, gender, address, etc.) in Pinelab-related tables at this stage.
- Do **not** create a `pinelab_purchases` table.
- Pinelab profile matching and profile-creation flags are **runtime-only** (never persisted).
- Pinelab customer identity must be resolved **per brand using mobile number**.

## Goals

1. Create a minimal `pinelab_customers` table (one row per mobile number per brand).
2. Modify loyalty APIs to:
   - Resolve Pinelab customers per brand + mobile.
   - Drive eligibility and redeem flows using resolved customer IDs.
   - Update IOM loyalty release state only on Pinelab success.
3. Preserve future extensibility without over-designing now.

## Non-Goals

- Storing full Pinelab user profiles locally.
- Live/production Pinelab integration (use existing dummy/mock executor).
- New brand or project mapping tables.
- Frontend changes.
- Removing or migrating historical data from IOM Pinelab columns unless required for the refactor (see Open Questions).

## Requirements

### R1 — Database: `pinelab_customers` table

Add a TypeORM migration creating:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `BIGINT` | PK, auto-increment |
| `brand_id` | `BIGINT` | NOT NULL, FK → `brands(id)` |
| `mobile_no` | `VARCHAR(15)` | NOT NULL |
| `pinelab_customer_id` | `VARCHAR(50)` | NULL |
| `created_at` | `TIMESTAMP` | default `CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMP` | default `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

Constraints:
- `UNIQUE (brand_id, mobile_no)` — one record per mobile per brand.
- No additional profile columns.

Add a TypeORM entity and register it in the appropriate module (likely IOM and/or Pine Labs module).

### R2 — Brand resolution

Resolve brand from IOM without new mapping tables:

```
IOM (project_id) → Projects (brand_id) → Brands
```

Implement or reuse a helper such as `resolveBrandFromIom(iomId): Brand` used by both loyalty services.

### R3 — Modify `GET /api/.../iom/:id/loyalty-details`

**Route (existing):** `GET :id/loyalty-details` on IOM controller  
**Service:** `IomLoyaltyDetailsService`

**Flow:**

1. Load IOM and assert project access (existing behavior).
2. Resolve brand from IOM → project → brand.
3. Extract referee and referrer mobile numbers from IOM data.
4. For each participant, lookup `pinelab_customers` by `(brand_id, mobile_no)`.
5. Call the existing dummy Pinelab customer-fetch API (`PineLabsApiName.CUSTOMER_FETCH` / `getCustomerDetails` equivalent) using stored `pinelab_customer_id` when present, otherwise mobile.
6. Compute **runtime-only** flags (not stored in DB):

   ```ts
   profileMatching =
     customerExistsInPinelab &&
     pinelabData matches IOM user data (name, mobile, address, etc.)

   shouldCreatePinelabProfile =
     customerDoesNotExistInPinelab
   ```

7. When Pinelab returns a customer ID, upsert into `pinelab_customers` for that brand + mobile (do not write profile fields).
8. Return loyalty details response including referee, referrer, and payment breakdown.

**Response shape (logical contract from story):**

```ts
{
  referee: {
    customerName,
    firstName,
    lastName,
    gender,
    email,
    mobileNo,
    pinelabId,
    project,
    unitNo,
    profileMatching,
    shouldCreatePinelabProfile,
    address: {
      addressLine1
      addressLine2
      pincode
      location
    },
    projectName,
    unitNo
  },
  referrer: {
    customerName,
    firstName,
    lastName,
    gender,
    email,
    mobileNo,
    pinelabId,
    project,
    unitNo,
    profileMatching,
    shouldCreatePinelabProfile,
    address: {
      addressLine1
      addressLine2
      pincode
      location
    },
    projectName,
    unitNo
  },
  paymentDetails: {
    saleValue,
    brokeragePercent,
    brokerageAmount,
    pointsAdjustment,
    pointsToReferee,
    pointsToReferrer
  }
}
```

**Note:** The current API returns `refereeDetails` / `referrerDetails` with fields like `mobileNumber`, `pinelabCustomerId`, and `isProfileDataMatching`. Preserve backward-compatible response naming unless product explicitly approves a breaking change (see Open Questions).

### R4 — Modify `POST /api/.../iom/:id/loyalty-points/upload`

**Route (existing):** `POST :id/loyalty-points/upload`  
**Service:** `IomLoyaltyUploadService`

**Request body (story):**

```ts
{
  releaseType: 'ELIGIBLE' | 'REDEEMABLE'
}
```

**Current DTO field:** `loyaltyPointsReleaseType` — align with existing API contract or introduce alias if required.

#### Flow: `ELIGIBLE`

1. Validate IOM is not already `ELIGIBLE` or `REDEEMABLE`; throw error if so.
2. Resolve brand from IOM.
3. Resolve referee and referrer Pinelab customer IDs via `pinelab_customers` (brand + mobile), calling Pinelab fetch if needed.
4. Call Pinelab **mark eligible** dummy API (`PineLabsApiName.MARK_ELIGIBLE`) for referee and referrer.
5. **On success only:** update IOM loyalty release state to `ELIGIBLE`.
6. **On Pinelab failure:** do not update IOM state; return error.

#### Flow: `REDEEMABLE`

1. Validate IOM is not already redeemed; throw error if `REDEEMABLE` / redeemed.
2. Resolve brand and Pinelab customer IDs as above.
3. Call Pinelab **redeem** dummy API (`PineLabsApiName.REDEEM_POINTS`) for referee and referrer.
4. **On success only:** update IOM loyalty release state to `REDEEMABLE`.
5. **On Pinelab failure:** do not update IOM state; return error.

#### Pinelab customer persistence rules

- Always resolve customers using `brand_id + mobile_no`.
- Insert or update `pinelab_customers` **only when Pinelab returns a customer ID**.
- Do not store user profile fields in `pinelab_customers`.
- Do not update IOM loyalty state if any Pinelab call fails.

### R5 — Null safety and stability

- Guard all string operations (`replace`, `toUpperCase`, `trim`, etc.) against `null` / `undefined`.
- Handle `NULL` loyalty release type on IOM (`loyaltyPointClassification` / `loyalty_points_release_type`).
- Apply filters and query conditions only when values are present.
- Replace or refine the current random mock verification in `IomLoyaltyDetailsService` with deterministic dummy Pinelab responses suitable for development and testing.

## Acceptance Criteria

### Database

- [ ] **AC-1:** Migration creates `pinelab_customers` with columns, unique constraint `(brand_id, mobile_no)`, and FK to `brands`.
- [ ] **AC-2:** TypeORM entity exists and is wired into the module layer.
- [ ] **AC-3:** `npm run migration:run` applies cleanly; `migration:revert` rolls back the table.

### Brand resolution

- [ ] **AC-4:** Brand is resolved from IOM via project → brand with no new mapping tables.
- [ ] **AC-5:** Missing or invalid project/brand linkage produces a clear, handled error.

### `GET :id/loyalty-details`

- [ ] **AC-6:** Endpoint resolves referee and referrer mobiles from IOM and looks up `pinelab_customers` by brand + mobile.
- [ ] **AC-7:** Endpoint calls the existing dummy Pinelab customer-fetch integration (not random-only mock).
- [ ] **AC-8:** `profileMatching` and `shouldCreatePinelabProfile` are computed at runtime and not persisted.
- [ ] **AC-9:** When Pinelab returns a customer ID, it is upserted into `pinelab_customers` for the brand + mobile pair.
- [ ] **AC-10:** Response includes referee, referrer, and payment details per the logical contract above.

### `POST :id/loyalty-points/upload`

- [ ] **AC-11:** `ELIGIBLE` flow rejects IOMs already `ELIGIBLE` or `REDEEMABLE`.
- [ ] **AC-12:** `REDEEMABLE` flow rejects IOMs already redeemed / `REDEEMABLE`.
- [ ] **AC-13:** Both flows resolve Pinelab customers via brand + mobile (not IOM-stored IDs as the source of truth).
- [ ] **AC-14:** Pinelab eligibility and redeem dummy APIs are invoked for both referee and referrer.
- [ ] **AC-15:** IOM loyalty release state updates to `ELIGIBLE` or `REDEEMABLE` only after all Pinelab calls succeed.
- [ ] **AC-16:** Pinelab failure leaves IOM state unchanged and returns an error response.
- [ ] **AC-17:** `pinelab_customers` rows are created/updated only when Pinelab returns a customer ID.

### Quality

- [ ] **AC-18:** Null-safe string handling prevents runtime errors on missing IOM / Pinelab fields.
- [ ] **AC-19:** Existing unit tests for loyalty services and controller are updated; new tests cover brand-wise lookup and failure-no-update behavior.
- [ ] **AC-20:** `npm run lint` and `npm run build` pass.

## API Notes

| Item | Value |
|------|-------|
| Global prefix | `api` (non-prod: `api/{NODE_ENV}`) |
| Response envelope | `{ data, success, errors }` style |
| Loyalty details | `GET /iom/:id/loyalty-details` |
| Loyalty upload | `POST /iom/:id/loyalty-points/upload` |
| Pinelab APIs (dummy) | `CUSTOMER_FETCH`, `MARK_ELIGIBLE`, `REDEEM_POINTS` via `PineLabsExecutorService` |

**Auth (existing):** Loyalty details — CRM/Finance/Loyalty/Admin roles; upload — Loyalty/Admin/Super Admin only.

## Implementation Notes

### Likely touch points

| Area | Path |
|------|------|
| Controller | `src/modules/iom/iom.controller.ts` |
| Loyalty details service | `src/modules/iom/services/iom-loyalty-details.service.ts` |
| Loyalty upload service | `src/modules/iom/services/iom-loyalty-upload.service.ts` |
| Upload DTO | `src/modules/iom/dto/upload-loyalty-points.dto.ts` |
| Response types | `src/modules/iom/types/loyalty-details.interface.ts` |
| IOM entity | `src/modules/iom/entities/iom.entity.ts` |
| Release type enum | `src/modules/iom/enums/iom.enums.ts` (`LoyaltyPointsReleaseTypeEnum`) |
| Brand entity | `src/modules/masters/brands/entities/brand.entity.ts` |
| Project → brand | `src/modules/masters/projects/entities/project.entity.ts` (`brandId`) |
| Pinelab executor | `src/modules/pine-labs/pine-labs-executor.service.ts` |
| Pinelab API names | `src/modules/pine-labs/enums/pine-labs-api-name.enum.ts` |
| Migration | `src/migrations/<Timestamp>CreatePinelabCustomers.ts` |

### Refactor from current behavior

- **Today:** `refereePinelabCustomerId` / `referrerPinelabCustomerId` on `ioms` are read and written by loyalty services; verification uses a random mock (`mockVerificationOutcome`).
- **Target:** `pinelab_customers` is the source of truth keyed by `(brand_id, mobile_no)`. IOM columns should no longer be the primary persistence path for Pinelab IDs.
- **Today:** Upload prerequisites require non-empty IOM-stored Pinelab IDs.
- **Target:** Upload resolves IDs from `pinelab_customers` + Pinelab fetch using brand + mobile.
- **Today:** IOM field `loyaltyPointClassification` stores release type.
- **Target:** Continue using this field (maps to story's `loyalty_points_release_type` concept).

### Migration commands

```bash
npm run migration:create -- src/migrations/CreatePinelabCustomers
npm run migration:run
```

### Dummy Pinelab integration

Use `PineLabsExecutorService.execute()` with existing API definitions. Replace interim random mock verification with executor-based dummy responses that reflect:
- customer found + profile match
- customer not found → `shouldCreatePinelabProfile: true`
- customer found + profile mismatch

## UI Notes

Not applicable — backend-only story. No Figma design context provided.

## Assumptions

- The existing `brands` and `projects` schema is sufficient; no seed data changes are required beyond the new table.
- Dummy Pinelab responses via `PineLabsExecutorService` satisfy the story's "dummy response" requirement; live Pinelab integration is out of scope (tracked separately, e.g. PN-65 TODO in code).
- Mobile numbers used for lookup are normalized consistently (same normalization for IOM extraction and DB lookup).
- Referrer may be absent on some IOMs; existing referrer-presence checks remain valid.
- Payment/brokerage calculation logic in `getLoyaltyDetails` can remain as-is; this story focuses on customer resolution and upload flow behavior.
- IOM columns `referee_pinelab_customer_id` / `referrer_pinelab_customer_id` may be left in place but deprecated in favor of `pinelab_customers` unless a follow-up story mandates removal.

## Open Questions

1. **API response naming:** Story uses `referee` / `referrer` / `profileMatching` / `pinelabId`; current API uses `refereeDetails` / `isProfileDataMatching` / `pinelabCustomerId`. Should this story change the public contract or only internal resolution logic?
2. **Request body naming:** Story specifies `releaseType`; current DTO uses `loyaltyPointsReleaseType`. Keep existing field name for backward compatibility?
3. **IOM Pinelab columns:** Should `referee_pinelab_customer_id` and `referrer_pinelab_customer_id` be removed in this story, left unused, or dual-written during transition?
4. **Profile matching fields:** Which IOM fields are authoritative for matching (name only vs name + mobile + address)? Current code compares name, mobile, and address.
5. **Upsert semantics:** When Pinelab returns a different customer ID for an existing brand + mobile row, should the row be updated or rejected?

## References

- Context map: `docs/ai/context-map.json`
- Project context: `docs/ai/project-context.md`
- Bulk transaction flow (related patterns): `docs/PE-483-bulk-transaction-api-flow.md`
- Parent epic/branch context: `feature/PN-51`
