import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  MaxLength,
  IsDateString,
} from 'class-validator';
export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  brandId?: number;

  @IsOptional()
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @IsArray()
  regionId?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'SFDC phase name cannot exceed 30 characters.' })
  sapPhaseName?: string;

  @IsOptional()
  @IsString()
  easebuzzBookingmid?: string;

  @IsOptional()
  @IsString()
  easebuzzMilestonemid?: string;

  @IsOptional()
  @IsString()
  sfdcPhaseName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsArray()
  @IsString({ each: true })
  blockNames?: string[];

  @IsOptional()
  @IsDateString()
  possessionDate?: string;

  @IsOptional()
  @IsString()
  razorpayBookingmid?: string;

  @IsOptional()
  @IsString()
  razorpayMilestonemid?: string;
}
