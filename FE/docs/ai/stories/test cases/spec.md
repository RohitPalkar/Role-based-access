# Story Spec: test case coverage

## Story Metadata
- **Key**: `test cases`
- **Title**: test case coverage
- **Target spec file**: `docs/ai/stories/test cases/spec.md`
- **Stack scope (from context map)**: React 18, TypeScript, Vite 5, MUI v5, Vitest, React Testing Library (RTL), Redux Toolkit

## Summary
Restore the failing Vitest + RTL suite for the Batch Manager area and tighten module-permission unit tests so the test command runs green. The story description embeds raw failing output from `yarn test`; the spec below normalizes those failures into concrete acceptance criteria, and treats the broader title ("test case coverage") as a directive to leave the targeted suites passing and lightly hardened, not to author wide-net coverage outside the failing files.

## In Scope
- The component test `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx` (failing case: *renders filled summary with deficit status when batches required exceed provision*).
- The unit test that asserts a module helper produces `module.actions === []` and `module.canCreate === false` for an empty/denied module (file not named in the pack; identified by symbols `module.actions` and `module.canCreate` on lines ~120–121 of a `*.test.ts` file under `src/`).
- Minimal, behavior-preserving adjustments to the components / helpers under test only if the production code is the root cause and the test expectation is correct.

## Out of Scope
- New feature work in Batch Manager beyond what the test asserts.
- Cross-cutting coverage uplift in unrelated modules.
- Editing copy, layout, validation rules, or API calls (per repo's Sonar/quality rule) unless a failure makes it unavoidable.

## Failing Tests (Source of Truth from Description)

### F1 — BatchPlanSummaryCard "Plan at a glance" not found
- **File**: `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx`
- **Test name**: `BatchPlanSummaryCard > renders filled summary with deficit status when batches required exceed provision`
- **Error**: `TestingLibraryElementError: Unable to find an element with the text: Plan at a glance.`
- **Observed DOM (from log)**: A rendered `MuiPaper` / `MuiStack` tree is present, but the literal text `Plan at a glance` is absent or split across nodes.
- **Likely causes to investigate** (in this order):
  1. Heading text was renamed/removed in `batch-plan-summary-card.tsx` and the test was not updated.
  2. Heading text is split across child elements (e.g. icon + text spans), so an exact string match fails; needs a function matcher or `getByRole('heading', { name: /plan at a glance/i })`.
  3. The component renders a different variant (e.g. empty/loading state) under the test's props, so the heading isn't mounted on this code path.

### F2 — Empty module: `module.actions` and `module.canCreate`
- **Assertions on lines ~120–121** of an existing `*.test.ts`:
  - `expect(module.actions).toEqual([]);`
  - `expect(module.canCreate).toBe(false);`
- **Behavior under test**: When a module/permission record has no granted actions, the helper must return an object whose `actions` is an empty array and whose `canCreate` flag is `false`.
- **Exact file path not provided in pack** — see Open Question Q1; locate via `module.canCreate` symbol search before editing.

## Acceptance Criteria
1. `yarn test:run` exits 0 with no failing tests in:
   - `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx`
   - The `*.test.ts` containing the `module.actions` / `module.canCreate` assertions (lines ~120–121).
2. The BatchPlanSummaryCard deficit-state test asserts the heading via an accessible query (e.g. `getByRole('heading', { name: /plan at a glance/i })`) so it is resilient to inline icon/text splits; if the production heading was intentionally renamed, the test is updated to the new wording and the change is justified in the implementation plan.
3. The module helper continues to return `actions: []` and `canCreate: false` for an empty/denied module input, and any other existing assertions in the same `describe` block still pass unchanged.
4. `yarn lint`, `yarn type-check`, and `yarn fm:check` pass on changed files (project quality gate).
5. No copy, layout, validation, or API behavior is changed beyond what is strictly required to make the failing tests green.

## UI Notes
- `BatchPlanSummaryCard` renders inside an `MuiPaper` + `MuiStack` layout. Any test/code change must preserve the existing visual structure (Paper elevation 0, Stack composition shown in the failure DOM).
- Do not introduce new MUI components or a new library (MUI v5 is the standard per repo rules).

## Implementation Notes
- **Pattern match neighbours**: Match imports, render helpers, and `describe`/`it` style of sibling tests under `src/sections/common-module/batch-manager/components/`.
- **Preferred RTL queries** (per `frontend-testing.mdc`): `getByRole`, `getByLabelText`. Avoid brittle `getByText` for headings that may include icons.
- **Test setup**: Vitest + jsdom is configured in `vite.config.ts → test`; jest-dom matchers from `src/test/setup.ts`. No new setup is required.
- **No real timers/network**: keep tests deterministic; mock Axios or use existing MSW patterns only if a fix demands it (avoid expanding scope).
- **Sonar hygiene**: fix root cause; do not introduce `// eslint-disable` for `no-empty`, `no-void`, etc. Reuse existing helpers rather than copy-pasting.

## References (open only if needed)
- `src/sections/common-module/batch-manager/components/batch-plan-summary-card.tsx` — component under test for F1.
- `src/sections/common-module/batch-manager/components/batch-plan-summary-card.test.tsx` — failing suite for F1.
- `src/test/setup.ts` — jest-dom matchers.
- `vite.config.ts` — Vitest config (`test` block).
- `.cursor/rules/frontend-testing.mdc` — testing policy.
- `.cursor/rules/stack-and-quality.mdc` — quality gates and Sonar guidance.
- Fallback artifacts (only if pack is insufficient): `docs/ai/project-context.md`, `docs/ai/context-map.json`.

## Assumptions
- A1: "test case coverage" in this story is scoped to making the two failures in the description pass and lightly hardening their queries — not a project-wide coverage push.
- A2: The production behavior for the empty-module case (`actions: []`, `canCreate: false`) is the intended contract; the test is the spec.
- A3: The BatchPlanSummaryCard heading is meant to read "Plan at a glance"; if source code shows otherwise, update the test to the current production string and note the rename in the implementation plan.
- A4: The garbled `^ 120|` / `121|` prefix in the description is line-number noise from a pasted Vitest report, not literal source content.

## Open Questions
- Q1: Which file contains the `module.actions` / `module.canCreate` assertions on lines ~120–121? (Not named in the context pack; search by symbol before editing — likely a permission/role helper test under `src/utils/` or `src/auth/`.)
- Q2: Was the BatchPlanSummaryCard heading intentionally renamed in a recent change, or is "Plan at a glance" still the intended copy? Resolve by inspecting the component before deciding whether to update the production string or the test query.
- Q3: Are there additional failing tests beyond the two surfaced in the truncated description? Confirm by running `yarn test:run` once before implementation planning; if more failures appear, list them as follow-up criteria in the implementation plan rather than expanding this spec.

## Traceability
- Source: story description (failing Vitest output) embedded in `.opencode/executions/exec-07daad1a-d5db-4456-a0d3-99bb932fc3a0/context-packs/story_analyzer.md`.
- Selected context map entries used: `project`, `srcRoots`, `stackFamilies`, `notes` (treat `src/` as source of truth).
