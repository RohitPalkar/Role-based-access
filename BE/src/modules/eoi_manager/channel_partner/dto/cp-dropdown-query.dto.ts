import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { parseStringToArray } from 'src/utils/transformers';

export class CpDropdownQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Campaign IDs must be an array' })
  campaignId?: string[];
}
