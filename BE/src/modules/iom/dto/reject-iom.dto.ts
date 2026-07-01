import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `POST /iom/:id/reject`.
 *
 * - `reason` is mandatory per the workflow spec
 *   ("Rejection reason mandatory"). Length capped so it fits the
 *   `ioms.rejection_reason` VARCHAR(255) column without truncation.
 */
export class RejectIomDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  reason: string;
}
