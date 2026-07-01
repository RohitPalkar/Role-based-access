import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VoucherFormStatusEnum } from 'src/enums/eoi-form.enums';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class CheckerUpdatesDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  voucherId: number;

  @IsNotEmptyTrimmed()
  @IsIn(
    [
      VoucherFormStatusEnum.MIS_VERIFIED,
      VoucherFormStatusEnum.MIS_REQUESTED_CHANGES,
      VoucherFormStatusEnum.CRM_VERIFIED,
      VoucherFormStatusEnum.CRM_REQUESTED_CHANGES,
    ],
    {
      message: `Voucher status must be one of  ${VoucherFormStatusEnum.MIS_VERIFIED}, ${VoucherFormStatusEnum.MIS_REQUESTED_CHANGES}, ${VoucherFormStatusEnum.CRM_VERIFIED},${VoucherFormStatusEnum.CRM_REQUESTED_CHANGES}.`,
    },
  )
  voucherStatus: VoucherFormStatusEnum;

  @IsNotEmptyTrimmed()
  @IsString()
  @MinLength(2, {
    message: 'Remarks must be at least 2 characters long.',
  })
  @MaxLength(500, {
    message: 'Remarks must not exceeds 500 characters.',
  })
  checkerRemarks: string;
}
