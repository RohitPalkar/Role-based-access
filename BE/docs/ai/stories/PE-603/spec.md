# PE-603 — Store Card Last Four Digits in Voucher and Booking Payment Details

## Summary
Add an optional `lastFourDigits` field to the existing offline `paymentDetails` JSON payload used by both the voucher payments DTO and the booking payments DTO. This field captures the last 4 digits of the card used on an offline EDC machine. The change must be minimal: no new DTO hierarchies, no refactor of the existing inline `paymentDetails` shape, and no database schema changes — the existing JSON persistence flow is reused.

## Context
- Story Key: PE-603
- Repository role: backend-api-only (NestJS)
- Files explicitly referenced as additional context:
  - `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts` (contains `VoucherPaymentsDto`)
  - `src/modules/bookings/dto/update-booking.dto.ts` (contains `BookingPaymentsDto`)
- Both DTOs already define `paymentDetails` as an inline `@IsObject()` JSON with EDC machine, cheque, UPI, online transfer, and common fields. `lastFourDigits` is a new EDC-machine-related optional property on this same inline shape.
- Enums in scope (from `src/enums/payment-status.enum`): `PaymentModeEnum.OFFLINE`, `PaymentMethodEnum.EDC_MACHINE`.

## Goals / Non-Goals

### Goals
- Allow the API to accept and persist `lastFourDigits` as part of `paymentDetails` for voucher and booking payments.
- Enforce conditional/required validation rules per DTO with a strict 4-digit numeric format (`/^[0-9]{4}$/`).
- Keep the change minimal: extend existing inline `paymentDetails` typings and add validation only where required.

### Non-Goals
- No new DTO classes, no class extraction for `paymentDetails`, no inheritance refactor.
- No changes to database tables, columns, indexes, or migrations — `paymentDetails` continues to be persisted as JSON.
- No changes to existing payment business logic, gateways, or transaction status flows.
- No PII redaction/masking work beyond storing the last 4 digits already provided by the client.

## Functional Requirements

### Field Definition (both DTOs)
- Add `lastFourDigits?: string` as an optional property within the inline `paymentDetails` object literal type on both `VoucherPaymentsDto` and `BookingPaymentsDto`.
- Group it logically with the existing EDC Machine fields (e.g. near `transactionNumber`, `bankName`, `branchName`, `accountNumber`, `cardType`).
- Format constraint: exactly 4 numeric digits, regex `/^[0-9]{4}$/`. No spaces, dashes, or non-digit characters.

### VoucherPaymentsDto (voucher_forms — `update-voucher-form.dto.ts`)
- `lastFourDigits` is **required** when both:
  - `paymentMode === PaymentModeEnum.OFFLINE`, AND
  - `paymentDetails.method === PaymentMethodEnum.EDC_MACHINE`.
- When required and missing/empty, the request must fail validation with a clear message (e.g. "Last four digits are required for EDC machine payments.").
- When provided in any voucher payment context, it must satisfy `/^[0-9]{4}$/`. Values that do not match must be rejected with a clear message (e.g. "Last four digits must be exactly 4 numeric digits.").
- For non-OFFLINE modes or non-EDC methods, `lastFourDigits` is not required; if absent it must not block validation.

### BookingPaymentsDto (bookings — `update-booking.dto.ts`)
- `lastFourDigits` is **always optional**, regardless of `paymentMode` or `paymentDetails.method`.
- If provided, it must satisfy `/^[0-9]{4}$/`; otherwise it must be rejected with a clear message (e.g. "Last four digits must be exactly 4 numeric digits.").
- If omitted, the request must validate exactly as it does today.

### Persistence
- `lastFourDigits` is persisted as part of the existing `paymentDetails` JSON column/payload on the relevant payment records. No new columns, tables, or migrations are introduced.
- Round-tripping the value (write then read) must return the same 4-digit string the client submitted.

### API Surface
- No new endpoints. The existing voucher and booking update/payment endpoints that already accept these DTOs continue to be the only entry points.
- Response envelope (`success-response-errors`) and global API prefix (`api`, `api/{NODE_ENV}` non-prod) are unchanged.

## Validation Approach (Implementation Notes)
The existing `paymentDetails` is declared as an inline object type guarded by `@IsObject()` and `@ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)`. Because `paymentDetails` is not a `@ValidateNested()` class instance, additional rules for `lastFourDigits` should be applied at the parent DTO level using class-validator decorators that read from `paymentDetails`. Recommended low-risk patterns:

- **VoucherPaymentsDto**: add a sibling validated property (or `@ValidateIf` + `@Matches` chain) that:
  - triggers only when `paymentMode === OFFLINE` and `paymentDetails?.method === EDC_MACHINE`,
  - is `@IsNotEmpty()` for that case,
  - and applies `@Matches(/^[0-9]{4}$/)` to `paymentDetails?.lastFourDigits`.
- **BookingPaymentsDto**: add `@ValidateIf((o) => o.paymentDetails?.lastFourDigits !== undefined && o.paymentDetails?.lastFourDigits !== null && o.paymentDetails?.lastFourDigits !== '')` plus `@Matches(/^[0-9]{4}$/)`.

The implementer may also choose any equivalent class-validator construct (e.g. a small custom validator) as long as it does not introduce a new exported class for `paymentDetails` and does not change the existing JSON persistence path. The TypeScript inline shape on both DTOs must include `lastFourDigits?: string` regardless of the validation mechanism chosen.

## Acceptance Criteria

1. The TypeScript inline `paymentDetails` shape on both `VoucherPaymentsDto` (`src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts`) and `BookingPaymentsDto` (`src/modules/bookings/dto/update-booking.dto.ts`) includes `lastFourDigits?: string`.
2. For `VoucherPaymentsDto`:
   - A request with `paymentMode = OFFLINE` and `paymentDetails.method = EDC_MACHINE` and a missing or empty `lastFourDigits` is rejected with HTTP 400 and an actionable validation message.
   - A request with the same combination and `lastFourDigits` not matching `/^[0-9]{4}$/` (e.g. `"12a4"`, `"123"`, `"12345"`, `"12 34"`) is rejected with HTTP 400.
   - A request with the same combination and `lastFourDigits = "1234"` passes validation and the value is persisted in `paymentDetails`.
   - A request with `paymentMode = OFFLINE` and a non-EDC `method` (e.g. CHEQUE/UPI/ONLINE_TRANSFER) is not required to include `lastFourDigits` and validates as before.
   - A request with `paymentMode != OFFLINE` is not required to include `lastFourDigits` and validates as before.
3. For `BookingPaymentsDto`:
   - Omitting `lastFourDigits` validates and persists exactly as before this change.
   - Providing `lastFourDigits = "1234"` validates successfully and is persisted in `paymentDetails`.
   - Providing a non-conforming `lastFourDigits` (e.g. `"abcd"`, `"12"`, `"12345"`) is rejected with HTTP 400 and an actionable validation message.
4. No new DTO classes are introduced for `paymentDetails`, and the existing inline structure is preserved.
5. No database migration is added or required; reads/writes flow through the existing JSON `paymentDetails` persistence.
6. Existing voucher and booking payment flows continue to work unchanged for all other fields and payment modes (no regressions).
7. `npm run build` succeeds and `npm run lint` reports no new errors introduced by this change.

## Test Plan

### Unit / DTO validation
- Add or extend tests that pipe sample payloads through class-validator for both DTOs covering:
  - Voucher: OFFLINE + EDC_MACHINE with valid `lastFourDigits` (passes).
  - Voucher: OFFLINE + EDC_MACHINE with missing `lastFourDigits` (fails).
  - Voucher: OFFLINE + EDC_MACHINE with invalid formats (`"12a4"`, `"123"`, `"12345"`, `""`) (fails).
  - Voucher: OFFLINE + non-EDC method without `lastFourDigits` (passes).
  - Voucher: GATEWAY mode without `lastFourDigits` (passes).
  - Booking: payload without `lastFourDigits` (passes).
  - Booking: payload with valid `lastFourDigits = "1234"` (passes).
  - Booking: payload with invalid `lastFourDigits` (fails).

### Integration / persistence
- Submit a voucher payment via the existing endpoint with `lastFourDigits = "1234"` and confirm the value is stored inside `paymentDetails` JSON and returned on subsequent reads.
- Submit a booking payment via the existing endpoint with `lastFourDigits = "1234"` and confirm round-trip persistence.
- Confirm absence of any new migration files and that `paymentDetails` column shape is unchanged.

## Open Questions / Assumptions

- **Assumption**: The story description was truncated in the provided context pack at "No database schema ch…"; based on the explicit "No database schema changes" intent and the directive to reuse the existing `paymentDetails` JSON persistence flow, this spec assumes the full clause reads as "No database schema changes are introduced." If a later phase reveals additional persistence requirements in the truncated text, this spec should be revisited.
- **Assumption**: `lastFourDigits` is captured on the existing offline `paymentDetails` for any payment mode where the client chooses to provide it (per booking DTO rule), but is only mandated for voucher OFFLINE + EDC_MACHINE per the story.
- **Assumption**: No masking, encryption, audit, or PII handling beyond what the existing `paymentDetails` storage already does. If compliance requires masking the last 4 digits in logs, that is out of scope for this story.
- **Open Question**: Should the validation message wording be localized or pulled from a shared constants file? Current existing validators in these DTOs use inline literal messages, so this spec follows that convention.
- **Open Question**: Does any downstream report or document template (PDF/email) need to surface `lastFourDigits`? Not in scope per the story; flag for product if requested later.

## References
- `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts` — `VoucherPaymentsDto.paymentDetails` (inline object) is the target for the voucher-side change.
- `src/modules/bookings/dto/update-booking.dto.ts` — `BookingPaymentsDto.paymentDetails` (inline object) is the target for the booking-side change.
- `src/enums/payment-status.enum` — source of `PaymentModeEnum.OFFLINE` and `PaymentMethodEnum.EDC_MACHINE`.
- Project conventions: `docs/ai/project-context.md`, `docs/ai/context-map.json` (open only if implementation planning needs deeper context).
```
