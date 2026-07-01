import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  IsNumber,
  Matches,
  ValidateIf,
  MaxLength,
  IsEnum,
} from 'class-validator';
import {
  PAN_CARD_REGEX,
  PHONE_REGEX,
  UPCOMING_ESTATES_NAME,
} from 'src/config/constants';
import { ChannelPartnerStatusEnum } from 'src/enums/eoi-form.enums';

export class CreateChannelPartnerDto {
  @IsString()
  @Length(2, 100)
  cpName: string;

  @ValidateIf((o) => o.cpName === UPCOMING_ESTATES_NAME)
  @IsString()
  @Length(2, 100)
  name?: string;

  @ValidateIf(
    (o) => o?.email !== undefined && o?.email !== null && o?.email !== '',
  )
  @IsOptional()
  @IsEmail()
  email?: string;

  @ValidateIf(
    (o) =>
      o?.countryCode !== undefined &&
      o?.countryCode !== null &&
      o?.countryCode !== '',
  )
  @IsOptional()
  @IsString()
  @Length(2, 5)
  countryCode?: string;

  @ValidateIf(
    (o) =>
      o?.contactNumber !== undefined &&
      o?.contactNumber !== null &&
      o?.contactNumber !== '',
  )
  @IsOptional()
  @Matches(PHONE_REGEX, {
    message: 'Please enter a valid contact number.',
  })
  contactNumber?: string;

  @ValidateIf(
    (o) => o?.rera !== undefined && o?.rera !== null && o?.rera !== '',
  )
  @IsOptional()
  @IsString()
  rera?: string;

  @ValidateIf((o) => o?.gst !== undefined && o?.gst !== null && o?.gst !== '')
  @IsOptional()
  @IsString()
  gst?: string;

  @IsOptional()
  @IsNumber()
  campaignId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'CP id is too long.' })
  sfdcCPId?: string;

  @IsOptional()
  @IsString()
  cpType?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @ValidateIf(
    (o) =>
      o?.panNumber !== undefined &&
      o?.panNumber !== null &&
      o?.panNumber !== '',
  )
  @IsOptional()
  @Matches(PAN_CARD_REGEX, { message: 'Please enter a valid PAN card number.' })
  panNumber?: string;

  @ValidateIf(
    (o) => o?.address !== undefined && o?.address !== null && o?.address !== '',
  )
  @IsOptional()
  @IsString()
  @Length(2, 255)
  address?: string;

  @ValidateIf(
    (o) => o?.city !== undefined && o?.city !== null && o?.city !== '',
  )
  @IsOptional()
  @IsString()
  @Length(2, 100)
  city?: string;

  @ValidateIf(
    (o) => o?.pinCode !== undefined && o?.pinCode !== null && o?.pinCode !== '',
  )
  @IsOptional()
  @Type(() => String)
  @MaxLength(10, { message: 'Pin Code is too long.' })
  pinCode?: string;

  @ValidateIf(
    (o) => o?.unit !== undefined && o?.unit !== null && o?.unit !== '',
  )
  @IsOptional()
  @IsString()
  @Length(2, 100)
  unit?: string;

  @ValidateIf(
    (o) => o?.country !== undefined && o?.country !== null && o?.country !== '',
  )
  @IsOptional()
  @IsString()
  @Length(2, 100)
  country?: string;

  @ValidateIf(
    (o) => o?.state !== undefined && o?.state !== null && o?.state !== '',
  )
  @IsOptional()
  @IsString()
  @Length(2, 100)
  state?: string;

  @IsEnum(ChannelPartnerStatusEnum)
  status?: ChannelPartnerStatusEnum;
}
