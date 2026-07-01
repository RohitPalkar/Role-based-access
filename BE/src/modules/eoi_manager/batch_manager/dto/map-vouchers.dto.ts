import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

/**
 * POST /batch/:id/map-vouchers
 *
 * Vouchers are fetched by campaignId and sorted by priority:
 *   Pref Full → Pref Partial → Std Full → Std Partial → Voucher Full → Voucher Partial
 * Overflow vouchers (beyond total slot capacity) are silently ignored.
 */
export class MapVouchersDto {
  /** Campaign from which eligible vouchers are fetched. */
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  campaignId: number;
}
