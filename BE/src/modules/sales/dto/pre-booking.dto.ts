import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class PreBookingDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPreBookingSubmitted: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  primarySourceDisabled: boolean;

  @IsNumber()
  @Type(() => Number)
  agreementValue?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bookingAmount?: number;
}
