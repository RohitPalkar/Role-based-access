import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Edit IOM payload from CRM users (`PATCH /iom/:id`).
 *
 * Naming convention: camelCase. DTOs are the API contract - the FE
 * speaks camelCase, the DB stores snake_case, and the service layer
 * does the column-name mapping (e.g. `salePrice` -> `ioms.sale_price`).
 *
 * Field model (FE-driven, per-field edit-flag gated):
 *
 *   The FE drives every editable field by setting the matching
 *   boolean `*Edited` flag:
 *
 *     - `salePriceEdited`
 *     - `brokeragePercentageEdited`
 *     - `referralPointsRatioEdited`
 *
 *   For every flag that is `true`, the corresponding input value MUST
 *   be present in the payload. The backend then:
 *
 *     1. Re-loads the IOM row from `ioms`.
 *     2. Compares the incoming value to the stored value.
 *        - If equal: silently skips the field (no-op, no error).
 *        - If different: persists the new value AND stamps the audit
 *          columns. `salePrice` and `referralPointsRatio` have
 *          a dedicated boolean flag column in `ioms`
 *          (`sale_price_edited = 1`, `referral_points_edited = 1`)
 *          plus `*_edited_by` / `*_edited_at`; `brokeragePercentage`
 *          has no boolean column - `brokerage_percentage_edited_by IS
 *          NOT NULL` acts as the edit indicator and is stamped
 *          together with `brokerage_percentage_edited_at`.
 *
 *   Flags that are `false` (or omitted) mean "the FE did not touch
 *   this field" - the backend leaves the column untouched. The input
 *   value is ignored even if supplied.
 *
 *   `referralPointsRatio` is the referrer:referee split encoded as a
 *   string `"X:Y"` where X and Y are non-negative numbers (integer or
 *   decimal) and not both zero. Examples:
 *
 *     - `"1:1"`      -> 50/50 split between referrer and referee.
 *     - `"2:1"`      -> referrer gets 2 parts, referee gets 1 part.
 *     - `"1:2"`      -> referrer gets 1 part, referee gets 2 parts.
 *     - `"2:0"`      -> all brokerage points go to the referrer.
 *     - `"0:2"`      -> all brokerage points go to the referee.
 *     - `"1.2:0.8"`  -> custom split (typically when the FE-side
 *                       `referralSplitType` is "other" and the user
 *                       enters an arbitrary ratio).
 *     - `"0:0"`      -> REJECTED (nothing to allocate).
 *
 *   The backend parses the string, persists the raw `"X:Y"` to
 *   `ioms.referral_split_type`, and writes the parsed parts to
 *   `ioms.referrer_ratio` (X) and `ioms.referee_ratio` (Y). The legacy
 *   FLOAT column `ioms.referral_points_adjustment` is no longer the
 *   source of truth for the split and is not updated by this endpoint.
 *
 *   All derived values (`totalBrokerageAmount`, `referrerPoints`,
 *   `refereePoints`) are recomputed by the backend from the
 *   authoritative state (stored + incoming overrides). The FE may
 *   include them as a sanity check; the backend tolerance-compares
 *   them and rejects on mismatch but NEVER persists the FE numbers
 *   directly.
 *
 * The global `ValidationPipe({ whitelist: true, forbidNonWhitelisted:
 * true, transform: true })` automatically rejects anything outside this
 * declaration. `IomValidationService.assertCrmEditWhitelist` ALSO runs
 * against the raw payload for defence in depth.
 */
export class EditIomDto {
  // ---------------- ACTION ----------------

  /**
   * Controls the lifecycle transition applied after saving the edited values:
   *   - `submit`   – existing auto-submit path (IOM_TO_BE_CREATED only).
   *   - `draft`    – save without submitting; status becomes DRAFT.
   *   - `resubmit` – edit + resubmit from DRAFT or any rejection state.
   */
  @IsString()
  @IsIn(['draft', 'submit', 'resubmit'])
  action!: 'draft' | 'submit' | 'resubmit';

  @IsBoolean()
  deviation?: boolean;

  // ---------------- EDIT FLAGS (FE intent) ----------------

  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  salePriceEdited?: boolean;

  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  brokeragePercentageEdited?: boolean;

  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  referralPointsRatioEdited?: boolean;

  // ---------------- INPUTS ----------------
  // Each editable input is only persisted when its matching
  // `*Edited` flag is true AND the incoming value differs from the
  // stored value.

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  brokeragePercentage?: number;

  /**
   * Referrer:Referee split encoded as `"X:Y"` where X and Y are
   * non-negative numbers (integer or decimal) and not both zero.
   * The framework-level regex enforces the shape; the service rejects
   * the `"0:0"` case (no allocation possible) and any value outside
   * the structural regex. Decimals are allowed so callers can send
   * custom splits when the FE-side `referralSplitType` is "other"
   * (e.g. `"1.2:0.8"`).
   *
   * The literal string `"other"` is also accepted as a wire value -
   * the FE sends it when the user selects the "other" split-type
   * option. The backend treats it as an opaque marker (no parsable
   * X/Y components); the actual numeric ratio for that case is
   * communicated by other means / persisted separately.
   */
  @IsOptional()
  @IsString()
  @Matches(/^(?:other|\d+(?:\.\d+)?:\d+(?:\.\d+)?)$/, {
    message:
      'referralPointsRatio must be the literal string "other" or a string in the form "X:Y" where X and Y are non-negative numbers (e.g. "1:1", "2:0", "0:2", "1.2:0.8..").',
  })
  referralPointsRatio?: string;

  /**
   * Explicit numeric components of the referrer:referee split. The FE
   * sends these ONLY when `referralPointsRatio === "other"` AND
   * `deviation === false` - the "other" wire marker has no parseable
   * `"X:Y"` and the BE cannot derive the ratio on its own, so the
   * FE-computed values are the source of truth and are persisted to
   * `ioms.referrer_ratio` / `ioms.referee_ratio` verbatim.
   *
   * When `deviation === true` the ratio concept does not apply
   * (the brokerage has been manually overridden) - the FE MUST NOT
   * send these and the BE persists `null` to both columns.
   *
   * For all other split-types (`"1:1"`, `"2:0"`, `"X:Y"`, etc.) the
   * BE derives the components from the `referralPointsRatio` string
   * via `parseReferralRatio` and any FE-supplied values here are
   * ignored.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  referrerRatio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refereeRatio?: number;

  // ---------------- DERIVED (optional, FE/BE sanity check) ----------------

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalBrokerageAmount?: number;

  @Type(() => Number)
  @IsNumber()
  referrerPoints?: number;

  @Type(() => Number)
  @IsNumber()
  refereePoints?: number;

  // ---------------- AUDIT NOTE (optional, persisted on ratio edits) ----------------

  @IsOptional()
  @IsString()
  @MaxLength(255)
  referralPointsEditReason?: string | null;
}

/**
 * Coerce common truthy/falsy wire formats (`true`/`false`, `1`/`0`,
 * `"true"`/`"false"`, `"1"`/`"0"`) into a strict boolean so the FE can
 * send any of them interchangeably.
 */
function toBool(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return value;
}
