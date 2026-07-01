import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

/**
 * Query params for `GET /eoi-management/fetch-voucher-for-mapping`.
 * Search is matched against voucher ids, unique reference, pre-EOI id, and applicant1 name/mobile.
 * Response `data` is always an array (all matches in the campaign, mapped or not).
 */
export class FetchVoucherForMappingDto {
  /** Campaign that owns both the inventory list and the voucher. */
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  campaignId: number;

  /** Free-text query from the mapping UI search box. */
  @IsNotEmptyTrimmed()
  @IsString()
  search: string;
}
