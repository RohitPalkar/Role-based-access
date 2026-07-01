import { FORM_PHASE, EOI_PREFERENCE, VoucherAmountType } from 'src/utils/constant';

/** Inventory item shape: type (typology/BHK) + optional amount fields for BHK-wise */
export interface InventoryDetailWithAmounts {
  type: string;
  voucherAmt?: number | string | null;
  standardEOIAmt?: number | string | null;
  preferentialEOIAmt?: number | string | null;
  minSBA?: number;
  maxSBA?: number;
  minPrice?: number;
  maxPrice?: number;
  [key: string]: any;
}

/** Campaign/details shape that may have amount types and inventory with BHK-wise amounts */
export interface EoiCampaignDetailsWithBHK {
  voucherAmount?: number | string | null;
  stdEoiAmount?: number | string | null;
  preEoiAmount?: number | string | null;
  voucherAmountType?: string | null;
  stdEoiAmountType?: string | null;
  preEoiAmountType?: string | null;
  inventoryDetails?: InventoryDetailWithAmounts[] | null;
  [key: string]: any;
}

/**
 * Get amount from inventoryDetails by selected typology and amount key
 */
export const getAmountFromInventory = (
  inventoryDetails: InventoryDetailWithAmounts[] | null | undefined,
  selectedTypology: string | null | undefined,
  amountKey: keyof InventoryDetailWithAmounts
): number | string | null => {
  const inventory = inventoryDetails || [];
  const item = inventory.find((inv) => inv?.type === selectedTypology);
  const raw = item?.[amountKey];
  return raw ?? null;
};

/**
 * Get voucher amount - BHK wise from inventory or fixed from top-level
 */
export const getVoucherAmount = (
  eoiCampaignDetails: EoiCampaignDetailsWithBHK | null | undefined,
  selectedTypology?: string | null
): number | string | null => {
  if (!eoiCampaignDetails) return null;
  const isBhkWise = eoiCampaignDetails.voucherAmountType === VoucherAmountType.BHK_WISE;
  if (isBhkWise) {
    const amt = getAmountFromInventory(
      eoiCampaignDetails.inventoryDetails,
      selectedTypology ?? undefined,
      'voucherAmt'
    );
    return amt ?? null;
  }
  const fixed = eoiCampaignDetails.voucherAmount;
  return fixed ?? null;
};

/**
 * Get standard EOI amount - BHK wise from inventory or fixed from top-level
 */
export const getStdEoiAmount = (
  eoiCampaignDetails: EoiCampaignDetailsWithBHK | null | undefined,
  selectedTypology?: string | null
): number | string | null => {
  if (!eoiCampaignDetails) return null;
  const isBhkWise = eoiCampaignDetails.stdEoiAmountType === VoucherAmountType.BHK_WISE;
  if (isBhkWise) {
    const amt = getAmountFromInventory(
      eoiCampaignDetails.inventoryDetails,
      selectedTypology ?? undefined,
      'standardEOIAmt'
    );
    return amt ?? null;
  }
  const fixed = eoiCampaignDetails.stdEoiAmount;
  return fixed ?? null;
};

/**
 * Get preferential EOI amount - BHK wise from inventory or fixed from top-level
 */
export const getPreEoiAmount = (
  eoiCampaignDetails: EoiCampaignDetailsWithBHK | null | undefined,
  selectedTypology?: string | null
): number | string | null => {
  if (!eoiCampaignDetails) return null;
  const isBhkWise = eoiCampaignDetails.preEoiAmountType === VoucherAmountType.BHK_WISE;
  if (isBhkWise) {
    const amt = getAmountFromInventory(
      eoiCampaignDetails.inventoryDetails,
      selectedTypology ?? undefined,
      'preferentialEOIAmt'
    );
    return amt ?? null;
  }
  const fixed = eoiCampaignDetails.preEoiAmount;
  return fixed ?? null;
};

/**
 * Check if voucher amount exists (for validation/visibility)
 */
export const hasVoucherAmount = (
  eoiCampaignDetails: EoiCampaignDetailsWithBHK | null | undefined
): boolean => {
  if (!eoiCampaignDetails) return false;
  const isBhkWise = eoiCampaignDetails.voucherAmountType === VoucherAmountType.BHK_WISE;
  if (isBhkWise) {
    const inventory = eoiCampaignDetails.inventoryDetails || [];
    return inventory.some((inv) => inv?.voucherAmt != null);
  }
  return Boolean(eoiCampaignDetails.voucherAmount);
};

/**
 * Check if standard EOI amount exists
 */
export const hasStdEoiAmount = (
  eoiCampaignDetails: EoiCampaignDetailsWithBHK | null | undefined
): boolean => {
  if (!eoiCampaignDetails) return false;
  const isBhkWise = eoiCampaignDetails.stdEoiAmountType === VoucherAmountType.BHK_WISE;
  if (isBhkWise) {
    const inventory = eoiCampaignDetails.inventoryDetails || [];
    return inventory.some((inv) => inv?.standardEOIAmt != null);
  }
  return Boolean(eoiCampaignDetails.stdEoiAmount);
};

/**
 * For BHK-wise amounts, resolve typology for display/preview when none selected yet:
 * use selected typology, else first inventory row that has any BHK amount, else first row.
 */
export const resolveTypologyForBhkHint = (
  eoiCampaignDetails: EoiCampaignDetailsWithBHK | null | undefined,
  selectedTypology?: string | null
): string =>
  (selectedTypology && String(selectedTypology).trim()) ||
  eoiCampaignDetails?.inventoryDetails?.find(
    (inv) =>
      inv?.voucherAmt != null ||
      inv?.standardEOIAmt != null ||
      inv?.preferentialEOIAmt != null
  )?.type ||
  eoiCampaignDetails?.inventoryDetails?.[0]?.type ||
  '';

/**
 * Check if preferential EOI amount exists
 */
export const hasPreEoiAmount = (
  eoiCampaignDetails: EoiCampaignDetailsWithBHK | null | undefined
): boolean => {
  if (!eoiCampaignDetails) return false;
  const isBhkWise = eoiCampaignDetails.preEoiAmountType === VoucherAmountType.BHK_WISE;
  if (isBhkWise) {
    const inventory = eoiCampaignDetails.inventoryDetails || [];
    return inventory.some((inv) => inv?.preferentialEOIAmt != null);
  }
  return Boolean(eoiCampaignDetails.preEoiAmount);
};

/**
 * Normalise amount to number for calculation
 */
const toNumber = (val: number | string | null | undefined): number => {
  if (val === undefined || val === null) return 0;
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Get payable amount for payment step - BHK wise or fixed.
 * Returns number for consistency with existing calculatePayableAmount usage.
 */
export const getPayableAmount = (
  applicantData: { formPhase?: string; eoiDetails?: { eoiType?: string; typology?: string } } | null | undefined,
  eoiCampaignDetails: EoiCampaignDetailsWithBHK | null | undefined,
  isUpgradePreferentialStep = false
): number => {
  if (!applicantData || !eoiCampaignDetails) return 0;

  const formPhase = applicantData?.formPhase;
  const eoiType = applicantData?.eoiDetails?.eoiType;
  const selectedTypology = applicantData?.eoiDetails?.typology;

  if (formPhase === FORM_PHASE.VOUCHER) {
    if (!isUpgradePreferentialStep) {
      if (eoiType === EOI_PREFERENCE.Standard) {
        return toNumber(getStdEoiAmount(eoiCampaignDetails, selectedTypology));
      }
      if (eoiType === EOI_PREFERENCE.Preferential) {
        return toNumber(getPreEoiAmount(eoiCampaignDetails, selectedTypology));
      }
      if (eoiType === EOI_PREFERENCE.Voucher || !eoiType) {
        return toNumber(getVoucherAmount(eoiCampaignDetails, selectedTypology));
      }
      return toNumber(getVoucherAmount(eoiCampaignDetails, selectedTypology));
    }
  }

  if (formPhase === FORM_PHASE.EOI) {
    if (eoiType === 'Voucher') {
      const amt = getVoucherAmount(eoiCampaignDetails, selectedTypology);
      return toNumber(amt);
    }
    if (eoiType === 'Preferential') {
      const amt = getPreEoiAmount(eoiCampaignDetails, selectedTypology);
      return toNumber(amt);
    }
    if (eoiType === 'Standard') {
      const amt = getStdEoiAmount(eoiCampaignDetails, selectedTypology);
      return toNumber(amt);
    }
  }

  // Fallback: try any available amount
  const pre = toNumber(getPreEoiAmount(eoiCampaignDetails, selectedTypology));
  const std = toNumber(getStdEoiAmount(eoiCampaignDetails, selectedTypology));
  const vouch = toNumber(getVoucherAmount(eoiCampaignDetails, selectedTypology));
  return pre || std || vouch || 0;
};
