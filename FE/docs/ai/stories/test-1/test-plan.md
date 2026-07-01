# Test Plan: write test cases (test-1)

> Authoritative test strategy for story `test-1`. Aligns with `docs/ai/stories/test-1/spec.md`, `docs/ai/stories/test-1/implementation-plan.md`, and the workspace testing rules in `.cursor/rules/frontend-testing.mdc`.

## 1. Goal

Raise statement/line coverage on currently under-tested modules **without changing product behaviour** by adding deterministic Vitest + RTL tests on the cheapest-coverage targets:

- Pure utilities under `src/utils/**`
- Redux Toolkit slice reducers under `src/redux/slices/**`
- Custom hooks under `src/hooks/**`
- Finalising the two in-flight component tests under `src/sections/common-module/batch-manager/**`

The story is **coverage uplift**, not a feature change — every new test file targets code with low/no existing coverage.

## 2. Detected Test Stack (do not change)

| Item | Value |
|------|-------|
| Framework | **Vitest 3** (configured in `vite.config.ts → test`) |
| DOM env | **jsdom 25** |
| Setup | `src/test/setup.ts` (`@testing-library/jest-dom/vitest`) |
| Component testing | `@testing-library/react 16` + `@testing-library/user-event 14` |
| Coverage | `@vitest/coverage-v8` via `yarn test:coverage` |
| Test file globs | `**/*.{test,spec}.{ts,tsx,js,jsx}` |
| Test commands | `yarn test` (watch), `yarn test:run` (CI), `yarn test:coverage` |

**Hard constraints respected:**

- No new test framework, no new dependencies, no new MSW.
- No edits to product source files, `vite.config.ts`, or `src/test/setup.ts`.
- Match neighbouring test conventions: file colocated next to source, named `<file>.test.ts(x)`.

## 3. Conventions (every new test file must follow)

1. **Imports order** (matches `src/utils/helper.test.ts`):
   ```ts
   import { it, vi, expect, describe, beforeEach } from 'vitest';
   // RTL imports (when used)
   import { render, screen, renderHook, act } from '@testing-library/react';
   // path-aliased project imports (src/...)
   // relative imports
   ```
2. **Structure**: one top-level `describe(<module name>)`, nested `describe` per exported function/behaviour, one main behaviour per `it`.
3. **Queries**: prefer `getByRole` / `getByLabelText` / `getByText` over `getByTestId`.
4. **Async**: `findBy*` / `waitFor` — never `setTimeout`.
5. **Time/randomness**: no real timers; use `vi.useFakeTimers({ now: ... })` only where deterministic clock is needed (`fToNow`), then `vi.useRealTimers()` in `afterEach`.
6. **Mocks**: mock Axios via `vi.mock('src/services/axiosInstance')` — never global `fetch`. None of the in-scope targets in this plan require Axios mocks, so no Axios mock is introduced here.
7. **Console hygiene**: wrap tests that exercise `try/catch` error branches with `vi.spyOn(console, 'error').mockImplementation(() => {})` and restore in `afterEach`.
8. **Redux slices**: call the default-exported `reducer(state, action)` directly with `{ type: thunk.pending.type }` / `.fulfilled.type` / `.rejected.type` — **do not** spin up `configureStore` for reducer-only assertions.
9. **Component tests** under `src/sections/**` / `src/components/**`: render under the existing `ThemeProvider` / `CssVarsProvider`; mock Redux selectors via `vi.mock('src/hooks/use-redux', …)` and permissions via `vi.mock('src/hooks/use-role-based-permissions', …)` exactly like `batch-records-view.test.tsx`.
10. **File length**: keep each new test file under ~300 lines; split if a target has many independent behaviours.

## 4. Test Selection (priority order from spec)

Pick the cheapest, highest-coverage targets first. Stop when the in-scope list below is green; deeper component coverage belongs in a follow-up story.

| Priority | Target | Type | Why |
|---------:|--------|------|-----|
| 1 | `src/sections/common-module/batch-manager/batch-records-view.test.tsx` | RTL | already in-flight on branch |
| 1 | `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx` | RTL | already in-flight on branch |
| 2 | `src/utils/storage-available.ts` | unit | pure, currently 0% |
| 2 | `src/utils/format-time.ts` | unit | pure, many exports, currently low |
| 2 | `src/utils/role-table-head.ts` | unit | pure mapper, used by every list view |
| 2 | `src/utils/normalize-api-mutation-response.ts` | unit | pure, multi-branch, used across mutation handlers |
| 3 | `src/redux/slices/admin/title-slice.ts` | unit (reducer) | trivial, three transitions |
| 3 | `src/redux/slices/country-list-slice.ts` | unit (reducer) | trivial, three transitions |
| 4 | `src/hooks/use-boolean.ts` | hook (`renderHook`) | small, deterministic |
| 4 | `src/hooks/use-set-state.ts` | hook (`renderHook`) | small, deterministic |
| 4 | `src/hooks/use-local-storage.ts` | hook (`renderHook`) | covers `try/catch` error branches in `getStorage` / `setStorage` / `removeStorage` |

**Out of scope** for this story: end-to-end / browser tests, snapshot-only tests, MSW introduction, coverage threshold tightening in `vite.config.ts`, broader section/MUI screens.

## 5. Per-File Test Strategy

Each section lists `describe` / `it` titles. Assertion bodies that depend on exact runtime values, locale-sensitive output, or non-trivial behaviour are flagged `// TODO`. Implementer fills in the concrete assertion using a one-off REPL or matching live output — never by inventing a value.

### 5.1 `src/utils/storage-available.test.ts`

`describe('localStorageAvailable')`
- `it('returns true when localStorage is writable')` — default jsdom path.
- `it('returns false and logs error when setItem throws')` — `vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); })`; assert `console.error` called once; restore after each.

`describe('localStorageGetItem')`
- `it('returns the stored value when localStorage is available')`.
- `it('returns the provided default when key is missing')`.
- `it('returns undefined when localStorage is unavailable')` — make `setItem` throw, then call `localStorageGetItem`.

Setup: `beforeEach(() => window.localStorage.clear())`; restore mocks in `afterEach`.

### 5.2 `src/utils/format-time.test.ts`

Fix the clock for any test calling `fToNow`:

```ts
beforeEach(() => vi.useFakeTimers({ now: new Date('2026-01-15T10:00:00.000Z') }));
afterEach(() => vi.useRealTimers());
```

Use UTC ISO inputs and **always pass an explicit `format` string** (e.g. `'YYYY-MM-DD'`) to avoid timezone flakiness in formatted output assertions. Bare default-format assertions are marked TODO; the implementer should either pin the format or assert against `dayjs(date).format(formatStr.date)` to remain deterministic.

`describe('fDateTime')`
- `it('returns null for null/undefined/empty input')`.
- `it('formats a valid ISO date using the default format')` — TODO: compare against `dayjs(input).format(formatStr.dateTime)`.
- `it('honours an explicit format override')` — `fDateTime('2026-01-15T10:00:00.000Z', 'YYYY-MM-DD') === '2026-01-15'`.
- `it('returns "Invalid time value" for unparseable input')`.

`describe('fDate')` / `describe('fTime')` — same three branches as `fDateTime`.

`describe('fTimestamp')`
- `it('returns null for falsy input')`.
- `it('returns the dayjs valueOf for valid input')` — assert equals `dayjs(input).valueOf()`.
- `it('returns "Invalid time value" for unparseable input')`.

`describe('fToNow')`
- `it('returns null for falsy input')`.
- `it('returns a relative time string for a past date with fake timers')` — assert truthy, ends in `ago`/contains `year`/`month` per `dayjs.toNow(true)`. // TODO: pin exact string.
- `it('returns "Invalid time value" for unparseable input')`.

`describe('fIsBetween')`
- `it('returns false when any argument is missing')`.
- `it('returns true when input falls within the range inclusive')`.
- `it('returns false when input is outside the range')`.

`describe('fIsAfter')`
- `it('returns true when start is after end')`.
- `it('returns false when start equals or precedes end')`.

`describe('fIsSame')`
- `it('returns false when either date is missing')`.
- `it('returns "Invalid time value" for unparseable input')`.
- `it('compares year by default')`.
- `it('honours the units argument')` — e.g. `'month'` / `'day'`.

`describe('fDateRangeShortLabel')`
- `it('returns "Invalid time value" when start is after end')`.
- `it('returns the full range when initial=true')`.
- `it('compacts same-year different-month label')` — TODO: format-dependent string.
- `it('compacts same-month different-day label')` — TODO.
- `it('returns only the end date when start equals end')` — TODO.

`describe('fAdd' / 'fSub')`
- `it('adds the given duration to now')` / `it('subtracts the given duration from now')` — with `vi.useFakeTimers` pinned to `'2026-01-15T10:00:00.000Z'`, assert the returned ISO string parses to the expected offset (e.g. `dayjs(fAdd({ days: 1 })).diff(dayjs(), 'day') === 1`). Avoid asserting exact timezone strings.

`describe('today')`
- `it('returns the start-of-day of the current date using provided format')`.

### 5.3 `src/utils/role-table-head.test.ts`

`describe('roleColumnsToDefinitions')`
- `it('returns an empty array for null/undefined/empty input')` — three cases.
- `it('filters out entries missing a string id')` — entries with `null`, `undefined`, missing/empty `id`, non-string `id` all dropped.
- `it('defaults label to the id when missing')`.
- `it('defaults width to 150 when missing')`.
- `it('defaults visible to true when missing and respects explicit false')`.
- `it('defaults sortable to false unless explicitly true')`.
- `it('preserves disableToggle and tooltip')`.
- `it('only includes the group field when group is truthy')`.

### 5.4 `src/utils/normalize-api-mutation-response.test.ts`

`describe('normalizeApiMutationResponse')`
- `it('passes through primitives and null/undefined as data')` — null, undefined, number, string.
- `it('throws with extracted message when success is the boolean false')` — message from `response.response.message`.
- `it('throws with extracted message when success is the string "false"')` — message from `response.message`.
- `it('throws with default message when no message is provided')` — expect `'Something went wrong'`.
- `it('throws with the first array element when message is an array')`.
- `it('extracts nestedData from response.response.data')`.
- `it('falls back to response.data when response.response.data is missing')`.
- `it('falls back to body.data when both response paths are missing')`.
- `it('returns the body itself when no wrapper markers exist')` — neither `success` nor `response`.
- `it('returns undefined data when wrapper exists but no nested data')`.
- `it('returns message only when it is a string')` — array/non-string message dropped from success return.

### 5.5 `src/hooks/use-boolean.test.ts`

Use `renderHook` + `act` from `@testing-library/react`.

`describe('useBoolean')`
- `it('initialises with default false when no arg provided')`.
- `it('initialises with the provided default')`.
- `it('onTrue sets value to true')`.
- `it('onFalse sets value to false')`.
- `it('onToggle flips the current value')`.
- `it('setValue accepts a direct value and updater function')`.
- `it('keeps callback identities stable across re-renders')` — `result.current.onTrue === prev.onTrue` after `rerender()`.

### 5.6 `src/hooks/use-set-state.test.ts`

`describe('useSetState')`
- `it('returns the initial state and canReset=false')`.
- `it('merges partial updates via setState')`.
- `it('sets a single field via setField')`.
- `it('flips canReset to true after a change and back to false after onResetState')`.
- `it('onResetState restores the initial state reference')`.

### 5.7 `src/hooks/use-local-storage.test.ts`

Setup: `beforeEach(() => window.localStorage.clear())`. Wrap tests touching `console.error` paths in `vi.spyOn(console, 'error').mockImplementation(() => {})`.

`describe('useLocalStorage')`
- `it('initialises with the given state when storage is empty (object)')`.
- `it('initialises with the given state when storage is empty (primitive)')`.
- `it('restores object state from storage on mount, merging into initial state')`.
- `it('restores primitive state from storage on mount')`.
- `it('setState writes merged object back to localStorage')`.
- `it('setState writes the primitive value back to localStorage')`.
- `it('setField only updates fields for multi-value (object) state')`.
- `it('resetState clears storage and restores initial state')`.

`describe('getStorage / setStorage / removeStorage')`
- `it('getStorage returns null and logs when JSON.parse throws')` — seed `localStorage.setItem(key, 'not-json')`, expect `null` and `console.error` called.
- `it('setStorage logs when JSON.stringify throws')` — pass a value with a circular reference; expect `console.error`.
- `it('removeStorage logs when removeItem throws')` — `vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('boom'); })`.

### 5.8 `src/redux/slices/admin/title-slice.test.ts`

Import `titleReducer` (default export) and `setTitleAsync`.

`describe('title slice')`
- `it('returns the initial state for an unknown action')` — `titleReducer(undefined, { type: '@@INIT' })` → `{ title: '', loading: false, error: null }`.
- `it('setTitleAsync.pending sets loading=true')`.
- `it('setTitleAsync.fulfilled sets the title and loading=false')`.
- `it('setTitleAsync.rejected resets title and uses error message')` — pass `{ type: setTitleAsync.rejected.type, error: { message: 'boom' } }`; assert `error: 'boom'`.
- `it('setTitleAsync.rejected falls back to "Failed to load title" when error.message is missing')`.

### 5.9 `src/redux/slices/country-list-slice.test.ts`

Import the default-exported `countryReducer` and `fetchCountries` from `src/redux/actions/country-list-actions`.

`describe('country list slice')`
- `it('returns the initial state for an unknown action')`.
- `it('fetchCountries.pending sets isLoading=true and clears error/isError')`.
- `it('fetchCountries.fulfilled stores payload countryList and clears loading')`.
- `it('fetchCountries.rejected sets isError=true and uses payload message')` — `{ type: rejected.type, payload: 'nope' }` → `error: 'nope'`.
- `it('fetchCountries.rejected falls back to "Something went wrong" when payload is undefined')`.

> Note: tests assert reducer behaviour only. They **do not** dispatch the thunk and therefore do not need to mock `src/services/axiosInstance`. If a follow-on test wants to exercise the thunk, it would `vi.mock('src/services/axiosInstance', () => ({ POST: vi.fn() }))` — captured here for reference, not implemented in this story.

### 5.10 In-flight RTL tests (finish & verify)

These files already exist on branch. Verify they pass under `yarn test:run`. If a test fails, fix the test (not product code) by aligning queries/mocks with the actual component output. Do not remove the inline `matchMedia` polyfill — it is required by MUI components in jsdom.

- `src/sections/common-module/batch-manager/batch-records-view.test.tsx`
  - Existing coverage: heading, search placeholder, role-driven column headers, empty state, dispatch on mount, no comment UI, plus a sibling `describe('ROLE_BASED_PERMISSIONS GRE batchViewRecords')` block.
  - Conditional follow-on (only if cheap): assert toolbar search debounce (`userEvent.type` then `waitFor` on dispatched filter action) and that role-gated columns hidden when `useRoleBasedPermissions` returns `visible: false` for a column.

- `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx`
  - Existing coverage: empty state (`planValid=false`), deficit, sufficient.
  - Conditional follow-on: surplus branch (`scheduleTimeSlotCount > requiredTotal`) and a render assertion for the day-count badge.

## 6. Mocking & Provider Boilerplate

Reusable patterns (used as-is in tests above):

```ts
// Redux + permissions mocks for component tests
vi.mock('src/hooks/use-redux', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector) => selector(stubRootState),
}));

vi.mock('src/hooks/use-role-based-permissions', () => ({
  useRoleBasedPermissions: vi.fn(() => ({ columns: {}, userRole: ROLES.GRE, actions: [] })),
}));

// Toast mock to silence sonner during component renders
vi.mock('sonner', () => ({ toast: { error: vi.fn() }, Toaster: () => null }));

// matchMedia polyfill (already inlined in batch-records-view.test.tsx)
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true, configurable: true,
  value: (q: string) => ({
    matches: false, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

```ts
// Axios mock pattern (reserved for follow-on hook/service tests; not used in this plan)
vi.mock('src/services/axiosInstance', () => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn(),
}));
```

## 7. Validation (scoped → full)

Run in order; fix and re-run on failure. Do **not** introduce new lint disables.

```bash
# Scoped runs while authoring
yarn test:run src/utils/storage-available.test.ts \
              src/utils/format-time.test.ts \
              src/utils/role-table-head.test.ts \
              src/utils/normalize-api-mutation-response.test.ts

yarn test:run src/hooks/use-boolean.test.ts \
              src/hooks/use-set-state.test.ts \
              src/hooks/use-local-storage.test.ts

yarn test:run src/redux/slices/admin/title-slice.test.ts \
              src/redux/slices/country-list-slice.test.ts

yarn test:run src/sections/common-module/batch-manager/batch-records-view.test.tsx \
              src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx

# Full gate
yarn test:run
yarn lint
yarn type-check
yarn fm:check
yarn test:coverage
```

Capture the `text-summary` block from `yarn test:coverage` before and after; record both in the PR description per Acceptance Criterion 1 (`docs/ai/stories/test-1/spec.md`).

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Timezone/locale flakiness in `format-time.test.ts` | Pin inputs to UTC ISO; always pass explicit `format` strings; pin `vi.useFakeTimers({ now: ... })` for `fToNow` / `fAdd` / `fSub`. |
| `use-local-storage.test.ts` cross-test pollution | `beforeEach(() => window.localStorage.clear())` and restore mocked `Storage.prototype` methods in `afterEach`. |
| Console noise from intentional error branches | `vi.spyOn(console, 'error').mockImplementation(() => {})` around the specific test; restore after. |
| Coverage report `all: false` misses untouched files | Each new test imports the SUT directly so it appears in `text-summary`; double-check the new modules are listed. |
| Slice reducer drift after future feature work | Tests assert observable state shape only, not implementation internals. |
| Out-of-scope creep into deeper component tests | Stop at the targets listed in §4. Deeper section coverage is a follow-up story. |
| MUI render failures in jsdom (no `matchMedia`) | Keep inline polyfill in `batch-records-view.test.tsx`; new component tests in that folder must include it (or move to `src/test/setup.ts` in a follow-up — out of scope here). |

## 9. Open Questions (carried from spec)

These do not block authoring; they affect PR description only:

1. Numeric coverage target (any uplift vs. specific %).
2. Priority module ordering (heuristic in §4 is the default).
3. MSW vs. `vi.mock('src/services/axiosInstance')` — default: match existing pattern (`vi.mock`).
4. Whether to tighten `vite.config.ts` coverage thresholds — default: no (out of scope).
5. Whether batch-manager in-flight test behaviours are documented elsewhere — default: derive from component source.

## 10. Deliverables

- This file: `docs/ai/stories/test-1/test-plan.md`.
- Starter skeletons (created alongside this plan where safe; see commit) for:
  - `src/utils/storage-available.test.ts`
  - `src/utils/role-table-head.test.ts`
  - `src/utils/normalize-api-mutation-response.test.ts`
  - `src/redux/slices/admin/title-slice.test.ts`
  - `src/hooks/use-boolean.test.ts`

  Each skeleton sets up the standard `describe` blocks and lists the `it.todo(...)` titles from §5 so the next agent can fill in assertion bodies without restructuring. Skeletons run as no-ops under Vitest (`it.todo` is a first-class skip).
- Remaining test files (`format-time`, `use-set-state`, `use-local-storage`, `country-list-slice`) are deferred to the implementation stage to keep this stage's footprint minimal and avoid pre-committing locale-sensitive assertions.
