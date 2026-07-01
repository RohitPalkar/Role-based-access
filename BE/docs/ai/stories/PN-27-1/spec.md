# PN-27-1: Export IOM with Filter

## Metadata

| Field | Value |
|-------|-------|
| **Story Key** | PN-27-1 |
| **Title** | Export IOM with filter |
| **Type** | Backend API enhancement |
| **Repository role** | Backend API only (NestJS REST, `api` global prefix) |

## Summary

Enhance the existing IOM Export POST API so that:

1. It accepts the same filter parameters as the IOM listing API, with **documented exceptions** for multiselect export fields (`iomStatus`, `invoiceStatus`) and the new `projects` filter input shape.
2. Exported rows are produced by reusing listing query logic (no duplicate query conditions).
3. Export columns are determined dynamically based on the logged-in user's role.
4. The existing column-mapping mechanism remains supported and is intersected with role-allowed columns.

Additionally, add a **`projects` filter** to both IOM listing and export so users can scope results to one or more projects by ID.

## Background

### Current state

- IOM export is implemented as a **POST** API.
- The export request accepts a field for **column mapping** only.
- Export does **not** apply listing filters; it does not scope results the same way as the listing view.
- IOM listing supports filters such as `search`, `iomStatus` (comma-separated), `invoiceStatus`, and date ranges; project scoping is implicit via user authorization (`resolveUserProjects`), not an explicit request filter.

### Desired outcome

- Users can export exactly the IOM records they see (or would see) when applying equivalent listing filters.
- Frontend multiselect controls for IOM status and invoice status on export send **arrays** without changing listing filter contracts for those fields.
- Users can filter listing and export by **multiple project IDs** via a new `projects` filter.
- Users receive only columns permitted for their role, with optional client-specified column subsets further restricted to that allow-list.
- Listing response shape, export file format, and export response envelope remain unchanged for existing consumers not using new filters.

## Requirements

### R1 — Extend export request DTO with listing filters

Extend the IOM export request DTO to accept the **same applied filter fields** as IOM listing, including at minimum:

- `search`
- `iomStatus`
- `invoiceStatus`
- `startDate` / `endDate` (created-at range, as in listing)
- `projects` (new — see R6)
- Any other filters already applied by `IomListingService.applyListingFilters`

Filter semantics must match listing at the **query layer** after DTO normalization—not necessarily identical request wire formats.

#### R1a — Export-only array types for `iomStatus` and `invoiceStatus`

For **export only**, `iomStatus` and `invoiceStatus` must accept **arrays** (multiselect on FE):

| Field | Listing input (unchanged) | Export input (new) |
|-------|---------------------------|---------------------|
| `iomStatus` | Comma-separated string of status codes (existing behavior) | `string[]` — one or more status codes |
| `invoiceStatus` | Single value (existing behavior) | `string[]` — one or more invoice status values |

**Strict rule:** Do **not** change listing DTO validation, parsing, or query behavior for `iomStatus` or `invoiceStatus`. Export DTO may define its own types/validators for these fields. Export service must normalize export arrays into the same internal filter representation listing uses before calling shared listing query logic.

Accept but ignore pagination/sort-only fields (`page`, `limit`, `sortBy`) and unused listing DTO fields (`listType`, `status`, `brandId`) for DTO parity, or omit via composition (`OmitType`).

### R2 — Reuse listing query logic for export (strict)

The export service **must**:

- Call the **existing IOM listing service method** with normalized filters from the export request.
- Disable pagination for export (fetch all matching rows).
- **Not** introduce a separate export-specific query or duplicated filter/query-builder logic.

**Result:** Exported rows must exactly match the filtered listing dataset (equivalent filters ⇒ same row set).

### R3 — Role-based export column mapping

Determine the caller's role from the **logged-in user** and compute:

```
exportColumns = baseColumns + roleSpecificColumns
```

#### Base columns (all roles)

Always eligible for export:

| Column key |
|------------|
| `projectName` |
| `unitNo` |
| `customerName` |
| `saleValue` |
| `saleValueCollectedPercentage` |
| `statusLabel` |
| `iomCreatedAt` |
| `iomNo` |
| `thresholdPaymentReceivedAt` |
| `totalBrokerageAmount` |
| `referralPointsAdjustment` |
| `referralPointsEdited` |
| `loyaltyPointClassification` |
| `pointsUpdatedAt` |
| `invoiceReqNumber` |
| `invoiceStatus` |
| `invoiceNumber` |
| `invoiceDate` |
| `saleValueAmountCollected` |

#### Additional columns by role

| Role | Additional columns (cumulative within role set) |
|------|--------------------------------------------------|
| `CRM_TL` | `crmCreatedByName` |
| `CRM_ADMIN` | `crmCreatedByName`, `crmVerifiedByName` |
| `FINANCE_VERIFIER` | `crmCreatedByName`, `crmVerifiedByName`, `crmApprovedByName` |
| `FINANCE_ADMIN` | `crmCreatedByName`, `crmVerifiedByName`, `crmApprovedByName`, `financeVerifiedByName` |
| `LOYALTY` | `crmCreatedByName`, `crmVerifiedByName`, `crmApprovedByName`, `financeVerifiedByName`, `financeApprovedByName` |

Column order must be **deterministic** (base columns in the order listed above, then role-specific columns in the order listed for that role).

### R4 — Preserve existing custom column mapping behavior

If the export request payload already specifies custom columns:

- **Intersect** the requested columns with the role's allowed column set (`baseColumns + roleSpecificColumns`).
- Do not export columns outside the role allow-list.
- Keep the existing column-mapping mechanism intact; this story extends it with filters and role gates—not a replacement.

### R5 — API contract constraints

- **Listing API:** Response shape unchanged. **Additive change allowed:** new optional `projects` query filter only (R6). Existing listing filter contracts for `iomStatus` and `invoiceStatus` remain unchanged.
- **No change** to export file format.
- **No change** to export API response structure / envelope (`success-response-errors` pattern).
- Fields not present for a row or not applicable to a role must export as an **empty string** (not omit the column).
- Existing export consumers must remain unaffected when not using new filter fields.

### R6 — New `projects` filter (listing and export)

Add a **`projects`** filter to **both** IOM listing and export.

| API | Input format | DTO behavior |
|-----|--------------|--------------|
| `GET /iom/listing` | Comma-separated project IDs in query string (e.g. `projects=1,2,3`) | DTO parses and normalizes to `number[]` (or `string[]` if IDs are non-numeric—match existing project ID type in codebase) |
| `POST /iom/export/excel` | JSON array of project IDs (e.g. `"projects": [1, 2, 3]`) | Validate as non-empty optional array when provided |

#### Query semantics (shared)

- When `projects` is **omitted or empty**, behavior matches today: scope to all projects the user is authorized to access via existing `resolveUserProjects` logic.
- When `projects` is **provided**, filter results to IOMs belonging to those project IDs **intersected with** the user's authorized projects.
  - Requested IDs the user cannot access must **not** expand results; treat as no-match or silently exclude unauthorized IDs (follow existing authorization patterns—do not leak data from unauthorized projects).
- Listing and export must apply **identical** `projects` filter logic in `applyListingFilters` (or equivalent shared path).
- Handle edge cases carefully: invalid IDs, duplicates, empty after intersection, single vs multiple IDs.

**Implementation rule:** One shared internal representation (normalized `projects` array) consumed by listing query logic; only DTO parsing differs between GET query string and POST JSON body.

## Acceptance Criteria

### Filtering — general

- [ ] Export POST request accepts all listing-applied filter fields, with export-specific types for `iomStatus`, `invoiceStatus`, and `projects` as specified.
- [ ] Export applies filters identically to listing after DTO normalization (verified by matching row counts and row IDs for equivalent filter sets).
- [ ] Export implementation calls the existing listing service method with pagination disabled; no duplicate export query exists.
- [ ] With no filters, export returns the same row set as unfiltered listing (subject to listing's default authorization scoping).

### Filtering — `iomStatus` / `invoiceStatus` (export vs listing)

- [ ] Export accepts `iomStatus` as `string[]` and supports multiselect (multiple statuses in one request).
- [ ] Export accepts `invoiceStatus` as `string[]` and supports multiselect.
- [ ] Listing `iomStatus` remains comma-separated string; behavior unchanged.
- [ ] Listing `invoiceStatus` remains single-value; behavior unchanged.
- [ ] Equivalent status selections produce the same row set on listing vs export (e.g. listing `iomStatus=A,B` ≡ export `iomStatus: ["A","B"]`).

### Filtering — `projects`

- [ ] Listing accepts `projects` as comma-separated project IDs; DTO converts to array before query.
- [ ] Export accepts `projects` as a JSON array of project IDs.
- [ ] When the same project IDs are supplied, listing and export return the same filtered row set.
- [ ] `projects` filter intersects with user-authorized projects; unauthorized project IDs do not expose other users' data.
- [ ] Omitting `projects` preserves current implicit project scoping behavior.
- [ ] Invalid, duplicate, or empty-after-intersection project ID inputs are handled without errors that leak authorization information (define behavior in implementation: ignore invalid IDs vs 400—prefer consistency with existing listing validation patterns).

### Role-based columns

- [ ] Each defined role receives base columns plus only its role-specific additional columns.
- [ ] Roles not listed in the role matrix receive at minimum base columns only (unless existing auth rules map them to a listed role).
- [ ] When the client requests a custom column subset, exported columns are the **intersection** of requested columns and role-allowed columns.
- [ ] Role-restricted columns are never leaked to unauthorized roles.
- [ ] Column order is stable and deterministic across exports for the same role and column selection.

### Data fidelity and compatibility

- [ ] Missing/null role-specific or row-level field values export as empty string.
- [ ] Export file format is unchanged.
- [ ] Export API response structure is unchanged.
- [ ] Listing API response shape is unchanged; only new optional `projects` query parameter is added.
- [ ] Existing listing consumers not passing `projects` are unaffected.
- [ ] Existing export consumers not using new filter fields are unaffected.

### Validation checklist

- [ ] Listing row count === export row count for identical normalized filters.
- [ ] Filters applied correctly in export (spot-check: `iomStatus` multiselect, `invoiceStatus` multiselect, `projects` multiselect, date range, search).
- [ ] Role-restricted columns are not leaked across roles.
- [ ] Listing `iomStatus` / `invoiceStatus` contracts unchanged (regression tests).

## Non-Goals

- Changing listing `iomStatus` or `invoiceStatus` input formats or validation (export-only array support).
- Changing export file type, headers, or download delivery mechanism.
- Redesigning authentication/authorization beyond using the logged-in user's role for column allow-lists and project intersection.
- Frontend/UI implementation (backend API only); FE will send arrays for export multiselects and comma-separated `projects` on listing.

## Implementation Notes

- **Reuse over duplication:** Centralize filter application in the listing service path; export is a thin orchestration layer: normalize export DTO → resolve role → compute allowed columns → call listing (no pagination) → map rows to export format.
- **DTO separation for export multiselects:** Do not inherit listing validators for `iomStatus`/`invoiceStatus` on the export DTO if that would force comma-separated strings. Use a shared internal filter type (e.g. `IomListingFilters`) that both DTOs map into.
- **`projects` filter:** Add field to `ListIomListingDto` with `@Transform` (or equivalent) to parse comma-separated query values to array. Add `projects` array field to export DTO. Apply `IN (...)` or equivalent in `applyListingFilters`, always after intersecting with `resolveUserProjects`.
- **Careful `projects` handling:** Duplicates should be deduplicated. Unauthorized IDs must not broaden scope. Document whether all-invalid `projects` yields empty result or 400.
- **Pagination bypass:** Listing service supports non-paginated or export-mode invocation without altering default paginated listing behavior.
- **Role resolution:** Use the same role enum/constants and auth context already used in IOM modules.
- **Column intersection:** When custom columns are requested, filter to allowed set per existing export column-mapping behavior.
- **Testing focus:** Filter parity (listing vs export), export array normalization for status fields, `projects` parsing (listing comma-separated vs export array), project authorization intersection, per-role column sets, intersection logic, empty-string defaults.

## UI Notes

Backend-only story. Expected FE behavior:

- **Listing:** `projects` sent as comma-separated query param; `iomStatus` remains comma-separated; `invoiceStatus` remains single-select.
- **Export:** `iomStatus` and `invoiceStatus` sent as JSON arrays (multiselect); `projects` sent as JSON array of IDs.
- Export should pass filter values equivalent to the current listing view so exported data matches what the user sees.

## Assumptions

- IOM listing service can be invoked with arbitrary normalized filters and without pagination.
- Role identifiers (`CRM_TL`, `CRM_ADMIN`, `FINANCE_VERIFIER`, `FINANCE_ADMIN`, `LOYALTY`) map to existing application role enums used for IOM access control.
- Users with roles outside the matrix receive **base columns only** unless mapped by existing role hierarchy.
- Export request's existing `fields` column-mapping shape remains as implemented today.
- Project IDs in `projects` use the same identifier type as elsewhere in IOM/project scoping (numeric IDs unless codebase uses strings).
- Final-review change request (2026-06-19) supersedes prior guidance that listing should not gain explicit project ID filters.

## Open Questions

1. **Unlisted roles:** For users whose role is not in the role matrix, should export be forbidden, or should they receive base columns only?
2. **Empty column intersection:** If the client requests columns that are all disallowed for the role, should the API return 400 or export with base/default columns?
3. **Branch vs story key:** Work runs on branch `feature/PN-49` while story key is `PN-27-1`—confirm intentional linkage.
4. **Invalid `projects` IDs:** Return 400 for any invalid/unauthorized ID, or silently filter to authorized subset only?
5. **`invoiceStatus` listing multiselect:** Confirmed out of scope—listing stays single-value; only export gains array support.

## References

- Story execution: SDLC orchestrator execution `exec-f02320c0-05ba-404a-97fa-681a8eb4d08b`
- Final-review change request: 2026-06-19T17:23:02Z (export status arrays; new `projects` filter)
- Target spec path: `docs/ai/stories/PN-27-1/spec.md`
- Implementation plan: `docs/ai/stories/PN-27-1/implementation-plan.md` (update for R1a and R6)
- Context map: `docs/ai/context-map.json`
- Target implementation files: `export-iom-excel.dto.ts`, `list-iom-listing.dto.ts`, `iom-listing.service.ts`, `iom-export.service.ts`, related specs
