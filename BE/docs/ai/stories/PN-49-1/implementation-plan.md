# PN-49-1 Implementation Plan: Team Availability Changes

## Summary

Deliver three scoped backend changes for Team Availability:

1. **Part 1 — Soft delete (`is_deleted`)**: Add column, soft-delete on mark-available, and exclude deleted rows from all active-availability reads. **Largely implemented in the working tree** (entity, migration, service predicates, IOM filter, unit tests). Verify completeness before closing.
2. **Part 2 — Export filter parity**: Export must delegate to `getTeamAvailability(..., { skipPagination: true })` with no duplicate filtering. **Already implemented** — verify only.
3. **Part 3 — Change request (primary remaining work)**: Team Availability listing must surface a user's **running or upcoming** active unavailable window instead of moment-in-time AVAILABLE status. Export inherits this via the shared listing path. **Status filters must treat upcoming windows as UNAVAILABLE.**

The final-review change request supersedes prior "no listing behavior change" guidance where they conflict.

---

## Target Files

| Action | Path |
|--------|------|
| **Create** (verify exists) | `src/migrations/1781510857243-AddIsDeletedToUserAvailability.ts` |
| **Edit** | `src/modules/users/entities/user-availability.entity.ts` |
| **Edit** | `src/modules/users/services/user-availability.service.ts` |
| **Edit** | `src/modules/users/services/user-availability.service.spec.ts` |
| **Edit** (verify only) | `src/modules/iom/services/iom-assignment.service.ts` |
| **Edit** (verify only) | `src/modules/iom/services/iom-assignment.service.spec.ts` |

**Likely no changes** (confirm delegation only):

- `src/modules/users/user.controller.ts`
- `src/modules/users/dto/list-team-availability.dto.ts`
- `src/modules/users/constants.ts`

---

## Context Budget

- Open **target files first**; avoid broad repo scans.
- Open non-target files only for direct imports, callers, tests, or required config (e.g. `ListTeamAvailabilityDto`, `team-availability.dto.ts`, prior migration style).
- Use provider-native edit tools; do not paste full file contents, full diffs, or large code blocks in chat.
- Run only the validation commands listed below for the changed surface.
- Skip `docs/`, `.opencode/`, `node_modules/`, `dist/`, and generated execution folders unless a compile error points there.

---

## Current State (working tree audit)

### Already done (verify, do not regress)

| Area | State |
|------|-------|
| Entity | `isDeleted` column mapped on `UserAvailability` |
| Migration | `1781510857243-AddIsDeletedToUserAvailability.ts` adds `is_deleted TINYINT NOT NULL DEFAULT 0` |
| Active predicate | `ACTIVE_AVAILABILITY_SQL = 'ua.cancelled_at IS NULL AND ua.is_deleted = 0'` |
| `markAvailable` | Both branches set `isDeleted: 1`; no hard delete |
| `markUnavailable` overlap | Uses active predicate |
| `resolveRelevantWindow` | Active rows with `unavailable_to >= now`, ordered by `unavailable_from ASC` — correct for mark-available |
| Export | Calls `getTeamAvailability(loggedInUser, query, { skipPagination: true })` only |
| IOM assignment | `loadUnavailableUserIds` filters **running only** (`unavailable_from <= now AND unavailable_to >= now`) plus active predicate — **must stay running-only** |

### Gap — Part 3 not yet implemented

`getTeamAvailability` and `loadActiveWindowsForUsers` currently resolve availability using **running windows only**:

```347:357:src/modules/users/services/user-availability.service.ts
  private async loadActiveWindowsForUsers(
    userIds: number[],
    now: Date,
  ): Promise<Map<number, UserAvailability>> {
    const rows = await this.availabilityRepo
      .createQueryBuilder('ua')
      .where('ua.user_id IN (:...userIds)', { userIds })
      .andWhere(UserAvailabilityService.ACTIVE_AVAILABILITY_SQL)
      .andWhere('ua.unavailable_from <= :now', { now })
      .andWhere('ua.unavailable_to >= :now', { now })
```

Status filter subqueries (lines 158–183) also require `unavailable_from <= :now`, so users with **upcoming-only** windows appear as AVAILABLE and are excluded from `status=UNAVAILABLE`.

---

## Implementation Steps

### Step 1: Verify Part 1 & 2 (quick audit)

1. Confirm migration, entity, and `ACTIVE_AVAILABILITY_SQL` usage across:
   - `markUnavailable` overlap check
   - `markAvailable` / `resolveRelevantWindow`
   - `getTeamAvailability` status subqueries (before Part 3 edits)
   - `loadActiveWindowsForUsers`
2. Confirm `exportTeamAvailability` has no direct repository/filter logic.
3. Confirm IOM `loadUnavailableUserIds` keeps **running-only** semantics (do not broaden to upcoming).
4. If any `is_deleted` predicate is missing on an active-availability read, add it without changing other behavior.

### Step 2: Update status filter SQL in `getTeamAvailability`

Replace moment-in-time running checks with **active window** checks (`unavailable_to >= :now`):

| Filter | New EXISTS / NOT EXISTS condition |
|--------|-----------------------------------|
| `status=UNAVAILABLE` | Active row (`cancelled_at IS NULL`, `is_deleted = 0`) with `unavailable_to >= :now` |
| `status=AVAILABLE` | No such active row |

Remove the `unavailable_from <= :now` requirement from status filter subqueries so upcoming-only users are classified as UNAVAILABLE for filtering.

Keep `search`, `project`, and pagination behavior unchanged.

### Step 3: Refactor `loadActiveWindowsForUsers` for window resolution

Fetch all **active future-or-current** windows per user:

- Predicate: `ACTIVE_AVAILABILITY_SQL` + `unavailable_to >= :now`
- Do **not** filter to running-only at query time

Resolve one window per user in application code:

1. **Running** (`unavailable_from <= now AND unavailable_to >= now`) — if multiple, keep existing overlap behavior: prefer latest by `unavailable_from` (current `orderBy DESC` + first-wins loop semantics).
2. **Else upcoming** (`unavailable_from > now`) — prefer **nearest** (earliest `unavailable_from`).
3. Never surface cancelled or soft-deleted rows.

Consider splitting into a small private helper (e.g. `resolveListingWindow(rows, now)`) if it keeps `getTeamAvailability` readable; avoid over-abstraction.

### Step 4: Update listing row assembly in `getTeamAvailability`

After Step 3, when a resolved window exists for a user:

- Set `currentStatus = 'UNAVAILABLE'` and `statusLabel` accordingly.
- Populate `unavailableFrom` / `unavailableTo` from the resolved window (running or upcoming).
- When no resolved window: retain existing AVAILABLE behavior (no window fields).

Response shape and field names stay unchanged.

### Step 5: Export — no structural changes

`exportTeamAvailability` already maps `currentStatus`, `unavailableFrom`, and `unavailableTo` from listing items. After Step 4:

- Upcoming-window users export with UNAVAILABLE status and populated date columns.
- Confirm export row count still matches listing `total` for the same filters.

Do not add repository calls or duplicate filter logic.

### Step 6: Preserve IOM assignment semantics

**Do not change** `loadUnavailableUserIds` to include upcoming-only windows. IOM must continue excluding only users unavailable **at assignment time** (running window). Part 3 is a Team Availability listing/export display change only.

### Step 7: Unit test updates (`user-availability.service.spec.ts`)

Add/adjust tests for Part 3:

| Test | Expectation |
|------|-------------|
| Upcoming window only | User row is `UNAVAILABLE` with `unavailableFrom` / `unavailableTo` populated |
| Running window | Unchanged behavior — `UNAVAILABLE` with window fields |
| No active window | `AVAILABLE`, no window fields |
| Running + upcoming both exist | Running window wins |
| Multiple upcoming | Nearest (earliest `unavailable_from`) wins |
| `status=UNAVAILABLE` filter | Includes user with upcoming-only window; SQL uses `unavailable_to >= :now`, not `unavailable_from <= :now` |
| `status=AVAILABLE` filter | Excludes user with upcoming-only window |
| Soft-deleted / cancelled row | Never listed as active window |
| Export with upcoming user | Excel row has UNAVAILABLE `statusLabel` and populated `fromDateTime` / `toDateTime` |

Update the existing **"uses the latest active window when multiple overlap"** test only if Step 3 resolution logic changes running-overlap behavior; running-overlap precedence among multiple running windows should remain as today unless spec explicitly changes it.

Retain existing Part 1 tests (`is_deleted` in overlap, mark-available soft-delete, export filter delegation).

### Step 8: IOM tests (verify only)

Confirm `iom-assignment.service.spec.ts` still asserts `ua.is_deleted = 0` and running-window time bounds. Add a negative assertion only if useful: upcoming-only availability does **not** exclude user from assignment pool.

---

## Validation Commands

```bash
# Primary unit tests
npm run test -- src/modules/users/services/user-availability.service.spec.ts
npm run test -- src/modules/iom/services/iom-assignment.service.spec.ts

# Lint and compile
npm run lint
npm run build
```

**If DB available (staging/local):**

```bash
npm run migration:run
```

| Scenario | Expected |
|----------|----------|
| User AVAILABLE now + future window | Listing shows UNAVAILABLE with upcoming dates |
| User in running window | Listing shows UNAVAILABLE with running dates |
| User with no active window | Listing shows AVAILABLE (unchanged) |
| `status=UNAVAILABLE` | Includes upcoming-only users |
| `status=AVAILABLE` | Excludes upcoming-only users |
| Export same filters as listing | Row count and per-row window data match |
| Mark available | Soft-deletes (`is_deleted = 1`), no hard delete |
| IOM auto-assignment | Upcoming-only users remain assignable |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Status filter semantics change | Intentional per change request; add explicit filter tests for upcoming windows |
| Listing shows UNAVAILABLE for upcoming users while IOM still assigns them | Documented in spec; IOM must remain running-only |
| Multiple active windows per user | Implement explicit precedence: running > upcoming; among upcoming, earliest start |
| Running overlap precedence regression | Preserve existing latest-running behavior when multiple running windows overlap |
| `markAvailable` early-end path omits `cancelled_at`/`cancelled_by` | Unchanged; only `is_deleted = 1` added (existing product semantics) |
| Raw SQL subqueries use snake_case | Use `ua.is_deleted = 0` in SQL strings inside `getTeamAvailability` |

---

## Assumptions

- Parts 1 & 2 are implemented in the current branch; implementer verifies and fills any gaps without rework.
- `getTeamAvailability` is the single source of truth for listing row selection, per-user window data, and export content.
- `resolveRelevantWindow` behavior for mark-available (earliest active window with `unavailable_to >= now`) remains correct and separate from listing resolution precedence.
- Listing already exposes `unavailableFrom`, `unavailableTo`, `currentStatus`, and `statusLabel`; Part 3 changes values only.
- `markUnavailable` overlap check (date-range overlap + active predicate) remains; do not switch to the broader `unavailable_to >= now` existence check unless product requests it.
- No frontend or export column/format changes.
- Migration `1781510857243` is the correct timestamp ordering after `1781510857242`.
