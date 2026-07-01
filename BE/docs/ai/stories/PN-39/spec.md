# PN-39: Modification in User Availability — `markAvailable` (Soft-Cancel)

## Overview

Extend the **mark available** flow so a CRM Team Lead (CRM_TL) can restore a team member’s availability when they have either an **active** unavailability window or a **scheduled (upcoming)** one. Today, `markAvailable` only ends active windows; upcoming windows cause a `400 Bad Request`. This story updates only that logic using **soft-cancel** semantics: preserve historical accuracy by **never deleting** records and **never mutating** `unavailable_from` or past completed windows.

## Background

User availability is stored as time-bounded windows in `user_availability`:

| Column | Purpose |
|--------|---------|
| `id` | Primary key |
| `user_id` | CRM user |
| `unavailable_from` | Start of unavailability (immutable after creation) |
| `unavailable_to` | End of unavailability |
| `cancelled_at` | Nullable timestamp when a future window was soft-cancelled |
| `cancelled_by` | Nullable user id of the TL who soft-cancelled the window |
| `created_by` | Actor who created the window |
| `created_at`, `updated_at` | Timestamps |

**Available** is implicit: a user is available when there is no non-cancelled active or future unavailability window.

CRM TLs manage team member availability via:

- `POST /api/users/availability/unavailable` — schedule or start unavailability
- `POST /api/users/availability/available` — mark a user available (**this story**)
- `GET /api/users/team/availability` — team availability dashboard

**Current behavior:** `UserAvailabilityService.markAvailable` resolves only an **active** window (`unavailable_from <= now <= unavailable_to`, `cancelled_at IS NULL`) and sets `unavailable_to = now`. If no active window exists, it throws `BadRequestException` with message `No active unavailability window found`, even when the user has an upcoming window (`unavailable_from > now`).

## Goals

1. Preserve existing behavior for **active** unavailability windows (end by setting `unavailable_to = now`).
2. Allow **soft cancellation** of **upcoming** unavailability windows via the same `markAvailable` endpoint.
3. Reject requests when the user is already fully available with a clear error message.
4. Retain all availability records for audit integrity (no deletes, no `unavailable_from` changes, no mutation of past windows).

## Non-Goals

- Changing `markUnavailable` / unavailability creation logic or overlap validation.
- Changing team availability listing or other availability read APIs (`getTeamAvailability`, etc.).
- Adding cron jobs or background schedulers.
- Refactoring modules or services beyond `markAvailable` and its resolver helpers.
- UI work (backend-only repository).

## Definitions

| Term | Definition |
|------|------------|
| **Now** | Server time at request handling (`new Date()`), consistent with existing service logic. |
| **Non-cancelled window** | `cancelled_at IS NULL` |
| **Active window** | Non-cancelled AND `unavailable_from <= now AND unavailable_to >= now` |
| **Upcoming window** | Non-cancelled AND `unavailable_from > now AND unavailable_to >= now` |
| **Relevant window** | Non-cancelled AND `unavailable_to >= now` (active or upcoming) |
| **Past completed window** | `unavailable_to < now` (never mutated by this flow) |
| **Already available** | No relevant window exists for the target user |

## Requirements

### Functional

**R1 — Authorization (unchanged)**  
`markAvailable` must continue to call `userService.validateTLAccess(loggedInUser.dbId, dto.userId)` before any availability mutation. Existing `ForbiddenException` behavior must be preserved.

**R2 — Active window (unchanged semantics, stricter guard)**  
If the target user has an **active** non-cancelled window (`unavailable_from <= now <= unavailable_to AND cancelled_at IS NULL`), set `unavailable_to = now` on that window, persist, and return the updated `UserAvailability` record. **Do not** modify `unavailable_from`, `cancelled_at`, or `cancelled_by`.

**R3 — Upcoming window (soft-cancel)**  
If there is **no** active window but there **is** an upcoming non-cancelled window (`unavailable_from > now AND cancelled_at IS NULL`), soft-cancel it by updating the row:

- `cancelled_at = now`
- `cancelled_by = loggedInUser.dbId` (the authenticated CRM_TL)

**Do not** modify `unavailable_from` or `unavailable_to`. **Do not delete** the row.

Persist and return the updated `UserAvailability` record.

**R4 — Already available**  
If there is neither an active nor an upcoming relevant window (only past completed windows exist, or no windows exist), throw `BadRequestException("User is already available")`. Do not mutate availability data.

**R5 — Resolution order**  
Evaluate in this order:

1. Active window → apply R2  
2. Else upcoming window → apply R3  
3. Else → apply R4  

**R6 — Window selection**  
Introduce a resolver (e.g. `resolveRelevantWindow`) that fetches the earliest non-cancelled window where `unavailable_to >= now`:

```sql
WHERE user_id = :userId
  AND cancelled_at IS NULL
  AND unavailable_to >= :now
ORDER BY unavailable_from ASC
LIMIT 1
```

Then classify the result in service logic:

- If `unavailable_from <= now` → treat as **active** (R2)
- If `unavailable_from > now` → treat as **upcoming** (R3)

When multiple upcoming windows exist, only the **earliest** (`unavailable_from` minimum) is affected per call.

**R7 — Active takes precedence**  
If a user has both an active window and separate upcoming window(s), only the active window is ended (R2). Upcoming windows remain untouched until a subsequent call (if still relevant).

**R8 — Immutable constraints**  
Across all branches:

- **NEVER** update `unavailable_from`
- **NEVER** delete records
- **NEVER** touch past completed windows (`unavailable_to < now`)
- **NEVER** modify windows where `cancelled_at IS NOT NULL`

**R9 — Endpoint contract (unchanged)**  
Keep `POST /api/users/availability/available` with body `{ userId: number }` (`MarkAvailableDto`). Guards and role requirements remain: `RmAdminAuthGuard`, `RolesGuard`, `RolesEnum.CRM_TL`. Response envelope follows existing `success-response-errors` REST style with global prefix `api`.

**R10 — Scope isolation**  
All new logic must live inside `UserAvailabilityService`. No breaking changes to other modules. Do not alter unavailability creation or listing APIs.

### Schema / Entity

**R11 — Soft-cancel columns**  
The `user_availability` table must expose `cancelled_at` (nullable timestamp) and `cancelled_by` (nullable user id). If these columns are not yet present on the entity or in the database, add them via TypeORM entity update and migration as a prerequisite within this story. Listing and creation APIs must not be refactored; only ensure the entity supports persistence of soft-cancel fields used by `markAvailable`.

### Non-Functional

- Add/update unit tests in `user-availability.service.spec.ts` for all new branches.
- Follow existing NestJS / TypeORM patterns in `UserAvailabilityService`.
- Add clear inline comments in `markAvailable` explaining the decision flow.
- No breaking changes to existing API contracts.

## Acceptance Criteria

1. **Active window unchanged**  
   Given a user with an active non-cancelled unavailability window, when a CRM_TL calls `markAvailable`, then `unavailable_to` is set to approximately `now`, `unavailable_from` is unchanged, `cancelled_at` and `cancelled_by` remain null, the row is retained, and the updated record is returned.

2. **Upcoming window soft-cancelled**  
   Given a user with no active window but an upcoming non-cancelled scheduled window, when a CRM_TL calls `markAvailable`, then that window is updated with `cancelled_at ≈ now` and `cancelled_by = loggedIn TL dbId`, `unavailable_from` and `unavailable_to` are unchanged, the row is retained (not deleted), and the updated record is returned.

3. **Already available rejected**  
   Given a user with no active and no upcoming relevant windows (only past windows or no records), when a CRM_TL calls `markAvailable`, then the API responds with `400 Bad Request` and message `User is already available`, and no availability data is mutated.

4. **Active window takes precedence**  
   Given a user with both an active window and a separate upcoming window, when a CRM_TL calls `markAvailable`, then only the active window is ended; the upcoming window is left untouched.

5. **Earliest upcoming window**  
   Given multiple upcoming non-cancelled windows and no active window, when a CRM_TL calls `markAvailable`, then only the earliest upcoming window (`unavailable_from` minimum) is soft-cancelled.

6. **Past windows untouched**  
   Given a user with only past completed windows (`unavailable_to < now`), when a CRM_TL calls `markAvailable`, then the API returns `400 User is already available` and no historical rows are modified.

7. **Already-cancelled windows ignored**  
   Given a user whose only future-dated rows have `cancelled_at` set, when a CRM_TL calls `markAvailable`, then the API returns `400 User is already available`.

8. **Authorization preserved**  
   Given a TL without access to the target user, `markAvailable` returns `403 Forbidden` without changing availability.

9. **Scope limited**  
   `markUnavailable`, listing/read APIs, cron jobs, and unrelated modules are unchanged.

10. **Tests**  
    Unit tests cover: active window end, upcoming soft-cancel, already-available error, active-over-upcoming precedence, earliest-upcoming selection, past-window no-op, cancelled-window exclusion, and no-delete audit behavior.

## UI Notes

No UI changes in this repository. Clients calling `POST /api/users/availability/available` should handle success when soft-cancelling an upcoming window and the clarified `User is already available` error when no relevant window exists.

## Implementation Notes

### Primary touchpoints

| File | Change |
|------|--------|
| `src/modules/users/services/user-availability.service.ts` | Extend `markAvailable`; add resolver helper (e.g. `resolveRelevantWindow`) |
| `src/modules/users/services/user-availability.service.spec.ts` | New/updated test cases for R2–R7, R10 |
| `src/modules/users/entities/user-availability.entity.ts` | Add `cancelledAt`, `cancelledBy` if not present |
| `src/migrations/*` | Add migration for `cancelled_at`, `cancelled_by` if columns missing |
| `src/modules/users/user.controller.ts` | No change expected |
| `src/modules/users/dto/mark-available.dto.ts` | No change expected |

### Suggested logic

```
markAvailable(loggedInUser, dto):
  validateTLAccess(loggedInUser.dbId, dto.userId)

  now = new Date()
  window = resolveRelevantWindow(dto.userId, now)
    // WHERE user_id = :userId
    //   AND cancelled_at IS NULL
    //   AND unavailable_to >= :now
    // ORDER BY unavailable_from ASC LIMIT 1

  if not window:
    throw BadRequestException('User is already available')

  if window.unavailableFrom <= now:
    // Active — end window early
    window.unavailableTo = now
  else:
    // Upcoming — soft cancel (preserve original from/to)
    window.cancelledAt = now
    window.cancelledBy = loggedInUser.dbId

  return save(window)
```

### Resolver helper

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

Classification of active vs upcoming remains in `markAvailable` service logic, not in the resolver.

### Deliverables

1. Updated `markAvailable()` method implementing R2–R5 with soft-cancel for upcoming windows.
2. New resolver method (e.g. `resolveRelevantWindow`) implementing R6.
3. Entity/migration for `cancelled_at` and `cancelled_by` if not already present.
4. Clear inline comments explaining the decision flow.
5. Unit tests for all acceptance criteria.

### Return value

Method signature remains `Promise<UserAvailability>`. Return the persisted entity after update in all success paths (active end and upcoming soft-cancel).

### Supersedes prior approach

Earlier drafts collapsed upcoming windows by setting `unavailable_from = now` and `unavailable_to = now`. That approach is **replaced** by soft-cancel via `cancelled_at` / `cancelled_by` to preserve original scheduled dates for historical accuracy.

## Assumptions

1. **Soft-cancel strategy:** Upcoming windows are cancelled by setting `cancelled_at` and `cancelled_by` only; original `unavailable_from` and `unavailable_to` values are preserved for audit.
2. **Error message:** Already-available case uses exactly `User is already available` (replacing the prior `No active unavailability window found` for that branch).
3. **Multiple upcoming windows:** Only the earliest non-cancelled upcoming window is soft-cancelled per `markAvailable` call; additional windows require subsequent calls.
4. **Resolver naming:** `resolveRelevantWindow` (or equivalent) is the expected helper; naming may vary if query semantics in R6 are preserved.
5. **Listing APIs out of scope:** Per story constraints, listing/read APIs are not modified in this story. If they currently ignore `cancelled_at`, a follow-up may be needed for dashboard accuracy; that is not part of PN-39.
6. **Column existence:** Change request assumes `cancelled_at` and `cancelled_by` exist or will be added; implementation should verify entity/DB state and add migration only if missing.

## Open Questions

1. **Listing behavior with soft-cancelled windows:** If `getTeamAvailability` does not yet filter `cancelled_at IS NULL`, users with soft-cancelled future windows may still appear unavailable on the dashboard until a separate change is made. Confirm whether that is acceptable for this release or requires a coordinated follow-up (out of PN-39 scope per constraints).

## References

- Story key: **PN-39**
- Service: `src/modules/users/services/user-availability.service.ts` (`markAvailable`, `resolveActiveWindow`)
- Controller: `src/modules/users/user.controller.ts` (`POST availability/available`)
- Entity: `src/modules/users/entities/user-availability.entity.ts`
- Tests: `src/modules/users/services/user-availability.service.spec.ts` (`describe('markAvailable')`)
- API conventions: REST, global prefix `api`, `success-response-errors` envelope (from context map)
- Active change request (2026-06-16): soft-cancel logic with `cancelled_at` / `cancelled_by` supersedes prior collapse-based cancellation
