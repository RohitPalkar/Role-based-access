import './CustomerPreview.scss';

import React from 'react';

import { Box, Grid, Typography } from '@mui/material';

import { formatDateISTShort } from 'src/utils/helper';
import { FORM_PHASE, PRIMARY_SOURCE, getFormStatusStyles } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import { EOICards } from 'src/sections/common-module/eoi-dashboard/components/eoi-dashboard-cards/eoi-cards';

interface Props {
  voucherData: any;
}

const PreviewThankYou = ({ voucherData }: Props) => {
  const statusStyles = getFormStatusStyles(voucherData?.voucherFormStatus);
  const previewText = uiText.eoiPreview.previewThankYou;
  const { cardsTitle } = uiText.eoiPreview.previewThankYou;
  const jsonValue = uiText.baseColumns.labels;

  const eoiCards = [
    {
      id: 1,
      title:
        voucherData?.formPhase === FORM_PHASE.VOUCHER
          ? cardsTitle.voucherAmount
          : cardsTitle.eoiAmount,
      amount: voucherData?.paymentDetails?.amountPayable || 0,
      gradientColor: '#0061FC',
    },
    {
      id: 2,
      title: cardsTitle.amountPaid,
      amount: voucherData?.paymentDetails?.totalAmountPaid || 0,
      gradientColor: '#118D57',
    },
    {
      id: 3,
      type: 'totalAmountPayable',
      title: cardsTitle.balanceDue,
      amount:
        voucherData?.paymentDetails?.amountPayable &&
        voucherData?.paymentDetails?.totalAmountPaid &&
        Number(voucherData?.paymentDetails?.amountPayable) >
          Number(voucherData?.paymentDetails?.totalAmountPaid)
          ? Number(voucherData?.paymentDetails?.amountPayable) -
            Number(voucherData?.paymentDetails?.totalAmountPaid)
          : 0,
      gradientColor: '#EC8200',
    },
  ];
  const commonBoxStyles = {
    px: '12px',
    py: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    flexDirection: { xs: 'column', sm: 'row' },
    gap: '0.5rem',
  };

  // Left aligned
  const leftBoxStyles = {
    ...commonBoxStyles,
    justifyContent: 'flex-start',
  };

  // Right aligned
  const rightBoxStyles = {
    ...commonBoxStyles,
    justifyContent: 'space-between',
  };
  return (
    <div className="applicantDetailsCard">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: { xs: 2, sm: 1 },
        }}
      >
        {/* Left Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            flex: 1,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          <Box sx={leftBoxStyles}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>{previewText.customerName}:</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>
              {`${voucherData?.applicant1?.personalDetails?.firstName} ${voucherData?.applicant1?.personalDetails?.lastName}`}
            </Typography>
          </Box>

          <Box sx={leftBoxStyles}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>{previewText.mobileNo}:</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>
              {voucherData?.applicant1?.personalDetails?.countryCode}{voucherData?.applicant1?.personalDetails?.contactNumber}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'inline-block',
              backgroundColor: 'rgba(0, 184, 217, 0.08)',
              px: '12px',
              py: '6px',
              borderRadius: '8px',
              width: 'fit-content',
            }}
          >
            <Typography
              sx={{
                color: 'rgba(0, 108, 156, 1)',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {jsonValue.uniqueReferenceId}:&nbsp; {voucherData?.uniqueReferenceId ?? '-'}
            </Typography>
          </Box>
          {Boolean(voucherData?.paidVoucherId) && (
            <Box
              sx={{
                display: 'inline-block',
                backgroundColor: 'rgba(0, 184, 217, 0.08)',
                px: '12px',
                py: '6px',
                borderRadius: '8px',
                width: 'fit-content',
              }}
            >
              <Typography
                sx={{
                  color: 'rgba(0, 108, 156, 1)',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                Voucher ID:&nbsp; {voucherData?.paidVoucherId ?? '-'}
              </Typography>
            </Box>
          )}
          {Boolean(voucherData?.stdEoiId) && (
            <Box
              sx={{
                display: 'inline-block',
                backgroundColor: 'rgba(0, 184, 217, 0.08)',
                px: '12px',
                py: '6px',
                borderRadius: '8px',
                width: 'fit-content',
              }}
            >
              <Typography
                sx={{
                  color: 'rgba(0, 108, 156, 1)',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {previewText.standardEOIId}:&nbsp; {voucherData?.stdEoiId ?? '-'}
              </Typography>
            </Box>
          )}
          {Boolean(voucherData?.preEoiId) && (
            <Box
              sx={{
                display: 'inline-block',
                backgroundColor: 'rgba(0, 184, 217, 0.08)',
                px: '12px',
                py: '6px',
                borderRadius: '8px',
                width: 'fit-content',
              }}
            >
              <Typography
                sx={{
                  color: 'rgba(0, 108, 156, 1)',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {previewText.preferentialEOIId}:&nbsp; {voucherData?.preEoiId ?? '-'}
              </Typography>
            </Box>
          )}
           <Box
            sx={{
              display: "inline-block",
              backgroundColor: statusStyles.backgroundColor,
              px: "12px",
              py: "6px",
              borderRadius: "8px",
              width: "fit-content",
            }}
          >
            <Typography
              sx={{
                color: statusStyles.color,
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {previewText.status}:&nbsp; {voucherData?.voucherFormStatus}
            </Typography>
          </Box>

          {/* Queue ID */}
          {/* <Box
            sx={{
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              px: '12px',
              py: '6px',
              borderRadius: '8px',
              width: 'fit-content',
              maxWidth: '100%',
            }}
          >
            <Typography
              sx={{
                color: '#118D57',
                fontSize: '14px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {previewText.queueId}:&nbsp; {voucherData?.queueId ?? '-'}
            </Typography>
          </Box> */}

          <Box
            sx={{
              backgroundColor: 'rgba(142, 51, 255, 0.08)',
              px: '12px',
              py: '6px',
              borderRadius: '8px',
              width: 'fit-content',
              maxWidth: '100%',
            }}
          >
            <Typography
              sx={{
                color: 'rgba(81, 25, 183, 1)',
                fontSize: '14px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {previewText.preferredTypology}:&nbsp; {voucherData?.eoiDetails?.typology ?? '-'}
            </Typography>
          </Box>
        </Box>

        {/* Right Section */}
        <Box
          sx={{
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          <Box sx={rightBoxStyles}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, width: '180px' }}>
              {previewText.initiatedDate}:
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, textAlign: 'right' }}>
              {formatDateISTShort(voucherData?.createdAt) || ''}
            </Typography>
          </Box>

        {((voucherData?.formPhase === FORM_PHASE.VOUCHER) || 
        (voucherData?.formPhase === FORM_PHASE.EOI && voucherData?.voucherIssuedAt)) && 
        <Box sx={rightBoxStyles}>
            <Typography sx={{ fontSize: "14px", fontWeight: 500 }}>
              {previewText.voucherQueueId}:
            </Typography>
            <Typography sx={{ fontSize: "14px", fontWeight: 700, textAlign: 'right' }}>
              {formatDateISTShort(voucherData?.voucherIssuedAt)}
            </Typography>
          </Box>}

          {voucherData?.formPhase === FORM_PHASE.EOI && (
           <>
             {Boolean(voucherData?.stdEoiId) && (
               <Box sx={rightBoxStyles}>
                 <Typography sx={{ fontSize: "14px", fontWeight: 500 }}>
                    {previewText.stdEOIQueueId}:
                 </Typography>
                 <Typography sx={{ fontSize: "14px", fontWeight: 700 }}>
                   {formatDateISTShort(voucherData?.stdEoiIssuedAt) ?? '-'}
                 </Typography>
               </Box>
             )}
             {Boolean(voucherData?.preEoiId) && (
               <Box sx={rightBoxStyles}>
                 <Typography sx={{ fontSize: "14px", fontWeight: 500 }}>
                    {previewText.preEOIQueueId}:
                 </Typography>
                 <Typography sx={{ fontSize: "14px", fontWeight: 700 }}>
                   {formatDateISTShort(voucherData?.preEoiIssuedAt) ?? '-'}
                 </Typography>
               </Box>
             )} 
           </>
        )} 

          <Box sx={rightBoxStyles}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, width: '180px' }}>
              {previewText.primarySource}:
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, textAlign: 'right' }}>
              {voucherData?.primarySource}
            </Typography>
          </Box>
          {voucherData?.primarySource === PRIMARY_SOURCE.ChannelPartner && (
            <Box sx={rightBoxStyles}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, width: '194px', }}>
                {previewText.cpName}:
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, textAlign: 'right', }}>
                {voucherData?.sourceDetails?.channelPartner} 
              </Typography>
            </Box>
          )}

          {voucherData?.sourceDetails?.referredBy && (
            <Box sx={rightBoxStyles}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, width: '194px', }}>
                {previewText.referrerName}:
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, textAlign: 'right', }}>
                {voucherData?.sourceDetails?.referredBy}
              </Typography>
            </Box>
          )}

          {voucherData?.primarySource === PRIMARY_SOURCE.PurvaChampion && (
            <Box sx={rightBoxStyles}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, width: '194px', }}>
                {previewText.employeeName}:
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, textAlign: 'right', }}>
                {voucherData?.sourceDetails?.employeeName}
              </Typography>
            </Box>
          )}

          {voucherData?.sourcingRm && (
            <Box sx={rightBoxStyles}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, width: '180px' }}>
                {previewText.sourcingRm}:
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, textAlign: 'right' }}>
                {voucherData?.sourcingRm}
              </Typography>
            </Box>
          )}

          {voucherData?.closingRm && (
            <Box sx={rightBoxStyles}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, width: '180px' }}>
                {previewText.closingRm}:
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 700, textAlign: 'right' }}>
                {voucherData?.closingRm}
              </Typography>
            </Box>
          )}
        </Box>

        <Grid
          container
          spacing={2}
          sx={{
            mt: { xs: 0, md: 2 },
          }}
        >
          {eoiCards?.map((card: any, index: number) => (
            <Grid
              item
              key={card?.id}
              xs={12}
              sm={6}
              md={4}
              sx={{
                minWidth: 220,
              }}
            >
              <EOICards
                title={card?.title}
                amount={card?.amount}
                subtitle={card?.subtitle}
                gradientColor={card?.gradientColor}
                type={card?.type}
                isActive={false}
                borderBottom={false}
                useShortForm={false}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </div>
  );
};

export default PreviewThankYou;
