import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetVoucherChangeRequestDto {
  @IsNotEmpty({ message: 'Voucher ID is required.' })
  @IsNumber({}, { message: 'Voucher ID must be a valid number.' })
  @IsPositive({ message: 'Voucher ID must be a positive number.' })
  @Type(() => Number)
  voucherId: number;

  @IsOptional()
  @IsString({ message: 'ID must be a valid string.' })
  @IsUUID('4', { message: 'ID must be a valid UUID.' })
  id?: string;
}
