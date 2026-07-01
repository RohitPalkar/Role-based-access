import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import NodeEnv from 'src/enums/node-env.enum';
import {
  BOOKING_FORM_URL,
  BRAND_PROVIDENT,
  BRAND_PROVIDENT_LAND,
  BRAND_PURVA_LAND,
  REFERRAL_FORM_URL,
} from 'src/config/constants';
import { logger } from 'src/logger/logger';
import { FormType } from 'src/enums/booking-form-status.enum';
import { ConfigService } from '@nestjs/config';
import { BookingAsEnum } from 'src/enums/booking-as.enum';

export function getFormUrl(
  formType: FormType,
  brandName: string,
  oppId: string,
  configOptions: {
    bookingFormUrl?: string;
    referralFormUrl?: string;
    purvalandBookingFormUrl?: string;
    purvalandReferralFormUrl?: string;
    provientBookingFormUrl?: string;
    provientReferralFormUrl?: string;
    nodeEnv: string;
  },
): string {
  try {
    const { nodeEnv } = configOptions;
    let baseUrl: string;

    const isProd = nodeEnv === NodeEnv.PROD;

    // Non-PROD or missing brand, fallback to default
    if (!isProd || !brandName) {
      baseUrl =
        formType === FormType.BOOKING
          ? configOptions.bookingFormUrl
          : configOptions.referralFormUrl;
      return `${baseUrl}/${oppId}`;
    }

    switch (formType) {
      case FormType.BOOKING:
        baseUrl = configOptions?.bookingFormUrl;

        if (brandName === BRAND_PURVA_LAND) {
          baseUrl = configOptions?.purvalandBookingFormUrl;
        } else if (
          brandName === BRAND_PROVIDENT ||
          brandName === BRAND_PROVIDENT_LAND
        ) {
          baseUrl = configOptions?.provientBookingFormUrl;
        }
        break;

      case FormType.REFERRAL:
        baseUrl = configOptions?.referralFormUrl;

        if (brandName === BRAND_PURVA_LAND) {
          baseUrl = configOptions?.purvalandReferralFormUrl;
        } else if (
          brandName === BRAND_PROVIDENT ||
          brandName === BRAND_PROVIDENT_LAND
        ) {
          baseUrl = configOptions?.provientReferralFormUrl;
        }
        break;

      default:
        throw new InternalServerErrorException('Invalid form type');
    }

    return `${baseUrl}/${oppId}`;
  } catch (error) {
    logger.error(`Failed to get ${formType} form URL:`, error);
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException(
      `Failed to get ${formType} form URL: ${error?.message}`,
    );
  }
}

export function getConfigOptionsByFormType(
  formType: FormType,
  configService: ConfigService,
): {
  bookingFormUrl?: string;
  referralFormUrl?: string;
  purvalandBookingFormUrl?: string;
  purvalandReferralFormUrl?: string;
  provientBookingFormUrl?: string;
  provientReferralFormUrl?: string;
  nodeEnv: string;
} {
  const nodeEnv = configService.get<string>('NODE_ENV');
  const puravankaraBaseUrl = configService.get<string>('PURAVANKARA_BASE_URL');
  const purvalandBaseUrl = configService.get<string>('PURVALAND_BASE_URL');
  const provientBaseUrl = configService.get<string>('PROVIDENT_BASE_URL');

  if (formType === FormType.BOOKING) {
    return {
      bookingFormUrl: `${puravankaraBaseUrl}/${BOOKING_FORM_URL}`,
      nodeEnv,
      purvalandBookingFormUrl: `${purvalandBaseUrl}/${BOOKING_FORM_URL}`,
      provientBookingFormUrl: `${provientBaseUrl}/${BOOKING_FORM_URL}`,
    };
  }

  if (formType === FormType.REFERRAL) {
    return {
      referralFormUrl: `${puravankaraBaseUrl}/${REFERRAL_FORM_URL}`,
      nodeEnv,
      purvalandReferralFormUrl: `${purvalandBaseUrl}/${REFERRAL_FORM_URL}`,
      provientReferralFormUrl: `${provientBaseUrl}/${REFERRAL_FORM_URL}`,
    };
  }

  throw new Error(`Unknown form type: ${formType}`);
}

export function generateFormUrlByType(
  formType: FormType,
  brand: string,
  oppId: string,
  configService: ConfigService,
): string {
  const configOptions = getConfigOptionsByFormType(formType, configService);
  return getFormUrl(formType, brand, oppId, configOptions);
}

export function getS3Url(
  configService: ConfigService,
  filePath?: string,
): string {
  const base = configService.get<string>('AWS_S3_ACCESS_URL');
  return filePath ? `${base}${filePath}` : base;
}

export function resolveSalesTeamInfo(record: any) {
  const salesTeam = record?.officeInfo?.salesTeam || [];
  const primarySource = record?.officeInfo?.primarySource || '';
  const bookingScheme = record?.officeInfo?.bookingScheme || '';

  const getField = (field: string, subfield: string) =>
    salesTeam[1]?.[field]?.[subfield] || null;

  return {
    raw: record,
    TL: {
      id: getField('tlName', 'userId'),
      name: getField('tlName', 'userName'),
    },
    RM: {
      id: getField('rmName', 'userId'),
      name: getField('rmName', 'userName'),
    },
    RSH: {
      id: getField('rshName', 'userId'),
      name: getField('rshName', 'userName'),
    },
    primarySource,
    bookingScheme,
  };
}

/**
 * Updates an invitee in the given leegalityData by matching a filter key/value and merging new data.
 * @param leegalityData The object containing invitees array.
 * @param filterKey The key to match on each invitee.
 * @param filterValue The value to match for the invitee.
 * @param toBeUpdated The object with properties to update on the found invitee.
 * @returns The updated leegalityData object.
 */
export function updateInvitee(
  leegalityData: any,
  filters: Record<string, string>,
  toBeUpdated: object,
) {
  const { invitees } = leegalityData;
  if (invitees?.length) {
    const invitee = invitees.find((inv) => {
      return Object.entries(filters).every(
        ([key, value]) => inv[key] === value,
      );
    });
    if (invitee && toBeUpdated) {
      Object.assign(invitee, toBeUpdated);
    }
  }
  return leegalityData;
}

export function extractAllUserIds(data: any, userFields: string[]): string[] {
  const userIds: string[] = [];

  // 1. From known direct fields
  userFields.forEach((key) => {
    const userObj = data?.[key];
    if (userObj?.userId) {
      userIds.push(userObj.userId);
    }
  });

  // 2. From salesTeam array
  if (Array.isArray(data?.salesTeam)) {
    data.salesTeam.forEach((member) => {
      const roles = ['rmName', 'tlName', 'rshName'];
      roles.forEach((role) => {
        const userObj = member?.[role];
        if (userObj?.userId) {
          userIds.push(userObj.userId);
        }
      });
    });
  }

  // 3. Optional: remove empty or duplicate userIds
  return [...new Set(userIds.filter(Boolean))];
}

/**
 * Validates if the combination of contactNumber and emailAddress is already present
 * in any other applicant within the same booking.
 *
 * @param applicantNumber - The applicant number being updated
 * @param booking - The booking object containing all applicants
 * @param contactNumber - The contact number to validate
 * @param emailAddress - The email address to validate
 * @param countryCode - Country code for the contact (used for NRI vs Indian checks)
 * @throws BadRequestException if duplicate combination is found
 */
export function validateDuplicateContactDetails(
  applicantNumber: number,
  booking: any,
  contactNumber: string,
  emailAddress: string,
  countryCode: string,
): void {
  if (!contactNumber || !emailAddress) return;
  // Check all applicants except the current one being updated
  for (let i = 1; i <= 4; i++) {
    if (i === applicantNumber) continue; // Skip the current applicant

    const applicantKey = `applicant${i}`;
    const applicant = booking[applicantKey];

    const isIndividualBooking = booking?.bookingAs === BookingAsEnum.INDIVIDUAL;

    if (isIndividualBooking && !applicant?.contactDetails) continue; // Skip if applicant doesn't exist or has no contact details
    if (!isIndividualBooking && !applicant?.personalDetails) continue; // Skip if applicant doesn't exist or has no personal details

    // Extract existing contact details based on booking type
    const { existingContactNumber, existingEmailAddress, existingCountryCode } =
      resolveExistingDetails(isIndividualBooking, applicant);

    // NRI email uniqueness + duplicate contact/email checks (see helper JSDoc)
    assertNoDuplicateContactAgainstOtherApplicant(
      i,
      contactNumber,
      emailAddress,
      countryCode,
      existingContactNumber,
      existingEmailAddress,
      existingCountryCode,
    );
  }
}

/**
 * Cross-applicant contact validation for a single other slot (1–4).
 *
 * 1. **NRI rule:** If either party is non-Indian (`countryCode` ≠ Indian) and the
 *    other applicant already uses the same email, reject — emails must stay unique for NRIs.
 * 2. **Duplicate pair:** If another applicant has the same mobile and email as the
 *    values being saved, reject.
 *
 * @param applicantSlot - Other applicant index (1–4) used only in the error message
 * @param contactNumber - Contact number from the form being validated
 * @param emailAddress - Email from the form being validated
 * @param countryCode - Country code from the form being validated
 * @param existingContactNumber - Other applicant’s stored contact number
 * @param existingEmailAddress - Other applicant’s stored email
 * @param existingCountryCode - Other applicant’s stored country code
 * @throws BadRequestException when either rule fails
 */
function assertNoDuplicateContactAgainstOtherApplicant(
  applicantSlot: number,
  contactNumber: string,
  emailAddress: string,
  countryCode: string,
  existingContactNumber: string | undefined,
  existingEmailAddress: string | undefined,
  existingCountryCode: string | undefined,
): void {
  if (existingEmailAddress && existingEmailAddress === emailAddress) {
    throw new BadRequestException(
      `Email address (${emailAddress}) is already used by another applicant. Please use a different email address.`,
    );
  }

  // Same mobile + same email already used on another applicant slot
  if (
    existingContactNumber &&
    existingCountryCode === countryCode &&
    existingContactNumber === contactNumber
  ) {
    throw new BadRequestException(
      `Contact number (${contactNumber}) is already present in applicant ${applicantSlot}. Please use a different contact number.`,
    );
  }
}

function resolveExistingDetails(isIndividualBooking: boolean, applicant: any) {
  const existingContactNumber = isIndividualBooking
    ? applicant.contactDetails?.contactNumber
    : applicant.personalDetails?.contactNumber;
  const existingEmailAddress = isIndividualBooking
    ? applicant.contactDetails?.emailAddress
    : applicant.personalDetails?.emailAddress;
  const existingCountryCode = isIndividualBooking
    ? applicant.contactDetails?.countryCode
    : applicant.personalDetails?.countryCode;

  return { existingContactNumber, existingEmailAddress, existingCountryCode };
}

export function mergeNested<T extends Record<string, any>>(
  target: Partial<T>,
  source: Partial<T>,
): Partial<T> {
  const result: Partial<T> = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        // recurse for nested objects
        result[key] = mergeNested(
          (result[key] as Record<string, any>) || {},
          sourceValue as Record<string, any>,
        ) as any;
      } else {
        // overwrite always (even null, empty string, false, 0)
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

type NullableStr = string | number | null | undefined;

export interface AddressDto {
  areaName?: NullableStr;
  houseNumber?: NullableStr;
  city?: NullableStr;
  state?: NullableStr;
  country?: NullableStr;
  pinCode?: NullableStr;
  fullAddress?: string;
  [k: string]: any;
}

export interface ContactDetailsDto {
  permanentAddress?: AddressDto;
  [k: string]: any;
}

/** normalize for comparisons */
function norm(s?: NullableStr): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/\s+/g, ' ')
    .replace(/[.,]+/g, ' ')
    .trim()
    .toLowerCase();
}

function contains(container: string, token: string): boolean {
  if (!container || !token) return false;
  if (container.includes(token)) return true;
  const toks = token.split(/\s+/).filter(Boolean);
  return toks.every((t) =>
    new RegExp(`\\b${escapeRegex(t)}\\b`, 'i').test(container),
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * attachFullAddressOrdered
 *
 * - Accepts a ContactDetailsDto (or partial).
 * - Returns a NEW contactDetails object with permanentAddress.fullAddress set / removed.
 * - Order: houseNumber -> areaName -> (city, state, country, pinCode) appended iff not already present.
 */
export function attachFullAddress<
  T extends ContactDetailsDto | Partial<ContactDetailsDto>,
>(contactDetails?: T): T {
  const out: any = { ...(contactDetails ?? {}) };

  const buildFullAddress = (addrIn?: AddressDto): AddressDto | undefined => {
    if (!addrIn) return addrIn;
    const addr: AddressDto = { ...addrIn };

    const keys = [
      'houseNumber',
      'areaName',
      'city',
      'state',
      'country',
      'pinCode',
    ] as const;
    const others = ['city', 'state', 'country', 'pinCode'] as const;

    const normMap: Record<string, string> = {};
    for (const k of keys) normMap[k] = norm((addr as any)[k]);

    const parts: string[] = [];
    const addedNorms = new Set<string>();

    const pushOrig = (orig?: NullableStr) => {
      if (orig == null) return;
      const collapsed = String(orig).replace(/\s+/g, ' ').trim();

      const cleaned = collapsed
        .split(',') // produce tokens (preserves empties)
        .map((token) => token.trim())
        .join(', ');

      if (!cleaned) return;

      const k = norm(cleaned);
      if (addedNorms.has(k)) return;
      addedNorms.add(k);
      parts.push(cleaned);
    };

    // Add houseNumber + areaName first
    if ((addr as any).houseNumber) pushOrig((addr as any).houseNumber);
    if ((addr as any).areaName) pushOrig((addr as any).areaName);

    const containerNorm = () => Array.from(addedNorms).join(' ');

    // Add remaining fields if not already covered
    for (const k of others) {
      const orig = (addr as any)[k] as NullableStr;
      if (!orig && orig !== 0) continue;
      const tokenNorm = norm(orig);
      const alreadyInAdded = Array.from(addedNorms).some(
        (p) => p.includes(tokenNorm) || tokenNorm.includes(p),
      );
      const combinedContainer = containerNorm();
      if (alreadyInAdded || contains(combinedContainer, tokenNorm)) continue;
      pushOrig(orig);
    }

    if (parts.length === 0) {
      delete (addr as any).fullAddress;
      return addr;
    }

    const joined = parts
      .filter(Boolean)
      .join(',') // create canonical comma-separated string (no spaces)
      .split(',') // O(n)
      .map((s) => s.trim()) // O(n) total
      .filter(Boolean) // remove empty chunks
      .join(', ');

    if (joined) (addr as any).fullAddress = joined;
    else delete (addr as any).fullAddress;

    return addr;
  };

  // Handles both
  out.permanentAddress = buildFullAddress(out.permanentAddress);
  out.communicationAddress = buildFullAddress(out.communicationAddress);

  return out as T;
}

// Strip any query string from a URL/key to stabilize comparisons
export const stripQuery = (p: string) =>
  typeof p === 'string' ? p.split('?')[0] : '';

// Checks ".pdf" case-insensitively
export const isPdfPath = (p: string) =>
  typeof p === 'string' && stripQuery(p).toLowerCase().endsWith('.pdf');

// Order-preserving dedupe
export const dedupe = (arr: string[]) => {
  const seen = new Set<string>();
  return arr.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
};

// Safe extractor for BookingDocumentsService shape: { path?: string }
export const safePickPdfPathsFromDocsSvc = (
  docs: Array<{ path?: string }> | undefined,
) =>
  (docs ?? [])
    .map((d) => d?.path)
    .filter((p): p is string => typeof p === 'string')
    .map(stripQuery)
    .filter(isPdfPath);

// Normalizes unknown shapes into string[]
// Accepts: string[] | string(JSON or CSV) | object with arrays (documents/files/paths) | mixed nested
export function toStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return toStringArray(parsed);
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.documents)) return toStringArray(obj.documents);
    if (Array.isArray(obj.files)) return toStringArray(obj.files);
    if (Array.isArray(obj.paths)) return toStringArray(obj.paths);
    return Object.values(obj).flatMap(toStringArray);
  }

  return [];
}

export function getApplicantSignatureLabels(booking: any): string[] {
  const baseLabels = [
    'Signature of Applicant',
    'Signature of Co-Applicant',
    'Signature of Third Applicant',
    'Signature of Fourth Applicant',
  ];

  const applicants = [
    booking?.applicant1,
    booking?.applicant2,
    booking?.applicant3,
    booking?.applicant4,
  ];

  return baseLabels.map((label, index) => {
    const applicant = applicants[index];
    if (applicant?.hasContinuedAsMinor) {
      const name = applicant?.personalDetails?.firstName || '';
      // Replace with the generic version for minors
      return `On the behalf of ${name} (Minor)`;
    }
    return label;
  });
}
