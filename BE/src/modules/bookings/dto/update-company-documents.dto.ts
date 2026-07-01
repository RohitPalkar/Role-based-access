import {
  IsString,
  ValidateNested,
  IsObject,
  IsNumber,
  IsBoolean,
  ValidateIf,
  IsArray,
  IsOptional,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OpportunityIdDto } from './opportunity-id.dto';

export class CompanyDocumentsDto {
  @ValidateIf((_, obj) => obj?.saveForLater === false)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  pan!: string[];

  @ValidateIf((_, obj) => obj?.saveForLater === false)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  gstCertificate!: string[];

  // Corporate
  @ValidateIf((_, obj) => obj?.saveForLater === false)
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  incorporationCertificate?: string[];

  @ValidateIf((_, obj) => obj?.saveForLater === false)
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memorandumOfAssociation?: string[];

  @ValidateIf((_, obj) => obj?.saveForLater === false)
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  articlesOfAssociation?: string[];

  @ValidateIf((_, obj) => obj?.saveForLater === false)
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  boardResolutionPurchase?: string[];

  //Partnership Firm
  @ValidateIf((_, obj) => obj?.saveForLater === false)
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  partnersResolutionPurchase?: string[];

  @ValidateIf((_, obj) => obj?.saveForLater === false)
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  partnershipDeed?: string[];
}

export class UpdateCompanyDocumentsDto extends OpportunityIdDto {
  @IsNumber()
  lastStep!: number;

  @IsBoolean()
  @IsOptional()
  saveForLater?: boolean = false;

  @IsObject()
  @ValidateNested()
  @Type(() => CompanyDocumentsDto)
  documents!: CompanyDocumentsDto;
}

export type BookingAs = 'Corporate' | 'Partnership Firm';

export const REQUIRED_DOCS_BY_BOOKING_AS: Record<
  BookingAs,
  (keyof CompanyDocumentsDto)[]
> = {
  Corporate: [
    'pan',
    'gstCertificate',
    'incorporationCertificate',
    'memorandumOfAssociation',
    'articlesOfAssociation',
    'boardResolutionPurchase',
  ],
  'Partnership Firm': [
    'pan',
    'gstCertificate',
    'partnersResolutionPurchase',
    'partnershipDeed',
  ],
};
