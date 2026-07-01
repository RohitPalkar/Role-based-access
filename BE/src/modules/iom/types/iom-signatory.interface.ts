export type IomSignatoryRole =
  | 'CRM'
  | 'CRM TL'
  | 'CRM Head'
  | 'Finance Verifier'
  | 'Finance Approver';

/**
 * Minimal user descriptor used wherever we expose a reviewer without
 * surfacing the full Users row (e.g. additional reviewers for a stage
 * when the project has multiple TLs / Heads).
 */
export interface IomReviewerSummary {
  userId: number;
  name: string;
}

/**
 * Per-stage signatory block returned by `GET /iom/:id`.
 *
 * Invariants:
 *  - `name` and `userId` resolve to the *expected signatory* for the
 *    stage. Resolution order:
 *      1. If the stage has been completed on the IOM (FK populated) -
 *         the user who actually acted wins.
 *      2. Otherwise, if the *current caller* (the authenticated user
 *         issuing the GET) is one of the project-assigned reviewers
 *         for this role - the caller wins, even when they aren't
 *         flagged `isPrimary`. This lets the signed-in reviewer
 *         always see themselves in their own slot.
 *      3. Otherwise - the user mapped to the IOM's project for this
 *         role in `project_user_mapping`, preferring `isPrimary = true`
 *         and breaking ties on oldest `assigned_at`.
 *      4. If neither exists - both are `null`.
 *  - `signature` is non-null in two cases only:
 *      a. `hasActed === true` AND the acting user has a
 *         `signature_image` (the historical contract).
 *      b. `hasActed === false` AND the slot user is the *current
 *         caller* (step 2 above) AND that caller has a
 *         `signature_image` on their Users record. Other reviewers'
 *         signatures stay hidden until they actually sign - the
 *         pre-sign self-preview is scoped strictly to the caller's
 *         own record.
 *  - `signatureMissing === true` iff `hasActed === true` AND the
 *    acting user is missing `signature_image`. This is the audit
 *    signal for "the workflow advanced but the PDF can't be sealed".
 *    It is NOT set for the pending self-preview path - a caller
 *    without a signature_image simply sees `signature: null`.
 *  - `additionalReviewers` lists non-selected mappings for the stage
 *    (only when `hasActed` is false and the project has more than
 *    one mapping). Omitted otherwise.
 */
export interface IomSignatoryInfo {
  role: IomSignatoryRole;
  userId: number | null;
  name: string | null;
  signature: string | null;
  signedAt: Date | null;
  hasActed: boolean;
  signatureMissing: boolean;
  additionalReviewers?: IomReviewerSummary[];
}

export interface IomSignatoryBlock {
  crm: IomSignatoryInfo;
  crmTl: IomSignatoryInfo;
  crmHead: IomSignatoryInfo;
  financeVerifier: IomSignatoryInfo;
  financeApprover: IomSignatoryInfo;
}
