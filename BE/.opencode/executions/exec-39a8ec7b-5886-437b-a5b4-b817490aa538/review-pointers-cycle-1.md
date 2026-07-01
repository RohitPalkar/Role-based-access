# PN-65 Code Review — Cycle 1

## Summary

The implementation delivers the approved PN-65 scope: `GET /iom/:id/loyalty-details`, runtime Pinelab verification inside [`iom-loyalty-details.service.ts`](src/modules/iom/services/iom-loyalty-details.service.ts), DB persistence of only the two Pinelab customer ID columns, reuse of pdf-mapper helpers, and solid unit test coverage. Approved change requests were followed (no separate verification service, no new util modules, boolean flags response-only).

Two must-fix issues remain before merge: a **Pinelab executor preflight regression** from removing `CUSTOMER_FETCH` required-field validation, and a **contradictory API response** when a stored Pinelab ID is not found.

## Scope Compliance

| Area | Status |
|------|--------|
| Migration + entity (2 ID columns only) | OK — matches approved plan; original spec AC-1 boolean columns correctly omitted |
| No separate Pinelab verification service | OK |
| Reuse pdf-mapper helpers (export only) | OK |
| Module wiring (`PineLabsModule`, `Projects`, service provider) | OK |
| Route placement (`GET :id/loyalty-details` after `:id/pdf`) | OK |
| Roles/guards mirror `GET :id` | OK |
| Side-effect write on GET (persist discovered IDs) | OK per plan |
| Extra file [`pine-labs.helper.ts`](src/helpers/pine-labs.helper.ts) | Justified — supports optional-field payload mapping for mobile lookup |

## Findings

### R1 — Must-fix: `CUSTOMER_FETCH` empty-payload validation removed; existing executor test will fail

**Files:** [`pine-labs-api.definitions.ts`](src/modules/pine-labs/config/pine-labs-api.definitions.ts), [`pine-labs.helper.ts`](src/helpers/pine-labs.helper.ts), [`pine-labs-executor.service.spec.ts`](src/modules/pine-labs/pine-labs-executor.service.spec.ts)

Removing `requiredFields: ['customerId']` from `CUSTOMER_FETCH` (needed for mobile-only lookup) is correct, but no replacement validation was added. `mapPayload` → `assertRequiredFields` now accepts `{}`, so `execute(CUSTOMER_FETCH, {})` proceeds to HTTP instead of returning a preflight error.

The existing test explicitly expects the old behavior:

```240:246:src/modules/pine-labs/pine-labs-executor.service.spec.ts
  it('returns normalized error when required fields are missing', async () => {
    const result = await service.execute(PineLabsApiName.CUSTOMER_FETCH, {});

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Missing required field');
    expect(httpService.post).not.toHaveBeenCalled();
  });
```

**Fix:** Add validation that at least one of `customerId` or `mobileNumber` is present for `CUSTOMER_FETCH` (e.g. extend `assertRequiredFields` with a one-of check, or a definition-level `requiredOneOf`). Update the executor spec: keep the empty-payload rejection test (adjusted message), and add a passing test for `{ mobileNumber: '...' }` payload mapping to `{ mobile: '...' }`.

---

### R2 — Must-fix: Stale `pinelabCustomerId` returned alongside `shouldCreatePinelabProfile: true`

**File:** [`iom-loyalty-details.service.ts`](src/modules/iom/services/iom-loyalty-details.service.ts) (response mapping ~lines 124–126, 141–143)

When Pinelab returns not-found, `verifyParticipant` correctly sets `shouldCreatePinelabProfile: true` and `pinelabCustomerId: null`. However the response builder falls back to the stored DB ID:

```typescript
pinelabCustomerId:
  refereeVerification.pinelabCustomerId ??
  iom.refereePinelabCustomerId,
```

If a stored ID is stale/wrong, the API returns **both** a non-null `pinelabCustomerId` and `shouldCreatePinelabProfile: true`, violating R4.2 semantics (absence flag vs. displayed ID).

**Fix:** When `shouldCreatePinelabProfile` is `true`, return `pinelabCustomerId: null` in the participant block (do not fall back to stored ID). Optionally consider clearing the stale stored ID on not-found during `persistPinelabCustomerIds` — at minimum fix the response.

**Test gap:** Add a spec case: stored ID present + Pinelab 404 → `shouldCreatePinelabProfile: true` and `pinelabCustomerId: null`.

---

### R3 — Should-fix: Referee `unitNumber` missing `booking.propertyNumber` fallback

**File:** [`iom-loyalty-details.service.ts`](src/modules/iom/services/iom-loyalty-details.service.ts) (~lines 121–123)

Plan and listing flow ([`iom-listing.service.ts`](src/modules/iom/services/iom-listing.service.ts) line 402) use `booking.propertyNumber` as unit fallback. Implementation only uses `iom.unitNumber ?? pickStringField(customerDetails, 'unitNo', 'unit_no')`.

**Fix:** Add `iom.booking?.propertyNumber` to the fallback chain to match listing/view behavior.

---

### R4 — Nit: No executor spec for mobile-only `CUSTOMER_FETCH`

**File:** [`pine-labs-executor.service.spec.ts`](src/modules/pine-labs/pine-labs-executor.service.spec.ts)

After adding `mobileNumber: 'mobile'` mapping, add a test verifying `{ mobileNumber: '9876543210' }` maps to `{ mobile: '9876543210' }` and succeeds. Low priority once R1 is fixed.

---

## What Looks Good

- Verification state machine matches R4 (not-found / match / mismatch / throw on API failure)
- Referee and referrer verified in parallel with independent outcomes (tested)
- Boolean flags are response-only; only IDs persisted (tested)
- Controller delegation test and 12 service unit tests cover main branches
- Migration follows existing `ALTER TABLE ioms ... AFTER` pattern
- `resolveReferrerProjectName` correctly mirrors [`iom-crm.service.ts`](src/modules/iom/services/iom-crm.service.ts)

## Recommended Validation Before Merge

```bash
npm run test -- src/modules/pine-labs/pine-labs-executor.service.spec.ts
npm run test -- src/modules/iom/services/iom-loyalty-details.service.spec.ts
npm run test -- src/modules/iom/iom.controller.spec.ts
npm run test -- src/modules/iom/helpers/iom-pdf-template.mapper.spec.ts
```

Expect executor spec failure until R1 is resolved.

## Verdict

**Request changes** — fix R1 and R2 before merge; R3 recommended for listing parity.
