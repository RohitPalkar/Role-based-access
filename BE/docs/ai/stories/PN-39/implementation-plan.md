# PN-39 Implementation Plan: `markAvailable` Soft-Cancel Logic

## Summary

Replace the current **collapse-based** upcoming-window cancellation in `UserAvailabilityService.markAvailable` with **soft-cancel** semantics. Active windows still end by setting `unavailable_to = now`. Upcoming windows are cancelled by setting `cancelled_at = now` and `cancelled_by = loggedInUser.dbId` while preserving original `unavailable_from` / `unavailable_to`. No rows are deleted; past windows are never mutated.

**Prerequisite:** `cancelled_at` and `cancelled_by` columns do not exist on `user_availability` today (entity or migration). Add them before updating service logic.

**Out of scope:** `markUnavailable`, `getTeamAvailability`, controller, DTOs, and all other modules.

## Target Files

| File | Action |
|------|--------|
| `src/modules/users/entities/user-availability.entity.ts` | **Edit** — add `cancelledAt`, `cancelledBy` columns (+ optional `cancelledByUser` relation) |
| `src/migrations/<timestamp>-AddCancelledColumnsToUserAvailability.ts` | **Create** — `ALTER TABLE user_availability` add nullable `cancelled_at`, `cancelled_by` |
| `src/modules/users/services/user-availability.service.ts` | **Edit** — refactor resolver + `markAvailable` soft-cancel branch |
| `src/modules/users/services/user-availability.service.spec.ts` | **Edit** — update/replace collapse tests; add soft-cancel coverage |

**Verify only (no changes expected):**

- `src/modules/users/user.controller.ts`
- `src/modules/users/dto/mark-available.dto.ts`
- `src/modules/users/user.module.ts`

## Context Budget

- Open **target files first**; do not broad-scan `src/modules/users/` or the repo.
- Open non-target files only for direct imports, callers, tests, or required config (e.g. voucher entity migration at `src/migrations/1756474247362-addCancelReasonInVoucher.ts` for column naming/style reference).
- Use native edit tools; do not paste full file contents or large diffs in chat.
- Run only the validation commands listed below.

## Current State

### Service (`user-availability.service.ts`)

`markAvailable` already handles active and upcoming windows via `resolveActiveOrUpcomingWindow`, but:

1. Resolver **does not** filter `cancelled_at IS NULL`.
2. Upcoming branch **collapses** dates (`unavailable_from = now`, `unavailable_to = now`) — this **must be replaced** by soft-cancel.
3. Resolver should be renamed to `resolveRelevantWindow` per spec.

```86:114:src/modules/users/services/user-availability.service.ts
  async markAvailable(...) {
    // validateTLAccess → resolveActiveOrUpcomingWindow → branch on unavailableFrom <= now
    // upcoming branch currently sets unavailableFrom + unavailableTo to now  ← WRONG per change request
  }
```

### Entity / DB

`UserAvailability` entity has `markedBy`, `reason`, window dates — **no** `cancelledAt` / `cancelledBy`. Base migration `1781264100000-CreateUserAvailability.ts` creates table without soft-cancel columns.

### Tests (`user-availability.service.spec.ts`)

`describe('markAvailable')` tests assert collapse behavior for upcoming windows (lines ~329–450). These must be rewritten for soft-cancel. Active-window and already-available tests are largely correct but should assert resolver includes `cancelled_at IS NULL`.

## Implementation Steps

### Step 1 — Add soft-cancel columns (entity + migration)

**Entity** (`user-availability.entity.ts`):

Add nullable columns following existing snake_case / camelCase conventions:

```typescript
@Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
cancelledAt: Date | null;

@Column({ name: 'cancelled_by', type: 'int', nullable: true })
cancelledBy: number | null;
```

Optional: add `@ManyToOne(() => Users)` + `@JoinColumn({ name: 'cancelled_by' })` for `cancelledByUser` (mirror `markedByUser` pattern). Not required for `markAvailable` to work.

**Migration** (new file, timestamp after `1781510857241`):

```sql
ALTER TABLE user_availability
  ADD COLUMN cancelled_at DATETIME NULL COMMENT 'When a future window was soft-cancelled',
  ADD COLUMN cancelled_by INT NULL COMMENT 'TL who soft-cancelled the window',
  ADD CONSTRAINT fk_user_availability_cancelled_by
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE RESTRICT
```

`down`: drop FK, then drop both columns. Match `DATETIME` style from `CreateUserAvailability` migration (not `DATETIME(3)` unless team prefers voucher-style precision).

### Step 2 — Replace resolver with `resolveRelevantWindow`

Rename `resolveActiveOrUpcomingWindow` → `resolveRelevantWindow` and add `cancelled_at IS NULL` filter:

```typescript
private async resolveRelevantWindow(
  userId: number,
  now: Date,
): Promise<UserAvailability | null> {
  return this.availabilityRepo
    .createQueryBuilder('ua')
    .where('ua.user_id = :userId', { userId })
    .andWhere('ua.cancelled_at IS NULL')
    .andWhere('ua.unavailable_to >= :now', { now })
    .orderBy('ua.unavailable_from', 'ASC')
    .getOne();
}
```

**Semantics:** earliest non-cancelled window with `unavailable_to >= now`. Classification stays in `markAvailable`.

### Step 3 — Refactor `markAvailable` decision flow

Keep existing structure; change only the upcoming branch and add brief inline comments:

```
markAvailable(loggedInUser, dto):
  1. await validateTLAccess(loggedInUser.dbId, dto.userId)   // unchanged
  2. now = new Date()
  3. window = await resolveRelevantWindow(dto.userId, now)
  4. if !window → throw BadRequestException('User is already available')
  5. if window.unavailableFrom <= now:
       // Active: end window early — do NOT touch cancelled_at/cancelled_by/unavailable_from
       update { unavailableTo: now }
     else:
       // Upcoming: soft-cancel — preserve unavailable_from and unavailable_to
       update { cancelledAt: now, cancelledBy: loggedInUser.dbId }
  6. return findOne({ where: { id: window.id } })
```

**Hard constraints (do not violate):**

| Constraint | Rule |
|------------|------|
| Never update `unavailable_from` | Active branch updates only `unavailableTo`; upcoming branch updates only cancel fields |
| Never delete records | Use `update` + `findOne`, not `delete` |
| Never touch past windows | Resolver filters `unavailable_to >= now` |
| Ignore already-cancelled | Resolver filters `cancelled_at IS NULL` |
| Active takes precedence | Single earliest relevant window; if active, upcoming siblings untouched |
| Scope isolation | Do not modify `markUnavailable`, `getTeamAvailability`, or their helpers |

### Step 4 — Update unit tests

In `describe('markAvailable')`:

| Test | Action |
|------|--------|
| Active window end | Keep; assert update payload has only `unavailableTo`, not `cancelledAt`/`cancelledBy`/`unavailableFrom` |
| Already available (null resolver) | Keep message `'User is already available'`; assert no `update` |
| Upcoming soft-cancel | **Replace** collapse test: assert `update` called with `{ cancelledAt: Date, cancelledBy: tlUser.dbId }` and **not** `unavailableFrom`/`unavailableTo` |
| Active does not modify `unavailableFrom` | Keep |
| Earliest upcoming window | **Update** assertions to soft-cancel fields, not collapse |
| No delete on cancel | Keep; still `update` + `findOne`, no `delete` |
| Forbidden on TL denial | Keep |
| **Add:** cancelled windows excluded | Resolver returns null when only rows have `cancelledAt` set → `User is already available` |
| **Add:** past windows only | Resolver returns null → `User is already available`, no mutation |
| **Add:** active-over-upcoming precedence | Mock active window as earliest relevant; assert only `unavailableTo` updated |
| **Add:** original dates preserved on soft-cancel | After update, `findOne` returns window with original `unavailableFrom`/`unavailableTo` unchanged |

When mocking query builder, optionally assert `andWhere` was called with `cancelled_at IS NULL` (if mock setup allows).

**Do not** change `markUnavailable` or `getTeamAvailability` test blocks.

### Step 5 — Smoke-check non-target surfaces

Confirm no import/signature breakage in `user.controller.ts`. No controller changes needed — endpoint contract unchanged.

## Validation Commands

Run from repo root after changes:

```bash
# Unit tests for changed service only
npm run test -- --testPathPattern=user-availability.service.spec

# Lint changed files
npm run lint

# Build (catches entity/type errors)
npm run build
```

If migration is added locally and DB is available:

```bash
npm run migration:run
```

## Acceptance Criteria Mapping

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | Active window ends at `now` | Unit test: `unavailableTo` updated; `cancelledAt`/`cancelledBy` null |
| 2 | Upcoming soft-cancelled | Unit test: `cancelledAt ≈ now`, `cancelledBy = TL dbId`; dates unchanged |
| 3 | Already available → 400 | Unit test: exact message `User is already available` |
| 4 | Active over upcoming | Unit test: active window mocked first; upcoming untouched |
| 5 | Earliest upcoming only | Unit test: resolver returns earliest; single `update` |
| 6 | Past windows untouched | Unit test: resolver null; no `update` |
| 7 | Cancelled windows ignored | Unit test: `cancelled_at IS NULL` in resolver |
| 8 | TL auth preserved | Existing `ForbiddenException` test |
| 9 | Scope limited | No edits outside target files |
| 10 | Full test coverage | All branches in `markAvailable` covered |

## Risks

| Risk | Mitigation |
|------|------------|
| **Listing may show soft-cancelled users as unavailable** | `getTeamAvailability` / `loadActiveWindowsForUsers` do not filter `cancelled_at`. Per spec this is **out of scope** for PN-39; note as follow-up if dashboard accuracy is required. |
| **Overlap check in `markUnavailable` ignores `cancelled_at`** | Pre-existing; do not change in this story. Soft-cancelled future windows may still block new overlapping windows until a follow-up. |
| **Migration on shared DB** | Coordinate deploy order: migration before code that writes `cancelled_at`. |
| **Test mocks stale after rename** | Grep spec file for `resolveActiveOrUpcomingWindow` / collapse assertions and update all. |

## Assumptions

1. `cancelled_at` and `cancelled_by` must be **added** via new migration; they are not in production schema yet.
2. `cancelled_by` stores `loggedInUser.dbId` (same as `markedBy` on create).
3. Error message for no relevant window is exactly **`User is already available`** (already implemented).
4. `resolveRelevantWindow` naming supersedes `resolveActiveOrUpcomingWindow`.
5. Soft-cancel **supersedes** the prior collapse approach (`unavailable_from = now`, `unavailable_to = now`); remove that branch entirely.
6. `markUnavailable` overlap query and `getTeamAvailability` active-window loader are intentionally **not** updated per story constraints.

## Supersedes

This plan **replaces** the prior implementation plan section that described upcoming-window cancellation via date collapse. All upstream requirements from the 2026-06-16 change request and `docs/ai/stories/PN-39/spec.md` take precedence.
