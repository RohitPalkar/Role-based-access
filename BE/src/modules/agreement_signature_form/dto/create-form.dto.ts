import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEmail,
  MaxLength,
  MinLength,
  ValidateIf,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class ApplicantDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3, {
    message: 'Applicant name must be at least 3 characters long.',
  })
  @MaxLength(50, { message: 'Applicant name cannot exceed 50 characters.' })
  name: string;

  @ValidateIf((o) => o?.email !== undefined && o?.email.trim() !== '')
  @IsEmail({}, { message: 'Invalid email format.' })
  email: string;

  @IsOptional()
  @IsString()
  contactNumber: string;
}

class DocumentDto {
  @IsString()
  @MinLength(3, {
    message: 'Document name must be at least 3 characters long.',
  })
  @MaxLength(50, { message: 'Document name cannot exceed 50 characters.' })
  name: string;

  @IsString()
  @MinLength(3, { message: 'URL must be at least 3 characters long.' })
  @MaxLength(100, { message: 'URL cannot exceed 100 characters.' })
  url: string;

  @IsString()
  type: string;
}

export class AgreementSignatureDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Sales Order ID cannot exceed 100 characters.' })
  salesOrderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'Enquiry Referrence Number cannot exceed 100 characters.',
  })
  enquiryReferenceNumber?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  opportunityId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Project name cannot exceed 100 characters.' })
  projectName: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  unitNo?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'There must be at least 1 applicant.' })
  @Max(4, { message: 'No more than 4 applicants allowed.' })
  numberOfApplicants: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant1?: ApplicantDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant2?: ApplicantDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant3?: ApplicantDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant4?: ApplicantDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @IsOptional()
  @IsString()
  @Type(() => String)
  @MaxLength(100, { message: 'Document type cannot exceed 100 characters.' })
  documentType?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  @MaxLength(100, { message: 'Document Name cannot exceed 100 characters.' })
  documentName?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  internalSignatoryRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  mergeDocs?: boolean;
}
