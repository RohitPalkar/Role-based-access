# PUK-2 — Test Plan: Integrate Map User API in Batch Manager

| Field | Value |
|-------|--------|
| **Story** | PUK-2 |
| **Spec** | [spec.md](./spec.md) |
| **Implementation plan** | [implementation-plan.md](./implementation-plan.md) |
| **Framework** | Vitest + jsdom (`vite.config.ts`, `src/test/setup.ts`) |
| **Run command** | `yarn test:run` (see `docs/ai/context-map.json`) |

## Purpose

Define automated and manual verification for wiring `POST /batch-manager/map-vouchers/{batchId}` to the existing `NOTIFY_CX` dialog, without guessing full UI wiring before implementation lands.

**Constraints for this document phase:** no production edits; no new dependencies; reuse Vitest colocated `*.test.ts` / `*.test.tsx` patterns only.

---

## Test pyramid

| Layer | Priority | Scope |
|-------|----------|--------|
| **Unit (pure)** | **P0 — required** | `buildMapVouchersPayload` — notify-now vs scheduled, validation throws |
| **Unit (dialog behaviour)** | P1 — optional | `BatchListingDialogBox` NOTIFY_CX: schedule validation, async close, loading — only after props refactor |
| **Integration (Redux/service)** | **Defer** | No existing tests for `batch-manager-services` / thunks; do not introduce MSW/axios mocks in this story unless implementer adds a precedent file |
| **Component (parents)** | **Defer** | `batch-list-table-row`, `batch-manager-view` — heavy providers; cover via manual + optional dialog test |
| **Manual / E2E** | **P0** | Network payload, toasts, regression on MOVE/DELETE dialogs (spec Test Plan) |

---

## What to test (by acceptance criteria)

| AC | Automated | Manual |
|----|-----------|--------|
| AC-1 API route, service, thunk | — | Inspect code + one successful POST in devtools |
| AC-2 Map EOIs / generate-batches opens dialog | Optional RTL later | Map EOIs menu → dialog; generate-batches → dialog |
| AC-3 Notify Now: no `notifyAt` | **Unit:** `{}` from helper; parent passes `{}` to thunk | Network body has no `notifyAt` key |
| AC-4 Schedule: ISO `notifyAt`; invalid blocks API | **Unit:** helper + missing date/time throws; optional dialog validation | Schedule path + empty submit |
| AC-5 Loading / toasts | Optional: assert `LoadingButton` / disabled when mock slow submit | Spinner/disabled; sonner success/error |
| AC-6 No regression other dialogs | — | DELETE / MOVE smoke |
| AC-7 Unit tests for payload | **Required** `build-map-vouchers-payload.test.ts` | — |

---

## P0 — Unit tests: `buildMapVouchersPayload`

**File (implementer creates):** `src/sections/common-module/batch-manager/utils/build-map-vouchers-payload.ts`  
**Test file:** `src/sections/common-module/batch-manager/utils/build-map-vouchers-payload.test.ts` (starter with `it.todo` exists pre-implementation)

**Convention reference:** `batch-preview-build-rows.test.ts`, `batch-manager-shared.test.ts` — plain `describe` / `it`, `vitest` imports, no DOM.

### Cases (implementer fills assertions)

| # | Input | Expected |
|---|--------|----------|
| 1 | `{ mode: 'now' }` | `{}` — object must **not** have own property `notifyAt` (`expect(result).not.toHaveProperty('notifyAt')`) |
| 2 | `{ mode: 'scheduled', date, time }` with fixed values | `{ notifyAt: string }` matching `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/` |
| 3 | `{ mode: 'scheduled', date: valid, time: null \| '' }` | throws (message per implementation) |
| 4 | `{ mode: 'scheduled', date: null \| '', time: valid }` | throws |
| 5 | invalid combined date/time (if helper validates) | throws `'Invalid date or time'` or equivalent |

### Implementation notes for tests

- Use **`vi.setSystemTime`** when “today” affects date parsing (same idea as plan Step 3).
- **Date/time shapes:** Dialog stores Formik + RHF values — confirm actual `Field.Date` / `Field.Time` values (Dayjs vs string) after implementation; normalize with `dayjs()` in helper. If time strings match batch preview (`10:00 PM`), consider reusing **`parseScheduleHm`** from `batch-preview-build-rows.ts` — add a focused test only if helper delegates to it.
- **Timezone (Q5):** Assert `.toISOString()` UTC `Z` suffix, not local display strings.
- **Do not** assert exact wall-clock unless inputs are fully fixed; prefer regex on ISO shape + optional snapshot of known input pair.

### Example assertion sketch (post-implementation)

```ts
// TODO: replace with real imports and fixed fixtures once helper exists
// const result = buildMapVouchersPayload({ mode: 'now' });
// expect(result).toEqual({});
// expect(result).not.toHaveProperty('notifyAt');
```

---

## P1 — Optional RTL: `BatchListingDialogBox`

**File:** `src/sections/common-module/batch-manager/components/batch-listing-dialog-box.test.tsx` (create only when NOTIFY_CX props are stable)

**Why optional:** Only `src/test/smoke.test.tsx` uses RTL today; batch-manager tests are **utils-only**. Dialog test is valuable but needs mocks for Redux (`useAppSelector`), Formik, RHF `Field.*`, and `ConfirmDialog`.

**Current bug to drive tests** (lines ~326–331): NOTIFY_CX calls `onSubmit?.()` and closes immediately — no validation, no await.

### Behaviours to cover (after `onNotifySubmit` / `isNotifySubmitting` exist)

| Scenario | Assert |
|----------|--------|
| Notify Now | `onNotifySubmit` called with `{ mode: 'now' }`; dialog **stays open** until promise resolves; closes on success |
| Schedule → Submit invalid | `onNotifySubmit` **not** called; field errors visible (TODO: query by label from `dialogJson.nofityCx.date` / time) |
| Schedule → Submit valid | `onNotifySubmit` with `{ mode: 'scheduled', date, time }` |
| Submit in flight | Primary button disabled / `LoadingButton` loading (TODO: role/name from locale `uiText.button.submit` / `dialogJson.nofityCx.actionLabel`) |
| Submit failure | Dialog remains open (parent rejects / throws) |
| MOVE dialog | Unchanged — still uses `onSubmit` with batch fields; **no** `onNotifySubmit` |

### Mocking strategy (when implemented)

- `vi.mock('src/hooks/use-redux', () => ({ useAppSelector: () => ({ batchSlotsDropdownData: [] }) }))`
- Pass minimal props: `dialog={true}`, `setDialog={vi.fn()}`, `type="NOTIFY_CX"`, `onNotifySubmit={vi.fn()}`
- **Do not** mock axios in dialog tests — parent owns API.

---

## Explicitly out of scope (automated)

| Area | Reason |
|------|--------|
| `mapBatchVouchers` service / `mapBatchVouchersAction` | No service/thunk tests in repo; contract covered by manual + parent wiring review |
| `apiRoutes.ts` constant | Trivial; AC-1 manual |
| `batch-list-table-row` full render | Popover, router, dispatch — manual AC-2 |
| `batch-manager-view` full flow | Large surface; manual generate-batches → notify path |
| Preferential row (`batch-preferential-cust-list-row`) | **Deferred** until real `batchId` from parent (plan Q2) |
| Toast copy exact strings | Use loose matchers or skip; server message varies |
| Renaming menu labels | No test |

---

## Starter tests (pre-implementation)

| File | Status |
|------|--------|
| `utils/build-map-vouchers-payload.test.ts` | `it.todo` placeholders — **green in CI**, enable when helper lands |
| `components/batch-listing-dialog-box.test.tsx` | Optional `it.todo` suite — add when dialog props finalized |

**Workflow:** Implementer replaces `it.todo` with real tests as `build-map-vouchers-payload.ts` and dialog refactor land; run `yarn test:run` before PR.

---

## Manual test checklist

From spec + plan — execute after implementation:

1. **Batch listing** → row menu → **Map EOIs** → notify dialog opens (not only `console.log`).
2. **Notify Now** → `POST .../map-vouchers/{row.id}` with body `{}` (no `notifyAt` key).
3. **Schedule for later** → date + time → Submit → body `{ notifyAt: "<ISO UTC>" }`.
4. Schedule submit with missing date or time → validation, **no** POST.
5. **Batch manager view** → Map EOIs to batches (after save) → same dialog → API with `id || sessionBatchId`.
6. **Notify Cx** on listing (plan Q1: same API) → same payload rules as Map EOIs.
7. **4xx/5xx** → error toast; dialog open for retry where implemented.
8. **Regression:** Delete batch, Move customer dialogs unchanged.
9. **Navigation:** success from view uses `generateRoleBasedRoute(userRole, 'batch/listing')` (not hardcoded `/admin/...` only).

---

## Quality gates

```bash
yarn type-check
yarn lint
yarn fm:check
yarn test:run
```

---

## File checklist for implementer

| Action | Path |
|--------|------|
| Create helper | `src/sections/common-module/batch-manager/utils/build-map-vouchers-payload.ts` |
| **Complete unit tests** | `src/sections/common-module/batch-manager/utils/build-map-vouchers-payload.test.ts` |
| Wire production | `apiRoutes.ts`, `batch-manager-services.ts`, `batch-manager-actions.ts`, dialog, rows, view |
| Optional RTL | `components/batch-listing-dialog-box.test.tsx` |

---

## Risks for test authors

| Risk | Test mitigation |
|------|-----------------|
| Wrong time parser for `Field.Time` | One integration-style unit test with real dialog field values copied from implementation |
| `BatchListData.id` number vs UUID string | Parent tests use `String(row.id)` — unit helper ignores batchId |
| Formik schema validates MOVE fields on NOTIFY_CX | Dialog tests only trigger NOTIFY_CX path; document if shared schema causes false positives |
| Flaky dates | `vi.setSystemTime` + fixed date strings |

---

## Definition of done (testing)

- [ ] All `it.todo` in `build-map-vouchers-payload.test.ts` replaced; file passes.
- [ ] AC-3 and AC-4 covered by unit cases 1–5 above.
- [ ] `yarn test:run` green.
- [ ] Manual checklist executed for listing + view paths.
- [ ] Optional dialog RTL added only if stable and maintained; otherwise manual AC-4/AC-5 for schedule validation and loading.
