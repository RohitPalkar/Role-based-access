# PE-587 Test Plan: Reception Desk (GRE)

## Purpose

Define unit-test strategy for **Reception Desk** APIs before implementation lands. Tests must validate GRE visibility rules, listing contracts, OTP-gated check-in, and attendance integrity without coupling to guessed QueryBuilder SQL or unfinished DTO shapes.

**Constraints (this story):**

- Do not edit production code in the test-writer stage.
- Do not add dependencies or new test frameworks.
- Reuse **Jest** + `@nestjs/testing` (`npm run test`).
- Prefer **controller specs with mocked `SlotService`** (repository convention); add **narrow `SlotService` unit tests** only for non-trivial private orchestration if controller coverage is insufficient.
- Use **`it.todo` / `TODO:`** for assertions that depend on final method names, DTO fields, or Redis key names.

---

## Detected conventions

| Item | Value |
|------|--------|
| Framework | Jest (`jest.config.js`, `rootDir: src`, `*.spec.ts`) |
| Command | `npm run test` |
| Focused run | `npm run test -- --testPathPattern=batch_manager/slot` |
| Coverage | `npm run test:cov` (optional) |
| Pattern | `Test.createTestingModule` → mock service → assert delegation + response shape |
| Examples | `eoi_campaign.controller.spec.ts`, `channel_partner.controller.spec.ts`, `site_visit_logIn.controller.spec.ts` (OTP/GRE-adjacent) |
| Batch manager today | **No** existing `batch_manager/**/*.spec.ts` |
| Service specs | **None** under `src/**/*.service.spec.ts` — controller-first |

**Auth pattern (from implementation plan):** `RmAdminAuthGuard` + `RolesGuard` + `@Roles(RolesEnum.GRE)` on new routes under `@Controller('batch-slots')` with prefix `reception-desk/...`.

**Enums for assertions:** `SlotStatusEnum.OPEN`, `SlotStatusEnum.ACTIVE`; exclude `LOCKED`, `COMPLETED`, `ELAPSED`; `BatchVoucherStatus.INVITED` / `ATTENDED`.

---

## Test scope matrix

| Layer | In scope | Out of scope (this story) |
|-------|----------|---------------------------|
| Unit (controller) | Route wiring, GRE guard presence (metadata smoke if tested), DTO pass-through, service delegation, envelope shape, error propagation | Real DB, migrations |
| Unit (service) | Visibility helpers, duplicate/concurrent check-in branches, OTP verify gate before check-in, dashboard field mapping | Full SMS HTTP, Redis cluster |
| Integration / E2E | — | New e2e suite unless explicitly requested later |
| Performance | — | Load tests |

---

## Recommended test files (post-implementation)

| File | Role |
|------|------|
| `src/modules/eoi_manager/batch_manager/slot.controller.spec.ts` | **Primary.** New `describe('Reception Desk (GRE)')` block for all 10 endpoints; mock `SlotService` + `AllocationService` (existing controller constructor). |
| `src/modules/eoi_manager/batch_manager/slot.service.spec.ts` | **Optional, focused.** Only for `assertGreEligibleSlot`, `markAttendance` transaction/lock paths, OTP verify flag — if not reasonably exercised via controller mocks. |

Do **not** create separate module or e2e files unless product asks.

---

## Shared test fixtures (mocks)

Define once per spec file; adjust field names when `reception-desk.dto.ts` exists.

```typescript
// TODO: align with final ReceptionDesk* DTO exports
const mockGreUser = { dbId: 'gre-user-uuid', id: 'gre-1', email: 'gre@example.com' };

const mockSlotService = {
  // existing slot methods if needed for compile
  listSlots: jest.fn(),
  getSlotStatistics: jest.fn(),
  // Reception Desk — TODO: rename to final SlotService method names
  listGreBatches: jest.fn(),
  listGreSlots: jest.fn(),
  listViewRecords: jest.fn(),
  getReceptionDashboard: jest.fn(),
  universalSearch: jest.fn(),
  sendReceptionOtp: jest.fn(),
  verifyReceptionOtp: jest.fn(),
  resendReceptionOtp: jest.fn(),
  markAttendance: jest.fn(),
  getAttendanceDetail: jest.fn(),
};

const mockListingEnvelope = {
  statusCode: 200, // TODO: use SUCCESS constant from src/config/constants
  message: 'TODO',
  data: { result: [], total: 0, page: 1, limit: 10 },
};
```

**Module setup (controller):**

```typescript
// TODO: import SlotController after reception routes exist
providers: [
  { provide: SlotService, useValue: mockSlotService },
  { provide: AllocationService, useValue: { /* minimal mocks */ } },
],
```

Guards are typically **not** unit-tested here (no override in peer specs); document **manual/integration** GRE JWT checks in test plan checklist.

---

## Acceptance criteria → test cases

### 1. Visibility & access

| ID | Case | Type | Notes |
|----|------|------|-------|
| V-01 | Listing/search service called with query that implies OPEN/ACTIVE-only scope | Service or controller | Assert service method invoked; **TODO:** spy `buildGreVisibilityJoin` or equivalent once implemented |
| V-02 | `listGreSlots` ignores client attempt to request `LOCKED` / `COMPLETED` status | Service | **TODO:** pass `status: LOCKED` in DTO; expect filter still OPEN/ACTIVE |
| V-03 | `markAttendance` / `getAttendanceDetail` for ineligible slot → 4xx | Controller | Mock service `BadRequestException` / `NotFoundException`; expect rethrow |
| V-04 | Archived/deleted batch excluded from `listGreBatches` | Service | **TODO:** fixture with archived batch returns empty or 404 policy |
| V-05 | Soft-deleted slot (`deletedAt`) never listed | Service | **TODO:** join filter assertion |

### 2. Campaign batch listing — `GET reception-desk/batches`

| ID | Case | Assert |
|----|------|--------|
| B-01 | Happy path returns paginated envelope | `statusCode`, `data.result`, `data.total` |
| B-02 | Forwards `page`, `limit`, `search`, `sortBy`, `campaignId`, `stage` to service | `toHaveBeenCalledWith` |
| B-03 | Empty result set | `result: []`, `total: 0` |
| B-04 | Service error propagates | `rejects.toThrow` |
| B-05 | **TODO:** response rows only include batches with ≥1 OPEN/ACTIVE slot | field presence after implementation |

### 3. Active/Open slot listing — `GET reception-desk/slots`

| ID | Case | Assert |
|----|------|--------|
| S-01 | Delegates to `listGreSlots` with query DTO | called with user + dto |
| S-02 | Pagination params forwarded | page/limit |
| S-03 | **TODO:** every row `status` ∈ {Open, Active} | implementation-specific |
| S-04 | Recommended `batchId` missing — **TODO:** document expected 400 vs empty per implementer | |

### 4. View records — `GET reception-desk/records`

| ID | Case | Assert |
|----|------|--------|
| R-01 | Requires `batchId` and/or `slotId` — **TODO:** validation test once DTO enforced | `BadRequestException` |
| R-02 | Paginated listing envelope | same as B-01 |
| R-03 | Row shape includes spec fields (names per implementation plan) | Payment ref, voucher id, std/pre EOI, customer, phone, batch/slot meta, attendance status, headcount, RM fields, timestamp |
| R-04 | **TODO:** `voucher.isDeleted === false` rows only | mock data mix |
| R-05 | No N+1 — **not unit-testable**; note for code review / optional integration smoke | |

**Field mapping reference (assert keys once stable):**

| Spec label | Expected source key (plan) |
|------------|--------------------------|
| Payment Reference ID | `uniqueReferenceId` |
| Voucher ID | `voucherId` |
| Standard / Preferential EOI | `stdEoiId`, `preEoiId` |
| Customer / Mobile | `customerName`, `phone` |
| Batch/Slot | `batch.name`, `slot.date`, `slot.startTime` |
| Attendance | `status`, `head_count`, `checked_in_at` |
| RMs | closing / sourcing name fields **TODO** |

### 5. Universal search — `GET reception-desk/search`

| ID | Case | Assert |
|----|------|--------|
| U-01 | `search` query forwarded | |
| U-02 | **TODO:** OR search dimensions (payment ref, voucher id, EOI ids, name, mobile, batch number) | one test per dimension with single hit |
| U-03 | Results respect OPEN/ACTIVE scope | same as V-01 |
| U-04 | Pagination | page/limit |

### 6. Dashboard — `GET reception-desk/dashboard/:batchId`

| ID | Case | Assert |
|----|------|--------|
| D-01 | Returns single object (no `result[]` pagination) | |
| D-02 | Keys: invited vs attended, prorated invites, total headcount, live counters | **TODO:** exact property names (`expectedWalkin` vs `invited`, etc.) |
| D-03 | Aligns with `getSlotStatistics` baseline + headcount sum | compare mock return structure to plan |
| D-04 | Invalid `batchId` → 404 | |

### 7. OTP — `POST reception-desk/otp/send|verify|resend`

| ID | Case | Assert |
|----|------|--------|
| O-01 | Send: body `batchVoucherId` forwarded | |
| O-02 | Send: missing mobile → 400 | mock service |
| O-03 | Verify: invalid OTP → 400 | mirror `site_visit_logIn` controller OTP tests |
| O-04 | Verify: max attempts → 400 | **TODO:** constant from `OTP_MAX_ATTEMPTS` |
| O-05 | Resend: cooldown → 400 | **TODO:** `OTP_RESEND_TTL_MS` behavior |
| O-06 | Verify success sets Redis verified flag (service) | **TODO:** mock `CACHE_MANAGER` |
| O-07 | OTP not logged | code review; no assert on logger payload |

### 8. Attendance check-in — `POST reception-desk/attendance/check-in`

| ID | Case | Assert |
|----|------|--------|
| A-01 | Body: `batchVoucherId`, `headcount` forwarded with `mockGreUser` | |
| A-02 | Check-in without prior verify → 400 | |
| A-03 | Already `ATTENDED` → 400 | |
| A-04 | Success: persists headcount, timestamp, `checked_in_by` | **TODO:** mock transaction return |
| A-05 | Concurrent duplicate: second call → 400/409 | **TODO:** simulate lock race via service mock |
| A-06 | Clears OTP Redis keys on success | service mock `cache.del` |
| A-07 | `headcount` < 1 → 400 | validation |
| A-08 | User activity interceptor on route | optional metadata check / manual |

### 9. Attendance detail — `GET reception-desk/attendance/:batchVoucherId`

| ID | Case | Assert |
|----|------|--------|
| AD-01 | Returns status, headcount, timestamp, checked-in-by | |
| AD-02 | Non-eligible slot → 4xx | |
| AD-03 | Unknown id → 404 | |

### 10. Non-listing APIs must not paginate like listings

| ID | Case | Assert |
|----|------|--------|
| NL-01 | Dashboard / OTP / check-in / detail responses lack listing `page`/`total` semantics | shape tests |
| NL-02 | Listing endpoints accept `CommonFindAllQueryDto` extensions | **TODO:** reception DTO extends base |

---

## Controller spec skeleton (starter template)

Implementer can paste into `slot.controller.spec.ts` after routes exist:

```typescript
describe('Reception Desk (GRE)', () => {
  const mockGreUser = { dbId: 'gre-uuid', id: 'gre-1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET reception-desk/batches', () => {
    it.todo('returns paginated batches for GRE');
    it.todo('forwards ListGreBatchesDto query params to listGreBatches');
    it.todo('propagates service errors');
  });

  describe('GET reception-desk/slots', () => {
    it.todo('returns only OPEN/ACTIVE slots');
  });

  describe('GET reception-desk/records', () => {
    it.todo('requires batchId or slotId');
    it.todo('returns required voucher/customer columns');
  });

  describe('GET reception-desk/search', () => {
    it.todo('forwards universal search query');
  });

  describe('GET reception-desk/dashboard/:batchId', () => {
    it.todo('returns dashboard metrics without pagination');
  });

  describe('POST reception-desk/otp/send', () => {
    it.todo('delegates batchVoucherId to send OTP service');
  });

  describe('POST reception-desk/otp/verify', () => {
    it.todo('rejects invalid OTP');
  });

  describe('POST reception-desk/otp/resend', () => {
    it.todo('enforces resend cooldown');
  });

  describe('POST reception-desk/attendance/check-in', () => {
    it.todo('requires verified OTP before success');
    it.todo('rejects duplicate attendance');
  });

  describe('GET reception-desk/attendance/:batchVoucherId', () => {
    it.todo('returns attendance detail');
  });
});
```

**Why no starter file committed now:** routes and service methods do not exist yet; an empty spec would fail compilation or require skipping entire file. Add the spec in the **same PR as implementation**.

---

## Optional service-level tests (`slot.service.spec.ts`)

Use only if controller mocks hide critical branches:

| Method (planned) | Cases |
|------------------|--------|
| `assertGreEligibleSlot` / `assertGreEligibleBatchVoucher` | OPEN/ACTIVE pass; LOCKED/COMPLETED/ELAPSED/deleted fail |
| `markAttendance` | Transaction invoked; `pessimistic_write` mode **TODO**; status flip INVITED→ATTENDED; duplicate guard |
| `sendReceptionOtp` / `verifyReceptionOtp` | Redis set/get; hashed OTP; attempt limits |
| `getReceptionDashboard` | Sums match mocked repos |
| `listViewRecords` / `universalSearch` | QueryBuilder called once (mock `createQueryBuilder` chain) |

**Dependencies to mock:** `DataSource`, `Repository<EoiBatchVoucher>`, `Repository<EoiBatchSlot>`, `CACHE_MANAGER`, `ConfigService`, `HttpService` (SMS).

---

## Manual / smoke checklist (QA)

After `npm run migration:run` and implementation:

1. GRE JWT → `GET api/{env}/batch-slots/reception-desk/batches` — no locked-only batches.
2. `GET .../records?batchId=` — columns match UI; pagination works.
3. OTP send/verify/resend on test mobile; check-in without verify → 400; double check-in → 400.
4. `GET .../attendance/:batchVoucherId` shows ATTENDED state and timestamp.
5. Universal search hits each dimension from spec.
6. Dashboard counters move after check-in.

---

## Execution order for implementer

1. Implement production routes + service methods.
2. Add `slot.controller.spec.ts` (or extend if created) with `Reception Desk` describe block.
3. Replace `it.todo` with real tests; fill **TODO** assertions for DTO keys and Redis prefixes.
4. Add optional `slot.service.spec.ts` for attendance/OTP/visibility if controller coverage is thin.
5. Run: `npm run test -- --testPathPattern=batch_manager/slot`
6. Run: `npm run lint`

---

## Risks & gaps

| Risk | Test mitigation |
|------|-----------------|
| Method names differ from plan | Centralize mocks; update test-plan mapping table |
| Prorated invites formula ambiguous | Dashboard tests assert stable contract once PM confirms |
| SMS/Redis not unit-tested | Manual smoke + code review; mock cache/http in service tests only |
| Guards not executed in unit tests | Document GRE JWT manual check |
| No batch_manager specs today | First spec file sets precedent — keep controller-thin |

---

## References

| Doc | Path |
|-----|------|
| Story spec | `docs/ai/stories/PE-587/spec.md` |
| Implementation plan | `docs/ai/stories/PE-587/implementation-plan.md` |
| Context map | `docs/ai/context-map.json` |
| OTP reference tests | `src/modules/site_visit_logIn/site_visit_logIn.controller.spec.ts` |
| Statistics baseline | `SlotService.getSlotStatistics` in `slot.service.ts` |
| Enums | `src/enums/batch-manager.enums.ts` |

---

## Summary

- **Primary strategy:** new `slot.controller.spec.ts` with mocked `SlotService`, following EOI manager controller spec style.
- **Cover:** all 10 reception-desk endpoints, GRE delegation, pagination on listings only, OTP/attendance error paths, response field contracts.
- **Defer:** SQL shape, N+1, real Redis/SMS, guard integration — use `it.todo` until implementation stabilizes.
- **Do not commit** failing starter specs before routes exist; use the skeleton above when implementing.
