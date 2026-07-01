import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class VerifyPaymentDto {
  @IsEnum(PaymentGatewayEnum)
  gateway: PaymentGatewayEnum;

  @IsNotEmptyTrimmed()
  @IsString()
  orderId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  paymentId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  signature: string;

  @IsOptional()
  clientResponse?: any;
}
