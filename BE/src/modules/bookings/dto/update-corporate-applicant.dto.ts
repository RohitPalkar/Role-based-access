// corporate-applicant.dto.ts
import {
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsString,
  IsEmail,
  MaxLength,
  Length,
  Matches,
  ValidateNested,
  ValidateIf,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PAN_CARD_REGEX, PHONE_REGEX } from 'src/config/constants';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import { OpportunityIdDto } from './opportunity-id.dto';

export enum PrimaryDocumentEnum {
  AADHAAR = 'Aadhaar',
  PAN = 'PAN',
}

export class CorporatePersonalDetailsDto {
  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 8, { message: 'Please select a valid salutation.' })
  salutation: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'First Name is too long.' })
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Last Name is too long.' })
  lastName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image: string[];

  @ValidateIf((o) => o?.aadhaarNumber !== undefined && o?.aadhaarNumber !== '')
  @IsOptional()
  // @Matches(AADHAAR_REGEX, {
  //   message: 'Please enter a valid Aadhaar card number.',
  // })
  aadhaarNumber?: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsString({ each: true })
  aadhaarImage?: string[];

  @ValidateIf((o) => o?.panNumber !== undefined && o?.panNumber !== '')
  @IsOptional()
  @Matches(PAN_CARD_REGEX, { message: 'Please enter a valid PAN card number.' })
  panNumber?: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsString({ each: true })
  panImage?: string[];

  @IsOptional()
  @IsString()
  nameAsPerAadhaar?: string;

  @IsOptional()
  @IsString()
  nameAsPerPan?: string;

  @IsOptional()
  @IsEnum(PrimaryDocumentEnum)
  primaryDocument?: PrimaryDocumentEnum;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsNotEmptyTrimmed()
  @Matches(PHONE_REGEX, { message: 'Please enter a valid contact number.' })
  contactNumber: string;

  @IsNotEmptyTrimmed()
  @IsEmail()
  emailAddress: string;

  @IsOptional()
  @IsBoolean()
  isPhysicalImage: boolean;

  @IsOptional()
  @IsBoolean()
  isPhysicalPan: boolean;

  @IsOptional()
  @IsBoolean()
  isPhysicalAadhaar: boolean;

  @IsOptional()
  @IsBoolean()
  isPhysicalAddressProof: boolean;
}

export class UpdateSignatoryDto extends OpportunityIdDto {
  @IsInt()
  @Min(1)
  @Max(4)
  applicantNumber: number;

  @ValidateIf((o) => o?.saveForLater === false)
  @ValidateNested()
  @Type(() => CorporatePersonalDetailsDto)
  personalDetails?: CorporatePersonalDetailsDto;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater?: boolean;

  @IsOptional()
  @IsBoolean()
  isPartialSaved?: boolean;

  @ValidateIf((o) => o.saveForLater !== true && o.lastStep !== undefined)
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lastStep?: number;
}

export class DeleteAuthorisedSignatoryDto extends OpportunityIdDto {
  @IsInt()
  applicantId: number;
}
