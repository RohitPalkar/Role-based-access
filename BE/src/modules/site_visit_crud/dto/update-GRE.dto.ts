import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class UpdateGREDto {
  @IsEnum(['male', 'female', 'non-binary', 'not listed'])
  gender: string;

  @IsString()
  leadId: string;

  @IsOptional()
  @IsString()
  maritalStatus: string;

  @IsOptional()
  @IsString()
  purchaseReason: string;

  @IsOptional()
  @IsString()
  currentResidenceType: string;

  @IsOptional()
  @IsNumber()
  headCount: number;

  @IsOptional()
  @IsString()
  exitTime: string;

  @IsOptional()
  @IsString()
  sourcingRm: string;

  @IsOptional()
  @IsString()
  sourcingRmName: string;

  @IsOptional()
  @IsString()
  assignedRM: string;

  @IsOptional()
  @IsString()
  assignedRmName: string;

  @IsOptional()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  enquiryId: string;

  @IsOptional()
  @IsString()
  svDate: string;
}
