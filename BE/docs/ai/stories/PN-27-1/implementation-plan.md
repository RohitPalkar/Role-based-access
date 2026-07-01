# PN-27-1 Implementation Plan: Export IOM with Filter (incl. final-review deltas)

## Summary

Complete PN-27-1 by wiring export to listing filters with role-based columns, then apply the **2026-06-19 final-review change request**:

1. **Export-only multiselect:** `iomStatus` and `invoiceStatus` on `POST /iom/export/excel` accept **arrays** (FE multiselect). Listing contracts for these fields stay unchanged.
2. **New `projects` filter:** Add to **both** listing and export. Listing accepts comma-separated project IDs (query string → array). Export accepts a JSON array. Shared query logic intersects requested IDs with user-authorized projects.

**Already implemented (do not redo):**

| Area | Status |
|------|--------|
| `ExportIomExcelDto` extends `ListIomListingDto` + `fields` | Done — **must refactor** for export-only array types |
| `IomExportService` calls `findIoms(user, dto, { skipPagination: true })` | Done |
| `findIoms` supports `skipPagination` option | Done |
| Role-based `resolveExportColumns(fields, role)` | Done in `iom-export.columns.ts` |
| `IomListItem` includes `saleValueCollectedPercentage` / `saleValueAmountCollected` | Done |
| Listing filters: `search`, `iomStatus` (comma-separated), dates, `invoiceStatus` (single) | Done |

**Remaining work:** DTO separation for export multiselects, `projects` filter end-to-end, shared internal filter normalization, query updates, and tests for parity + regressions.

---

## Target Files

| Action | Path |
|--------|------|
| **Create** | `src/modules/iom/types/iom-listing-filters.interface.ts` — normalized internal filter shape |
| **Create** | `src/modules/iom/mappers/iom-listing-filters.mapper.ts` — DTO → internal filters (listing + export) |
| **Edit** | `src/modules/iom/dto/list-iom-listing.dto.ts` — add `projects` (comma-separated → `number[]`) |
| **Edit** | `src/modules/iom/dto/export-iom-excel.dto.ts` — decouple status fields; `iomStatus`/`invoiceStatus` as arrays; `projects` as `number[]` |
| **Edit** | `src/modules/iom/services/iom-listing.service.ts` — accept normalized filters; `projects` intersection; multivalue `invoiceStatus` in query |
| **Edit** | `src/modules/iom/services/iom-export.service.ts` — map export DTO → internal filters before `findIoms` |
| **Edit** | `src/modules/iom/dto/list-iom-listing.dto.spec.ts` — `projects` parsing tests |
| **Create** | `src/modules/iom/dto/export-iom-excel.dto.spec.ts` — export array validation tests |
| **Edit** | `src/modules/iom/services/iom-listing.service.spec.ts` — `projects` filter + invoice multiselect (internal path) |
| **Edit** | `src/modules/iom/services/iom-export.service.spec.ts` — filter forwarding with normalized arrays |
| **Edit** | `src/constants/iom-export.columns.spec.ts` — only if column resolution changes (unlikely) |
| **Edit** | `src/modules/iom/iom.controller.spec.ts` — only if export/listing DTO wiring assertions break |

**No controller route changes** — `GET /iom/listing` and `POST /iom/export/excel` already exist.

---

## Context Budget

- Inspect **target files first**; avoid broad repo scans.
- Open non-target files only for direct imports, callers, tests, or required config:
  - `src/helpers/dto/commonFindAll.dto.ts`
  - `src/utils/transformers.ts` (`ToNumberArray`, `parseStringToArray`)
  - `src/modules/users/dto/list-team-availability.dto.ts` (comma-separated → array pattern)
  - `src/enums/roles.enum.ts`
  - `src/modules/iom/utils/iom-role-status.util.ts`
  - `src/modules/iom/entities/iom-invoice-details.entity.ts` (invoice `status` column type)
- Use provider-native edit tools; do not paste full file contents, full diffs, or large code blocks in chat.
- Run only the validation commands listed below.
- Skip `docs/`, `.opencode/`, `node_modules/`, `dist/`, and execution-history folders unless a compile error points there.

---

## Architecture: Shared Internal Filters

Introduce one internal type consumed by `IomListingService` so listing and export share query logic without sharing wire formats.

### `IomListingFilters` (new interface)

```typescript
// Conceptual — implementer defines exact types in target file
interface IomListingFilters {
  search?: string;
  sortBy?: string;
  startDate?: Date;
  endDate?: Date;
  iomStatuses?: IomStatusCodeEnum[];   // normalized from listing string OR export array
  invoiceStatuses?: (string | number)[]; // normalized from listing single OR export array
  projects?: number[];                 // normalized from listing comma-string OR export array
  // pagination-only (listing path): page?, limit?
}
```

### Normalization rules

| Field | Listing DTO input | Export DTO input | Internal |
|-------|-------------------|------------------|----------|
| `iomStatus` | Comma-separated `string` (unchanged) | `string[]` | `iomStatuses: string[]` |
| `invoiceStatus` | Single value (unchanged) | `string[]` or `number[]` (match entity/query type) | `invoiceStatuses: T[]` |
| `projects` | Comma-separated query (`projects=1,2,3`) via `@ToNumberArray()` | `number[]` JSON body | `projects: number[]` (deduped) |

**Mapper functions** (in `iom-listing-filters.mapper.ts`):

- `fromListIomListingDto(dto: ListIomListingDto): IomListingFilters`
- `fromExportIomExcelDto(dto: ExportIomExcelDto): IomListingFilters`

Export mapper must **not** pass raw export arrays into listing DTO types. Listing mapper must **not** change existing `iomStatus` split/validation behavior.

---

## Implementation Steps

### Step 1 — Add `projects` to listing DTO (comma-separated → array)

In `list-iom-listing.dto.ts`:

- Add optional `projects?: number[]`.
- Use existing `@ToNumberArray()` from `src/utils/transformers.ts` (handles `"1,2,3"` query strings and dedupes invalid entries).
- Add `@IsArray()`, `@IsInt({ each: true })`, `@IsOptional()`.
- **Do not** change `iomStatus` or `invoiceStatus` decorators/types on listing DTO.

Add tests in `list-iom-listing.dto.spec.ts`:

- `projects=10,11` → `[10, 11]`
- omitted / empty → `undefined`
- invalid tokens filtered (per `ToNumberArray` behavior)

### Step 2 — Refactor export DTO for array multiselects

**Problem:** `ExportIomExcelDto extends ListIomListingDto` forces listing wire types on export.

In `export-iom-excel.dto.ts`:

- Stop extending `ListIomListingDto` directly for conflicting fields.
- Recommended pattern:

  ```typescript
  // Pick shared non-conflicting fields; override status/projects
  class ExportIomExcelDto extends OmitType(ListIomListingDto, ['iomStatus', 'invoiceStatus', 'projects', 'listType'] as const) {
    @IsOptional() @IsArray() @IsString({ each: true }) iomStatus?: string[];
    @IsOptional() @IsArray() invoiceStatus?: string[]; // or number[] if aligned with inv.status column
    @IsOptional() @IsArray() @IsInt({ each: true }) projects?: number[];
    @IsOptional() @IsArray() @IsString({ each: true }) fields?: string[];
  }
  ```

- Re-declare inherited common filters (`search`, `startDate`, `endDate`, `sortBy`) via `OmitType` + `PickType(CommonFindAllQueryDto, ...)` if `OmitType` drops needed fields.
- Ignore `page`, `limit`, `listType`, `status`, `brandId` on export (omit or accept without use).

Add `export-iom-excel.dto.spec.ts` validating array shapes and rejecting invalid types.

### Step 3 — Implement filter mappers

In `iom-listing-filters.mapper.ts`:

**`fromListIomListingDto`:**

- `iomStatuses`: existing logic — `dto.iomStatus?.split(',').map(trim).filter(Boolean)` (move from service or duplicate call to mapper).
- `invoiceStatuses`: wrap single `dto.invoiceStatus` as one-element array when present.
- `projects`: pass through `dto.projects` (already array from transform).
- Copy `search`, `startDate`, `endDate`, `sortBy`.

**`fromExportIomExcelDto`:**

- `iomStatuses`: use `dto.iomStatus` array directly (trim, dedupe).
- `invoiceStatuses`: use `dto.invoiceStatus` array directly (dedupe).
- `projects`: use `dto.projects` array (dedupe).
- Copy other shared scalar/date fields.

### Step 4 — Update `IomListingService` to consume normalized filters

Refactor `findIoms` signature:

```typescript
async findIoms(
  user: AuthenticatedUser,
  query: ListIomListingDto | IomListingFilters,
  options?: FindIomsOptions,
)
```

At method entry, normalize if input is `ListIomListingDto`:

```typescript
const filters = isListingDto(query) ? fromListIomListingDto(query) : query;
```

**Project scoping (critical — handle carefully):**

1. `authorizedProjects = await resolveUserProjects(user)` (unchanged).
2. If `authorizedProjects.length === 0` → return empty (unchanged).
3. Compute `effectiveProjects`:
   - If `filters.projects` omitted/empty → `effectiveProjects = authorizedProjects` (current behavior).
   - If provided → `effectiveProjects = intersection(dedupe(filters.projects), authorizedProjects)`.
4. If `effectiveProjects.length === 0` after intersection → return empty result immediately (no query, no data leak).
5. Pass `effectiveProjects` to `createBaseQueryBuilder(effectiveProjects)` instead of full authorized set.

**`iomStatus` validation:** Move comma-split + enum validation into mapper or a shared `parseIomStatuses()` used by both mappers. Keep role intersection in `resolveEffectiveStatuses` (unchanged semantics).

**`invoiceStatus` query:** Update `applyListingFilters` to use internal `invoiceStatuses`:

```typescript
if (filters.invoiceStatuses?.length) {
  qb.andWhere('inv.status IN (:...invoiceStatuses)', { invoiceStatuses: filters.invoiceStatuses });
}
```

Listing path still sends a single value → mapper wraps as `[value]`. Export path sends multiple → `IN` clause. **Listing wire format unchanged.**

**`projects` query:** No extra `andWhere` needed beyond narrowing `crmProjects` in the base `where` clause — intersection happens before query builder creation.

### Step 5 — Wire export service through mapper

In `iom-export.service.ts`:

```typescript
const filters = fromExportIomExcelDto(dto);
const columns = resolveExportColumns(dto.fields, user.role);
const { items } = await this.iomListingService.findIoms(user, filters, { skipPagination: true });
```

`fields` must not flow into listing filters.

### Step 6 — Preserve role-based columns (verify only)

`resolveExportColumns(fields, role)` is already implemented. Confirm:

- Default export uses base + role columns in spec order.
- Custom `fields` intersected with role allow-list.
- Unknown fields still throw `BadRequestException`.

No changes expected unless tests fail.

### Step 7 — Tests

**`iom-listing.service.spec.ts` (add):**

| Case | Assert |
|------|--------|
| `projects=10` (authorized) | `where` uses `crmProjects: [10]` not full authorized set |
| `projects=10,11` partial auth | only authorized IDs in `crmProjects` |
| `projects=999` (unauthorized) | empty result, query not executed |
| `projects` duplicates | deduped |
| Listing `iomStatus=A,B` unchanged | same `effectiveStatuses` as today |
| Export-normalized `invoiceStatuses: [1, 2]` | `inv.status IN (:...invoiceStatuses)` |
| Listing single `invoiceStatus: 1` unchanged | `IN` with one value (equivalent to `=`) |

**`iom-export.service.spec.ts` (add/update):**

- Mock `findIoms` receives **normalized filters object**, not raw export DTO.
- Assert export with `{ iomStatus: ['A','B'], invoiceStatus: ['1','2'], projects: [10] }` maps correctly.

**Regression tests (must pass):**

- Listing `iomStatus` comma-separated behavior unchanged.
- Listing `invoiceStatus` single-value behavior unchanged.
- Listing response shape unchanged.

**Parity test pattern:**

```typescript
// Same logical filters → same qb.andWhere / effectiveProjects calls
const listingFilters = fromListIomListingDto({ iomStatus: 'A,B', projects: '10,11' });
const exportFilters = fromExportIomExcelDto({ iomStatus: ['A','B'], projects: [10, 11] });
expect(listingFilters).toEqual(exportFilters); // on normalized fields
```

---

## Validation Commands

```bash
npm run test -- \
  src/modules/iom/dto/list-iom-listing.dto.spec.ts \
  src/modules/iom/dto/export-iom-excel.dto.spec.ts \
  src/modules/iom/services/iom-listing.service.spec.ts \
  src/modules/iom/services/iom-export.service.spec.ts \
  src/constants/iom-export.columns.spec.ts

npm run lint
npm run build
```

Manual parity (staging/local):

1. Same user + equivalent filters → listing `total` === export row count.
2. Export multiselect: `iomStatus: ['A','B']`, `invoiceStatus: ['x','y']`.
3. Listing `projects=10,11` vs export `projects: [10, 11]` → same rows.
4. Unauthorized `projects=999` → empty listing + empty export (no 403 leak).
5. Listing `iomStatus=A,B` + single `invoiceStatus` → unchanged from pre-change behavior.
6. Per-role export columns still gated correctly.

---

## Risks

| Risk | Mitigation |
|------|------------|
| `ExportIomExcelDto extends ListIomListingDto` causes class-validator to reject export arrays | Refactor DTO in Step 2 before wiring mapper |
| `projects` intersection returns empty silently | Document behavior; return `{ items: [], total: 0 }` — consistent with no-mapping user |
| Unauthorized project IDs could broaden scope if intersection skipped | Always intersect before `createBaseQueryBuilder`; add explicit empty-short-circuit test |
| `invoiceStatus` type mismatch (listing uses number, entity is varchar) | Align export array element type with `iom-invoice-details.entity.ts` `status` column; do not change listing type |
| Duplicate filter logic in listing vs export | Single `IomListingFilters` + mappers; `applyListingFilters` takes internal type only |
| `findIoms` signature change breaks callers | Only controller listing passes `ListIomListingDto`; export passes mapped filters — grep for other callers |
| Listing `iomStatus` regression from refactor | Keep listing DTO + mapper path isolated; dedicated regression tests |

---

## Assumptions

1. Final-review change request (2026-06-19) supersedes prior plan guidance that listing should not gain explicit project filters.
2. `projects` IDs are numeric (`number[]`), consistent with `Iom.projectId` and `resolveUserProjects`.
3. Unauthorized/invalid `projects` values yield **empty results** (not 400), matching implicit auth scoping — unless existing listing validation patterns require 400 (prefer empty result for auth safety).
4. Export `invoiceStatus` array elements use the same type as listing's single `invoiceStatus` (check entity; likely `string` despite current DTO typing).
5. `listType`, `status`, `brandId` remain non-functional for filtering (parity with current listing).
6. Unlisted roles receive base export columns only.
7. Branch `feature/PN-49` vs story key `PN-27-1` is intentional; implementation targets IOM module.

---

## Acceptance Criteria Traceability

| Criterion | Implementation |
|-----------|----------------|
| Export accepts listing filters + array status fields | Steps 2, 5 |
| Export `iomStatus`/`invoiceStatus` as arrays | Step 2; mapper in Step 3 |
| Listing `iomStatus`/`invoiceStatus` unchanged | Steps 1, 3, 7 regression tests |
| New `projects` on listing (comma-separated) | Step 1 |
| New `projects` on export (array) | Step 2 |
| Identical query after normalization | Steps 3–4, parity tests |
| No duplicate export query | Existing `findIoms` path preserved |
| Role-based columns | Already done; verify in Step 6 |
| API response shapes unchanged | No controller changes |
