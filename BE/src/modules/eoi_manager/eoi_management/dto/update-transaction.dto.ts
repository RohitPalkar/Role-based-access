import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentTxStatusEnum } from 'src/enums/payment-status.enum';

export class UpdateTransactionDto {
  @IsNotEmpty()
  @IsEnum(PaymentTxStatusEnum, {
    message: 'Status must be one of: Verified, Rejected, Reversed',
  })
  status: PaymentTxStatusEnum;

  @IsOptional()
  @IsDateString({}, { message: 'Realisation date must be a valid date' })
  realisationDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Comments cannot exceed 500 characters' })
  comments?: string;

  @IsOptional()
  @IsString({ message: 'Receipt number must be a valid string' })
  @Type(() => String)
  @MaxLength(50, { message: 'Receipt number cannot exceed 50 characters' })
  receiptNo?: string;
}
