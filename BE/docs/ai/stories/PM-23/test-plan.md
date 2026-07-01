# Test Plan: PM-23 — IOM Listing for CRM

## Summary

Unit-test coverage for extending **`GET /iom/listing`** with a `listType` discriminator so CRM users can list **persisted IOM records** (`listType=ioms`) while preserving the existing **eligible-bookings** default (`listType` omitted or `eligible`).

**Approved scope change (do not regress):** Do **not** add `GET /iom/ioms`. All listing tests target `GET /iom/listing` with optional `listType`.

| Layer | File | Status |
|-------|------|--------|
| DTO | `src/modules/iom/dto/list-iom-listing.dto.spec.ts` | Create with implementation |
| Service | `src/modules/iom/services/iom-listing.service.spec.ts` | Create with implementation |
| Controller | `src/modules/iom/iom.controller.spec.ts` | Create with implementation |

**Framework:** Jest (`npm test`), co-located `*.spec.ts` under `src/modules/iom/`.

**Constraints for this story:**
- Do not edit production code in the test-writer stage.
- Do not add dependencies or bootstrap a new test framework.
- Reuse existing IOM module fixtures and mocking patterns.
- Use `TODO` placeholders in starter specs only where implementation details are not yet fixed.

---

## Test Conventions (from repository)

Mirror patterns already used in the IOM module and sibling controllers:

| Pattern | Reference |
|---------|-----------|
| CRM user fixture (`crmProjects`, `dbId`, `role`) | `src/modules/iom/services/iom-crm.service.spec.ts` |
| Query-builder chain mocking (`createQueryBuilder`, `getManyAndCount`) | `src/modules/iom/services/iom-crm.service.spec.ts` |
| Direct service instantiation (no Nest `TestingModule`) for pure logic | `src/modules/iom/services/iom-validation.service.spec.ts` |
| DTO validation via `plainToInstance` + `validate` | `src/modules/sfdc/dto/lead-change-webhook.dto.spec.ts` |
| Controller delegation with mocked services | `src/modules/inventory-unit/inventory-unit.controller.spec.ts` |

**Service spec style:** Prefer lightweight stubs over full `TestingModule` when only repository/query-builder behavior is under test (same as `iom-crm.service.spec.ts`).

**Controller spec style:** Use `Test.createTestingModule` with `useValue` mocks for `IomListingService`, `IomEligibilityService`, and `IomCrmService` (other handlers still on controller).

**Guards:** Do not integration-test `RmAdminAuthGuard` / `RolesGuard` in unit specs; assert handler delegation only. Guard behavior is inherited from existing CRM IOM routes and covered by convention.

---

## Shared Test Fixtures

Reuse or adapt from `iom-crm.service.spec.ts`:

```ts
const CRM_USER = {
  dbId: 7,
  email: 'crm@example.test',
  role: RolesEnum.CRM,
  crmProjects: [10, 11, 12],
};

const EMPTY_PROJECTS_USER = {
  dbId: 7,
  role: RolesEnum.CRM,
  crmProjects: [],
};
```

**Paginated empty envelope** (both modes when short-circuiting):

```ts
{ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }
```

Adjust `page` / `limit` when testing non-default pagination inputs.

**Sample `IomListItem` stub** (shape for controller/service mapping assertions):

```ts
{
  id: 1,
  bookingId: 100,
  projectId: 10,
  projectName: 'Project Alpha',
  unitNo: 'A-1201',
  customerName: 'Jane Doe',
  saleValue: 10_000_000,
  brokeragePercentage: 2.5,
  totalBrokerageAmount: 250_000,
  referrerPoints: 150_000,
  refereePoints: 100_000,
  referralPointsEdited: false,
  referralClassification: 'CLASS_A',
  statusCode: IomStatusCodeEnum.IOM_CREATED,
  statusLabel: 'IOM Created',
  submittedAt: null,
  createdAt: new Date('2026-01-15T10:00:00Z'),
  iomPdfAvailable: false,
}
```

---

## 1. DTO Tests — `list-iom-listing.dto.spec.ts`

**Target:** `ListIomListingDto` extending `CommonFindAllQueryDto` with `listType`.

**Approach:** `plainToInstance(ListIomListingDto, payload)` + `validate(instance)` (see `lead-change-webhook.dto.spec.ts`).

### Cases

| # | Case | Expected |
|---|------|----------|
| D1 | Empty / minimal query | No validation errors; `listType` defaults to `'eligible'` (if default applied at DTO level) |
| D2 | `listType: 'eligible'` | Passes validation |
| D3 | `listType: 'ioms'` | Passes validation |
| D4 | `listType: 'invalid'` | Validation error on `listType` |
| D5 | `page: 1`, `limit: 20` | Passes |
| D6 | `page: 0` | Fails (`Min(1)`) |
| D7 | `limit: 101` | Fails (`Max(100)`) |
| D8 | `limit: 0` | Fails (`Min(1)`) |
| D9 | Optional `search`, `sortBy`, `status`, `startDate`, `endDate` | Pass individually and in combination when `listType=ioms` |
| D10 | `startDate` / `endDate` string inputs | Transform to `Date` / end-of-day per `CommonFindAllQueryDto` |
| D11 | Non-integer `page` / `limit` strings | `Type(() => Number)` coercion behavior — document actual pass/fail |

### Out of scope for DTO spec

- `forbidNonWhitelisted` rejection of unknown query keys is enforced by the controller-scoped `ValidationPipe`, not class-validator alone. Cover unknown-key rejection in **controller integration-style test** (C5 below) or document as manual/E2E if pipe testing is too heavy for unit scope.

---

## 2. Service Tests — `iom-listing.service.spec.ts`

**Target:** `IomListingService.findIoms(user, query)`.

**Setup:** Mock `@InjectRepository(Iom)` with `createQueryBuilder` returning a fluent chain:

```ts
const makeListingQB = (items: unknown[], total: number) => ({
  innerJoin: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([items, total]),
});
```

Capture `andWhere` / `orderBy` calls when asserting filter and sort application.

### Cases

| # | Case | Expected |
|---|------|----------|
| S1 | `crmProjects` empty | Returns empty envelope; **repository `createQueryBuilder` never called** |
| S2 | `crmProjects` populated | Query builder invoked; `project_id IN (:...crmProjects)` (or equivalent) applied |
| S3 | Soft-delete exclusion | `deleted_at IS NULL` condition present |
| S4 | Pagination | `skip` / `take` match `page` / `limit`; `totalPages = Math.ceil(total / limit)` |
| S5 | Default sort (no `sortBy`) | `orderBy` on `created_at DESC` (or alias `i.created_at`) |
| S6 | Valid `sortBy` whitelisted fields | `createdAt:DESC`, `submittedAt:ASC`, `salePrice:DESC`, `status:ASC` each apply mapped column |
| S7 | Unknown `sortBy` field | Ignored (no `orderBy` from whitelist); default sort still applied — match `IomEligibilityService` behavior |
| S8 | `search` provided | `LIKE` clause on customer name, booking id, property number, project name |
| S9 | Valid `status` (e.g. `IOM_CREATED`) | Filter on status code |
| S10 | Invalid `status` (e.g. `NOT_A_REAL_STATUS`) | `BadRequestException` with clear message |
| S11 | `startDate` / `endDate` | Filter on `i.created_at` with inclusive end-of-day |
| S12 | Response mapping | Raw join result maps to camelCase `IomListItem` with all baseline fields |
| S13 | `iomPdfAvailable` | `true` when `iom_pdf` not null; `false` otherwise |
| S14 | `customerName` fallback | When booking name null, fallback from `customer_details` — **TODO:** assert once implementation defines extraction |

### Not tested at service layer

- Guard / role enforcement (controller concern).
- Eligible-bookings query logic (`IomEligibilityService` — unchanged; regression via controller C2).

---

## 3. Controller Tests — `iom.controller.spec.ts`

**Target:** `GET listing` handler branching on `listType`.

**Setup:**

```ts
providers: [
  { provide: IomCrmService, useValue: { /* existing methods stubbed */ } },
  { provide: IomEligibilityService, useValue: { findEligible: jest.fn() } },
  { provide: IomListingService, useValue: { findIoms: jest.fn() } },
]
```

### Cases

| # | Case | Expected |
|---|------|----------|
| C1 | `listType` omitted | `eligibilityService.findEligible` called with `(user, query)`; `iomListingService.findIoms` **not** called |
| C2 | `listType: 'eligible'` | Same as C1 |
| C3 | `listType: 'ioms'` | `iomListingService.findIoms` called; `findEligible` **not** called |
| C4 | Happy path `listType=ioms` | Controller returns service result unchanged (flat pagination envelope) |
| C5 | Unknown query property | **TODO:** If testing ValidationPipe, expect 400 via e2e or supertest; optional in unit spec |
| C6 | Service error propagation | Rejected promise from `findIoms` / `findEligible` bubbles to caller |
| C7 | Controller defined | Smoke `should be defined` |

### Regression guard

Add explicit test that renaming the handler method does not change route path (`@Get('listing')` remains).

---

## 4. Regression — Eligible Bookings (unchanged path)

No new spec file required; cover in **controller spec (C1, C2)** and optionally add one focused test in `iom-eligibility.service.spec.ts` **only if** `IomEligibilityService` signature changes to accept `ListIomListingDto`.

If eligibility service spec does not exist today, **do not create** a full eligibility spec for this story. Controller delegation tests are sufficient to prove the default path still calls `findEligible` with the unified DTO.

---

## 5. Acceptance Criteria → Test Mapping

| AC | Description | Test ID(s) |
|----|-------------|------------|
| 1 | `GET /api/iom/listing?listType=ioms` returns paginated IOM records | C3, C4, S4, S12 |
| 2 | Default listing returns eligible bookings | C1, C2 |
| 3 | CRM-only access | Out of unit scope (guards); manual smoke |
| 4 | Scoped to `crmProjects` | S2 |
| 5 | Soft-deleted excluded | S3 |
| 6 | Empty `crmProjects` → empty result | S1 |
| 7 | Pagination accurate | S4, D5–D8 |
| 8 | `search` filters | S8 |
| 9 | `status` filters | S9, S10 |
| 10 | Date range on `created_at` | S11, D10 |
| 11 | `sortBy` whitelist | S5–S7 |
| 12 | Baseline item fields | S12, S13 |
| 13 | Read-only (no writes) | S1–S14 (no mutation mocks invoked) |
| 14 | Existing endpoints unchanged | C1, C2; no edits to generate/edit/submit/PDF specs |
| 15 | `npm run test`, `lint`, `build` pass | CI commands below |

---

## 6. Implementation Order (for code-implementer)

Recommended TDD-friendly sequence:

1. **DTO** — implement `ListIomListingDto`, then `list-iom-listing.dto.spec.ts` (D1–D11).
2. **Service** — implement `IomListingService.findIoms`, then `iom-listing.service.spec.ts` (S1–S14).
3. **Controller** — wire branch + module, then `iom.controller.spec.ts` (C1–C7).
4. Run module-scoped test sweep and fix any import breakage from `ListEligibleBookingsDto` → `ListIomListingDto`.

---

## 7. Validation Commands

```bash
# Full IOM module unit tests
npm run test -- --testPathPattern=src/modules/iom

# Targeted during development
npm run test -- src/modules/iom/dto/list-iom-listing.dto.spec.ts
npm run test -- src/modules/iom/services/iom-listing.service.spec.ts
npm run test -- src/modules/iom/iom.controller.spec.ts

# Required before merge
npm run lint
npm run build
```

### Manual smoke (optional, dev env)

```bash
# Eligible bookings — unchanged
GET /api/{NODE_ENV}/iom/listing?page=1&limit=20

# IOM records
GET /api/{NODE_ENV}/iom/listing?listType=ioms&page=1&limit=20&sortBy=createdAt:DESC
GET /api/{NODE_ENV}/iom/listing?listType=ioms&status=IOM_CREATED&search=john
```

---

## 8. Out of Scope

- E2E / supertest HTTP tests (no new e2e file for this story unless team convention requires it).
- `src/modules/iom_management/` (legacy dummy list).
- Guard integration tests with real JWT.
- Performance / load testing on `ioms` table.
- Invoice / collection column enrichment (v1 optional per spec).
- New `GET /iom/ioms` route — **must not appear in tests**.

---

## 9. Open Questions Affecting Tests

| Question | Test impact |
|----------|-------------|
| Invalid `status` → `400` vs empty list | Plan assumes **400** (`S10`); update S10 if product chooses empty list |
| Date filter field (`created_at` vs `submitted_at`) | Plan assumes `created_at` (`S11`) |
| `customerName` fallback from `customer_details` | `S14` — finalize assertion after mapping logic is implemented |
| Unknown `sortBy` — ignore vs reject | Plan assumes **ignore** (match eligibility); align S7 with implementation |
| Response global interceptor wrapping | Controller spec expects **raw service return** (match sibling IOM controller tests); adjust C4 if interceptor is applied in tests |

---

## 10. Starter Spec Files

**Not created in test-writer stage** because `ListIomListingDto`, `IomListingService`, and the updated controller handler do not exist yet. Importing them now would fail `npm run build`.

The code-implementer should create all three `*.spec.ts` files alongside their production counterparts using the cases above. Where behavior is not yet finalized, use:

```ts
// TODO(PM-23): assert exact andWhere SQL fragment once query builder is implemented
```

---

## 11. Risk Mitigations via Tests

| Risk | Mitigation test |
|------|-----------------|
| Breaking eligible listing default | C1, C2 |
| Wrong service called for `listType` | C3 |
| Data leak outside `crmProjects` | S2 |
| SQL injection via `sortBy` | S7 (unknown field ignored) |
| Invalid status silently returning all rows | S10 |
| Accidental DB hit for users with no projects | S1 |
