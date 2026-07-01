import { Transform } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Trim incoming string and normalize empty strings to `null` so the service
 * layer can treat "absent" and "explicit empty" the same way (skip update).
 */
const trimAndNullifyEmpty = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/**
 * Inbound payload from SFDC for `POST /api/sfdc/webhooks/lead-changes`.
 *
 * `ValidationPipe` runs with `whitelist: true` (the global pipe in
 * `src/main.ts` already strips unknown keys), so unknown SFDC fields are
 * dropped without rejecting the request — see the `SfdcWebhookController`
 * docstring for the full pipeline rationale.
 *
 * `PRID` is the only required field; the rest are partial-update friendly.
 * The webhook service does NOT mutate the voucher directly: it persists
 * this normalized payload as a `PENDING` row in
 * `sfdc_voucher_change_requests` for downstream admin review.
 */
export class LeadChangeWebhookDto {
  @IsDefined({ message: 'PRID is required' })
  @IsString({ message: 'PRID must be a string' })
  @IsNotEmpty({ message: 'PRID is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  prid: string;

  @IsOptional()
  @IsString({ message: 'Lead Status must be a string' })
  @Transform(trimAndNullifyEmpty)
  leadStatus?: string | null;

  @IsOptional()
  @IsString({ message: 'SVH Status must be a string' })
  @Transform(trimAndNullifyEmpty)
  svhStatus?: string | null;

  @IsOptional()
  @IsString({ message: 'Primary Source must be a string' })
  @Transform(trimAndNullifyEmpty)
  primarySource?: string | null;

  @IsOptional()
  @IsString({ message: 'Secondary Source must be a string' })
  @Transform(trimAndNullifyEmpty)
  secondarySource?: string | null;

  @IsOptional()
  @IsString({ message: 'Tertiary Source must be a string' })
  @Transform(trimAndNullifyEmpty)
  tertiarySource?: string | null;

  @IsOptional()
  @IsString({ message: 'Channel Partner Name must be a string' })
  @Transform(trimAndNullifyEmpty)
  channelPartnerName?: string | null;

  @IsOptional()
  @IsString({ message: 'Name of Referrer must be a string' })
  @Transform(trimAndNullifyEmpty)
  referrerName?: string | null;

  @IsOptional()
  @IsString({ message: 'Referrer Project Name must be a string' })
  @Transform(trimAndNullifyEmpty)
  referrerProjectName?: string | null;

  @IsOptional()
  @IsString({ message: 'Referrer Unit No must be a string' })
  @Transform(trimAndNullifyEmpty)
  referrerUnitNo?: string | null;

  @IsOptional()
  @IsString({ message: 'Referred Opportunity must be a string' })
  @Transform(trimAndNullifyEmpty)
  referredOpportunity?: string | null;

  @IsOptional()
  @IsString({ message: 'Referred Employee must be a string' })
  @Transform(trimAndNullifyEmpty)
  referredEmployee?: string | null;

  @IsOptional()
  @IsString({ message: 'Lead Owner must be a string' })
  @Transform(trimAndNullifyEmpty)
  leadOwner?: string | null;

  @IsOptional()
  @IsString({ message: 'STM2 must be a string' })
  @Transform(trimAndNullifyEmpty)
  stm2?: string | null;
}
