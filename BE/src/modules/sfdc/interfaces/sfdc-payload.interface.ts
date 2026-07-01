export class SfdcOppPayload {
  Oppid: string;
  opportunityToApplicantType: number;
  numOfApplications: number;

  // keep these relation placeholders if downstream still reads them
  applicantRelation_2nd: string;
  applicantRelation_3nd: string;
  applicantRelation_4nd: string;
  ProjectName?: string;
  CarParkType?: string;
  UnitNo?: string;
  Floor?: string;
  BlockTower?: string;
  unitType?: string;
  SuperBuiltupAreaSFt?: string;
  TotalAgreementValue?: string;
  OppName: string;
  EmailAddress: string;
  MobileNumber: string;
  relationshipWithReference: string;
  PropoertyName: string;
  UnitNumber: string;
  Referrer_Unit_No__c: string;
  ReferralPoints: string;
  AlternatePhone: string;
  CurrentresidentialAddress: string;
  bookingFormStatus: string;
  bookingDetails: string;
  documents: Array<{ docName: string; docVal: string }>;
  Form_Fill_Started_Time: string | null;
  Form_Fill_End_Time: string | null;
  Form_fully_Signed_Time: string | null;
  NPS_Score: string | null;
  NPS_Remarks: string;
  Customer_s_Remarks_During_Booking: string;
  EnquiryReferenceNo?: string;
  Sales_Co_ordinator_Remarks?: string;
  referedEmp?: string;
  Referred_Employee_Id?: string;
  Corporate_Sales_Verification?: boolean | string;
  RERANo?: string;
  ReferralAdjustmentThroughPortal?: boolean;
  rm1Name?: string;
  RM2NameEMPNo?: string;
  RM_3name?: string;
  tl1Name?: string;
  tl2Name?: string;
  TL_3name?: string;
  rsh1Name?: string;
  rsh2Name?: string;
  RSH_3name?: string;
  PreSales1NameEMPNo?: string;
  PreSales2Name?: string;
  PreSalesHeadName?: string;
  Loyalty_Team?: string;
  Project_Head?: string;
  businessHeadName?: string;
  GST_Certificate_URL?: string;
  GSTDetails?: string;
  Referral_Count?: number;
  Transaction1ModeID?: string;
  Transaction2ModeID?: string;
  Transaction3ModeID?: string;
  BookingRegionAsPerRM?: string;
  BookingApplicationDocuments?: string;
  Booking_Application_Documents__c?: string;
  applicants?: SfdcApplicant[];
  MultiUnitBooking?: string;
  BookingCategory?: string;
  BookingAmountAdjustment?: string;
  permanentAddress?: string;
  gstNo?: string;
  panNo?: string;
  firstName?: string;
}

export interface SfdcApplicant {
  applicantType:
    | 'Primary Applicant'
    | 'Second Applicant'
    | 'Third Applicant'
    | 'Fourth Applicant';
  salutation: string;
  firstName: string;
  lastName: string;
  phone: string;
  alternatePhone: string;
  email: string;
  anniversaryDate: string;
  relationWithApplicant: string; // 'Self' for primary
  gender: string;
  occupation: string;
  birthdate: string;
  maritalStatus: string;
  residentialStatus: string;

  aadharNo: string;
  aadharURL: string;
  panNo: string;
  panURL: string;
  passportNo: string;
  ociNo: string;
  ociURL: string;
  ociAlternateType: string;
  ociAlternateURL: string;

  designation: string;
  designationOthers: string;
  educationalQualification: string;
  companyName: string;
  companyNameOthers: string;
  industry: string;
  industryOthers: string;

  perStreet: string;
  perCity: string;
  perState: string;
  perPostalCode: string;
  perCountry: string;
  comStreet: string;
  comCity: string;
  comState: string;
  comPostalCode: string;
  comCountry: string;
  countryOfResidence: string;
  gstNo: string;
  gstDetails: string;
  gstURL: string;

  orgType: string;
  Applicant_Photo_URL: string;
  PrimaryDocument: string;
  KYCMode: string;
  NameAsPerPAN: string;
  NameAsPerAaadhar: string;
  PANVerified: boolean;
  AaadharVerified: boolean;
  LegalGuardian?: string;
  MotherName?: string;
}
export interface SfdcSignatory {
  applicantType: string;
  salutation: string;
  firstName: string;
  AuthName: string;
  email: string;
  authEmail: string;
  authPhone: string;
  phone: string;
  authePAN: string;
  authAadhaar: string;
  PrimaryDocument: string;
  KYCMode: string;
  NameAsPerPAN: string;
  NameAsPerAaadhar: string;
  PANVerified: boolean;
  AaadharVerified: boolean;
}
