import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

/**
 * Request body for `POST /inventory-unit/map-unit-to-voucher`.
 * Confirms unit availability and voucher eligibility, then writes the mapping row.
 */
export class MapUnitToVoucherDto {
  /** Must match the unit’s and voucher’s campaign. */
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  campaignId: number;

  /** `project_inventory_units.id` of the row to block and link. */
  @IsNotEmptyTrimmed()
  @IsString()
  inventoryUnitId: string;

  /** Voucher `unique_reference_id` (not the numeric DB primary key). */
  @IsNotEmptyTrimmed()
  @IsString()
  voucherId: string;
}
