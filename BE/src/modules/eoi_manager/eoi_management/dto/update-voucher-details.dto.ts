import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PAN_CARD_REGEX } from 'src/config/constants';
import {
  EoiDetailsDto,
  PaymentDetailsDto,
} from 'src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

class KycDetailsDto {
  @IsOptional()
  @ValidateIf((o) => o.panNumber != null && o.panNumber !== '')
  @Matches(PAN_CARD_REGEX, { message: 'Please enter a valid PAN card number.' })
  panNumber?: string;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o.panImage != null && Array.isArray(o.panImage) && o.panImage.length > 0,
  )
  @IsArray()
  @IsString({ each: true })
  panImage: string[];

  @IsOptional()
  @ValidateIf((o) => o.aadhaarNumber != null && o.aadhaarNumber !== '')
  aadhaarNumber: string;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o.aadhaarImage != null &&
      Array.isArray(o.aadhaarImage) &&
      o.aadhaarImage.length > 0,
  )
  @IsString({ each: true })
  @IsArray()
  aadhaarImage: string[];
}

export class ApplicantsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => KycDetailsDto)
  applicant1?: KycDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => KycDetailsDto)
  applicant2?: KycDetailsDto;
}

export class UpdateVoucherDetailsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EoiDetailsDto)
  eoiDetails?: EoiDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails?: PaymentDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicantsDto)
  kycDetails?: ApplicantsDto;

  @IsOptional()
  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 10, { message: 'Please select a valid resident status.' })
  residentStatus: string;
}
