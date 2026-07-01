import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `POST /iom/:id/approve`.
 *
 * - `remarks` is optional. When supplied it is written to
 *   `iom_history.remarks` and surfaced in the approval-notification
 *   templates as additional context for the next approver / creator.
 *   Length capped to keep history rows compact.
 *
 * Approval has no rejection-reason equivalent: the workflow contract
 * requires a reason ONLY for rejections. The approve endpoint is
 * therefore intentionally body-light - the *fact* that the role can
 * act, plus the IOM's current status, is the entire authorisation
 * surface (enforced inside `IomApproveService` and the DB-driven
 * `WorkflowValidationService`).
 */
export class ApproveIomDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
