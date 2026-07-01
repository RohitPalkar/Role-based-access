/**
 * Response DTOs for `GET /iom/:id/ageing`.
 *
 * These are pure data-shape declarations - no `class-validator`
 * decorators because they describe the *server -> client* contract,
 * not an inbound payload. They live in `iom/dto/` per the spec
 * naming convention while still following the project pattern that
 * outbound shapes are plain classes / interfaces (see e.g.
 * `LoyaltyDetailsResponse`).
 *
 * Field names match the API contract exactly (camelCase JSON keys).
 * The service layer is responsible for populating these from the
 * underlying snake_case columns; consumers must not depend on the
 * DB column names.
 */

/**
 * Snapshot of the IOM at the top of the ageing response. Every field
 * is sourced directly from `ioms` (joined to `iom_statuses` for the
 * human-readable current stage). Bookings are intentionally NOT joined
 * - the spec freezes the summary to the columns already denormalised
 * onto `ioms`.
 */
export class AgeingSummaryDto {
  /** `ioms.id` */
  iomId!: number;

  /** `ioms.sales_order_id`. Nullable because legacy rows may be missing it. */
  salesOrderId!: string | null;

  /** `ioms.iom_no`. Nullable until the IOM crosses the auto-generation point. */
  iomNo!: string | null;

  /** `projects.name` joined via `ioms.project_id`. Null when project is missing. */
  projectName!: string | null;

  /** Resolved from `ioms.customer_details` JSON. Null when not parseable. */
  customerName!: string | null;

  /**
   * Per the spec, the response field `submittedAt` is sourced from
   * `ioms.created_at` (NOT the dedicated `submitted_at` column).
   * Returned as ISO-8601 string by serialisation.
   */
  submittedAt!: Date | null;

  /** Stable code from `iom_statuses.code` (e.g. `CRM_TL_APPROVAL_PENDING`). */
  currentStage!: string;

  /**
   * Timestamp the IOM entered its current stage. Equals the most
   * recent `iom_history.changed_at` for this IOM; falls back to
   * `ioms.created_at` when no history rows exist yet.
   */
  currentStageSince!: Date;

  /** Floor of (now - currentStageSince) in whole days. Non-negative. */
  ageingInDays!: number;

  /** Floor of (now - currentStageSince) in whole hours. Non-negative. */
  ageingInHours!: number;
}

/**
 * Lightweight user reference used inside timeline rows. Mirrors the
 * minimal projection the FE needs (id + display name); deliberately
 * does NOT leak email/role to avoid coupling the audit surface to
 * the full user entity.
 */
export class AgeingActorDto {
  id!: number;
  name!: string | null;
}

/**
 * A single point in the IOM lifecycle, sourced from one row of
 * `iom_history`. Rows are returned in `changed_at ASC` order; the
 * last entry is the current stage and is the only one with
 * `isCurrentStage = true`.
 */
export class AgeingTimelineItemDto {
  /** `iom_statuses.id` (the row's `to_status_id`). */
  statusId!: number;

  /** `iom_statuses.code` of the status this transition entered. */
  status!: string;

  /** `iom_history.changed_at` for this row. */
  completedOn!: Date;

  /**
   * The user who triggered the transition. `null` when the linked
   * `users` row has been hard-deleted, soft-deleted, or never
   * existed (e.g. system-generated transitions).
   */
  completedBy!: AgeingActorDto | null;

  /** `iom_history.action` (e.g. `CRM_EDIT`, `CRM_SUBMIT`). */
  action!: string | null;

  /** `iom_history.remarks`. `null` when the actor left no comment. */
  remarks!: string | null;

  /**
   * How long the IOM stayed in *this* stage. Computed as
   * `(next_row.changed_at - this_row.changed_at)` in whole hours;
   * for the latest row it is `(now - this_row.changed_at)`.
   * Non-negative.
   */
  durationInHours!: number;

  /** `true` only for the most recent timeline row. */
  isCurrentStage!: boolean;
}

/**
 * Full payload returned by `GET /iom/:id/ageing`.
 *
 * `timeline` is sorted by `changed_at ASC` and is the empty array
 * when no `iom_history` rows exist for the IOM (e.g. the IOM was
 * created via a code path that bypassed the history event - the
 * summary is still returned).
 */
export class AgeingResponseDto {
  summary!: AgeingSummaryDto;
  timeline!: AgeingTimelineItemDto[];
}
