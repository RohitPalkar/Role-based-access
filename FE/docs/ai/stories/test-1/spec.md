# Story: write test cases (test-1)

## Summary
Add and/or extend automated tests across the `puravankara-portal` codebase to increase overall test coverage. Tests must follow the project's verified Vitest + React Testing Library (RTL) stack and the workspace testing policy (unit tests for pure logic/Redux/utils; RTL component tests for UI behavior; mocked Axios/MSW for API flows).

## Goal
Raise measurable test coverage (statements, branches, functions, lines) for the repository by writing high-value, deterministic tests on currently under-tested files — without changing product behavior.

## Scope
- In scope:
  - New `*.test.ts` / `*.test.tsx` files colocated next to the source they exercise (or under an existing `__tests__/` folder when neighbouring tests use that layout).
  - Updates to existing test files that already exist but are incomplete (e.g. the work-in-progress tests on `src/sections/common-module/batch-manager/`).
  - Covering: pure utilities under `src/utils`, Redux Toolkit slices/selectors under `src/redux`, payload/mappers, hooks under `src/hooks`, and visible component behavior under `src/sections` / `src/components`.
  - Mocking Axios (`src/services/axiosInstance.ts`, `src/services/axiosInterceptors.ts`) or using MSW where API flows are exercised.
- Out of scope:
  - Product behavior changes, UI/copy edits, validation rule changes, new features.
  - E2E / browser tests (no Playwright/Cypress added in this story).
  - Snapshot-only tests that don't assert behavior.
  - Reading or pasting any secrets from `sonar-project.properties`.

## Acceptance Criteria
1. **Coverage uplift**
   - `yarn test:coverage` runs to completion with no failing tests.
   - Overall coverage (statements/lines) increases compared to the pre-change baseline. Note current baseline in the PR description.
   - Each newly added test file covers code that previously had 0% or low coverage; no test is added solely to inflate a single trivial line.
2. **Determinism & quality**
   - All tests pass under `yarn test:run` (CI mode) without flakes (no real network, no real timers; `vi.useFakeTimers` only when needed; `Date` mocked only when needed).
   - Tests use accessible RTL queries (`getByRole`, `getByLabelText`, `getByText`) over `getByTestId` where practical.
   - Async UI is awaited via `findBy*` / `waitFor` — no arbitrary `setTimeout` waits.
3. **Conventions**
   - Test files are colocated as `ComponentName.test.tsx` next to the source, or follow the existing neighbouring `__tests__/` convention.
   - Each test uses clear `describe` / `it` naming describing the behavior under test.
   - Redux-connected components are rendered with a real `configureStore` (or the project's existing test provider/wrapper) — not a shallow render.
   - Router-bound components use `MemoryRouter` (React Router v6) with seeded routes.
   - MUI v5 components are rendered under the project's `ThemeProvider` if existing tests do so; otherwise the default theme.
4. **API flows**
   - Any test that exercises code calling `axiosInstance` mocks the axios module (or uses MSW if already wired) — never hits a live endpoint.
   - Both success and error branches are asserted for at least the API-touching utilities/hooks covered.
5. **Quality gates pass**
   - `yarn lint` — clean (no new warnings introduced in changed files).
   - `yarn type-check` — clean.
   - `yarn fm:check` — clean.
   - `yarn test:run` — all tests pass.
6. **Existing in-progress tests resolved**
   - The currently-modified files in this branch are completed and pass:
     - `src/sections/common-module/batch-manager/batch-records-view.test.tsx`
     - `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx`

## Requirements

### Test selection heuristic
Pick targets in this priority order:
1. Files currently under modification in this branch (finish what's in-flight).
2. Pure functions in `src/utils/**` — cheapest coverage, no DOM.
3. Redux slices/reducers/selectors in `src/redux/**`.
4. Custom hooks in `src/hooks/**` (use `renderHook` from `@testing-library/react`).
5. Presentational components in `src/components/**` and `src/sections/**` with conditional rendering, form validation, or visible state transitions.
6. Routing/role-gating helpers tied to `src/routes/sections/index.tsx` and `ROLES` in `src/utils/constant` — assert role → route mapping logic, not full route trees.

### What a "good" test asserts
- Renders without throwing.
- Conditional/branching behavior (loading, empty, error, success states).
- Form validation messages from Formik + Yup, react-hook-form + Zod (whichever the target uses).
- User interactions via `@testing-library/user-event` (clicks, typing, submit).
- For slices: action → state transition; selector → derived value.
- For API hooks/services: correct request shape, response handling, and error handling.

## UI Notes
- Render under the same providers existing tests use (Theme, Redux store, Router). Do not change product visuals.
- Do not introduce visual regression / snapshot suites.

## Implementation Notes
- Test runner: **Vitest** (already configured in `vite.config.ts → test`, jsdom env, setup at `src/test/setup.ts`).
- Use `@testing-library/jest-dom` matchers (already wired in setup).
- Mock `axios` via `vi.mock('src/services/axiosInstance')` (or path alias the project uses) rather than mocking global `fetch`.
- Prefer factories/builders for fixture data over inline literals when the same shape is reused.
- Keep each test file < ~300 lines; split if a component has many independent behaviors.
- Do not disable ESLint rules to silence test issues; fix the root cause.
- Do not introduce new test libraries (no Jest, no Enzyme, no Cypress) — stay on the verified stack.

## References
- Workspace rules:
  - `.cursor/rules/frontend-testing.mdc` (testing policy — authoritative)
  - `.cursor/rules/stack-and-quality.mdc` (lint / type-check / fm:check gates)
- Test setup: `src/test/setup.ts`
- Vitest config: `vite.config.ts` (`test` block)
- HTTP entry to mock: `src/services/axiosInstance.ts`, `src/services/axiosInterceptors.ts`, `src/services/apiRoutes.ts`
- Role/route helpers to consider: `src/routes/sections/index.tsx`, `src/utils/constant`
- In-flight test files on this branch:
  - `src/sections/common-module/batch-manager/batch-records-view.test.tsx`
  - `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx`

## Assumptions
- The description "Write test cases for files for increage coverage" is interpreted as a general coverage-uplift story rather than targeting one specific module — except that the two test files already modified on this branch are explicitly in scope.
- The existing `yarn test:coverage` script reports a usable baseline (statements/lines) which can be compared pre- and post-change.
- The project's Vitest + jsdom + RTL setup at `src/test/setup.ts` is the canonical configuration; no parallel Jest configuration needs to be supported.
- Role routing and CSP build (`csp/buildCSP.js`, `vite-plugin-csp`) are not under test in this story unless a specific helper inside them is pure and unit-testable.

## Open Questions
1. **Coverage target** — Is there a numeric goal (e.g. "+5% lines overall" or "≥80% on touched files"), or is "any measurable increase" sufficient?
2. **Priority modules** — Are there specific feature areas (e.g. batch-manager, CRM, finance-admin, sales pipelines) the team most wants covered first, or should the test selection heuristic above drive ordering?
3. **MSW vs axios mock** — Does the team prefer introducing MSW for API flows, or keep using direct `vi.mock` on the axios instance (matching existing patterns)? Default in this spec: match existing patterns.
4. **Coverage thresholds in CI** — Should `vite.config.ts` `test.coverage.thresholds` be tightened as part of this story, or left as-is to avoid blocking unrelated PRs?
5. **Batch-manager test scope** — For the two in-flight test files, are the intended behaviors documented anywhere (ticket, PR description), or should the implementer derive them from the component source?
