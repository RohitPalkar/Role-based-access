# PN-1: Team Availability Excel Export + S3 Upload

## Overview

Implement a NestJS API endpoint that exports Team Availability data to an Excel workbook, uploads the generated file to S3, and returns a downloadable URL to the frontend. The API must not stream the Excel file directly in the HTTP response.

## Goal

Enable CRM Team Leads (`CRM_TL`) to export the full filtered Team Availability dataset as an Excel file hosted on S3, using the same filtering and access rules as the existing list API.

## User Story

As a **CRM Team Lead**, I want to **export team availability data to Excel** so that I can **download and share availability reports** outside the application.

## Scope

### In Scope

- Reusable Excel generation helper (`exceljs`, buffer output)
- S3 upload helper for Excel buffers (create or reuse existing)
- Service method `exportTeamAvailability` in `UserAvailabilityService`
- Controller endpoint `GET /users/team/availability/export`
- Role-based access for `CRM_TL` only
- Filter parity with existing team availability listing (status, project, search)
- Full export of filtered results (no pagination)

### Out of Scope

- Direct Excel file download from the API response body
- Frontend download UI implementation
- Changes to team availability business rules beyond export formatting
- New filters beyond those supported by `getTeamAvailability`

## Functional Requirements

### FR-1: Data Source

- Reuse the existing service method `getTeamAvailability(loggedInUser, query)`.
- Export must respect:
  - `status` filter
  - `project` filter
  - `search` filter
  - Role-based access for `CRM_TL`
- Pagination must **not** apply; export the complete filtered result set.

### FR-2: Excel Output

Generate an `.xlsx` file with columns in this **exact order**:

| # | Column Header     | Row Key / Source Field | Notes |
|---|-------------------|------------------------|-------|
| 1 | Employee ID       | `employeeId`           | |
| 2 | Employee Name     | `employeeName`         | |
| 3 | Email ID          | `email`                | |
| 4 | Project           | `project`              | Comma-separated project names |
| 5 | IOM Allotted      | `iomAllotted`          | |
| 6 | Status            | `statusLabel`          | |
| 7 | From Date & Time  | `fromDateTime`         | Empty string when status is AVAILABLE |
| 8 | To Date & Time    | `toDateTime`           | Empty string when status is AVAILABLE |

### FR-3: Export Inclusion Rules

- Include users even when they have:
  - No assigned projects
  - No active unavailability window
- When status is **AVAILABLE**, `From Date & Time` and `To Date & Time` must be empty strings.
- `Project` must be a comma-separated string of project names.

### FR-4: Excel Helper

Create `src/common/helpers/excel.helper.ts` with a reusable function:

```typescript
export async function generateExcelBuffer<T>(
  columns: { header: string; key: string; width?: number }[],
  data: T[],
): Promise<Buffer>
```

Requirements:

- Accept `columns` and `data`
- Dynamically generate Excel using `exceljs`
- Map rows using column `key` values
- Auto-size columns when `width` is not provided
- Return a `Buffer` via `workbook.xlsx.writeBuffer()` (not a filesystem path)
- Design for reuse by future export features

### FR-5: S3 Upload

- Upload the Excel buffer to S3 using a common helper at `src/common/helpers/s3-upload.helper.ts` (create or reuse existing).
- File naming convention: `team-availability-<timestamp>.xlsx`
- MIME type: Excel spreadsheet (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` or project-standard equivalent)
- Return a signed or public S3 URL suitable for frontend download

Expected helper signature:

```typescript
export async function uploadBufferToS3(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string>
```

### FR-6: API Endpoint

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/users/team/availability/export` |
| Query DTO | `ListTeamAvailabilityDto` (same as list endpoint) |
| Auth | `@UseGuards(RmAdminAuthGuard, RolesGuard)` |
| Role | `@Roles(RolesEnum.CRM_TL)` |

Controller sketch:

```typescript
@Roles(RolesEnum.CRM_TL)
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Get('team/availability/export')
async exportTeamAvailability(
  @User() user: { dbId: number },
  @Query() query: ListTeamAvailabilityDto,
) {
  return this.userAvailabilityService.exportTeamAvailability(user, query);
}
```

### FR-7: Response

Return a JSON payload containing the S3 file URL:

```json
{
  "success": true,
  "url": "https://s3.amazonaws.com/....xlsx"
}
```

The API must **not** return the Excel file as a direct binary/stream response.

## Acceptance Criteria

1. **AC-1:** `GET /users/team/availability/export` is available only to authenticated users with the `CRM_TL` role; unauthorized or unauthenticated requests are rejected by existing guards.
2. **AC-2:** Export honors the same `status`, `project`, and `search` query filters as the team availability list API.
3. **AC-3:** Export returns all matching records; pagination query parameters do not limit export row count.
4. **AC-4:** Generated Excel contains exactly 8 columns in the specified order with the specified headers.
5. **AC-5:** Excel rows correctly map employee ID, name, email, comma-separated projects, IOM allotted, status label, and from/to date-time values from `getTeamAvailability` results.
6. **AC-6:** Users with no projects and/or no active unavailability window are still included in the export.
7. **AC-7:** For AVAILABLE status rows, `From Date & Time` and `To Date & Time` cells are empty strings.
8. **AC-8:** `generateExcelBuffer` is implemented in `src/common/helpers/excel.helper.ts`, accepts columns + data, uses `exceljs`, and returns a buffer.
9. **AC-9:** Excel file is uploaded to S3 with filename pattern `team-availability-<timestamp>.xlsx`.
10. **AC-10:** API response is JSON with `success: true` and a valid `url` pointing to the uploaded file; no Excel bytes are returned in the response body.
11. **AC-11:** `exportTeamAvailability` is implemented in `UserAvailabilityService` and orchestrates data fetch, Excel generation, S3 upload, and URL return.
12. **AC-12:** Excel and S3 helpers are reusable for future export use cases.

## Implementation Notes

### Service Flow (`UserAvailabilityService.exportTeamAvailability`)

1. Call `getTeamAvailability(loggedInUser, query)` without applying pagination.
2. Transform each record into an Excel row object:
   - `employeeId`
   - `employeeName`
   - `email`
   - `project` (comma-separated names)
   - `iomAllotted`
   - `statusLabel`
   - `fromDateTime` (empty when AVAILABLE)
   - `toDateTime` (empty when AVAILABLE)
3. Define column metadata matching the required headers and keys.
4. Call `generateExcelBuffer(columns, rows)`.
5. Upload buffer via `uploadBufferToS3` with timestamped filename.
6. Return `{ success: true, url }`.

### Repository Conventions (from context map)

- **Repository role:** backend API only
- **API style:** REST
- **Global prefix:** `api` (non-prod may use `api/{NODE_ENV}`)
- **Response envelope:** `success-response-errors` — align export response with existing API response patterns while preserving the required `url` field for the frontend

### Target Files (expected)

| File | Action |
|------|--------|
| `src/common/helpers/excel.helper.ts` | Create |
| `src/common/helpers/s3-upload.helper.ts` | Create or reuse |
| `UserAvailabilityService` (existing module) | Add `exportTeamAvailability` |
| User availability controller (existing) | Add export endpoint |

### Deliverables

- `excel.helper.ts`
- `s3-upload.helper.ts` (or confirmed reuse of existing S3 helper)
- `exportTeamAvailability` service method
- Controller export endpoint
- Production-ready, clean implementation

## Assumptions

1. `getTeamAvailability` already enforces `CRM_TL` role-based data scoping; export inherits that behavior by reusing the method.
2. `ListTeamAvailabilityDto` is the correct query DTO for export filters and can be used without pagination for full export (e.g., by omitting page/limit or using an internal unpaginated code path).
3. An existing S3 integration or configuration is present in the codebase; if a helper already exists, extend or reuse it rather than duplicating upload logic.
4. `exceljs` is available or can be added as a dependency consistent with project standards.
5. S3 URL may be signed or public depending on existing project conventions; either is acceptable if the frontend can download the file.
6. Date/time values in Excel should use the same formatting as returned by `getTeamAvailability` unless the list API documents a specific display format.

## Open Questions

1. **Response envelope:** Story specifies `{ success: true, url }`. Should this be wrapped in the project's standard `success-response-errors` envelope (e.g., nested under `data`)? Confirm expected response shape for frontend integration.
2. **Timestamp format:** What timestamp format should be used in `team-availability-<timestamp>.xlsx` (Unix ms, ISO 8601, locale-specific)?
3. **S3 URL type:** Should the returned URL be a presigned (time-limited) URL or a permanent public URL?
4. **Unpaginated fetch:** Does `getTeamAvailability` support a no-pagination mode today, or does export need a dedicated internal call/flag to bypass pagination safely for large datasets?

## References

- Story key: **PN-1**
- Branch: `feature/PN-27`
- Context map: `docs/ai/context-map.json`
- Related deeper doc: `docs/PE-483-bulk-transaction-api-flow.md` (bulk/export flow patterns, if applicable during implementation)
