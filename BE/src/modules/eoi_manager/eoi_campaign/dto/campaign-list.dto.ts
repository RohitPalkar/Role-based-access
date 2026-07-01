import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  CampaignStatusEnum,
  EoiFormType,
  EOITypeEnum,
  VoucherFormType,
  EoiCampaignStageType,
  UnitSourceType,
  VoucherAmountType,
} from 'src/enums/eoi-form.enums';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';
import { ToNumberArray } from 'src/utils/transformers';

export class ListCampaignsQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // campaign name only (for now)

  @IsOptional()
  @Transform(({ value }) =>
    String(value ?? '')
      .split(',')
      .map((v: string) => v.trim())
      .filter(Boolean)
      .map((v: string) => Number(v))
      .filter((n: number) => Number.isInteger(n)),
  )
  @IsArray()
  cityIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) =>
    String(value ?? '')
      .split(',')
      .map((v: string) => v.trim())
      .filter(Boolean),
  )
  @IsArray()
  status?: CampaignStatusEnum[];
}

export type IdName = { id: number; name: string };

export interface InventoryDetailView {
  type: string; // e.g., "2 BHK"
  minSBA?: number;
  maxSBA?: number;
  minPrice?: number;
  maxPrice?: number;
}
export class CampaignDetailsDto {
  id: number;
  enquiryCounter: number;
  voucherIdCounter: number;
  campaignName: string;
  enquiryInitials: string;
  voucherIdInitials: string;
  stdEoiInitials?: string;
  preEoiInitials?: string;
  stdEoiCounter?: number;
  preEoiCounter?: number;
  displayQueueId: string;
  queueAfterVerified: boolean;
  phase: VoucherFormType[];
  stage: EoiCampaignStageType;
  status: CampaignStatusEnum;
  brandId: IdName | null;
  cityIds: IdName[];
  developmentTypeIds: IdName[];
  inventoryTypeIds: IdName[];
  pushToSfdc: boolean;
  sfdcProjectName?: string | null;
  inventoryDetails: InventoryDetailView[] | null;
  indicativeBasePrice: string | null;
  accountDetails: {
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    swiftCode?: string;
  } | null;
  eoiFormType?: EoiFormType;
  eoiTermsAndCondition?: string;
  unitPrefStaticContent?: string;
  eoiStartDate?: Date | string;
  eoiEndDate?: Date | string;
  eoiType?: EOITypeEnum[];
  stdEoiAmount?: number;
  preEoiAmount?: number;
  voucherFormType?: EoiFormType;
  voucherAmount?: number;
  voucherTermsAndCondition?: string;
  voucherStartDate?: Date | string;
  voucherEndDate?: Date | string;
  isInventoryMapped?: boolean;
  unitSourceType?: UnitSourceType | null;
  voucherAmountType?: VoucherAmountType;
  stdEoiAmountType?: VoucherAmountType;
  preEoiAmountType?: VoucherAmountType;
  enableEOIsAllRms: boolean;
  easebuzzKey: string | null;
  easebuzzSalt: string | null;
  subMerchantId: string | null;
  availableGateways: PaymentGatewayEnum[];
  razorpayKey: string | null;
  razorpaySecret: string | null;
  thresholdAmount?: number | null;
  unitBlockDuration?: number | null;
  timerExtension?: number | null;
  approvalWindowHours?: number | null;
  unitApproverId?: IdName | null;
  project?: IdName | null;
  additionalApprovers: IdName[];
  displayUnitType: string | null;
  showAgreementValue?: boolean;
  venueName: string | null;
  venueMapLink: string | null;
  agreementDocLink: string | null;
}

export class ListCampaignBankDetailsDto {
  @ToNumberArray()
  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  campaignIds?: number[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
