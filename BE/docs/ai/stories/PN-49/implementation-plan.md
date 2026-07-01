# PN-49: Export IOM List — Implementation Plan

## Summary

Implement `POST /iom/export/excel` to export role-scoped IOM rows to Excel, upload to S3, and return `fileUrl` + `baseUrl`. Most scaffolding exists on `feature/PN-49`; the **remaining required change** (final-review) is to exclude **`statusCode`** (header: "Status Code") and **`crmVerifiedBy`** (header: "CRM Verified By ID") from the **default** column set while keeping **`statusLabel`** and **`crmVerifiedByName`** included.

Selective export via `fields` must still allow `statusCode` / `crmVerifiedBy` when explicitly requested (AC-3).

## Active Change Request (incorporated)

| Column | Key | Default export |
|--------|-----|----------------|
| Status Code | `statusCode` | **Exclude** |
| CRM Verified By ID | `crmVerifiedBy` | **Exclude** |
| Status | `statusLabel` | Include |
| CRM Verified By | `crmVerifiedByName` | Include |

## Current State

| Area | Status |
|------|--------|
| `POST /iom/export/excel` route + DTO + module wiring | Done |
| `IomExportService` orchestration (fetch → Excel → S3) | Done |
| `IomListingService.findAllForExport` + role filter | Done |
| `getAllowedIomStatusesByRole` shared util | Done |
| `generateExcelBuffer` generalized (`worksheetName` param) | Done |
| `IOM_EXPORT_COLUMNS` constant (full set incl. excluded keys) | Done |
| `resolveExportColumns` default path | **Gap** — returns all columns; must filter out `statusCode` and `crmVerifiedBy` |
| Unit tests for default column exclusion | **Gap** — `iom-export.service.spec.ts` still expects full `IOM_EXPORT_COLUMNS` |

## Context Budget

- Inspect **target files first**; do not broad-scan the repo.
- Open non-target files only for direct imports, callers, tests, or required config (`excel.helper`, `AwsService`, `IomListItem`, `user-availability.service` for S3 pattern).
- Use provider-native edit tools; do not print full file contents, full diffs, or large code blocks in chat.
- Run only the validation commands listed below for the changed surface.

---

## Target Files

### Modify (primary — change request)

| File | Change |
|------|--------|
| `src/constants/iom-export.columns.ts` | Fix `resolveExportColumns` default path to exclude `statusCode` and `crmVerifiedBy`; add `DEFAULT_EXPORT_EXCLUDED_KEYS` constant |
| `src/modules/iom/services/iom-export.service.spec.ts` | Update default-export assertions; add test for explicit `fields: ['statusCode']` |

### Create (recommended test coverage)

| File | Purpose |
|------|---------|
| `src/constants/iom-export.columns.spec.ts` | Unit tests for `resolveExportColumns` (default exclusion, selective inclusion, unknown keys) |

### Verify / touch only if broken

| File | Purpose |
|------|---------|
| `src/modules/iom/services/iom-export.service.ts` | Already calls `resolveExportColumns`; no logic change expected |
| `src/modules/iom/iom.controller.ts` | Export route already wired |
| `src/modules/iom/iom.module.ts` | `IomExportService` + `AwsModule` already registered |
| `src/modules/iom/services/iom-listing.service.ts` | `findAllForExport` + role filter already present |
| `src/modules/iom/utils/iom-role-status.util.ts` | Shared role → status mapping |
| `src/common/helpers/excel.helper.ts` | Generic Excel builder (no column logic) |
| `src/modules/iom/dto/export-iom-excel.dto.ts` | Optional `fields?: string[]` |
| `src/modules/iom/iom.controller.spec.ts` | Smoke test for export delegation |
| `src/modules/iom/services/iom-listing.service.spec.ts` | Role filter on export fetch |
| `src/modules/iom/utils/iom-role-status.util.spec.ts` | Role bucket mapping |

### Reference only

- `src/modules/iom/types/iom-list-item.interface.ts` — column key source of truth
- `src/modules/users/services/user-availability.service.ts` — S3 upload pattern
- `docs/ai/stories/PN-49/spec.md` — AC-2, AC-3, AC-8, AC-12

---

## Implementation Steps

### 1. Fix default column resolution (change request)

In `src/constants/iom-export.columns.ts`:

1. Add a named exclusion set at module scope:

```typescript
export const DEFAULT_EXPORT_EXCLUDED_KEYS = new Set(['statusCode', 'crmVerifiedBy']);
```

2. Update `resolveExportColumns(fields?: string[])`:

| Input | Behavior |
|-------|----------|
| `fields` undefined or `[]` | Return `IOM_EXPORT_COLUMNS.filter(c => !DEFAULT_EXPORT_EXCLUDED_KEYS.has(c.key))` |
| `fields` provided | Filter `IOM_EXPORT_COLUMNS` by matching keys (no exclusion); throw `BadRequestException` for unknown keys |

3. Keep `statusCode` and `crmVerifiedBy` **in** `IOM_EXPORT_COLUMNS` so selective export can request them.

No changes needed in `iom-export.service.ts` — it already delegates to `resolveExportColumns(dto.fields)`.

### 2. Update export service tests

In `src/modules/iom/services/iom-export.service.spec.ts`:

1. **Default export test** (`exports with all columns by default…`):
   - Replace `IOM_EXPORT_COLUMNS` expectation with columns that exclude `statusCode` and `crmVerifiedBy`.
   - Prefer importing `resolveExportColumns()` or asserting `not.toContainEqual(expect.objectContaining({ key: 'statusCode' }))`.

2. **Empty export test** (`still uploads when export list is empty`):
   - Same column expectation fix as above.

3. **Add selective exclusion override test**:
   - Call with `fields: ['statusCode', 'crmVerifiedBy']`.
   - Assert `generateExcelBuffer` receives exactly those two column definitions.

### 3. Add column resolver unit tests (recommended)

Create `src/constants/iom-export.columns.spec.ts`:

| Test case | Assertion |
|-----------|-----------|
| Default (`undefined` / `[]`) | Result excludes keys `statusCode`, `crmVerifiedBy`; includes `statusLabel`, `crmVerifiedByName` |
| Selective `fields: ['iomNo', 'statusLabel']` | Only requested columns returned |
| Selective `fields: ['statusCode']` | `statusCode` included (override default exclusion) |
| Unknown field | Throws `BadRequestException` |

### 4. End-to-end verification (no new code expected)

Confirm existing wiring still satisfies ACs:

- **AC-1:** `POST /iom/export/excel` on `IomController` with same guards/roles as listing.
- **AC-4:** `findAllForExport` uses `getAllowedIomStatusesByRole`.
- **AC-5/AC-6:** `generateExcelBuffer` + `awsService.uploadToS3`.
- **AC-7:** Response `{ data: { fileUrl, baseUrl } }`.
- **AC-10:** No role logic in controller.
- **AC-12:** Default export has human-readable status/CRM columns, not internal ID/code columns.

---

## API Contract

```
POST /api/iom/export/excel
Body (optional): { "fields": ["iomNo", "projectName", "statusLabel"] }
```

| Condition | Columns exported |
|-----------|------------------|
| `fields` omitted or `[]` | All `IOM_EXPORT_COLUMNS` **except** `statusCode`, `crmVerifiedBy` |
| `fields` provided | Only matching keys (may include excluded defaults if requested) |

**Success response:**

```json
{
  "success": true,
  "data": {
    "fileUrl": "exports/iom-list-<timestamp>.xlsx",
    "baseUrl": "https://<cdn-base>/puravankara/"
  }
}
```

---

## Validation Commands

```bash
npm run lint
npm run test -- --testPathPattern="iom-export.columns|iom-export|iom-listing|iom-role-status" --no-coverage
npm run build
```

Optional:

```bash
npm run test -- src/modules/iom/iom.controller.spec.ts --no-coverage
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Tests still assert full `IOM_EXPORT_COLUMNS` on default path | Update both failing specs in step 2; run targeted test command |
| FE relies on default export including `statusCode` / `crmVerifiedBy` | Per final-review, intentional removal; FE must pass `fields` to get them |
| Exclusion logic duplicated elsewhere | Centralize in `resolveExportColumns` + `DEFAULT_EXPORT_EXCLUDED_KEYS` only |
| Listing role filter behavior change (pre-existing) | Already shipped in branch; QA should verify restricted roles see filtered listing + export |

---

## Assumptions

- `IOM_EXPORT_COLUMNS` remains the single source of truth for all exportable keys (including excluded defaults).
- Exclusion applies **only** when `fields` is undefined or empty; explicit `fields` is authoritative.
- `statusLabel` and `crmVerifiedByName` stay in the default set (AC-12).
- No controller, service, or Excel-helper changes required beyond column resolution and tests.
- Branch `feature/PN-49` already contains the bulk of PN-49; implementer focuses on the column-exclusion gap and test alignment.
