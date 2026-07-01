import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

/**
 * Request body for `POST /inventory-unit/voucher-unit-blocking`.
 * Initiates unit blocking for customer mapping with time-based reservation.
 */
export class BlockInventoryUnitDto {
  /** Must match the unit’s and voucher’s campaign. */
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  campaignId: number;

  /** `project_inventory_units.id` of the row to block. */
  @IsNotEmptyTrimmed()
  @IsString()
  inventoryUnitId: string;

  /** Voucher `voucher.id` (from voucher search API). */
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  voucherId: number;
}
