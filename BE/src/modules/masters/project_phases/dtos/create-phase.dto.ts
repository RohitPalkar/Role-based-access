import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreatePhaseDto {
  @IsNumber()
  brandId: number;

  @IsNumber()
  cityId: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  regionId: number[];

  @IsString()
  name: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  easebuzzBookingmid?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  easebuzzMilestonemid?: string;

  @IsOptional()
  @IsString()
  sapPhaseName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'SFDC phase name cannot exceed 30 characters.' })
  sfdcPhaseName: string;

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
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpayBookingmid?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpayMilestonemid?: string;
}
