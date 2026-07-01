import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class MapAndConvertDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  voucherId: number;

  @IsOptional()
  @IsString()
  inventoryUnitId?: string;

  @IsNotEmptyTrimmed()
  @IsString()
  sfdcTowerId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  towerName: string;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  floor: number;

  @IsOptional()
  @IsString()
  sfdcUnitId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  unitNumber: string;

  @IsOptional()
  @IsString()
  configuration?: string;

  @IsOptional()
  @IsString()
  facing?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  areaSBA?: number;

  @IsOptional()
  @IsBoolean()
  changeUnit?: boolean;
}
