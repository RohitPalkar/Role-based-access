import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
  Min,
  Max,
  IsDate,
} from 'class-validator';

import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/config/constants';
import { ToNumberArray } from 'src/utils/transformers';
import { endOfDay } from 'date-fns';

export class CommonFindAllQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  brandId?: number[];

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? endOfDay(value) : undefined))
  endDate?: string;
}
