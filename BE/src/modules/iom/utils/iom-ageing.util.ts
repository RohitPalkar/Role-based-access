/**
 * Time-arithmetic helpers shared by the IOM ageing endpoint.
 *
 * Kept side-effect-free and dependency-free so they can be unit-tested
 * in isolation and reused by other services (e.g. listing ageing,
 * export workbook rows) without dragging in TypeORM or NestJS.
 *
 * Convention:
 *   - "ageing" is always measured as `floor(elapsed)` so a stage that
 *     entered 30 minutes ago reports `0` hours / `0` days. This avoids
 *     half-stage rounding surprises on the FE timeline.
 *   - All inputs are normalised through `Date` to tolerate either
 *     `Date` instances or DB-returned strings.
 *   - Negative deltas (clock skew, future timestamps) are clamped to
 *     `0` so the API never returns a negative duration.
 */

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Coerce a possibly-string DB timestamp into a millisecond epoch.
 * Returns `null` when the input is null/undefined or cannot be parsed
 * (e.g. an invalid ISO string from a malformed JSON column).
 */
function toEpochMs(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Whole-hour difference between two timestamps, clamped at 0.
 *
 * Used to compute per-stage duration:
 *   - For all non-current stages: `to` = next row's `changed_at`,
 *     `from` = this row's `changed_at`.
 *   - For the current stage: `to` = `now`, `from` = this row's
 *     `changed_at`.
 */
export function diffInHours(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined,
): number {
  const fromMs = toEpochMs(from);
  const toMs = toEpochMs(to);
  if (fromMs === null || toMs === null) return 0;
  const deltaMs = toMs - fromMs;
  if (deltaMs <= 0) return 0;
  // console.log(Math.floor(deltaMs / MS_PER_HOUR));
  return Math.floor(deltaMs / MS_PER_HOUR);
}

/**
 * Whole-day difference between two timestamps, clamped at 0.
 * Used only for the summary's `ageingInDays`; `diffInHours` is the
 * authoritative measure for per-stage duration.
 */
export function diffInDays(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined,
): number {
  const fromMs = toEpochMs(from);
  const toMs = toEpochMs(to);
  if (fromMs === null || toMs === null) return 0;
  const deltaMs = toMs - fromMs;
  if (deltaMs <= 0) return 0;
  // console.log(Math.floor(deltaMs / MS_PER_DAY));
  return Math.floor(deltaMs / MS_PER_DAY);
}

/**
 * Resolve the customer name from the `customer_details` JSON blob.
 * Mirrors the same key precedence used by `IomListingService` so the
 * value is consistent across endpoints (`name` -> `customerName` ->
 * `fullName`). Returns `null` when no usable string is found.
 */
export function resolveCustomerNameFromDetails(
  details: Record<string, unknown> | null | undefined,
): string | null {
  if (!details || typeof details !== 'object') {
    return null;
  }
  for (const key of ['name', 'customerName', 'fullName']) {
    const value = (details as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
