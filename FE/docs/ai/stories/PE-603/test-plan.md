# PE-603 — Test Plan
Add Mandatory "Last 4 Digits of Card" Field for EDC Machine Transactions

> Status: written **before implementation**. Production code referenced by these tests does not exist yet. All assertions tied to unwritten code, exported symbols, or props are marked `TODO` so the test-writer pass after implementation can fill them in deterministically.

## Scope of testing

In scope for this story (per `docs/ai/stories/PE-603/spec.md` and `docs/ai/stories/PE-603/implementation-plan.md`):

1. New shared component `DigitBoxInput` (`src/components/digit-box-input/digit-box-input.tsx`) extracted from the existing OTP dialog box-input logic.
2. EOI payment-capture form changes (`src/sections/common-module/expression-of-interest/components/payment-details-form.tsx`) — conditional render of the new field when `paymentMode === EOIPaymentMode.OFFLINE` AND `paymentMethod === 'EDC MACHINE'`, value reset on mode/method change.
3. Yup schema, initial values, and submit payload mapping in `src/sections/common-module/expression-of-interest/components/more-details-expression-form.tsx`.
4. Type extension in `src/types/rm-panel/eoi.ts` (`Payment.paymentDetails.lastFourDigits?: string`).
5. Downstream display in `src/sections/common-module/expression-of-interest/components/review-components/payment-details.tsx`.
6. Locale strings in `src/locales/langs/en/common.json` (label + validation messages).

Explicitly out of scope:

- Changes to `src/components/otp-dialog/otp-dialog.tsx` (left untouched per plan).
- Backend / API contract verification.
- E2E flow against a running backend.

## Detected framework & conventions (reused as-is)

- Test runner: **Vitest** (`vite.config.ts` → `test`, jsdom, globals: false, setup `src/test/setup.ts`).
- DOM utilities: **@testing-library/react**, **@testing-library/user-event**, **@testing-library/jest-dom/vitest**.
- File patterns: `src/**/*.{test,spec}.{ts,tsx}` (matches `vite.config.ts` `test.include`).
- Imports style (per existing tests, e.g. `src/sections/common-module/batch-manager/components/tinted-accent-stat-card.test.tsx`):
  ```ts
  import { it, vi, expect, describe } from 'vitest';
  import userEvent from '@testing-library/user-event';
  import { render, screen } from '@testing-library/react';
  ```
- Theme-wrapped render helper (`renderWithTheme(ui)` using `createTheme()` + `ThemeProvider`) — colocate a local helper in each test file rather than introducing a shared utility (matches repo convention).
- Mocking Redux selectors / actions via `vi.mock('src/hooks/use-redux', …)` and feature-action modules (pattern from `EOIManagerForm.test.tsx`).
- Run commands (no new scripts):
  - `yarn test:run src/components/digit-box-input src/sections/common-module/expression-of-interest`
  - `yarn test:run` (full suite) for CI parity.

## Files to add / update

| File | Status | Purpose |
|---|---|---|
| `src/components/digit-box-input/digit-box-input.test.tsx` | **create (starter, this pass)** | Unit tests for the new shared `DigitBoxInput` component |
| `src/sections/common-module/expression-of-interest/components/__tests__/payment-details-form.edc.test.tsx` | **plan only, defer to post-impl pass** | RTL tests for conditional render, validation, reset, and payload mapping |
| (no other test files touched) |  | Existing tests stay green |

`payment-details-form.edc.test.tsx` is intentionally **not** scaffolded in this pre-implementation pass because the form's exported surface (props, default initial values, the way it wires `moreDetailsFormik` and the EDC radio) will only be finalised during implementation. Pre-committing brittle imports / selectors here would lock in guesses and break the build. The scaffold is described below so the post-implementation pass can drop it in mechanically.

## Test matrix

### A. `DigitBoxInput` — unit (RTL + user-event)

Target: `src/components/digit-box-input/digit-box-input.tsx` (to be created).

Conventions to follow from the OTP dialog (`src/components/otp-dialog/otp-dialog.tsx`): numeric filter `^\d*$`, paste filter `^\d+$`, auto-advance on input, backspace step-back when current cell is empty, stable per-index keys.

| # | Case | Expected behaviour |
|---|---|---|
| A1 | Renders N boxes when `length=4` (default) | Exactly 4 input elements rendered (queried by role `textbox` or by accessible label). |
| A2 | Renders N boxes when `length=6` | 6 input elements (smoke check that `length` prop is honoured). |
| A3 | Numeric-only filter (typing) | Typing `a` is rejected; the underlying `value` does not change and `onChange` is **not** called with non-digit content. |
| A4 | Single-digit typing advances focus | Typing `1` into box 0 calls `onChange('1')` and moves focus to box 1. |
| A5 | Typing across all boxes builds the concatenated value | Typing `1`, `2`, `3`, `4` results in the final `onChange` call receiving `'1234'`. |
| A6 | Backspace on empty cell steps back and clears previous | Focusing box 2 (empty) and pressing `Backspace` clears box 1 and focuses box 1; `onChange` is called with the truncated string. |
| A7 | Paste of digits fills from the focused index | Pasting `1234` into box 0 fills all four boxes and emits `onChange('1234')`. |
| A8 | Paste of non-digit content is ignored | Pasting `12ab` does not mutate the value; `onChange` is not called. |
| A9 | `error` + `helperText` props surface a visible helper text | When `error={true}` and `helperText="…required"` are passed, the helper text node is in the document and the input group is marked invalid (aria / MUI error class). |
| A10 | `disabled` disables all boxes | Each input has `disabled` attribute / `aria-disabled`. |
| A11 | Controlled value reflects `value` prop | Mounting with `value="12"` renders `1` in box 0 and `2` in box 1; boxes 2–3 are empty. |
| A12 | `aria-label` / `aria-describedby` are applied | Group exposes the supplied accessible name and links to the error helper text id. |

Notes for the implementer of the test file:
- Use `userEvent.setup()` per test (matches existing tests).
- Avoid relying on internal class names; prefer `getAllByRole('textbox')`, `getByText`, and `toHaveFocus()`.
- Do **not** assert on `crypto.randomUUID` output or on internal `useState` keys — they are implementation detail.

### B. EOI payment-details form — component / integration (RTL)

Target: `payment-details-form.tsx` (consumed by `more-details-expression-form.tsx`). Tests should mount the smallest sufficient surface — preferably the parent `more-details-expression-form` (because it owns the Formik instance, schema, and payload mapper) — so validation and submission can be observed end-to-end without depending on un-modelled redux slices.

> If wrapping the full `more-details-expression-form` proves to require excessive Redux/Router mocks during implementation, fall back to a `<Formik initialValues={…} validationSchema={…}>` wrapper that mounts only `PaymentDetailsForm` and exposes a `<button type="submit">Submit</button>`. Either approach is acceptable; do **not** rebuild a parallel form schema in the test.

| # | Case | Acceptance criterion mapped | Expected behaviour |
|---|---|---|---|
| B1 | EDC field hidden by default (no offline payment selected) | AC #1 | "Last 4 Digits of Card" label is not in the document. |
| B2 | Selecting `Pay Offline` + `EDC MACHINE` shows the field | AC #1, AC #5 | After choosing offline mode and clicking the `EDC MACHINE` radio, the 4-box `DigitBoxInput` is rendered with the label `Last 4 Digits of Card`. |
| B3 | Switching `paymentMethod` from `EDC MACHINE` to `CHEQUE` hides the field AND clears the in-form value | AC #1 | The field disappears; submitting after switch must not include `lastFourDigits` in the payload (covered in B8). |
| B4 | Switching `paymentMode` from `OFFLINE` to `GATEWAY` clears the value | AC #1 | Same as B3 — no stale value carried forward (asserted via the submit-payload test or via Formik state if exposed). |
| B5 | Empty submit shows the required validation message | AC #2 | `Last 4 digits of card are required` is rendered after clicking submit with `EDC MACHINE` selected and the field empty. |
| B6 | Non-numeric input is rejected (relies on `DigitBoxInput`) | AC #3 | Typing letters does not populate the boxes; no payload value is captured. |
| B7 | Submit with fewer than 4 digits shows format error | AC #4 | Entering `12` and submitting shows `Please enter the last 4 digits of the card (numbers only)` (or the exact key resolved from `common.json` — `TODO: lock to final string`). |
| B8 | Submit with valid `1234` passes value through payload mapper | AC #6 | The submit handler (stub / mocked) is called with a payload whose offline EDC transaction has `paymentDetails.lastFourDigits === '1234'`. Leading-zero case `0042` is preserved as `"0042"`. |
| B9 | Non-EDC submit omits `lastFourDigits` | AC #6 | For `CHEQUE` / `ONLINE TRANSFER` / `UPI CARD` / `GATEWAY`, the submitted payload does **not** contain `lastFourDigits` on `paymentDetails`. |
| B10 | `hasEdits` flips status when only `lastFourDigits` changed | Plan §5 | Editing only the digits on an existing transaction marks the row as edited (status → `UNVERIFIED` per existing sibling pattern). `TODO: confirm exact assertion target — likely the status field on the mapped payload.` |

Mocking strategy (mirrors `EOIManagerForm.test.tsx`):

- `vi.mock('src/hooks/use-redux', () => ({ useAppSelector: (sel) => sel({ /* TODO: minimal slice shape */ }) }))`.
- `vi.mock('src/redux/actions/...', () => ({ /* TODO: stub the actions actually dispatched on submit */ }))`.
- No real network: `vi.mock('src/services/...')` only if the form imports services directly during render.
- Use the project's `EOIPaymentMode` enum from `src/utils/constant.ts` — do **not** hardcode `'Offline'` / `'Gateway'` strings in tests.

### C. Yup schema — focused unit (optional, lightweight)

Target: the `validationSchema` exported (or accessible) from `more-details-expression-form.tsx`.

If the implementation exposes the schema (or the relevant inner shape) as a named export, add focused tests:

| # | Case | Expected |
|---|---|---|
| C1 | `lastFourDigits` is required when `paymentMode=OFFLINE` AND `paymentMethod='EDC MACHINE'` | `schema.validateAt('transactions[0].lastFourDigits', { … '' })` rejects with the required message. |
| C2 | `lastFourDigits` accepts `'1234'` for EDC | Resolves without error. |
| C3 | `lastFourDigits` rejects `'12'`, `'12345'`, `'12a4'` | Rejects with the format message. |
| C4 | `lastFourDigits` is optional / passthrough for `CHEQUE`, `ONLINE TRANSFER`, `UPI CARD`, `GATEWAY` | Resolves without error even when empty. |

If the schema is not exported, **skip section C** and rely on B5–B7 instead. Do not modify production code solely to enable unit testing — keep it Sonar-clean.

### D. Downstream display — `review-components/payment-details.tsx`

Add a focused RTL test when the review component is updated. Tests should be additive and must not regress existing rendering for non-EDC rows.

| # | Case | Expected |
|---|---|---|
| D1 | Renders `Card •••• 1234` (or the agreed format) when an EDC row has `paymentDetails.lastFourDigits = '1234'` | The masked suffix appears in the payment-method / transaction cell. |
| D2 | No card suffix is rendered when `lastFourDigits` is missing on an EDC row | Existing cell content unchanged. |
| D3 | No card suffix is rendered for non-EDC methods even if `lastFourDigits` is somehow set | Defensive — the display should be gated by `method`. |

`TODO`: lock the exact display string (`Card •••• 1234` vs `•••• 1234` vs other) once the implementation pass settles it. Until then, prefer asserting on the digit substring + a stable adjacent label, not the full styled string.

### E. Locale strings — passive contract

No dedicated test file. The label and validation copy are referenced by B5/B7 and (optionally) C1/C3. Tests should read the strings from `src/locales/langs/en/common.json` (e.g. `uiText.EOIJson.createEOI.form.moreDetails.paymentDetails.validations.lastFourDigitsRequired`) rather than re-typing them, so a copy change does not silently break tests.

`TODO`: confirm the exact JSON path after the locale edit is applied (plan suggests `paymentDetails.label.lastFourDigitsOfCard`, `paymentDetails.validations.lastFourDigitsRequired`, `paymentDetails.validations.lastFourDigitsFormat`).

### F. Type extension — `src/types/rm-panel/eoi.ts`

No runtime test. Covered transitively by `yarn type-check` (listed under Quality gates). No starter test file added.

## Starter test file (committed this pass)

Path: `src/components/digit-box-input/digit-box-input.test.tsx`

The starter file is intentionally **skipped** (`describe.skip`) so it does not break CI before the component exists. Once `DigitBoxInput` is implemented, the post-implementation pass should:

1. Remove the `.skip` from the outer `describe`.
2. Replace the `TODO` placeholders with the real `DigitBoxInput` import and (if needed) accessibility selectors that match the rendered DOM.
3. Run `yarn test:run src/components/digit-box-input`.

Skeleton (created alongside this plan in the same commit):

```tsx
// src/components/digit-box-input/digit-box-input.test.tsx
// Pre-implementation starter for PE-603. Suite is skipped until
// `DigitBoxInput` exists; the post-impl pass will un-skip and fill TODOs.
import { it, vi, expect, describe } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';

import { createTheme, ThemeProvider } from '@mui/material/styles';

// TODO: import once the component is created
// import { DigitBoxInput } from './digit-box-input';

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe.skip('DigitBoxInput', () => {
  it('renders 4 boxes by default', () => {
    // TODO: renderWithTheme(<DigitBoxInput value="" onChange={vi.fn()} />);
    // TODO: expect(screen.getAllByRole('textbox')).toHaveLength(4);
    expect(true).toBe(true);
  });

  it('rejects non-numeric input', async () => {
    // TODO: assert handleChange filter (/^\d*$/) — typing 'a' does not invoke onChange
    const user = userEvent.setup();
    void user;
    expect(true).toBe(true);
  });

  // TODO: A4 auto-advance, A6 backspace step-back, A7 paste fill,
  //       A9 error/helperText, A10 disabled, A11 controlled value,
  //       A12 aria-label / aria-describedby
});
```

> Why skipped: the `unit_test_writer` agent runs **before** implementation. A green-but-skipped suite is safer than a red suite that blocks the impl pass, and it carries the structure forward as a TODO checklist.

## Quality gates (run only on touched surface)

Per `implementation-plan.md` and `.cursor/rules/stack-and-quality.mdc`:

- `yarn type-check`
- `yarn lint src/components/digit-box-input src/sections/common-module/expression-of-interest src/types/rm-panel/eoi.ts`
- `yarn fm:check`
- `yarn test:run src/components/digit-box-input src/sections/common-module/expression-of-interest`

Do **not** add `yarn test:coverage` to the loop — it is not required by this story and is slower than the scoped run.

## Risks & open items for the post-implementation test pass

1. **Spec-vs-code mismatch on "payment mode"**: tests must follow the code's model (`paymentMode = OFFLINE` + `paymentMethod = 'EDC MACHINE'`), not the spec wording. Locked in by B2–B4.
2. **Payload field name**: `lastFourDigits` vs `cardLast4` vs `last4Digits` — backend confirmation pending. Tests in B8/B9/D1 reference `paymentDetails.lastFourDigits`; if backend dictates a different key, update the mapper and the four assertions in B8, B9, D1, D3 only.
3. **DigitBoxInput prop surface**: tentative — `{ length?, value, onChange, error?, helperText?, disabled?, autoFocus?, 'aria-label'?, 'aria-describedby'? }`. Tests must match the final signature; A1–A12 are written to be largely prop-surface-agnostic.
4. **Schema export**: section C only activates if `validationSchema` (or a focused sub-schema) is exported. If not, do not refactor production code to expose it — drop section C and lean on B5–B7.
5. **Existing test conventions**: the repo currently has only a handful of `.test.tsx` files. Keep the new tests stylistically close to `tinted-accent-stat-card.test.tsx` (small, theme-wrapped, RTL-only) and `EOIManagerForm.test.tsx` (mock pattern for `useAppSelector` / action modules). Do **not** introduce MSW, jest-axe, snapshot testing, or other tooling that is not already in `package.json`.
6. **No production-code changes from this stage**: the only file written in this pass is this plan plus the skipped starter. All edits to `payment-details-form.tsx`, `more-details-expression-form.tsx`, `digit-box-input.tsx`, `payment-details.tsx`, `eoi.ts`, and `common.json` happen in the implementation stage.

## Definition of done (for the implementation stage's test pass)

- `DigitBoxInput` tests A1–A12 implemented and passing.
- `payment-details-form.edc.test.tsx` covers at minimum B2, B3, B5, B7, B8, B9 (the rest are nice-to-have when the form harness allows them).
- `review-components/payment-details.tsx` test D1 added (D2/D3 optional but recommended).
- All scoped quality-gate commands pass locally.
- No changes to `otp-dialog.tsx` or unrelated tests.
