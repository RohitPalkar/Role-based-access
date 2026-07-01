# PN-51_1 Implementation Plan: Loyalty user listing

## Summary

Enhance the existing `GET /iom/listing` endpoint so **Loyalty** users (`RolesEnum.LOYALTY`) get tab-driven listing via `listType` and a three-key `counts` object. All other roles must behave exactly as today (no `counts`, no Loyalty tab logic). No new route, no migrations.

**Current state (from target files):**
- Endpoint: `IomController.list` → `IomListingService.findIoms` → `{ data: IomListingResult }`.
- `listType` exists on `ListIomListingDto` (`'eligible' | 'ioms'`) but is **not used** in the service.
- Project scoping uses `resolveUserProjects` + `resolveEffectiveProjects` for all roles today.
- Loyalty role status bucket is applied via `getAllowedIomStatusesByRole` in `iom-role-status.util.ts`.
- No `counts` or Loyalty tab logic exists yet.

**Approved planning-scope change (2026-06-24):** For Loyalty, `resolveEffectiveProjects` applies **only when the request includes a project filter** (`filters.projects?.length > 0`) for the active tab. When no project filter is applied on that tab, scope listing and counts to `authorizedProjects` from `resolveUserProjects` directly — do **not** call `resolveEffectiveProjects`. Non-Loyalty roles keep the existing project-scoping path unchanged.

## Target Files

| Action | Path |
|--------|------|
| Edit | `src/modules/iom/dto/list-iom-listing.dto.ts` |
| Edit | `src/modules/iom/dto/list-iom-listing.dto.spec.ts` |
| Edit | `src/modules/iom/types/iom-listing-filters.interface.ts` |
| Edit | `src/modules/iom/types/iom-list-item.interface.ts` |
| Edit | `src/modules/iom/mappers/iom-listing-filters.mapper.ts` |
| Edit | `src/modules/iom/services/iom-listing.service.ts` |
| Edit | `src/modules/iom/services/iom-listing.service.spec.ts` |
| Edit | `src/modules/iom/iom.controller.spec.ts` (if response shape assertions change) |
| **Create** | `src/modules/iom/utils/iom-loyalty-listing.util.ts` |

**Do not edit:** `iom.controller.ts` route/handler signature unless counts cannot be returned via extended `IomListingResult` inside existing `{ data: ... }` wrapper.

## Context Budget

- Open **target files above first**; do not scan the full `src/modules/iom/` tree.
- Open non-target files only for direct imports: `src/enums/roles.enum.ts`, `src/modules/iom/enums/iom-status-code.enum.ts`, `src/modules/iom/entities/iom.entity.ts` (invoice columns), `src/modules/iom/utils/iom-role-status.util.ts`.
- Use provider-native edit tools; do not paste full file contents or large diffs in chat.
- Run only the validation commands listed below for the changed surface.

---

## Implementation Steps

### 1. Define Loyalty tab types and SQL conditions

Create `src/modules/iom/utils/iom-loyalty-listing.util.ts` with:

**`LoyaltyListType` union:**
```ts
'iomRequestInvoice' | 'pendingSubmission' | 'submittedInvoice'
```

**Tab → filter helpers** (used by listing **and** counts):

| `listType` | ORM condition |
|------------|---------------|
| `iomRequestInvoice` | `i.invoiceId IS NULL` AND `(inv.id IS NULL OR inv.status IS NULL)` — maps spec `invoice_id IS NULL AND invoice_status IS NULL` via `ioms.invoice_id` + left-joined `iom_invoice_details.status` |
| `pendingSubmission` | `status.code = INVOICE_REQUESTED_FROM_VENDOR` |
| `submittedInvoice` | `status.code = INVOICE_SUBMITTED` |

Export:
- `LOYALTY_LIST_TYPES` constant array
- `isLoyaltyListType(value: string): value is LoyaltyListType`
- `applyLoyaltyListTypeFilter(qb, listType)` — adds `andWhere` for the active tab
- `buildLoyaltyCountsSelect()` — conditional `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` fragments for a single aggregated count query

**Assumption:** Count buckets are mutually exclusive by workflow design (`iomRequestInvoice` = no invoice row; other two = distinct status codes). No extra status restriction on counts beyond the three conditions (per R4).

### 2. Extend DTO and filter pipeline

**`list-iom-listing.dto.ts`:**
- Extend `@IsIn(...)` to accept CRM values **and** Loyalty values:
  `'eligible' | 'ioms' | 'iomRequestInvoice' | 'pendingSubmission' | 'submittedInvoice'`
- Keep default `'eligible'` for backward compatibility with CRM callers.

**`iom-listing-filters.interface.ts`:** add optional `listType?: string`.

**`iom-listing-filters.mapper.ts`:** pass `listType` from DTO into filters.

### 3. Extend result type

**`iom-list-item.interface.ts`:**
```ts
export interface IomLoyaltyCounts {
  iomRequestInvoice: number;
  pendingSubmission: number;
  submittedInvoice: number;
}

export interface IomListingResult {
  items: IomListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts?: IomLoyaltyCounts; // Loyalty only
}
```

Place `counts` **inside** `data` (on `IomListingResult`) to preserve the existing `{ data: ... }` envelope and avoid a new top-level response key.

### 4. Branch Loyalty logic in `IomListingService.findIoms`

Gate all new behavior on `user.role === RolesEnum.LOYALTY`.

#### 4a. Loyalty project scoping (approved change request)

Add a private helper, e.g. `resolveLoyaltyProjectScope(filters, authorizedProjects)`:

```ts
const hasProjectFilter = Boolean(filters.projects?.length);

if (hasProjectFilter) {
  return this.resolveEffectiveProjects(filters.projects, authorizedProjects);
}
return authorizedProjects;
```

| Role | Project filter in request? | Scope source |
|------|---------------------------|--------------|
| **LOYALTY** | Yes (`projects` param) | `resolveEffectiveProjects(requested, authorized)` |
| **LOYALTY** | No | `authorizedProjects` directly — **do not** call `resolveEffectiveProjects` |
| **Non-Loyalty** | Any | Existing path unchanged (`resolveEffectiveProjects` as today) |

When `authorizedProjects` is empty → return empty listing; for Loyalty also attach zero counts.

When Loyalty has project filter but intersection is empty → return empty listing + zero counts.

#### 4b. Loyalty listing branch

After resolving `projectScope` (per 4a) and `createBaseQueryBuilder(projectScope)`:

1. Apply `resolveEffectiveStatuses` + `applyListingFilters` (search, dates, iomStatus, invoiceStatus, pointsClassification) — **unchanged**.
2. **Additionally** apply `applyLoyaltyListTypeFilter` when `filters.listType` is a Loyalty tab.
   - If `listType` omitted for Loyalty, default to `'iomRequestInvoice'` (document in code comment).
   - If Loyalty passes CRM-only `listType` (`eligible`/`ioms`), ignore tab filter (no tab constraint); add unit test.
3. Keep existing sort/pagination logic.

**Non-Loyalty path:** leave `findIoms` body unchanged except ensure Loyalty `listType` values are ignored (no tab filter, no counts).

#### 4c. Loyalty counts branch

Add private method `computeLoyaltyCounts(projectScope: number[]): Promise<IomLoyaltyCounts>`:

- Build a **lightweight** query: `iom` + `innerJoin status` + `leftJoin invoice` + `where projectId IN (:...projectScope)`.
- **Do not** apply search, date, pagination, `iomStatuses`, `invoiceStatuses`, `pointsClassification`, or active `listType`.
- Use one aggregated query with three conditional `SUM`s (preferred over three round-trips).
- Coerce raw results to numbers; default missing to `0`.

Call from `findIoms` only when `user.role === RolesEnum.LOYALTY`, using the **same** `projectScope` resolved in 4a (so counts respect project filter when applied on the tab, and fall back to `authorizedProjects` when not).

**Important:** Counts must be identical regardless of active tab or non-project UI filters (AC4, AC5). Counts **do** follow the same project-scope rule as listing per the approved change request.

### 5. Controller

No route changes. `IomController.list` continues:

```ts
return { data: iomList };
```

`iomList.counts` appears only for Loyalty responses.

### 6. Export path

`findAllForExport` / `IomExportService` — **no changes** (out of scope). Verify export still calls `findIoms` without surfacing `counts` to Excel logic (counts on result object is harmless if export reads only `items`).

### 7. Unit tests

**`iom-listing.service.spec.ts`** — add Loyalty-focused cases:

| Test | Assert |
|------|--------|
| Loyalty listing applies tab filter | `listType: 'pendingSubmission'` adds `status.code = INVOICE_REQUESTED_FROM_VENDOR` |
| Loyalty listing + search | both tab `andWhere` and search `andWhere` present |
| Loyalty counts ignore filters | with `search` set, count query has no search clause; returns all three keys |
| Loyalty counts ignore active tab | same count query shape for `iomRequestInvoice` vs `submittedInvoice` listType |
| Loyalty **with** project filter | `resolveEffectiveProjects` intersection used for listing and counts |
| Loyalty **without** project filter | scopes to `authorizedProjects`; `resolveEffectiveProjects` not invoked |
| Loyalty empty authorized projects | `counts` all zero, no DB count call |
| Non-Loyalty CRM | no `counts` on result; Loyalty `listType` values ignored |
| Non-Loyalty regression | existing CRM_HEAD / LOYALTY status bucket tests still pass |

Mock `getRawOne` on a second QB instance for count queries; keep existing QB mock for listing.

**`list-iom-listing.dto.spec.ts`:** accept Loyalty `listType` values; reject unknown values.

**`iom.controller.spec.ts`:** optional — assert Loyalty mock result with `counts` passes through in `{ data: ... }`.

---

## Validation Commands

```bash
npm run test -- src/modules/iom/services/iom-listing.service.spec.ts
npm run test -- src/modules/iom/dto/list-iom-listing.dto.spec.ts
npm run test -- src/modules/iom/iom.controller.spec.ts
npm run lint -- --max-warnings=0 src/modules/iom/dto/list-iom-listing.dto.ts src/modules/iom/services/iom-listing.service.ts src/modules/iom/utils/iom-loyalty-listing.util.ts
```

Run `npm run build` only if TypeScript errors appear across module boundaries.

---

## Risks

| Risk | Mitigation |
|------|------------|
| `invoice_status IS NULL` mapping ambiguous (no `invoice_status` column on `ioms`) | Use `i.invoiceId IS NULL` + left join `inv`; treat missing invoice row as null status. Confirm with QA against Loyalty UI tab data. |
| `listType` DTO allows Loyalty values for CRM users | Ignore non-Loyalty loyalty listTypes in service; CRM `eligible`/`ioms` remain unused (status quo). |
| Count query performance (extra join per request) | Single aggregated query with minimal joins; no `getMany` on full dataset. |
| Overlapping count buckets | Spec assumes mutual exclusivity; if QA finds overlap, counts may sum > total visible records — escalate, do not invent new filters without spec change. |
| Spec says `submitted` in description but API key is `submittedInvoice` | Use **`submittedInvoice`** everywhere (R3, API contract). |
| Approved CR narrows when `resolveEffectiveProjects` runs vs spec R4/R6 "always" wording | Implement per approved CR: Loyalty calls `resolveEffectiveProjects` only when `projects` filter is present; document in code. Non-Loyalty unchanged. |

---

## Assumptions

1. `RolesEnum.LOYALTY`, `IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR`, and `INVOICE_SUBMITTED` exist and are the correct constants (confirmed in codebase).
2. For **Loyalty**, `resolveEffectiveProjects` is invoked **only** when `filters.projects` is non-empty (approved change request). Without a project filter, `authorizedProjects` from `resolveUserProjects` is the scope for both listing and counts.
3. For **non-Loyalty** roles, existing `resolveEffectiveProjects` behavior is unchanged.
4. Loyalty `listType` query values are exactly `iomRequestInvoice`, `pendingSubmission`, `submittedInvoice`.
5. Default Loyalty tab when `listType` omitted: `iomRequestInvoice`.
6. `counts` lives on `IomListingResult` inside `data`, not as a sibling of `data` at the controller return.
7. No DB migration required — all conditions map to existing `ioms` / `iom_invoice_details` / `iom_statuses` columns.
8. Existing non-Loyalty default sort (`createdAt DESC` when no `sortBy`) is preserved; no separate actionable sort exists in code today.

---

## Acceptance Criteria Mapping

| AC | How to verify |
|----|----------------|
| AC1 | Same `GET /iom/listing` route |
| AC2 | Loyalty listing tests: tab + filters + project scope (with/without `projects` param per approved CR) |
| AC3 | `counts` has exactly three keys, no `all` |
| AC4 | Count test with search/date/status applied — counts unchanged |
| AC5 | Count test with different `listType` values — counts unchanged |
| AC6 | Each count uses correct SQL/ORM condition |
| AC7 | Listing and counts share the same Loyalty project scope; `resolveEffectiveProjects` only when project filter applied |
| AC8 | Non-Loyalty tests: no `counts`, unchanged filters |
| AC9 | New Loyalty tests + existing non-Loyalty tests pass |
