import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Payload for `POST /iom/generate`.
 *
 * Every NOT NULL column on `ioms` that has no DB-side default must be
 * present here (or default in the service). Optional fields map to
 * nullable columns. The whitelist/forbidNonWhitelisted ValidationPipe
 * settings reject any extra keys at the framework layer.
 */
export class GenerateIomDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookingId: number;

  // --- Financials -----------------------------------------------------------
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalBrokerageAmount: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  brokeragePercentage: number;

  // --- Customer / Referrer --------------------------------------------------
  @IsString()
  @IsNotEmpty()
  @Length(7, 20)
  customerMobile: string;

  @IsOptional()
  @IsObject()
  customerDetails?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(7, 20)
  referrerMobile?: string;

  @IsOptional()
  @IsObject()
  referrerDetails?: Record<string, unknown>;

  // --- Referral split -------------------------------------------------------
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  referralSplitType: string;

  @IsOptional()
  @IsObject()
  referralSplitRatio?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  referrerRatio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  refereeRatio?: number;

  // --- Calculated allocation ------------------------------------------------
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  referrerPoints: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refereePoints: number;

  // --- Classification -------------------------------------------------------
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  referralClassification: string;

  @IsOptional()
  @IsObject()
  loyaltyDetails?: Record<string, unknown>;
}
