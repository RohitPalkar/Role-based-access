import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InventoryUnitStatusEnum } from 'src/enums/eoi-form.enums';

export class UpdateInventoryUnitDto {
  @IsOptional()
  @IsEnum(InventoryUnitStatusEnum)
  @IsString()
  status?: InventoryUnitStatusEnum;
}
