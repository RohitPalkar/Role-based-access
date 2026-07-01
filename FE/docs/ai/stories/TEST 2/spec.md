# Story Spec: TEST 2 — Bulk test case creation (safe areas only)

## Metadata
- **Story Key:** TEST 2
- **Title:** test case criting bulk (Bulk Test Case Creation)
- **Type:** Test coverage / quality (non-functional)
- **Scope:** Unit and integration tests only; no behavior changes
- **Stack:** React 18, TypeScript, Vite 5, Vitest + jsdom, React Testing Library, Redux Toolkit, Formik/Yup, react-hook-form/Zod, Axios

## Summary
Add bulk unit and integration test cases across SAFE areas of the `puravankara-portal` codebase to raise coverage. The work must NOT modify UI, functionality, business logic, API flow, async behavior, validation, routing, Redux flow, hook lifecycle, side effects, or any existing implementation logic. Tests must be deterministic, readable, and aligned with the existing Vitest + RTL stack documented in `vite.config.ts`, `src/test/setup.ts`, and the workspace testing rule.

## Goals
- Increase test coverage in low-risk, high-determinism areas of `src/`.
- Establish meaningful assertions (no snapshot-only tests) that protect existing behavior.
- Keep production code untouched unless a minimal, isolated change is strictly required for testability — in which case it must be flagged as an Open Question, not made silently.

## Non-Goals
- No changes to UI, layout, copy, styles, theme, or component structure.
- No changes to validation rules, schemas, routes, role-based routing (`src/routes/sections/*`, `src/utils/constant`), or Redux flow.
- No new features, refactors, or "drive-by" cleanups.
- No changes to Axios setup (`src/services/axiosInstance.ts`, `axiosInterceptors.ts`, `apiRoutes.ts`) or CSP build (`csp/buildCSP.js`, `vite-plugin-csp`).
- No real network calls, timers, or non-deterministic data.

## In-Scope (SAFE) Test Targets
Pick existing modules from these categories. Do not introduce new production code; tests cover what already exists.

1. **Utility / helper functions** under `src/utils/**` (pure, side-effect-free helpers).
2. **Pure functions** anywhere in `src/` (formatters, parsers, comparators, mappers).
3. **Data transformation logic** (payload shapers, list/group transforms, normalizers).
4. **Formatter / parser functions** (date, currency, number, phone, address, status formatters).
5. **Validation helpers** (Yup/Zod schema-derived helpers, regex predicates) — assert outputs, not behavior change.
6. **Static configuration logic** (constants, enum maps, role/permission lookup tables in `src/utils/constant`).
7. **Reducers / selectors with stable behavior** in `src/redux/**` — test reducer transitions and selector outputs from a known state.
8. **Safe conditional rendering branches** in components — assert what is rendered for a given prop/state, without altering markup.
9. **Edge-case handling** — null/undefined inputs, empty arrays, boundary values, malformed data the code already handles.
10. **Existing reusable hooks with stable behavior** in `src/hooks/**` — test return values and updates via `renderHook`.
11. **Existing service/helper methods using mocked dependencies** — mock Axios module to verify request shape and response handling per `src/services/**` patterns.

## Out-of-Scope (UNSAFE) Areas — Do Not Test or Touch
- Authentication flows, token refresh, interceptors’ side effects.
- Routing tree wiring (`src/routes/sections/index.tsx` and per-role route modules listed in the context map).
- Real backend calls; integration must use mocks (Axios module mock or MSW).
- Components with heavy side effects (charts, MUI `x-data-grid` virtualization internals, third-party iframes).
- Anything requiring DOM measurements, real timers, or Sentry/CSP behavior.

## Acceptance Criteria

### Coverage & content
1. New tests are added under existing conventions: colocated as `ComponentName.test.tsx` next to the source file or under a neighbouring `__tests__/` folder, matching the closest existing pattern.
2. Test files are TypeScript (`.test.ts` for non-DOM logic, `.test.tsx` when rendering React).
3. Each new test file uses `describe` blocks with clear names and `it` cases each asserting one main behavior.
4. Assertions are meaningful (values, structure, error messages, accessible roles/labels). No snapshot-only tests; if a snapshot is used, it must be inline and small, paired with at least one explicit assertion.

### Tooling & stack
5. Tests use **Vitest** (`vitest`, `describe`, `it`, `expect`, `vi`) and run under the existing `jsdom` environment configured in `vite.config.ts`.
6. React component/hook tests use `@testing-library/react` (including `renderHook`), `@testing-library/jest-dom` matchers (already loaded via `src/test/setup.ts`), and `@testing-library/user-event` for interactions.
7. Accessible queries are preferred (`getByRole`, `getByLabelText`, `getByText`); avoid querying by class names or test IDs unless already established in the file under test.
8. API-touching tests mock the Axios module (or use MSW if already present in that area). No real network. No reliance on env vars or secrets.
9. Redux tests use the project’s store/slice patterns: test reducers as pure functions and selectors with synthetic state objects; do not dispatch through real middleware unless the slice already requires it.
10. Hook tests use `renderHook` with the minimum providers required (e.g., Redux `<Provider>`, Router, Theme) and only when the hook actually depends on them.

### Determinism & safety
11. No real timers; if timers are needed, use `vi.useFakeTimers()` and restore in `afterEach`.
12. `Date.now`/`new Date()` is mocked only when the code under test depends on the current time; otherwise leave alone.
13. No reliance on network, filesystem, or environment-specific behavior.
14. No `console.error`/`console.warn` introduced by tests; if a test triggers one from the code under test, assert it explicitly via a spy.
15. Tests pass on `yarn test:run` locally and contribute to `yarn test:coverage` without flakes.

### Quality gates
16. `yarn lint`, `yarn type-check`, and `yarn fm:check` pass with the new test files.
17. No ESLint disables added except minimal, file-scoped, documented exceptions if absolutely required.
18. No new dependencies added; only the stack listed in `package.json` is used.

### Production-code policy
19. Production source files are NOT modified. If a target is genuinely untestable without a minimal change (e.g., exporting an internal pure helper), the file is **excluded from this story** and listed under Open Questions; do not silently change production code.
20. No copy, layout, validation rules, toasts, redirects, loading states, or API calls are altered.

### Sonar / hygiene
21. New tests avoid copy-paste duplication: shared fixtures/factories live in a single helper under the same folder or `src/test/`.
22. No hardcoded secrets, tokens, or production URLs in fixtures. Use placeholders (e.g., `'test-token'`, `'https://example.test'`).
23. Strict equality (`===`) and explicit null/undefined handling in test helpers.

## Test Patterns to Follow

### Pure utilities (example shape)
- Arrange: import the utility.
- Act: call with representative inputs (happy path + edge cases: `null`, `undefined`, `[]`, `''`, boundary numbers, malformed dates).
- Assert: exact output values; for objects, assert by shape with `toEqual`.

### Reducers / selectors
- Reducer: `expect(reducer(prevState, action)).toEqual(nextState)` for each action type with stable behavior.
- Selector: build minimal `RootState`-shaped fixture and assert selector output for representative inputs (including memoization invalidation cases when relevant).

### Hooks
- Wrap with required providers via a small `wrapper` helper. Use `renderHook` and `act` from `@testing-library/react`. Assert returned values and updates after triggering inputs.

### Components (safe conditional rendering)
- Render with required providers (Theme, Router, Redux) only when the component depends on them.
- Assert what is rendered for each prop/state branch using accessible queries.
- Do not change markup or styles to make tests easier — pick a different target instead.

### Services with mocked Axios
- Mock the Axios instance module (`src/services/axiosInstance.ts`) via `vi.mock`. Verify the called method, URL (against `apiRoutes.ts` constants), payload, and that the function returns/normalizes the response as already implemented.
- Do not assert against interceptor side effects.

## UI Notes
- No UI changes are part of this story.
- When rendering components in tests, use existing providers (Theme, Router, Redux store) the same way they appear elsewhere in the test suite. Do not introduce a new test-utils render unless one is already conventional in that folder.

## Implementation Notes
- Follow the workspace testing rule: Vitest + jsdom, RTL queries, colocated tests, `yarn test`/`yarn test:run`/`yarn test:coverage`.
- Prefer adding tests in batches by area (e.g., one PR-sized batch per top-level folder under `src/utils`, `src/hooks`, `src/redux`, `src/services`) to keep diffs reviewable, but the story itself spans bulk additions.
- Reuse existing fixtures/factories where they exist; otherwise add small, local helpers next to the tests.
- For components using MUI `x-date-pickers` or `x-data-grid`, only test the safe surface (props, basic rendering, conditional branches), not internal grid/calendar behavior.
- For Formik/Yup or react-hook-form/Zod modules, test the schema/validator helpers as pure functions where they exist as separate exports; do not re-test framework behavior.
- Respect notes from the context map:
  - `package.json` name may reference "Minimals" — treat `src/` as the source of truth.
  - Role routing lives in `src/routes/sections/index.tsx` + `ROLES` in `src/utils/constant` — out of scope.
  - Never include `sonar.login` or any secret from `sonar-project.properties` in test code or fixtures.

## Definition of Done
- New unit/integration tests added across SAFE areas, increasing coverage materially over the baseline.
- All quality gates pass: `yarn lint`, `yarn type-check`, `yarn fm:check`, `yarn test:run`.
- `yarn test:coverage` runs cleanly; coverage delta is positive and reported in the PR description.
- No production source files modified (verified by diff). Any exception is called out in the PR with justification and was already raised under Open Questions in this spec.
- No new dependencies, no broad ESLint disables, no secrets committed.
- PR description lists the areas covered and the rationale for any area explicitly skipped.

## Assumptions
- The story description was truncated at "Use existing testing framework and project convent…"; assumed continuation: "…ions" — i.e., follow the conventions documented in `.cursor/rules/frontend-testing.mdc` and `package.json` scripts.
- Vitest, jsdom, RTL, jest-dom, and user-event are already wired (per workspace rule and `package.json`) and require no setup changes.
- MSW is acceptable where already used; otherwise mock the Axios module directly.
- Coverage thresholds (if any) are enforced by existing `vite.config.ts` settings; this story does not change thresholds.
- "Bulk" means as many SAFE-area tests as can be added without violating the no-production-change rule, not a fixed count.

## Open Questions
1. Is there a target coverage delta or absolute coverage threshold for this story, or is the goal "as much as safely possible"?
2. Are there specific folders/modules to prioritize first (e.g., `src/utils`, `src/redux`, `src/hooks`, `src/services`), or any to explicitly defer?
3. Should the work be delivered as one bulk PR or split per area? (Recommend per-area PRs for reviewability.)
4. If a SAFE-area target requires a tiny, isolated production change to be testable (e.g., exporting an existing internal pure helper), should it be (a) skipped, (b) included with explicit call-out, or (c) deferred to a follow-up story? Default per requirements: skip and list here.
5. Are there modules currently flagged as flaky or known-broken that should be excluded from this round?
6. Is MSW available/preferred in the repo today, or should service tests stay on Axios module mocks?

## References (open only if needed)
- Workspace testing rule: `.cursor/rules/frontend-testing.mdc`
- Workspace stack/quality rule: `.cursor/rules/stack-and-quality.mdc`
- Vitest config: `vite.config.ts` (`test` block)
- Test setup: `src/test/setup.ts`
- Context map entry points: `docs/ai/context-map.json`, `docs/ai/project-context.md`
- HTTP layer (mock targets only): `src/services/axiosInstance.ts`, `src/services/axiosInterceptors.ts`, `src/services/apiRoutes.ts`
- Routing (out of scope, do not modify): `src/routes/sections/index.tsx`, `src/routes/paths.ts`, role-route modules under `src/routes/sections/*`
- Source roots in scope for SAFE testing: `src/utils`, `src/hooks`, `src/redux`, `src/services` (mocked), `src/components`, `src/sections`, `src/pages` (conditional rendering only)
