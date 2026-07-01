import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Matches,
  IsDefined,
  Length,
} from 'class-validator';
import { SameAddressEnum } from '../../../../enums/same-address.enum';
import {
  AccountTypeEnum,
  EOITypeEnum,
  FacingDirectionsEnum,
  VoucherFormStatusEnum,
} from '../../../../enums/eoi-form.enums';
import {
  AADHAAR_REGEX,
  DATE_REGEX,
  GST_NUMBER_REGEX,
  PAN_CARD_REGEX,
  PHONE_REGEX,
  PINCODE_REGEX,
} from '../../../../config/constants';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import {
  PaymentMethodEnum,
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { OccupationEnum } from 'src/enums/booking-form-status.enum';

// DTO for personal details of an applicant
export class PersonalDetailsDto {
  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 8, { message: 'Please select a valid salutation.' })
  salutation: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'First Name is too long.' })
  firstName: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'Last Name is too long.' })
  lastName: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 6, { message: 'Please select a valid gender.' })
  gender: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 10, { message: 'Please select a valid resident status.' })
  residentStatus: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 15, { message: 'Please select a valid relation.' })
  relation: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'Relative Name is too long.' })
  relativeName: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Please select valid dob.' })
  dob: string;

  @ValidateIf(
    (o) =>
      o?.anniversaryDate !== undefined &&
      o?.anniversaryDate !== null &&
      o?.anniversaryDate !== '',
  )
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Please select valid dob.' })
  anniversaryDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalImage: boolean;

  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 10, { message: 'Please select valid marital status.' })
  maritalStatus: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'Mother Tongue Name is too long.' })
  motherTongue: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Country Name is too long.' })
  nriCountry: string;

  @IsOptional()
  @IsBoolean()
  hasParentalConsent: boolean;

  @IsOptional()
  @IsBoolean()
  isValid: boolean;

  @IsNotEmptyTrimmed()
  @MaxLength(5, { message: 'Country Code is too long.' })
  countryCode: string;

  @IsNotEmptyTrimmed()
  @Matches(PHONE_REGEX, {
    message: 'Please enter a valid contact number.',
  })
  contactNumber: string;

  @IsNotEmptyTrimmed()
  @IsEmail()
  emailAddress: string;

  @IsOptional()
  @MaxLength(5, { message: 'Alternate Country Code is too long.' })
  alternateCountryCode: string;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o?.alternateContactNumber !== undefined &&
      o?.alternateContactNumber.trim() !== '',
  )
  @Matches(PHONE_REGEX, {
    message: 'Please enter a valid alternate contact number.',
  })
  alternateContactNumber: string;
}

// DTO for address details
class AddressDto {
  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(250, {
    message: 'Area Name should not have more than 250 characters.',
  })
  areaName: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(40, {
    message: 'House Number should not have more than 40 characters.',
  })
  houseNumber: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(100, { message: 'City name is too long.' })
  city: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'State name is too long.' })
  state: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'Country name is too long.' })
  country: string;

  @IsOptional()
  @Type(() => String)
  @MaxLength(10, { message: 'Pin Code is too long.' })
  pinCode: string;
}

// DTO for contact details of an applicant
export class ContactDetailsDto {
  @ValidateIf(
    (o) =>
      o?.panNumber !== undefined &&
      o?.panNumber !== null &&
      o?.panNumber !== '',
  )
  @IsOptional()
  @Matches(PAN_CARD_REGEX, { message: 'Please enter a valid PAN card number.' })
  panNumber: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  panImage: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalPan: boolean;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o?.aadhaarNumber !== undefined &&
      o?.aadhaarNumber !== null &&
      o?.aadhaarNumber !== '',
  )
  @Matches(AADHAAR_REGEX, {
    message: 'Please enter a valid Aadhaar card number.',
  })
  aadhaarNumber: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aadhaarImage: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalAadhaar: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  passportImage: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalPassport: boolean;

  @IsOptional()
  @MaxLength(20, { message: 'Please enter valid passport.' })
  passportNumber: string;

  @IsOptional()
  @MaxLength(20, { message: 'Please enter valid OCI number.' })
  ociNumber: string;

  @IsOptional()
  @MaxLength(100, { message: 'Document Type is too long.' })
  OCIAlternateDocType: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ociImage: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalOCI: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  OCIAlternateDocImage: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalOtherDoc: boolean;

  @IsOptional()
  @ValidateNested()
  @IsDefined()
  @Type(() => AddressDto)
  communicationAddress: AddressDto;

  @IsEnum(SameAddressEnum)
  isSameAddress: SameAddressEnum;

  @ValidateIf(
    (o) =>
      o?.isPassportCurrentAddress !== null &&
      o?.isPassportCurrentAddress !== undefined,
  )
  @IsEnum(SameAddressEnum)
  isPassportCurrentAddress: SameAddressEnum;

  @ValidateNested()
  @Type(() => AddressDto)
  permanentAddress: AddressDto;

  @IsOptional()
  @IsBoolean()
  isValid: boolean;
}

// DTO for Primary Source
export class PrimarySourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Primary source cannot exceed 100 characters.' })
  primarySource: string;

  @IsOptional()
  @IsString()
  secondarySource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Primary source cannot exceed 100 characters.' })
  tertiarySource?: string;

  @IsOptional()
  @IsString()
  unitNumber?: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  referredBy?: string;
}

// DTO for professional details of an applicant
const reqFor = (list: OccupationEnum[]) => (o: any) =>
  list.includes(o?.occupation) && o?.saveForLater === false;

export class ProfessionalDetailsDto {
  @IsNotEmptyTrimmed()
  @IsOptional()
  @IsEnum(OccupationEnum, { message: 'Please select a valid occupation.' })
  occupation?: OccupationEnum;

  @IsOptional()
  @IsString()
  @MaxLength(15, { message: 'Please select valid annual income.' })
  annualIncome: string;

  // Shared across PRIVATE_SALARIED and BUSINESS (Business)
  @ValidateIf(
    reqFor([OccupationEnum.PRIVATE_SALARIED, OccupationEnum.BUSINESS]),
  )
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Industry name is too long.' })
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Industry Name is too long.' })
  industryIfOthers: string;

  @ValidateIf(
    reqFor([OccupationEnum.PRIVATE_SALARIED, OccupationEnum.BUSINESS]),
  )
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Company name is too long.' })
  companyName?: string;

  @ValidateIf(
    reqFor([OccupationEnum.PRIVATE_SALARIED, OccupationEnum.BUSINESS]),
  )
  @IsOptional()
  @IsString()
  @MaxLength(240, { message: 'Company address is too long.' })
  companyAddress?: string;

  @ValidateIf(
    reqFor([OccupationEnum.PRIVATE_SALARIED, OccupationEnum.BUSINESS]),
  )
  @IsOptional()
  @Matches(PINCODE_REGEX, { message: 'Enter valid company pin code' })
  companyPinCode?: string;

  @ValidateIf(reqFor([OccupationEnum.PRIVATE_SALARIED]))
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Please select valid designation.' })
  designation?: string;

  @ValidateIf(reqFor([OccupationEnum.GOVT_SALARIED]))
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Please enter valid department/division' })
  departmentDivision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Please enter valid designation.' })
  designationIfOthers: string;

  // Government & Armed Forces share these:
  @ValidateIf(
    reqFor([OccupationEnum.GOVT_SALARIED, OccupationEnum.ARMED_FORCES]),
  )
  @IsOptional()
  @IsString()
  officeAddress?: string;

  @ValidateIf(
    reqFor([OccupationEnum.GOVT_SALARIED, OccupationEnum.ARMED_FORCES]),
  )
  @IsOptional()
  @Matches(PINCODE_REGEX, { message: 'Enter valid office pin code' })
  officePinCode?: string;

  // Armed Forces-only
  @ValidateIf(reqFor([OccupationEnum.ARMED_FORCES]))
  @IsOptional()
  @IsString()
  branch?: string;

  @ValidateIf(reqFor([OccupationEnum.ARMED_FORCES]))
  @IsOptional()
  @IsString()
  rank?: string;

  @IsOptional()
  @IsBoolean()
  isValid: boolean;

  // Business-specific GST details
  @ValidateIf(reqFor([OccupationEnum.BUSINESS]))
  @ValidateIf((o) => o.saveForLater !== true)
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isGstClaimed: boolean;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.isPhysicalGST !== true && o?.isGstClaimed === true)
  @IsOptional()
  @IsString()
  @Matches(GST_NUMBER_REGEX, {
    message: 'Please enter a valid GST number.',
  })
  gstNumber: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.isPhysicalGST !== true && o?.isGstClaimed === true)
  @IsOptional()
  @IsString()
  gstBusinessName: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.isPhysicalGST !== true && o?.isGstClaimed === true)
  @IsOptional()
  @IsString()
  gstLegalName: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.isPhysicalGST !== true && o?.isGstClaimed === true)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gstCertificate: string[];

  @ValidateIf((o) => o.saveForLater !== true)
  @IsOptional()
  isPhysicalGST: boolean;
}

// DTO for an applicant containing personal, contact, and professional details
export class ApplicantDto {
  @ValidateIf((o) => o.applicantNumber !== undefined)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  applicantNumber: number;

  @ValidateIf(
    (o) => o.personalDetails !== undefined && o?.saveForLater === false,
  )
  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  personalDetails?: PersonalDetailsDto;

  @ValidateIf(
    (o) => o.contactDetails !== undefined && o?.saveForLater === false,
  )
  @ValidateNested()
  @Type(() => ContactDetailsDto)
  contactDetails: ContactDetailsDto;

  @ValidateIf(
    (o) => o.professionalDetails !== undefined && o?.saveForLater === false,
  )
  @ValidateNested()
  @Type(() => ProfessionalDetailsDto)
  professionalDetails: ProfessionalDetailsDto;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;

  @ValidateIf((o) => o.saveForLater !== true && o.lastStep !== undefined)
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lastStep: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isApplicantsUpdated?: boolean;

  @ValidateIf((o) => o.saveForLater !== true && o.gstNumber)
  @IsOptional()
  @IsString()
  @Matches(GST_NUMBER_REGEX, {
    message: 'Please enter a valid GST number.',
  })
  gstNumber?: string;

  @ValidateIf((o) => o.saveForLater !== true && o.gstApplicant !== undefined)
  @IsOptional()
  @IsString()
  gstApplicant?: string;
}

export class EoiDetailsDto {
  @IsOptional()
  @IsNotEmpty()
  @IsEnum(EOITypeEnum, {
    message: 'EOI type must be either Preferential, Standard or Voucher.',
  })
  eoiType?: EOITypeEnum;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'typology is too long.' })
  typology?: string;

  @IsOptional()
  @IsEnum(FacingDirectionsEnum, { message: 'Invalid facing direction' })
  facingDirection?: FacingDirectionsEnum;

  @IsOptional()
  @ValidateIf((o) => o.saveForLater !== true)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceDto)
  preferences?: PreferenceDto[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lastStep?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;
}

export class PreferenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tower name is too long.' })
  tower?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Floor is too long.' })
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Series is too long.' })
  series?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Unit is too long.' })
  unit?: string;
}

// Enforces VoucherPaymentsDto.paymentDetails.lastFourDigits rules:
//  - required when paymentMode === OFFLINE AND paymentDetails.method === EDC_MACHINE
//  - when present, must match /^[0-9]{4}$/
@ValidatorConstraint({ name: 'voucherLastFourDigits', async: false })
class VoucherLastFourDigitsConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as VoucherPaymentsDto;
    const lastFour = obj.paymentDetails?.lastFourDigits;
    const isEdcOffline =
      obj.paymentMode === PaymentModeEnum.OFFLINE &&
      obj.paymentDetails?.method === PaymentMethodEnum.EDC_MACHINE;
    const isMissing =
      lastFour === undefined || lastFour === null || lastFour === '';
    if (isEdcOffline && isMissing) {
      return false;
    }
    if (!isMissing) {
      return /^[0-9]{4}$/.test(lastFour as string);
    }
    return true;
  }
  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as VoucherPaymentsDto;
    const lastFour = obj.paymentDetails?.lastFourDigits;
    const isEdcOffline =
      obj.paymentMode === PaymentModeEnum.OFFLINE &&
      obj.paymentDetails?.method === PaymentMethodEnum.EDC_MACHINE;
    const isMissing =
      lastFour === undefined || lastFour === null || lastFour === '';
    if (isEdcOffline && isMissing) {
      return 'Last four digits are required for EDC machine payments.';
    }
    return 'Last four digits must be exactly 4 numeric digits.';
  }
}

export class VoucherPaymentsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Paid amount should be greater than 0.' })
  paidAmount: number;

  @IsEnum(PaymentModeEnum, {
    message: 'Payment mode must be either Gateway or Offline.',
  })
  @IsNotEmpty()
  paymentMode: PaymentModeEnum;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsEnum(PaymentTxStatusEnum, {
    message: 'Payment Proof status is Invalid',
  })
  @IsNotEmpty()
  status?: PaymentTxStatusEnum;

  // Flexible payment details as JSON - each mode can have different fields
  @ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)
  @IsNotEmpty()
  @IsObject()
  @Validate(VoucherLastFourDigitsConstraint)
  paymentDetails?: {
    method?: PaymentMethodEnum;
    // EDC Machine fields
    transactionNumber?: string;
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    lastFourDigits?: string;
    // Cheque fields
    chequeNumber?: string;
    drawnOn?: string;
    // UPI fields
    upiId?: string;
    cardType?: string;
    // Online transfer fields
    transferType?: string;
    fromAccount?: string;
    // Common fields
    remarks?: string;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentProof?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chequeDepositSlip?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPhysicalPaymentProof?: boolean;
}

export class RecoveryAccountDetailsDto {
  @IsNotEmptyTrimmed({ message: 'Payee name is required' })
  @IsString({ message: 'Payee name must be a valid text' })
  payeeName: string;

  @IsNotEmptyTrimmed({ message: 'Bank name is required' })
  @IsString({ message: 'Bank name must be a valid text' })
  bankName: string;

  @IsNotEmptyTrimmed({ message: 'IFSC code is required' })
  @IsString({ message: 'IFSC code must be a valid text' })
  ifscCode: string;

  @IsOptional()
  @IsString({ message: 'SWIFT code must be a valid text' })
  swiftCode?: string;

  @IsNotEmptyTrimmed({ message: 'Account number is required' })
  @IsString({ message: 'Account number must be a valid text' })
  accountNumber: string;

  @IsNotEmpty({ message: 'Account type is required' })
  @IsEnum(AccountTypeEnum, {
    message: 'Account type must be either Savings or Current',
  })
  accountType: AccountTypeEnum;

  @IsOptional()
  @IsArray({ message: 'Cancelled cheque must be an array' })
  @IsString({
    each: true,
    message: 'Each cancelled cheque must be a valid text',
  })
  cancelledCheque?: string[];

  @IsOptional()
  @IsBoolean({ message: 'Physical cancelled cheque flag must be a boolean' })
  @Type(() => Boolean)
  isPhysicalCancelledCheque?: boolean;
}

export class PaymentDetailsDto {
  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amountPayable: number;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoucherPaymentsDto)
  payments: VoucherPaymentsDto[];

  @ValidateIf((o) => o.isCreateForm !== true)
  @ValidateNested()
  @Type(() => RecoveryAccountDetailsDto)
  recoveryAccountDetails?: RecoveryAccountDetailsDto;

  @IsOptional()
  @IsNumber()
  totalAmountPaid?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAgreedOnTerms: boolean = false;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lastStep?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCreateForm?: boolean = false;
}

class LimitedPersonalDetailsDto {
  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(30, { message: 'First Name is too long.' })
  firstName: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(30, { message: 'Last Name is too long.' })
  lastName: string;

  @IsNotEmptyTrimmed()
  @IsString()
  @Matches(DATE_REGEX, { message: 'Please select valid dob.' })
  dob: string;

  @IsOptional()
  hasParentalConsent?: boolean;

  @IsNotEmptyTrimmed()
  @MaxLength(5, { message: 'Country Code is too long.' })
  countryCode: string;

  @IsNotEmptyTrimmed()
  @Matches(PHONE_REGEX, {
    message: 'Please enter a valid contact number.',
  })
  contactNumber: string;

  @IsNotEmptyTrimmed()
  @IsEmail()
  emailAddress: string;
}

class LimitedContactDetailsDto {
  @ValidateIf(
    (o) =>
      o?.panNumber !== undefined &&
      o?.panNumber !== null &&
      o?.panNumber !== '',
  )
  @IsOptional()
  @Matches(PAN_CARD_REGEX, { message: 'Please enter a valid PAN card number.' })
  panNumber: string;

  @IsOptional()
  @ValidateIf(
    (o) =>
      o?.aadhaarNumber !== undefined &&
      o?.aadhaarNumber !== null &&
      o?.aadhaarNumber !== '',
  )
  @Matches(AADHAAR_REGEX, {
    message: 'Please enter a valid Aadhaar card number.',
  })
  aadhaarNumber: string;

  // @IsOptional()
  // @IsArray()
  // @IsString({ each: true })
  // passportImage: string[];

  // @IsOptional()
  // @MaxLength(20, { message: 'Please enter valid passport.' })
  // passportNumber: string;

  // @IsOptional()
  // @MaxLength(20, { message: 'Please enter valid OCI number.' })
  // ociNumber: string;

  // @IsOptional()
  // @IsArray()
  // @IsString({ each: true })
  // ociImage: string[];
}

// Limited DTO for applicants 3 and 4
export class ThirdFourthApplicantDto {
  @ValidateIf((o) => o.applicantNumber !== undefined)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  applicantNumber: number;

  @ValidateIf(
    (o) => o.personalDetails !== undefined && o?.saveForLater === false,
  )
  @ValidateNested()
  @Type(() => LimitedPersonalDetailsDto)
  personalDetails: LimitedPersonalDetailsDto;

  @ValidateIf(
    (o) => o.contactDetails !== undefined && o?.saveForLater === false,
  )
  @ValidateNested()
  @Type(() => LimitedContactDetailsDto)
  contactDetails: LimitedContactDetailsDto;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  lastStep: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isApplicantsUpdated?: boolean;

  @ValidateIf((o) => o.saveForLater !== true && o.gstNumber)
  @IsOptional()
  @IsString()
  @Matches(GST_NUMBER_REGEX, {
    message: 'Please enter a valid GST number.',
  })
  gstNumber?: string;

  @ValidateIf((o) => o.saveForLater !== true && o.gstApplicant !== undefined)
  @IsOptional()
  @IsString()
  gstApplicant?: string;
}

export class AgreedOnTermsDto {
  @IsNotEmpty()
  @IsBoolean()
  @Type(() => Boolean)
  agreedOnTerms: boolean;

  @IsNotEmpty()
  @IsString()
  termsVersion: string;

  @IsNotEmpty()
  @IsDateString()
  agreedAt: string;
}

export class SubmitApplicationDto {
  @IsNotEmpty()
  @IsBoolean()
  @Type(() => Boolean)
  submitForSignature: boolean;

  @IsNotEmpty()
  @IsString()
  submitterName: string;

  @IsNotEmpty()
  @IsEmail()
  submitterEmail: string;

  @IsNotEmpty()
  @IsPhoneNumber('IN')
  submitterPhone: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class DocumentReviewDto {
  @IsNotEmpty()
  @IsString()
  documentType: string;

  @IsNotEmpty()
  @IsString()
  reviewComments: string;

  @IsNotEmpty()
  @IsBoolean()
  @Type(() => Boolean)
  isApproved: boolean;

  @IsOptional()
  @IsString()
  reviewerName?: string;

  @IsOptional()
  @IsDateString()
  reviewedAt?: string;
}

export class ResetVoucherFormDto {
  @IsNotEmpty()
  @IsString()
  resetReason: string;

  @IsNotEmpty()
  @IsString()
  resetBy: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class EnableEditFormDto {
  @IsOptional()
  @IsEnum(VoucherFormStatusEnum, {
    message: 'Voucher status must be a valid voucher form status.',
  })
  voucherStatus: VoucherFormStatusEnum;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Last step must be 0 or greater.' })
  lastStep: number;
}

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  voucherId: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  voucherId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  @MinLength(6)
  otp: string;
}

export class DeletePaymentsDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  paymentId: number;

  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  voucherId: string;
}
