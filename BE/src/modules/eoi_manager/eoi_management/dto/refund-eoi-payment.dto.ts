import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class RefundEOIPaymentDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  voucherId: number;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  paidAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'Internal Reference Number cannot exceed 50 characters.',
  })
  internalRefNumber?: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'Transaction Id cannot exceed 50 characters.' })
  refundTransactionId: string;

  @IsOptional()
  @IsDateString({}, { message: 'Refund date must be a valid date' })
  refundDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Comments must not exceeds 500 characters.',
  })
  comments: string;
}
