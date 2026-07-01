# PN-65: Get loyalty details

## Overview

Implement loyalty point details retrieval for a given IOM (`iomId`), including Pinelab customer profile verification for both referee and referrer, persistence of Pinelab customer ID linkage, and a consolidated REST API response covering participant details and payment/loyalty point breakdown.

**Interim behavior (approved change request):** Pinelab profile verification does **not** call live Pinelab or return integration errors such as *"Unable to verify Pinelab customer profile at this time."* For now, verification outcomes are **statically mocked** by randomly returning one of three predefined states per participant: profile matched, profile create needed, or profile not matching.

## Goal

Deliver a backend capability that:

- Extends the IOM data model with nullable Pinelab customer ID columns for referee and referrer
- Returns profile verification flags (`isProfileDataMatching`, `shouldCreatePinelabProfile`) at **request time** in the API response (not persisted as DB columns)
- Exposes a single API that returns consolidated loyalty information for an `iomId`, including mocked Pinelab verification state and payout/points details
- Reuses existing Pine Labs module infrastructure and existing IOM listing/view/pdf helpers — no new Pinelab verification service or standalone util modules

## Background

- **Project:** NestJS backend API (`repositoryRole: backend-api-only`)
- **API style:** REST with global prefix `api` (non-prod: `api/{NODE_ENV}`)
- **Response envelope:** `success-response-errors`
- **Branch:** `feature/PN-51`
- **Input type:** Jira story
- **Upstream dependency:** PN-51 Pine Labs base integration (`customerfetch` / `getCustomerDetails` via `PineLabsExecutorService`; config via `PineLabsConfigService`)
- **Primary identifier:** `iomId` is used to fetch all related loyalty, participant, and payment data

## Scope

### In scope

1. **Database schema changes**
   - Add nullable Pinelab customer ID columns for referee and referrer on `ioms`
   - Provide a TypeORM migration using project conventions (`npm run migration:create`, `npm run migration:run`)
   - **Do not** add `is_profile_data_matching` or `should_create_pinelab_profile` DB columns — flags are response-only

2. **Pinelab customer verification logic (interim: static mock)**
   - **For now:** Do not perform live Pinelab `getCustomerDetails` calls or surface Pinelab integration failures to the client
   - **For now:** Randomly assign one of three static verification outcomes per participant (referee and referrer independently):
     - **Profile matched** — `isProfileDataMatching: true`, `shouldCreatePinelabProfile: false`
     - **Profile create** — `isProfileDataMatching: false`, `shouldCreatePinelabProfile: true`
     - **Profile not matching** — `isProfileDataMatching: false`, `shouldCreatePinelabProfile: false`
   - Structure verification as private methods inside `iom-loyalty-details.service.ts` so live Pinelab integration can replace the mock later without a separate service file
   - Persist Pinelab customer IDs to DB only when a real integration returns them (mock phase may leave IDs null or use placeholder logic documented in implementation plan)

3. **Loyalty Point Details API**
   - New endpoint that accepts `iomId` and returns consolidated loyalty information
   - Response includes `refereeDetails`, `referrerDetails`, and `paymentDetails` per the contract below

4. **Business rules**
   - Separate semantics for `isProfileDataMatching` (field comparison / matched state) and `shouldCreatePinelabProfile` (customer absent in Pinelab / create needed)
   - Do not infer Pinelab absence from profile field mismatches
   - Mock outcomes must still respect the state machine — never return incompatible flag combinations

5. **Code organization (approved planning scope)**
   - **Do not create** `src/modules/iom/services/iom-pinelab-profile-verification.service.ts` — Pine Labs integration lives under `src/modules/pine-labs/` (`PineLabsExecutorService`, `PineLabsConfigService`)
   - **Do not create** `src/modules/iom/helpers/iom-brokerage-split.util.ts` or `src/modules/iom/helpers/iom-participant-details.util.ts` — reuse existing listing/view/pdf logic (e.g. export `computeBrokerageSplit`, `resolveCustomerName`, `pickStringField` from `iom-pdf-template.mapper.ts`)

### Out of scope

- Live Pinelab API integration for verification in this iteration (deferred; mock replaces it)
- Creating Pinelab profiles when `shouldCreatePinelabProfile` is true (flag only; creation is a downstream/UI workflow)
- UI/frontend changes
- Pine Labs base integration setup (covered by PN-51)
- Webhook or async reconciliation flows
- Bulk export or listing APIs for loyalty details
- New standalone helper or verification service modules

## Requirements

### R1 — Database changes

| ID | Requirement |
|----|-------------|
| R1.1 | Add `referee_pinelab_customer_id` column (nullable `varchar`, aligned with existing Pinelab ID conventions) to `ioms`. |
| R1.2 | Add `referrer_pinelab_customer_id` column (nullable) to `ioms`. |
| R1.3 | Apply changes via a reversible TypeORM migration. |
| R1.4 | Update the `Iom` entity so new ID columns are readable and writable. |
| R1.5 | **Do not** persist `is_profile_data_matching` or `should_create_pinelab_profile` — these are API response fields only. |

### R2 — Pinelab customer verification (interim static mock)

| ID | Requirement |
|----|-------------|
| R2.1 | Implement verification as **private methods** in `iom-loyalty-details.service.ts` (no separate Pinelab profile verification service). |
| R2.2 | For **referee** and **referrer**, independently assign a verification outcome. |
| R2.3 | **Interim:** Randomly return one of three static outcomes per participant (see state machine below). |
| R2.4 | **Interim:** Do **not** call live Pinelab `getCustomerDetails` or throw client-facing errors such as *"Unable to verify Pinelab customer profile at this time."* |
| R2.5 | **Interim:** API must always return a successful loyalty-details payload with valid boolean flags when IOM exists and caller is authorized. |
| R2.6 | Verification outcomes must follow the approved state machine — no invalid flag pairs. |
| R2.7 | Referee and referrer verification must be independent; one party's outcome must not affect the other's flags. |
| R2.8 | **Future-ready:** Code structure should allow swapping the mock with live `PineLabsExecutorService.execute(PineLabsApiName.CUSTOMER_FETCH, ...)` without introducing a new service file. |

**Live Pinelab behavior (deferred, for future swap-in):**

| Pinelab lookup result | `isProfileDataMatching` | `shouldCreatePinelabProfile` |
|-----------------------|-------------------------|------------------------------|
| Customer not found | `false` | `true` |
| Customer found, all fields match | `true` | `false` |
| Customer found, any field mismatch | `false` | `false` |

**Interim mock behavior (current requirement):**

| Mock outcome | `isProfileDataMatching` | `shouldCreatePinelabProfile` |
|--------------|-------------------------|------------------------------|
| Profile matched | `true` | `false` |
| Profile create | `false` | `true` |
| Profile not matching | `false` | `false` |

### R3 — Loyalty Point Details API

| ID | Requirement |
|----|-------------|
| R3.1 | Expose a REST endpoint keyed by `iomId` that returns consolidated loyalty information. |
| R3.2 | Load IOM-related referee, referrer, project/unit, and payment/loyalty data using `iomId` as the primary lookup. |
| R3.3 | Include verification flags from R2 in `refereeDetails` and `referrerDetails`. |
| R3.4 | Return response body using the `success-response-errors` envelope. |
| R3.5 | Map internal snake_case DB fields to camelCase API fields per contract below. |
| R3.6 | Return `404` or project-standard not-found error when `iomId` does not exist or caller lacks access (follow existing IOM authorization patterns). |
| R3.7 | **Interim:** Do not fail the loyalty-details request due to Pinelab unavailability — mock verification instead. |

### R4 — Business rules (must hold in all code paths)

| ID | Requirement |
|----|-------------|
| R4.1 | `isProfileDataMatching` reflects **matched profile state** only (mock: profile matched branch; future: field-level match when Pinelab record exists). |
| R4.2 | `shouldCreatePinelabProfile` reflects **create-needed state** only (mock: profile create branch; future: customer absent in Pinelab). |
| R4.3 | Profile-not-matching / field-mismatch state must set both flags `false` — never set `shouldCreatePinelabProfile: true`. |
| R4.4 | Profile-matched state must set `isProfileDataMatching: true` and `shouldCreatePinelabProfile: false`. |
| R4.5 | Profile-create state must set `shouldCreatePinelabProfile: true` and `isProfileDataMatching: false`. |
| R4.6 | `iomId` is the sole input identifier for fetching all related loyalty details in this API. |

### R5 — Reuse existing IOM/Pine Labs modules

| ID | Requirement |
|----|-------------|
| R5.1 | Orchestrate in `iom-loyalty-details.service.ts` within the existing IOM module. |
| R5.2 | Import `PineLabsModule` into `IomModule` for future live integration; use `PineLabsExecutorService` / `PineLabsConfigService` — not a new IOM Pinelab service. |
| R5.3 | Reuse participant name, project/unit, and brokerage split logic from existing IOM listing/view/pdf flows — export shared helpers from `iom-pdf-template.mapper.ts` rather than new util files. |
| R5.4 | Reuse `IomValidationService.assertProjectAccess` and IOM load patterns from `IomCrmService`. |

## API Contract

### Endpoint

- **Method:** `GET`
- **Path:** `GET /iom/:id/loyalty-details` (mirror `GET /iom/:id/pdf` route specificity)
- **Input:** `iomId` as path param `:id`
- **Guards/Roles:** Mirror `GET /iom/:id` — `RmAdminAuthGuard`, `RolesGuard`, roles: `CRM`, `CRM_TL`, `CRM_HEAD`, `FINANCE_USER`, `FINANCE_HEAD`, `LOYALTY`, `ADMIN`

### Response payload (inside success envelope)

```json
{
  "refereeDetails": {
    "customerName": "string | null",
    "mobileNumber": "string | null",
    "projectName": "string | null",
    "unitNumber": "string | null",
    "pinelabCustomerId": "string | null",
    "isProfileDataMatching": "boolean",
    "shouldCreatePinelabProfile": "boolean"
  },
  "referrerDetails": {
    "customerName": "string | null",
    "mobileNumber": "string | null",
    "projectName": "string | null",
    "unitNumber": "string | null",
    "pinelabCustomerId": "string | null",
    "isProfileDataMatching": "boolean",
    "shouldCreatePinelabProfile": "boolean"
  },
  "paymentDetails": {
    "saleValue": "number",
    "brokeragePercentage": "number",
    "brokerageAmount": "number",
    "loyaltyPointsAdjustment": "number",
    "pointsForReferee": "number",
    "pointsForReferrer": "number",
    "refereePayoutAmount": "number",
    "referrerPayoutAmount": "number"
  }
}
```

### Payment field sources (from IOM entity)

| API field | IOM source |
|-----------|------------|
| `saleValue` | `iom.salePrice` |
| `brokeragePercentage` | `iom.brokeragePercentage` |
| `brokerageAmount` | `iom.totalBrokerageAmount` |
| `loyaltyPointsAdjustment` | `iom.referralPointsAdjustment ?? 0` |
| `pointsForReferee` | `iom.refereePoints` |
| `pointsForReferrer` | `iom.referrerPoints` |
| `refereePayoutAmount` | `computeBrokerageSplit(iom).refereeAmount` |
| `referrerPayoutAmount` | `computeBrokerageSplit(iom).referrerAmount` |

## Acceptance Criteria

### Database

- **AC-1:** Migration adds `referee_pinelab_customer_id` and `referrer_pinelab_customer_id` (nullable) to `ioms`.
- **AC-2:** Migration runs and reverts cleanly via `npm run migration:run` / `npm run migration:revert`.
- **AC-3:** `Iom` entity exposes the two new ID columns with correct types; no boolean verification columns in DB.

### Pinelab verification (interim mock)

- **AC-4:** For referee and referrer, verification returns one of the three valid static outcomes (profile matched, profile create, profile not matching).
- **AC-5:** Mock profile-create outcome returns `shouldCreatePinelabProfile: true` and `isProfileDataMatching: false`.
- **AC-6:** Mock profile-matched outcome returns `isProfileDataMatching: true` and `shouldCreatePinelabProfile: false`.
- **AC-7:** Mock profile-not-matching outcome returns both flags `false`.
- **AC-8:** Profile-not-matching outcome never sets `shouldCreatePinelabProfile: true`.
- **AC-9:** Referee and referrer verification outcomes are computed independently.
- **AC-10:** Loyalty-details API does **not** return Pinelab integration error messages or fail with *"Unable to verify Pinelab customer profile at this time."* during the mock phase.
- **AC-11:** Verification logic lives in `iom-loyalty-details.service.ts` private methods — no `iom-pinelab-profile-verification.service.ts`.

### Loyalty Point Details API

- **AC-12:** `GET /iom/:id/loyalty-details` exists and returns the consolidated response shape.
- **AC-13:** Response includes `refereeDetails`, `referrerDetails`, and `paymentDetails` with all contract fields.
- **AC-14:** `refereeDetails` and `referrerDetails` include `pinelabCustomerId`, `isProfileDataMatching`, and `shouldCreatePinelabProfile`.
- **AC-15:** `paymentDetails` includes all numeric fields per contract, sourced from IOM entity and `computeBrokerageSplit`.
- **AC-16:** API uses the standard `success-response-errors` envelope.
- **AC-17:** Invalid or unauthorized `iomId` returns project-standard error (not a partial success payload).

### Code organization

- **AC-18:** No new files `iom-brokerage-split.util.ts`, `iom-participant-details.util.ts`, or `iom-pinelab-profile-verification.service.ts`.
- **AC-19:** Participant and brokerage mapping reuses exported helpers from `iom-pdf-template.mapper.ts` and patterns from IOM listing/view/crm services.

### Testing

- **AC-20:** Unit tests cover all three mock verification branches for at least one participant role.
- **AC-21:** Unit tests assert R4 business rules (valid flag combinations only; no cross-inference between flags).
- **AC-22:** Unit tests assert referee and referrer independence.
- **AC-23:** API/controller tests verify response shape and successful aggregation for a valid `iomId`.
- **AC-24:** Tests confirm loyalty-details does not throw or return Pinelab verification failure errors in mock mode.

## Implementation Notes

### Interim mock verification

- Replace live `PineLabsExecutorService` calls with a private method that randomly selects among the three state-machine outcomes (e.g. uniform random per participant).
- Use `Math.random()` or injectable randomness for testability.
- Log at debug level that mock verification is active so operators know live Pinelab is not yet wired.
- Structure `verifyParticipant(...)` return type now; swap implementation body later for live Pinelab without changing the API contract.

### Module and file placement

| Action | Path |
|--------|------|
| Edit | `src/modules/iom/entities/iom.entity.ts` |
| Create | `src/migrations/<timestamp>-AddPinelabCustomerIdsToIoms.ts` |
| Create | `src/modules/iom/services/iom-loyalty-details.service.ts` |
| Create | `src/modules/iom/types/loyalty-details.interface.ts` |
| Edit | `src/modules/iom/iom.controller.ts` |
| Edit | `src/modules/iom/iom.module.ts` |
| Edit | `src/modules/iom/helpers/iom-pdf-template.mapper.ts` (export shared helpers only) |
| Create | `src/modules/iom/services/iom-loyalty-details.service.spec.ts` |
| Edit | `src/modules/iom/iom.controller.spec.ts` |

**Explicitly excluded:**

- `src/modules/iom/services/iom-pinelab-profile-verification.service.ts`
- `src/modules/iom/helpers/iom-brokerage-split.util.ts`
- `src/modules/iom/helpers/iom-participant-details.util.ts`

### Participant field resolution (reuse listing/view)

- **Referee:** `resolveCustomerName(iom)`, `iom.customerMobile`, `iom.project?.name`, unit from `iom.unitNumber` or `customerDetails` JSON
- **Referrer:** name/mobile from `referrerDetails` JSON and `iom.referrerMobile`; project name via `Projects` repository (same pattern as `IomCrmService.resolveReferrerProjectName`)
- **Missing referrer:** If referrer data absent, return referrer block with nulls and flags `false` (skip mock verification for absent participant)

### Pine Labs module

- `PineLabsExecutorService` — future `CUSTOMER_FETCH` execution
- `PineLabsConfigService` — API definitions, base URL, auth (config only; not a replacement for loyalty orchestration)
- Import `PineLabsModule` in `IomModule` even during mock phase if wiring is already in place

### Migrations

- `npm run migration:create -- src/migrations/AddPinelabCustomerIdsToIoms`
- Follow existing migration patterns (raw SQL `ALTER TABLE` on `ioms`)

### Future live Pinelab swap-in

When mock is removed:

1. Call `PineLabsExecutorService.execute(PineLabsApiName.CUSTOMER_FETCH, { customerId | mobile })` per participant
2. Compare name, mobile, address against IOM data with normalization (trim, case-insensitive name, digits-only mobile)
3. Persist returned Pinelab customer IDs to `referee_pinelab_customer_id` / `referrer_pinelab_customer_id`
4. Surface Pinelab transport failures per PN-51 integration error patterns (separate story/phase)

## UI Notes

Not applicable — backend API only; no Figma or frontend design context provided. UI will consume `isProfileDataMatching` and `shouldCreatePinelabProfile` for profile-match / create-profile CTAs once live verification replaces mock.

## Open Questions

1. **Mock randomness distribution:** Should referee and referrer each get independent random outcomes, or should both share the same outcome per request? Default: **independent** per participant (R2.7).
2. **`pinelabCustomerId` during mock:** Return stored DB value only, always `null`, or a static placeholder? Default: return stored value from `ioms` if present, else `null`.
3. **Comparison fields (live phase):** Beyond name, mobile, and address, what are the "other agreed fields" for Pinelab vs IOM comparison?
4. **Missing referrer:** Confirm null referrer block with flags `false` vs. 400 — default: null block, flags `false`, no mock call.
5. **`getCustomerDetails` identifier (live phase):** Mobile-only vs. stored `customerId` fallback order.
6. **When to remove mock:** Product trigger or follow-up ticket for live Pinelab verification.

## Assumptions

- PN-51 Pine Labs module is available on `feature/PN-51`; mock phase does not require live Pinelab connectivity.
- `iomId` refers to `ioms.id` (same as existing `GET /iom/:id`).
- Boolean verification flags are **response-only**; only Pinelab customer IDs are persisted in DB.
- Target table is `ioms` — single row holds referee (customer) and referrer data.
- `refereeDetails.projectName` and `unitNumber` come from IOM project/unit data; referrer fields from `referrerDetails` JSON and project lookup.
- `paymentDetails` numeric fields use project standard currency/decimal conventions.
- No Pinelab profile is created by this API — `shouldCreatePinelabProfile` is informational for downstream/UI CTA.
- API follows existing NestJS controller/service/DTO patterns and the `success-response-errors` envelope.
- Approved planning scope: no separate Pinelab verification service; reuse pdf mapper / listing / view helpers.
- **Interim assumption:** Random static verification is acceptable for development/demo until live Pinelab integration is enabled.

## References

- Story key: **PN-65**
- Title: **Get loyalty details**
- Branch: **feature/PN-51**
- Upstream story: **PN-51** — Pine Labs base setup
- Context map: `docs/ai/context-map.json`
- Implementation plan: `docs/ai/stories/PN-65/implementation-plan.md` (DB scope, module reuse — preserve; verification section superseded by interim mock per final-review change request)
- Pine Labs config surface: `src/modules/pine-labs/config/pine-labs-config.service.ts`
- Shared IOM helpers: `src/modules/iom/helpers/iom-pdf-template.mapper.ts`
- Migration commands: `npm run migration:create -- src/migrations/<Name>`, `npm run migration:run`
