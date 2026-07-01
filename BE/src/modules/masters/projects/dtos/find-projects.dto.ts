import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { DEFAULT_PAGE, DEFAULT_LIMIT } from 'src/config/constants';

export class FindProjectsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @Type(() => String)
  @IsString()
  billingEntities?: string;

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

  @IsOptional()
  @IsString()
  sortBy?: string;
}
