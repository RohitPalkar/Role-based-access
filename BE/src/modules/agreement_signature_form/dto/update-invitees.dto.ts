import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class InviteesDto {
  @IsNotEmptyTrimmed()
  @IsArray()
  @IsNumber({}, { each: true })
  agreementIds?: number[];

  @IsNotEmptyTrimmed()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteeDto)
  internal?: InviteeDto[];
}

class InviteeDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Invitee name must be at least 3 characters long.' })
  @MaxLength(50, { message: 'Invitee name cannot exceed 50 characters.' })
  name: string;

  @ValidateIf((o) => o?.email !== undefined && o?.email.trim() !== '')
  @IsEmail({}, { message: 'Invalid email format.' })
  email: string;

  @IsNotEmptyTrimmed()
  @MaxLength(5, { message: 'Country Code is too long.' })
  countryCode: string;

  @IsNotEmptyTrimmed()
  @IsString()
  contactNumber: string;

  // @IsOptional()
  // @IsDateString()
  // signed_at?: string;
}
