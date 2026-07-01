# PN-65 Implementation Plan: Get Loyalty Details

## Summary

Deliver `GET /iom/:id/loyalty-details` returning consolidated referee/referrer participant details, **interim static-mock** Pinelab verification flags, and payment/points breakdown for a given `iomId`. Persist only `referee_pinelab_customer_id` and `referrer_pinelab_customer_id` on `ioms`; compute `isProfileDataMatching` and `shouldCreatePinelabProfile` at request time (response-only, never stored).

**Primary delta from current branch:** Most scaffolding is already in place (migration, entity, types, controller route, module wiring, service skeleton). The service currently calls live `PineLabsExecutorService` and throws *"Unable to verify Pinelab customer profile at this time."* on integration failures. Per the final-review change request, **replace live verification with static random mock outcomes** while preserving the approved architecture (no separate Pinelab service file; reuse pdf-mapper helpers).

---

## Current State vs Remaining Work

| Area | Status | Action |
|------|--------|--------|
| Migration `1782500000000-AddPinelabCustomerIdsToIoms.ts` | Done | Verify runs/reverts; no changes unless column placement fails in env |
| `Iom` entity columns | Done | None |
| `loyalty-details.interface.ts` | Done | None |
| `iom.controller.ts` route + roles | Done | None |
| `iom.module.ts` (`PineLabsModule`, service provider) | Done | Keep `PineLabsModule` import for future live swap-in |
| `iom-pdf-template.mapper.ts` exports | Done | Confirm `computeBrokerageSplit`, `resolveCustomerName`, `pickStringField` are exported (already are) |
| `iom-loyalty-details.service.ts` | **Needs change** | Swap `verifyParticipant` to static random mock; stop calling executor; remove client-facing Pinelab error |
| `iom-loyalty-details.service.spec.ts` | **Needs change** | Rewrite Pinelab-integration tests for mock branches |
| `iom.controller.spec.ts` | Done | None unless service signature changes |

---

## Scope Adjustments (Approved Change Requests)

### 1. Interim static mock verification (final-review CR — supersedes live Pinelab in this iteration)

- **Do not** call `PineLabsExecutorService.execute(CUSTOMER_FETCH, ...)` during mock phase.
- **Do not** throw or return *"Unable to verify Pinelab customer profile at this time."*
- For each participant (referee and referrer independently), randomly assign one of:

| Outcome | `isProfileDataMatching` | `shouldCreatePinelabProfile` |
|---------|-------------------------|------------------------------|
| Profile matched | `true` | `false` |
| Profile create | `false` | `true` |
| Profile not matching | `false` | `false` |

- API must always return a successful loyalty-details payload when IOM exists and caller is authorized.
- Missing referrer: skip mock verification; return null referrer block with both flags `false` (existing behavior).

### 2. No separate Pinelab verification service (plan-approval CR)

- **Do not create** `src/modules/iom/services/iom-pinelab-profile-verification.service.ts`.
- Pinelab infrastructure stays in `src/modules/pine-labs/` (`PineLabsExecutorService`, `PineLabsConfigService`).
- Implement verification as **private methods** inside `iom-loyalty-details.service.ts`.
- Structure code so live Pinelab can replace the mock body later without new files.

### 3. Reuse listing/view/pdf helpers (plan-approval CR)

- **Do not create** `iom-brokerage-split.util.ts` or `iom-participant-details.util.ts`.
- Reuse exported helpers from `iom-pdf-template.mapper.ts` and patterns from `iom-crm.service.ts` (referrer project lookup).

### 4. DB scope

- Persist only the two Pinelab customer ID columns.
- **Do not** add boolean verification columns to `ioms`.

---

## Implementation Steps

### Step 1 — Refactor verification to static mock in `iom-loyalty-details.service.ts`

1. **Add a private mock outcome selector**, e.g. `mockVerificationOutcome(): VerifyParticipantResult`:
   - Use uniform random among three outcomes (e.g. `Math.floor(Math.random() * 3)`).
   - Map each branch to the state machine above.
   - For mock phase, set `pinelabCustomerId: null` in all branches (return stored DB value via existing `resolveDisplayedPinelabCustomerId` only when `shouldCreatePinelabProfile` is false and DB has a value — current logic is fine).
   - Log at `debug` that mock verification is active.

2. **Replace `verifyParticipant` body** for interim behavior:
   - If no mobile and no stored Pinelab ID → return both flags `false` (keep early exit).
   - Otherwise → call `mockVerificationOutcome()` instead of `pineLabsExecutor.execute(...)`.
   - **Do not** call `throwPinelabIntegrationError`.

3. **Preserve live verification for future swap-in** (choose one approach):
   - **Preferred:** Move current live logic (`pineLabsExecutor.execute`, field comparison, `isCustomerNotFound`, extractors, normalizers) into a clearly named private method block (e.g. `verifyParticipantViaPinelab`) kept in the same file but **not invoked** during mock phase. Add a one-line comment: `// TODO(PN-65): swap mock for verifyParticipantViaPinelab when live integration enabled`.
   - Remove `throwPinelabIntegrationError` from the active path; it can remain unused in the deferred live method.

4. **Simplify constructor dependency** (optional but cleaner):
   - Remove `PineLabsExecutorService` from constructor if unused during mock phase, **or** keep injected but unused to avoid module churn. If removed, update `iom.module.ts` only if Nest DI complains — `PineLabsModule` import can remain for future.

5. **Skip `persistPinelabCustomerIds` writes during mock** (mock returns no new IDs):
   - Existing `persistPinelabCustomerIds` already no-ops when `pinelabCustomerId` is null — no change required.

6. **Keep aggregation logic unchanged:**
   - Participant field resolution via `resolveCustomerName`, `pickStringField`, `computeBrokerageSplit`.
   - Referrer project name via `Projects` repository (same pattern as `IomCrmService`).
   - `hasReferrer` guard for absent referrer.

### Step 2 — Update unit tests in `iom-loyalty-details.service.spec.ts`

Replace live-Pinelab-centric tests with mock-focused coverage:

| Test | Assertion |
|------|-----------|
| IOM not found | Still throws `IOM_NOT_FOUND` |
| Unauthorized project | Still throws `UNAUTHORIZED_PROJECT_ACCESS` |
| Mock profile matched | Spy/inject random → outcome 0 → `isProfileDataMatching: true`, `shouldCreatePinelabProfile: false` |
| Mock profile create | Outcome 1 → `shouldCreatePinelabProfile: true`, `isProfileDataMatching: false` |
| Mock profile not matching | Outcome 2 → both flags `false` |
| Referee/referrer independence | Mock different outcomes per call (inject deterministic random fn) |
| No Pinelab executor calls | `pineLabsExecutor.execute` never called (or remove mock entirely if dependency dropped) |
| No integration error thrown | Request succeeds even when executor would have failed (remove/replace `throws on Pinelab executor failure` test) |
| Full response shape + payment breakdown | Keep; stub random to matched outcome |
| Missing referrer | Keep; assert executor not called for referrer, referrer block empty |
| `pinelabCustomerId` display | When stored DB ID exists and mock says profile-create → `null`; otherwise return stored value |
| Unit number fallback | Keep booking fallback test |

**Testability pattern:** Extract random selection behind a private method and use `jest.spyOn(service as any, 'mockVerificationOutcome')` or pass a seed/index for deterministic branches. Avoid flaky tests that depend on uncontrolled `Math.random()`.

**Remove or rewrite these live-integration tests:**
- `returns shouldCreatePinelabProfile true when customer is not found` (Pinelab 404)
- `throws on Pinelab executor failure that is not a not-found`
- `normalizes mobile numbers with formatting differences`
- `fetches by stored Pinelab customer ID when present`
- `returns pinelabCustomerId null when stored ID is stale...`
- `persists returned Pinelab customer IDs` (mock does not persist new IDs)

### Step 3 — Confirm wiring (no changes expected)

- `iom.controller.ts`: `GET :id/loyalty-details` with roles `CRM`, `CRM_TL`, `CRM_HEAD`, `FINANCE_USER`, `FINANCE_HEAD`, `LOYALTY`, `ADMIN`; return `{ data: result }`.
- `iom.module.ts`: `IomLoyaltyDetailsService` in providers; `PineLabsModule` in imports.
- `iom.controller.spec.ts`: delegation test already present.

### Step 4 — Migration validation

- Run migration up/down in dev DB if not already applied.
- Confirm entity column names match migration (`referee_pinelab_customer_id`, `referrer_pinelab_customer_id`).

---

## Target Files

| Action | Path |
|--------|------|
| Edit | `src/modules/iom/services/iom-loyalty-details.service.ts` |
| Edit | `src/modules/iom/services/iom-loyalty-details.service.spec.ts` |
| Verify (likely no change) | `src/modules/iom/entities/iom.entity.ts` |
| Verify (likely no change) | `src/modules/iom/iom.controller.ts` |
| Verify (likely no change) | `src/modules/iom/iom.module.ts` |
| Verify (likely no change) | `src/modules/iom/types/loyalty-details.interface.ts` |
| Verify (likely no change) | `src/modules/iom/helpers/iom-pdf-template.mapper.ts` |
| Verify (likely no change) | `src/modules/iom/iom.controller.spec.ts` |
| Verify (likely no change) | `src/migrations/1782500000000-AddPinelabCustomerIdsToIoms.ts` |

**Explicitly excluded (do not create):**
- `src/modules/iom/services/iom-pinelab-profile-verification.service.ts`
- `src/modules/iom/helpers/iom-brokerage-split.util.ts`
- `src/modules/iom/helpers/iom-participant-details.util.ts`

---

## Context Budget

For the code-implementer agent:

- Inspect **target files above first**; avoid broad repo scans.
- Open non-target files only for direct imports, callers, tests, or required config (e.g. `iom-crm.service.ts` for referrer project lookup pattern, `pine-labs-executor.service.ts` only if preserving deferred live method signatures).
- Use provider-native edit tools directly; do not print full file contents, full diffs, or large code blocks in chat.
- Run only validation commands for the changed surface (unit tests for loyalty service + controller spec; lint if tests pass).

---

## Validation Commands

```bash
# Unit tests — primary gate
npm run test -- src/modules/iom/services/iom-loyalty-details.service.spec.ts
npm run test -- src/modules/iom/iom.controller.spec.ts

# Optional broader IOM surface
npm run test -- src/modules/iom/

# Lint changed files
npm run lint

# Migration (dev/staging only, if not yet applied)
npm run migration:run
# npm run migration:revert  # verify reversibility once
```

**Manual smoke (optional):**
```bash
GET /api/{NODE_ENV}/iom/{iomId}/loyalty-details
```
- Authorized valid `iomId` → 200 with `refereeDetails`, `referrerDetails`, `paymentDetails`.
- Repeated calls may return different random verification flags per participant.
- No `PINELAB_INTEGRATION_ERROR` or *"Unable to verify..."* message.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Flaky tests from `Math.random()` | Inject/spy deterministic outcome selector in tests |
| UI depends on stable verification during demo | Document interim random behavior; product aware this is temporary |
| Dead live-verification code rots | Keep deferred method in same file with clear TODO; spec documents swap-in steps |
| Removing `PineLabsExecutorService` DI causes module churn | Either keep injected-but-unused or remove cleanly from constructor + test mocks |
| Random mock on missing mobile+ID edge case | Keep early exit: no identifier → both flags `false`, no random call |

---

## Assumptions

- PN-51 `PineLabsModule` remains available on branch; mock phase does not require live Pinelab connectivity.
- `iomId` = `ioms.id`, same as `GET /iom/:id`.
- `pinelabCustomerId` in response: return stored DB column when present and mock outcome is not profile-create; otherwise `null`.
- Referee and referrer each get **independent** random outcomes per request (spec default R2.7).
- Boolean flags are never persisted; only Pinelab customer IDs are DB columns.
- Participant/brokerage mapping continues via `iom-pdf-template.mapper.ts` exports — no new util modules.
- Approved scope preserved: no `iom-pinelab-profile-verification.service.ts`; Pine Labs config/execution stays under `src/modules/pine-labs/`.
- Live Pinelab verification (field compare, ID persistence from API, integration error handling) is deferred to a follow-up phase when mock is removed.
