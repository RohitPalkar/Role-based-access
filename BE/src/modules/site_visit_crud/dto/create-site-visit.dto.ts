import { IsString, IsOptional, IsNumber, IsEmail } from 'class-validator';

export class CreateSiteVisitFormDto {
  @IsOptional()
  @IsNumber()
  projectId: number;

  @IsNumber()
  enquiryId: number;

  @IsString()
  mobile: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  residentialAddress: string;

  @IsOptional()
  @IsString()
  occupation: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  ownedHouseCount?: string;

  @IsOptional()
  @IsString()
  purchaseDuration: string;

  @IsOptional()
  @IsString()
  financeSource: string;

  @IsOptional()
  @IsString()
  residentialStatus: string;

  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @IsOptional()
  @IsString()
  organizationAddress: string;

  // @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  primarySource?: string;

  @IsOptional()
  @IsString()
  channelPartner?: string;

  @IsOptional()
  @IsString()
  referredBy?: string;

  @IsOptional()
  @IsString()
  exProjectName?: string;

  @IsOptional()
  @IsString()
  unitNumber?: string;

  @IsOptional()
  @IsString()
  inventoryOptions?: string;

  @IsOptional()
  @IsString()
  priceRange?: string;

  @IsOptional()
  @IsNumber()
  isWelcomeCodeUsed?: number;

  @IsOptional()
  @IsString()
  revisitCount: string;

  @IsOptional()
  @IsString()
  lastVisitDate: string;

  @IsOptional()
  @IsString()
  visitType: string;
}
