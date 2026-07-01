import { AxiosResponse } from 'axios';
import { generateRandomId } from 'src/utils/generateRandomNumber';

export function getSessionRequest(referenceId: string, redirectUrl: string) {
  const apiBaseUrl = process.env.API_BASE_URL;
  const webhookUrl = `${apiBaseUrl}decentro/digilocker-webhook`;

  return {
    reference_id: referenceId,
    consent: true,
    clear_cookies: true,
    purpose: 'To perform KYC of the user',
    uistream: 'DIGILOCKER_AADHAAR_PAN',
    callback_url: webhookUrl,
    redirect_url: redirectUrl,
    additional_data: {
      name: generateRandomId(),
    },
  };
}

export function getGstValidationRequest(
  referenceId: string,
  gstNumber: string,
) {
  return {
    reference_id: referenceId,
    document_type: 'GSTIN',
    id_number: gstNumber,
    consent: 'Y',
    consent_purpose: 'For KYC verification and compliance purposes',
  };
}

/**
 * Extracts serializable data from AxiosResponse to avoid circular reference issues
 * @param response AxiosResponse object
 * @returns Serializable response data without circular references
 */
export function extractResponseData(response: AxiosResponse): any {
  return {
    status: response.status,
    statusText: response.statusText,
    data: response.data,
    headers: response.headers,
  };
}
