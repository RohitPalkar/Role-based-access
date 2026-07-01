import type { CampaignDetails } from 'src/services/rm-panel/eoi-service';

import React from 'react';

import { Box, Typography } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { EOI_PREFERENCE } from 'src/utils/constant';
import { formatIndianCurrency } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { calculatePayableAmount } from '../utils';
import { resolveTypologyForBhkHint } from '../eoi-amount-helpers';

interface AmountBoxProps {
  isEOI: boolean;
  eoiType?: string;
  formik?: any;
  campaignDetails?: CampaignDetails | null;
}

const AmountBox = ({ isEOI, eoiType, formik, campaignDetails }: AmountBoxProps) => {
  const jsonValue = uiText.EOIJson.createEOI.form.moreDetails.label;
  const voucherData = useAppSelector((state) => state.expressonOfInterest.voucherData);

  const selectedEOIType = formik?.values?.eoiType || eoiType || '';

  const amount = calculatePayableAmount(
    isEOI,
    selectedEOIType,
    campaignDetails,
    voucherData,
    {
      typology: resolveTypologyForBhkHint(campaignDetails, formik?.values?.typology),
      eoiType: formik?.values?.eoiType,
    }
  );

  const displayAmount = `₹${formatIndianCurrency(amount)}`;

  const isEoiValueLabel =
    selectedEOIType === EOI_PREFERENCE.Standard ||
    selectedEOIType === EOI_PREFERENCE.Preferential;
  const amountBoxTitle = isEoiValueLabel ? jsonValue.eoiAmountBox : jsonValue.voucherAmountBox;

  return (
      <Box
        py={1}
        px={3}
        sx={{
          width: 'fit-content',
          margin: '0 auto',
          border: '1px solid rgba(26, 64, 125, 0.3)',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: 'rgba(26, 64, 125, 0.3)',
        }}
      >
        <Typography variant="subtitle1" sx={{ color: '#1A407D', fontWeight: 700 }}>
          {amountBoxTitle} Value
        </Typography>
        <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#1C252E' }}>
          {displayAmount}
        </Typography>
      </Box>
  );
};

export default AmountBox;
