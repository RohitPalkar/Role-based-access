import { Type } from 'class-transformer';
import {
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/config/constants';
import { ToNumberArray } from 'src/utils/transformers';

export class FindProjectPhasesQueryDto {
  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  cityIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  brandId?: number;

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
}
