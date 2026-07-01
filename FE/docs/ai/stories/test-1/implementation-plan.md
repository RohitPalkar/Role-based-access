# Implementation Plan: write test cases (test-1)

## Context Budget
- Inspect the target test/source files below first; avoid broad repo scans or speculative reads.
- Open non-target files only for direct imports (e.g. helper signatures), neighbouring tests in the same folder, or required test config (`vite.config.ts`, `src/test/setup.ts`).
- Use the provider-native edit/write tools to create/update test files. Do not paste full file contents, full diffs, or large code blocks in chat — let the edit tool handle it.
- Do not open generated, `dist/`, `coverage/`, `node_modules/`, or execution-history folders.
- Run only the validation commands listed in §Validation, scoped to the touched files where possible (`yarn test:run <path>`), then a single full `yarn test:run` and the lint/type-check/format gates at the end.

## Goal
Raise statement/line coverage on currently under-tested modules without changing product behaviour. Finish the in-flight tests on this branch and add deterministic Vitest + RTL unit/integration tests on the cheapest-coverage targets (pure utils, slice reducers, custom hooks, small presentational components).

## Target Files

### Existing in-flight tests to finish and ensure pass
- `src/sections/common-module/batch-manager/batch-records-view.test.tsx`
- `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx`

### New unit tests — `src/utils/**` (pure functions, highest ROI)
- `src/utils/storage-available.test.ts` — exercise `localStorageAvailable` / `localStorageGetItem` happy and error paths (mock `window.localStorage` to throw).
- `src/utils/format-time.test.ts` — `fDate`, `fTime`, `fDateTime`, `fTimestamp`, `fToNow`, `fIsBetween`, `fIsAfter`, `fIsSame` with valid, null and invalid date inputs. Mock `Date` only where explicitly needed (`fToNow`).
- `src/utils/role-table-head.test.ts` — `roleColumnsToDefinitions`: empty/nullable input, filters invalid entries, defaults `label`/`width`/`visible`/`sortable`, preserves `group`.
- `src/utils/normalize-api-mutation-response.test.ts` — `normalizeApiMutationResponse`: non-object input, `success: false` (and string `'false'`), nested `response.response.data` extraction, plain object passthrough, message extraction & array message.

### New unit tests — `src/hooks/**`
- `src/hooks/use-boolean.test.ts` — default value, `onTrue` / `onFalse` / `onToggle` / `setValue` using `renderHook` + `act` from `@testing-library/react`.
- `src/hooks/use-set-state.test.ts` — initial state, `setState` merge, `setField`, `canReset` toggling, `onResetState`.
- `src/hooks/use-local-storage.test.ts` — multi-value and primitive paths, persists via `localStorage`, `setField`, `resetState`, and `getStorage` / `setStorage` / `removeStorage` exports (cover the `try/catch` error branches by stubbing `localStorage.setItem` / `JSON.parse` to throw).

### New unit tests — `src/redux/slices/**`
- `src/redux/slices/admin/title-slice.test.ts` — initial state plus `setTitleAsync.pending` / `.fulfilled` / `.rejected` reducers invoked directly via `reducer(state, action)` (no thunk dispatch needed). Cover the `rejected` fallback message.
- `src/redux/slices/country-list-slice.test.ts` — same pattern for `fetchCountries.pending` / `.fulfilled` / `.rejected`, including default error message when payload is absent.

> Implementer may add one further slice test (e.g. `src/redux/slices/auth/auth-slice.ts`) only if the above run cleanly under budget and the slice has clearly testable reducers without large dependency mocks. Stop if the slice imports heavy chains.

### Conditional / follow-on (only if quick after the above)
- If `src/sections/common-module/batch-manager/batch-records-view.test.tsx` reveals additional easy assertions (toolbar search debounce, role-gated columns), extend within the same file rather than creating a new file.

## Implementation Steps

1. **Triage in-flight tests first**
   - Run `yarn test:run src/sections/common-module/batch-manager/batch-records-view.test.tsx src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx` and confirm both already pass under the current code. If a test fails, fix the test (not product code) by aligning queries / mocks with the actual component output.
   - Keep the existing `vi.mock` for `src/hooks/use-redux` and `src/hooks/use-role-based-permissions` patterns — reuse the same pattern in any new component test in this folder.

2. **Add `src/utils/**` tests** (no DOM, fastest)
   - Mirror the structure of `src/utils/helper.test.ts` (single top-level `describe`, nested `describe` per function, plain `expect`).
   - Use Vitest's `vi.spyOn(console, 'error').mockImplementation(() => {})` around tests that exercise the `try/catch` console-error paths in `storage-available.ts` / `use-local-storage.ts` to keep output clean.
   - For `format-time.test.ts`, use fixed string inputs (e.g. `'2026-01-15T10:00:00.000Z'`) for `fDate` / `fDateTime` so output is deterministic across timezones; for `fToNow`, wrap with `vi.useFakeTimers({ now: new Date('2026-01-15T10:00:00.000Z') })` then `vi.useRealTimers()` in `afterEach`.

3. **Add hook tests** under `src/hooks/`
   - Use `renderHook` + `act` from `@testing-library/react` (no extra deps).
   - For `use-local-storage.test.ts`, clear `localStorage` in `beforeEach` and assert both the in-memory state and `localStorage.getItem(key)`.

4. **Add slice tests** under `src/redux/slices/...`
   - Import the default-exported reducer and the thunk action creator. Invoke reducer directly with `{ type: thunk.pending.type }`, `{ type: thunk.fulfilled.type, payload }`, `{ type: thunk.rejected.type, error: { message: '...' }, payload }`.
   - Do not spin up `configureStore` for these — direct reducer invocation is sufficient and matches the existing test policy (cheap, deterministic).

5. **Conventions to follow in every new file**
   - File header imports: `import { it, expect, describe, ... } from 'vitest';` first, then RTL imports (when used), then path-aliased imports (`src/...`), then relative.
   - One main behaviour per `it`. Prefer `getByRole` / `getByLabelText` / `getByText` over `getByTestId`.
   - No real network, no real timers (except `vi.useFakeTimers` where explicitly noted).
   - Do not edit product source files. Do not edit `vite.config.ts`, `src/test/setup.ts`, or coverage thresholds.
   - Do not introduce MSW; match existing pattern (none of the targets above require axios mocking, so no `vi.mock('src/services/axiosInstance')` is needed in this scope).

6. **Sanity-check coverage**
   - After all new files are added, run `yarn test:coverage` and capture the `text-summary` block. Record the prior baseline and the new totals in the PR description per acceptance criterion 1.

## Validation

Run in this order, scoped first then full:

```bash
yarn test:run src/utils/storage-available.test.ts src/utils/format-time.test.ts src/utils/role-table-head.test.ts src/utils/normalize-api-mutation-response.test.ts
yarn test:run src/hooks/use-boolean.test.ts src/hooks/use-set-state.test.ts src/hooks/use-local-storage.test.ts
yarn test:run src/redux/slices/admin/title-slice.test.ts src/redux/slices/country-list-slice.test.ts
yarn test:run src/sections/common-module/batch-manager/batch-records-view.test.tsx src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx
yarn test:run
yarn lint
yarn type-check
yarn fm:check
yarn test:coverage
```

If `yarn lint` reports issues only in the new test files, fix the root cause (do not add eslint-disable comments). If `yarn fm:check` fails, run `yarn fm:fix` and re-verify.

## Risks
- **Timezone/locale flakiness** in `format-time.test.ts`. Mitigation: use UTC ISO strings, explicit `format` parameters, and `vi.useFakeTimers` only for `fToNow`.
- **`src/hooks/use-local-storage.test.ts` cross-test pollution** if `localStorage` is not cleared. Mitigation: `beforeEach(() => window.localStorage.clear())`.
- **`BatchRecordsView` test depends on `matchMedia` polyfill already defined inline**; do not remove it. Any new component test added in this folder must include the same polyfill or be moved to `src/test/setup.ts` (out of scope here — leave inline to keep the change minimal).
- **Coverage report `all: false`** means new files only count once a test imports them; double-check the `text-summary` actually lists the new source modules after `yarn test:coverage`.
- **Slice reducer drift**: if a slice's `extraReducers` change after this PR, the tests will need updating. Keep assertions tied to observable state shape, not implementation details.
- **Out-of-scope creep**: it is tempting to add many more component tests (sections, MUI-heavy screens). Stop at the targets above unless the in-flight tests need extension; deeper component coverage belongs in a follow-up story.

## Assumptions
- The current `yarn test:run` baseline is green (no other broken tests on the branch outside the two in-flight files).
- No numeric coverage threshold is being introduced in this PR (per Open Question 4 in the spec — leave `vite.config.ts` coverage thresholds untouched).
- The existing `vi.mock('src/hooks/use-redux', ...)` and `vi.mock('src/hooks/use-role-based-permissions', ...)` patterns used by `batch-records-view.test.tsx` are the canonical way to mock Redux/permissions for component tests in this repo; new component tests (if added) should mirror them.
- No new test libraries (MSW, Jest, Enzyme, Cypress) will be added; the verified stack (Vitest + RTL + jest-dom + user-event) is sufficient for every target listed.
- `src/test/setup.ts` remains a single-line jest-dom import; any global polyfills (e.g. `matchMedia`) stay colocated in the test file that needs them, as currently done in `batch-records-view.test.tsx`.
