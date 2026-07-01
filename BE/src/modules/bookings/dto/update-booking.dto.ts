import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsEnum,
  Matches,
  ValidateIf,
  IsDefined,
  IsBoolean,
  IsEmail,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsObject,
  IsPositive,
  Length,
  // Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AADHAAR_REGEX,
  PAN_CARD_REGEX,
  PHONE_REGEX,
  GST_NUMBER_REGEX,
  PINCODE_REGEX,
  DATE_REGEX,
} from '../../../config/constants';
import { IsNotEmptyTrimmed } from '../../../validations/common-validator/isNotEmptyTrimmed.validator';
import {
  PaymentMethodEnum,
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { OpportunityIdDto } from './opportunity-id.dto';
import { SameAddressEnum } from 'src/enums/same-address.enum';
import {
  LegalGuardianEnum,
  OccupationEnum,
} from 'src/enums/booking-form-status.enum';

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

  @IsOptional()
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalImage: boolean;

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
  @IsArray()
  @IsString({ each: true })
  ociImage: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalOCI: boolean;

  @IsOptional()
  @MaxLength(10, { message: 'Please enter valid primary document.' })
  @IsString()
  primaryDocument?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameAsperAadhaar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameAsperPan?: string;

  @IsOptional()
  addressProofType: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addressProofImage: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalAddressProof: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Father Name is too long.' })
  fatherName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Mother Name is too long.' })
  motherName: string;

  @IsOptional()
  @IsEnum(LegalGuardianEnum, { message: 'Please select valid legal guardian.' })
  legalGuardian: LegalGuardianEnum;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  legalGuardianDoc: string[];

  @IsOptional()
  @IsBoolean()
  isPhysicalLegalGuardianDoc: boolean;
}

// DTO for address details
export class AddressDto {
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

  @IsOptional()
  @IsString()
  fullAddress: string;
}

// DTO for contact details of an applicant
export class ContactDetailsDto {
  @IsNotEmptyTrimmed()
  @MaxLength(5, { message: 'Country Code is too long.' })
  countryCode: string;

  @IsNotEmptyTrimmed()
  @Matches(PHONE_REGEX, {
    message: 'Please enter a valid contact number.',
  })
  contactNumber: string;

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

  @IsNotEmptyTrimmed()
  @IsEmail()
  emailAddress: string;

  @IsOptional()
  @Type(() => AddressDto)
  permanentAddress?: AddressDto;

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

  @IsNotEmptyTrimmed()
  @IsString()
  @Length(1, 10, { message: 'Please select valid marital status.' })
  maritalStatus: string;

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

  @IsNotEmptyTrimmed()
  @IsString()
  @MaxLength(50, { message: 'Mother Tongue Name is too long.' })
  motherTongue: string;

  @IsOptional()
  @IsBoolean()
  isValid: boolean;
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
export class BookingApplicantDto {
  @IsNotEmptyTrimmed()
  @IsString()
  opportunityId: string;

  @IsNotEmptyTrimmed()
  @IsInt()
  @Min(1)
  @Max(4)
  applicantNumber?: number;

  @ValidateIf((o) => o.saveForLater !== true && o.lastStep !== undefined)
  @IsOptional()
  @IsNumber()
  lastStep?: number;

  @ValidateIf(
    (o) => o.personalDetails !== undefined && o?.saveForLater === false,
  )
  @IsOptional()
  @Type(() => PersonalDetailsDto)
  personalDetails?: PersonalDetailsDto;

  @ValidateIf(
    (o) => o.contactDetails !== undefined && o?.saveForLater === false,
  )
  @IsOptional()
  @Type(() => ContactDetailsDto)
  contactDetails?: ContactDetailsDto;

  @ValidateIf(
    (o) => o.professionalDetails !== undefined && o?.saveForLater === false,
  )
  @IsOptional()
  @Type(() => ProfessionalDetailsDto)
  professionalDetails?: ProfessionalDetailsDto;

  @IsOptional()
  @IsBoolean()
  saveForLater?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isPartialSaved?: boolean;

  @IsOptional()
  @IsBoolean()
  isGuardianNeeded?: boolean;

  @IsOptional()
  @IsBoolean()
  hasContinuedAsMinor: boolean = false;

  @IsOptional()
  @IsString()
  contactId?: string;
}

// Enforces BookingPaymentsDto.paymentDetails.lastFourDigits format rule:
//  - always optional; when present, must match /^[0-9]{4}$/
@ValidatorConstraint({ name: 'bookingLastFourDigits', async: false })
class BookingLastFourDigitsConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as BookingPaymentsDto;
    const lastFour = obj.paymentDetails?.lastFourDigits;
    if (lastFour === undefined || lastFour === null || lastFour === '') {
      return true;
    }
    return /^[0-9]{4}$/.test(lastFour);
  }
  defaultMessage(): string {
    return 'Last four digits must be exactly 4 numeric digits.';
  }
}

export class BookingPaymentsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id?: number;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @IsPositive({ message: 'Paid amount should be a positive number.' })
  @Min(1, { message: 'Paid amount should be greater than 0.' })
  paidAmount: number;

  @IsEnum(PaymentModeEnum, {
    message: 'Payment mode must be either Gateway or Offline.',
  })
  @IsNotEmptyTrimmed()
  paymentMode: PaymentModeEnum;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @IsEnum(PaymentTxStatusEnum, {
    message: 'Payment status is Invalid',
  })
  @IsNotEmptyTrimmed()
  status?: PaymentTxStatusEnum;

  // Flexible payment details as JSON - each mode can have different fields
  @ValidateIf((o) => o.paymentMode === PaymentModeEnum.OFFLINE)
  @IsNotEmptyTrimmed()
  @IsObject()
  @Validate(BookingLastFourDigitsConstraint)
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
  @IsBoolean()
  @Type(() => Boolean)
  isPhysicalPaymentProof?: boolean;
}

// DTO for payment details
export class PaymentDetailsDto extends OpportunityIdDto {
  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsString()
  amountInWords: string;

  @IsNotEmptyTrimmed()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsArray()
  @IsDefined()
  @ValidateNested({ each: true })
  @Type(() => BookingPaymentsDto)
  payments: BookingPaymentsDto[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;

  @IsOptional()
  @IsBoolean()
  isPartialSaved: boolean;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  lastStep: number;

  @IsOptional()
  @IsBoolean()
  isNinePercentAgreement?: boolean;
}

//DTO for Unit details
export class UnitDetailsDto extends OpportunityIdDto {
  @ValidateIf((o) => o.saveForLater !== true)
  @IsString()
  projectName: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsString()
  projectBrandName: string;

  @IsOptional()
  @IsString()
  carParkType: string;

  @IsNotEmptyTrimmed()
  @IsString()
  unitNumber: string;

  @IsOptional()
  @IsString()
  floor: string;

  @IsOptional()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;

  @IsOptional()
  @IsString()
  numOfCarPark: string;

  @IsOptional()
  @IsString()
  blockTower: string;

  @IsOptional()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  primarySource: string;

  @IsOptional()
  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  unitDetailImage: string;

  @IsNotEmptyTrimmed()
  @IsNumber({}, { message: 'Booking Amount must be a number.' })
  @Min(1, { message: 'Booking Amount must be greater than 0.' })
  bookingAmount: number;

  @IsOptional()
  superBuiltArea: number;

  @IsOptional()
  carpetArea: number;

  @IsNotEmptyTrimmed()
  @IsNumber({}, { message: 'Total agreement value must be a number.' })
  @Min(1, { message: 'Total agreement value must be greater than 0.' })
  totalAgreementValue: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;

  @IsOptional()
  @IsBoolean()
  isPartialSaved: boolean;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  lastStep: number;
}

export class OtherDetailsDto {
  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsString()
  purposeOfPurchase: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsString()
  sourceOfFunding: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsOptional()
  @IsString()
  annualHouseHoldIncome: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsBoolean()
  @Type(() => Boolean)
  isGstClaimed: boolean;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.isPhysicalGST !== true && o?.isGstClaimed === true)
  @IsNotEmptyTrimmed()
  @IsString()
  @Matches(GST_NUMBER_REGEX, {
    message: 'Please enter a valid GST number.',
  })
  gstNumber: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.isPhysicalGST !== true && o?.isGstClaimed === true)
  @IsNotEmptyTrimmed()
  @IsString()
  gstBusinessName: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.isPhysicalGST !== true && o?.isGstClaimed === true)
  @IsNotEmptyTrimmed()
  @IsString()
  gstApplicant: string;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsOptional()
  isPhysicalGST: boolean;

  @ValidateIf((o) => o.saveForLater !== true)
  @ValidateIf((o) => o?.isPhysicalGST !== true && o?.isGstClaimed === true)
  @IsNotEmptyTrimmed()
  @IsArray()
  @IsString({ each: true })
  gstCertificate: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;

  @IsOptional()
  @IsBoolean()
  isPartialSaved: boolean;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  lastStep: number;
}

export class DocumentReviewDto extends OpportunityIdDto {
  @IsOptional()
  @IsString()
  documentsNote: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;

  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  lastStep: number;

  @IsOptional()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;
}
export class AgreedOnTermsDto extends OpportunityIdDto {
  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsBoolean()
  @Type(() => Boolean)
  isAgreedOnTerms: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  saveForLater: boolean;

  @ValidateIf((o) => o.saveForLater !== true)
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  lastStep: number;

  @IsOptional()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;
}

export class ResetBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Provided reason is too long.' })
  reason?: string;
}

export class SubmitApplicationDto extends OpportunityIdDto {
  @IsNotEmptyTrimmed()
  @IsBoolean()
  @Type(() => Boolean)
  isCompleted: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSignedOffline: boolean;

  @IsOptional()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;
}

export class ResendNotificationsDto extends OpportunityIdDto {
  @Type(() => Array)
  @IsArray()
  @IsString({ each: true })
  signUrls: string[];

  @IsOptional()
  @IsEnum(BookingAsEnum)
  bookingAs: BookingAsEnum;
}

export class DeleteBookingPaymentsDto {
  @IsNotEmptyTrimmed()
  @IsNumber()
  @Type(() => Number)
  paymentId: number;

  @IsNotEmptyTrimmed()
  @IsString()
  @Type(() => String)
  opportunityId: string;
}
