import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateIf,
  ArrayNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class ImageValidationDto {
  @IsString()
  @IsNotEmptyTrimmed()
  opportunityId: string;

  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;

  @IsNumber()
  @Type(() => Number)
  lastStep: number;

  @IsNumber()
  @Type(() => Number)
  applicantNumber: number;

  @ValidateIf((o) => o?.aadhaarImage !== undefined)
  // @IsString({ each: true })
  @IsArray()
  // @ArrayNotEmpty()
  aadhaarImage?: string[];

  @ValidateIf((o) => o?.panImage !== undefined)
  // @IsString({ each: true })
  @IsArray()
  // @ArrayNotEmpty()
  panImage?: string[];

  @IsString()
  @IsOptional()
  addressProofType?: string;

  @ValidateIf((o) => o?.addressProofImage !== undefined)
  @IsString({ each: true })
  @IsArray()
  @ArrayNotEmpty()
  addressProofImage?: string[];

  @IsOptional()
  @IsBoolean()
  isAadhaarSkipped?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isPanSkipped?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isPassportSkipped?: boolean = false;

  @ValidateIf((o) => o?.passportImage !== undefined)
  // @IsString({ each: true })
  @IsArray()
  // @ArrayNotEmpty()
  passportImage?: string[];

  @ValidateIf((o) => o?.ociCardImage !== undefined)
  // @IsString({ each: true })
  @IsArray()
  // @ArrayNotEmpty()
  ociCardImage?: string[];

  @IsOptional()
  @IsString()
  residentStatus: string;

  @IsOptional()
  @IsString()
  relationship: string;

  @IsOptional()
  @IsBoolean()
  isPhysicalPassport: boolean = false;

  @IsOptional()
  @IsBoolean()
  isPhysicalOCI: boolean = false;

  @IsOptional()
  @IsBoolean()
  isPhysicalAddressProof: boolean = false;
}
