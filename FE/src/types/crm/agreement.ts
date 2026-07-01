export type IAgreementListTableFilters = {
  name: string;
  projectName: any;
  documentStatus: any;
  crmUser: any;
  internalSignatory: any;
  documentType: any;
  startDate: any;
  enddate: any;
};

export interface Agreement {
  id: number;
  projectName: string;
  unitNo: string;
  opportunityId: string;
  enquiryReferenceNumber: string;
  applicantName: string;
  numberOfApplicants: number;
  documentStatus: string;
  sentDate: string;
  signedAt: string | null;
  internalSignatory: string;
  internalSignatorySignature: string | null;
  rmName: string | null;
  signedPdf: string;
  internalSignatoryRedirection: string;
  documentName:string;
  documentType: string;
  inviteesData: { name: string; signUrl: string }[];
}

// Summary object
export interface AgreementSummary {
  totalSent: number;
  totalSigned: number;
  dueFor3Days: number;
  pendingInternal: number;
}

// API data payload
export interface AgreementData {
  result: Agreement[];
  summary: AgreementSummary;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// Response wrapper
export interface AgreementResponse {
  success: boolean;
  response: {
    statusCode: number;
    message: string;
    data: AgreementData;
  };
  errors: any;
}

// src/types/crm/agreement.ts

// Applicant type
export interface Applicant {
  name: string;
  email: string;
  countryCode?: string;
  contactNumber: string;
}

// Document type
export interface Document {
  url: string;
  name: string;
  documentType?: string;
}

// Invitee type
export interface Invitee {
  name: string;
  email: string;
  countryCode: string;
  contactNumber: string;
}

// Leegality invitee type
export interface LeegalityInvitee {
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  signUrl: string;
  expiryDate: string;
}

// Leegality data type
export interface LeegalityData {
  irn: string;
  invitees: LeegalityInvitee[];
  documentId: string;
}

// Agreement detail type
export interface AgreementDetail {
  id: number;
  salesOrderId: string | null;
  enquiryReferenceNumber: string;
  opportunityId: string;
  projectName: string;
  unitNo: string;
  numberOfApplicants: number;
  documentStatus: string;
  signedAt: string | null;
  applicant1: Applicant;
  applicant2?: Applicant;
  applicant3?: Applicant;
  applicant4?: Applicant;
  documents: Document[];
  invitees: {
    external: Invitee[];
    internal: Invitee[];
  };
  rmName: string | null;
  unsignedPdf: string;
  signedPdf: string;
  customerSignedPdf: string;
  leegalityData: LeegalityData;
  sentDate: string;
  mergeDocs?: boolean;
  /** When false, skip internal signatory step after save (if returned by API). */
  internalSignatoryRequired?: boolean;
}

// Full API response type
export interface AgreementDetailApiResponse {
  success: boolean;
  response: {
    statusCode: number;
    message: string;
    data: AgreementDetail;
  };
  errors: string | null;
}

export interface DocumentFile {
  name: string;
  url: string;
  documentType?: string;
}

export interface UpdateAgreementPayload {
  enquiryReferenceNumber: string;
  opportunityId: string;
  projectName: string;
  unitNo: string;
  numberOfApplicants: number;
  applicant1: Applicant;
  applicant2?: Applicant;
  applicant3?: Applicant;
  applicant4?: Applicant;
  documents: DocumentFile[];
  /** When true, merge PDF behaviour is requested for this agreement (if supported by API). */
  mergeDocs?: boolean;
  /** Maps from internal signatory step toggle (UI: "Inventory required"). */
  internalSignatoryRequired?: boolean;
  documentName?: string;
}

export interface AgreementInvitee {
  name: string;
  email: string;
  countryCode: string;
  contactNumber: string;
}

export interface UpdateAgreementData {
  id: number;
  salesOrderId: string | null;
  enquiryReferenceNumber: string;
  opportunityId: string;
  projectName: string;
  unitNo: string;
  numberOfApplicants: number;
  documentStatus: string;
  signedAt: string | null;
  applicant1: Applicant;
  applicant2: Applicant;
  documents: DocumentFile[];
  invitees: {
    external: AgreementInvitee[];
    internal: AgreementInvitee[];
  };
  rmName: string | null;
  unsignedPdf: string;
  signedPdf: string;
  customerSignedPdf: string;
  leegalityData: {
    irn: string;
    invitees: {
      name: string;
      email: string;
      phone: string | null;
      active: boolean;
      signUrl: string;
      isSigned: boolean;
      signType: string;
      expiryDate: string;
    }[];
    documentId: string;
  };
  sentDate: string;
}

export interface UpdateAgreementResponse {
  success: boolean;
  response: {
    statusCode: number;
    message: string;
    data: UpdateAgreementData;
  };
  errors: any;
}

type UpdatInvitee = {
  name: string;
  email: string;
  countryCode: string;
  contactNumber: string;
};

export type UpdateInviteesPayload = {
  agreementIds: number[];
  internal: UpdatInvitee[];
  external?: UpdatInvitee[];
};
