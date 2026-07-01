import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  ValidateIf,
  Matches,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import { PHONE_REGEX } from 'src/config/constants';
import { BookingAsEnum } from 'src/enums/booking-as.enum';

export class ReferrerDto {
  @IsOptional()
  @IsString()
  name: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.email !== undefined && o?.email.trim() !== '')
  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  houseNumber: string;

  @IsOptional()
  @IsString()
  relation: string;

  @IsOptional()
  @IsString()
  unitNumber: string;

  @IsOptional()
  @IsString()
  countryCode: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @Matches(PHONE_REGEX, {
    message: 'Please enter a valid mobile number.',
  })
  mobileNumber: string;

  @IsOptional()
  @IsString()
  propertyName: string;

  @IsOptional()
  @IsString()
  altCountryCode?: string;

  @IsOptional()
  @IsString()
  altMobileNumber?: string;

  @IsOptional()
  @IsString()
  postAgreement: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsBoolean()
  @Type(() => Boolean)
  pointsAdjustment: boolean = false;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsOptional()
  @IsString()
  signedStatus: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSignedOffline: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lastStep: number;

  @IsOptional()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;

  @IsOptional()
  @IsString()
  tower: string;

  @IsOptional()
  @IsString()
  primarySource: string;

  @IsOptional()
  @IsString()
  ownerType: string;

  @IsOptional()
  @IsString()
  residingAs: string;

  @IsOptional()
  @IsBoolean()
  isPhysicalSaleDeed: boolean;

  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  saleDeedDocument: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalRentalAgreement: boolean;

  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  rentalAgreement: string[];
}
