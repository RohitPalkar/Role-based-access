# PE-596 — Cx Page: Update Applicant Info Flow for Unit Allotment & Launch Journeys

## Summary
Extend the existing "update applicants" flow on the Cx page so that, when the caller signals that applicants were actually updated, the associated Voucher record is also flagged accordingly within the same database transaction. This adds a new optional flag to the request DTO and two new columns on the Voucher entity to track whether and when applicants were last updated for a voucher.

## Background / Context
- Module: `src/modules/eoi_manager/voucher_forms`
- Primary entry point: `VoucherFormService.updateVoucherFormApplicant()` in `src/modules/eoi_manager/voucher_forms/voucher_form.service.ts`
- Applies to the Unit Allotment and Launch journeys driven from the Cx page.
- The existing flow already performs applicant updates inside a transaction; voucher-side bookkeeping for "applicants updated" is currently missing.

## Scope

### In Scope
- Request DTO change for `updateVoucherFormApplicant` (or the corresponding controller DTO it consumes) to accept a new optional flag.
- Voucher entity + DB migration: add two new columns.
- Service-layer change to conditionally update the voucher within the existing transaction.
- Preserve existing behavior when the new flag is absent or `false`.

### Out of Scope
- Changes to the Cx frontend (this repo is `backend-api-only` per the context map).
- Changes to non-applicant fields on the voucher.
- Any non-transactional / async voucher updates.

## Functional Requirements (Acceptance Criteria)

1. **DTO addition**
   - Add a new **optional** field `isApplicantsUpdated: boolean` to the request DTO used by the applicant update endpoint backing `updateVoucherFormApplicant()`.
   - When the field is omitted, behavior must be identical to today (no voucher mutation for these new fields).

2. **Post-applicant-update check**
   - After the applicant update logic completes successfully, the service must inspect the incoming payload.
   - The voucher update step runs only if `isApplicantsUpdated === true` (strict boolean check).

3. **Voucher update on success**
   - When `isApplicantsUpdated === true`, update the corresponding `Voucher` record and set:
     - `isApplicantsUpdated = true`
     - `applicantsUpdatedAt = <current timestamp>` (server-side `new Date()` / DB `NOW()` — see Implementation Notes).

4. **Atomicity**
   - The applicant update and the voucher update must be committed in a **single transaction**.
   - If the voucher update fails (including the existence precondition below), the applicant update must be rolled back along with it.
   - Use the **existing repository / transaction manager pattern** already used inside `updateVoucherFormApplicant()` — do not introduce a new transaction strategy.

5. **Voucher existence precondition**
   - Before issuing the voucher update, verify the voucher record exists (lookup by the same identifier the module already resolves applicants against).
   - If the voucher does not exist, fail the transaction with a clear, conventional error (consistent with the project's `success-response-errors` response envelope).

6. **Voucher entity & migration changes**
   - Add the following columns to the `Voucher` entity and a TypeORM migration **only if they do not already exist**:
     - `isApplicantsUpdated`: boolean, **NOT NULL**, default `false`.
     - `applicantsUpdatedAt`: timestamp, **nullable**.
   - Migration file created via `npm run migration:create -- src/migrations/<Name>` and runnable via `npm run migration:run` (revertable via `npm run migration:revert`).
   - Default of `false` must be applied for existing rows so the column is safe to add to a populated table.

7. **Backward compatibility**
   - Existing callers that do not send `isApplicantsUpdated` continue to work unchanged.
   - No change to the response envelope shape; existing success/error response conventions are preserved.

8. **API conventions**
   - Endpoint continues to live under the global `api` prefix (with non-prod prefix `api/{NODE_ENV}` where applicable).
   - Validation: `isApplicantsUpdated` validated as optional boolean via `class-validator` decorators consistent with neighboring fields in the same DTO.

## Data Model Changes

| Entity  | Column                | Type      | Nullable | Default | Notes                                              |
|---------|-----------------------|-----------|----------|---------|----------------------------------------------------|
| Voucher | `isApplicantsUpdated` | boolean   | No       | `false` | Add only if not already present.                   |
| Voucher | `applicantsUpdatedAt` | timestamp | Yes      | `NULL`  | Set to current timestamp when applicants updated.  |

Migration considerations:
- Use the project's existing TypeORM migration conventions under `src/migrations/`.
- Provide a working `down()` that drops the columns it added (and only those it added) to keep `migration:revert` clean.

## API / DTO Changes

- Update the request DTO consumed by the controller method that invokes `updateVoucherFormApplicant()` to include:

```ts
@IsOptional()
@IsBoolean()
isApplicantsUpdated?: boolean;
```

- No URL, HTTP verb, or response-shape changes.

## Implementation Notes

- All work centers on `src/modules/eoi_manager/voucher_forms/voucher_form.service.ts → updateVoucherFormApplicant()` and its DTO + the `Voucher` entity/repository.
- Reuse the **transaction/entity-manager** already in scope inside `updateVoucherFormApplicant()` — do not open a second transaction.
- Order of operations inside the transaction:
  1. Existing applicant update logic.
  2. If `dto.isApplicantsUpdated === true`:
     - Resolve the voucher (existence check) using the same identifier the applicants are tied to.
     - Update `isApplicantsUpdated = true` and `applicantsUpdatedAt = new Date()` via the transactional manager.
- Prefer setting `applicantsUpdatedAt` from the application layer (`new Date()`) for consistency across DB engines, unless the module convention is to use DB-side `CURRENT_TIMESTAMP` — in that case, follow the existing convention.
- Keep error handling aligned with the module's existing patterns and the global `success-response-errors` envelope.
- Lint/format via `npm run lint` / `npm run format` before completion.

## Testing Notes

- Unit tests for `updateVoucherFormApplicant()` covering:
  - `isApplicantsUpdated` omitted → no voucher mutation; existing behavior unchanged.
  - `isApplicantsUpdated === false` → no voucher mutation.
  - `isApplicantsUpdated === true` → voucher is updated with both fields; timestamp is set.
  - Voucher not found while `isApplicantsUpdated === true` → transaction rolls back; applicant changes are NOT persisted.
  - Failure during voucher update → applicant changes rolled back.
- Migration smoke test: `npm run migration:run` then `npm run migration:revert` succeed locally.
- Run `npm run test` and, where applicable, `npm run test:e2e` for the affected module.

## Open Questions

1. The description is truncated at point 7 ("Keep the exis…"). Likely "Keep the existing behavior backward compatible" / "Keep the existing transaction boundary intact" — confirm with the requester whether any additional clause was intended.
2. Should `applicantsUpdatedAt` be set **every** time the flag is `true` (overwriting previous value) or only the **first** time it transitions to `true`? Spec assumes **every time** (overwrite).
3. Should setting `isApplicantsUpdated` back to `false` ever be supported via this endpoint? Spec assumes **no** — this endpoint only ever flips it to `true`.
4. Identifier used to locate the voucher associated with the applicants: assumed to be the same one already used by `updateVoucherFormApplicant()` (typically the voucher form / voucher id present in the route params or DTO). Confirm if a different lookup is required.
5. Timestamp source: server `Date` vs DB `CURRENT_TIMESTAMP` — confirm preferred convention if the module is not consistent.

## Assumptions

- `Voucher` entity exists in the `eoi_manager/voucher_forms` module (or a sibling module it depends on) and is reachable via an injected repository/transactional entity manager from `VoucherFormService`.
- The existing controller/DTO for `updateVoucherFormApplicant()` uses `class-validator` and `class-transformer`, matching repository conventions, so adding an `@IsOptional() @IsBoolean()` field is the standard mechanism.
- TypeORM is used for the entity and migrations (per the `migration:create` / `migration:run` / `migration:revert` scripts in the context map).
- The repository is backend-only (`repositoryRole: backend-api-only`); no UI changes are required here.
- The new columns do not already exist; if they do, the migration must be a no-op for those columns and only add what is missing.

## References

- Context pack: `context-packs/story_analyzer.md` (PE-596)
- Service entry point: `src/modules/eoi_manager/voucher_forms/voucher_form.service.ts` → `updateVoucherFormApplicant()`
- Migrations location: `src/migrations/`
- Project conventions:
  - `docs/ai/project-context.md`
  - `docs/ai/context-map.json`
  - `README.md`
- Related background: `docs/PE-483-bulk-transaction-api-flow.md` (bulk EOI transaction flow — useful precedent for transactional patterns in this area).
