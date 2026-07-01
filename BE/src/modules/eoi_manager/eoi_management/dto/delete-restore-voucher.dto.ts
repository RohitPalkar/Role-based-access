import { IsEnum, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import { VoucherDeletionStatusEnum } from 'src/enums/eoi-form.enums';

export class DeleteRestoreVoucherDto {
  @Type(() => Number)
  @IsNumber()
  voucherId: number;

  @IsNotEmptyTrimmed()
  @IsEnum(VoucherDeletionStatusEnum)
  action: VoucherDeletionStatusEnum;

  @IsString()
  @IsNotEmptyTrimmed({
    message: 'Deletion remarks cannot be empty if provided',
  })
  remarks: string;
}
