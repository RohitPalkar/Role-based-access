export interface PreparedOfficeUsePayload {
  topLevelPayload: Record<string, any>;
  officeInfoPayload: Record<string, any> | null;
}

/**
 * Prepares the payload for booking_office_use by:
 * - extracting top-level columns
 * - everything else goes into officeInfo (or null if empty)
 * - normalizing documents, booleans and numeric id fields
 */
function normalizePrimarySourceDisabled(value: any): boolean {
  if (value === null) {
    return false;
  }
  if (typeof value === 'string') {
    const val = value.toLowerCase();
    return val === '1' || val === 'true' || val === 'yes';
  }
  return Boolean(value);
}

export function prepareOfficeUsePayload(
  dto: Record<string, any>,
  opts?: {
    topLevelKeys?: string[];
  },
): PreparedOfficeUsePayload {
  const topLevelKeys = opts?.topLevelKeys ?? [
    'documents',
    'enqRefNo',
    'remarks',
    'nriCountry',
    'bookingRegionAsPerRM',
    'primarySource',
    'bookingSchemeName',
    'cpName',
    'primarySourceDisabled',
    'closingRmId',
    'isSoldUnderScheme',
    'isUnitSoldMTP',
    'isPaymentPlan',
    'isPDCCollected',
  ];

  const dtoClone: Record<string, any> = { ...(dto || {}) };
  // remove transient flags
  delete dtoClone.saveForLater;

  const topLevelPayload: Record<string, any> = {};
  const officeInfoPayload: Record<string, any> = {};

  for (const [k, v] of Object.entries(dtoClone)) {
    if (topLevelKeys.includes(k)) {
      topLevelPayload[k] = v === undefined ? null : v;
    } else {
      officeInfoPayload[k] = v;
    }
  }

  // Normalize primarySourceDisabled to boolean
  topLevelPayload.primarySourceDisabled = normalizePrimarySourceDisabled(
    topLevelPayload.primarySourceDisabled,
  );

  // If officeInfoPayload is empty, return null (keeps DB tidy)
  const hasOfficeInfo = Object.keys(officeInfoPayload).length > 0;
  return {
    topLevelPayload,
    officeInfoPayload: hasOfficeInfo ? officeInfoPayload : null,
  };
}
