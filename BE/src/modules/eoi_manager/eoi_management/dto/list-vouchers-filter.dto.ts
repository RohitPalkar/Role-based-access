import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  parseBoolean,
  parseStringToArray,
  ToNumberArray,
} from 'src/utils/transformers';
import {
  PrimarySourceEnum,
  VoucherFormStatusEnum,
  VoucherLeadStatus,
  VoucherPaymentStatus,
  VoucherDeletionStatusEnum,
} from 'src/enums/eoi-form.enums';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { PaymentTxStatusEnum } from 'src/enums/payment-status.enum';

export class ListVouchersFilterDto extends CommonFindAllQueryDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  campaignId?: number;

  @IsOptional()
  @IsEnum(PrimarySourceEnum, {
    message: 'Please select a valid primary source.',
  })
  primarySource?: PrimarySourceEnum;

  @IsOptional()
  @IsEnum(VoucherLeadStatus, { message: 'Invalid lead status' })
  leadStatus?: VoucherLeadStatus;

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Form status must be an array' })
  @IsEnum(VoucherFormStatusEnum, {
    each: true,
    message: 'Invalid form status',
  })
  formStatus?: VoucherFormStatusEnum[];

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Payment status must be an array' })
  @IsEnum(VoucherPaymentStatus, {
    each: true,
    message: 'Invalid payment status',
  })
  paymentStatus?: VoucherPaymentStatus[];

  @IsOptional()
  @Transform(({ value }) => parseStringToArray(value))
  @IsArray({ message: 'Finance status must be an array' })
  @IsEnum(PaymentTxStatusEnum, {
    each: true,
    message: 'Invalid finance status',
  })
  financeStatus?: PaymentTxStatusEnum[];

  @IsOptional()
  @IsEnum(VoucherDeletionStatusEnum, {
    message: 'Invalid deletion status',
  })
  deletionStatus?: VoucherDeletionStatusEnum;

  @IsOptional()
  @ToNumberArray()
  @IsArray({ message: 'rmUsers must be an array of RM user IDs' })
  @IsNumber({}, { each: true, message: 'Each RM user ID must be a number' })
  rmUsers?: number[];

  @IsOptional()
  @ToNumberArray()
  @IsArray({ message: 'CP ids must be an array of RM user IDs' })
  @IsNumber({}, { each: true, message: 'Each CP ID must be a number' })
  cpLinkIds?: number[];

  @IsOptional()
  @IsString()
  unitType?: string;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  queueIdAllotted?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  rmPending?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  misPending?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  crmPending?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  eoiCollected?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  totalEoiAmount?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  isEoiDashboard?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  isEoiLeaderboard?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  isCancellationTab?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  eoiCollectedPartiallyPaid?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  totalEoiAmountCollected?: boolean;
}
