# PN-27: Round Robin Assignment

## Summary

Implement backend-only round-robin auto-assignment of IOMs (Items of Measurement / internal order records) to CRM users. Eligible IOMs (`status = IOM_TO_BE_GENERATED`, `assigned_to IS NULL`) are assigned automatically on a schedule, cycling through available CRM users while skipping users marked unavailable via a new availability table.

## Goals

- Automatically distribute unassigned IOMs evenly across CRM users without manual intervention or frontend involvement.
- Honor per-user unavailability windows stored in the database.
- Persist round-robin cursor state so assignment order is stable across runs.
- Deliver production-ready backend code: entities, migrations, assignment service, and scheduled job.

## Scope

### In scope

- New `user_availability` table and TypeORM entity.
- New `iom_assignment_state` table and TypeORM entity (single-row cursor).
- Assignment service implementing round-robin selection with availability filtering.
- Cron (or equivalent scheduled job) to process eligible IOMs.
- TypeORM migrations for new tables.
- Transactional assignment using `queryRunner` + MySQL.
- Edge-case handling when no CRM user is available.

### Out of scope

- Frontend UI or API endpoints for managing availability (backend data model only; population assumed via DB/admin/separate work).
- Changes to existing IOM workflow/state-machine logic beyond setting `assigned_to` on eligible records.
- Notification or alerting when assignment cannot occur.

## Requirements

### Functional

1. **Eligible IOMs** — Only IOMs meeting **all** of the following are candidates for auto-assignment:
   - `status = IOM_TO_BE_GENERATED`
   - `assigned_to IS NULL`

2. **CRM user pool** — Assignment candidates are CRM users (users with the CRM role in the existing user/role model). Only users in this pool participate in round-robin.

3. **Availability** — A CRM user is **available** at the current time if the current timestamp does **not** fall within **any** of their `user_availability` windows (`unavailable_from` ≤ now ≤ `unavailable_to`). Multiple overlapping windows must be supported; overlap does not change availability semantics.

4. **Round-robin** — Among available CRM users, select the next user after `iom_assignment_state.last_user_id` in a stable ordering (e.g., by user id). Wrap to the first user when the end of the list is reached. If `last_user_id` is null or no longer valid, start from the first available user.

5. **Persistence** — On successful assignment:
   - Set the IOM’s `assigned_to` to the selected user.
   - Update `iom_assignment_state.last_user_id` to that user.

6. **No available users** — When no CRM user is available for an IOM, do not assign; leave `assigned_to` null. Behavior must be safe and idempotent (no partial/corrupt state).

7. **Scheduling** — A modular cron/scheduled job invokes the assignment service to process eligible IOMs on a recurring basis.

### Technical

- **Stack**: NestJS, TypeORM, `queryRunner`, MySQL.
- **Transactions**: Assignment of an IOM and update of assignment state must occur within a transaction where appropriate to avoid inconsistent cursor vs. assignment state.
- **Modularity**: Separate assignment service from cron/scheduler wiring.
- **Migrations**: Use project migration conventions (`npm run migration:create -- src/migrations/<Name>`, `npm run migration:run`).
- **No workflow changes**: Do not alter existing IOM workflow transitions or business rules outside of setting `assigned_to` on eligible records.

## Data Model

### `user_availability`

| Column            | Type     | Notes                                      |
|-------------------|----------|--------------------------------------------|
| `id`              | PK       | Standard surrogate key (per repo convention) |
| `user_id`         | FK/int   | References CRM user                        |
| `unavailable_from`| datetime | Start of unavailability window             |
| `unavailable_to`  | datetime | End of unavailability window               |

- A user may have zero or many rows.
- Overlapping windows for the same user are allowed.

### `iom_assignment_state`

| Column          | Type   | Notes                                                |
|-----------------|--------|------------------------------------------------------|
| `id`            | PK     | Single logical row (enforce or document singleton)   |
| `last_user_id`  | FK/int | Last CRM user assigned; nullable on first run       |

- Table holds **one row** representing global round-robin cursor.

## Assignment Algorithm

For each run (cron-triggered):

1. Load eligible IOMs (`IOM_TO_BE_GENERATED`, `assigned_to IS NULL`).
2. Load ordered list of CRM users (stable sort, e.g. by `id`).
3. Load `iom_assignment_state` (create default row if missing).
4. For each eligible IOM (order TBD — see Open Questions):
   1. Determine available CRM users at current time using `user_availability`.
   2. If none available → skip IOM; continue.
   3. Select next user after `last_user_id` in round-robin order among available users only; wrap as needed.
   4. In a transaction (`queryRunner`):
      - Update IOM `assigned_to`.
      - Update `iom_assignment_state.last_user_id`.
5. Log or handle errors per existing NestJS/logging patterns without breaking subsequent IOMs where possible.

## Acceptance Criteria

- [ ] `user_availability` entity and migration exist; table supports `user_id`, `unavailable_from`, `unavailable_to`.
- [ ] `iom_assignment_state` entity and migration exist; table supports a singleton `last_user_id` cursor.
- [ ] Assignment service identifies IOMs with `status = IOM_TO_BE_GENERATED` and `assigned_to IS NULL`.
- [ ] Assignment service restricts candidates to CRM users per existing role model.
- [ ] Users inside any unavailability window are excluded; users with no windows or outside all windows are eligible.
- [ ] Multiple overlapping unavailability windows for one user are handled correctly.
- [ ] Round-robin selects the next available user after `last_user_id` and wraps at list end.
- [ ] `last_user_id` is persisted after each successful assignment.
- [ ] When no CRM user is available, IOM remains unassigned and the job completes without error.
- [ ] Assignment uses TypeORM `queryRunner` and transactions against MySQL.
- [ ] Cron/scheduled job module calls the assignment service; code is split service vs. scheduler.
- [ ] No frontend changes required for this story.
- [ ] Existing IOM workflow logic is unchanged aside from `assigned_to` updates on eligible records.
- [ ] Migrations run successfully via `npm run migration:run`.
- [ ] Implementation is production-ready (typed, testable, follows existing NestJS module patterns).

## Implementation Notes

- **Repository role**: Backend API only (`repositoryRole: backend-api-only`). Follow existing NestJS module, entity, migration, and cron patterns in this codebase.
- **API style**: REST with `api` global prefix; no new public endpoints required unless the codebase already exposes cron via internal modules only.
- **CRM user identification**: Resolve CRM users using the project’s existing user/role mechanism (implementation planner should locate the canonical role constant/enum and user query).
- **IOM entity**: Use existing IOM entity/table; map `assigned_to` and `IOM_TO_BE_GENERATED` status to actual column/enum names in the codebase.
- **Singleton state**: Seed `iom_assignment_state` with one row in migration or on first service run.
- **Concurrency**: Consider row-level locking or transactional reads on `iom_assignment_state` if multiple cron instances could run (document approach in implementation plan).
- **Testing**: Unit tests for round-robin wrap, availability filtering, and no-available-user skip; integration test with `queryRunner` if project patterns support it.

## UI Notes

None. Backend-only; no Figma or frontend work.

## Open Questions

1. **CRM user definition** — Exact role name/enum and any additional filters (active flag, deleted users)? *Assumption: existing CRM role; active users only.*
2. **Cron schedule** — Interval/frequency and timezone? *Assumption: follow existing cron conventions in repo; default interval to be chosen in implementation plan.*
3. **IOM processing order** — FIFO by created date, primary key, or batch limit per run? *Assumption: stable order by IOM `id` ascending.*
4. **No available users** — Silent skip vs. structured log/metric? *Assumption: skip and log at info/warn level.*
5. **Availability timezone** — Store/compare in UTC or application timezone? *Assumption: UTC or server timezone consistent with existing datetime handling.*
6. **Partial batch failure** — If one IOM assignment fails mid-run, continue or abort entire batch? *Assumption: continue with per-IOM error logging.*

## Assumptions

- IOM records already have `status` and `assigned_to` fields suitable for this feature.
- CRM users are a well-defined subset of the `users` table via an existing role.
- `user_availability` rows are inserted/managed outside this story (migrations + entity only).
- Round-robin is global across all eligible IOMs, not per-region or per-project.
- Title typo “Assignement” in Jira does not imply a different feature name; deliverable is round-robin IOM assignment.

## Deliverables

- TypeORM entities: `UserAvailability`, `IomAssignmentState`.
- Migrations for both tables (and optional seed row for assignment state).
- `IomAssignmentService` (or equivalent) with round-robin + availability logic.
- Cron/scheduler module wiring to invoke assignment periodically.
- Unit tests covering core assignment scenarios.

## References

- Story key: **PN-27**
- Branch: `feature/PN-27`
- Context map: `docs/ai/context-map.json`
- Migration commands: `npm run migration:create`, `npm run migration:run`
