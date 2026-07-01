# PE-603 — Implementation Plan

## Summary
Add an optional `lastFourDigits?: string` field inside the existing inline `paymentDetails` object literal on both `VoucherPaymentsDto` and `BookingPaymentsDto`, and enforce the validation rules from the spec (voucher: required when `paymentMode === OFFLINE` AND `paymentDetails.method === EDC_MACHINE`; booking: optional; both: when present, must match `/^[0-9]{4}$/`). No new DTO classes, no schema/migration changes, no service or persistence-layer changes — `paymentDetails` continues to round-trip as JSON.

## Target Files
- `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts` (edit `VoucherPaymentsDto` only)
- `src/modules/bookings/dto/update-booking.dto.ts` (edit `BookingPaymentsDto` only)

No other source files are expected to change. No new files are created in `src/` for this story. (Spec/plan artifacts under `docs/ai/stories/PE-603/` are written by the SDLC pipeline, not by the implementer.)

## Context Budget
- Inspect target files first. Do not perform broad repo scans.
- Open non-target files only when strictly needed: imports already referenced inside the target DTOs (`src/enums/payment-status.enum.ts`, `src/validations/common-validator/isNotEmptyTrimmed.validator.ts`), the e2e/unit test bootstrapping if extending tests, and `package.json` only to confirm scripts already listed in the context map.
- Use provider-native edit tools to apply localized edits. Do not print full file contents, full diffs, or large code blocks in chat.
- Run only the validation commands listed below — scoped to the changed surface (build + lint + targeted tests). Do not run the full e2e suite unless required by a regression you actually introduced.

## Existing Code Anchors (verified)
- `VoucherPaymentsDto.paymentDetails` is declared around lines 622–643 of `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts`, guarded by:
  - `@ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)`
  - `@IsNotEmpty()` and `@IsObject()`
  - Inline shape currently lists: `method`, `transactionNumber`, `bankName`, `branchName`, `accountNumber`, `chequeNumber`, `drawnOn`, `upiId`, `cardType`, `transferType`, `fromAccount`, `remarks`.
- `BookingPaymentsDto.paymentDetails` is declared around lines 574–595 of `src/modules/bookings/dto/update-booking.dto.ts`, with the same inline shape and the same `@ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE) @IsNotEmpty() @IsObject()` decorator stack.
- Imports already include `Matches`, `ValidateIf`, `IsNotEmpty` / `IsNotEmptyTrimmed`, and `PaymentMethodEnum` / `PaymentModeEnum` in both files — no new imports are required.

## Implementation Steps

### Step 1 — Extend the inline `paymentDetails` type on both DTOs
In each target DTO, add `lastFourDigits?: string;` to the inline `paymentDetails` object-literal type, grouped with the EDC machine fields (just after `accountNumber?: string;` and before the `// Cheque fields` comment) so the EDC-related fields stay co-located.

- File: `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts` → `VoucherPaymentsDto.paymentDetails`
- File: `src/modules/bookings/dto/update-booking.dto.ts` → `BookingPaymentsDto.paymentDetails`

Do not add `@ValidateNested()`, do not extract a class, do not rename existing properties.

### Step 2 — Add validation on `VoucherPaymentsDto` (conditional-required + format)
Immediately after the `paymentDetails` property in `VoucherPaymentsDto`, add a sibling validated getter that proxies `paymentDetails?.lastFourDigits`. This keeps the JSON persistence path untouched while letting class-validator evaluate the rules at the parent-DTO level.

Recommended decorator stack (apply in this order, matching the project's existing style which already imports `ValidateIf`, `IsNotEmpty`, `Matches`):

- `@ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE && o.paymentDetails?.method === PaymentMethodEnum.EDC_MACHINE)` — only enforce required when both conditions hold.
- `@IsNotEmpty({ message: 'Last four digits are required for EDC machine payments.' })` — required for the EDC+OFFLINE case.
- `@Matches(/^[0-9]{4}$/, { message: 'Last four digits must be exactly 4 numeric digits.' })` — format constraint.

Implementation pattern (TypeScript getter; class-validator reads via the property name):

```typescript
get lastFourDigits(): string | undefined {
  return this.paymentDetails?.lastFourDigits;
}
```

Place the decorators directly above this getter. The getter is intentionally read-only: client input arrives inside `paymentDetails.lastFourDigits` and persistence reads from there too. Do not add a setter and do not declare a separate stored property to avoid conflicting with `paymentDetails` JSON storage.

If the implementer prefers an equivalent class-validator construct (e.g. a tiny custom `@Validate(...)` constraint on `paymentDetails` itself, or a `@ValidateIf` + `@Matches` chain on a virtual property) that meets the same acceptance criteria, that is acceptable as long as: (a) no new exported class is introduced for `paymentDetails`, (b) the inline `lastFourDigits?: string` type from Step 1 is still added, and (c) JSON persistence is unchanged.

### Step 3 — Add validation on `BookingPaymentsDto` (optional + format)
Immediately after the `paymentDetails` property in `BookingPaymentsDto`, add the same getter pattern as Step 2, but with optional semantics:

- `@ValidateIf((o) => o.paymentDetails?.lastFourDigits !== undefined && o.paymentDetails?.lastFourDigits !== null && o.paymentDetails?.lastFourDigits !== '')` — only run the format check when the client actually provided a value (preserves the optional contract).
- `@Matches(/^[0-9]{4}$/, { message: 'Last four digits must be exactly 4 numeric digits.' })` — format constraint when present.

Do not add `@IsNotEmpty()` here. Omission must continue to validate exactly as today.

### Step 4 — Preserve persistence & service paths
- Confirm by inspection (do not edit) that any voucher/booking service layer treats `paymentDetails` as an opaque JSON object before writing. The existing flow already persists arbitrary keys inside the JSON column; `lastFourDigits` will round-trip automatically. No service / repository / entity edits are needed.
- Do not add migrations. Do not change column types. Do not touch swagger/openapi generators unless they fail to compile (they should not — the inline shape change is additive and optional).

### Step 5 — Tests (only if a test surface exists; otherwise note as gap)
- If unit specs for these DTOs exist (look for `update-voucher-form.dto.spec.ts` and `update-booking.dto.spec.ts` colocated with the DTOs, or under `test/`), extend them with the validation cases listed in the spec's Test Plan. If they do not exist, do NOT create new spec files for this story unless explicitly required by repo conventions — instead, add the unit cases to the nearest existing spec for the same module if any, or document the gap in the PR description.
- For e2e: do not add new e2e suites for this minimal change; rely on existing booking/voucher payment e2e flow if it already exercises the offline EDC code path.

Test scenarios to cover (per spec):
- Voucher OFFLINE + EDC_MACHINE with `lastFourDigits = "1234"` → passes.
- Voucher OFFLINE + EDC_MACHINE without `lastFourDigits` → fails with the "required" message.
- Voucher OFFLINE + EDC_MACHINE with `"12a4"`, `"123"`, `"12345"`, `""` → fails with the format message.
- Voucher OFFLINE + non-EDC method without `lastFourDigits` → passes.
- Voucher GATEWAY mode without `lastFourDigits` → passes.
- Booking without `lastFourDigits` → passes.
- Booking with `lastFourDigits = "1234"` → passes.
- Booking with `"abcd"`, `"12"`, `"12345"` → fails with the format message.

## Validation Commands
Run only what the changed surface requires:

- `npm run lint` — must report no new errors on the two target DTO files.
- `npm run build` — must succeed (verifies TypeScript inline-shape additions and decorator imports already covered).
- `npm run test -- --testPathPattern='(update-voucher-form|update-booking)\.dto'` — run only DTO-scoped specs if/when they exist (skip silently if no matching specs).
- Skip `npm run test:e2e` unless a regression is suspected; the change is additive and conditionally validated.

## Risks & Mitigations
- **Getter visibility under `class-transformer`**: `plainToInstance` does not populate getters from the request body, but class-validator still evaluates the decorators on the getter when it iterates declared metadata. If the implementer hits a runtime issue where the getter-based validator does not fire, fall back to the equivalent custom `@Validate(...)` constraint on `paymentDetails` (validates `value?.lastFourDigits` against the regex and conditional-required rule). Acceptance criteria are unchanged.
- **Whitelist/forbidNonWhitelisted in the global ValidationPipe**: if the pipe is configured to strip unknown fields, the new inline `lastFourDigits?` typing will not be enough on its own — the validator must declare it. The decorator stack added in Steps 2/3 ensures class-validator knows about the property. Verify by inspecting `main.ts` only if a stripped-field bug surfaces.
- **Message wording divergence**: existing DTOs use inline literal messages. Keep the wording from the spec (`"Last four digits are required for EDC machine payments."`, `"Last four digits must be exactly 4 numeric digits."`) verbatim to avoid downstream contract drift.
- **Booking DTO uses `@IsNotEmptyTrimmed()` instead of `@IsNotEmpty()` elsewhere**: do not switch the conditional-required decorator semantics. For `BookingPaymentsDto.lastFourDigits` we do not require non-empty; we only validate format when provided.
- **No PII / masking handling** is included, matching the spec's non-goals. If compliance flags this later, treat as a follow-up story.

## Assumptions
- Service/controller layers persist `paymentDetails` as an opaque JSON payload (consistent with the spec's "existing JSON persistence flow" directive). Implementer should not refactor service code as part of this story.
- No swagger DTO regeneration step is required (the change is additive and optional, and existing decorators do not include `@ApiProperty` for the inline `paymentDetails` shape).
- `PaymentMethodEnum.EDC_MACHINE` and `PaymentModeEnum.OFFLINE` exist as named imports already used in both target files; no enum changes are needed.
- The story description was truncated at "No database schema ch…"; this plan adopts the spec's resolution that the full clause is "No database schema changes are introduced."

## Out of Scope (do not implement)
- Extracting `paymentDetails` into a dedicated DTO class.
- New endpoints, new controllers, new services.
- DB migrations, column changes, indexes.
- PII masking, logging filters, audit trails.
- Report/PDF/email template changes that surface `lastFourDigits`.
- Changes to `PaymentDetailsDto` (the wrapper that holds `payments: VoucherPaymentsDto[] | BookingPaymentsDto[]`) — it does not own this field.
