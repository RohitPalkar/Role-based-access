import {
  IsOptional,
  IsString,
  IsDateString,
  Matches,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterVisitListDto {
  @IsOptional()
  @IsString()
  sourcingRmName?: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Matches(/^[a-z]+:(asc|desc)$/i, {
    message: 'sortBy must be in format field:asc|desc',
  })
  sortBy?: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  limit?: number;
}
