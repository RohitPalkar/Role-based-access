import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  ValidateIf,
  Matches,
  IsNumber,
} from 'class-validator';
import { PHONE_REGEX } from 'src/config/constants';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class SourceAdditionalDataDto {
  // For Purva Champion
  @ValidateIf(
    (o) =>
      o.employeeName !== undefined &&
      o.employeeName !== null &&
      o.employeeName !== '',
  )
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Employee name cannot exceed 100 characters.' })
  @IsNotEmptyTrimmed()
  employeeName?: string;

  @ValidateIf(
    (o) =>
      o.employeeId !== undefined &&
      o.employeeId !== null &&
      o.employeeId !== '',
  )
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Employee ID cannot exceed 50 characters.' })
  @IsNotEmptyTrimmed()
  employeeId?: string;

  // For Loyalty/Referral - Source person details
  @ValidateIf(
    (o) =>
      o.sourceName !== undefined &&
      o.sourceName !== null &&
      o.sourceName !== '',
  )
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Source name cannot exceed 100 characters.' })
  @IsNotEmptyTrimmed()
  name?: string;

  @ValidateIf(
    (o) =>
      o.sourceEmail !== undefined &&
      o.sourceEmail !== null &&
      o.sourceEmail !== '',
  )
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid source email address.' })
  email?: string;

  @ValidateIf(
    (o) =>
      o.sourceCountryCode !== undefined &&
      o.sourceCountryCode !== null &&
      o.sourceCountryCode !== '',
  )
  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'Source country code cannot exceed 5 characters.' })
  countryCode?: string;

  @ValidateIf(
    (o) =>
      o.sourceContactNumber !== undefined &&
      o.sourceContactNumber !== null &&
      o.sourceContactNumber !== '',
  )
  @IsOptional()
  @Matches(PHONE_REGEX, {
    message: 'Please enter a valid source contact number.',
  })
  contactNumber?: string;

  @ValidateIf(
    (o) =>
      o.sourceProject !== undefined &&
      o.sourceProject !== null &&
      o.sourceProject !== '',
  )
  @IsOptional()
  @IsNumber()
  project?: number;

  @ValidateIf(
    (o) =>
      o.sourceUnit !== undefined &&
      o.sourceUnit !== null &&
      o.sourceUnit !== '',
  )
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Source unit cannot exceed 50 characters.' })
  @IsNotEmptyTrimmed()
  unit?: string;

  // For Referral only
  @ValidateIf(
    (o) =>
      o.referredBy !== undefined &&
      o.referredBy !== null &&
      o.referredBy !== '',
  )
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Referred by cannot exceed 100 characters.' })
  @IsNotEmptyTrimmed()
  referredBy?: string;

  @IsOptional()
  @IsNumber()
  campaignId?: number;

  @IsOptional()
  @IsString()
  uniqueRefId?: string;

  @ValidateIf(
    (o) =>
      o.activityName !== undefined &&
      o.activityName !== null &&
      o.activityName !== '',
  )
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Activity name cannot exceed 100 characters.' })
  @IsNotEmptyTrimmed()
  activityName?: string;
}
