import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class CreateBookingDto {
  @IsNotEmptyTrimmed()
  @IsString()
  opportunityId: string;

  @IsOptional()
  @IsString()
  enquiryId: string;

  @IsNotEmptyTrimmed()
  @IsEnum(BookingAsEnum)
  bookingAs?: BookingAsEnum;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  noOfApplicants: number;

  @IsNotEmptyTrimmed()
  @IsNumber({}, { message: 'Project ID must be a valid number.' })
  @IsPositive({ message: 'Project ID must be a positive number.' })
  projectId: number;

  @IsNotEmptyTrimmed()
  @IsNumber({}, { message: 'Brand ID must be a valid number.' })
  @IsPositive({ message: 'Brand ID must be a positive number.' })
  brandId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  fillingAs: number;

  @IsOptional()
  @IsString()
  relationBtApplicants: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(10)
  lastStep: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  primarySourceDisabled: boolean;
}
