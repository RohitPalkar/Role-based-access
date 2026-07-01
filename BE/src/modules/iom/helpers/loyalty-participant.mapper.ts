import { pickStringField } from './iom-pdf-template.mapper';
import { LoyaltyAddress } from '../types/loyalty-details.interface';

export function mapParticipantAddress(
  details: Record<string, unknown>,
): LoyaltyAddress {
  const line1 =
    pickStringField(
      details,
      'addressLine1',
      'address_line1',
      'address',
      'fullAddress',
      'full_address',
    ) ?? null;
  const line2 =
    pickStringField(details, 'addressLine2', 'address_line2') ?? null;
  const pincode =
    pickStringField(details, 'pincode', 'pinCode', 'postalCode', 'zip') ?? null;

  const directLocation = pickStringField(details, 'location');
  const locationParts = [
    pickStringField(details, 'city'),
    pickStringField(details, 'state'),
    pickStringField(details, 'projectLocation', 'project_location'),
  ].filter((part): part is string => Boolean(part));

  const location =
    directLocation ??
    (locationParts.length > 0 ? locationParts.join(', ') : null);

  return {
    addressLine1: line1,
    addressLine2: line2,
    pincode,
    location,
  };
}

export interface ExtendedParticipantFields {
  firstName: string | null;
  lastName: string | null;
  sfdcId: string | null;
  gender: string | null;
  email: string | null;
  address: LoyaltyAddress;
}

export function mapExtendedParticipantFields(
  details: Record<string, unknown>,
  sfdcIdFallbacks: (string | null)[] = [],
): ExtendedParticipantFields {
  const sfdcId =
    pickStringField(
      details,
      'sfdcId',
      'sfdc_id',
      'customerId',
      'customer_id',
      'bpCode',
      'bp_code',
      'referrerBpCode',
    ) ??
    sfdcIdFallbacks.find((v) => v?.trim()) ??
    null;

  return {
    firstName: pickStringField(details, 'firstName', 'first_name') ?? null,
    lastName: pickStringField(details, 'lastName', 'last_name') ?? null,
    sfdcId,
    gender: pickStringField(details, 'gender') ?? null,
    email: pickStringField(details, 'email', 'emailId', 'email_id') ?? null,
    address: mapParticipantAddress(details),
  };
}
