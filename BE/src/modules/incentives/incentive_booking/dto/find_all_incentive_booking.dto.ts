import {
  IsOptional,
  IsNumber,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/config/constants';

export class FindAllBookingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Invalid page value. It must be a number.' })
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Invalid limit value. It must be a number.' })
  @Min(1)
  @Max(100)
  limit?: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  @IsIn(['regularized', 'unregularized', 'qualified'], {
    message:
      'Invalid status value. It must be one of: regularized, unregularized, or qualified.',
  })
  status?: string;

  @IsOptional()
  @IsString()
  incentiveFilter?: string;

  @IsOptional()
  @IsString()
  projectIds?: string; // Comma-separated project IDs; additional custom validation can be done later.

  @IsOptional()
  month?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year must be a valid number.' })
  year?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  rmId?: string;
}
