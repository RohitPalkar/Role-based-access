import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { InventoryUnitStatusEnum } from 'src/enums/eoi-form.enums';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { parseStringToArray } from 'src/utils/transformers';

export class InventoryListDto extends CommonFindAllQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  campaignId?: number;

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Towers must be an array' })
  @IsString({ each: true })
  tower?: string[];

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Floors must be an array' })
  @IsString({ each: true })
  floor?: string[];

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Configs must be an array' })
  @IsString({ each: true })
  configuration?: string[];

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Series must be an array' })
  @IsString({ each: true })
  series?: string[];

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Facings must be an array' })
  @IsString({ each: true })
  facing?: string[];

  @IsOptional()
  @IsEnum(InventoryUnitStatusEnum)
  inventoryStatus?: InventoryUnitStatusEnum;
}
