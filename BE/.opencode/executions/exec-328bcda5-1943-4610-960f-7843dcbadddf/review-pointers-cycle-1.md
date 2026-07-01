# PE-603 — Review Pointers (Cycle 1)

## Scope Reviewed
- `src/modules/bookings/dto/update-booking.dto.ts` (BookingPaymentsDto + new `BookingLastFourDigitsConstraint`)
- `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts` (VoucherPaymentsDto + new `VoucherLastFourDigitsConstraint`)
- Spec: `docs/ai/stories/PE-603/spec.md`
- Plan: `docs/ai/stories/PE-603/implementation-plan.md`
- Extra non-source changes are the SDLC-pipeline artifacts (`spec.md`, `implementation-plan.md`) under `docs/ai/stories/PE-603/` — expected per plan note "Spec/plan artifacts under docs/ai/stories/PE-603/ are written by the SDLC pipeline, not by the implementer." No scope creep.

The implementer chose the `@Validate(...)` custom-constraint variant over the getter pattern in the plan. The plan explicitly permits this ("a tiny custom `@Validate(...)` constraint on `paymentDetails` itself ... is acceptable as long as ..."), so the extra class-validator imports (`Validate`, `ValidationArguments`, `ValidatorConstraint`, `ValidatorConstraintInterface`) are justified.

## Findings

### R1 — Booking format check is silently skipped when `paymentMode !== OFFLINE` (must-fix)
File: `src/modules/bookings/dto/update-booking.dto.ts` (BookingPaymentsDto.paymentDetails, around lines 595–598)

The new `@Validate(BookingLastFourDigitsConstraint)` is placed on `paymentDetails`, but `paymentDetails` is gated by `@ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)`. When `@ValidateIf` returns false, class-validator skips every validator on that property — including `@Validate(...)`. As a result, a request with `paymentMode = GATEWAY` and `paymentDetails: { lastFourDigits: "abcd" }` (or `"12"`, `"12345"`) currently passes validation.

Spec requires (BookingPaymentsDto section + Acceptance Criteria #3):
- `lastFourDigits` is "always optional, regardless of `paymentMode` or `paymentDetails.method`".
- "Providing a non-conforming `lastFourDigits` ... is rejected with HTTP 400 and an actionable validation message."

Suggested fix: do not piggy-back the format check on the OFFLINE-gated `paymentDetails`. Either
- attach the constraint to a separate virtual property that is not behind `@ValidateIf((o) => o.paymentMode === OFFLINE)` (e.g. a getter `get lastFourDigits()` decorated with the constraint as originally outlined in the plan), or
- attach `@Validate(BookingLastFourDigitsConstraint)` to a sibling property (or to the class via `@ValidatorConstraint` registered at class level) so it executes irrespective of `paymentMode`.

### R2 — Voucher format check is also silently skipped when `paymentMode !== OFFLINE` (must-fix)
File: `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts` (VoucherPaymentsDto.paymentDetails, around lines 662–665)

Same root cause as R1: `@Validate(VoucherLastFourDigitsConstraint)` is gated by `@ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)`. The required+EDC branch still works (because that branch only fires when `paymentMode === OFFLINE`, which is the same gate), but the spec's broader format rule does not:

- Spec, VoucherPaymentsDto bullet 2: "When provided in any voucher payment context, it must satisfy `/^[0-9]{4}$/`."

Under the current code, a payload with `paymentMode = GATEWAY` and `paymentDetails: { lastFourDigits: "12a4" }` is accepted. Apply the same structural fix proposed in R1 (move the constraint off the OFFLINE-gated `paymentDetails` property). Keep the conditional-required check inside the constraint as it is today — it already correctly distinguishes the EDC+OFFLINE case from the format-only case.

### R3 — `VoucherLastFourDigitsConstraint.defaultMessage` duplicates `validate()` logic (nit, optional)
File: `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts` (lines 619–631)

`defaultMessage` recomputes `isEdcOffline` and `isMissing` from `args.object` exactly the same way as `validate()`. This is harmless today but is a drift risk if the rule set ever changes (the two methods must be kept in sync). Consider either
- caching the failure reason on the constraint instance during `validate()` and reading it in `defaultMessage()`, or
- extracting a small private helper that returns `{ isEdcOffline, isMissing }` and reusing it in both methods.

Not blocking; mention is for maintainability only.

## Spec / Plan Conformance Summary
- Inline `lastFourDigits?: string` added to both DTOs in the correct EDC-fields cluster (just after `accountNumber?: string;`, before `// Cheque fields`). Matches Step 1 of the plan and spec Field Definition.
- Voucher required-on-OFFLINE-EDC behavior is implemented inside `VoucherLastFourDigitsConstraint.validate` and produces the spec-mandated message "Last four digits are required for EDC machine payments." Verified.
- Format message "Last four digits must be exactly 4 numeric digits." matches spec wording verbatim in both DTOs.
- No new DTO classes for `paymentDetails`, no schema/migration changes, no service/controller edits. Matches Non-Goals and Out of Scope.
- Open gap: format-check coverage for non-OFFLINE modes (R1, R2). Once those are resolved, all acceptance criteria are met.

## Tests / Validation Notes (not blocking, but worth confirming)
- The plan's test-pattern (`npm run test -- --testPathPattern='(update-voucher-form|update-booking)\.dto'`) does not appear to have been run / extended (no spec file additions in the diff). Confirm whether existing specs exist for these DTOs; if not, the implementer's gap-note in the PR description is acceptable per Step 5 of the plan.
- After fixing R1/R2, add at minimum two negative-path cases that exercise non-OFFLINE mode with malformed `lastFourDigits` for both DTOs.
