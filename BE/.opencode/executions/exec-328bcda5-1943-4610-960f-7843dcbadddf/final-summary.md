# PE-603 — AI Reviewer Final Summary

## Scope & Verdict
- Story: PE-603 — Store Card Last Four Digits in Voucher and Booking Payment Details.
- Cycle: Final pass after `ai_reviewer` cycle 1; `auto_fixer` did not run (handoff `missing: true`), so prior findings have not been addressed in the working tree.
- Verdict: Changes requested. The two must-fix structural findings from cycle 1 are still present.

## Files Reviewed (in scope)
- [src/modules/bookings/dto/update-booking.dto.ts](src/modules/bookings/dto/update-booking.dto.ts) — `BookingPaymentsDto` + new `BookingLastFourDigitsConstraint`.
- [src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts](src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts) — `VoucherPaymentsDto` + new `VoucherLastFourDigitsConstraint`.
- Spec/plan artifacts under [docs/ai/stories/PE-603/](docs/ai/stories/PE-603/) — SDLC pipeline outputs, expected per plan note; not scope creep.
- Pipeline artifacts under [.opencode/executions/exec-328bcda5-1943-4610-960f-7843dcbadddf/](.opencode/executions/exec-328bcda5-1943-4610-960f-7843dcbadddf/) — generated, not source changes.

No extra source files were modified outside the planned target DTOs.

## Findings

### R1 — Booking format check is silently skipped when `paymentMode !== OFFLINE` (must-fix, carried over)
File: [src/modules/bookings/dto/update-booking.dto.ts](src/modules/bookings/dto/update-booking.dto.ts) (around lines 594–598)

```594:606:src/modules/bookings/dto/update-booking.dto.ts
  @ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)
  @IsNotEmptyTrimmed()
  @IsObject()
  @Validate(BookingLastFourDigitsConstraint)
  paymentDetails?: {
    method?: PaymentMethodEnum;
    transactionNumber?: string;
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    lastFourDigits?: string;
```

`@Validate(BookingLastFourDigitsConstraint)` sits on `paymentDetails`, but `paymentDetails` is gated by `@ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)`. When `@ValidateIf` returns false, class-validator skips every validator on the property including `@Validate(...)`. Therefore a request with `paymentMode = GATEWAY` (or any non-OFFLINE mode) and `paymentDetails: { lastFourDigits: "abcd" }` (or `"12"`, `"12345"`) currently passes validation.

Spec (Booking section + AC #3) requires `lastFourDigits` to be format-checked regardless of `paymentMode` / `paymentDetails.method`. Move the constraint off the OFFLINE-gated `paymentDetails` property — either to a separate getter `get lastFourDigits()` (as originally outlined in the plan) or to a sibling virtual property without the `@ValidateIf` gate.

### R2 — Voucher format check is silently skipped when `paymentMode !== OFFLINE` (must-fix, carried over)
File: [src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts](src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts) (around lines 661–665)

```661:673:src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts
  @ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)
  @IsNotEmpty()
  @IsObject()
  @Validate(VoucherLastFourDigitsConstraint)
  paymentDetails?: {
    method?: PaymentMethodEnum;
    transactionNumber?: string;
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    lastFourDigits?: string;
```

Same root cause as R1. The required-on-OFFLINE-EDC branch still works (that branch fires only when `paymentMode === OFFLINE`, matching the gate), but the spec's broader rule — "When provided in any voucher payment context, it must satisfy `/^[0-9]{4}$/`" — does not. A payload with `paymentMode = GATEWAY` and `paymentDetails: { lastFourDigits: "12a4" }` is currently accepted.

Apply the same structural fix as R1. Keep the conditional-required logic inside `VoucherLastFourDigitsConstraint.validate` (it already distinguishes EDC+OFFLINE from format-only).

### R3 — `VoucherLastFourDigitsConstraint.defaultMessage` duplicates `validate()` logic (nit, optional)
File: [src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts](src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts) (lines 619–631)

`defaultMessage` recomputes `isEdcOffline` and `isMissing` exactly like `validate()`. Harmless today, but a drift risk if the rule set changes. Optional improvements: cache the failure reason on the constraint instance during `validate()` and read it in `defaultMessage()`, or extract a small private helper returning `{ isEdcOffline, isMissing }` used by both. Not blocking.

## Spec / Plan Conformance
- Inline `lastFourDigits?: string` correctly added in the EDC-fields cluster on both DTOs (after `accountNumber?: string`, before `// Cheque fields`). Matches Step 1 of the plan and spec Field Definition.
- Voucher required-on-OFFLINE-EDC behavior is implemented; message "Last four digits are required for EDC machine payments." matches spec verbatim.
- Format message "Last four digits must be exactly 4 numeric digits." matches spec verbatim in both DTOs.
- No new DTO classes, no `paymentDetails` extraction, no schema/migration changes, no service/controller edits. Matches Non-Goals.
- Open gap: format-check coverage when `paymentMode !== OFFLINE` (R1, R2). Once resolved, all acceptance criteria are met.

## Tests / Validation
- No spec/test files were added or modified in this diff. The plan's targeted command `npm run test -- --testPathPattern='(update-voucher-form|update-booking)\.dto'` does not appear to have been executed.
- After fixing R1/R2, add at minimum two negative-path cases per DTO that exercise non-OFFLINE mode with malformed `lastFourDigits` (e.g. `"abcd"`, `"12"`, `"12345"`), plus one positive non-OFFLINE case with a valid 4-digit value to prevent regressions.

## Scope Creep / Extra Files
- Spec and plan markdown under `docs/ai/stories/PE-603/` are SDLC-pipeline outputs, explicitly permitted by the implementation plan; not scope creep.
- Working-tree diff and review-pointers artifacts under `.opencode/executions/...` are generated execution metadata; not scope creep.
- No unrelated source files were touched.

## Required Actions Before Approval
1. Move the format check off the OFFLINE-gated `paymentDetails` for both DTOs so it runs irrespective of `paymentMode` (addresses R1 and R2).
2. Re-run the targeted Jest pattern from the plan and add the negative-path coverage described above.
3. R3 is optional; address only if convenient.

Findings: R1, R2, R3 (all carried over from cycle 1; R1 and R2 remain must-fix).
