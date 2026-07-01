# PUK-2 — Integrate Map User API in Batch Manager Components

| Field | Value |
|-------|--------|
| **JIRA** | PUK-2 |
| **Title** | Integrate Map User API in Batch Manager Components |
| **Status** | Ready for implementation planning |

## Summary

Wire the Batch Manager **map vouchers / map users** flow to the backend `POST /batch-manager/map-vouchers/{batchId}` endpoint. When the user confirms mapping, show the existing **Notify** confirmation dialog (`NOTIFY_CX` in `BatchListingDialogBox`) with **Notify Now** vs **Schedule Notification**, build the request body (`notifyAt` only when scheduled), and follow the same API / Redux / toast / loader patterns used elsewhere in Batch Manager (notably `batch-manager-view` and `batch-manager-configuration`).

## Problem / Goal

Batch Manager already has UI stubs and a notify dialog shell, but mapping and notification are not connected to the API (`console.log` placeholders). This story completes the integration without changing unrelated Batch Manager behaviour.

## In Scope

- API route constant, service helper, and Redux async thunk for map-vouchers.
- Payload construction: optional `notifyAt` (ISO-8601 UTC string).
- Connect **Map User / Map EOIs** entry points to open the notify dialog and call the API on confirm.
- Loader state on dialog primary action during the request.
- Success and failure feedback via existing toast patterns (`sonner`).
- Scheduled path: separate date and time fields (already in dialog UI), combined before submit.
- **Notify Now** path: POST with `{}` or no `notifyAt` key (do not send `notifyAt`).
- Tests for payload builder and key UI/API behaviour where the area already uses Vitest.

## Out of Scope

- New notify dialog design or copy changes (use `uiText.batchManager.dialog.nofityCx` unless API messages require server text).
- Backend contract changes beyond documented `notifyAt`.
- Preferential customer **Move** dialog API (separate story).
- Replacing dummy preferential customer listing data.
- Renaming menu labels (`Map EOIs`, `Notify Cx`) unless product explicitly requests alignment with “Map User”.

## References (codebase)

| Area | Path |
|------|------|
| Batch create/edit + generate → notify | `src/sections/common-module/batch-manager/batch-manager-view.tsx` |
| Configuration / schedule / dayjs patterns | `src/sections/common-module/batch-manager/batch-manager-configuration-form.tsx` |
| Notify dialog (two-step UX) | `src/sections/common-module/batch-manager/components/batch-listing-dialog-box.tsx` |
| Batch listing row actions | `src/sections/common-module/batch-manager/components/batch-listing/batch-list-table-row.tsx` |
| Preferential listing notify | `src/sections/common-module/batch-manager/components/batch-preferential-cust-listing/batch-preferential-cust-list-row.tsx` |
| API routes | `src/services/apiRoutes.ts` |
| Batch services (pattern) | `src/services/common-module/batch-manager-services.ts` |
| Redux actions (pattern) | `src/redux/actions/common-module/batch-manager-actions.ts` |
| Copy | `src/locales/langs/en/common.json` → `batchManager.dialog.nofityCx`, `batchManager.actions.*` |
| Permissions | `src/config/role-based-permissions.ts` → `mapEois`, `notifyCx`, `generateBatches` |
| Project stack / quality | `docs/ai/project-context.md`, `docs/ai/context-map.json` |

## API Contract

### Endpoint

```
POST {baseUrl}/batch-manager/map-vouchers/{batchId}
Content-Type: application/json
Authorization: Bearer <token>   # via axios interceptors
```

`batchId` is the batch UUID/string from the active row or session (e.g. listing `row.id`, edit flow `id || sessionBatchId`).

### Request body

| Field | Type | When |
|-------|------|------|
| `notifyAt` | string (ISO-8601 UTC, e.g. `2026-05-20T14:00:00.000Z`) | Only when user chooses **Schedule Notification** and submits with valid date + time |
| *(omit `notifyAt`)* | — | **Notify Now** — do not include `notifyAt` in the JSON body |

Example (scheduled):

```json
{
  "notifyAt": "2026-05-20T14:00:00.000Z"
}
```

Example (notify now):

```json
{}
```

(or equivalent empty object; implementation must not send `notifyAt: null` unless backend requires it—confirm in Assumptions).

### Response handling

- Follow existing batch service conventions: treat HTTP 200/201 as success; surface `response?.response?.message` or a sensible default in success toast.
- On error: `error?.response?.data?.errors?.message || error?.message` → error toast (same as `deleteBatch`, `updateBatchManager`).

## Functional Requirements

### FR-1 — Map User CTA opens notify dialog

When the user triggers the **Map User** flow (see UI mapping below), open `BatchListingDialogBox` with `type === 'NOTIFY_CX'` and the correct `batchId` in closure/context for submit.

Existing dialog behaviour to preserve:

1. **Initial step**: title “Notify Customers?”, primary **Notify Now**, secondary/cancel **Schedule for later** (`dialogJson.nofityCx.cancdlLabel`).
2. **Schedule step**: show date (`Field.Date`) and time (`Field.Time`); primary becomes Submit; cancel resets schedule fields.

### FR-2 — Notify Now

- User clicks **Notify Now** on the first step.
- Call `POST .../map-vouchers/{batchId}` with a body that does **not** include `notifyAt`.
- On success: success toast, close dialog, refresh or navigate per existing handler (e.g. listing refresh, or redirect after generate flow—match current `handleNotifyCxSubmit` intent in `batch-manager-view.tsx`).
- On failure: error toast, keep dialog open or close per neighbouring actions (prefer close only on success; on error leave dialog open if user may retry).

### FR-3 — Schedule Notification

- User chooses **Schedule for later** → date/time fields visible.
- User selects **date** and **time** separately (already rendered in `renderNotifyCxContent`).
- On **Submit**: validate both fields; combine into one instant; send `notifyAt` as ISO UTC (e.g. `dayjs(date).hour(...).minute(...).toISOString()` — align with project dayjs usage in configuration form and dialog).
- Do not send request until validation passes; show field-level or toast validation errors consistent with nearby forms.

### FR-4 — Loading and disabled state

- While the map-vouchers request is in flight, disable dialog primary button and show loading (e.g. `LoadingButton` or `disabled` + loading flag), matching patterns in `batch-manager-view` / `add-batch-modal`.

### FR-5 — No regression

- Other dialog types (`MOVE`, `DELETE`, `LOCK`, etc.) unchanged.
- Batch configuration, preview table, slot listing, and listing navigation behave as today except where explicitly wired to this API.
- Role-based visibility of actions remains driven by `role-based-permissions.ts`.

## UI Notes

### Notify dialog (existing)

- Component: `BatchListingDialogBox` (`NOTIFY_CX`).
- Locale key typo preserved: `nofityCx` in `common.json`.
- Date picker: `minDate={dayjs().startOf('day')}`.
- Extend dialog props as needed to accept `batchId` and optional `onSuccess` callback; avoid duplicating dialog markup in each row component.

### CTA naming vs story

| Story term | Current UI / code id | Location |
|------------|----------------------|----------|
| Map User | `mapEois` — “Map EOIs” | Batch listing row menu (`batch-list-table-row.tsx`) |
| Map EOIs to batches (post-preview) | `generateBatches` | `batch-preview-table.tsx` → `handleGenerateBatches` in `batch-manager-view.tsx` (already opens notify dialog after successful save) |
| Notify Cx | `notifyCx` | Listing + preferential row menus (notify-only; same dialog, same API if product intent is unified) |

Implementation should treat **map-vouchers** as the API for the **mapping + notify** flow after Map User / Map EOIs actions. Whether **Notify Cx** alone should call the same endpoint without a prior map step is an open product question (see below).

## Implementation Notes

### Suggested layering

1. **`apiRoutes.ts`**: add e.g. `BATCH_MANAGER_MAP_VOUCHERS: '/batch-manager/map-vouchers'`.
2. **`batch-manager-services.ts`**: `mapBatchVouchers(batchId: string, body?: { notifyAt?: string })` using `POST(\`${route.BATCH_MANAGER_MAP_VOUCHERS}/${batchId}\`, body ?? {})`.
3. **`batch-manager-actions.ts`**: `mapBatchVouchersAction` `createAsyncThunk` with `rejectWithValue`.
4. **Pure helper** (unit-testable): `buildMapVouchersPayload({ mode: 'now' | 'scheduled', date?, time? })` → `{}` or `{ notifyAt }`.
5. **Wire submit handlers** in:
   - `batch-list-table-row.tsx` — `handleMapEois` should open notify dialog (not only `console.log`); submit calls API with `row.id`.
   - `batch-manager-view.tsx` — `handleNotifyCxSubmit` / post-`handleGenerateBatches` flow with `id || sessionBatchId`.
   - `batch-preferential-cust-list-row.tsx` — only if product confirms same batch context (may need batch id from route params).
6. **Fix `BatchListingDialogBox` NOTIFY_CX handler**: today `handleAction` invokes `onSubmit?.()` and closes immediately without date/time validation or API await; implementation must validate schedule fields, call parent async submit, and manage loading/close on result.
7. **Date/time merge**: use `dayjs`; respect IST/display helpers only if existing batch flows do—payload must be UTC ISO per API example.
8. **Quality gates**: `yarn type-check`, `yarn lint`, `yarn fm:check`, `yarn test:run`.

### Touchpoints with stub handlers today

```text
batch-list-table-row.tsx     → handleMapEois (stub), handleNotifyCxSubmit (stub)
batch-manager-view.tsx       → handleNotifyCxSubmit (stub + redirect), handleGenerateBatches → handleNotifyCx
batch-preferential-cust-list-row.tsx → handleNotifyCxSubmit (stub)
batch-listing-dialog-box.tsx → NOTIFY_CX UI present; API not wired
```

## Acceptance Criteria

### AC-1 — API integration

- [ ] `BATCH_MANAGER_MAP_VOUCHERS` (or equivalent) is registered in `apiRoutes.ts` and used only via `axiosInstance` wrappers.
- [ ] Service and Redux thunk exist and follow the same error-message extraction pattern as `deleteBatch` / `updateBatchManager`.

### AC-2 — Map User CTA opens notify dialog

- [ ] Clicking **Map EOIs** (`mapEois`) on the batch listing opens the notify dialog (`NOTIFY_CX`) without changing other menu actions.
- [ ] After successful **Map EOIs to batches** (`generateBatches`) in batch manager view, the notify dialog still opens as today, but submit calls the real API.

### AC-3 — Notify Now payload

- [ ] Confirming **Notify Now** sends `POST /batch-manager/map-vouchers/{batchId}` with no `notifyAt` property in the JSON body.

### AC-4 — Scheduled notification payload

- [ ] **Schedule for later** reveals date and time fields (existing UX).
- [ ] Submit with valid date and time sends `notifyAt` as a single ISO-8601 UTC string (format consistent with `2026-05-20T14:00:00.000Z`).
- [ ] Submit without required date/time does not call the API and shows validation feedback.

### AC-5 — Feedback and loading

- [ ] Primary action shows loading/disabled state for the duration of the request.
- [ ] Success shows a success toast (server message when available).
- [ ] Failure shows an error toast with the API/error message; user can correct and retry where dialog remains open.

### AC-6 — Behaviour preservation

- [ ] MOVE, DELETE, LOCK, UNLOCK, RELEASE, OPEN_BATCH dialogs behave unchanged.
- [ ] Batch configuration form, preview generation, and listing navigation are unaffected except intended map/notify wiring.
- [ ] Role-based action visibility unchanged.

### AC-7 — Tests

- [ ] Unit tests cover `buildMapVouchersPayload` (or equivalent) for notify-now vs scheduled cases.
- [ ] At least one test documents scheduled datetime combination edge case (e.g. missing time).
- [ ] Optional RTL test: NOTIFY_CX schedule path validates before submit (if dialog refactor allows stable selectors).

## Assumptions

- **Map User** in JIRA maps to existing **Map EOIs** (`mapEois`) and/or the post-preview **Map EOIs to batches** (`generateBatches`) flow; both use the same `map-vouchers` endpoint with the batch’s id.
- HTTP method is **POST** (per provided curl).
- **Notify Now** means an empty object body or body without `notifyAt`; not `notifyAt: null`.
- `batchId` in the path is the batch manager record id (UUID in curl example), matching `BatchListData.id` / `sessionBatchId`.
- Auth headers and base URL are handled by existing axios interceptors; no new env vars.
- Success HTTP codes are 200 and/or 201, consistent with other batch-manager services.

## Open Questions

1. **Notify Cx-only action**: Should `notifyCx` on batch listing / preferential listing call `map-vouchers` as well, or is it a separate future API? Currently it opens the same dialog but story title emphasizes “Map User.”
2. **Preferential listing context**: Preferential row may not have `batchId` on the row model—confirm id source (route param `batch/listing/...`) before wiring API there.
3. **Post-success navigation**: `batch-manager-view` today redirects to `/admin/batch/listing` on notify submit stub—retain for all roles or use `generateRoleBasedRoute(userRole, ...)`?
4. **Empty body vs omitted body**: Does backend accept `{}` for notify-now, or require no body at all?
5. **Timezone**: API example uses `Z` (UTC). Confirm whether UI date/time is entered in local/IST and converted to UTC for `notifyAt`.
6. **Product naming**: Align UI copy “Map EOIs” / “Notify Cx” with “Map User” or keep existing strings (story says maintain UI).

## Conflicts (story vs codebase)

| Item | Story / curl | Codebase today | Resolution |
|------|----------------|----------------|------------|
| CTA label | “Map User” | “Map EOIs” (`mapEois`) | Implement against `mapEois` / `generateBatches` unless product renames copy |
| Endpoint name | `map-vouchers` | No route constant yet | Add `map-vouchers` route; do not invent `map-user` path |
| Notify dialog submit | Must call API with payload rules | `onSubmit` logs only; dialog closes immediately | Wire in this story |
| `mapEois` handler | Should open notify popup | `console.log` only, no dialog | Fix in this story |

## Test Plan (manual)

1. Batch listing → row actions → **Map EOIs** → dialog opens.
2. **Notify Now** → network shows POST `.../map-vouchers/{id}` without `notifyAt` → success toast.
3. **Schedule for later** → pick future date + time → Submit → body includes `notifyAt` ISO UTC.
4. Schedule submit with missing date or time → validation, no API call.
5. Batch manager edit/create → **Map EOIs to batches** → after save, notify dialog → same API behaviour.
6. Failure path (mock 4xx/5xx) → error toast, loading cleared.
7. Regression: Delete batch, Move customer dialogs still work.

## Pipeline Handoff

- **Primary files to change**: `apiRoutes.ts`, `batch-manager-services.ts`, `batch-manager-actions.ts`, `batch-listing-dialog-box.tsx`, `batch-list-table-row.tsx`, `batch-manager-view.tsx` (+ preferential row if Q1/Q2 confirmed).
- **Quality**: Run full gates in `context-map.json` before PR.
- **Permissions**: No change expected unless new action id is introduced.
