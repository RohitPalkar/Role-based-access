# Implementation Plan: TEST 2 — Bulk Test Case Creation (SAFE areas)

## Goal
Bulk-add deterministic Vitest + RTL tests across SAFE areas in `src/` without modifying production code. Prioritize converting the existing `it.todo` skeletons into real assertions, then add colocated tests for additional pure helpers/hooks/reducers/selectors.

## Context Budget
- Inspect the target files in this plan first; do not run broad repo scans.
- Open non-target files only when needed for: (a) the production function being tested (same folder), (b) a direct import or type, (c) the closest existing test as a style reference, or (d) `vite.config.ts` / `src/test/setup.ts` for setup confirmation.
- Use provider-native edit tools to add/modify files. Do not paste full file contents, full diffs, or long code blocks in chat — apply edits directly.
- After each batch, run only the validation commands needed for the touched surface (single test file or folder via `yarn vitest run <path>`); save the full quality gates for the end.
- Do NOT read `node_modules/`, `dist/`, `coverage/`, route modules, role-route trees, CSP, Sentry, or any execution/history artifact under `.opencode/`, `docs/ai/stories/*/execution*/`. Treat `package.json` as already verified — no need to reopen.

## Target Files

### A. Convert existing `it.todo` skeletons into real tests (highest leverage)
1. `src/utils/storage-available.test.ts` — flesh out 5 todos against `src/utils/storage-available.ts`.
2. `src/utils/role-table-head.test.ts` — flesh out 10 todos against `src/utils/role-table-head.ts`.
3. `src/utils/normalize-api-mutation-response.test.ts` — flesh out 16 todos against `src/utils/normalize-api-mutation-response.ts`.
4. `src/hooks/use-boolean.test.ts` — flesh out 7 todos against `src/hooks/use-boolean.ts` using `renderHook` + `act`.
5. `src/redux/slices/admin/title-slice.test.ts` — flesh out 5 todos against `src/redux/slices/admin/title-slice.ts` (pure reducer tests for `setTitleAsync.{pending,fulfilled,rejected}`).

### B. New colocated tests for additional SAFE pure modules (create files)
6. `src/utils/format-time.test.ts` — for `format-time.ts`: `fDate`, `fDateTime`, `fTime`, `fTimestamp`, `fIsBetween`, `fIsAfter`, `fIsSame`, `fDateRangeShortLabel`. Cover `null`/`undefined`/invalid inputs and the documented branches. Use `vi.useFakeTimers()` + `vi.setSystemTime()` only where the function reads "now" (`fAdd`, `fSub`, `today`, `fToNow`).
7. `src/utils/groups.test.ts` — for any pure grouping helpers exported from `src/utils/groups.ts` (open the file; if exports are non-pure or DOM-dependent, document and skip in plan output).
8. `src/utils/payment.test.ts` — for pure helpers in `src/utils/payment.ts` only (skip anything that calls a real Razorpay/Easebuzz SDK; mock the module if needed).
9. `src/utils/brand-asset-specs.test.ts` — for pure config lookups in `src/utils/brand-asset-specs.ts` (shape assertions on the exported maps).
10. `src/utils/env.test.ts` — assert shape and `Record` keys exported from `src/utils/env.ts`; do not assert against real env values, only structure and fallback behavior.
11. `src/utils/signature-utils.test.ts` — for pure helpers in `src/utils/signature-utils.ts` (only if free of DOM/canvas side effects; otherwise drop with a one-line note).
12. `src/utils/upload-utils.test.ts` — for pure helpers in `src/utils/upload-utils.ts` (size/type validators and name sanitizers only; skip anything calling `FileReader` unless already mocked in neighbouring tests).
13. `src/utils/parse-xlsx-sheet.test.ts` — for pure rows→objects mappers in `src/utils/parse-xlsx-sheet.ts`. Mock `xlsx` only if the unit is not pure.

### C. New colocated hook tests (create files)
14. `src/hooks/use-local-storage.test.ts` — for `use-local-storage.ts` using `renderHook` and a mocked `window.localStorage` (already jsdom-backed). Assert initial value, set, remove, JSON parse failure fallback, and SSR-style guards if present.
15. `src/hooks/use-set-state.test.ts` — for `use-set-state.ts`: assert merge-style updates and stable callbacks.
16. `src/hooks/use-tabs.test.ts` — for `use-tabs.ts`: initial value, `onChange` updates, callback identity.
17. `src/hooks/use-event-listener.test.ts` — for `use-event-listener.ts`: attaches/detaches via spies on `addEventListener` / `removeEventListener`; verify handler invocation. Use only mounted/unmounted lifecycle via `renderHook`.

### D. New reducer tests (create files)
18. `src/redux/slices/country-list-slice.test.ts` — pure reducer + selector tests for `country-list-slice.ts`. Build a minimal `RootState` shape inline; do not boot a real store.
19. `src/redux/slices/admin/common-slice.test.ts` — reducer transitions only for stable actions exported by `common-slice.ts`. If the slice has unstable, in-flight behaviour, document and reduce scope to deterministic cases.

> Implementer: before creating files in section D, read the corresponding slice and pick only the action types whose behaviour is stable (synchronous reducers + already-implemented `extraReducers` matchers). Defer anything currently undergoing change.

### E. Optional services tests with mocked Axios (create only if pure response normalization exists)
20. For a single, simple service helper (e.g., one method in `src/services/admin-services/*` that just shapes a response), add `*.test.ts` colocated next to it. Mock `src/services/axiosInstance.ts` via `vi.mock` and verify: method, URL (against `apiRoutes.ts` constant), payload, and the normalized return value. Skip anything that exercises interceptors.

Files explicitly NOT to touch (out of scope):
- `src/routes/**`, `src/services/axiosInterceptors.ts`, `csp/**`, `vite-plugin-csp/**`, role/permission gates, Sentry init, anything under `src/redux/slices/common-module/batch-manager*` already covered, `src/test/smoke.test.tsx`.

## Implementation Steps

1. **Pre-flight (no code changes).**
   - Skim `vite.config.ts` `test` block (already confirmed: `jsdom`, `setupFiles: ['./src/test/setup.ts']`, `globals: false`, `clearMocks/restoreMocks: true`) — no config changes needed.
   - Confirm `src/test/setup.ts` exists and loads `@testing-library/jest-dom/vitest` — no changes.
   - Reuse one existing real test as the style reference (e.g., `src/utils/helper.test.ts` for plain utils; `src/sections/common-module/batch-manager/utils/build-map-vouchers-payload.test.ts` for fake-timers pattern). Do not introduce a new test-utils render helper.

2. **Batch A — Fill in `it.todo` skeletons (5 files).** Work file-by-file in this order to maximize coverage per LOC:
   1. `src/utils/storage-available.test.ts`
      - `localStorageAvailable`: returns `true` when `localStorage` is writable; returns `false` and calls `console.error` (spy with `vi.spyOn(console, 'error').mockImplementation(() => {})`) when `setItem` throws (use `vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => { throw new Error('quota'); })` then restore).
      - `localStorageGetItem`: returns stored value; returns default when key missing; returns `undefined` when unavailable (mock `setItem` to throw).
   2. `src/utils/role-table-head.test.ts` — assert each branch listed in the todos; build representative inputs inline as a const fixture.
   3. `src/utils/normalize-api-mutation-response.test.ts` — read each todo, build minimal Axios-like response objects, assert exact normalized shapes.
   4. `src/hooks/use-boolean.test.ts` — `renderHook(() => useBoolean())` and `useBoolean(true)`; `act(() => result.current.onTrue())` etc.; for "stable identities" assert `prev.onTrue === next.onTrue` across a state-changing rerender.
   5. `src/redux/slices/admin/title-slice.test.ts` — call the reducer directly with synthetic actions:
      ```ts
      reducer(undefined, { type: '@@INIT' })
      reducer(initial, { type: setTitleAsync.pending.type })
      reducer(initial, { type: setTitleAsync.fulfilled.type, payload: 'X' })
      reducer(initial, { type: setTitleAsync.rejected.type, error: { message: 'boom' } })
      reducer(initial, { type: setTitleAsync.rejected.type, error: {} })
      ```
      Assert exact `{ title, loading, error }` shape.

3. **Batch B — Pure utility tests (8 files).** For each file in section B:
   - Open only the production module and (if helpful) the closest sibling test.
   - Create a colocated `*.test.ts` (no TSX needed — these are non-DOM).
   - Use `describe(file, () => { describe(fnName, () => { it('...'); }) })`.
   - Cover: happy path, `null`/`undefined`/`''`/`[]`/`0`, and any explicit branch in the source.
   - If a function relies on the current time, wrap with `beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z')); })` and restore in `afterEach`.
   - If a function turns out to be non-pure or DOM-bound, drop it from the test and add a one-line `// not pure; covered elsewhere` note in the test file; do NOT change the production file.

4. **Batch C — Hook tests (4 files).**
   - Use `renderHook` from `@testing-library/react`.
   - No providers unless the hook imports one. Hooks listed here are framework-only.
   - For `use-local-storage`, isolate via `beforeEach(() => { window.localStorage.clear(); })`.
   - For `use-event-listener`, spy `addEventListener` / `removeEventListener` on the target (e.g., `window`) and assert add/remove counts on mount/unmount.

5. **Batch D — Reducer tests (2 files).**
   - Import the reducer (default export) and the action creators.
   - Test as pure functions: `reducer(state, action)` returns the expected next state.
   - For selectors, build the smallest `RootState`-shaped fixture inline (`as RootState` or `as unknown as RootState` only if `RootState` shape would cause copy-paste bloat; prefer explicit shape).
   - Do NOT dispatch through a real store.

6. **Batch E — Optional service test (1 file).** Implement only if a pure, response-shaping service helper exists. Pattern:
   ```ts
   vi.mock('src/services/axiosInstance', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
   ```
   Assert: `axiosInstance.get` called with the URL exported from `apiRoutes.ts` (import the constant, do not hardcode); assert the helper returns the normalized payload. Skip interceptor behaviour.

7. **Shared helpers (only if duplication appears).**
   - If two or more new tests need the same fixture/factory, create a single small helper colocated with the tests (e.g., `src/utils/__fixtures__/<area>.ts`) or under `src/test/` next to `setup.ts`. Do NOT preemptively create helpers.

8. **Hygiene per file.**
   - Imports: `import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';` (omit unused).
   - Prefer `getByRole`/`getByLabelText` if rendering React (no DOM rendering is required for any of the targets above — keep them all `.test.ts`).
   - Strict equality (`===`), explicit null/undefined checks, no snapshot-only assertions, no test IDs added to source.
   - No `console.error`/`console.warn` from tests; if asserted, use a `vi.spyOn(console, 'error').mockImplementation(...)` and restore.
   - No new dependencies; no ESLint disables (escape hatches only with a one-line justification).

## Validation Commands
Run incrementally during work; full gates at the end.

Per-file or per-folder while iterating:
```bash
yarn vitest run src/utils/storage-available.test.ts
yarn vitest run src/utils
yarn vitest run src/hooks
yarn vitest run src/redux/slices
```

Final gates (must all pass before handoff):
```bash
yarn type-check
yarn lint
yarn fm:check
yarn test:run
yarn test:coverage   # report delta in PR description
```

## Risks
- **`it.todo` skeletons may not match current production exports.** If a referenced export has been renamed, do not rename it in production. Drop or rename the test description; flag as an open question.
- **Hidden side effects.** Some utils named "pure" may pull DOM/cookies/storage. If discovered, narrow the test scope to deterministic branches; do not change production code to make it testable (escalate as Open Question per spec §19).
- **Time-dependent helpers.** `format-time` outputs depend on the user's TZ. Use `vi.setSystemTime` and assert on `dayjs(...).format(...)` for the explicit expected string (or assert via `dayjs` equivalence rather than literal strings) to avoid TZ flakes.
- **Reducer instability.** Some slices may still be evolving (e.g., common-module bookings). Test only stable action types; skip in-progress ones.
- **Lint config.** `eslint-plugin-perfectionist` may enforce import ordering — let `yarn lint:fix` and `yarn fm:fix` normalize imports rather than hand-ordering.
- **Coverage provider.** `coverage.all: false` in `vite.config.ts` means only touched files are reported. Adding tests will *expand* the touched set, which is the intent; no config change required.

## Assumptions
- No changes to `vite.config.ts`, `src/test/setup.ts`, `package.json`, ESLint, Prettier, or any production source.
- MSW is not used in this repo today (only `@testing-library/*` + `vitest` are wired); service tests will mock the Axios module directly per `vi.mock('src/services/axiosInstance', ...)`.
- "Bulk" = as many SAFE tests as can be added without violating the no-production-change rule; sections A–D are the committed scope, section E is opportunistic.
- Existing colocated convention (`<name>.test.ts(x)` next to the source) is the only convention; no `__tests__/` folder is introduced unless the neighbouring file already uses one.
- The implementer may split delivery into per-area commits (utils → hooks → redux → services) but ships as a single story.
