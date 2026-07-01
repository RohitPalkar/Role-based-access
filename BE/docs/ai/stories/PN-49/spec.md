# PN-49: Export IOM List

## Overview

| Field | Value |
|-------|-------|
| **Story Key** | PN-49 |
| **Title** | Export IOM List |
| **Type** | Backend API feature |
| **Repository Role** | Backend API only (NestJS) |

## Goal

Create an IOM Excel export API in NestJS that generates a downloadable Excel file from the logged-in user's role-scoped IOM list, uploads it to S3, and returns the file path and base URL separately for the frontend to construct a download link.

## Requirements

### Functional

1. **Default column export** — When no `fields` are provided (undefined or empty), export Excel with **all listing columns** used by the existing IOM listing API **except** the columns excluded below (see Column Configuration).
2. **Selective column export** — When the frontend passes a `fields` array, export **only** the matching columns (including excluded default columns if explicitly requested).
3. **Role-based data scope** — Export only IOM records that fall into the logged-in user's bucket (role-based status filtering). Use the same rules as the IOM listing API.
4. **S3 upload** — Upload the generated Excel file to S3 via the existing AWS service.
5. **Separate URL parts** — Return the S3 object path (without base URL) and the S3 base URL as separate response fields so the client can compose the full download URL.

### Non-Functional / Architectural

1. **Reuse Excel helper** — Use the existing Excel builder at `src/common/helpers/excel.helper.ts`. Do **not** duplicate Excel generation logic.
2. **Reusable helper** — The Excel helper must remain module-agnostic (no IOM- or column-specific logic inside it) so it can be reused by IOM, Team Availability, and future modules (including potential PDF export).
3. **Reuse S3 upload** — Use `awsService.uploadToS3` for file upload.
4. **Shared role mapping** — Reuse or implement `getAllowedIomStatusesByRole(userRole): IomStatus[]` and use it in **both** the IOM listing API and the IOM Excel export API.
5. **Column config via constants** — Column definitions live in a dedicated constants file; no hardcoded columns in service or controller logic.
6. **Clean layering** — Controller → service → helper. No role logic in the controller. No duplicate Excel logic anywhere.

## Acceptance Criteria

- [ ] **AC-1:** `POST /iom/export/excel` is available and follows the repository REST API conventions (global prefix `api`; non-prod may use `api/{NODE_ENV}`).
- [ ] **AC-2:** Request body is optional. When `fields` is omitted or empty, the export includes all default IOM export columns derived from the IOM listing API, **excluding** `statusCode` (header: "Status Code") and `crmVerifiedBy` (header: "CRM Verified By ID").
- [ ] **AC-3:** When `fields` is provided, the export includes only columns whose keys match the requested field names (including `statusCode` or `crmVerifiedBy` if explicitly requested).
- [ ] **AC-4:** Exported rows are filtered by the logged-in user's role using `getAllowedIomStatusesByRole()` — identical bucket rules to the IOM listing API.
- [ ] **AC-5:** Excel generation uses `src/common/helpers/excel.helper.ts` with dynamic columns and data; the helper contains no module-specific or column-config logic.
- [ ] **AC-6:** The generated file is uploaded to S3 via `awsService.uploadToS3`.
- [ ] **AC-7:** Response uses the standard success envelope (`success-response-errors` pattern) with `data.fileUrl` (S3 path without base URL) and `data.baseUrl` (S3 base URL).
- [ ] **AC-8:** Column definitions are defined in `src/constants/iom-export.columns.ts` as `IOM_EXPORT_COLUMNS`, with default-export resolution excluding `statusCode` and `crmVerifiedBy`.
- [ ] **AC-9:** Service logic in `iom-export.service.ts` orchestrates: extract user role → resolve allowed statuses → fetch IOM list with status filter → resolve columns → generate Excel → upload to S3 → return path and base URL.
- [ ] **AC-10:** No role-based filtering logic is placed in the controller.
- [ ] **AC-11:** The Excel helper design does not block future PDF export reuse (generic input: columns + data → buffer/file reference).
- [ ] **AC-12:** Default export does **not** include the **Status Code** or **CRM Verified By ID** columns; the human-readable **Status** column (`statusLabel`) and **CRM Verified By** name column (`crmVerifiedByName`) remain in the default set.

## API Specification

### Endpoint

```
POST /iom/export/excel
```

With repository global prefix applied (e.g. `POST /api/iom/export/excel`).

### Request Body (optional)

```json
{
  "fields": ["iomNo", "projectName", "crmCreatedByName", "statusLabel"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fields` | `string[]` | No | Column keys to include. If undefined or empty, all default columns are exported (excluding `statusCode` and `crmVerifiedBy`). |

### Behavior

| Condition | Result |
|-----------|--------|
| `fields` undefined or empty | Export all columns from `IOM_EXPORT_COLUMNS` **except** `statusCode` and `crmVerifiedBy` |
| `fields` provided | Filter `IOM_EXPORT_COLUMNS` to only matching keys (may include excluded default columns if explicitly requested) |
| Any request | Data scoped to allowed IOM statuses for the authenticated user's role |

### Response (success)

```json
{
  "success": true,
  "data": {
    "fileUrl": "<s3-object-path-without-base-url>",
    "baseUrl": "<s3-base-url>"
  }
}
```

## Role-Based IOM Buckets (Mandatory)

Before fetching export data, resolve the user's role and allowed IOM statuses via `getAllowedIomStatusesByRole(userRole)`.

| Role | Allowed IOM Scope |
|------|-------------------|
| **CRM** | All IOMs |
| **CRM_TL** | All IOMs |
| **CRM_HEAD** | `CRM_HEAD_APPROVAL_PENDING`, `CRM_HEAD_REJECTED`, and all statuses above these in the workflow |
| **FINANCE** | `FINANCE_MEMBER_VERIFICATION_PENDING`, `FINANCE_MEMBER_REJECTED`, and all statuses above these in the workflow |
| **FINANCE_HEAD** | `FINANCE_APPROVER_APPROVAL_PENDING`, `FINANCE_APPROVER_REJECTED`, and all statuses above these in the workflow |
| **LOYALTY** | `POINTS_TO_BE_UPLOADED`, `POINTS_UPLOADED`, `INVOICE_SUBMITTED`, `INVOICE_REJECTED_BY_FINANCE`, `INVOICE_REQUESTED_FROM_VENDOR`, `IOM_CLOSED` |

This function must be shared between the IOM listing API and the IOM Excel export API.

## Column Configuration

Create or maintain `src/constants/iom-export.columns.ts` with flat keys aligned to `IomListItem` property names.

### Default-export exclusions (change request)

The following columns must **not** appear in the default export (when `fields` is omitted or empty):

| Header | Key | Reason |
|--------|-----|--------|
| Status Code | `statusCode` | Internal status code; not needed in default export |
| CRM Verified By ID | `crmVerifiedBy` | Internal user ID; not needed in default export |

The default export **should** still include the related human-readable columns:

| Header | Key |
|--------|-----|
| Status | `statusLabel` |
| CRM Verified By | `crmVerifiedByName` |

### Column resolution

- `IOM_EXPORT_COLUMNS` holds the full set of exportable columns (including `statusCode` and `crmVerifiedBy` for selective export).
- `resolveExportColumns(fields?)` behavior:
  - `fields` undefined or empty → return all `IOM_EXPORT_COLUMNS` **except** keys `statusCode` and `crmVerifiedBy`.
  - `fields` provided → filter `IOM_EXPORT_COLUMNS` by matching keys; throw `400 BadRequestException` for unknown keys.

### Representative column set

```typescript
export const IOM_EXPORT_COLUMNS: IomExportColumn[] = [
  { header: 'ID', key: 'id', width: 10 },
  { header: 'IOM No', key: 'iomNo', width: 15 },
  { header: 'Project', key: 'projectName', width: 20 },
  // ... all other IomListItem exportable fields ...
  { header: 'Status Code', key: 'statusCode', width: 22 },           // excluded from default
  { header: 'Status', key: 'statusLabel', width: 22 },
  { header: 'CRM Verified By ID', key: 'crmVerifiedBy', width: 14 }, // excluded from default
  { header: 'CRM Verified By', key: 'crmVerifiedByName', width: 18 },
  // ... remaining columns ...
];
```

Omit non-exportable/internal listing fields (`pdfBasePath`, `pdflink`, `iomPdfAvailable`) unless product confirms otherwise.

## Implementation Notes

### Service flow (`iom-export.service.ts`)

1. Extract logged-in user role from request context.
2. Resolve allowed statuses via `getAllowedIomStatusesByRole()`.
3. Fetch IOM list using the **existing listing query**, applying the role-based status filter (no pagination).
4. Resolve export columns:
   - `fields` provided → filter `IOM_EXPORT_COLUMNS` by matching `key` values.
   - `fields` not provided → use all `IOM_EXPORT_COLUMNS` **minus** `statusCode` and `crmVerifiedBy`.
5. Call the Excel helper with resolved columns and row data.
6. Upload the generated buffer/file to S3 via `awsService.uploadToS3`.
7. Return `fileUrl` (path without base URL) and `baseUrl`.

### Excel helper (`src/common/helpers/excel.helper.ts`)

- Accept dynamic columns and row data.
- Generate Excel workbook.
- Return buffer or file reference.
- Must **not** contain column definitions or module-specific logic.

### Controller

- Expose `POST /iom/export/excel`.
- Delegate all business logic to `iom-export.service.ts`.
- Return the standard success envelope with `fileUrl` and `baseUrl`.

### Reuse targets

| Asset | Path / Service |
|-------|----------------|
| Excel helper | `src/common/helpers/excel.helper.ts` |
| S3 upload | `awsService.uploadToS3` |
| Role status mapping | `getAllowedIomStatusesByRole()` in `iom-role-status.util.ts` |
| IOM listing query | `IomListingService.findAllForExport()` |
| Column source of truth | `src/modules/iom/types/iom-list-item.interface.ts` |

## Constraints

- No duplicate Excel generation logic.
- No role logic in the controller.
- Column configuration driven only by constants.
- Default export must exclude `statusCode` and `crmVerifiedBy`.
- Excel helper must remain reusable for future modules (Team Availability, PDF export, etc.).
- Maintain separation: controller → service → helper.

## Out of Scope

- Frontend download UI implementation.
- PDF export (future; helper design should not preclude it).
- New authentication or authorization mechanisms beyond existing role-based IOM bucket rules.

## Assumptions

- An authenticated user context with role information is already available on IOM endpoints (same as listing API).
- `getAllowedIomStatusesByRole()` is shared between listing and export via `iom-role-status.util.ts`.
- The existing IOM listing query can be reused with a status filter and without pagination for export.
- S3 bucket configuration and base URL resolution are already handled by `awsService.uploadToS3` and existing patterns in the codebase.
- Request `fields` values map to the `key` property in `IOM_EXPORT_COLUMNS`; unknown field names return `400 BadRequestException`.
- Export is **role-scoped only** (no search/date/sort query params on the export endpoint).
- Empty role-scoped result returns a valid Excel file with headers only (no 404).
- Excluding `statusCode` and `crmVerifiedBy` from the default set is intentional per final review; selective export may still include them when explicitly requested in `fields`.

## Open Questions

1. **Selective export of excluded columns** — If the frontend explicitly passes `fields: ["statusCode"]` or `fields: ["crmVerifiedBy"]`, should those columns be allowed? Current assumption: yes, since the exclusion applies only to the default column set.
2. **Listing query filters** — Export does not honor listing search/date/sort filters; only role-based scope applies. Confirm with product if additional filters are needed later.

## References

- Context map: `docs/ai/context-map.json` (API prefix, response envelope, commands)
- Excel helper: `src/common/helpers/excel.helper.ts`
- Export service: `src/modules/iom/services/iom-export.service.ts`
- Column constants: `src/constants/iom-export.columns.ts`
- Branch: `feature/PN-49`
