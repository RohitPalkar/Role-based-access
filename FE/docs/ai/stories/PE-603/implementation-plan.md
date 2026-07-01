# PE-603 — Implementation Plan
Add Mandatory "Last 4 Digits of Card" Field for EDC Machine Transactions

## Goal
On the EOI payment-capture form, capture the last 4 digits of the Debit/Credit Card whenever the payment method is **EDC Machine**. Render with a reused 4-box OTP-style input, validate (mandatory, numeric, exactly 4 digits), include in the API payload only for EDC Machine, and surface in the downstream payment review view.

## Repository orientation (verified by reading source)
- The EOI payment form is `src/sections/common-module/expression-of-interest/components/payment-details-form.tsx`. Within `paymentMode === EOIPaymentMode.OFFLINE`, an inner radio group offers `CHEQUE | ONLINE TRANSFER | UPI CARD | EDC MACHINE` (the existing `EDC MACHINE` option is a `paymentMethod`, not a top-level `paymentMode`). Spec wording "payment mode = EDC Machine" maps to **`paymentMode === EOIPaymentMode.OFFLINE` AND `paymentMethod === 'EDC MACHINE'`**.
- Yup schema and submit/payload mapping live in `src/sections/common-module/expression-of-interest/components/more-details-expression-form.tsx` (`validationSchema` ~L833 and `payments` mapper ~L1056).
- Existing 4/6-box input lives in `src/components/otp-dialog/otp-dialog.tsx` (length configurable, numeric-only, auto-advance, backspace, paste handling). Reusable, but currently coupled to a Dialog. We will extract the bare 4-box input into a small shared component without changing OTP dialog behavior.
- Locale strings: `src/locales/langs/en/common.json` → `EOIJson.createEOI.form.moreDetails.paymentDetails.label` and `…validations`.
- Type for stored payment: `src/types/rm-panel/eoi.ts` → `Payment.paymentDetails`.
- Downstream display: `src/sections/common-module/expression-of-interest/components/review-components/payment-details.tsx`.

## Target Files

### Create
- `src/components/digit-box-input/digit-box-input.tsx` — generic N-digit numeric box input (default `length=4`) extracted from the OTP dialog's box-input logic. Exports `DigitBoxInput` with props `{ length?, value, onChange(value: string), error?, helperText?, autoFocus?, disabled?, id?, 'aria-label'?, 'aria-describedby'? }`.
- `src/components/digit-box-input/index.ts` — barrel re-export.
- `src/components/digit-box-input/digit-box-input.test.tsx` — unit tests (numeric-only filter, paste, backspace, auto-advance, error state, controlled value).
- `src/sections/common-module/expression-of-interest/components/__tests__/payment-details-form.edc.test.tsx` — RTL tests: conditional render on `EDC MACHINE`, validation message on empty/short, payload inclusion via submit handler (mock Formik or render parent with a stub submit), reset on method change.

### Edit
- `src/sections/common-module/expression-of-interest/components/payment-details-form.tsx`
  - Add `lastFourDigits` rendering inside the `paymentMode === EOIPaymentMode.OFFLINE` block, visible only when `txn?.paymentMethod === 'EDC MACHINE'`.
  - Use the new `DigitBoxInput` (length 4) with `value={txn?.lastFourDigits || ''}` and `onChange` → `setFieldValue(\`transactions[${index}].lastFourDigits\`, next)`.
  - Show error via `getIn(touched/errors, …)` with helperText below the input group (match surrounding pattern).
  - When the radio `paymentMethod` changes (or when `paymentMode` flips away from `OFFLINE`), reset `transactions[index].lastFourDigits` to `''` and `setFieldTouched(..., false)`.
- `src/sections/common-module/expression-of-interest/components/more-details-expression-form.tsx`
  - Add `lastFourDigits: ''` to both initial-transaction shapes (the mapped `voucherData.payments` map and the fallback `[{ … }]`), seeded from `txn?.paymentDetails?.lastFourDigits || ''` when present.
  - Extend `validationSchema.transactions[].shape({...})` with:
    ```ts
    lastFourDigits: yup.string().when(['paymentMode', 'paymentMethod'], ([mode, method], schema) =>
      mode === EOIPaymentMode.OFFLINE && method === 'EDC MACHINE'
        ? schema
            .required(jsonValue.validations.lastFourDigitsRequired)
            .matches(/^\d{4}$/, jsonValue.validations.lastFourDigitsFormat)
        : schema.notRequired()
    ),
    ```
    (Use callback form to comply with `stack-and-quality.mdc`.)
  - In the submit `payments` mapper (`filledTransactions.filter(... OFFLINE).map(...)`), when `txn?.paymentMethod === 'EDC MACHINE'` and `txn?.lastFourDigits`, add `paymentDetails.lastFourDigits = txn.lastFourDigits` (mirror the `if (txn?.transactionNumber)` pattern, conditionally so non-EDC requests omit the key).
  - Include `lastFourDigits` in the `hasEdits` comparison so an edited value forces status back to `UNVERIFIED` consistent with sibling fields.
- `src/types/rm-panel/eoi.ts`
  - Extend `Payment.paymentDetails` with optional `lastFourDigits?: string;`.
- `src/sections/common-module/expression-of-interest/components/review-components/payment-details.tsx`
  - When `details?.method` (case-insensitive) equals `EDC MACHINE` (or `EDC`), render the captured value (e.g. append `• Card •••• ${details.lastFourDigits}` in the Payment Method cell or add it to the Transaction cell next to the transaction number). Keep markup minimal and consistent with the existing inline tooltip/text style. Do not display anything when `lastFourDigits` is empty.
- `src/locales/langs/en/common.json`
  - Add under `EOIJson.createEOI.form.moreDetails.paymentDetails.label`:
    - `"lastFourDigitsOfCard": "Last 4 Digits of Card"`
  - Add under `…paymentDetails.validations` (sibling of `usedTransaction`, `duplicateCheque`):
    - `"lastFourDigitsRequired": "Last 4 digits of card are required"`
    - `"lastFourDigitsFormat": "Please enter the last 4 digits of the card (numbers only)"`

### Out of scope (do not edit)
- `src/components/otp-dialog/otp-dialog.tsx` — leave behavior untouched. Optional follow-up: refactor it to consume `DigitBoxInput` once parity is verified; not required for PE-603.

## Implementation steps (in order)

1. **Add locale strings** in `src/locales/langs/en/common.json` (`label.lastFourDigitsOfCard`, `validations.lastFourDigitsRequired`, `validations.lastFourDigitsFormat`). Read-only validate JSON parses (`yarn type-check` exercises imports).
2. **Create `DigitBoxInput`** at `src/components/digit-box-input/digit-box-input.tsx` mirroring the OTP dialog's box logic (numeric filter regex `^\d*$`, paste filter `^\d+$`, auto-advance, backspace step-back, configurable `length` default `4`, stable per-index `key`s via `crypto.randomUUID()` cached in `useState`). Use MUI `TextField` + `Box` flex container; expose `value: string`, `onChange(next: string)`, `error?: boolean`, `helperText?: string`, `disabled?: boolean`, `'aria-label'`, `'aria-describedby'`. Add barrel `index.ts`.
3. **Integrate field into `payment-details-form.tsx`**:
   - Place the new field inside the existing `txn?.paymentMode === EOIPaymentMode.OFFLINE` block, immediately after the `transactionNumber` `CustomTextField`, gated by `txn?.paymentMethod === 'EDC MACHINE'`.
   - Render `<Grid item xs={12} sm={6}>` with a label `Typography` (using `jsonValue.label.lastFourDigitsOfCard`) and the `DigitBoxInput`.
   - Wire `onChange` → `moreDetailsFormik.setFieldValue(\`transactions[${index}].lastFourDigits\`, value)` and `setFieldTouched(..., true, false)` only when the value changes (match `touchFieldOnChange` pattern).
   - Compute `error`/`helperText` via `getIn(formik.touched/errors, …)` with the same submit-only display rule used by adjacent `CustomTextField` instances (`showErrorOnSubmitOnly` style).
   - In the `RadioGroup.onChange` for `paymentMethod`, after delegating to `formik.handleChange`, clear `lastFourDigits` whenever the new value !== `EDC MACHINE` (use `setFieldValue('transactions[index].lastFourDigits', '')` + `setFieldTouched(..., false)`).
   - In the `Pay Now`/`Pay Offline` click handlers that flip `paymentMode`, also clear `lastFourDigits` if leaving offline.
4. **Yup schema & initial values** in `more-details-expression-form.tsx`:
   - Add `lastFourDigits: txn?.paymentDetails?.lastFourDigits || ''` to the mapped `transactions` initial values and `lastFourDigits: ''` to the fallback transaction object.
   - Add the `.when(['paymentMode','paymentMethod'], …)` Yup schema rule (callback form) shown above.
5. **Payload mapping** in `more-details-expression-form.tsx`:
   - Inside the `payments` mapper, conditionally attach `paymentDetails.lastFourDigits = txn.lastFourDigits` when `txn?.paymentMethod === 'EDC MACHINE'` and `txn?.lastFourDigits` is a 4-char numeric string (defensive `/^\d{4}$/.test(...)`).
   - Add `txn?.lastFourDigits !== original?.lastFourDigits` to the `hasEdits` boolean.
   - Mirror in `initialTransactions` (memo at ~L623) so edit-comparison sees the original value.
6. **Type update** in `src/types/rm-panel/eoi.ts`: add optional `lastFourDigits?: string` to `Payment.paymentDetails`.
7. **Downstream display** in `review-components/payment-details.tsx`: when `details?.method?.toUpperCase() === 'EDC MACHINE'` and `details?.lastFourDigits`, render `Card •••• {details.lastFourDigits}` inline in the Payment Method cell. Keep `'N/A'` fallback semantics unchanged for other methods.
8. **Tests** (colocated, Vitest + RTL):
   - `DigitBoxInput` unit tests: rejects non-digits, accepts paste of 4 digits, advances focus, calls `onChange` with concatenated string, shows error state when `error=true`.
   - Payment form RTL test: renders form, selects `Pay Offline`, selects `EDC MACHINE` radio → "Last 4 Digits of Card" appears; switching to `CHEQUE` hides and clears it; submitting empty shows the required message; submitting with `1234` includes `lastFourDigits: '1234'` in the payload passed to the mocked submit.
9. **Quality gates**: run only on the touched surface (see Validation Commands).

## Data contract
- Request payload key: `paymentDetails.lastFourDigits` (string of exactly 4 digits) — present **only** when `paymentMethod === 'EDC MACHINE'`. Preserve leading zeros as a string. Confirm exact key with backend per spec Open Question #2; if backend uses a different name (`cardLast4`, `last4Digits`), adjust the mapper and review component only.

## Validation commands (scoped)
- `yarn type-check`
- `yarn lint src/components/digit-box-input src/sections/common-module/expression-of-interest src/types/rm-panel/eoi.ts`
- `yarn fm:check`
- `yarn test:run src/components/digit-box-input src/sections/common-module/expression-of-interest`

## Risks
- **Spec wording mismatch**: spec says "payment mode = EDC Machine", code models EDC under `paymentMethod` inside `paymentMode = OFFLINE`. Plan uses the code's model; verify with PO if a top-level mode is expected.
- **Backend field name**: payload key (`lastFourDigits` vs `cardLast4`/`last4Digits`) not confirmed; mapper is the single change point if it differs.
- **OTP dialog drift**: extracting `DigitBoxInput` and not switching `otp-dialog.tsx` to use it leaves two implementations until a follow-up; keep both behaviors identical (numeric filter, paste handling, key stability). Do not refactor the OTP dialog in this PR to keep diff minimal and Sonar-safe.
- **Stale form state**: failure to clear `lastFourDigits` on method/mode change risks submitting stale data — covered by explicit `setFieldValue('', …)` resets and a test case.
- **Status side-effect**: editing `lastFourDigits` on a `REJECTED` row must reset to `UNVERIFIED` per existing `hasEdits` pattern; covered by including it in the comparison.
- **PCI hygiene**: never log the value, never send anything beyond 4 digits, never display full PAN/CVV.

## Assumptions
- The new field belongs on the existing EOI payment-capture form (`payment-details-form.tsx` rendered by `more-details-expression-form.tsx`). No other payment-capture screen requires it for this story.
- Backend accepts an additional optional `lastFourDigits` key on `paymentDetails` for EDC transactions; if not, this story still ships the UI/validation and the mapper is one-line ready to point at the agreed key.
- English copy is acceptable for this iteration; strings are added to the existing `common.json` so future i18n is straightforward.
- The OTP dialog component is the canonical "OTP Input Component" referenced by the spec; reusing its box-input logic via `DigitBoxInput` satisfies the reuse requirement without coupling the new field to a Dialog.

## Context Budget
- Inspect the **Target Files** above first; do not broad-scan the repo.
- Open non-target files only for: direct imports (`EOIPaymentMode` in `src/utils/constant.ts`), the parent caller of `PaymentDetailsForm` (`more-details-expression-form.tsx`, already listed), the `Payment` type, and the colocated test setup (`src/test/setup.ts`, `vite.config.ts`) — read minimally.
- Use provider-native edit tools to apply changes; do **not** print full file contents, full diffs, or large code blocks in chat. Reference existing patterns by file path + line range instead.
- For the locale JSON, edit only the two needed nodes; do not reformat the file.
- Run only the scoped `yarn lint` / `yarn test:run` paths listed under Validation Commands. Skip `yarn test:coverage` and global formatters unless a hook requires them.
- Do not open generated, dependency, build, or execution-history folders. Do not open `docs/ai` artifacts other than this plan and the spec.
