import { Transform } from 'class-transformer';
import {
  IsNumber,
  Matches,
  IsOptional,
  ValidateIf,
  IsString,
} from 'class-validator';
import { DECIMAL_REGEX } from 'src/config/constants';

export class UpdateBrandDto {
  @IsOptional()
  @IsNumber()
  salaryMultiplier?: number;

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

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpayKey?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpaySecret?: string;

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
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  easebuzzBookingmid?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  easebuzzMilestonemid?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  logo?: string;
}
