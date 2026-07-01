import { EOIPaymentStatus } from 'src/utils/constant';

/**
 * Row shape from EOI listing API (minimal fields for SFDC Create/Convert gating).
 */
export type EoiSfdcListingRow = {
  campaign?: {
    id?: number;
    pushToSfdc?: boolean;
    sfdcProjectName?: string | null;
  } | null;
  paymentStatus?: string | null;
  closingRm?:
    | { id?: string | number | null; userId?: string | number | null; name?: string }
    | string
    | null;
  sfdcEnquiryId?: string | number | null;
  sfdc_enquiry_id?: string | number | null;
  opportunityId?: string | number | null;
  opportunity_id?: string | number | null;
};

/** Paid / Partially Paid only — required before SFDC push actions */
const ELIGIBLE_PAYMENT_STATUSES = new Set<string>([
  EOIPaymentStatus.PAID,
  EOIPaymentStatus.PARTIALLY_PAID,
]);

function normalizeId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
}

/**
 * Same rule as EOI Manager campaign row: cannot push when pushToSfdc is off and no project name.
 */
export function isCampaignSfdcPushBlocked(row: EoiSfdcListingRow): boolean {
  const c = row.campaign;
  if (!c?.id) return true;
  return c.pushToSfdc === false && !c.sfdcProjectName;
}

export function isRowPaymentEligibleForSfdcPush(row: EoiSfdcListingRow): boolean {
  const ps = String(row.paymentStatus ?? '').trim();
  return ELIGIBLE_PAYMENT_STATUSES.has(ps);
}

export function isRowClosingRmAssigned(row: EoiSfdcListingRow): boolean {
  const cr = row.closingRm;
  if (cr == null) return false;
  if (typeof cr === 'object') {
    const id = cr.id ?? cr.userId;
    return id != null && String(id).trim() !== '';
  }
  return String(cr).trim().length > 0;
}

export function getRowSfdcEnquiryId(row: EoiSfdcListingRow): string {
  return normalizeId(row.sfdcEnquiryId ?? row.sfdc_enquiry_id);
}

export function getRowOpportunityId(row: EoiSfdcListingRow): string {
  return normalizeId(row.opportunityId ?? row.opportunity_id);
}

export type EoiSfdcRowEligibility = {
  /** Campaign allows SFDC push, payment is Paid/Partial, closing RM assigned */
  prerequisitesMet: boolean;
  /** True = disable "Create Leads on SFDC" */
  isCreateDisabled: boolean;
  /** True = disable "Convert Leads on SFDC" */
  isConvertDisabled: boolean;
};

/**
 * Single place for Create/Convert menu disabled state (avoids scattered nested conditions).
 *
 * Prerequisites (both actions): campaign push OK + Paid/Partially Paid + closing RM.
 * Create: also disabled if enquiry id already exists.
 * Convert: also disabled if both enquiry id and opportunity id exist.
 */
export function evaluateEoiRowSfdcEligibility(row: EoiSfdcListingRow | null | undefined): EoiSfdcRowEligibility {
  if (!row) {
    return {
      prerequisitesMet: false,
      isCreateDisabled: true,
      isConvertDisabled: true,
    };
  }

  const campaignBlocked = isCampaignSfdcPushBlocked(row);
  const paymentOk = isRowPaymentEligibleForSfdcPush(row);
  const closingRmOk = isRowClosingRmAssigned(row);
  const prerequisitesMet = !campaignBlocked && paymentOk && closingRmOk;

  const enquiryId = getRowSfdcEnquiryId(row);
  const opportunityId = getRowOpportunityId(row);

  const hasEnquiry = Boolean(enquiryId);
  const hasBothIds = Boolean(enquiryId && opportunityId);

  const isLeadCreated = Boolean((row as any)?.isLeadCreated);

  return {
    prerequisitesMet,
    isCreateDisabled: !prerequisitesMet || hasEnquiry || isLeadCreated,
    isConvertDisabled: !prerequisitesMet || hasBothIds,
  };
}

/** Convenience: same as `evaluateEoiRowSfdcEligibility(row).isCreateDisabled` */
export function isEoiCreateLeadsOnSfdcDisabled(row: EoiSfdcListingRow | null | undefined): boolean {
  return evaluateEoiRowSfdcEligibility(row).isCreateDisabled;
}

/** Convenience: same as `evaluateEoiRowSfdcEligibility(row).isConvertDisabled` */
export function isEoiConvertLeadsOnSfdcDisabled(row: EoiSfdcListingRow | null | undefined): boolean {
  return evaluateEoiRowSfdcEligibility(row).isConvertDisabled;
}
