import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

class GuestDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;
}

class NotesDto {
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bookingAmount?: number;

  @IsOptional()
  @IsString()
  voucherId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  voucherAmount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => GuestDto)
  guest?: GuestDto;

  @IsOptional()
  @IsString()
  productInfo?: string;
}

export class CreatePaymentOrderDto {
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsNotEmptyTrimmed()
  @IsString()
  entityType: string;

  @IsNotEmptyTrimmed()
  @IsString()
  entityId: string;

  @IsOptional()
  @IsString()
  @IsIn([PaymentGatewayEnum.RAZORPAY, PaymentGatewayEnum.EASEBUZZ])
  gateway?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotesDto)
  notes?: NotesDto;

  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectId?: number;
}
