import { IomStatusCodeEnum } from './enums/iom-status-code.enum';

/**
 * Identifier constants only.
 *
 * NOTHING in this file expresses "which role can act in which status".
 * That information lives exclusively in the database (`iom_transitions`)
 * and is consulted at runtime by `WorkflowValidationService`.
 *
 * Constants kept here are limited to:
 *   - Status code identifiers (already in `IomStatusCodeEnum`)
 *   - Terminal status set (a code-level fact about lifecycle, not a
 *     permission rule - terminal means "no outgoing transition exists
 *     for any role from this state", which is also enforceable from
 *     `iom_transitions` but pinned in code as the canonical lifecycle
 *     contract)
 *   - Field-level editable list for the CRM edit endpoint (NOT a
 *     status-based or role-based permission - it's a body-whitelist)
 *   - Event name for the async history pipeline
 *
 * If you find yourself wanting to add a constant of the shape
 * `<ROLE>_ALLOWED_STATUS_CODES` or `<ROLE>_SUBMITTABLE_FROM_STATUSES`,
 * STOP. Add a row to `iom_transitions` instead.
 */

/**
 * Statuses with no outgoing transition - the IOM is finalised.
 * Used by `WorkflowValidationService.assertNotTerminal`.
 *
 * Note: `POINTS_UPLOADED` is NOT terminal because Loyalty can still
 * transition it to `INVOICE_REQUESTED_FROM_VENDOR`. If the workflow
 * changes, update this set and the matching `iom_transitions` rows
 * together.
 */
export const TERMINAL_STATUS_CODES: ReadonlySet<IomStatusCodeEnum> = new Set([
  IomStatusCodeEnum.IOM_CLOSED,
  // IomStatusCodeEnum.DELETED,
]);

/**
 * Status codes that represent a rejection. Used by the resubmit
 * endpoint purely as a *data-sanity* check ("if the IOM is in a
 * rejected state then `rejection_reason` must be populated") - NOT
 * for authorization. Authorization for the transition itself is still
 * 100% DB-driven via `iom_transitions`.
 */
export const REJECTION_STATUS_CODES: ReadonlySet<IomStatusCodeEnum> = new Set([
  IomStatusCodeEnum.CRM_TL_REJECTED,
  IomStatusCodeEnum.CRM_HEAD_REJECTED,
  IomStatusCodeEnum.FINANCE_MEMBER_REJECTED,
  IomStatusCodeEnum.FINANCE_APPROVER_REJECTED,
]);

/**
 * Approval-target codes used by
 * `WorkflowValidationService.assertNotSelfApproval` to block the
 * creator from approving their own IOM. These are the codes the IOM
 * moves TO as each reviewer approves their stage (TL -> CRM Head ->
 * Finance Member -> Finance Approver). The initial submit transition
 * (IOM_TO_BE_CREATED -> CRM_TL_APPROVAL_PENDING) is intentionally
 * excluded - that move is the creator's own submission, not an
 * approval step.
 */
export const APPROVAL_TARGET_STATUS_CODES: ReadonlySet<IomStatusCodeEnum> =
  new Set([
    IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING,
    IomStatusCodeEnum.FINANCE_MEMBER_VERIFICATION_PENDING,
    IomStatusCodeEnum.FINANCE_APPROVER_APPROVAL_PENDING,
    IomStatusCodeEnum.OTHER_BROKERAGE_ADJUSTMENT,
    IomStatusCodeEnum.POINTS_TO_BE_UPLOADED,
  ]);

/**
 * Body-level whitelist of fields the `PATCH /iom/:id` endpoint accepts
 * from CRM users. Has nothing to do with statuses or roles - it's a
 * payload sanitiser.
 */
/**
 * API field names (camelCase) the CRM user is permitted to SEND on the
 * edit endpoint. These are the only values the backend treats as
 * inputs - everything else is either derived (recomputed by the
 * backend) or out of scope for CRM editing.
 *
 * Contract:
 *   - The three `*Edited` flags express FE intent ("I changed this
 *     field"). For each flag set to true, the corresponding input
 *     value must be present; the backend then compares against the
 *     stored value and either persists (if changed) or silently skips
 *     (if equal). See `EditIomDto` for the full per-field rules.
 *   - `referralPointsRatio` is a string `"X:Y"` (e.g. `"1:1"`,
 *     `"2:0"`, `"0:2"`). The backend persists the raw string to
 *     `ioms.referral_split_type` and the parsed parts to
 *     `referrer_ratio` / `referee_ratio`. The FE never sends those
 *     two columns directly.
 *
 * IMPORTANT: these are *API* field names, not DB column names. The
 * service layer maps them to entity properties (e.g. `salePrice` ->
 * `Iom.salePrice` -> `ioms.sale_price`). Do NOT inline the snake_case
 * DB columns here.
 */
export const CRM_ALLOWED_INPUT_FIELDS = [
  'action',
  'deviation',
  'salePrice',
  'brokeragePercentage',
  'referralPointsRatio',
  // FE-supplied explicit ratio numbers - only meaningful (and
  // required) when `referralPointsRatio === "other"` AND
  // `deviation === false`. Forbidden in deviation mode. Ignored for
  // any other `referralPointsRatio` value because the BE can derive
  // the components from the `"X:Y"` wire string.
  'referrerRatio',
  'refereeRatio',
  'salePriceEdited',
  'brokeragePercentageEdited',
  'referralPointsRatioEdited',
  'referralPointsEditReason',
] as const;

/**
 * Derived fields. The FE may optionally include them so that the
 * backend can sanity-check the FE's local calculation against the
 * authoritative server-side compute (`assertFeDerivedMatchesBe`). They
 * are NEVER persisted as supplied - the backend recomputes from
 * inputs.
 */
export const DERIVED_FIELDS = [
  'totalBrokerageAmount',
  'referrerPoints',
  'refereePoints',
] as const;

/**
 * Pre-computed union set for O(1) whitelist enforcement on the raw
 * payload (`IomValidationService.assertCrmEditWhitelist`). The CRM
 * edit endpoint relies on the in-transaction pessimistic FOR UPDATE
 * lock for concurrency safety, so no optimistic-lock token is part
 * of the contract - the payload is INPUTS ∪ DERIVED only.
 */
export const CRM_EDIT_ALLOWED_FIELDS_SET: ReadonlySet<string> = new Set<string>(
  [...CRM_ALLOWED_INPUT_FIELDS, ...DERIVED_FIELDS],
);

/**
 * Absolute tolerance used when comparing FE-supplied derived values
 * against the backend-recomputed ones, and when validating the
 * `referrerRatio + refereeRatio == 1.0` constraint. Floating-point
 * math + currency precision (paise / cents) makes exact equality
 * unsafe.
 */
export const FE_DERIVED_COMPARISON_TOLERANCE = 0.01;
export const RATIO_SUM_TOLERANCE = 1e-6;

export const IOM_HISTORY_EVENT = 'iom.history';

/** Redis key prefix for LOYALTY tab count cache entries. */
export const IOM_LOYALTY_COUNTS_CACHE_PREFIX = 'iom:counts:loyalty';

/** Redis set index prefix mapping projectId -> cached count keys. */
export const IOM_LOYALTY_COUNTS_CACHE_INDEX_PREFIX = 'iom:counts:loyalty:idx';

/** TTL for LOYALTY tab count cache entries (10 minutes). */
export const IOM_LOYALTY_COUNTS_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Stable machine-readable action labels written to `iom_history.action`.
 * Audit tooling, reporting, and analytics key off these strings - keep
 * the values immutable.
 */
export enum IomHistoryActionEnum {
  IOM_CREATED = 'IOM_CREATED',
  CRM_EDIT = 'CRM_EDIT',
  CRM_DRAFT = 'CRM_DRAFT',
  CRM_SUBMIT = 'CRM_SUBMIT',
  CRM_RESUBMIT = 'CRM_RESUBMIT',
  CRM_CANCEL = 'CRM_CANCEL',
  TL_REJECT = 'TL_REJECT',
  CRM_HEAD_REJECT = 'CRM_HEAD_REJECT',
  FINANCE_REJECT = 'FINANCE_REJECT',
  FINANCE_HEAD_REJECT = 'FINANCE_HEAD_REJECT',
  TL_APPROVE = 'TL_APPROVE',
  CRM_HEAD_APPROVE = 'CRM_HEAD_APPROVE',
  FINANCE_APPROVE = 'FINANCE_APPROVE',
  FINANCE_HEAD_APPROVE = 'FINANCE_HEAD_APPROVE',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export const REJECT_STATUS_BY_ROLE = {
  CRM_TL: 'CRM_TL_REJECTED',
  CRM_HEAD: 'CRM_HEAD_REJECTED',
  FINANCE: 'FINANCE_MEMBER_REJECTED',
  FINANCE_HEAD: 'FINANCE_APPROVER_REJECTED',
} as const;
