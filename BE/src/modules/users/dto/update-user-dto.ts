import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateUserDTO {
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @IsNumber()
  @IsOptional()
  roleId?: number;

  @IsOptional()
  @IsString()
  employeeStatus?: string;

  @IsOptional()
  @IsString()
  signatureImage?: string;

  @IsOptional()
  @IsNumber()
  groupId?: number;

  @IsOptional()
  @IsDateString()
  groupStartDate?: string;

  @IsOptional()
  @IsDateString()
  groupEndDate?: string;

  @IsOptional()
  @IsArray()
  regionIds?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(5, { message: 'Country code cannot exceed 5 characters.' })
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14, { message: 'Contact number cannot exceed 14 characters.' })
  contactNumber: string;
}
