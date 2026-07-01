export class CreateLeadPayload {
  referredCustomer: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  company: string;
  primarySource: string;
  secondarySource: string;
  projectInterested: string;
}

export interface SfdcLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  countryCode: string;
  dateOfBirth?: string;
  residentialStatus?: string;
  gender?: string;
  maritalStatus?: string;
  callSummary?: string;
  address?: string;
  primarySource?: string;
  projectInterested?: string;
  primaryApartmentType?: string;
  leadStatus?: string;
  occupation?: string;
  designation?: string;
  company?: string | null;
  industry?: string;
  siteVisitHappened?: boolean;
  annualRevenue?: number | string;
  campaignName?: string;
  activityName?: string;
  paymentRefId?: string;
  voucherId: string;
  isConverted?: boolean;
  numberOfVouchers?: number;
  videoCallDone?: boolean;
  referrerType?: string;
  referrerOtherContact?: string;
  closingRM?: string;
  sourcingRM?: string;
}

export interface SfdcLeadResult {
  opportunityId: string;
  success: boolean;
  uniqueReferenceId?: string;
  enquiryId?: string;
  error?: string;
}

export interface SfdcUnitMappingPayload {
  voucherId: string;
  opportunityId: string;
  apartment: string;
  stageName: string;
}
