# PE-603 — Add Mandatory "Last 4 Digits of Card" Field for EDC Machine Transactions

## Summary
Capture the last 4 digits of the Debit/Credit Card used in a payment transaction when the payment mode is **EDC Machine**. The field must appear conditionally, be mandatory, accept exactly 4 numeric digits, reuse the existing OTP-style 4-box input component for UX consistency, and be included in the payment-capture API payload.

## Background / Context
- Story Key: **PE-603**
- Area: Payment capture flow (EDC Machine transactions)
- Stack: React 18 + TypeScript, MUI v5, Redux Toolkit, Axios; forms via Formik + Yup or react-hook-form + Zod (match the existing payment form's pattern).
- The story description in the context pack is truncated at "Ensure the value is availab…". The intent is clearly that the captured value must be available/persisted downstream (API payload, and presumably visible in transaction details/reports). See Open Questions for the truncated tail.

## Scope

### In scope
- New form field **"Last 4 Digits of Card"** on the payment capture screen.
- Conditional rendering based on payment mode = `EDC Machine`.
- Client-side validation (mandatory, numeric, exactly 4 digits).
- Reuse of the existing OTP Input component (4-box input) for the field UI.
- Inclusion of the captured value in the payment-capture API request payload.
- Unit/component tests covering conditional rendering, validation, and payload mapping.

### Out of scope
- Backend/API contract changes beyond adding the new field to the existing payment-capture request (assumed already supported or trivially added server-side).
- Changes to payment modes other than EDC Machine.
- Storage of full card details (PAN/CVV/expiry) — only the last 4 digits are captured.

## Functional Requirements

1. **New Field**
   - Label: `Last 4 Digits of Card`.
   - Field key (suggested): `lastFourDigits` (confirm with existing payload conventions; see Assumptions).

2. **Conditional Display**
   - The field is visible **only** when the selected payment mode is `EDC Machine`.
   - When the user switches away from `EDC Machine`, the field must be hidden and its value cleared from form state so a stale value is never submitted.

3. **Mandatory**
   - Required whenever visible (i.e., whenever payment mode is `EDC Machine`).
   - Form submission must be blocked until the field passes validation.

4. **Input Constraints**
   - Accept only numeric characters (`0–9`).
   - Exactly 4 digits — both minimum and maximum length are 4.
   - Non-numeric keystrokes/paste content must be filtered out (consistent with current OTP input behavior).

5. **Validation Messages**
   - Empty: e.g., `Last 4 digits of card are required`.
   - Invalid (non-numeric or wrong length): e.g., `Please enter the last 4 digits of the card (numbers only)`.
   - Use the project's standard error display pattern (helperText / FormHelperText under the field, matching surrounding form fields).

6. **Data Handling**
   - The captured 4-digit string must be added to the payment-capture API request payload when payment mode = `EDC Machine`.
   - Send the value as a 4-character string (preserving any leading zeros). Do **not** send the field for non-EDC payment modes.
   - Ensure the value is available downstream wherever EDC transaction details are displayed (transaction list/detail screens, receipts, audit views) — see Open Questions.

## UI / UX Requirements

- **Component reuse:** Use the existing OTP Input component (the 4-box input currently used for OTP entry) to render the field. Do not introduce a new input primitive.
- **Styling & behavior parity:** Match the OTP input's spacing, typography, focus/error states, auto-advance between boxes, backspace navigation, and paste handling.
- **Placement:** Render the field within the payment form, adjacent to (typically below) the payment mode selector, so the conditional reveal is visually coherent.
- **Accessibility:**
  - Field group must have an accessible label ("Last 4 Digits of Card").
  - Error message must be associated with the input group (`aria-describedby`) and announced to screen readers.
  - Each box should be keyboard-navigable and focusable.

## Implementation Notes

- **Locate existing OTP component** under `src/components/` (or wherever OTP entry currently lives) and reuse it. If it currently exposes only an OTP-specific API, extract a generic `DigitBoxInput` (or accept generic props such as `length`, `value`, `onChange`, `error`) so it can serve both OTP and "Last 4 Digits" use cases without duplicating logic. Keep the change minimal — match existing patterns in the same folder.
- **Form integration:** Wire the field through the same form library already used by the payment capture form (Formik + Yup, or react-hook-form + Zod). Do not mix libraries.
- **Validation schema:**
  - Conditional `required` (e.g., Yup `.when('paymentMode', ...)` using the **callback form**, not the deprecated object form; or Zod `.refine`/discriminated union by payment mode).
  - Regex: `/^\d{4}$/`.
- **State hygiene:** On payment-mode change to anything other than `EDC Machine`, reset `lastFourDigits` to its initial empty value to avoid submitting stale data.
- **Payload mapping:** Update the payment-capture submit handler / payload mapper to include `lastFourDigits` only for EDC transactions. Centralize mapping if a mapper helper already exists.
- **No secrets / no full card data:** Do not log, store, or transmit anything beyond the last 4 digits. No PAN, expiry, or CVV.
- **i18n:** If the payment form uses the project's `locales/` strings, add labels and error messages there rather than hardcoding.
- **Sonar / quality:** Avoid empty `catch` blocks, deep nesting, and copy-paste. Use strict equality and explicit null/undefined handling for the new field and payload key.

## API / Data Contract

- Request payload (existing payment-capture endpoint) gains an optional field, present only for EDC transactions:
  - Suggested key: `lastFourDigits` (string, 4 numeric characters).
- Confirm exact field name and casing with backend; see Open Questions.
- The field is stored/persisted such that it can be surfaced on EDC transaction views downstream (per truncated "Ensure the value is availab…").

## Acceptance Criteria

1. **Conditional visibility**
   - GIVEN the payment capture form, WHEN the user selects `EDC Machine` as the payment mode, THEN the "Last 4 Digits of Card" field is displayed.
   - WHEN the user selects any other payment mode, THEN the field is not displayed and any previously entered value is cleared from form state.

2. **Mandatory enforcement**
   - GIVEN payment mode is `EDC Machine` AND the field is empty, WHEN the user submits the form, THEN submission is blocked and an "is required" validation message is shown.

3. **Format validation — numeric only**
   - GIVEN the field is visible, WHEN the user attempts to type non-numeric characters (or paste them), THEN the input rejects them and the value remains numeric-only.

4. **Length validation — exactly 4 digits**
   - GIVEN the field has fewer than 4 digits, WHEN the user submits, THEN submission is blocked and an appropriate validation message is shown.
   - The input cannot accept more than 4 digits.

5. **OTP component reuse**
   - The field is rendered using the existing OTP 4-box input component, with matching styling, focus behavior, paste handling, and error states.

6. **API payload**
   - WHEN the form is submitted with payment mode `EDC Machine` and a valid 4-digit value, THEN the payment-capture API request body includes the 4-digit value (as a string, preserving leading zeros).
   - WHEN payment mode is not `EDC Machine`, THEN the field is not present in the API request body.

7. **Downstream availability**
   - The captured last-4-digits value is available in places where EDC transaction details are surfaced (transaction list/detail, receipt, audit) per existing patterns.

8. **Tests**
   - Vitest + React Testing Library tests cover: conditional rendering on payment-mode change, validation messages (empty, non-numeric, short), payload includes/excludes the field correctly, and OTP component is used (by role/label assertions).

9. **Quality gates**
   - `yarn lint`, `yarn type-check`, and `yarn fm:check` all pass; no new Sonar findings introduced.

## Open Questions

1. The description is truncated at "Ensure the value is availab…". Likely intent: "available in transaction details / reports / receipts". Confirm exact downstream surfaces that must display the last 4 digits (transaction list, detail view, receipt PDF, exports?).
2. **Exact API field name** — confirm with backend (e.g., `lastFourDigits` vs `cardLast4` vs `last4Digits`).
3. **Backend readiness** — is the payment-capture endpoint already accepting the new field, or does this story also require a coordinated backend change?
4. Is the existing OTP Input component already generic (`length` configurable), or must it be lightly refactored to support reuse for a non-OTP purpose?
5. Should the field be masked / displayed differently (e.g., `**** **** **** 1234`) in any read-only views?
6. Any locale/i18n keys to add for the new label and validation messages, or is hardcoded English acceptable for this story?

## Assumptions

- The payment capture screen and the payment-mode selector already exist; this story only adds a conditional field and payload key.
- The existing OTP Input component lives under `src/components/` (or equivalent) and can be reused — possibly with a minimal generalization of its props.
- The form on the payment capture screen uses one of the project's standard form libraries (Formik + Yup or react-hook-form + Zod); the new field will follow that same library.
- "EDC Machine" maps to a single, stable value in the existing payment-mode enum/constant (likely in `src/utils/constant`).
- Only the last 4 digits are ever entered/stored — full PAN, expiry, or CVV are never captured or transmitted.
- API payload key will be `lastFourDigits` (string) unless backend specifies otherwise.

## References (open only if needed)

- Context pack: `context-packs/story_analyzer.md` (this stage)
- Project context: `docs/ai/project-context.md`
- Context map: `docs/ai/context-map.json`
- HTTP entry points: `src/services/axiosInstance.ts`, `src/services/axiosInterceptors.ts`, `src/services/apiRoutes.ts`
- Payment modes / role constants: `src/utils/constant`
- Fallback story artifacts: `docs/ai/stories/PE-603/spec.md`, `docs/ai/stories/PE-603/implementation-plan.md`
