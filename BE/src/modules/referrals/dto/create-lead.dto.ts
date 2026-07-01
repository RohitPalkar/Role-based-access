import { IsOptional, IsString } from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class CreateLeadDto {
  @IsNotEmptyTrimmed()
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  email: string;

  @IsNotEmptyTrimmed()
  countryCode: string;

  @IsNotEmptyTrimmed()
  @IsString()
  mobileNumber: string;

  @IsNotEmptyTrimmed()
  @IsString()
  opportunityId: string;

  @IsNotEmptyTrimmed()
  @IsString()
  primarySource: string;

  @IsOptional()
  @IsString()
  secondarySource: string;

  @IsNotEmptyTrimmed()
  @IsString()
  projectName: string;

  @IsNotEmptyTrimmed()
  @IsString()
  referredApartment: string;

  @IsOptional()
  @IsString()
  projectCity: string;
}
