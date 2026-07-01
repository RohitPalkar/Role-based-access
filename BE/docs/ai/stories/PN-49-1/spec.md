# PN-49-1: Team Availability Changes

## Overview

Add soft-delete support for `user_availability` records, align Team Availability export filtering with the listing API, and update Team Availability listing so that users with a **running** or **upcoming** active unavailable window surface that window in the list instead of reflecting only their moment-in-time availability status.

| Field | Value |
|-------|-------|
| **Story Key** | PN-49-1 |
| **Title** | Team availability changes |
| **Branch** | `feature/PN-49` |
| **Repository Role** | Backend API only |

## Goals

1. Introduce `is_deleted` soft-delete semantics on `user_availability` without hard-deleting rows.
2. Ensure Team Availability export applies the same filters as listing (`status`, `search`, `project`) and returns the same row set as listing (without pagination).
3. **Update Team Availability listing** so that when a user has a running or upcoming active unavailable window, that window is returned in the listing row instead of showing only their current moment-in-time status (e.g., AVAILABLE while a future window is scheduled).
4. Preserve all other existing listing, export, and availability behavior outside the explicitly defined changes.

---

## Requirements

### Part 1: `user_availability` Soft Delete (`is_deleted`)

#### Schema

- Add column `is_deleted` (`TINYINT` / boolean) to `user_availability`.
- Default value: `0`.

#### Active Availability Definition

A row is **active** when:

- `cancelled_at IS NULL`
- `is_deleted = 0`

#### Mark User AVAILABLE Flow

When a user is marked available:

- Update all active availability rows for that user:
  - Set `cancelled_at = now`
  - Set `cancelled_by = logged-in user`
  - Set `is_deleted = 1`
- Do **not** hard-delete rows.

> **Note:** The in-progress (early-end) `markAvailable` path may continue to omit `cancelled_at` / `cancelled_by` per existing semantics, but must still set `is_deleted = 1`. Confirm with product if strict AC literal compliance is required.

#### Overlap Prevention (Create Availability)

Block creation of new availability when at least one row exists where:

- `cancelled_at IS NULL`
- `is_deleted = 0`
- `unavailable_to >= now`

#### Query Updates

- All existing queries that read or evaluate active availability must add: `ua.is_deleted = 0`.
- No other behavior change in those queries.

---

### Part 2: Team Availability Export Filter Parity

#### Golden Rule

Listing logic is the **single source of truth** for which rows are included and what availability data each row contains.

#### Export API Behavior

Export must:

- Accept the same query parameters as listing:
  - `status`
  - `search`
  - `project`
- Apply identical filters as listing.
- Export only filtered results.
- Reflect the same per-user availability window data as listing (including Part 3 window resolution).

#### Implementation Contract

Export **must** call:

```text
getTeamAvailability(loggedInUser, query, { skipPagination: true })
```

Export **must not**:

- Build separate queries.
- Reapply filters manually.
- Access repositories directly.

#### Pagination

- Use `skipPagination: true`.
- Export all matching rows (no page limit).

---

### Part 3: List Running or Upcoming Unavailable Windows (Change Request)

#### Problem

Team Availability listing currently derives each user's displayed availability from their **status at query time**. A user who is momentarily AVAILABLE but has a scheduled upcoming unavailable window may appear as AVAILABLE with no window details. Review feedback requires surfacing active unavailable windows when they exist.

#### Window Definitions

An **active unavailable window** is a `user_availability` row where:

- `cancelled_at IS NULL`
- `is_deleted = 0`
- `unavailable_to >= now`

Within active rows:

| Type | Condition |
|------|-----------|
| **Running** | `unavailable_from <= now` AND `unavailable_to >= now` |
| **Upcoming** | `unavailable_from > now` AND `unavailable_to >= now` |

#### Listing Behavior

For each user in the Team Availability listing (`getTeamAvailability`):

1. If the user has a **running** active unavailable window, the listing row must include that window (dates, reason, and related fields already exposed by the API) instead of showing only a moment-in-time AVAILABLE status.
2. Else if the user has an **upcoming** active unavailable window, the listing row must include that upcoming window instead of showing only a moment-in-time AVAILABLE status.
3. If the user has no running or upcoming active unavailable window, retain existing listing behavior for that user (AVAILABLE with no active window).
4. When multiple active windows could apply, prefer the **running** window over upcoming; among upcoming windows, prefer the **nearest** by `unavailable_from` (earliest start).
5. Soft-deleted or cancelled rows (`is_deleted = 1` or `cancelled_at IS NOT NULL`) must never be surfaced as the listed window.

#### Scope of Change

- Applies to **Team Availability listing** and, by delegation, **export** (same `getTeamAvailability` path).
- Response shape and field names remain unchanged; only the **values** populated per user change when a running/upcoming window exists.
- `status` filter semantics must remain consistent: a user with a running or upcoming active unavailable window should be treated as **UNAVAILABLE** for filtering purposes (not shown as AVAILABLE solely because `now` is before `unavailable_from`).

#### Likely Touch Points

- `getTeamAvailability` — per-user window resolution and status derivation.
- `resolveRelevantWindow` / `loadActiveWindowsForUsers` — resolve which active window to attach per user.
- Unit tests in `user-availability.service.spec.ts` for running, upcoming, and no-window scenarios.

---

## Acceptance Criteria

### Soft Delete

- [ ] Migration adds `is_deleted` to `user_availability` with default `0`.
- [ ] Active availability is defined as `cancelled_at IS NULL AND is_deleted = 0`.
- [ ] Mark-user-available flow soft-deletes active rows (`is_deleted = 1`; `cancelled_at` / `cancelled_by` per existing branch semantics) and never hard-deletes.
- [ ] New availability creation is blocked when an active row exists with `unavailable_to >= now`.
- [ ] All existing availability queries include `ua.is_deleted = 0` where active rows matter.
- [ ] Soft-deleted rows are never treated as active in listing, overlap checks, or related logic.

### Export Filter Parity

- [ ] Export accepts `status`, `search`, and `project` query params (same as listing).
- [ ] Export delegates to `getTeamAvailability(loggedInUser, query, { skipPagination: true })`.
- [ ] Export does not duplicate filter logic or query repositories directly.
- [ ] Row count from export matches listing count for the same filters.
- [ ] Export format and columns are unchanged.
- [ ] Export rows reflect the same per-user window data as listing (Part 3).

### Running / Upcoming Window Listing (Change Request)

- [ ] User with a **running** active unavailable window: listing row shows that window and UNAVAILABLE status, not moment-in-time AVAILABLE.
- [ ] User who is momentarily AVAILABLE but has an **upcoming** active unavailable window: listing row shows the upcoming window (dates/reason) instead of appearing fully AVAILABLE with no window.
- [ ] User with no running or upcoming active window: listing behavior unchanged.
- [ ] Running window takes precedence over upcoming when both could apply.
- [ ] `status=UNAVAILABLE` filter includes users with upcoming active windows; `status=AVAILABLE` excludes them.
- [ ] Soft-deleted or cancelled windows are never listed as the active window.

### Non-Regression

- [ ] Listing API response shape is unchanged (field names, pagination, envelope).
- [ ] Export response format is unchanged:

```json
{
  "success": true,
  "data": {
    "fileUrl": "<path without base url>",
    "basePath": "<s3 base url>"
  }
}
```

- [ ] No impact on other existing exports.
- [ ] IOM assignment `loadUnavailableUserIds` continues to consider only users unavailable **at assignment time** (running window), not upcoming-only windows.

---

## Validation

| Check | Expected Result |
|-------|-----------------|
| Listing count vs export rows | Equal for same `status` / `search` / `project` |
| Filter respect | Export honors all three filters |
| Upcoming window listing | User AVAILABLE now + future window → row shows upcoming window, not bare AVAILABLE |
| Running window listing | User in active window → row shows running window |
| Status filter | Upcoming-window users appear under UNAVAILABLE, not AVAILABLE |
| Availability logic | Existing flows unaffected except soft-delete and window listing semantics |
| Soft-deleted rows | Never appear as active or listed windows |
| IOM assignment | Only currently unavailable users excluded (not upcoming-only) |

---

## Implementation Notes

### Database

- Create migration via: `npm run migration:create -- src/migrations/<Name>`
- Run with: `npm run migration:run`
- Revert if needed: `npm run migration:revert`

### API Conventions

- REST style; global prefix `api` (non-prod: `api/{NODE_ENV}`).
- Response envelope: `success` / `data` / `errors`.

### Refactor Guidance

- Extend `getTeamAvailability` to accept an options object with `skipPagination: true` if not already supported.
- Centralize active-availability predicate: `ua.cancelled_at IS NULL AND ua.is_deleted = 0`.
- Update `resolveRelevantWindow` / `loadActiveWindowsForUsers` to resolve running-first, then nearest-upcoming windows for listing attachment.
- Audit all `user_availability` reads (listing, overlap check, mark-available, export callers, IOM) for the `is_deleted` condition.
- IOM `loadUnavailableUserIds` should filter running windows only (`unavailable_from <= now AND unavailable_to >= now`); do not treat upcoming-only windows as unavailable for assignment.

### Out of Scope

- Export file format or column changes.
- Listing pagination or new filter parameters.
- Frontend changes (backend API only).
- Changing how mark-available early-end sets `cancelled_at` / `cancelled_by` unless product confirms AC literal compliance.

---

## Constraints (Strict)

- No duplicate filtering logic between listing and export.
- No export format/column changes.
- No impact on existing exports outside Team Availability.
- Part 3 is an intentional, scoped listing behavior change; it supersedes prior "no listing behavior change" guidance where they conflict.
- IOM assignment must not expand to block upcoming-only windows.

---

## Assumptions

- `cancelled_at` / `cancelled_by` columns already exist on `user_availability`.
- `getTeamAvailability` is the canonical listing method for Team Availability.
- Mark-user-available is an existing flow; this story adds `is_deleted = 1` to that update.
- Existing rows have `is_deleted = 0` after migration (via default).
- "Nearest upcoming window" means earliest `unavailable_from` among active upcoming rows for that user.
- Listing already exposes availability window fields (e.g., `unavailableFrom`, `unavailableTo`, reason); Part 3 populates them rather than adding new response fields.

---

## Open Questions

- Should `markAvailable` in-progress (early-end) path also set `cancelled_at` / `cancelled_by`, or is `is_deleted = 1` sufficient per existing early-end semantics? (Prior review: R1, non-blocking.)
- If a user has multiple non-overlapping upcoming windows, confirm nearest-by-`unavailable_from` is the correct selection rule.

---

## References

| Resource | Path |
|----------|------|
| Context map | `docs/ai/context-map.json` |
| Project context | `docs/ai/project-context.md` |
| SDLC rules | `.opencode/agents/_sdlc-rules.md` |
| Implementation plan | `docs/ai/stories/PN-49-1/implementation-plan.md` |
| Parent epic/story branch | `feature/PN-49` |
| Final review change request | 2026-06-19 — list running/upcoming unavailable windows instead of moment-in-time status |
