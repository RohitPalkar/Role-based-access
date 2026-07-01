import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';

export class MappingDto {
  @IsObject()
  @IsNotEmptyTrimmed()
  mapping: Record<string, string>; // e.g. applicant1..4 → opportunity/applicantNum
}

export class GroupMappingItemDto {
  @IsString()
  @IsNotEmptyTrimmed()
  opportunityId: string;

  @IsString()
  @IsNotEmptyTrimmed()
  bookingAs: string;

  @IsObject()
  @IsNotEmptyTrimmed()
  mapping: Record<string, string>;

  @IsString()
  @IsOptional()
  enquiryId?: string;
}

export class ApplicantMappingDto {
  @IsString()
  @IsOptional()
  groupId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupMappingItemDto)
  groupMapping: GroupMappingItemDto[];
}
