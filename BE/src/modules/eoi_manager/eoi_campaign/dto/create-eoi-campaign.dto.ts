import {
  IsString,
  IsDateString,
  MaxLength,
  MinLength,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
  Min,
  IsUrl,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import {
  VoucherFormType,
  EoiFormType,
  EOITypeEnum,
  DisplayQueueIdEnum,
  EoiCampaignStageType,
  UnitSourceType,
  VoucherAmountType,
  DisplayUnitType,
} from 'src/enums/eoi-form.enums';
import { PaymentGatewayEnum } from 'src/enums/payment-status.enum';

class AccountDetailsDto {
  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  swiftCode?: string;
}

export class CreateEoiCampaignDto {
  @IsString()
  @MinLength(2, {
    message: 'Campaign name must be at least 2 characters long.',
  })
  @MaxLength(255, { message: 'Campaign name cannot exceed 255 characters.' })
  @IsNotEmptyTrimmed()
  campaignName: string;

  @IsString()
  @MinLength(2, {
    message: 'Enquiry initials must be at least 2 characters long.',
  })
  @MaxLength(15, { message: 'Enquiry initials cannot exceed 15 characters.' })
  @IsNotEmptyTrimmed()
  enquiryInitials: string;

  @IsNumber()
  @Type(() => Number)
  enquiryCounter: number;

  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: 'Voucher ID initials must be at least 2 characters long.',
  })
  @MaxLength(15, {
    message: 'Voucher ID initials cannot exceed 15 characters.',
  })
  @IsNotEmptyTrimmed()
  voucherIdInitials?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  voucherIdCounter?: number;

  @ValidateIf(
    (o) =>
      o.phase?.includes(VoucherFormType.EOI) &&
      o.eoiType?.includes(EOITypeEnum.STANDARD),
  )
  @IsNotEmptyTrimmed({
    message:
      'Standard EOI initials is required when EOI type includes Standard',
  })
  @IsString()
  @MinLength(2, {
    message: 'Standard EOI initials must be at least 2 characters long.',
  })
  @MaxLength(15, {
    message: 'Standard EOI initials cannot exceed 15 characters.',
  })
  stdEoiInitials?: string;

  @ValidateIf(
    (o) =>
      o.phase?.includes(VoucherFormType.EOI) &&
      o.eoiType?.includes(EOITypeEnum.STANDARD),
  )
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  stdEoiCounter?: number;

  @ValidateIf(
    (o) =>
      o.phase?.includes(VoucherFormType.EOI) &&
      o.eoiType?.includes(EOITypeEnum.PREFERENTIAL),
  )
  @IsNotEmptyTrimmed({
    message:
      'Preferential EOI initials is required when EOI type includes Preferential',
  })
  @IsString()
  @MinLength(2, {
    message: 'Preferential EOI initials must be at least 2 characters long.',
  })
  @MaxLength(15, {
    message: 'Preferential EOI initials cannot exceed 15 characters.',
  })
  preEoiInitials?: string;

  @ValidateIf(
    (o) =>
      o.phase?.includes(VoucherFormType.EOI) &&
      o.eoiType?.includes(EOITypeEnum.PREFERENTIAL),
  )
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  preEoiCounter?: number;

  @IsOptional()
  @IsEnum(EoiCampaignStageType, {
    message: 'Stage must be either Launch or Pre Fill',
  })
  stage?: EoiCampaignStageType;

  @IsNotEmptyTrimmed()
  @IsArray({ message: 'Phase must be an array' })
  @ArrayMinSize(1, { message: 'Phase must contain at least one value' })
  @ArrayMaxSize(2, { message: 'Phase can contain at most two values' })
  @IsEnum(VoucherFormType, {
    each: true,
    message: 'Each phase value must be either VOUCHER or EOI',
  })
  phase: VoucherFormType[];

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.VOUCHER))
  @IsNotEmptyTrimmed({
    message: 'Voucher start date is required when phase includes VOUCHER',
  })
  @IsDateString({}, { message: 'Voucher start date must be a valid date.' })
  voucherStartDate?: string;

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.VOUCHER))
  @IsNotEmptyTrimmed({
    message: 'Voucher end date is required when phase includes VOUCHER',
  })
  @IsDateString({}, { message: 'Voucher end date must be a valid date.' })
  voucherEndDate?: string;

  @IsNotEmptyTrimmed()
  @IsNumber({}, { message: 'Brand ID must be a valid number' })
  @Type(() => Number)
  brandId: number;

  @IsNotEmptyTrimmed()
  @IsArray({ message: 'Cities must be an array' })
  @ArrayMinSize(1, { message: 'At least one city must be selected' })
  @IsNumber({}, { each: true, message: 'Each city ID must be a valid number' })
  @Type(() => Number)
  cityIds: number[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  pushToSfdc?: boolean = false;

  @IsOptional()
  @IsString()
  sfdcProjectName?: string;

  @IsNotEmptyTrimmed()
  @IsArray({ message: 'Development types must be an array' })
  @ArrayMinSize(1, {
    message: 'At least one development type must be selected',
  })
  @IsNumber(
    {},
    { each: true, message: 'Each development type ID must be a valid number' },
  )
  @Type(() => Number)
  developmentTypeIds: number[];

  @IsNotEmptyTrimmed()
  @IsArray({ message: 'Inventory types must be an array' })
  @ArrayMinSize(1, { message: 'At least one inventory type must be selected' })
  @IsNumber(
    {},
    { each: true, message: 'Each inventory type ID must be a valid number' },
  )
  @Type(() => Number)
  inventoryTypeIds: number[];

  @IsOptional()
  @IsString()
  indicativeBasePrice?: string;

  @IsArray({ message: 'Inventory details must be an array' })
  @ValidateNested({ each: true })
  @Type(() => InventoryDetailDto)
  inventoryDetails?: InventoryDetailDto[];

  @IsNotEmptyTrimmed()
  @ValidateNested()
  @Type(() => AccountDetailsDto)
  accountDetails?: AccountDetailsDto;

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.VOUCHER))
  @IsNotEmptyTrimmed({
    message: 'Voucher form type is required when phase includes VOUCHER',
  })
  @IsEnum(EoiFormType, { message: 'Voucher form type must be Basic or KYC' })
  voucherFormType?: EoiFormType;

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.EOI))
  @IsNotEmptyTrimmed({
    message: 'EOI form type is required when phase includes EOI',
  })
  @IsEnum(EoiFormType, { message: 'EOI form type must be Basic or KYC' })
  eoiFormType?: EoiFormType;

  @ValidateIf(
    (o) =>
      o.phase?.includes(VoucherFormType.VOUCHER) &&
      o.voucherAmountType === VoucherAmountType.FIXED,
  )
  @IsNotEmptyTrimmed({
    message: 'Voucher amount is required when phase includes VOUCHER',
  })
  @IsNumber({}, { message: 'Voucher amount must be a valid number' })
  @Type(() => Number)
  voucherAmount?: number;

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.VOUCHER))
  @IsNotEmptyTrimmed({
    message:
      'Voucher terms and condition is required when phase includes VOUCHER',
  })
  @IsString()
  voucherTermsAndCondition?: string;

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.EOI))
  @IsNotEmptyTrimmed({
    message: 'EOI terms and condition is required when phase includes EOI',
  })
  @IsString()
  eoiTermsAndCondition?: string;

  @IsOptional()
  @IsString()
  unitPrefStaticContent?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isInventoryMapped?: boolean;

  @ValidateIf((o) => o.isInventoryMapped === true)
  @IsNotEmptyTrimmed({
    message: 'Unit source type is required when inventory is mapped',
  })
  @IsEnum(UnitSourceType, {
    message: 'Unit source type must be either Database or SFDC',
  })
  unitSourceType?: UnitSourceType;

  @IsOptional()
  @IsEnum(VoucherAmountType, {
    message: 'Voucher amount type must be either Fixed or BHK Wise',
  })
  voucherAmountType?: VoucherAmountType;

  @IsOptional()
  @IsEnum(VoucherAmountType, {
    message: 'Standard EOI amount type must be either Fixed or BHK Wise',
  })
  stdEoiAmountType?: VoucherAmountType;

  @IsOptional()
  @IsEnum(VoucherAmountType, {
    message: 'Preferential EOI amount type must be either Fixed or BHK Wise',
  })
  preEoiAmountType?: VoucherAmountType;

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.EOI))
  @IsNotEmptyTrimmed({
    message: 'EOI start date is required when phase includes EOI',
  })
  @IsDateString({}, { message: 'EOI start date must be a valid date' })
  eoiStartDate?: string;

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.EOI))
  @IsNotEmptyTrimmed({
    message: 'EOI end date is required when phase includes EOI',
  })
  @IsDateString({}, { message: 'EOI end date must be a valid date' })
  eoiEndDate?: string;

  @ValidateIf((o) => o.phase?.includes(VoucherFormType.EOI))
  @IsNotEmptyTrimmed({
    message: 'EOI type is required when phase includes EOI',
  })
  @IsArray({ message: 'EOI type must be an array' })
  @ArrayMinSize(1, { message: 'At least one EOI type must be selected' })
  @IsEnum(EOITypeEnum, {
    each: true,
    message: 'Each EOI type must be Preferential or Standard or Voucher',
  })
  eoiType?: EOITypeEnum[];

  @ValidateIf(
    (o) =>
      o.phase?.includes(VoucherFormType.EOI) &&
      o.eoiType?.includes(EOITypeEnum.STANDARD) &&
      o.stdEoiAmountType === VoucherAmountType.FIXED,
  )
  @IsNotEmptyTrimmed({
    message: 'Standard EOI amount is required when EOI type includes Standard',
  })
  @IsNumber({}, { message: 'Standard EOI amount must be a valid number' })
  @Min(1, { message: 'Standard EOI amount must be greater than 0' })
  @Type(() => Number)
  stdEoiAmount?: number;

  @ValidateIf(
    (o) =>
      o.phase?.includes(VoucherFormType.EOI) &&
      o.eoiType?.includes(EOITypeEnum.PREFERENTIAL) &&
      o.preEoiAmountType === VoucherAmountType.FIXED,
  )
  @IsNotEmptyTrimmed({
    message:
      'Preferential EOI amount is required when EOI type includes Preferential',
  })
  @IsNumber({}, { message: 'Preferential EOI amount must be a valid number' })
  @Min(1, { message: 'Preferential EOI amount must be greater than 0' })
  @Type(() => Number)
  preEoiAmount?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  queueAfterVerified?: boolean = false;

  @IsNotEmptyTrimmed()
  @IsEnum(DisplayQueueIdEnum)
  displayQueueId: DisplayQueueIdEnum;

  @IsOptional()
  @IsString()
  subMerchantId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enableEOIsAllRms?: boolean = false;

  @IsOptional()
  @IsString()
  easebuzzKey?: string;

  @IsOptional()
  @IsString()
  easebuzzSalt?: string;

  @IsArray({ message: 'Available gateways must be an array' })
  @ArrayMinSize(1, { message: 'At least one gateway must be selected' })
  @IsEnum(PaymentGatewayEnum, {
    each: true,
    message: 'Available gateway must be Razorpay or Easebuzz',
  })
  availableGateways: PaymentGatewayEnum[];

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpayKey?: string;

  @IsOptional()
  @Transform(({ value }) => (value?.trim() === '' ? null : value))
  @IsString()
  razorpaySecret?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  thresholdAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitBlockDuration?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  timerExtension?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  approvalWindowHours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitApproverId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  additionalApprovers?: number[];

  @IsOptional()
  @IsEnum(DisplayUnitType)
  displayUnitType?: DisplayUnitType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectId?: number;

  @IsOptional()
  @IsBoolean()
  showAgreementValue?: boolean;

  @IsOptional()
  @IsString({ message: 'Venue name must be a string.' })
  @IsNotEmptyTrimmed({ message: 'Venue name is required.' })
  venueName?: string;

  @IsOptional()
  @IsUrl(
    {},
    {
      message: 'Venue map link must be a valid URL.',
    },
  )
  venueMapLink?: string;

  @IsOptional()
  @IsUrl(
    {},
    {
      message: 'Agreement document link must be a valid URL.',
    },
  )
  agreementDocLink: string;
}

@ValidatorConstraint({ name: 'MinLessThanMax', async: false })
class MinLessThanMax implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const obj = args.object as any;
    const [minField] = args.constraints;
    const minVal = Number(obj[minField]);
    const maxVal = Number(value);

    if (Number(minVal) || Number(maxVal)) return true;

    return maxVal >= minVal;
  }

  defaultMessage(args: ValidationArguments) {
    const [minField] = args.constraints;
    return `${args.property} cannot be less than ${minField}`;
  }
}

export class InventoryDetailDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum SBA must be a valid number' })
  @Type(() => Number)
  minSBA?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Maximum SBA must be a valid number' })
  @Type(() => Number)
  @Validate(MinLessThanMax, ['minSBA'])
  maxSBA?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum price must be a valid number' })
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Maximum price must be a valid number' })
  @Type(() => Number)
  @Validate(MinLessThanMax, ['minPrice'])
  maxPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Voucher amount must be a valid number' })
  @Type(() => Number)
  @Min(0, { message: 'Voucher amount must be greater than or equal to 0' })
  voucherAmt?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Standard EOI amount must be a valid number' })
  @Type(() => Number)
  @Min(0, { message: 'Standard EOI amount must be greater than or equal to 0' })
  standardEOIAmt?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Preferential EOI amount must be a valid number' })
  @Type(() => Number)
  @Min(0, {
    message: 'Preferential EOI amount must be greater than or equal to 0',
  })
  preferentialEOIAmt?: number;
}
