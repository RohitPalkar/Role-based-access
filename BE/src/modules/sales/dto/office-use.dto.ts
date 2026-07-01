import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ReferrerDto } from 'src/modules/bookings/dto/update-referrer.dto';

class SalesUserDto {
  @IsOptional()
  @IsNumber()
  id: number | null;

  @IsOptional()
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  userName: string;

  @IsOptional()
  @IsString()
  signatureImage: string;
}
class SalesTeamDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  rmName: SalesUserDto;

  @IsOptional()
  @IsString()
  rmEmployeeId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  tlName: SalesUserDto;

  @IsOptional()
  @IsString()
  tlEmployeeId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  rshName: SalesUserDto;

  @IsOptional()
  @IsString()
  rshEmployeeId: string;
}

export class DocumentsDto {
  @IsOptional()
  @IsString({ each: true })
  bisMTPApproval?: string[];

  @IsOptional()
  @IsString({ each: true })
  bisPaymentPlanApproval?: string[];

  @IsOptional()
  @IsString({ each: true })
  npvSheetApproval?: string[];

  @IsOptional()
  @IsString({ each: true })
  businessHeadApproval?: string[];

  @IsOptional()
  @IsString({ each: true })
  chequeImages?: string[];

  @IsOptional()
  @IsString({ each: true })
  leadRegistrationProof?: string[];

  /*
     following documents are conditionally
  */
  // document in No documents scenario for remaining payment
  @IsOptional()
  @IsString({ each: true })
  remainingPaymentApproval?: string[];

  @IsOptional()
  @IsString({ each: true })
  approvalProof?: string[];

  @IsOptional()
  @IsString({ each: true })
  leadRegProof?: string[];

  @IsOptional()
  @IsString({ each: true })
  corporateEmailId?: string[];

  @IsOptional()
  @IsString({ each: true })
  corporateIdCard?: string[];
}

export class OfficeInfoDto {
  @IsOptional()
  @IsString()
  secondarySource?: string;

  @IsOptional()
  @IsString()
  tertiarySource?: string;

  @IsOptional()
  @IsBoolean()
  isCorporateSale?: boolean;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  cpReraNumber?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @ValidateIf((o) => o.salesTeam !== undefined)
  @IsArray()
  @IsDefined()
  @ValidateNested({ each: true })
  @Type(() => SalesTeamDto)
  salesTeam?: SalesTeamDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  preSales1Name?: SalesUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  preSales2Name?: SalesUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  preSalesHeadName?: SalesUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  loyaltyTeamName?: SalesUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  projectHeadName?: SalesUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  businessHeadName?: SalesUserDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalesUserDto)
  businessHead2Name?: SalesUserDto;
}

export class OfficeUseDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'Booking Scheme is too long only 50 characters allowed.',
  })
  bookingSchemeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'Booking Region is too long only 50 characters allowed.',
  })
  bookingRegionAsPerRM?: string;

  @IsOptional()
  @IsString()
  primarySource?: string;

  @IsOptional()
  @IsString()
  secondarySource?: string;

  @IsOptional()
  @IsString()
  tertiarySource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'Enquiry reference number is too long; max 50 characters.',
  })
  enqRefNo?: string;

  @IsOptional()
  @IsString()
  cpName?: string;

  @IsOptional()
  @IsIn(['Yes', 'No'])
  @IsBoolean()
  primarySourceDisabled?: boolean;

  @IsOptional()
  @IsIn(['Yes', 'No'])
  @IsString()
  isSoldUnderScheme?: string;

  @IsOptional()
  @IsIn(['Yes', 'No'])
  @IsString()
  isUnitSoldMTP?: string;

  @IsOptional()
  @IsIn(['Yes', 'No'])
  @IsString()
  isPaymentPlan?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Yes', 'No', 'Not Applicable'])
  isPDCCollected?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  nriCountry?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentsDto)
  documents?: DocumentsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfficeInfoDto)
  officeInfo?: OfficeInfoDto;

  @IsOptional()
  @IsBoolean()
  saveForLater?: boolean;
}

export class OfficeUseMainDto {
  @ValidateIf(
    (o) =>
      o.saveForLater == undefined ||
      (o.saveForLater === false &&
        o.referrerDetails != undefined &&
        Object.keys(o.referrerDetails).length > 0),
  )
  @ValidateNested()
  @Type(() => ReferrerDto)
  @IsOptional()
  referrerDetails: ReferrerDto;

  @ValidateIf(
    (o) =>
      o.saveForLater == undefined ||
      (o.saveForLater === false &&
        o.officeUse != undefined &&
        Object.keys(o.officeUse).length > 0),
  )
  @ValidateNested()
  @Type(() => OfficeUseDto)
  @IsOptional()
  officeUse: OfficeUseDto;

  @IsOptional()
  @IsBoolean()
  saveForLater?: boolean;
}
