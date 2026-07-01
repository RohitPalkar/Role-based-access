import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class InventoryUnitFileDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  key: string;

  @IsNumber()
  campaignId?: number;
}
