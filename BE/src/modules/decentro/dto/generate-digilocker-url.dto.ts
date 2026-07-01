import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { BookingAsEnum } from 'src/enums/booking-as.enum';

export class GenerateDigiLockerUrlDto {
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  redirectUrl: string;

  @IsString()
  @IsNotEmpty()
  opportunityId: string;

  @IsOptional()
  @IsEnum(BookingAsEnum, {
    message: `bookingAs must be one of the following values: ${Object.values(
      BookingAsEnum,
    ).join(', ')}`,
  })
  bookingAs?: BookingAsEnum;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lastStep?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  applicantNumber?: number;

  @IsOptional()
  @IsString()
  residentStatus: string;

  @IsOptional()
  @IsString()
  relationship: string;
}
