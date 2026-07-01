# Implementation Plan: PM-23 — IOM Listing for CRM

## Summary

Extend the existing **`GET /iom/listing`** endpoint (not a new `GET /iom/ioms` route) to support CRM listing of **persisted IOM records** alongside the current **eligible-bookings** behavior. Use a query discriminator (`listType`) so existing consumers keep the default eligible-bookings response without breaking changes.

**Approved scope change:** Do **not** add `GET /iom/ioms`. Reuse `GET /iom/listing` with filter, pagination, and sorting for IOM-record listing.

---

## Approach

### Route & mode switch

| Concern | Decision |
|---------|----------|
| Route | Keep `GET /iom/listing` only (`GET /api/iom/listing` prod; `GET /api/{NODE_ENV}/iom/listing` non-prod) |
| Mode param | Add optional `listType` query param: `eligible` (default) \| `ioms` |
| Default behavior | `listType` omitted or `eligible` → existing `IomEligibilityService.findEligible` (unchanged logic) |
| IOM records mode | `listType=ioms` → new `IomListingService.findIoms` |

Controller branches on `listType` and delegates to the appropriate service. Guards, roles, and validation pipe stay identical to current CRM IOM routes.

### DTO

Replace or supersede `ListEligibleBookingsDto` with a unified **`ListIomListingDto`**:

- Extends `CommonFindAllQueryDto` (inherits `page`, `limit`, `search`, `sortBy`, `startDate`, `endDate`, `status`)
- Adds `@IsOptional() @IsIn(['eligible', 'ioms']) listType?: 'eligible' | 'ioms' = 'eligible'`
- Re-declare `page` / `limit` with same bounds as today if needed for explicit defaults (mirror current DTO)
- `status` applies only when `listType=ioms` (IOM status code filter); ignored in eligible mode (current behavior)

Update controller import and handler signature to use `ListIomListingDto`.

### New service: `IomListingService`

Create `src/modules/iom/services/iom-listing.service.ts` with `findIoms(user, query)`:

1. **Pagination** — same math as `IomEligibilityService` (`DEFAULT_PAGE`, `DEFAULT_LIMIT`, `totalPages`)
2. **Empty `crmProjects` short-circuit** — return `{ items: [], total: 0, page, limit, totalPages: 0 }` without DB query
3. **Base query** on `ioms` alias `i`:
   - `i.deleted_at IS NULL`
   - `i.project_id IN (:...crmProjects)`
   - Inner join `iom_statuses` (`status`)
   - Inner join `incentive_bookings` (`booking`) on `i.booking_id`
   - Inner join `projects` (`project`) on `i.project_id`
4. **Search** (when `search` set): case-insensitive `LIKE` on:
   - `booking.customer_name`
   - `booking.booking_id` (business string)
   - `booking.property_number`
   - `project.name`
5. **Status filter** (when `status` set): validate against `IomStatusCodeEnum`; if invalid → `400 BadRequestException` with clear message; if valid → `status.code = :status`
6. **Date filter** (when `startDate` / `endDate` set): filter on `i.created_at` (inclusive end-of-day via DTO transform)
7. **Sort** (`sortBy` = `field:ASC|DESC`):
   - Whitelist map (ignore unknown fields, same as eligibility):
     - `createdAt` → `i.created_at`
     - `submittedAt` → `i.submitted_at`
     - `salePrice` → `i.sale_price`
     - `status` → `status.sequence`
   - Default: `i.created_at DESC`
8. **Map response items** to camelCase `IomListItem` (define interface/type in service file or `src/modules/iom/types/iom-list-item.interface.ts`):

| Field | Source |
|-------|--------|
| `id` | `ioms.id` |
| `bookingId` | `ioms.booking_id` |
| `projectId` | `ioms.project_id` |
| `projectName` | `projects.name` |
| `unitNo` | `incentive_bookings.property_number` |
| `customerName` | `incentive_bookings.customer_name` (fallback: extract from `ioms.customer_details` if name null) |
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
| `iomPdfAvailable` | `ioms.iom_pdf IS NOT NULL` |

Return envelope:

```ts
{ items: IomListItem[]; total: number; page: number; limit: number; totalPages: number }
```

Read-only: no writes, history events, or workflow transitions.

### Module wiring

In `iom.module.ts`:

- Register `IomListingService` in `providers`
- Inject into `IomController`
- Add `Projects` to `TypeOrmModule.forFeature([..., Projects])` (import from `src/entities`)

### Controller change

In `iom.controller.ts`, update the existing `@Get('listing')` handler:

```ts
async list(@User() user, @Query() query: ListIomListingDto) {
  if (query.listType === 'ioms') {
    return this.iomListingService.findIoms(user, query);
  }
  return this.eligibilityService.findEligible(user, query);
}
```

Rename handler method if desired (`list` vs `listEligibleBookings`); route path stays `listing`.

Do **not** add static `ioms` route. Do **not** modify `iom_management`.

---

## Target Files

| File | Action |
|------|--------|
| `src/modules/iom/iom.controller.ts` | Edit — branch `GET listing` on `listType` |
| `src/modules/iom/dto/list-iom-listing.dto.ts` | **Create** — unified listing DTO with `listType` |
| `src/modules/iom/dto/list-eligible-bookings.dto.ts` | Edit or remove — migrate usages to new DTO |
| `src/modules/iom/services/iom-listing.service.ts` | **Create** — IOM records query + mapping |
| `src/modules/iom/services/iom-eligibility.service.ts` | Edit — accept `ListIomListingDto` (or keep narrow type alias) |
| `src/modules/iom/iom.module.ts` | Edit — register service + `Projects` entity |
| `src/modules/iom/types/iom-list-item.interface.ts` | **Create** (optional) — response item contract |
| `src/modules/iom/dto/list-iom-listing.dto.spec.ts` | **Create** — DTO validation tests |
| `src/modules/iom/services/iom-listing.service.spec.ts` | **Create** — service behavior tests |
| `src/modules/iom/iom.controller.spec.ts` | **Create** — controller delegation + guards |

**Do not touch:** `src/modules/iom_management/`, generate/edit/submit/resubmit/view/PDF handlers (except shared DTO import if renamed).

---

## Context Budget

For the code-implementer agent:

1. Open **target files above first**; do not broad-scan the repo.
2. Open non-target files only for direct imports/callers: `src/helpers/dto/commonFindAll.dto.ts`, `src/config/constants.ts`, `src/modules/iom/entities/iom.entity.ts`, `src/modules/iom/enums/iom-status-code.enum.ts`, `src/modules/iom/services/iom-eligibility.service.ts` (pagination/sort pattern), `src/modules/iom/services/iom-crm.service.spec.ts` (test style).
3. Use provider-native edit tools; do not paste full file contents, full diffs, or large code blocks in chat.
4. Run only validation commands listed below for the changed surface.

---

## Implementation Steps

1. **Create `ListIomListingDto`**
   - Extend `CommonFindAllQueryDto`
   - Add `listType` with `@IsOptional()` + `@IsIn(['eligible', 'ioms'])`, default `'eligible'`
   - Ensure `page`/`limit` constraints match current eligible listing

2. **Update imports**
   - Replace `ListEligibleBookingsDto` references in controller and `IomEligibilityService` with `ListIomListingDto` (eligible path ignores `listType`, `status`, date filters)

3. **Implement `IomListingService.findIoms`**
   - Inject `@InjectRepository(Iom)` (and optionally related repos if cleaner)
   - Mirror eligibility short-circuit and pagination
   - Build TypeORM query builder with joins and filters per spec
   - Validate `status` against `Object.values(IomStatusCodeEnum)` → `BadRequestException` if invalid
   - Map raw rows to `IomListItem[]`

4. **Wire module + controller**
   - Register provider and `Projects` entity
   - Inject `IomListingService` into controller
   - Branch `GET listing` on `listType === 'ioms'`

5. **Deprecate old DTO**
   - Remove `list-eligible-bookings.dto.ts` if fully replaced, or re-export/type-alias to avoid duplicate definitions

6. **Unit tests**
   - **DTO:** valid `listType` values; default; invalid `listType` rejected; pagination bounds; unknown query keys rejected by pipe (controller spec)
   - **Service:** empty `crmProjects`; project scoping; soft-delete exclusion; pagination math; search; valid/invalid status; date range; default sort; whitelisted sort
   - **Controller:** `listType=ioms` → `IomListingService`; default → `IomEligibilityService`; guards/roles unchanged

7. **Verify no regression**
   - Existing eligible listing behavior unchanged when `listType` omitted
   - Static route order unchanged (`listing` before `:id`)

---

## Validation Commands

Run from repo root after changes:

```bash
npm run test -- --testPathPattern=src/modules/iom
npm run lint
npm run build
```

Optional targeted runs during development:

```bash
npm run test -- src/modules/iom/services/iom-listing.service.spec.ts
npm run test -- src/modules/iom/iom.controller.spec.ts
npm run test -- src/modules/iom/dto/list-iom-listing.dto.spec.ts
```

Manual smoke (if dev env available):

```bash
# Eligible bookings (unchanged)
GET /api/{NODE_ENV}/iom/listing?page=1&limit=20

# IOM records
GET /api/{NODE_ENV}/iom/listing?listType=ioms&page=1&limit=20&sortBy=createdAt:DESC
GET /api/{NODE_ENV}/iom/listing?listType=ioms&status=IOM_CREATED&search=john
```

---

## Acceptance Criteria (adjusted for scope change)

1. `GET /api/iom/listing?listType=ioms` returns paginated IOM records for CRM users (prod/non-prod prefix unchanged).
2. `GET /api/iom/listing` without `listType` continues to return eligible bookings (backward compatible).
3. Only CRM role can access; same guard behavior as other IOM routes.
4. IOM list scoped to `user.crmProjects`; soft-deleted IOMs excluded.
5. Empty `crmProjects` → empty paginated result, no error.
6. `page`, `limit`, `total`, `totalPages` accurate for both modes.
7. `search`, `status`, `startDate`, `endDate`, `sortBy` work in `listType=ioms` mode per spec.
8. Each IOM list item includes baseline fields (§ Response shape above).
9. Read-only; no workflow side effects.
10. Existing IOM mutation/detail/PDF endpoints unchanged.
11. Unit tests + `npm run test`, `npm run lint`, `npm run build` pass.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Same route, different item shapes | Document `listType`; default preserves eligible-booking shape; FE must pass `listType=ioms` for IOM grid |
| Breaking eligible listing | Default `listType=eligible`; do not change `IomEligibilityService` query logic |
| Invalid `status` handling | Return `400` with explicit message; cover in service spec |
| Performance on large `ioms` table | Index review out of scope unless slow; query uses indexed columns (`project_id`, `deleted_at`, `created_at`) |
| `customerName` null on booking | Fallback to `customer_details` JSON if needed |
| DTO rename breaks imports | Grep for `ListEligibleBookingsDto` and update all references in `src/modules/iom/` |

---

## Assumptions

- `listType=ioms` is the CRM/FE contract for IOM-record listing (replaces spec’s `GET /iom/ioms`).
- Date filtering uses `ioms.created_at`.
- Status values are `IomStatusCodeEnum` codes matching `iom_statuses.code`.
- Invoice/collection legacy columns from `iom_management` dummy are **not** required for v1.
- No new migration unless profiling shows need (out of scope).
- `CommonFindAllQueryDto.status` is repurposed for IOM status code only in `listType=ioms` mode.
