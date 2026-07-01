import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class GetFloorDropdownDto {
  @IsNotEmptyTrimmed({ message: 'projectName is required' })
  @IsString({ message: 'projectName must be a string' })
  projectName: string;

  @IsNotEmptyTrimmed({ message: 'tower is required' })
  @IsString({ message: 'tower must be a string' })
  tower: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  campaignId?: number;
}

export class GetInventoryByFloorDto extends GetFloorDropdownDto {
  @IsNotEmptyTrimmed({ message: 'floor is required' })
  @IsNumber()
  @Type(() => Number)
  floor: number;

  @IsOptional()
  @IsString({ message: 'unitNumber must be a string' })
  search?: string;
}

export class GetUnitByUnitNumberDto extends GetInventoryByFloorDto {
  @IsNotEmptyTrimmed({ message: 'Unit Number is required' })
  @IsString({ message: 'Unit Number must be a string' })
  unitNumber: string;
}
