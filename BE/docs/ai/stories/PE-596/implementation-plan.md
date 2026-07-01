# PE-596 Implementation Plan — Update Applicant Info Flow Voucher Bookkeeping

## Summary
Extend `VoucherFormsService.updateVoucherFormApplicant()` so that when the request payload sets `isApplicantsUpdated === true`, the corresponding `vouchers` row (`VoucherForm` entity) is updated with `isApplicantsUpdated = true` and `applicantsUpdatedAt = new Date()` inside the **same transaction** as the applicant update. Add the two new columns to the `VoucherForm` entity plus a TypeORM migration, and add the optional flag to the two applicant DTOs.

The "Voucher" entity in the spec maps to the existing `VoucherForm` entity (TypeORM `@Entity('vouchers')`) at `src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity.ts`.

## Target Files

Create:
- `src/migrations/<timestamp>-AddIsApplicantsUpdatedToVouchers.ts` — TypeORM migration adding `is_applicants_updated` and `applicants_updated_at` to `vouchers` (only if not present). Generate via `npm run migration:create -- src/migrations/AddIsApplicantsUpdatedToVouchers`.

Edit:
- `src/modules/eoi_manager/voucher_forms/entities/voucher_form.entity.ts` — add two new `@Column` properties (`isApplicantsUpdated`, `applicantsUpdatedAt`).
- `src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto.ts` — add optional `isApplicantsUpdated?: boolean` to both `ApplicantDto` (≈line 478) and `ThirdFourthApplicantDto` (≈line 817).
- `src/modules/eoi_manager/voucher_forms/voucher_form.service.ts` — refactor `updateVoucherFormApplicant()` (≈lines 556–624) to wrap the existing applicant update plus the new conditional voucher update inside `this.voucherFormRepository.manager.transaction(async (manager) => { ... })`; strip `isApplicantsUpdated` from `cleanedApplicantDto` before merging into the JSON applicant column.
- `src/modules/eoi_manager/voucher_forms/voucher_form.controller.spec.ts` — extend `updateApplicant` describe-block to assert the controller passes the flag through unchanged (DTO-level test only; service logic is mocked here).

Create (recommended, not pre-existing):
- `src/modules/eoi_manager/voucher_forms/voucher_form.service.spec.ts` — new unit spec covering the five scenarios in "Testing Notes" using mocked repository + a stubbed `manager.transaction` that runs the callback with a mocked `EntityManager`.

## Context Budget
- Inspect target files first; do not run broad repo scans or open unrelated modules.
- Open non-target files only for: direct imports referenced by the edits (`typeorm`, `class-validator`), the `MigrationInterface` shape (already mirrored by neighboring migrations such as `1772025856442-AddIsChangeRequestPendingToVouchers.ts`), and the `VoucherFormsService` constructor injections already in scope.
- Use the editor's native edit tool for changes; do NOT print full file contents, full diffs, or large code blocks in chat.
- Run only the validation commands needed for the changed surface (lint, build, the two affected unit specs, and the migration up/down round-trip on a local DB).
- Do not open generated, dependency, build, or `.opencode/executions/` artifacts.

## Implementation Steps

### 1. Database migration (`src/migrations/<timestamp>-AddIsApplicantsUpdatedToVouchers.ts`)
- Generate with `npm run migration:create -- src/migrations/AddIsApplicantsUpdatedToVouchers`.
- In `up()`:
  - Use `queryRunner.hasColumn('vouchers', 'is_applicants_updated')` and `hasColumn('vouchers', 'applicants_updated_at')` guards so the migration is idempotent (spec: "only if they do not already exist").
  - When missing, run raw SQL consistent with the file shown in `1772025856442-AddIsChangeRequestPendingToVouchers.ts`:
    - `ALTER TABLE vouchers ADD COLUMN is_applicants_updated BOOLEAN NOT NULL DEFAULT FALSE`
    - `ALTER TABLE vouchers ADD COLUMN applicants_updated_at TIMESTAMP NULL DEFAULT NULL`
  - The `NOT NULL DEFAULT FALSE` covers existing rows safely.
- In `down()`: drop only the columns this migration added (guard each with `hasColumn` so revert is safe even if a prior environment partially applied it).

### 2. Entity update (`voucher_form.entity.ts`)
- Add (alongside `isChangeRequestPending`):
  ```ts
  @Column({ name: 'is_applicants_updated', type: 'boolean', default: false })
  isApplicantsUpdated: boolean;

  @Column({ name: 'applicants_updated_at', type: 'timestamp', nullable: true, default: null })
  applicantsUpdatedAt: Date | null;
  ```
- Keep ordering consistent with surrounding boolean/timestamp columns (e.g., near `customerLastUpdatedAt`).

### 3. DTO update (`dto/update-voucher-form.dto.ts`)
- Reuse the existing `IsBoolean`, `IsOptional`, `Type` imports already present in this file.
- In `ApplicantDto` (after `lastStep`, before `gstNumber`) and in `ThirdFourthApplicantDto` (after `lastStep`, before `gstNumber`), add:
  ```ts
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isApplicantsUpdated?: boolean;
  ```
- Do not gate it behind `saveForLater`; the flag must be honored independent of save-for-later semantics.

### 4. Service update (`voucher_form.service.ts → updateVoucherFormApplicant`)
- Keep the public signature `updateVoucherFormApplicant(voucherId, applicantDto)` unchanged.
- Modify the body so:
  1. `getVoucherFormByVoucherId(voucherId)` continues to provide the loaded `voucherForm` (this already throws `NotFoundException` and satisfies the existence precondition referenced by the spec).
  2. Compute the existing same-address normalization, `attachFullAddress`, `cleanedApplicantDto`, and `updateData` exactly as today.
  3. **Strip the new field before merging into the applicant JSON column**: when destructuring `applicantDto`, pull out `isApplicantsUpdated` so it does NOT leak into `cleanedApplicantDto`/`applicantN`. Example:
     ```ts
     const { lastStep, applicantNumber, isApplicantsUpdated, ...cleanedApplicantDto } = applicantDto;
     delete cleanedApplicantDto.saveForLater;
     ```
  4. Wrap the persistence with the same pattern already used by `updatePaymentDetails` (≈line 942):
     ```ts
     await this.voucherFormRepository.manager.transaction(async (manager) => {
       await manager.update(VoucherForm, { voucherId }, updateData);

       if (isApplicantsUpdated === true) {
         const result = await manager.update(
           VoucherForm,
           { voucherId, isDeleted: false },
           { isApplicantsUpdated: true, applicantsUpdatedAt: new Date() },
         );
         if (!result.affected) {
           throw new NotFoundException('Voucher form not found');
         }
       }
     });
     ```
  5. Keep `refreshCacheToken(voucherForm.userVoucherTrackingId)` call **after** the transaction commits (cache should not refresh on rollback).
  6. Preserve the existing `try/catch → logger.error → throw` envelope so `success-response-errors` behavior and the existing return shape (`{ message, data: updateData }`) stay identical.
- Use server-side `new Date()` (matches the existing `customerLastUpdatedAt` pattern in the same method and resolves Open Question 5 with the module convention).
- Strict equality (`=== true`) per AC #2.

### 5. Tests
Controller spec (`voucher_form.controller.spec.ts`):
- Extend the `updateApplicant` describe block: pass `applicantDto` with `isApplicantsUpdated: true` and assert the service mock receives the same DTO untouched. Existing assertions remain.

New service spec (`voucher_form.service.spec.ts`):
- Build a `Test.createTestingModule` providing mocked `getRepositoryToken(VoucherForm)`, `getRepositoryToken(EoiCampaign)`, `getRepositoryToken(VoucherUnitMapping)`, `getRepositoryToken(VoucherUnitBlocking)`, `getRepositoryToken(Users)`, `CACHE_MANAGER`, and `EventEmitter2`.
- Mock `voucherFormRepository.manager.transaction` to immediately invoke its callback with a `manager` stub exposing `update`.
- Stub `getVoucherFormByVoucherId` (e.g., via `jest.spyOn`) to return `{ data: { voucherId, applicant1: {}, noOfApplicants: 1, voucherFormStatus: VoucherFormStatusEnum.IN_PROGRESS, userVoucherTrackingId: 't1' } }`.
- Cover the five scenarios:
  1. `isApplicantsUpdated` omitted → exactly one `manager.update` call (applicant); no voucher flag mutation.
  2. `isApplicantsUpdated === false` → same as (1).
  3. `isApplicantsUpdated === true` → two `manager.update` calls; the second sets `{ isApplicantsUpdated: true, applicantsUpdatedAt: any Date }`.
  4. Voucher row missing during the flag update (mock second `manager.update` to resolve `{ affected: 0 }`) → `NotFoundException` thrown; verify `refreshCacheToken` not invoked.
  5. Failure thrown inside the transaction callback → exception propagates; verify `refreshCacheToken` not invoked.
- Also assert `cleanedApplicantDto` written into the applicant JSON does NOT contain `isApplicantsUpdated` (confirms the strip).

## Validation Commands
Run only what the changed surface needs:
- `npm run lint`
- `npm run build`
- `npm run test -- src/modules/eoi_manager/voucher_forms` (covers controller + new service spec)
- Migration round-trip on a local DB:
  - `npm run migration:run`
  - `npm run migration:revert`
- Optional, if e2e exists for this module: `npm run test:e2e` scoped to the voucher-form suite.

## Risks
- **Atomicity regression**: today the applicant write is a single `repository.update`; wrapping it in a transaction changes commit boundaries. Mitigation: move all existing `await this.voucherFormRepository.update(...)` into the new `manager.update` call inside the transaction, and keep `refreshCacheToken` outside the transaction.
- **JSON column pollution**: `isApplicantsUpdated` is also a future first-class column on the entity. Failing to strip it from `cleanedApplicantDto` would persist a duplicate inside `applicantN` JSON. Mitigation: explicit destructuring as shown.
- **Migration on existing populated `vouchers` table**: requires the `NOT NULL DEFAULT FALSE` to add cleanly to existing rows. The `hasColumn` guard keeps the migration idempotent across environments where it may already have been applied.
- **DTO union typing**: the controller body accepts `ApplicantDto | ThirdFourthApplicantDto`; both DTOs must declare the field so `applicantDto.isApplicantsUpdated` type-checks without casts.
- **Backward compatibility**: omitting the flag must keep behavior identical (no extra DB write, same response shape). Tests scenario 1 protects this.

## Assumptions
- The "Voucher" entity referenced in the spec is `VoucherForm` (`@Entity('vouchers')`); no separate `Voucher` entity exists in this module (confirmed by inspection).
- The identifier used for the voucher existence check is `voucherId` (string), already used by `updateVoucherFormApplicant()` and `getVoucherFormByVoucherId()` (resolves Open Question 4).
- Timestamp source is application-side `new Date()` to match the sibling `customerLastUpdatedAt` convention in the same method (resolves Open Question 5).
- `applicantsUpdatedAt` is overwritten on every successful flagged update, not only on first transition (resolves Open Question 2).
- This endpoint never sets `isApplicantsUpdated` back to `false` (resolves Open Question 3); the column may still be reset later via separate flows out of scope here.
- TypeORM is the ORM (per `migration:create`/`migration:run`/`migration:revert` in `docs/ai/context-map.json`) and migrations follow the raw-SQL `ALTER TABLE` convention used by neighboring files.
- No new module providers, repositories, or DI changes are required; the existing `voucherFormRepository.manager` is the transactional entry point.
