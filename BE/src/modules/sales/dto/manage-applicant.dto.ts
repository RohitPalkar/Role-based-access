import { BadRequestException } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ManageApplicantsDto {
  @IsOptional()
  @IsString()
  applicant1?: string;

  @IsOptional()
  @IsString()
  applicant2?: string;

  @IsOptional()
  @IsString()
  applicant3?: string;

  @IsOptional()
  @IsString()
  applicant4?: string;

  @IsInt()
  @Min(1)
  @Max(4)
  noOfApplicants!: number;

  @IsInt()
  @Min(0)
  lastStep!: number;
}

export type ApplicantSlot = 1 | 2 | 3 | 4;

/** Accepts "<oppId>/<slot>" where slot is 1..4 */
export function parseValues(
  v: string,
): { oppId: string; applicantNo: ApplicantSlot } | null {
  if (!v) return null;
  const [oppId, slotStr] = v.split('/');
  if (!oppId || !slotStr) return null;

  const n = Number(slotStr);
  if (!Number.isInteger(n) || n < 1 || n > 4) return null;

  return { oppId, applicantNo: n as ApplicantSlot };
}

const NEW_APPLICANT = 'new applicant';

export function validateApplicantValue(
  val: string | null | undefined,
  key: string,
) {
  if (val == null) return { type: 'null' };

  const raw = String(val).trim();
  if (!raw) return { type: 'null' };

  const lower = raw.toLowerCase();

  // only "New Applicant" (case-insensitive) allow
  if (lower.includes('new') && lower !== NEW_APPLICANT)
    throw new BadRequestException(
      `${key} value "${val}" is invalid — use "New Applicant" exactly to mark a new applicant.`,
    );

  if (lower === NEW_APPLICANT) return { type: 'new' };

  return { type: 'ref', value: raw };
}
