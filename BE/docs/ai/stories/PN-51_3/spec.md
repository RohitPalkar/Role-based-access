# PN-51_3: Update Loyalty Points on Pinelab

## Overview

Extend the existing loyalty point details API with additional referee and referrer fields (response-only, sourced from IOM/booking/customer data), and add a new API to upload loyalty points to Pinelab for both participants.

**Interim Pinelab strategy (final-review change, 2026-06-29):** Ship the upload flow and IOM status transitions now so the frontend is not blocked. For this iteration, treat success from the existing Pine Labs executor (`markEligible`, `redeemPonts`) as sufficient to update `loyalty_points_release_type`. Real Pinelab request/response contracts and live integration will be refined later without changing the upload API contract or blocking FE integration.

This story builds on **PN-65** (loyalty details GET API) and **PN-51** (Pine Labs base integration).

## Story Metadata

| Field | Value |
|-------|-------|
| **Key** | PN-51_3 |
| **Title** | Update loyalty points on Pinelab *(Jira title: "update loayalty points on pinelab")* |
| **Branch** | `feature/PN-51` |
| **Repository role** | Backend API only (NestJS REST, `api` global prefix) |
| **Response envelope** | `success-response-errors` |
| **Input type** | Jira story |

## Goal

Deliver backend capabilities that:

1. Enrich `refereeDetails` and `referrerDetails` in the loyalty point details API with extended personal, address, and secondary booking fields — **runtime response only**, no new DB persistence.
2. Expose a new IOM-scoped API to trigger Pinelab eligibility or redemption for **both** referee and referrer, updating `loyalty_points_release_type` on the IOM after successful interim Pinelab responses so FE can integrate immediately.
3. Enforce idempotent, transaction-like safety: duplicate actions rejected; partial Pinelab failure rolls back the entire request (no IOM state change).
4. Restrict upload action to **LOYALTY**, **ADMIN**, and **SUPER_ADMIN** roles only (plan-approval change, 2026-06-29).

## Background

- **Upstream dependency — PN-65:** `GET /iom/:id/loyalty-details` returns `refereeDetails`, `referrerDetails`, and `paymentDetails` with Pinelab profile verification flags computed at runtime (currently mocked).
- **Upstream dependency — PN-51:** Pine Labs module exposes executor/config for `markEligible` and `redeemPonts` (interim/dummy integration pending live wiring).
- **Existing IOM field:** `loyalty_points_release_type` (entity: `loyaltyPointClassification`) tracks the current loyalty release state for an IOM. DB enum values are `ELIGIBLE` and `REDEEMABLE` (no separate `REDEEMED` DB value).
- **Profile verification flags** (`isProfileDataMatching`, `shouldCreatePinelabProfile`) remain **runtime-only** — do **not** add DB columns for them (per PN-65 approved change).

## Scope

### In scope

1. **Extend loyalty details response (Part 1)** — add fields to `refereeDetails` and `referrerDetails` on the existing loyalty point details API.
2. **Upload loyalty points API (Part 2)** — new endpoint accepting `iomId` and `loyaltyPointsReleaseType`, orchestrating interim Pinelab calls for referee and referrer, and updating IOM status on executor success.
3. **State validation and error handling (Parts 3–4)** — duplicate-action prevention, all-or-nothing Pinelab processing, clear business error messages.
4. **FE-unblocking interim behavior** — return stable upload success payload with `loyaltyPointsReleaseStatus` reflecting the new IOM state after Pinelab executor success; do not defer status updates until live Pinelab contracts are finalized.
5. **Future-ready design** — structure Pinelab calls so live request/response handling can replace interim executor behavior with minimal API change.

### Out of scope

- Final/live Pinelab API request/response contract implementation (deferred; interim executor success semantics apply now)
- New DB columns for profile matching or Pinelab verification flags
- Persisting the new Part 1 response fields (firstName, address, etc.) to DB
- UI/frontend changes (backend must expose stable contracts for FE now)
- Pinelab profile creation triggered by backend (flag-only in GET; creation is UI-driven)
- Bulk upload or batch processing across multiple IOMs
- Webhook or async reconciliation flows
- Granting CRM, Finance, or other roles access to the upload endpoint

## Requirements

### R1 — Extend referee and referrer basic details (runtime response only)

Enhance **both** `refereeDetails` and `referrerDetails` objects in the loyalty point details API response.

| ID | Requirement |
|----|-------------|
| R1.1 | Add personal detail fields: `firstName`, `lastName`, `sfdcId`, `gender`, `email`. |
| R1.2 | Add nested `address` object with: `addressLine1`, `addressLine2`, `pincode`, `location`. |
| R1.3 | Add secondary booking reference fields: `projectName2`, `unitNo2`. |
| R1.4 | Source all new fields from existing IOM / booking / customer data already available in the codebase — do not introduce new DB columns or persistence for these fields. |
| R1.5 | Preserve existing referee/referrer fields and Pinelab profile verification logic from PN-65 (`pinelabCustomerId`, `isProfileDataMatching`, `shouldCreatePinelabProfile`, etc.). |
| R1.6 | Map internal snake_case sources to camelCase API fields per contract below. |
| R1.7 | Return `null` for individual fields when source data is unavailable (consistent with existing nullable field behavior). |

**Extended participant object (applies to both `refereeDetails` and `referrerDetails`):**

```json
{
  "customerName": "string | null",
  "mobileNumber": "string | null",
  "projectName": "string | null",
  "unitNumber": "string | null",
  "pinelabCustomerId": "string | null",
  "isProfileDataMatching": "boolean",
  "shouldCreatePinelabProfile": "boolean",
  "firstName": "string | null",
  "lastName": "string | null",
  "sfdcId": "string | null",
  "gender": "string | null",
  "email": "string | null",
  "address": {
    "addressLine1": "string | null",
    "addressLine2": "string | null",
    "pincode": "string | null",
    "location": "string | null"
  },
  "projectName2": "string | null",
  "unitNo2": "string | null"
}
```

### R2 — Create API to upload loyalty points to Pinelab

| ID | Requirement |
|----|-------------|
| R2.1 | Expose a new REST endpoint scoped by `iomId` to upload/trigger loyalty points release to Pinelab. |
| R2.2 | Accept request input: `iomId` (path) and `loyaltyPointsReleaseType` with allowed values `ELIGIBLE` \| `REDEEMABLE`. |
| R2.3 | Read current state from existing IOM field `loyalty_points_release_type` (`loyaltyPointClassification`). |
| R2.4 | Use existing Pine Labs executor integration — `markEligible` for eligibility, `redeemPonts` for redemption (PN-51 config keys). Interim executor success is treated as Pinelab success for status updates. |
| R2.5 | Process **both** referee and referrer in a single orchestrated flow per request. |
| R2.6 | Call Pinelab **first**; update IOM `loyalty_points_release_type` **only** when both participant calls return executor success. |
| R2.7 | Any Pinelab/executor failure for either participant must **not** update IOM state. |
| R2.8 | Return responses using the standard `success-response-errors` envelope with clear, user-readable validation/business error messages. |
| R2.9 | Keep logic idempotent and IOM-scoped. |
| R2.10 | Design Pinelab invocation behind private/service methods so interim implementations can be swapped for live Pinelab request/response handling later without API contract changes. |
| R2.11 | **Interim FE-unblock:** On successful upload, persist the new release type and return `loyaltyPointsReleaseStatus` reflecting the updated IOM state. Do not block frontend integration pending final Pinelab API contracts. |
| R2.12 | **Authorization:** Only users with roles `LOYALTY`, `ADMIN`, or `SUPER_ADMIN` may call the upload endpoint. GET loyalty-details retains its existing broader role list unchanged. |

**ELIGIBLE flow (`loyaltyPointsReleaseType = ELIGIBLE`):**

| Step | Behavior |
|------|----------|
| Pre-validation | If `loyalty_points_release_type` is already `ELIGIBLE` or `REDEEMABLE` (redeemed), reject with a business error (prevent duplicate eligibility). |
| Pinelab | Raise eligibility request via `markEligible` for **both** referee and referrer. |
| On success | Set `loyalty_points_release_type = ELIGIBLE` on the IOM. Return `loyaltyPointsReleaseStatus: "ELIGIBLE"`. |

**REDEEMABLE flow (`loyaltyPointsReleaseType = REDEEMABLE`):**

| Step | Behavior |
|------|----------|
| Pre-validation | If `loyalty_points_release_type` is already `REDEEMABLE` (redeemed), reject with a business error (already redeemed). |
| Pinelab | Raise redeem request via `redeemPonts` for **both** referee and referrer. |
| On success | Set `loyalty_points_release_type = REDEEMABLE` on the IOM. Return `loyaltyPointsReleaseStatus: "REDEEMED"` (API label; DB stores `REDEEMABLE`). |

> **Terminology:** Request input uses `REDEEMABLE`; persisted IOM state after successful redeem upload is `REDEEMABLE`; API response status field exposes `"REDEEMED"` for client readability.

### R3 — Error handling and safety

| ID | Requirement |
|----|-------------|
| R3.1 | Prevent duplicate ELIGIBLE actions when IOM is already `ELIGIBLE` or `REDEEMABLE` (redeemed). |
| R3.2 | Prevent duplicate REDEEMABLE actions when IOM is already `REDEEMABLE`. |
| R3.3 | Treat referee and referrer Pinelab calls as a **single transaction-like flow** — if either fails, the entire request fails and IOM state is unchanged. |
| R3.4 | Validation and business-rule errors must return clear, user-readable messages (not raw vendor errors). |
| R3.5 | Return project-standard not-found / unauthorized errors when `iomId` is invalid or caller lacks project access (mirror PN-65 / existing IOM patterns). |
| R3.6 | Return `403 Forbidden` when caller lacks one of the allowed upload roles (`LOYALTY`, `ADMIN`, `SUPER_ADMIN`). |

### R4 — Constraints and non-goals

| ID | Requirement |
|----|-------------|
| R4.1 | Do **not** add new DB columns for profile matching or Pinelab verification flags. |
| R4.2 | Do **not** persist Part 1 extended personal/address/booking fields. |
| R4.3 | Use existing Pine Labs executor methods for upload flows in this iteration; treat executor success as sufficient for status update until live Pinelab contracts are implemented. |
| R4.4 | Structure code for minimal-change swap-in of real Pinelab request/response handling later. |
| R4.5 | Do **not** add a `REDEEMED` DB enum value unless product explicitly requires it; persist `REDEEMABLE` for redeemed state. |

## API Contracts

### Existing endpoint — extended response

- **Method:** `GET`
- **Path:** `GET /api/iom/:id/loyalty-details` (non-prod: `/api/{NODE_ENV}/iom/:id/loyalty-details`)
- **Change:** Extend `refereeDetails` and `referrerDetails` per R1 contract above; `paymentDetails` unchanged.
- **Guards/Roles:** Unchanged from PN-65 — `RmAdminAuthGuard`, `RolesGuard`, roles: `CRM`, `CRM_TL`, `CRM_HEAD`, `FINANCE_USER`, `FINANCE_HEAD`, `LOYALTY`, `ADMIN`

### New endpoint — upload loyalty points

- **Method:** `POST`
- **Path:** `POST /api/iom/:id/loyalty-points/upload` (non-prod: `/api/{NODE_ENV}/iom/:id/loyalty-points/upload`)
- **Input:**
  - Path: `iomId` as `:id`
  - Body: `{ "loyaltyPointsReleaseType": "ELIGIBLE" | "REDEEMABLE" }`
- **Guards/Roles:** `RmAdminAuthGuard`, `RolesGuard`, roles: **`LOYALTY`, `ADMIN`, `SUPER_ADMIN` only** — explicitly include `SUPER_ADMIN` in `@Roles(...)` metadata.

**Success response (inside envelope):**

```json
{
  "iomId": "string",
  "loyaltyPointsReleaseType": "ELIGIBLE | REDEEMABLE",
  "loyaltyPointsReleaseStatus": "ELIGIBLE | REDEEMED",
  "message": "string"
}
```

`loyaltyPointsReleaseStatus` reflects the IOM state after successful interim Pinelab executor calls and DB update.

**Business error examples (non-exhaustive):**

| Condition | Expected behavior |
|-----------|-------------------|
| ELIGIBLE requested; IOM already `ELIGIBLE` | Reject — duplicate eligibility |
| ELIGIBLE requested; IOM already `REDEEMABLE` | Reject — duplicate eligibility (already redeemed) |
| REDEEMABLE requested; IOM already `REDEEMABLE` | Reject — already redeemed |
| Referee Pinelab call succeeds; referrer fails | Reject entire request; IOM state unchanged |
| Caller has CRM/Finance role but not LOYALTY/ADMIN/SUPER_ADMIN | `403 Forbidden` |
| IOM not found / unauthorized project | Project-standard error |

## Acceptance Criteria

### Part 1 — Extended loyalty details response

- **AC-1:** `GET /iom/:id/loyalty-details` includes new personal fields (`firstName`, `lastName`, `sfdcId`, `gender`, `email`) on both `refereeDetails` and `referrerDetails`.
- **AC-2:** Response includes nested `address` object with `addressLine1`, `addressLine2`, `pincode`, `location` on both participant objects.
- **AC-3:** Response includes `projectName2` and `unitNo2` on both participant objects.
- **AC-4:** All new fields are sourced from existing IOM/booking/customer data at runtime.
- **AC-5:** No new DB columns or persistence are introduced for Part 1 fields.
- **AC-6:** Existing PN-65 fields and runtime Pinelab verification flags remain present and behave unchanged.
- **AC-7:** Missing source data yields `null` for the affected field(s), not request failure.

### Part 2 — Upload loyalty points API

- **AC-8:** New upload endpoint exists and accepts `iomId` and `loyaltyPointsReleaseType` (`ELIGIBLE` \| `REDEEMABLE`).
- **AC-9:** ELIGIBLE flow calls `markEligible` for both referee and referrer before any IOM update.
- **AC-10:** REDEEMABLE flow calls `redeemPonts` for both referee and referrer before any IOM update.
- **AC-11:** On successful ELIGIBLE flow, IOM `loyalty_points_release_type` is updated to `ELIGIBLE` and response `loyaltyPointsReleaseStatus` is `"ELIGIBLE"`.
- **AC-12:** On successful REDEEMABLE flow, IOM `loyalty_points_release_type` is updated to `REDEEMABLE` and response `loyaltyPointsReleaseStatus` is `"REDEEMED"`.
- **AC-13:** Pinelab executor is invoked before IOM state mutation in all success paths.
- **AC-14:** API uses the standard `success-response-errors` envelope.
- **AC-15:** Upload success response is stable and usable by frontend without waiting for final live Pinelab contracts.

### Part 3 — Error handling, safety, and authorization

- **AC-16:** ELIGIBLE request rejected when IOM is already `ELIGIBLE` or `REDEEMABLE`, with a clear business error message.
- **AC-17:** REDEEMABLE request rejected when IOM is already `REDEEMABLE`, with a clear business error message.
- **AC-18:** If either referee or referrer Pinelab call fails, the request fails and `loyalty_points_release_type` is not updated.
- **AC-19:** Duplicate-action and validation errors return user-readable messages.
- **AC-20:** Invalid or unauthorized `iomId` returns project-standard error.
- **AC-21:** Only `LOYALTY`, `ADMIN`, and `SUPER_ADMIN` roles can invoke the upload endpoint; other roles receive `403`.
- **AC-22:** GET loyalty-details role list is unchanged (broader than upload).

### Part 4 — Design constraints

- **AC-23:** No new DB columns added for profile matching or Pinelab verification flags.
- **AC-24:** Interim Pine Labs executor methods are used for upload flows; executor success drives status update in this iteration.
- **AC-25:** Pinelab upload logic is structured for later live integration swap-in without API contract changes.

## Implementation Notes

### Part 1 — Field sourcing

- Reuse existing IOM participant resolution patterns from PN-65 (`iom-loyalty-details.service.ts`, `iom-pdf-template.mapper.ts` exports, listing/view/crm helpers).
- Map `projectName2` / `unitNo2` from the **other party's** booking reference (referee sees referrer's project/unit; referrer sees referee's project/unit).
- Address and personal fields should follow the same data sources used elsewhere for customer/booking display (IOM JSON details, customer entity, booking references).
- Extract shared mapping into `loyalty-participant.mapper.ts` to avoid duplication between GET enrichment and upload participant resolution.

### Part 2 — Upload orchestration (interim)

- Implement orchestration in the IOM module (sibling `iom-loyalty-upload.service.ts` preferred if GET service grows large).
- Suggested flow:
  1. Controller enforces `LOYALTY` / `ADMIN` / `SUPER_ADMIN` roles.
  2. Load and authorize IOM by `iomId` (project access via existing validator).
  3. Validate `loyaltyPointsReleaseType` and current `loyaltyPointClassification` (R3 rules).
  4. Require both referee and referrer present; validate Pinelab customer IDs exist.
  5. Invoke `PineLabsExecutorService.execute()` for referee, then referrer (sequential; all-or-nothing).
  6. On full executor success, persist `loyaltyPointClassification` update within a DB transaction.
  7. Return success payload with `loyaltyPointsReleaseStatus` mapped per R2 flows.
- **Interim Pinelab behavior:** Treat `{ success: true }` from the executor as Pinelab success for status update purposes. When proper Pinelab request/response contracts arrive, update private invocation methods only — do not change upload API contract or block FE.
- Use PN-51 Pine Labs module (`PineLabsExecutorService`, `PineLabsConfigService`).

### State machine summary

```
(null / pre-eligible) --[ELIGIBLE upload + Pinelab success]--> ELIGIBLE
ELIGIBLE or null --[REDEEMABLE upload + Pinelab success]--> REDEEMABLE (API status: REDEEMED)

Rejected:
  ELIGIBLE upload when state is ELIGIBLE or REDEEMABLE
  REDEEMABLE upload when state is REDEEMABLE
```

### Testing expectations

- Unit tests for state validation (duplicate ELIGIBLE, duplicate REDEEMABLE).
- Unit tests for all-or-nothing behavior when one Pinelab call fails.
- Unit tests for extended field mapping on loyalty details response (referee and referrer paths).
- Controller/service tests for upload endpoint success and business-error paths.
- Controller test verifying upload `@Roles` includes `LOYALTY`, `ADMIN`, `SUPER_ADMIN` and excludes CRM/Finance roles.
- Confirm no DB migration is required for Part 1 or Part 2 state storage.

## Assumptions

- `loyalty_points_release_type` already exists on the `ioms` table/entity (`loyaltyPointClassification`) with values `ELIGIBLE`, `REDEEMABLE`, or `null`.
- PN-65 loyalty details endpoint and PN-51 Pine Labs executor are present on `feature/PN-51`.
- Request enum value `REDEEMABLE` maps to persisted DB state `REDEEMABLE`; API response exposes `"REDEEMED"` as the client-facing redeemed label.
- Secondary booking fields (`projectName2`, `unitNo2`) correspond to the other party's project/unit association discoverable from existing IOM or booking data.
- **Upload endpoint roles are `LOYALTY`, `ADMIN`, `SUPER_ADMIN` only** (approved plan-approval change). GET loyalty-details roles remain the existing broader set.
- **Interim Pinelab success semantics apply** (final-review change): executor success is sufficient to update IOM status and unblock FE; live Pinelab payload/response handling is a follow-up within the Pinelab module, not a blocker for this story's API delivery.
- Dummy/interim phase partial Pinelab success requires no vendor-side compensation — "no IOM update + error response" is sufficient.
- No participant-level Pinelab call results in upload success response (IOM-level status only).

## Open Questions

1. **REDEEMABLE pre-condition:** Must `loyalty_points_release_type` be `ELIGIBLE` before a REDEEMABLE upload is allowed, or is REDEEMABLE permitted from `null`? Default assumption: allow from `null` or `ELIGIBLE`; only block when already `REDEEMABLE`.
2. **Exact source mapping for R1 fields:** Which IOM/booking/customer columns or JSON paths supply `sfdcId`, `gender`, `email`, address components, and `projectName2`/`unitNo2`? Implementation planner should map these explicitly (see implementation plan field-sourcing table).
3. **Live Pinelab contract timeline:** When final Pinelab request/response schemas arrive, confirm whether executor success criteria or payload shapes change — upload API contract should remain stable regardless.

## References

- **PN-65 spec:** `docs/ai/stories/PN-65/spec.md` — loyalty details GET API, participant contract baseline, mock verification behavior
- **PN-51 spec:** `docs/ai/stories/PN-51/spec.md` — Pine Labs integration, `markEligible` and `redeemPonts` API keys
- **Implementation plan:** `docs/ai/stories/PN-51_3/implementation-plan.md` — field sourcing map, DB enum clarification, role restriction details
- **Context map:** `docs/ai/context-map.json` — API conventions, build/test commands
- **Branch:** `feature/PN-51`

## Change Request Traceability

| Request | Date | Incorporated in |
|---------|------|-----------------|
| Upload restricted to LOYALTY, ADMIN, SUPER_ADMIN | 2026-06-29 (plan-approval) | R2.12, R3.6, API Contracts, AC-21, AC-22, Assumptions |
| Interim Pinelab success drives status update; do not block FE | 2026-06-29 (final-review) | Overview, R2.4, R2.11, R4.3, AC-12, AC-15, Implementation Notes (interim), Assumptions |
