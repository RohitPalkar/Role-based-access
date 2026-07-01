import React from 'react';

import { Box, Card, Grid, Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

const { view } = uiText.internalOfficeMemo;

type EditedFlags = {
  basicSalePrice?: boolean;
  brokerage?: boolean;
  pointsAdjustmentType?: boolean;
};

type Props = {
  basicSalePrice: string;
  brokeragePercent: string;
  brokerageAmount: string;
  pointsAdjustmentType: string;

  pointsToReferrer: string;
  pointsReferrerAmount: string;
  pointsToReferee: string;
  pointsRefereeAmount: string;

  showTitle?: boolean;
  editedFlags?: EditedFlags;
};

const PaymentDetailsCard = ({
  basicSalePrice,
  brokeragePercent,
  brokerageAmount,
  pointsAdjustmentType,
  pointsToReferrer,
  pointsReferrerAmount,
  pointsToReferee,
  pointsRefereeAmount,
  showTitle = true,
  editedFlags = {},
}: Props) => {
  const getValue = (val?: string, isCurrency?: boolean) => {
    if (!val || val === '-') return 'N/A';
    return isCurrency ? `₹ ${val}` : val;
  };

  const items = [
    {
      value: getValue(basicSalePrice, true),
      label: view.basicSalePrice,
      bg: '#EAF2FF',
      color: '#05097A',
      borderColor: 'rgba(5, 9, 122, 0.2)',
      edited: Boolean(editedFlags.basicSalePrice),
    },
    {
      value: getValue(brokeragePercent),
      label: view.brokeragePercent,
      bg: '#EDF6EF',
      color: '#193F17',
      borderColor: 'rgba(25, 63, 23, 0.2)',
      edited: Boolean(editedFlags.brokerage),
    },
    {
      value: getValue(brokerageAmount, true),
      label: view.brokerageAmount,
      bg: '#F5EFFD',
      color: '#4200BA',
      borderColor: 'rgba(66, 0, 186, 0.2)',
    },
    {
      value: getValue(pointsAdjustmentType),
      label: view.pointsAdjustmentType,
      bg: '#FDF4EA',
      color: '#773316',
      borderColor: 'rgba(119, 51, 22, 0.2)',
      edited: Boolean(editedFlags.pointsAdjustmentType),
    },
    {
      value: getValue(pointsToReferrer),
      label: view.pointsToReferrer,
      bg: '#FFFFEA',
      color: '#747A05',
      borderColor: 'rgba(116, 122, 5, 0.2)',
    },
    {
      value: getValue(pointsReferrerAmount, true),
      label: view.pointsReferrerAmount,
      bg: '#F6EDED',
      color: '#3F1717',
      borderColor: 'rgba(63, 23, 23, 0.2)',
    },
    {
      value: getValue(pointsToReferee),
      label: view.pointsToReferee,
      bg: '#FDEFF6',
      color: '#BA0073',
      borderColor: 'rgba(186, 0, 115, 0.2)',
    },
    {
      value: getValue(pointsRefereeAmount, true),
      label: view.pointsRefereeAmount,
      bg: '#EAFDFB',
      color: '#165C77',
      borderColor: 'rgba(22, 92, 119, 0.2)',
    },
  ];

  return (
    <Card sx={{ p: 2 }}>
      {showTitle && (
        <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>
          {view.paymentDetails}
        </Typography>
      )}

      <Grid container spacing={2}>
        {items.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Box
              sx={{
                position: 'relative',
                p: 2,
                borderRadius: 1,
                backgroundColor: item?.bg,
                textAlign: 'center',
                border: `1px solid ${item.borderColor}`,
              }}
            >
              {item?.edited && (
                <Box
                  component="span"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    px: 1,
                    py: 0.25,
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: 'common.white',
                    bgcolor: 'common.black',
                    borderRadius: 0.75,
                  }}
                >
                  {view.edited}
                </Box>
              )}
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: item.color }}>
                {item.value}
              </Typography>
              <Typography sx={{ fontSize: 12 }}>
                {item.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  );
};

export default PaymentDetailsCard;