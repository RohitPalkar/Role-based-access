import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ValidateIf,
  Matches,
  MaxLength,
  ArrayNotEmpty,
  MinLength,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from '../../../validations/common-validator/isNotEmptyTrimmed.validator';
import { GST_NUMBER_REGEX, PAN_CARD_REGEX } from 'src/config/constants';

class PersonalDetailsDto {
  @ValidateIf((o) => o?.image !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  image: string[];

  @ValidateIf((o) => o?.panNumber !== undefined && o?.panNumber !== null)
  @IsNotEmptyTrimmed()
  @Matches(PAN_CARD_REGEX, { message: 'Please enter a valid PAN card number.' })
  panNumber: string;

  @ValidateIf((o) => o?.panImage !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  panImage: string[];

  @ValidateIf(
    (o) => o?.aadhaarNumber !== undefined && o?.aadhaarNumber !== null,
  )
  @IsNotEmptyTrimmed()
  aadhaarNumber: string;

  @ValidateIf((o) => o?.aadhaarImage !== undefined)
  @IsString({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  aadhaarImage: string[];

  @ValidateIf(
    (o) => o?.passportNumber !== undefined && o?.passportNumber !== null,
  )
  @IsNotEmptyTrimmed()
  @MaxLength(20, { message: 'Please enter valid passport.' })
  passportNumber: string;

  @ValidateIf((o) => o?.passportImage !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  passportImage: string[];

  @ValidateIf((o) => o?.ociNumber !== undefined && o?.ociNumber !== null)
  @IsNotEmptyTrimmed()
  @MaxLength(20, { message: 'Please enter valid OCI number.' })
  ociNumber: string;

  @ValidateIf((o) => o?.ociImage !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ociImage: string[];

  @ValidateIf((o) => o?.legalGuardianDoc !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  legalGuardianDoc: string[];

  @ValidateIf((o) => o?.OCIAlternateDocImage !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  OCIAlternateDocImage: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addressProofImage: string[];
}

class ProfessionalDetailsDto {
  @IsOptional()
  @IsString()
  @Matches(GST_NUMBER_REGEX, {
    message: 'Please enter a valid GST number.',
  })
  gstNumber: string;

  @IsOptional()
  @IsString()
  gstBusinessName: string;

  @IsOptional()
  @IsString()
  gstLegalName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gstCertificate: string[];
}

class ApplicantDto {
  @ValidateIf(
    (o) => o?.personalDetails && Object.keys(o?.personalDetails).length > 0,
  )
  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  personalDetails: PersonalDetailsDto;

  @ValidateIf(
    (o) =>
      o?.professionalDetails && Object.keys(o?.professionalDetails).length > 0,
  )
  @ValidateNested()
  @Type(() => ProfessionalDetailsDto)
  professionalDetails: ProfessionalDetailsDto;
}

class PaymentProofsDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  transactionId: string;

  @IsOptional()
  @IsString({ each: true })
  paymentProof: string[];
}

export class GstDetailsDto {
  @IsOptional()
  @IsString()
  @Matches(GST_NUMBER_REGEX, {
    message: 'Please enter a valid GST number.',
  })
  gstNumber: string;

  @IsOptional()
  @IsString()
  gstBusinessName: string;

  @IsOptional()
  @IsString()
  gstApplicant: string;

  @IsOptional()
  isPhysicalGST: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gstCertificate: string[];
}
export class PostBookingDto {
  @ValidateIf(
    (o) =>
      o?.saveForLater == undefined ||
      (o?.saveForLater === false &&
        o?.applicant1 != undefined &&
        Object.keys(o?.applicant1).length > 0),
  )
  @ValidateNested()
  @Type(() => ApplicantDto)
  @IsOptional()
  applicant1: ApplicantDto;

  @ValidateIf(
    (o) =>
      o?.saveForLater == undefined ||
      (o?.saveForLater === false &&
        o?.applicant2 != undefined &&
        Object.keys(o?.applicant2).length > 0),
  )
  @ValidateNested()
  @Type(() => ApplicantDto)
  @IsOptional()
  applicant2: ApplicantDto;

  @ValidateIf(
    (o) =>
      o?.saveForLater == undefined ||
      (o?.saveForLater === false &&
        o?.applicant3 != undefined &&
        Object.keys(o?.applicant3).length > 0),
  )
  @ValidateNested()
  @Type(() => ApplicantDto)
  @IsOptional()
  applicant3: ApplicantDto;

  @ValidateIf(
    (o) =>
      o?.saveForLater == undefined ||
      (o?.saveForLater === false &&
        o?.applicant4 != undefined &&
        Object.keys(o?.applicant4).length > 0),
  )
  @ValidateNested()
  @Type(() => ApplicantDto)
  @IsOptional()
  applicant4: ApplicantDto;

  @ValidateIf(
    (o) =>
      o?.saveForLater == undefined ||
      (o?.saveForLater === false &&
        o?.paymentProofs != undefined &&
        Object.keys(o?.paymentProofs).length > 0),
  )
  @ValidateNested()
  @Type(() => PaymentProofsDto)
  @IsOptional()
  paymentProofs: PaymentProofsDto[];

  @IsOptional()
  @IsBoolean()
  saveForLater?: boolean;
}
