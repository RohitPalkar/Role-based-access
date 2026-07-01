import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `POST /iom/:id/cancel`.
 *
 * Cancellation is performed by the IOM's CRM author after the IOM has
 * been submitted (status = `IOM_CREATED`) but before the CRM TL has
 * acted on it. Once the TL approves / rejects, the IOM leaves the
 * `IOM_CREATED` state and this endpoint will reject the request via
 * the workflow gate.
 *
 * - `reason` is optional context written to `iom_history.remarks` so
 *   the audit log captures why the CRM withdrew the IOM. Length capped
 *   to match the other reason / remarks DTOs in the module.
 */
export class CancelIomDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
