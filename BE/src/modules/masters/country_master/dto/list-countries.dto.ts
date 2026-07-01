import { IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListCountryMasterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;
}
