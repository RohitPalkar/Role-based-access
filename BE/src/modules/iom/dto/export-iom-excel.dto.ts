import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { endOfDay } from 'date-fns';
import { LoyaltyPointsReleaseTypeEnum } from '../enums/iom.enums';

export class ExportIomExcelDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? endOfDay(value) : undefined))
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  iomStatus?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  invoiceStatus?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  projects?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(LoyaltyPointsReleaseTypeEnum, {
    message: 'invalid classification type',
  })
  pointsClassification?: LoyaltyPointsReleaseTypeEnum;
}
