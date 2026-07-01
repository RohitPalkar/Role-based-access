import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsDate,
} from 'class-validator';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from 'src/config/constants';
import { Transform, Type } from 'class-transformer';
import { endOfDay } from 'date-fns';

export class FindLogsQueryDto {
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? endOfDay(value) : undefined))
  endDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

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
}
