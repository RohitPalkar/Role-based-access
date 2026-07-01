import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

export class CustomerDetailsDto {
  @IsOptional()
  @IsString()
  ownedHouseCount?: string;

  @IsNotEmpty()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsEnum(['married', 'single'])
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  organizationAddress?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  purchaseReason?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  currentResidenceType?: string;
}
