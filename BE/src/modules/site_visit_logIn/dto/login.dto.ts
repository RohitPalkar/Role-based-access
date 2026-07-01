import { Transform } from 'class-transformer';
import {
  IsIn,
  IsMobilePhone,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OTP_REGEX } from 'src/config/constants';

export class CheckRequestDto {
  @IsOptional()
  @IsString()
  welcomeCode?: string;

  @IsOptional()
  @IsString()
  projectInterested?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  primarySource?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'mobile must be a valid E.164 number (e.g. +919876543210)',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/^(\s*\+)?/, '') : value,
  )
  mobile?: string;

  @IsOptional()
  @IsString()
  channelPartner?: string;

  @IsOptional()
  @IsString()
  referredBy?: string;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  exProjectName?: string;

  @IsOptional()
  @IsString()
  unitNumber?: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsMobilePhone('en-IN', undefined, {
    message: 'Please enter a valid mobile number.',
  })
  mobile!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  projectInterested!: string;

  @IsString()
  @Matches(OTP_REGEX)
  otp!: string;
}

export class SendOtpDto {
  @IsString()
  @IsMobilePhone('en-IN', undefined, {
    message: 'Please enter a valid mobile number.',
  })
  mobile!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  projectInterested!: string;

  @IsString()
  @IsIn(['providenthousing.com', 'purvaland.com', 'puravankara.com'])
  brand!: string;
}

export type DateType = number | string | Date;

export interface DuplicateMeta {
  name: string; // "Dear {name}, ..."
  visitedOn: string; // "12 Oct 2025"
  source: string; // "Channel Partner", "Digital Marketing", etc.
}

export type OtpVariant = 'normal' | 'duplicate' | 'duplicate_cp';
export interface IssueOtpAndSmsOpts {
  variant?: OtpVariant; // default 'normal'
  duplicateMeta?: DuplicateMeta; // required for duplicate/duplicate_cp
  alsoSendOtp?: boolean; // default false for dup flows
  cachePatch?: { resendCount: number; windowStart: Date; lastSentAt: Date };
}

export type VersatileHubExactParams = {
  url: string;
  api: string;
  senderId: string; // 'senderid'
  campaignId: string; // 'campaignid'
  channel: string; // 'channel'
  templateId: string; // 'templateid'
  countryCodePlus: string; // '+91'
  number: string; // '9503344564'
  message: string; // either interpolated string or "{#var#}" template line
  dcs?: string; // default '0'
  shorturl?: 'NO' | 'YES'; // default 'NO'
  international?: 'NO' | 'YES'; // default 'NO'
};

export type CachePatch = {
  resendCount: number;
  windowStart: Date;
  lastSentAt: Date;
};
