# PN-50 Implementation Plan: IOM PDF Rendering, Data Binding, and API Fix

## Summary

Fix the IOM PDF pipeline so generated PDFs visually match the original HTML UI (card borders, shadows, rounded corners, spacing, colored payment boxes), all `{{placeholders}}` render with correct data (or `"-"` when missing), existing `iom_pdf` paths are overwritten on regeneration, and the API returns `{ basePath, filePath }`.

**Baseline:** Core orchestration in `getIomPdf` is already implemented on `feature/PN-49`. Remaining work is **CSS hardening for Puppeteer print mode**, **mapper fallback rules**, **API response key rename**, and **targeted tests**.

**Primary root cause of flat cards:** Puppeteer calls `page.emulateMediaType('print')`, so `@media print { .iom-card { box-shadow: none; } }` strips shadows. Borders exist in CSS but may be too subtle against the gray page background; payment sub-boxes use `border: 1px solid transparent` until a color modifier applies.

---

## Current State

| Area | Status | Gap |
|------|--------|-----|
| `getIomPdf` flow | Done | Always regenerates + overwrites DB — verify no early-return on existing `iomPdf` |
| `PdfService.generatePdf` | Done | Already uses `printBackground: true` + `emulateMediaType('print')` — **do not change signature** |
| Inline CSS in `iom-details-pdf.html` | Partial | Print block removes shadows; cards lack `display: block` + card-level `print-color-adjust` |
| Placeholder mapping | Partial | Returns `''` for missing values; change request wants `"-"` for data fields |
| API response | Wrong key | Service returns `{ filePath, baseUrl }`; change request requires `{ filePath, basePath }` |
| `referralPointsEditor` join | Done | Already joined in `loadIomForPdfOrThrow`; mapper uses `referralPointsEditor?.name` |

---

## Implementation Steps

### Step 1: Harden inline CSS for Puppeteer print rendering (highest priority)

**Files:** `src/templates/iom/iom-details-pdf.html`, `src/templates/iom/iom-referral-edit-reason-pdf.html`

Edit only the existing `<style>` blocks. Do **not** add external CSS or `<link>` tags.

#### 1a. Global print-color and layout defaults

On `body` and every card container (`.iom-card`, `.iom-page`):

```css
-webkit-print-color-adjust: exact;
print-color-adjust: exact;
```

Set `body { background-color: #ffffff; }` as the default (not only inside `@media print`). Keep the gray `#f4f6f8` page feel via `.iom-page` padding if desired, but body must be explicitly white.

#### 1b. Strengthen `.iom-card` base rules (both templates)

Ensure every card has explicit, non-inherited properties:

```css
.iom-card {
  display: block;
  box-sizing: border-box;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;   /* or keep #dadada — match original UI */
  border-radius: 8px;
  padding: 16px;
  margin: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

Do **not** rely on CSS variables or inherited font/color defaults without explicit values on child elements.

#### 1c. Fix `@media print` — stop flattening cards

In `iom-details-pdf.html` (~lines 366–389), **replace** `box-shadow: none` with a PDF-safe shadow **or** rely on a stronger border:

```css
@media print {
  body {
    background-color: #ffffff;
  }

  .iom-card {
    display: block;
    box-sizing: border-box;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);  /* do NOT set to none */
    break-inside: avoid;
    page-break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* keep existing break-inside rules on .iom-two-col, .iom-payment-grid, etc. */
}
```

Audit the stylesheet for rules that flatten layout:
- Remove or override any `border: none` on card containers.
- Remove `overflow: hidden` on parents of `.iom-card` (none found today — verify during edit).
- Ensure `.iom-stack` gap/padding are explicit.

#### 1d. Payment sub-box borders and backgrounds

Payment boxes currently use `border: 1px solid transparent` in the base rule. For PDF, each color modifier (`.iom-payment-box--blue`, etc.) must explicitly set:
- `background-color`
- `border: 1px solid <matching-color>` (not transparent)
- `border-radius: 8px`
- `padding: 16px`
- `print-color-adjust: exact`

Add the same explicit treatment inside `@media print` if any modifier backgrounds are dropped.

#### 1e. Mirror changes in referral attachment template

Apply the same `.iom-card` base rules and `@media print` treatment to `iom-referral-edit-reason-pdf.html` (its print block currently also sets `box-shadow: none`).

#### 1f. Font fallback

Keep `'Public Sans'` first but ensure the full fallback stack is present (already mostly done). Do not add external font `<link>` tags.

---

### Step 2: Fix data binding — `"-"` fallback for missing values

**File:** `src/modules/iom/helpers/iom-pdf-template.mapper.ts`

#### 2a. Inventory placeholders

All placeholders in `iom-details-pdf.html`:

| Placeholder | Source (current) |
|-------------|------------------|
| `iomNo`, `statusLabel`, `iomCreatedAt`, `createdAt`, `crmCreatedByName` | IOM entity + status + creator |
| `customerName`, `referrerBpCode`, `referrerProject`, `referrerLocation`, `referrerUnitNo`, `referrerBookingDate` | IOM JSON + extras |
| `refereeCustomerName`, `bpCode`, `refereeProject`, `refereeLocation`, `refereeUnitNo`, `refereeBookingDate` | IOM + extras |
| `basicSalePrice`, `brokeragePercent`, `brokerageAmount`, `pointsAdjustmentType`, `pointsToReferrer`, `pointsReferrerAmount`, `pointsToReferee`, `pointsRefereeAmount` | IOM financial fields |
| `preparedBy*`, `verifiedBy*`, `approvedBy*`, `financeVerifiedBy*`, `financeApprovedBy*` | Signatory block |
| `businessException`, `sourceInSAP`, `sourceInSalesforce`, `agreementDone`, `referrerPaid`, `refereePaid` | IOM fields |

Referral template: `iomNo`, `editedAt`, `editedByName`, `editReason`.

#### 2b. Add a display fallback helper

```ts
const PDF_EMPTY = '-';

const withPdfFallback = (value: string): string =>
  value?.trim() ? value.trim() : PDF_EMPTY;
```

Apply `withPdfFallback` to **all data/text/number placeholders** in `buildIomDetailsTemplateVars` and `buildReferralEditReasonTemplateVars`.

**Exceptions (must stay blank, not `"-"`):**
- Signatory fields when `userId == null`: `*Name`, `*Role`, `*SignatureUrl` → keep `''` per spec AC5.
- `businessException` when no edit reason → keep `''` (section may be empty).
- `agreementDone` → keep formatted date or literal `'No'` (not `"-"`).

Update `fmtNumber` and date formatters to return `'-'` instead of `''` when value is null/invalid (except signatory slots).

#### 2c. Verify DB relations cover all placeholders

`loadIomForPdfOrThrow` already joins: `project`, `creator`, `crmVerifier`, `crmApprover`, `finVerifier`, `finApprover`, `status`, `booking`, `invoice`, `referralPointsEditor`.

No new joins expected. If QA finds a specific field still blank, trace its source in `buildIomDetailExtras` (referrer/customer JSON keys) before adding joins.

#### 2d. Harden `substituteTemplateVars`

After building vars, optionally assert no unreplaced `{{token}}` remain in rendered HTML (dev/test guard). At minimum, ensure every template key exists in the vars map so `substituteTemplateVars` never leaves raw `{{...}}` in output.

---

### Step 3: Confirm PDF generation contract (no signature changes)

**File:** `src/modules/iom/services/iom-crm.service.ts`

The change request references `generateIomPdf`; the actual entry point is **`PdfService.generatePdf(html, css?)`**. Use it exactly as today:

```ts
let finalPdf = await this.pdfService.generatePdf(mainHtml);
// reason branch: this.pdfService.generatePdf(reasonHtml)
```

Rules:
- Pass fully substituted HTML (inline CSS already in template).
- Do **not** pass a second CSS argument (styles are embedded).
- Do **not** add `generatePdfFromInlineHtml` call sites.
- Do **not** modify `PdfService.generatePdf` signature.

`PdfService` already sets `printBackground: true` and `page.emulateMediaType('print')` — no change needed unless visual QA still fails after CSS fixes.

---

### Step 4: Replace existing PDF in DB (verify overwrite behavior)

**File:** `src/modules/iom/services/iom-crm.service.ts`

Current code already:
1. Generates a new timestamped path: `exports/iom/iom-${id}-${Date.now()}.pdf`
2. Uploads to S3
3. `iomRepo.update({ id }, { iomPdf: filePath })`

**Verify:** There is no early return when `iom.iomPdf` is already set. Every call must regenerate, upload, and overwrite the column. Old S3 objects may remain orphaned — acceptable per spec.

---

### Step 5: Fix API response — return `basePath` + `filePath`

**Files:**
- `src/modules/iom/services/iom-crm.service.ts`
- `src/modules/iom/services/iom-crm.service.spec.ts`
- `src/modules/iom/iom.controller.spec.ts` (if it asserts response shape)

Change the API return type and payload:

```ts
// Before
Promise<{ filePath: string; baseUrl: string } | void>

// After
Promise<{ filePath: string; basePath: string } | void>
```

Implementation:

```ts
const basePath = this.configService.get<string>('AWS_S3_ACCESS_URL') ?? '';
// ... generation ...
return { filePath, basePath };
```

- `filePath` — relative S3 key stored in DB (no base URL prefix).
- `basePath` — S3 base URL from `AWS_S3_ACCESS_URL` (same value previously called `baseUrl`).

The global `ResponseInterceptor` wraps this as:

```json
{
  "success": true,
  "response": {
    "statusCode": 200,
    "message": "...",
    "data": {
      "filePath": "exports/iom/iom-123-<timestamp>.pdf",
      "basePath": "https://..."
    }
  },
  "errors": null
}
```

Controller (`GET :id/pdf`) needs no logic change — it already returns the service result directly.

**Note:** This supersedes the original spec's `baseUrl` key for this endpoint per the final-review change request.

---

### Step 6: Strengthen unit tests

**File:** `src/modules/iom/services/iom-crm.service.spec.ts`

Update existing test: `'generates, uploads, updates DB, and returns filePath + baseUrl'` → assert `basePath` instead of `baseUrl`.

Add cases:
1. **Regeneration overwrite** — IOM with existing `iomPdf: 'exports/iom/old.pdf'` still uploads new file and updates DB (no cache short-circuit).
2. **`generatePdf` contract** — called with HTML string only (no second CSS arg) for main and referral branches.
3. **Signatory scoping** — `CRM_TL` caller strips signatures from higher slots without `hasActed`.

**File:** `src/modules/iom/helpers/iom-pdf-template.mapper.spec.ts`

Add cases:
1. Missing scalar fields render as `'-'`.
2. Null signatory `userId` still renders blank name/role/url (not `'-'`).
3. `agreementDone` → date or `'No'`.
4. `editedByName` populated when `referralPointsEditor` present.

Optional: load real template HTML in mapper spec and assert no remaining `{{...}}` after substitution.

---

### Step 7: Visual verification (manual)

After CSS + mapper changes:

1. Call `GET /api/{NODE_ENV}/iom/:id/pdf` for an IOM with full data.
2. Download PDF from S3 (`basePath + filePath`).
3. Compare against original HTML UI (img1 reference):
   - White page background
   - Card borders visible (`#e5e7eb` / `#dadada`)
   - Rounded corners on cards and payment boxes
   - Subtle but visible box-shadow on cards
   - Colored payment box backgrounds preserved
   - All data fields show values or `"-"`
   - Null-role signature blocks fully blank
   - Dates in `DD-MM-YYYY`
4. Call endpoint again — confirm new timestamped `filePath` in response and DB.

---

## Target Files

| File | Action |
|------|--------|
| `src/templates/iom/iom-details-pdf.html` | Harden inline CSS: card borders/shadows, print rules, payment box borders, `print-color-adjust` |
| `src/templates/iom/iom-referral-edit-reason-pdf.html` | Mirror card/print CSS fixes |
| `src/modules/iom/helpers/iom-pdf-template.mapper.ts` | Add `"-"` fallback for data fields; keep signatory blanks empty |
| `src/modules/iom/services/iom-crm.service.ts` | Rename `baseUrl` → `basePath` in return; verify overwrite + `generatePdf` usage |
| `src/modules/iom/services/iom-crm.service.spec.ts` | Update/add tests for `basePath`, regeneration, scoping |
| `src/modules/iom/helpers/iom-pdf-template.mapper.spec.ts` | Add `"-"` fallback and placeholder coverage tests |

**Inspect only (expect no changes unless QA fails):**
- `src/modules/iom/iom.controller.ts`
- `src/modules/iom/iom.module.ts`
- `src/modules/pdf/pdf.service.ts`
- `src/modules/iom/types/iom-signatory.interface.ts`
- `src/modules/iom/entities/iom.entity.ts`

**Do not create:** new PDF helpers, migrations, external CSS files, or `generatePdfFromInlineHtml` usage.

---

## Context Budget

For the code-implementer agent:

- **Inspect target files first** — do not broad-scan the repo.
- Open non-target files only for direct imports, callers, tests, or config: placeholder names in the two HTML templates, `PdfService.generatePdf` signature, `ResponseInterceptor` envelope shape.
- **Do not** read `node_modules/`, `.opencode/executions/`, build artifacts, or generated folders.
- Use provider-native edit tools directly; do not paste full file contents, full diffs, or large code blocks in chat.
- Run only the validation commands below for the changed surface.

---

## Validation Commands

```bash
# Mapper unit tests
npm run test -- src/modules/iom/helpers/iom-pdf-template.mapper.spec.ts

# Service unit tests (getIomPdf)
npm run test -- src/modules/iom/services/iom-crm.service.spec.ts

# Lint + compile
npm run lint
npm run build
```

**Manual smoke (non-prod):**

1. `GET /api/{NODE_ENV}/iom/:id/pdf` as authorized CRM user.
2. Response: `{ success: true, response: { data: { filePath, basePath } } }`.
3. PDF visually matches original HTML (cards with borders/shadows, not flat img2).
4. Missing data fields show `"-"`; null signatory slots are blank.
5. Second call overwrites `ioms.iom_pdf` with new timestamped path.

---

## Acceptance Criteria Mapping

| Requirement | Verification |
|-------------|--------------|
| Card borders, shadows, rounded corners in PDF | Manual PDF vs HTML; `@media print` no longer strips shadows; explicit borders on cards and payment boxes |
| Layout matches original UI | White body, explicit padding/margins, no clipped borders |
| All placeholders populated | Mapper spec + no raw `{{...}}` in rendered HTML |
| Missing data → `"-"` | Mapper spec; signatory null slots stay blank |
| Dates `DD-MM-YYYY` | Existing `formatIomPdfDate` — do not regress |
| `PdfService.generatePdf` only | Service spec asserts single-arg calls |
| `printBackground` + print media | Already in `pdf.service.ts` — no change |
| Overwrite existing `iom_pdf` | Service spec with pre-existing `iomPdf` value |
| API returns `basePath` + `filePath` | Service spec + manual API check |
| DB stores relative path only | Existing `iomRepo.update({ iomPdf: filePath })` |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Puppeteer still ignores subtle shadows | Use stronger `box-shadow: 0 2px 8px rgba(0,0,0,0.12)` in print block; rely on explicit `1px solid` border as fallback |
| `"-"` applied to signatory blanks | Exclude signatory keys in `mapSignatorySlot`; test explicitly |
| `basePath` rename breaks FE expecting `baseUrl` | Change request explicitly supersedes spec; coordinate with FE if needed |
| Colored payment boxes still flat | Explicit `background-color` + non-transparent borders + `print-color-adjust: exact` on each modifier |
| Orphan S3 files on regeneration | Acceptable; no deletion in scope |

---

## Assumptions

1. `PdfService.generatePdf` is the function referenced as "generateIomPdf" in the change request — same behavior, no signature change.
2. `iom-details-pdf.html` inline CSS is authoritative; deleted `iom-details-pdf.css` is not used at runtime.
3. Null signatory blanking remains keyed on `IomSignatoryInfo.userId == null` — these fields must **not** show `"-"`.
4. S3 upload continues with `isPrivate: true` (existing convention).
5. PDF is regenerated on every `getIomPdf` call; DB path is always overwritten.
6. `AWS_S3_ACCESS_URL` is the correct config key for `basePath`.
7. Internal/background callers (no `loggedInUser`) continue to receive `void` with no API payload.
