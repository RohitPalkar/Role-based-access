import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentDetailsDto } from 'src/modules/eoi_manager/voucher_forms/dto/update-voucher-form.dto';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class UpdateMappingPaymentDto {
  @IsNotEmptyTrimmed()
  @IsString()
  blockingId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  inventoryUnitId: string;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  voucherId: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails?: PaymentDetailsDto;
}
