import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsPositive,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import { VoucherChangeRequestStatus } from 'src/enums/eoi-form.enums';

export class ApproveVoucherChangeRequestDto {
  @IsNotEmptyTrimmed({ message: 'ID is required.' })
  @IsString({ message: 'ID must be a valid string.' })
  @IsUUID('4', { message: 'ID must be a valid UUID.' })
  id: string;

  @IsNotEmptyTrimmed({ message: 'Voucher ID is required.' })
  @IsNumber({}, { message: 'Voucher ID must be a valid number.' })
  @IsPositive({ message: 'Voucher ID must be a positive number.' })
  @Type(() => Number)
  voucherId: number;

  @IsNotEmptyTrimmed({ message: 'Status is required.' })
  @IsEnum(VoucherChangeRequestStatus, {
    message: `Status must be one of: ${Object.values(VoucherChangeRequestStatus).join(', ')}`,
  })
  status: VoucherChangeRequestStatus;

  @ValidateIf((o) => o.status === VoucherChangeRequestStatus.APPROVED)
  @IsString({ message: 'Approval proof must be a valid string.' })
  @MaxLength(1000, {
    message: 'Approval proof cannot exceed 1000 characters.',
  })
  approvalProof?: string;

  @IsOptional()
  @IsString({ message: 'Remark must be a valid string.' })
  @MinLength(2, {
    message: 'Remark must be at least 2 characters long.',
  })
  @MaxLength(500, {
    message: 'Remark cannot exceed 500 characters.',
  })
  remark?: string;
}
