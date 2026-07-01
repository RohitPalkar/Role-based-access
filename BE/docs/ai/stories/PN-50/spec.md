# PN-50: IOM PDF Generation

## Overview

Complete the IOM (Internal Order Memo) PDF generation flow in the NestJS backend by enhancing the existing `getIomPdf` function. The implementation must reuse existing PDF helpers, HTML templates, and S3 upload utilities—no duplicate logic. Generated PDFs are uploaded to S3 and the relative path is persisted on the `ioms` record.

## Goal

End-to-end IOM PDF generation: fetch IOM data, resolve signatories (when applicable), render and merge PDFs via `PdfService.generatePdf`, upload to S3, update the database, and return the appropriate response based on call context.

## Background

- **Project:** NestJS backend API (`repositoryRole: backend-api-only`)
- **API style:** REST with global prefix `api` (non-prod: `api/{NODE_ENV}`)
- **Response envelope:** `success-response-errors`
- PDF templates and helpers already exist; this story wires them into `getIomPdf` in `iom-crm.service.ts`.
- **Final-review update (2026-06-19):** Use `PdfService.generatePdf` only (do not introduce `generatePdfFromInlineHtml`). The main IOM details template (`iom-details-pdf.html`) has been updated to embed inline CSS. Signature sections for roles with no resolved user must render blank. All date fields must use `DD-MM-YYYY` format.

## Scope

### In scope

- Modify `getIomPdf(iomId: number, loggedInUser?: LoggedInUser)` in `src/modules/iom/services/iom-crm.service.ts`
- Fetch full IOM details required for PDF rendering
- Role-based signatory resolution when called via `GET /iom/:id/pdf`
- PDF generation via `PdfService.generatePdf`, optional merge, S3 upload, DB update
- Differentiated behavior for API vs internal/background calls
- Date formatting as `DD-MM-YYYY` for all date placeholders in PDF output
- Blank signature sections when the respective role user is `null`

### Out of scope

- Creating new PDF helpers, S3 utilities, or duplicate Puppeteer/pdf-lib logic outside `PdfService`
- A separate `generatePdfFromInlineHtml` method on `PdfService`
- New database migrations (column `ioms.iom_pdf` already exists)
- Frontend or UI changes

## Requirements

### R1 — Data fetching

When generating a PDF, fetch IOM details for all PDF placeholders.

The HTML template (`iom-details-pdf.html`) contains placeholders such as:

- `{{iomNo}}` (or equivalent IOM number key)
- `{{projectName}}`
- `{{crmName}}` / creator fields
- `{{vendorName}}`
- `{{brokerageAmount}}` and related financial fields
- `{{statusLabel}}`
- `{{createdDate}}` / `{{iomCreatedAt}}` / `{{createdAt}}`
- Signature block placeholders (`preparedBy*`, `verifiedBy*`, `approvedBy*`, `financeVerifiedBy*`, `financeApprovedBy*`)
- `{{signatories}}` or per-role signature fields as defined in the template
- Additional fields present in the template (referrer/referee, points, `businessException`, etc.)

Every `{{ }}` placeholder in the HTML must be populated from DB data (or an explicit empty/default) before PDF generation.

### R2 — Signatory resolution (API calls only)

When `getIomPdf` is invoked from `GET /iom/:id/pdf` (i.e., `loggedInUser` is provided):

1. Include the **current logged-in user** as a signatory with role, name, designation (or role label), and signature.
2. Include **lower-hierarchy signatories down to the creator**, based on the logged-in user's role.
   - Example: if logged-in user is `CRM_TL`, include `crm_verified_by` (TL) and `created_by` (CRM user).
3. For each signatory slot, fetch user details and stored signature when a user exists.
4. Map signatories per `src/modules/iom/types/iom-signatory.interface.ts` (`IomSignatoryInfo` / `IomSignatoryBlock`).

**Null-user rule:** If the user for a given role/signature slot is `null`, the entire signature section for that role must remain **blank** in the PDF—no name, no role label, no signature image. Do not render placeholder text or partial data for missing users.

### R3 — Date formatting

All date fields rendered in the IOM PDF (main template and any merged attachment template) must use **`DD-MM-YYYY`** format.

Apply consistently to placeholders such as `createdDate`, `iomCreatedAt`, `createdAt`, `agreementDone` (when date-derived), `editedAt`, and any other date-valued template variables.

### R4 — PDF generation flow (strict order)

1. Map IOM data + signatory data → existing HTML template (`iom-details-pdf.html`, which now contains **inline CSS**).
2. Generate main PDF via **`PdfService.generatePdf`** only. Do **not** use `generatePdfFromInlineHtml` or any parallel HTML-only PDF entry point.
   - Because `iom-details-pdf.html` embeds styles inline, pass the rendered HTML to `generatePdf` per the service's existing contract (HTML with optional CSS parameter as supported by `PdfService`).
3. If `referral_points_edit_reason` content exists (non-empty `iom.referralPointsEditReason` text):
   - Generate its PDF using the same `PdfService.generatePdf` method and the referral edit reason template.
   - Merge with main PDF via `mergeWithMainPdf(mainPdf, referralPdf)`.
4. Upload final PDF to S3 via `awsService.uploadToS3(filePath, stream, isPrivate)`.
5. Update DB: `ioms.iom_pdf = <relative file path only>`.

### R5 — S3 path convention

- Path format: `exports/iom/iom-<iomId>-<timestamp>.pdf`
- Store **relative path only** in DB (no base URL).
- Resolve base URL only when returning API response.

### R6 — Call-context behavior

| Context | Signatory logic | Actions | Return value |
|---------|----------------|---------|--------------|
| Internal / background / workflow | No API signatory rules; use workflow-based signatory block without current-user inclusion | Generate → upload → update DB | Nothing (`void`) |
| `GET /iom/:id/pdf` API | Include current user + lower-hierarchy signatories per R2 | Generate → upload → update DB | See API contract below |

### R7 — Reuse existing assets (do not recreate)

| Asset | Location / signature |
|-------|---------------------|
| HTML template (inline CSS) | `src/templates/iom/iom-details-pdf.html` |
| CSS template (reference/legacy) | `src/templates/iom/iom-details-pdf.css` — styles are inlined in HTML; do not rely on external stylesheet resolution in Puppeteer |
| PDF generation | **`PdfService.generatePdf(html, css?)`** — sole public HTML-to-PDF entry point |
| PDF merge | `mergeWithMainPdf(mainPdf, attachmentPdf): Buffer` |
| S3 upload | `awsService.uploadToS3(filePath, stream, isPrivate)` |
| DB column | `ioms.iom_pdf` (relative path) |
| Signatory types | `src/modules/iom/types/iom-signatory.interface.ts` |

**Explicitly excluded:** `generatePdfFromInlineHtml` or equivalent duplicate method.

## API Contract

### Endpoint

`GET /iom/:id/pdf` (under global API prefix)

### Success response (API call)

```ts
{
  success: true,
  data: {
    filePath: "<relative path>",  // e.g. exports/iom/iom-123-1718784000000.pdf
    baseUrl: "<s3 base url>"
  }
}
```

Follows existing `success-response-errors` envelope conventions.

## Acceptance Criteria

1. **AC1:** `getIomPdf` in `iom-crm.service.ts` fetches all required IOM relations (project, CRM, vendor, financial details, status, createdBy, workflow-based verifiedBy users).
2. **AC2:** When called via `GET /iom/:id/pdf`, signatories are resolved role-driven: current logged-in user plus all lower-hierarchy signatories down to the creator, each with role, name, designation/role label, and signature when a user exists.
3. **AC3:** Signatories are mapped using the existing signatory interface types.
4. **AC4:** Main PDF is generated from `iom-details-pdf.html` (with inline CSS) via **`PdfService.generatePdf` only**—no `generatePdfFromInlineHtml`, no inline HTML string building outside templates, and no duplicate PDF logic.
5. **AC5:** When a role's resolved user is `null`, that role's signature section in the PDF is fully blank (no name, role, or signature image).
6. **AC6:** All date fields in the generated PDF use **`DD-MM-YYYY`** format.
7. **AC7:** When `referral_points_edit_reason` content exists, its PDF is generated via `generatePdf` and merged into the main PDF via `mergeWithMainPdf`.
8. **AC8:** Final PDF is uploaded to S3 at `exports/iom/iom-<iomId>-<timestamp>.pdf` using `awsService.uploadToS3`.
9. **AC9:** `ioms.iom_pdf` is updated with the relative path only (no base URL).
10. **AC10:** API calls return `{ success: true, data: { filePath, baseUrl } }` with base URL resolved at response time.
11. **AC11:** Internal/background calls complete generate → upload → DB update and return nothing.
12. **AC12:** No breaking changes to existing callers or API contracts; implementation is backward compatible.
13. **AC13:** No new duplicate PDF, S3, or template logic is introduced.

## Implementation Notes

- Primary touchpoint: `src/modules/iom/services/iom-crm.service.ts` → `getIomPdf`
- Inject `PdfService`, `AwsService`, and config as needed; import `PdfModule` in `iom.module.ts`.
- Use existing template-mapping patterns (e.g., `iom-pdf-template.mapper.ts`, `buildSignatoryBlock`, `buildIomDetailExtras`) rather than building HTML strings inline.
- **`PdfService.generatePdf`:** Use the existing/public method. Because `iom-details-pdf.html` now embeds CSS inline, rendered HTML can be passed without depending on Puppeteer resolving external `<link>` paths. Do not add `generatePdfFromInlineHtml`.
- **Signatory blank sections:** Template mapper must set all signature-related placeholders for a null role user to empty strings so the PDF renders an empty signature block.
- **Dates:** Format via existing date utilities (e.g., `formatDateUtil`) configured/output as `DD-MM-YYYY` for every date placeholder.
- Signatory hierarchy resolution should be role-driven; use workflow verification fields (`crm_verified_by`, etc.) and `created_by` as data sources.
- Timestamp in S3 filename should ensure uniqueness on regeneration.
- Determine `isPrivate` for S3 upload from existing conventions in similar export flows.
- Internal callers invoke `getIomPdf` without `loggedInUser`; preserve that contract.
- `referral_points_edit_reason` is the DB text column (`iom.referralPointsEditReason`), not a separate file attachment.

## UI Notes

Not applicable — backend-only story. PDF layout is defined by `iom-details-pdf.html` (inline CSS) and any supplementary referral edit reason template. Implement with existing repository styling conventions; do not introduce new frontend components.

## Constraints

- No duplicate PDF generation logic outside `PdfService`
- No `generatePdfFromInlineHtml`
- Must reuse `PdfService.generatePdf`, `mergeWithMainPdf`, and existing templates
- Inline CSS lives in `iom-details-pdf.html`; do not depend on external CSS file resolution at render time
- Null role users → blank signature sections
- All PDF dates → `DD-MM-YYYY`
- Role-driven signatory resolution for API path
- Backward compatible — no breaking changes
- Store relative S3 path in DB only

## Deliverables

- Updated `getIomPdf` implementation in `iom-crm.service.ts`
- Template mapper/helper wiring for placeholders, dates, and signatory blocks
- `PdfModule` import in `iom.module.ts` if not already wired
- Public `generatePdf` usage on `PdfService` (no new inline-HTML-specific method)
- Unit tests covering API vs internal calls, referral merge, null signatory blanks, and date formatting
- No breaking changes to existing behavior

## Open Questions

1. **Internal-call signatories:** For PDFs generated internally/background (no `loggedInUser`), confirm whether workflow-completed verifiers only, creator only, or no signatories should appear beyond the null-user blank-section rule.
2. **Signatory role hierarchy:** Full role hierarchy mapping (all roles → which `verified_by` fields to include) is illustrated only for `CRM_TL`. Confirm complete hierarchy for all IOM workflow roles.
3. **Regeneration behavior:** If `ioms.iom_pdf` already has a path, should `getIomPdf` always regenerate and overwrite, or return cached path when present?
4. **S3 `isPrivate` flag:** Confirm expected value for IOM PDF uploads from existing similar export flows.
5. **Referral edit reason template styling:** Should `iom-referral-edit-reason-pdf.html` also use inline CSS (matching the main template approach), or a separate `.css` file passed to `generatePdf`?

## Assumptions

- `iom-details-pdf.html` has been updated with inline CSS per final-review direction; external CSS file is not required at render time.
- `PdfService.generatePdf` is (or will be) the single public HTML-to-PDF method; no `generatePdfFromInlineHtml` will be added.
- `ioms.iom_pdf` column exists; no migration required.
- `GET /iom/:id/pdf` route exists or is wired to `getIomPdf` with `loggedInUser`; this story focuses on service-layer logic.
- Signatory interface fields align with role, name, designation/role label, and signature requirements.
- When a role user is `null`, blank means all template variables for that signature slot are empty strings.
- Date formatting standard for this story is **`DD-MM-YYYY`** regardless of other default formats elsewhere in the codebase.
- Branch `feature/PN-49` is the working branch; story key is PN-50.
- API auth provides `LoggedInUser` to the controller, passed through to the service.
- `referral_points_edit_reason` maps to non-empty `iom.referralPointsEditReason` text column.

## References

| Resource | Path |
|----------|------|
| Service to modify | `src/modules/iom/services/iom-crm.service.ts` |
| Signatory interface | `src/modules/iom/types/iom-signatory.interface.ts` |
| HTML template (inline CSS) | `src/templates/iom/iom-details-pdf.html` |
| CSS template (legacy/reference) | `src/templates/iom/iom-details-pdf.css` |
| PDF service | `src/modules/pdf/pdf.service.ts` |
| Referral edit reason template | `src/templates/iom/iom-referral-edit-reason-pdf.html` |
| Context map | `docs/ai/context-map.json` |
| Implementation plan | `docs/ai/stories/PN-50/implementation-plan.md` |
