import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ProjectUserMapping } from 'src/entities';
import { Iom } from '../entities/iom.entity';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { throwIomError } from '../utils/iom-error.util';
import {
  CRM_EDIT_ALLOWED_FIELDS_SET,
  FE_DERIVED_COMPARISON_TOLERANCE,
} from '../constants';

/**
 * Absolute tolerance for comparing two floats that should represent
 * the same business value (e.g. an incoming `salePrice` vs the stored
 * `sale_price`). Anything below this is treated as "unchanged" so
 * we don't write a no-op UPDATE just because the FE round-tripped a
 * float through JSON.
 */
const VALUE_CHANGED_TOLERANCE = 1e-6;

export interface AuthenticatedUser {
  dbId: number;
  email?: string;
  role?: string;
  /**
   * Optional pre-resolved list of project ids. Kept for backwards
   * compatibility with callers that still hydrate this field; the
   * authoritative source for `assertProjectAccess` is the
   * `project_user_mapping` table - see `resolveUserProjects`.
   */
  crmProjects?: number[] | null;
}

/**
 * Reusable, side-effect-free business validations for the IOM CRM scope.
 *
 * Every method either returns `void` on success or throws via
 * `throwIomError` so the response shape is consistent.
 */
@Injectable()
export class IomValidationService {
  constructor(
    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepo: Repository<ProjectUserMapping>,
  ) {}

  /**
   * Verifies that the IOM's project is one the caller has an active
   * mapping for in `project_user_mapping`. Without this check, a CRM
   * user in project A could touch records owned by project B by
   * guessing ids.
   *
   * The allowed-project list is resolved from the database on every
   * call (mirrors `IomListingService.resolveUserProjects`) because the
   * JWT only carries `id` / `email` / `role` - it does NOT include
   * `crmProjects`, so trusting the in-memory user object would always
   * deny access.
   */
  async assertProjectAccess(
    user: AuthenticatedUser,
    projectId: number | null | undefined,
  ): Promise<void> {
    if (projectId == null) {
      throwIomError(IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS, {
        reason: 'IOM has no associated project',
      });
    }

    const allowed = await this.resolveUserProjects(user);
    if (!allowed.includes(Number(projectId))) {
      throwIomError(IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS, {
        projectId,
      });
    }
  }

  /**
   * Resolve the set of project ids the caller may act on by querying
   * `project_user_mapping` for active rows (`removed_at IS NULL`) that
   * reference the authenticated user. The same user may map to the
   * same project under multiple roles, so results are de-duplicated.
   *
   * Returning an empty array is a valid outcome and causes
   * `assertProjectAccess` to deny the request - never falls back to a
   * hard-coded project id.
   */
  private async resolveUserProjects(
    user: AuthenticatedUser,
  ): Promise<number[]> {
    if (user?.dbId == null) {
      return [];
    }

    const mappings = await this.projectUserMappingRepo.find({
      where: {
        user: { id: user.dbId },
        removedAt: IsNull(),
      },
      relations: ['project'],
    });

    const ids = new Set<number>();
    for (const mapping of mappings) {
      const projectId = mapping.project?.id;
      if (projectId != null) {
        ids.add(Number(projectId));
      }
    }
    return Array.from(ids);
  }

  /**
   * Pre-submission gate: every field required by downstream approvers
   * must be present and non-trivial. Aggregates *all* missing fields
   * into a single error response so the user fixes everything in one
   * round-trip instead of N.
   *
   * The `referrerPoints + refereePoints > 0` rule is skipped when the
   * IOM has been put into deviation mode (`brokerage_adj_non_loyalty
   * = 1`). Deviation is the explicit CRM override path - the user
   * may legitimately set both points to `0` (e.g. one-off
   * Finance-approved adjustment that zeroes out the brokerage), and
   * blocking submission would defeat the purpose of the flag.
   */
  assertMandatoryForSubmission(iom: Iom): void {
    const missing: string[] = [];
    const isDeviated = Number(iom.brokerageAdjNonLoyalty ?? 0) === 1;

    if (iom.salePrice == null || Number(iom.salePrice) <= 0) {
      missing.push('salePrice');
    }
    if (
      iom.totalBrokerageAmount == null ||
      Number(iom.totalBrokerageAmount) <= 0
    ) {
      missing.push('totalBrokerageAmount');
    }
    if (!iom.customerMobile || iom.customerMobile.trim().length === 0) {
      missing.push('customerMobile');
    }
    if (
      !iom.referralClassification ||
      iom.referralClassification.trim().length === 0
    ) {
      missing.push('referralClassification');
    }
    if (!iom.referralSplitType || iom.referralSplitType.trim().length === 0) {
      missing.push('referralSplitType');
    }

    if (!isDeviated) {
      const totalPoints =
        Number(iom.referrerPoints ?? 0) + Number(iom.refereePoints ?? 0);
      if (!(totalPoints > 0)) {
        missing.push('referrerPoints+refereePoints');
      }
    }

    if (missing.length > 0) {
      throwIomError(
        IomErrorCodeEnum.MANDATORY_FIELDS_MISSING,
        { missing },
        `Mandatory fields missing: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Inspect the raw payload (pre-DTO, exactly as the FE sent it) and
   * reject any key that isn't in
   * `CRM_EDIT_ALLOWED_FIELDS_SET = INPUTS ∪ DERIVED ∪ META`.
   *
   * class-validator's `forbidNonWhitelisted` catches this at the
   * framework layer, but we re-verify in the service because
   * (a) defence in depth and (b) some callers may bypass the pipe.
   */
  assertCrmEditWhitelist(payload: Record<string, unknown>): void {
    const offenders: string[] = [];
    for (const key of Object.keys(payload)) {
      if (!CRM_EDIT_ALLOWED_FIELDS_SET.has(key)) offenders.push(key);
    }
    if (offenders.length > 0) {
      throwIomError(IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD, {
        offenders,
      });
    }
  }

  /**
   * Validation chain for the CRM edit payload (after the whitelist).
   * Aggregates every failure into one response so the user fixes
   * everything in a single round-trip.
   *
   * The inputs here are the *effective* (post-flag-merge) values that
   * the backend will actually use to recompute - i.e. the incoming
   * value when the edit flag is true, otherwise the stored value.
   * This ensures the resulting IOM state is internally consistent
   * regardless of which subset of fields the FE touched.
   *
   *   - salePrice >= 0
   *   - brokeragePercentage > 0
   *   - brokeragePercentage <= maxBrokeragePercentage (per-project cap)
   *   - referrerRatio + refereeRatio > 0 (both >= 0, not both zero)
   *
   * The ratio constraints are skipped when `deviation === true`: in
   * that mode the ratio concept does not apply and the caller passes
   * `null` for both components (they will be persisted as `null` to
   * `ioms.referrer_ratio` / `ioms.referee_ratio`).
   */
  assertCrmEditInputs(input: {
    salePrice: number;
    brokeragePercentage: number;
    referrerRatio: number | null;
    refereeRatio: number | null;
    maxBrokeragePercentage: number;
    deviation?: boolean;
  }): void {
    const failures: string[] = [];

    if (!(input.brokeragePercentage > 0)) {
      failures.push('brokeragePercentage must be > 0');
    } else if (input.brokeragePercentage > input.maxBrokeragePercentage) {
      failures.push(
        `brokeragePercentage (${input.brokeragePercentage}) exceeds project max (${input.maxBrokeragePercentage})`,
      );
    }

    if (input.salePrice < 0) {
      failures.push('salePrice must be >= 0');
    }

    if (input.deviation !== true) {
      const referrerPart = input.referrerRatio ?? 0;
      const refereePart = input.refereeRatio ?? 0;
      if (referrerPart < 0 || refereePart < 0) {
        failures.push(
          'referralPointsRatio parts must be >= 0 (encoded as "X:Y", e.g. "1:1", "2:0", "0:2")',
        );
      } else if (referrerPart + refereePart <= 0) {
        failures.push(
          'referralPointsRatio "0:0" is not allowed (no points to allocate)',
        );
      }
    }

    if (failures.length > 0) {
      throwIomError(
        IomErrorCodeEnum.MANDATORY_FIELDS_MISSING,
        { failures },
        `Invalid CRM edit payload: ${failures.join('; ')}`,
      );
    }
  }

  /**
   * For every edit flag the FE set to true, verify the matching input
   * value is actually present in the DTO. This catches the case where
   * the FE marks a field as "edited" but forgets to send the new
   * value, which would otherwise silently fall through to "no
   * change".
   *
   * Additional contract enforced here for the `"other"` split-type:
   *
   *   - When `referralPointsRatio === "other"` AND `deviation` is
   *     `false`/unset, the FE MUST also send numeric `referrerRatio`
   *     and `refereeRatio` (the `"other"` wire marker is not
   *     parseable, so the BE has no other way to learn the split).
   *   - When `deviation === true`, the FE MUST NOT send those numeric
   *     ratios - in deviation mode the ratio concept does not apply
   *     and both columns will be persisted as `null`. Sending them
   *     would be ambiguous: are they meant to override the deviation,
   *     or be silently discarded? We reject the request to keep the
   *     contract unambiguous.
   */
  assertFlaggedInputsArePresent(flags: {
    salePriceEdited?: boolean;
    brokeragePercentageEdited?: boolean;
    referralPointsRatioEdited?: boolean;
    salePrice?: number;
    brokeragePercentage?: number;
    referralPointsRatio?: string;
    deviation?: boolean;
    referrerRatio?: number;
    refereeRatio?: number;
  }): void {
    const missing: string[] = [];

    if (flags.salePriceEdited && flags.salePrice == null) {
      missing.push('salePrice');
    }
    if (flags.brokeragePercentageEdited && flags.brokeragePercentage == null) {
      missing.push('brokeragePercentage');
    }
    if (
      flags.referralPointsRatioEdited &&
      (flags.referralPointsRatio == null ||
        flags.referralPointsRatio.trim().length === 0)
    ) {
      missing.push('referralPointsRatio');
    }

    const trimmedRatio = (flags.referralPointsRatio ?? '').trim();
    const isOther = trimmedRatio === 'other';

    if (isOther && flags.deviation !== true) {
      if (flags.referrerRatio == null) missing.push('referrerRatio');
      if (flags.refereeRatio == null) missing.push('refereeRatio');
    }

    if (missing.length > 0) {
      throwIomError(
        IomErrorCodeEnum.MANDATORY_FIELDS_MISSING,
        { missing },
        `Edit flag set without accompanying value: ${missing.join(', ')}`,
      );
    }

    if (
      flags.deviation === true &&
      (flags.referrerRatio != null || flags.refereeRatio != null)
    ) {
      throwIomError(
        IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD,
        {
          offenders: [
            ...(flags.referrerRatio != null ? ['referrerRatio'] : []),
            ...(flags.refereeRatio != null ? ['refereeRatio'] : []),
          ],
        },
        'referrerRatio / refereeRatio must NOT be sent when deviation=true (ratios are stored as null).',
      );
    }
  }

  /**
   * Two floats are considered equal (no-op) when their absolute
   * difference is below `VALUE_CHANGED_TOLERANCE`. Used by the edit
   * endpoint to decide whether a flagged field actually changed and
   * therefore deserves a DB write + audit stamp.
   */
  valuesDiffer(
    a: number | null | undefined,
    b: number | null | undefined,
  ): boolean {
    const aNum = a == null ? null : Number(a);
    const bNum = b == null ? null : Number(b);
    if (aNum === null && bNum === null) return false;
    if (aNum === null || bNum === null) return true;
    return Math.abs(aNum - bNum) > VALUE_CHANGED_TOLERANCE;
  }

  /**
   * Parse the `"X:Y"` referrer:referee ratio string sent by the FE
   * into its two numeric components. X and Y may be non-negative
   * integers or decimals (e.g. `"1.2:0.8"` for the FE "other" split).
   *
   * The wire format is the contract:
   *   - `"1:1"`      -> { referrerRatio: 1,   refereeRatio: 1 }   (50/50 split)
   *   - `"2:1"`      -> { referrerRatio: 2,   refereeRatio: 1 }
   *   - `"1:2"`      -> { referrerRatio: 1,   refereeRatio: 2 }
   *   - `"2:0"`      -> { referrerRatio: 2,   refereeRatio: 0 }   (all to referrer)
   *   - `"0:2"`      -> { referrerRatio: 0,   refereeRatio: 2 }   (all to referee)
   *   - `"1.2:0.8"`  -> { referrerRatio: 1.2, refereeRatio: 0.8 } (custom split)
   *
   * Downstream points calculation MUST normalise by the sum of the
   * two parts. `"0:0"` is structurally invalid and rejected at
   * `assertCrmEditInputs`; this helper does NOT throw on its own -
   * it returns whatever the regex captured (the DTO's `@Matches`
   * guarantees the input matches `/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/`
   * before we get here).
   *
   * Returns `null` if the input is null/undefined/blank or doesn't
   * match the expected shape. Callers MUST treat a `null` return as
   * "no ratio was provided" and fall back to the stored value.
   */
  parseReferralRatio(
    ratio: string | null | undefined,
  ): { referrerRatio: number; refereeRatio: number } | null {
    if (ratio == null) return null;
    const trimmed = String(ratio).trim();
    const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(trimmed);
    if (!match) return null;
    return {
      referrerRatio: Number(match[1]),
      refereeRatio: Number(match[2]),
    };
  }

  /**
   * Format two ratio parts as the canonical wire string `"X:Y"`. Used
   * to compare the incoming string against the stored
   * `referrerRatio` / `refereeRatio` columns and to populate audit
   * snapshots without ambiguity.
   *
   * Decimal parts are preserved (e.g. `(1.2, 0.8)` -> `"1.2:0.8"`)
   * because the wire contract now accepts custom decimal splits
   * (FE "other" split-type). Integer-valued inputs still stringify
   * without a fractional suffix (e.g. `(1, 0)` -> `"1:0"`), so the
   * output continues to satisfy `parseReferralRatio`.
   */
  formatReferralRatio(
    referrerRatio: number | null | undefined,
    refereeRatio: number | null | undefined,
  ): string | null {
    if (referrerRatio == null || refereeRatio == null) return null;
    return `${Number(referrerRatio).toString()}:${Number(refereeRatio).toString()}`;
  }

  /**
   * Build the `referral_split_ratio` JSON payload from the two ratio
   * parts and the originating split-type label. The wire convention is
   * `"X:Y"` = `referrer:referee`, so for `splitType = "1:1"`:
   *
   *   - `(1, 1, "1:1")`   -> { referrer: 50,    referee: 50,    type: "1:1" }
   *   - `(2, 0, "2:0")`   -> { referrer: 100,   referee: 0,     type: "2:0" }
   *   - `(0, 2, "0:2")`   -> { referrer: 0,     referee: 100,   type: "0:2" }
   *   - `(2, 1, "2:1")`   -> { referrer: 66.67, referee: 33.33, type: "2:1" }
   *   - `(0.55, 0.45, "other")`
   *                       -> { referrer: 55,    referee: 45,    type: "other" }
   *
   * `type` mirrors `ioms.referral_split_type` so callers consuming the
   * JSON column don't need a second lookup to know whether the split
   * came from a canonical `"X:Y"` ratio or the FE-side `"other"`
   * marker. It's `null` only when the originating type itself was
   * absent / unknown.
   *
   * Percentages are rounded to 2 decimals; the second part is derived
   * as `100 - referrer` to guarantee the JSON always sums to exactly
   * 100 even when the raw division introduces rounding noise (e.g.
   * `"2:1"` -> 66.67 / 33.33). Returns `null` if either input is null
   * or both parts are zero (no allocation possible).
   */
  buildReferralSplitRatioJson(
    referrerRatio: number | null | undefined,
    refereeRatio: number | null | undefined,
    splitType: string | null | undefined,
  ): { referrer: number; referee: number; type: string | null } | null {
    if (referrerRatio == null || refereeRatio == null) return null;
    const referrer = Number(referrerRatio);
    const referee = Number(refereeRatio);
    const sum = referrer + referee;
    if (!(sum > 0)) return null;
    const referrerPct = Math.round((referrer / sum) * 10000) / 100;
    const refereePct = Math.round((100 - referrerPct) * 100) / 100;
    const trimmedType =
      typeof splitType === 'string' && splitType.trim().length > 0
        ? splitType.trim()
        : null;
    return { referrer: referrerPct, referee: refereePct, type: trimmedType };
  }

  /**
   * Tolerance compare of FE-supplied derived values against the
   * backend-recomputed ones. Only fields the FE actually sent are
   * checked; absent values are not treated as a mismatch. Any
   * mismatch beyond `FE_DERIVED_COMPARISON_TOLERANCE` throws.
   *
   * This is the chokepoint that enforces "Backend is the source of
   * truth" when the FE *does* send its own calculation - if the FE's
   * numbers don't agree, we assume the FE used stale inputs (e.g.
   * pre-rebate sale value) and refuse the request rather than silently
   * persisting the BE numbers.
   */
  assertFeDerivedMatchesBe(
    fe: {
      totalBrokerageAmount?: number;
      referrerPoints?: number;
      refereePoints?: number;
    },
    be: {
      totalBrokerageAmount: number;
      referrerPoints: number;
      refereePoints: number;
    },
  ): void {
    const mismatches: Array<{
      field: string;
      fe: number;
      be: number;
      delta: number;
    }> = [];

    const check = (field: string, feVal: number | undefined, beVal: number) => {
      if (feVal === undefined || feVal === null) return;
      const delta = Math.abs(Number(feVal) - Number(beVal));
      if (delta > FE_DERIVED_COMPARISON_TOLERANCE) {
        mismatches.push({ field, fe: Number(feVal), be: beVal, delta });
      }
    };

    check(
      'totalBrokerageAmount',
      fe.totalBrokerageAmount,
      be.totalBrokerageAmount,
    );
    check('referrerPoints', fe.referrerPoints, be.referrerPoints);
    check('refereePoints', fe.refereePoints, be.refereePoints);

    if (mismatches.length > 0) {
      throwIomError(
        IomErrorCodeEnum.MANDATORY_FIELDS_MISSING,
        { mismatches, tolerance: FE_DERIVED_COMPARISON_TOLERANCE },
        'FE-supplied derived values do not match backend calculation within tolerance.',
      );
    }
  }
}
