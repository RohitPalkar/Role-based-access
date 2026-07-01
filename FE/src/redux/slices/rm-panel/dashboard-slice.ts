import { createSlice } from '@reduxjs/toolkit';

import {
  extractSignature,
  getBookingDocuments,
  uploadSignatureFile,
} from 'src/redux/actions/rm-panel/upload-actions';

import {
  searchSFDCUsers,
  officeUseDetails,
  getMasterDataList,
  getApplicantDetails,
  getBookingApplicants,
  getOpportunityDetails,
  searchSalesTeamDropdown,
} from '../../actions/rm-panel/dashboard-actions';

export interface OpportunityData {
  OppId: string;
  OppName: string;
  ProjectName: string;
  UnitNo: string;
  bookingFormStatus?: string;
  projectBrandName: string;
  Cname?: string;
  X1st_Applicant_Last_Name?: string;
  Block?: string;
  Project_Name?: string;
  EnquiryReferenceNo?: any;
  Referred_Employee_Id?: any;
  referredbyChannelPartnerREAPName?: any;
  primarySource?: any;
  secondarySource?: any;
  Corporate_Sales_Verification?: any;
  leadRegProof: any;
  channelPartnerRERANo: any;
  compName: any;
  designation: any;
  corpEmailId: any;
  corpIdCard: any;
  cpName: any;
  salesTeam: SalesTeamMember[];
  Sales_Co_ordinator_Remarks: any;
  remarks: string;
  approvalProof: any;
  EmployeeName: string;
  RERANo: any;
  referedEmp: any;
  Scheme: any;
  projectCity: any;
  Privilege_Adjustment: any;
  UnitNumber: any;
  MobileNumber: any;
  PropoertyName: any;
  businessHeadName: NameValuePair;
  businessHead2Name: NameValuePair;
  TeritarySource: any;
  PreSales1NameEMPNo: NameValuePair;
  Presalesuser1EmpCode: string;
  Presalesuser2EmpCode: string;
  PreSales2Name: NameValuePair;
  PreSalesHeadName: NameValuePair;
  PreSalesHeadEmpCode: string;
  Loyalty_Team: NameValuePair;
  Loyalty_TeamEmployee_Code: string;
  Project_Head: NameValuePair;
  Project_HeadEmployee_Code: string;
  EmailAddress: string;
  Cmail: string;
  BookingAmountAsPerAgreement: string;
  tower?: string;
  residingAs?: string;
  ownerType?: string;
  rentalAgreement?:any;
  saleDeedDocument?:any;
}

export interface MasterData {
  OppId: string;
  OppName: string;
  ProjectName: string;
  UnitNumber: string;
  Resident_Status: [{name:string, value:string}];
}
export interface NameValuePair {
  signatureImage?: string;
  userName: string;
  userId: string;
  id?: number;
  userEmail?: string;
  role?: string;
}

export interface OfficeUseValues {
  bookingSchemeName: string;
  bookingRegionAsPerRM: string;
  enqRefNo: string;
  primarySource: string;
  cpName: string;
  primarySourceDisabled?: any;
  isSoldUnderScheme: string;
  isUnitSoldMTP: string;
  isPaymentPlan: string;
  isPDCCollected?: string;
  remarks: string;
  nriCountry: string; 
  bookingAmountLowerThanCostSheet?: boolean;  
  documents: {
    bisPaymentPlanApproval: File | null | string;
    bisMTPApproval: File | null | string;
    npvSheetApproval: File | null | string;
    approvalProof: File | null | string;
    remainingPaymentApproval?: File | null | string;
    chequeImages?: any;
    businessHeadApproval?: File | null | string;
    corporateEmailId: File | null | string;
    corporateIdCard: File | null | string;
    leadRegProof: File | null | string;
  },
  officeInfo : {
    secondarySource: string;
    tertiarySource: string;
    isCorporateSales?: boolean;
    employeeName: string;
    employeeId: string;
    cpReraNumber: string;
    companyName: string;
    designation: string;
    salesTeam: SalesTeamMember[];
    preSales1Name: NameValuePair;
    preSales1EmpId: string;
  
    preSales2EmpId: string;
    preSales2Name: NameValuePair;
  
    preSalesHeadName: NameValuePair;
    businessHeadName: NameValuePair;
    businessHead2Name: NameValuePair;
    loyaltyTeamName: NameValuePair;
    loyaltyTeamEmployeeId: string;
    projectHeadName: NameValuePair;
    projectHeadEmployeeId: string;
  }
    referralList: ReferrerDetails;
}

export interface SalesTeamMember {
  rmName: NameValuePair;
  rmEmployeeId: string;
  tlName: NameValuePair;
  tlEmployeeId: string;
  rshName: NameValuePair;
  rshEmployeeId: string;
}

interface PaymentTransactions {
  method: string;
  drawnOn?: string;
  paymentProof: any[]; // Replace `any[]` with a specific file type if available
  transactionNumber?: string;
  isPhysicalPaymentProof: boolean;
  gatewayPaymentId?: string;
  chequeNumber?: string;
}

interface Payment {
  id: number;
  paidAmount: string;
  paymentMode: string;
  paymentDate: string; // ISO string, e.g. "2025-10-09T00:00:00.000Z"
  status: string;
  paymentDetails: PaymentTransactions;
}

export interface ApplicantData {
  id: number;
  opportunityId: string;
  enquiryId: string;
  noOfApplicants: number;
  fillingAs: number;
  relationBtApplicants: string;
  lastStep: number;
  isCompleted: boolean;
  isEOIBooking: boolean;
  isAggreedOnTerms: boolean | null;
  rating: number | null;
  feedback: string | null;
  comments: string | null;
  applicant1?: Applicant;
  applicant2?: Applicant;
  applicant3?: Partial<Applicant>;
  applicant4?: Applicant | null;
  paymentDetails?: PaymentDetails;
  unitDetails?: UnitDetails;
  otherDetails?: OtherDetails;
  referrerDetails?: ReferrerDetails;
  leegalityData?: LeegalityData;
  stepsCompleted?: any;
  officeUse?: OfficeUseValues;
  unsignedPdf?: string | null;
  signedPdf?: string | null;
  documentsNote?: string | null;
  bookingFormStatus?: string;
  formFilledAt?: string | null;
  createdAt?: string;
  modifiedAt?: string;
  bookingSchemeName: string;
  primarySourceDisabled: any;
  officeUsePdf?: string | null;
  mergedPdf?: string | null;
  isPhysicalDocSubmitted?: any;
  payments?: Payment[];
  bookingAs?:string;
}

export interface Applicant {
  contactDetails?: ContactDetails;
  personalDetails?: PersonalDetails;
  professionalDetails?: ProfessionalDetails;
  isPartialSaved?: boolean;
}

export interface ContactDetails {
  isValid?: boolean;
  ociImage?: string[];
  panImage?: string[];
  ociNumber?: string;
  panNumber?: string;
  countryCode?: string;
  aadhaarImage?: string[];
  emailAddress?: string;
  aadhaarNumber?: string;
  contactNumber?: string;
  isPhysicalOCI?: boolean;
  isPhysicalPan?: boolean;
  isSameAddress?: number;
  passportImage?: string[];
  passportNumber?: string;
  permanentAddress?: Address;
  isPhysicalAadhaar?: boolean;
  isPhysicalPassport?: boolean;
  isPhysicalOtherDoc?: boolean;
  OCIAlternateDocType?: string;
  OCIAlternateDocImage?: string[];
  alternateCountryCode?: string;
  communicationAddress?: Address;
  alternateContactNumber?: string;
  isPassportCurrentAddress?: number;
}

// eslint-disable-next-line import/export
export interface Address {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pinCode?: string | null;
  areaName?: string | null;
  houseNumber?: string | null;
}

export interface PersonalDetails {
  dob?: string | null;
  image?: string[];
  gender?: string;
  lastName?: string | null;
  firstName?: string | null;
  relation?: string;
  spouseDob?: string | null;
  salutation?: string;
  motherTongue?: string | null;
  relativeName?: string;
  maritalStatus?: string;
  residentStatus?: string;
  anniversaryDate?: string | null;
  isPhysicalImage?: boolean | null;
  isPhysicalAadhaar?: boolean | null;
  isPhysicalPan?: boolean | null;
  isPhysicalPassport?: boolean | null;
  isPhysicalOCI?: boolean | null;
  isPhysicalAddressProof?: boolean | null;
  isPhysicalLegalGuardianDoc?: boolean | null
  isValid?: boolean;
  ociImage?: string[];
  panImage?: string[];
  ociNumber?: string;
  panNumber?: string;
  countryCode?: string;
  aadhaarImage?: string[];
  emailAddress?: string;
  aadhaarNumber?: string;
  contactNumber?: string;
  isSameAddress?: number;
  passportImage?: string[];
  passportNumber?: string;
  permanentAddress?: Address;
  isPhysicalOtherDoc?: boolean;
  OCIAlternateDocType?: string;
  OCIAlternateDocImage?: string[];
  alternateCountryCode?: string;
  communicationAddress?: Address;
  alternateContactNumber?: string;
  isPassportCurrentAddress?: number;
  legalGuardian?: string;
}

export interface ProfessionalDetails {
  industry?: string;
  occupation?: string;
  companyName?: string;
  designation?: string;
  annualIncome?: string;
  officialEmail?: string;
  companyAddress?: string;
  companyPinCode?: string | null;
  workExperience?: number;
  industryIfOthers?: string;
  organizationType?: string;
  designationIfOthers?: string | null;
  educationalQualification?: string;
  isPhysicalGST?: boolean;
  gstNumber?: string;
}

export interface PaymentDetails {
  amount: number;
  transactions: Transaction[];
  amountInWords: string;
  transactionType: string;
}

export interface Transaction {
  amount: number;
  drawnOn: string;
  transactionId: string;
  isPhysicalPaymentProof: boolean;
  paymentProof: any;
  transactionDate: string;
}

export interface UnitDetails {
  type: string;
  floor: string;
  channel: string;
  blockTower: string;
  unitNumber: string;
  carParkType: string;
  projectName: string;
  bookingAmount: number | null;
  primarySource: string;
  superBuiltArea: number;
  projectBrandName: string;
  totalAgreementValue: number;
  secondarySource: string;
}

export interface OtherDetails {
  sourceOfFunding: string;
  purposeOfPurchase: string;
  annualHouseHoldIncome: string;
  isPhysicalGST: any;
  gstCertificate: any;
  gstNumber: any;
  gstApplicant: any;
  gstBusinessName: any;
}

export interface BookingDocument {
  data: any;
  id: number;
  opportunityId: string;
  name: string;
  path: string;
  type: 'office-use' | 'client-upload' | string; // Added flexibility for other possible types
  stage: 'pre_booking' | 'post_booking' | string; // Handles other stages if needed
  isOtherDoc: boolean;
  created_at: string; // ISO date format
  modified_at: string; // ISO date format
}

export interface ReferrerDetails {
  city?: string | any;
  name?: string | any;
  email?: string | any;
  address?: string | any;
  pinCode?: string | any;
  relation?: string | any;
  unitNumber?: string | any;
  countryCode?: string | any;
  mobileNumber?: string | any;
  propertyName?: string | any;
  altCountryCode?: string | any;
  altMobileNumber?: string | any;
  signedPdf?: string | any;
  pointsAdjustment?: any;
  primarySource?: any;
  currentAddress?: any;
  houseNumber?: any;
  unsignedPdf?: any;
  isSignedOffline?: any;
  tower?: any;
  residingAs?: string | any;
  ownerType?: string | any;
  rentalAgreement?:any;
  saleDeedDocument?:any;
}

export interface LeegalityData {
  irn: string;
  invitees: Invitee[];
  documentId: string;
}

export interface Invitee {
  name: string;
  email: string;
  phone: string;
  active: boolean;
  signUrl: string;
  expiryDate: string;
}

export interface Opportunity {
  OppId: string;
  OppName: string | null;
  ProjectName: string | null;
  UnitNo: string | null;
  bookingFormStatus?: string;
  projectBrandName: string | null;
  Cname?: string;
  X1st_Applicant_Last_Name?: string;
  Block?: string | null;
  Project_Name?: string | null;
  TotalAgreementValue?: string | null;
  SpouseName?: string | null;
  SpouseDateofBirth?: string | null;
  SourceofInformation?: string | null;
  SourceOfFunding?: string | null;
  primarySource?: string | null;
  purposeOfPurchase?: string | null;
  ApplicantDetails?: ApplicantDetails[];
}

export interface ApplicantDetails {
  ApplicantName: string | null;
  ApplicantDOB: string | null;
  ApplicantAadharNo: string | null;
  ApplicantPAN: string | null;
  ApplicantMobile: string | null;
  ApplicantEmail: string | null;
  ApplicantAnnualIncome: string | null;
  ApplicantAddress: string | null;
  ApplicantRelation?: string | null;
  SpouseName?: string | null;
  SpouseDOB?: string | null;
  PassportNo?: string | null;
  PassportImage?: string | null;
  OCIImage?: string | null;
  OCINumber?: string | null;
}
export interface SearchUser {
  id: number;
  signatureImage?: string;
  role: any;
  userName: string;
  userId: string;
  userEmail: string;
  empCode?: string;
}
export interface DashboardState {
  opportunity: {
    data: OpportunityData | null;
    loading: boolean;
    error: null | any;
  };
  masterData: {
    data: MasterData | null;
    loading: boolean;
    error: null | any;
  };
  applicantData: {
    data: ApplicantData | null;
    loading: boolean;
    error: null | any;
  };
  bookingDocuments: {
    data: BookingDocument[] | null;
    loading: boolean;
    error: null | any;
  };
  officeUseData: {
    data: OfficeUseValues | null;
    loading: boolean;
    error: null | any;
  };
  postBookingStep: number;
  preBookingStep: number;
  dropzonecountArray: { id: any; name: any; isDeleted: boolean }[];
  prebookingSaveuploaded: { id: string; file: File; fieldName: string; isOther: any }[] | [];
  searchResults: {
    [x: string]: any;
    data: SearchUser[];
    loading: boolean;
    error: null | string;
  };
  salesTeamDropdownResults: {
    [x: string]: any;
    data: SearchUser[];
    loading: boolean;
    error: null | string;
  };
  applicants: { value: string; name: string }[];
  loading: boolean;
  error: string | null;
  noOfApplicants:number;
}
const initialState: DashboardState = {
  opportunity: {
    data: null,
    loading: false,
    error: null,
  },
  masterData: {
    data: null,
    loading: false,
    error: null,
  },
  applicantData: {
    data: null,
    loading: false,
    error: null,
  },
  bookingDocuments: {
    data: null,
    loading: false,
    error: null,
  },
  officeUseData: {
    data: null,
    loading: false,
    error: null,
  },
  postBookingStep: 0,
  preBookingStep: 0,
  dropzonecountArray: [
    { id: 'prebooking-OtherDoc1', name: 'file-1', isDeleted: false },
    { id: 'prebooking-OtherDoc2', name: 'file-2', isDeleted: false },
  ],
  prebookingSaveuploaded: [],
  searchResults: {
    data: [],
    loading: false,
    error: null,
  },
  salesTeamDropdownResults: {
    data: [],
    loading: false,
    error: null,
    hasMore: true,
    currentPage: 1,
    totalPages: 1,
  },
  applicants:[],
  noOfApplicants:0,
  loading: false,
  error: null,
};

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    resetDashboardError: (state) => {
      state.opportunity.error = null;
      state.masterData.error = null;
    },
    setpostBookingStep: (state, action) => {
      state.postBookingStep = action.payload;
    },
    setpreBookingStep: (state, action) => {
      state.preBookingStep = action.payload;
    },
    setdropzonecountArray: (state, action) => {
      state.dropzonecountArray = action.payload;
    },
    setprebookingSaveuploaded: (state, action) => {
      state.prebookingSaveuploaded = action.payload;
    },
    setbookingFormpdfUpload: (state, action) => {
      state.prebookingSaveuploaded = action.payload;
    },
    /** Clears in-memory opportunity from CRM fetch (e.g. agreement form Reset after Fetch). */
    clearOpportunityDetails: (state) => {
      state.opportunity.data = null;
      state.opportunity.loading = false;
      state.opportunity.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults.data = []; // Clear search data when input is cleared
    },
    clearSalesTeamDropdownResults: (state) => {
      state.salesTeamDropdownResults.data = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch Opportunity Details
    builder
      .addCase(getOpportunityDetails.pending, (state) => {
        state.opportunity.loading = true;
        state.opportunity.error = null;
      })
      .addCase(getOpportunityDetails.fulfilled, (state, action) => {
        state.opportunity.loading = false;
        state.opportunity.data = action?.payload?.data?.data;
      })
      .addCase(getOpportunityDetails.rejected, (state, action) => {
        state.opportunity.loading = false;
        state.opportunity.error = action.error;
        state.opportunity.data = null;
      });
    builder.addCase(getApplicantDetails.pending, (state) => {
      state.applicantData.loading = true;
    });
    builder.addCase(getApplicantDetails.fulfilled, (state, action) => {
      state.applicantData.loading = false;
      state.applicantData.error = false;
      state.applicantData.data = action?.payload as any;
    });
    builder.addCase(getApplicantDetails.rejected, (state, action) => {
      state.applicantData.loading = false;
      state.applicantData.error = action?.error;
      state.applicantData.data = null;
    });
    builder.addCase(getBookingDocuments.pending, (state) => {
      state.bookingDocuments.loading = true;
    });
    builder.addCase(getBookingDocuments.fulfilled, (state, action) => {
      state.bookingDocuments.loading = false;
      state.bookingDocuments.error = false;
      state.bookingDocuments.data = action?.payload?.data;
    });
    builder.addCase(getBookingDocuments.rejected, (state, action) => {
      state.bookingDocuments.loading = false;
      state.bookingDocuments.error = action.error;
      state.bookingDocuments.data = null;
    });

    // Fetch Master Data
    builder
      .addCase(getMasterDataList.pending, (state) => {
        state.masterData.loading = true;
        state.masterData.error = null;
      })
      .addCase(getMasterDataList.fulfilled, (state, action) => {
        state.masterData.loading = false;
        state.masterData.data = action.payload.data;
      })
      .addCase(getMasterDataList.rejected, (state, action) => {
        state.masterData.loading = false;
        state.masterData.error = action.error;
        state.masterData.data = null;
      });
    builder.addCase(officeUseDetails.pending, (state) => {
      state.officeUseData.loading = true;
    });
    builder.addCase(officeUseDetails.fulfilled, (state, action) => {
      state.officeUseData.loading = false;
      state.officeUseData.error = false;
      state.officeUseData.data = action?.payload as any;
    });
    builder.addCase(officeUseDetails.rejected, (state, action) => {
      state.officeUseData.loading = false;
      state.officeUseData.error = action?.error;
      state.officeUseData.data = null;
    });
    // Search SFDC Users
    builder
      .addCase(searchSFDCUsers.pending, (state) => {
        state.searchResults.loading = true;
        state.searchResults.error = null;
      })
      .addCase(searchSFDCUsers.fulfilled, (state, action) => {
        state.searchResults.loading = false;

        state.searchResults.data = action?.payload?.data?.data || [];
      })
      .addCase(searchSFDCUsers.rejected, (state, action) => {
        state.searchResults.loading = false;
        state.searchResults.error = action?.error?.message || 'Search failed';
        state.searchResults.data = [];
      });

    // Search Sales Team Dropdown
    builder
      .addCase(searchSalesTeamDropdown.pending, (state) => {
        state.salesTeamDropdownResults.loading = true;
        state.salesTeamDropdownResults.error = null;
      })
      .addCase(searchSalesTeamDropdown.fulfilled, (state, action) => {
        state.salesTeamDropdownResults.loading = false;
        const responseData = action?.payload?.data?.data;
        const newData = responseData?.users || [];

        // Transform the data to match our interface
        const transformedData = newData?.map((user: any) => ({
          id: user?.id,
          userName: user?.userName,
          userId: user?.userId,
          signatureImage: user?.signatureImage || '',
          empCode: user?.empCode,
        }));

        state.salesTeamDropdownResults.data = transformedData;
      })
      .addCase(searchSalesTeamDropdown.rejected, (state, action) => {
        state.salesTeamDropdownResults.loading = false;
        state.salesTeamDropdownResults.error = action?.error?.message || 'Search failed';
        state.salesTeamDropdownResults.data = [];
      });

    // Extract Signature
    builder
      .addCase(extractSignature.pending, (state) => {
        // You can add loading state if needed
      })
      .addCase(extractSignature.fulfilled, (state, action) => {
        // Handle successful signature extraction
      })
      .addCase(extractSignature.rejected, (state, action) => {
        // Handle signature extraction error
      });

    // Upload Signature File
    builder
      .addCase(uploadSignatureFile.pending, (state) => {
        // You can add loading state if needed
      })
      .addCase(uploadSignatureFile.fulfilled, (state, action) => {
        // Handle successful signature upload
      })
      .addCase(uploadSignatureFile.rejected, (state, action) => {
        // Handle signature upload error
      });
      builder
      .addCase(getBookingApplicants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBookingApplicants.fulfilled, (state, action) => {
        state.loading = false;
        state.applicants = action.payload.applicants || [];
        state.noOfApplicants=action.payload.noOfApplicants||0;
      })
      .addCase(getBookingApplicants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load applicants";
      });
  },
});

export const {
  resetDashboardError,
  setpostBookingStep,
  setpreBookingStep,
  setdropzonecountArray,
  setprebookingSaveuploaded,
  setbookingFormpdfUpload,
  clearOpportunityDetails,
  clearSearchResults,
  clearSalesTeamDropdownResults,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;