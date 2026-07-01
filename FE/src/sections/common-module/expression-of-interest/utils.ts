import type { CampaignDetails } from 'src/services/rm-panel/eoi-service';

import { FORM_PHASE } from 'src/utils/constant';

import { getPayableAmount as getPayableAmountBHK } from './eoi-amount-helpers';

import type { EoiCampaignDetailsWithBHK } from './eoi-amount-helpers';

/**
 * Calculate payable amount with BHK-wise support.
 * When campaign has voucherAmountType/stdEoiAmountType/preEoiAmountType and inventoryDetails,
 * amount is resolved by selected typology (voucherData?.eoiDetails?.typology).
 */
export const calculatePayableAmount = (
  isEOI: boolean,
  eoiType: string | undefined,
  campaignDetails: CampaignDetails | null | undefined,
  voucherData?: {
    voucherForm?: { formPhase?: string };
    formPhase?: string;
    eoiDetails?: { eoiType?: string; typology?: string };
  },
  /** Current form selections override saved voucherData for live amount */
  formOverrides?: { typology?: string; eoiType?: string }
): number => {
  if (!campaignDetails) return 0;

  const formPhase =
    voucherData?.voucherForm?.formPhase ??
    voucherData?.formPhase ??
    (isEOI ? FORM_PHASE.EOI : FORM_PHASE.VOUCHER);

  const applicantData = {
    formPhase,
    eoiDetails: {
      eoiType:
        formOverrides?.eoiType ?? eoiType ?? voucherData?.eoiDetails?.eoiType,
      typology:
        formOverrides?.typology ?? voucherData?.eoiDetails?.typology,
    },
  };

  return getPayableAmountBHK(
    applicantData,
    campaignDetails as EoiCampaignDetailsWithBHK,
    false
  );
};
