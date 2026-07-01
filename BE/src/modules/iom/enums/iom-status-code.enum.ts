/**
 * Status codes for the IOM workflow (v2 vocabulary).
 *
 * Values MUST match exactly the `code` column seeded by
 * `SeedIomStatusesV21781264300000`. Adding a code here without
 * adding a row in `iom_statuses` (and the appropriate transitions
 * in `iom_transitions`) will cause a runtime error from
 * `WorkflowValidationService.validateTransition` - it resolves
 * codes to ids via the database at bootstrap time.
 *
 * Workflow ordering (informational - the canonical ordering lives
 * in `iom_statuses.sequence`):
 *
 *   DRAFT
 *   -> IOM_TO_BE_CREATED
 *   -> CRM_TL_APPROVAL_PENDING   (CRM submitted; awaiting CRM TL)
 *     -> CRM_TL_REJECTED         (TL rejected; back to CRM)
 *     -> CRM_HEAD_APPROVAL_PENDING  (TL approved; awaiting CRM Head)
 *       -> CRM_HEAD_REJECTED     (Head rejected; back to CRM)
 *       -> FINANCE_MEMBER_VERIFICATION_PENDING (Head approved)
 *         -> FINANCE_MEMBER_REJECTED  (FM rejected; back to CRM)
 *         -> FINANCE_APPROVER_APPROVAL_PENDING  (FM verified)
 *           -> FINANCE_APPROVER_REJECTED (FA rejected)
 *           -> POINTS_TO_BE_UPLOADED   (FA approved; Loyalty to act)
 *             -> POINTS_UPLOADED
 *               -> INVOICE_REQUESTED_FROM_VENDOR
 *                 -> INVOICE_SUBMITTED
 *                   -> INVOICE_REJECTED_BY_FINANCE  (terminal-ish)
 *                   -> IOM_CLOSED  (terminal success)
 *
 *   OTHER_BROKERAGE_ADJUSTMENT  (CRM Head ad-hoc adjustment outside loyalty)
 *   DELETED                     (terminal soft-delete; CRM / CRM TL)
 */
export enum IomStatusCodeEnum {
  DRAFT = 'DRAFT',
  IOM_TO_BE_CREATED = 'IOM_TO_BE_CREATED',
  CRM_TL_APPROVAL_PENDING = 'CRM_TL_APPROVAL_PENDING',
  CRM_TL_REJECTED = 'CRM_TL_REJECTED',
  CRM_HEAD_APPROVAL_PENDING = 'CRM_HEAD_APPROVAL_PENDING',
  CRM_HEAD_REJECTED = 'CRM_HEAD_REJECTED',
  FINANCE_MEMBER_VERIFICATION_PENDING = 'FINANCE_MEMBER_VERIFICATION_PENDING',
  FINANCE_MEMBER_REJECTED = 'FINANCE_MEMBER_REJECTED',
  FINANCE_APPROVER_APPROVAL_PENDING = 'FINANCE_APPROVER_APPROVAL_PENDING',
  FINANCE_APPROVER_REJECTED = 'FINANCE_APPROVER_REJECTED',
  POINTS_TO_BE_UPLOADED = 'POINTS_TO_BE_UPLOADED',
  POINTS_UPLOADED = 'POINTS_UPLOADED',
  INVOICE_REQUESTED_FROM_VENDOR = 'INVOICE_REQUESTED_FROM_VENDOR',
  INVOICE_SUBMITTED = 'INVOICE_SUBMITTED',
  INVOICE_REJECTED_BY_FINANCE = 'INVOICE_REJECTED_BY_FINANCE',
  IOM_CLOSED = 'IOM_CLOSED',
  OTHER_BROKERAGE_ADJUSTMENT = 'OTHER_BROKERAGE_ADJUSTMENT',
  DELETED = 'DELETED',
}
