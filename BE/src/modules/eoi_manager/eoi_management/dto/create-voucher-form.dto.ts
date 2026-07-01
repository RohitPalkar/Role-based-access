import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsEmail,
  IsNumber,
  IsPositive,
  IsEnum,
  ValidateIf,
  ValidateNested,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import {
  PrimarySourceEnum,
  SecondarySourceEnum,
} from 'src/enums/eoi-form.enums';
import { SourceAdditionalDataDto } from './source-additional-data.dto';

export class CreateVoucherFormDto {
  @IsNotEmptyTrimmed()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long.' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters.' })
  @IsNotEmptyTrimmed()
  firstName: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters.' })
  @IsNotEmptyTrimmed()
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'Country code cannot exceed 5 characters.' })
  countryCode: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MinLength(7, { message: 'Contact number cannot be less than 7 characters.' })
  @MaxLength(14, { message: 'Contact number cannot exceed 14 characters.' })
  contactNumber: string;

  @IsNotEmptyTrimmed()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @MaxLength(100, { message: 'Email cannot exceed 100 characters.' })
  emailId: string;

  @IsOptional()
  @IsNotEmptyTrimmed()
  @IsNumber({}, { message: 'Campaign ID must be a valid number.' })
  @IsPositive({ message: 'Campaign ID must be a positive number.' })
  campaignId?: number;

  @IsOptional()
  @IsNotEmptyTrimmed()
  @IsEnum(PrimarySourceEnum, {
    message: 'Please select a valid primary source.',
  })
  primarySource?: PrimarySourceEnum;

  @IsOptional()
  @IsNotEmptyTrimmed()
  @IsString()
  sfdcEnquiryId?: string;

  @IsOptional()
  @IsNotEmptyTrimmed()
  @IsString()
  sfdcLeadStatus?: string;

  @IsOptional()
  @ValidateIf((o) =>
    [
      PrimarySourceEnum.PURVA_PRIVILEGE,
      PrimarySourceEnum.PROVIDENT_PREMIER,
    ].includes(o.primarySource),
  )
  @IsNotEmptyTrimmed({
    message: 'Secondary source is required for Purva Privilege/Premier.',
  })
  @IsEnum(SecondarySourceEnum, {
    message: 'Please select a valid secondary source.',
  })
  secondarySource?: SecondarySourceEnum;

  @IsOptional()
  @ValidateNested()
  @Type(() => SourceAdditionalDataDto)
  sourceAdditionalData?: SourceAdditionalDataDto;

  @ValidateIf((o) => o.primarySource === PrimarySourceEnum.CHANNEL_PARTNER)
  @IsNotEmptyTrimmed({
    message:
      'Channel partner ID is required when primary source is Channel Partner.',
  })
  @IsNumber({}, { message: 'Channel partner ID must be a valid number.' })
  @IsPositive({ message: 'Channel partner ID must be a positive number.' })
  @Type(() => Number)
  cpLinkId?: number;

  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 10, { message: 'Please select a valid resident status.' })
  residentStatus: string;
}
