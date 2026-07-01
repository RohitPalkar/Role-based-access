export interface VoucherResponse {
  id: number;
  voucherId: string;
  uniqueReferenceId: string;
  paidVoucherId: string;
  userVoucherTrackingId: string;
  noOfApplicants: number;
  isAgreedOnTerms: boolean;
  lastStep: number;
  primarySource: string;
  secondarySource: string | null;
  tertiarySource: string | null;

  applicant1: Voucher | null;
  applicant2: Voucher | null;
  applicant3: Voucher | null;
  applicant4: Voucher | null;

  paymentDetails: PaymentDetails | null;
  unitDetails: any;
  sourceDetails: SourceDetails | null;
  eoiDetails: EOIDetails | null;

  voucherFormStatus: string;
  formPhase: string;
  paymentStatus: string;
  leadStatus: string;
  financeStatus: string;
  queueId: number | null;
  voucherSequenceId: number | null;
  standardSequenceId: number | null;
  preferentialSequenceId: number | null;

  voucherIssuedAt: string | null;
  eoiIssuedAt: string | null;

  cpLinkId: number;
  chronology: string;
  cancelReason: string | null;
  checkerRemarks: string | null;
  cancelledAt: string | null;
  cancelledFrom: string | null;
  checkedAt: string | null;
  convertRemarks: string | null;
  customerLastUpdatedAt: string | null;

  payments: Payment[];

  campaignName: string | null;
  campaignId: number | null;

  isUpgradableToEOI: boolean;
}

/* ---------------- Applicant ---------------- */

export interface Voucher {
  opportunityId: string;
  contactDetails: ContactDetails;
  personalDetails: PersonalDetails;
  professionalDetails: ProfessionalDetails;
}

export interface ContactDetails {
  ociImage: any[];
  panImage: any[];
  ociNumber: string;
  panNumber: string;
  aadhaarImage: any[];
  aadhaarNumber: string;
  isPhysicalOCI: boolean;
  isPhysicalPan: boolean;
  isSameAddress: number;

  passportImage: any[];
  passportNumber: string;

  permanentAddress: Address;
  isPhysicalAadhaar: boolean;
  isPhysicalOtherDoc: boolean;
  isPhysicalPassport: boolean;

  OCIAlternateDocType: string;
  OCIAlternateDocImage: any[];

  communicationAddress: Address;
  isPassportCurrentAddress: number;
  countryCode?: string;
  emailAddress?: string;
  contactNumber?: string;
}

export interface Address {
  city: string;
  state: string;
  country: string;
  pinCode: number;
  areaName: string;
  fullAddress: string;
  houseNumber: string;
}

/* ---------------- Personal Details ---------------- */

export interface PersonalDetails {
  dob: string;
  image: any[];
  gender: string;
  lastName: string;
  relation: string;
  firstName: string;
  nriCountry: string;
  salutation: string;
  countryCode: string;
  emailAddress: string;
  relativeName: string;
  contactNumber: string;
  maritalStatus: string;
  residentStatus: string;
  anniversaryDate: string | null;

  isPhysicalImage: boolean;
  alternateCountryCode: string;
  alternateContactNumber: string;
}

/* ---------------- Professional ---------------- */

export interface ProfessionalDetails {
  occupation: string;
  designation: string;
  annualIncome: string;
  officeAddress: string;
  officePinCode: string;
  departmentDivision: string;
  designationIfOthers: string;
  industry: string;
  industryIfOthers: string;
  organizationType: string;
  companyName: string;
  officialEmail?: string;
  companyAddress: string;
  companyPinCode: string;
  branch?: string;
  rank?: string;
}

/* ---------------- Payment Details ---------------- */

export interface PaymentDetails {
  amountPayable: number;
  totalAmountPaid: number;
  recoveryAccountDetails: RecoveryAccountDetails;
}

export interface RecoveryAccountDetails {
  bankName: string;
  ifscCode: string;
  swiftCode: string;
  payeeName: string;
  accountType: string;
  accountNumber: string;
  cancelledCheque: any[];
  isPhysicalCancelledCheque: boolean;
}

/* ---------------- Payments Array ---------------- */

export interface Payment {
  id: number;
  paidAmount: string;
  paymentMode: string;
  date: string;
  status: string;
  paymentType: string;

  paymentDetails: {
    method: string;
    drawnOn: string;
    paymentProof: any[];
    transactionNumber: string;
    isPhysicalPaymentProof: boolean;
    lastFourDigits?: string;
  };

  realisationDate: string | null;
  receiptNo: string | null;
  comments: string | null;
}

/* ---------------- Misc ---------------- */

export interface SourceDetails {
  channelPartner: string;
  contactNumber?: string;
  countryCode?: string;
  email?: string;
  name?: string;
  project?: string;
  type?: string;
  unit?: string;
  referredBy?: string;
  employeeId?: string;
  employeeName?: string;
  projectName?: string;
  activityName?: string;
}

export interface EOIDetails {
  eoiType: string;
  typology: string;
  facingDirection: string;
}
