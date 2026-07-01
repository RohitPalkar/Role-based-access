# Story Spec: PM-23 — IOM Listing for CRM

## Summary

Expose a paginated, CRM-scoped **IOM list** API in the active `iom` module (`src/modules/iom/`) so CRM users can browse existing IOM records across their assigned projects. The endpoint must follow the same authentication, authorization, validation, and pagination patterns already used by `GET /iom/listing` (eligible bookings) and the other CRM IOM routes.

This story is distinct from the existing `GET /iom/listing` endpoint, which lists **bookings eligible for IOM creation**, not IOM records themselves.

## Background / Current Behavior

- The production-registered module is `src/modules/iom/` (`IomModule` in `src/app.module.ts`).
- CRM IOM routes today (`src/modules/iom/iom.controller.ts`):
  - `GET /iom/listing` — paginated eligible bookings (`IomEligibilityService.findEligible`)
  - `POST /iom/generate`, `PATCH /iom/:id`, `POST /iom/:id/submit`, `POST /iom/:id/resubmit`
  - `GET /iom/:id`, `GET /iom/:id/pdf`
- There is **no** endpoint that lists persisted `ioms` rows for CRM users.
- A legacy `src/modules/iom_management/` module contains a dummy `GET /iom/iomDetailList` with placeholder data; it is **not** imported in `AppModule` and should not be extended for this story.
- IOM data model exists (`ioms` table, `Iom` entity, `iom_statuses`, workflow services). No new migration is expected unless implementation discovers a missing index or column required for performant listing.

## Scope

### In scope

- New read-only list endpoint for CRM users in `src/modules/iom/iom.controller.ts`.
- New query DTO (e.g. `ListIomsDto`) extending the repo’s shared pagination DTO pattern (`CommonFindAllQueryDto` / `ListEligibleBookingsDto`).
- New service (e.g. `IomListingService` or method on an existing service) that queries `ioms` with:
  - soft-delete exclusion (`deleted_at IS NULL`)
  - project scoping via `user.crmProjects`
  - pagination (`page`, `limit`)
  - optional search, sort, date range, and status filters
- Joins needed to return human-readable list fields (project, booking, status at minimum).
- Unit tests for DTO validation, service query behavior, and controller wiring (co-located `*.spec.ts` under `src/modules/iom/`).
- Module registration updates in `src/modules/iom/iom.module.ts` if a new provider is introduced.

### Out of scope

- Changes to `GET /iom/listing` (eligible bookings).
- Changes to generate / edit / submit / resubmit / view / PDF flows.
- Legacy `iom_management` module work.
- UI / frontend implementation.
- New workflow transitions, status seeds, or write-side behavior.
- Invoice subsystem integration beyond fields already stored on `ioms` (see Open Questions).
- Admin / TL / Finance / Loyalty listing screens (CRM role only for this story).

## Requirements

### 1. Endpoint

- Add a CRM-only list route on the existing `IomController` (`@Controller('iom')`).
- **Proposed route:** `GET /iom/ioms`
  - Resolves to `GET /api/iom/ioms` in prod and `GET /api/{NODE_ENV}/iom/ioms` in non-prod (global prefix from `src/main.ts`).
  - Final path may be adjusted at implementation time, but it **must not** collide with existing static routes (`listing`, `generate`, `:id`, `:id/pdf`, `:id/submit`, `:id/resubmit`). Register static paths before parameterized `:id` routes.
- Guards / role decorator must match existing CRM IOM routes:
  - `@UseGuards(RmAdminAuthGuard, RolesGuard)`
  - `@Roles(RolesEnum.CRM)`
- Controller-scoped `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) already on `IomController` applies to the new handler.

### 2. Query DTO — `ListIomsDto` (name at implementer’s discretion)

- New file under `src/modules/iom/dto/`.
- Extend `CommonFindAllQueryDto` (same pattern as `ListEligibleBookingsDto`).
- Supported query parameters:

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `page` | int ≥ 1 | optional | default `DEFAULT_PAGE` |
| `limit` | int 1–100 | optional | default `DEFAULT_LIMIT` |
| `search` | string | optional | free-text filter (see §4) |
| `sortBy` | string | optional | `field:ASC` or `field:DESC`; whitelist sortable columns |
| `startDate` | date string | optional | filter on a documented IOM date field |
| `endDate` | date string | optional | inclusive end-of-day, same pattern as `CommonFindAllQueryDto` |
| `status` | string | optional | filter by IOM status **code** (e.g. `IOM_CREATED`) |

- Reject unknown query keys via existing pipe settings.

### 3. Authorization & data scope

- CRM users may only see IOMs whose `project_id` is in `user.crmProjects` (reuse `IomValidationService` project-access semantics; do not trust caller-supplied project ids without enforcing this scope in the query).
- If `user.crmProjects` is empty, return an empty paginated result without hitting the database (same short-circuit as `IomEligibilityService.findEligible`).
- Exclude soft-deleted IOMs (`deleted_at IS NULL`).

### 4. Listing query behavior

- Base query: `ioms` joined to:
  - `iom_statuses` (for `statusCode` / `statusLabel`)
  - `incentive_bookings` via `booking_id` (for customer / unit / collection fields used in search and display)
  - `projects` via `project_id` (for project name)
- **Search** (when `search` provided): case-insensitive match on a whitelisted set, at minimum:
  - booking customer name
  - booking `booking_id` (business id string on `incentive_bookings`)
  - booking property / unit number
  - project name
- **Status filter** (when `status` provided): match `iom_statuses.code` exactly; invalid/unknown status codes should yield empty results or a `400` — pick one approach and test it (prefer `400` with a clear validation message if the code is not in `IomStatusCodeEnum`).
- **Date filter** (when `startDate` / `endDate` provided): filter on `ioms.created_at` unless product specifies otherwise (see Open Questions).
- **Sort** (when `sortBy` provided): whitelist column mapping to prevent SQL injection; sensible defaults include `createdAt:DESC`. Minimum whitelisted fields:
  - `createdAt` → `ioms.created_at`
  - `submittedAt` → `ioms.submitted_at`
  - `salePrice` → `ioms.sale_price`
  - `status` → `iom_statuses.sequence` or `iom_statuses.label`
- Default ordering when `sortBy` omitted: `ioms.created_at DESC`.

### 5. Response shape

- Return a paginated envelope consistent with `IomEligibilityService.findEligible` (not the legacy `iom_management` dummy shape):

```ts
{
  items: IomListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

- Each `IomListItem` should expose at minimum the fields needed for the CRM IOM grid. Baseline contract (camelCase API):

| Field | Source / notes |
|-------|----------------|
| `id` | `ioms.id` |
| `bookingId` | `ioms.booking_id` |
| `projectId` | `ioms.project_id` |
| `projectName` | joined project |
| `unitNo` | `incentive_bookings.property_number` |
| `customerName` | `incentive_bookings.customer_name` (fallback: `customerDetails` if needed) |
| `saleValue` | `ioms.sale_price` |
| `brokeragePercentage` | `ioms.brokerage_percentage` |
| `totalBrokerageAmount` | `ioms.total_brokerage_amount` |
| `referrerPoints` | `ioms.referrer_points` |
| `refereePoints` | `ioms.referee_points` |
| `referralPointsEdited` | `ioms.referral_points_edited` |
| `referralClassification` | `ioms.referral_classification` |
| `statusCode` | `iom_statuses.code` |
| `statusLabel` | `iom_statuses.label` |
| `submittedAt` | `ioms.submitted_at` |
| `createdAt` | `ioms.created_at` |
| `iomPdfAvailable` | boolean derived from `ioms.iom_pdf IS NOT NULL` |

- Additional display-only fields from the legacy dummy prototype (collection %, invoice metadata, `iom_date`, etc.) are **optional** for v1 unless confirmed with product (see Open Questions). Do not block delivery on invoice joins if `invoice_id` is the only stored link today.

### 6. Error handling

- Reuse existing IOM error utilities (`throwIomError`, `IomErrorCodeEnum`) only where applicable; listing is read-only and should not invent new error codes unless necessary.
- Unauthenticated / wrong-role requests behave identically to other CRM IOM routes (guard rejection).
- Validation failures return `400` with standard Nest validation messages.

### 7. Tests

- **DTO spec:** validates pagination bounds, optional filters, and rejection of unknown properties (if testable via pipe config).
- **Service spec:** covers
  - empty `crmProjects` short-circuit
  - project scoping (records outside `crmProjects` excluded)
  - soft-deleted rows excluded
  - pagination math (`totalPages`)
  - search and status filter behavior (mocked query builder or repository)
  - default sort
- **Controller spec:** covers guard/role wiring, delegation to service, and happy-path response forwarding.
- `npm run test`, `npm run lint`, and `npm run build` must pass.

## Acceptance Criteria

1. `GET /api/iom/ioms` (prod) and `GET /api/{NODE_ENV}/iom/ioms` (non-prod) exist and are reachable when the app is running.
2. Only authenticated users with the **CRM** role can access the endpoint; other roles receive the same denial behavior as existing CRM IOM routes.
3. A CRM user receives **only** IOM rows whose `project_id` is in their `crmProjects` list.
4. Soft-deleted IOMs (`deleted_at IS NOT NULL`) never appear in results.
5. When `crmProjects` is empty, the endpoint returns `{ items: [], total: 0, page, limit, totalPages: 0 }` without error.
6. `page` and `limit` paginate results; `total` and `totalPages` are accurate.
7. `search` filters results across the whitelisted booking/project text fields.
8. `status` filters results to the requested IOM status code when provided.
9. `startDate` / `endDate` constrain results on the agreed date column (default: `created_at`).
10. `sortBy` accepts only whitelisted fields; unknown sort fields are ignored or rejected consistently (document the chosen behavior in tests).
11. Each list item includes the baseline fields in §5 (`id`, project/customer/unit identifiers, financial summary, status code/label, key timestamps, PDF availability flag).
12. The endpoint is read-only: no DB writes, no history events, no workflow transitions.
13. Existing CRM IOM endpoints (`listing`, `generate`, `:id`, submit/resubmit, PDF) continue to work without regression.
14. New unit tests cover DTO, service, and controller; `npm run test`, `npm run lint`, and `npm run build` pass.

## Implementation Notes

- Place the new handler in `src/modules/iom/iom.controller.ts` alongside the existing CRM routes; keep static paths (`listing`, `ioms`, `generate`) declared **before** `GET :id` to avoid route shadowing.
- Mirror `IomEligibilityService` for pagination and `sortBy` whitelisting patterns (`field:direction` split, injection-safe column map).
- Prefer a dedicated listing service to keep `IomCrmService` focused on mutations; export nothing new unless other modules need it.
- Use `TypeOrmModule.forFeature([Iom, IomStatus, IncentiveBooking, Projects])` — entities already registered or easy to add.
- Map DB snake_case to camelCase in the service layer (consistent with `IomCrmService` edit mapping).
- Do **not** register or modify `src/modules/iom_management/`.
- Response envelope: follow the flat pagination object returned by `findEligible`; rely on the global success interceptor if the repo wraps all responses — match sibling IOM endpoints’ observed behavior in controller tests.
- Consider a DB index review on `(project_id, deleted_at, created_at)` only if query plans are slow; any migration for indexing is a separate decision (out of scope unless profiling proves necessity).

## Assumptions

- “IOM Listing for CRM” means listing **existing IOM records**, not eligible bookings (already served by `GET /iom/listing`).
- CRM role and `crmProjects` scoping are the correct authorization model (same as generate/edit/view).
- Date filtering defaults to `ioms.created_at`.
- Status filter values use `IomStatusCodeEnum` codes stored in `iom_statuses.code`.
- No new database tables or status seeds are required.
- Invoice display fields are not required for MVP unless product confirms otherwise.

## Open Questions

1. **Route name:** Is `GET /iom/ioms` acceptable to CRM/FE consumers, or is a different path required (e.g. `/iom/list`, `/iom/records`)?
2. **Column contract:** Does the CRM UI require the full legacy dummy column set (`percentage_of_sv_collection`, `amt_collected`, `date_of_15_percentage`, `invoice_status`, `invoice_number`, `invoice_date`, `iom_date`, etc.)? If yes, specify authoritative field mappings and data sources.
3. **Date filter field:** Should `startDate` / `endDate` filter on `created_at`, `submitted_at`, or another business date?
4. **Status filter UX:** Should unknown `status` values return `400` or an empty list?
5. **Story / branch key mismatch:** Jira key is `PM-23` but the prepared branch is `feature/PN-23` — confirm which identifier is canonical for traceability.
6. **Invoice enrichment:** If invoice columns are required, which module/table should be joined (`invoice_id` on `ioms` only today)?

## References

- Active CRM IOM controller: `src/modules/iom/iom.controller.ts`
- Eligible-bookings listing pattern: `src/modules/iom/services/iom-eligibility.service.ts`, `src/modules/iom/dto/list-eligible-bookings.dto.ts`
- IOM entity & statuses: `src/modules/iom/entities/iom.entity.ts`, `src/modules/iom/entities/iom-status.entity.ts`, `src/modules/iom/enums/iom-status-code.enum.ts`
- Project access helper: `src/modules/iom/services/iom-validation.service.ts`
- Legacy dummy list prototype (not registered): `src/modules/iom_management/iom.service.ts` (`getDetailList`)
- Shared pagination DTO: `src/helpers/dto/commonFindAll.dto.ts`
