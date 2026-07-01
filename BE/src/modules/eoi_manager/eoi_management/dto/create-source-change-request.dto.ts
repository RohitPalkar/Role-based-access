import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsPositive,
  MaxLength,
  ValidateNested,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import { VoucherChangeEnum } from 'src/enums/eoi-form.enums';

export class DataDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  uniqueReferenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sfdcEnquiryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'First name cannot exceed 50 characters.' })
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters.' })
  lastName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @MaxLength(100, { message: 'Email cannot exceed 100 characters.' })
  emailId: string;

  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'Country code cannot exceed 5 characters.' })
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14, { message: 'Contact number cannot exceed 14 characters.' })
  contactNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  primarySource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secondarySource?: string;

  @IsOptional()
  sourceDetails?: Record<string, any>;

  @IsOptional()
  @IsNumber({}, { message: 'amountPaid must be a number' })
  amountPaid?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  paymentIds?: number[];
}

export class CreateVoucherChangeRequestDto {
  @IsOptional()
  @IsString({ message: 'ID must be a valid string.' })
  @IsUUID('4', { message: 'ID must be a valid UUID.' })
  id?: string;

  @IsNotEmptyTrimmed({ message: 'Voucher ID is required.' })
  @IsNumber({}, { message: 'Voucher ID must be a valid number.' })
  @IsPositive({ message: 'Voucher ID must be a positive number.' })
  @Type(() => Number)
  voucherId: number;

  @IsNotEmptyTrimmed({ message: 'Current data is required.' })
  @ValidateNested()
  @Type(() => DataDto)
  currentData: DataDto;

  @IsNotEmptyTrimmed({ message: 'New data is required.' })
  @ValidateNested()
  @Type(() => DataDto)
  newData: DataDto;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  swappedFields: string[];

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(5000, { message: 'Reason cannot exceed 5000 characters.' })
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetPRID?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetEnquiryId?: string;

  @IsOptional()
  @IsEnum(VoucherChangeEnum, {
    message: "changeSource must be one of: 'SFDC', 'PRID', 'NONE'",
  })
  changeSource?: VoucherChangeEnum;
}
