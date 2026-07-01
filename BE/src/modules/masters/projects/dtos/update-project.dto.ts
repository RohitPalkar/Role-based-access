import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsArray,
  IsInt,
  ArrayMinSize,
  Matches,
  IsOptional,
  Validate,
  ValidateIf,
  IsEnum,
} from 'class-validator';
import { DECIMAL_REGEX } from 'src/config/constants';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';
import { IsNotFutureDateConstraint } from 'src/validations/dateValidator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @IsNumber()
  brandId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one phase is required' })
  @IsInt({ each: true })
  phaseIds?: number[];

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @ValidateIf((o) => {
    return (
      o?.reraRegularization !== undefined &&
      o?.reraRegularization?.trim() !== ''
    );
  })
  @Matches(DECIMAL_REGEX, {
    message:
      'reraRegularization must be a decimal with up to three digits after the decimal point',
  })
  reraRegularization?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @ValidateIf((o) => {
    return o?.reraPayable !== undefined && o?.reraPayable?.trim() !== '';
  })
  @Matches(DECIMAL_REGEX, {
    message:
      'reraPayable must be a decimal with up to three digits after the decimal point',
  })
  reraPayable?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @ValidateIf((o) => {
    return (
      o?.rtmRegularization !== undefined && o?.rtmRegularization?.trim() !== ''
    );
  })
  @Matches(DECIMAL_REGEX, {
    message:
      'rtmRegularization must be a decimal with up to three digits after the decimal point',
  })
  rtmRegularization?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @ValidateIf((o) => {
    return o?.rtmPayable !== undefined && o?.rtmPayable?.trim() !== '';
  })
  @Matches(DECIMAL_REGEX, {
    message:
      'rtmPayable must be a decimal with up to three digits after the decimal point',
  })
  rtmPayable?: string;

  @IsOptional()
  @IsNumber({}, { message: 'maxQualificationDay must be a number' })
  maxQualificationDays?: number;

  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @Validate(IsNotFutureDateConstraint)
  maxQualificationEffectiveFrom?: Date;

  @IsOptional()
  @IsString()
  easebuzzBookingmid?: string;

  @IsOptional()
  @IsString()
  easebuzzMilestonemid?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  easebuzzBookingSalt?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  easebuzzBookingKey?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  easebuzzMilestoneSalt?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  easebuzzMilestoneKey?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tlIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  crmIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  greIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  bisIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  financeIds?: number[];

  @IsOptional()
  @IsNumber()
  rshId?: number;

  @IsOptional()
  @IsNumber()
  phId?: number;

  @IsArray({ message: 'Available gateways must be an array' })
  @ArrayMinSize(1, { message: 'At least one gateway must be selected' })
  @IsEnum(PaymentGatewayEnum, {
    each: true,
    message: 'Available gateway must be Razorpay or Easebuzz',
  })
  availableGateways: PaymentGatewayEnum[];

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpayKey?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpaySecret?: string;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsString()
  projectImage?: string;

  @IsOptional()
  @IsString()
  sfdcProjectName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codename?: string[];

  @IsOptional()
  @IsString()
  jvPartnerLogo?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  buddyRMs?: number[];

  @IsOptional()
  @IsNumber()
  agreementPercentage?: number;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpayBookingmid?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpayMilestonemid?: string;
}
