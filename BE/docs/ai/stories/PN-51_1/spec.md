# PN-51_1: Loyalty user listing

## Overview

Refine the existing IOM listing API so **Loyalty** users receive tab-specific listing behavior and corrected tab counts, without changing behavior for any other role. This is an enhancement to the current listing endpoint and query layer—not a new API.

## Goal

When the authenticated user’s role is **LOYALTY**:

1. Return paginated IOM records that respect the active tab (`listType`), all UI filters, and project scope.
2. Return tab counts for three Loyalty tabs only, computed with project scope but **without** UI filters.
3. Omit the `"all"` count and any counts object for non-Loyalty roles.

For all other roles, preserve existing listing, sorting, status visibility, and response shape.

## Scope

### In scope

- Modify the **existing** IOM listing API and its service/query logic.
- Loyalty-only branching when `role === LOYALTY` (or equivalent role constant used in the codebase).
- Loyalty listing: `listType`, filters, and `resolveEffectiveProjects`.
- Loyalty counts: `iomRequestInvoice`, `pendingSubmission`, `submittedInvoice`.
- Backward-compatible responses for non-Loyalty consumers.

### Out of scope

- Creating a new REST endpoint or versioned API.
- Changing listing, sorting, or status logic for non-Loyalty roles.
- Frontend/UI changes (API must support expected Loyalty tab behavior).
- Database schema migrations unless required by existing patterns (not indicated by story).

## Background

Loyalty users view IOMs in tabs driven by `listType`. Tab badges need stable counts across tabs (project-scoped only), while the listing itself must honor search, date, status, pagination, and the active tab. Other roles use role-wise actionable-first sorting and must not receive Loyalty-style counts.

## Requirements

### R1 — Role gating

- Apply all Loyalty-specific listing and count logic **only** when the caller’s role is **LOYALTY**.
- Non-Loyalty roles: no `counts` in the response; existing role-wise listing behavior unchanged.

### R2 — Loyalty listing

The listing query for Loyalty **must** respect:

| Input | Applied to listing? |
|-------|---------------------|
| `listType` (active tab) | Yes |
| Search | Yes |
| Date filters | Yes |
| Status / other UI filters | Yes |
| Pagination | Yes |
| Project scope via `resolveEffectiveProjects` | Yes |

`listType` should filter rows to the tab’s definition (aligned with count conditions in R4 where applicable).

### R3 — Loyalty counts shape

For Loyalty only, include a `counts` object with **exactly** these keys:

```json
{
  "iomRequestInvoice": 0,
  "pendingSubmission": 0,
  "submittedInvoice": 0
}
```

- Do **not** return an `"all"` count.
- Do **not** return counts for non-Loyalty roles.

### R4 — Loyalty counts computation rules

Counts **must**:

1. Always apply project filter using `resolveEffectiveProjects`.
2. **Ignore** search, date, pagination, status filters, and active tab (`listType`).
3. Be computed **independently** for all three tabs on every request (not derived from the current listing page).

| Count key | Condition |
|-----------|-----------|
| `iomRequestInvoice` | `invoice_id IS NULL` **AND** `invoice_status IS NULL` |
| `pendingSubmission` | `status = INVOICE_REQUESTED_FROM_VENDOR` |
| `submittedInvoice` | `status = INVOICE_SUBMITTED` |

### R5 — Non-Loyalty preservation

For roles other than LOYALTY:

- Ignore Loyalty `listType` / count logic entirely.
- Do **not** return a `counts` object.
- Preserve existing role-wise actionable-first sorting.
- Preserve existing status visibility and ordering logic.

### R6 — Shared query foundation

- Use `resolveEffectiveProjects` for **both** listing and counts.
- Build a shared base query scoped to effective projects.
- Apply UI filters **only** to the listing query.
- Apply **only** the project filter to count queries.

### R7 — Backward compatibility

- Existing non-Loyalty API consumers must see no breaking changes in response fields, ordering, or filtering.
- Loyalty consumers may rely on the new `counts` shape (three keys, no `all`).

## API contract (Loyalty)

**Response envelope:** Follow repository convention (`success-response-errors` REST style, global prefix `api`).

**Loyalty response shape (illustrative):**

```json
{
  "data": [ /* paginated IOM records for active listType + filters */ ],
  "counts": {
    "iomRequestInvoice": 12,
    "pendingSubmission": 5,
    "submittedInvoice": 28
  }
}
```

**Non-Loyalty response:** Same as today—`data` (and existing metadata/pagination fields); **no** `counts`.

> Exact pagination/metadata field names should match the current IOM listing endpoint; do not rename existing fields.

## Acceptance criteria

1. **AC1 — No new API:** Changes are confined to the existing IOM listing endpoint; no new route or controller action is added for this story.
2. **AC2 — Loyalty listing:** For `role === LOYALTY`, results match `listType`, all applied UI filters, pagination, and projects from `resolveEffectiveProjects`.
3. **AC3 — Loyalty counts keys:** Loyalty responses include `counts` with only `iomRequestInvoice`, `pendingSubmission`, and `submittedInvoice`; `"all"` is absent.
4. **AC4 — Counts ignore UI filters:** With search/date/status filters applied, Loyalty `counts` remain unchanged and reflect only project scope plus each tab’s count condition.
5. **AC5 — Counts ignore active tab:** Switching `listType` does not change how the three counts are computed; all three are always returned.
6. **AC6 — Count conditions:** Each count matches its SQL/ORM condition (`iomRequestInvoice`: null invoice fields; `pendingSubmission`: `INVOICE_REQUESTED_FROM_VENDOR`; `submittedInvoice`: `INVOICE_SUBMITTED`).
7. **AC7 — Project scope:** Listing and counts both use `resolveEffectiveProjects`; counts never include records outside effective projects.
8. **AC8 — Non-Loyalty unchanged:** Other roles receive no `counts`, and listing order, status visibility, and filters behave as before this change.
9. **AC9 — Regression safety:** Existing automated tests for non-Loyalty IOM listing pass; add or update tests covering Loyalty listing and counts behavior.

## Implementation notes

- Locate the existing IOM listing handler, DTO/query params (`listType`, filters), and service method that builds the listing query.
- Identify where role is resolved (auth context / guard / service) and branch Loyalty logic there or in a dedicated helper to keep non-Loyalty paths untouched.
- Reuse `resolveEffectiveProjects` for the base query; fork into:
  - **Listing branch:** base + `listType` + all request filters + pagination.
  - **Counts branch:** base + per-tab condition only (three parallel count queries or one aggregated query).
- Prefer efficient count queries (e.g., conditional aggregation) over loading full result sets.
- Map `listType` enum/string values to the three tab definitions consistently with count conditions.
- Ensure response DTO/serializer adds `counts` only for Loyalty to avoid leaking the field to other roles.

## Assumptions

- `LOYALTY`, `INVOICE_REQUESTED_FROM_VENDOR`, and `INVOICE_SUBMITTED` already exist as role/status constants in the codebase.
- `resolveEffectiveProjects` is the canonical project-scoping helper for IOM listing and is safe to call for both listing and counts.
- `listType` values for Loyalty tabs correspond to `iomRequestInvoice`, `pendingSubmission`, and `submittedInvoice` (or map 1:1 via existing enums).
- The current IOM listing API already accepts `listType` and filter parameters used by the Loyalty UI.
- Invoice fields are `invoice_id` and `invoice_status` on the IOM entity (or equivalent column names in the ORM layer).

## Open questions

1. **listType mapping:** Confirm exact `listType` enum/string values for each Loyalty tab and whether a former `"all"` tab is removed from the API or only omitted from counts.
2. **Mutually exclusive counts:** Clarify whether a record can appear in more than one count bucket, or if statuses are mutually exclusive by design.
3. **Empty projects:** Expected behavior when `resolveEffectiveProjects` returns no projects—empty `data` and zero counts vs. error response.
4. **Response wrapper:** Confirm whether `counts` sits at the top level alongside `data` or inside an existing nested payload (match current listing response structure).

## References

- **Story key:** PN-51_1  
- **Branch:** `feature/PN-51`  
- **Repository role:** Backend API only (NestJS)  
- **Context map:** `docs/ai/context-map.json`  
- **Target spec path:** `docs/ai/stories/PN-51_1/spec.md`
