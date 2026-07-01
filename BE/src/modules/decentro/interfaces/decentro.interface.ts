export interface DigiLockerSessionRequest {
  reference_id: string;
  consent: boolean;
  purpose: string;
  uistream: string;
  callback_url: string;
  redirect_url: string;
}

export interface DigiLockerSessionResponse {
  status: string;
  message: string;
  data: {
    session_url: string;
    transactionId: string;
    opportunityId: string;
    bookingAs: string;
    lastStep: number;
    applicantNumber?: number;
  };
}

export interface GstValidationRequest {
  reference_id: string;
  document_type: string;
  id_number: string;
  consent: string;
  consent_purpose: string;
}

export interface GstValidationResponse {
  status: string;
  message: string;
  data: any;
}

export interface DigiLockerWebhookResponse {
  status: string;
  message: string;
}

export interface DocImageValidationResponse {
  status: string;
  message: string;
  data: any;
}

export interface DocImageValidationRequest {
  reference_id: string;
  document_type: string;
  consent: string;
  consent_purpose: string;
  document?: string;
  document_url?: string;
}
