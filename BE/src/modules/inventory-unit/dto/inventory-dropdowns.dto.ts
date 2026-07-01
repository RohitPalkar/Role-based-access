import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import { parseStringToArray } from 'src/utils/transformers';

export class InventoryDropdownsDto {
  @IsNotEmptyTrimmed()
  @Type(() => Number)
  @IsNumber()
  campaignId: number;

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Tower names must be an array' })
  @IsString({ each: true })
  towerName?: string[];

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Floors must be an array' })
  @IsString({ each: true })
  floor?: string[];
}
