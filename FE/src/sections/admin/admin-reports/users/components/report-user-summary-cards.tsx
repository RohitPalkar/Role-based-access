import React from 'react';

import { Box, Skeleton } from '@mui/material';

import { IncentiveCard } from 'src/sections/rm-panel/incentive-dashboard/incentive-view/component/incentive-cards/incentive-cards';

interface ReportsUserSummaryCardsProps {
  readonly totals: {
    grossTotalValueSum: number;
    incentiveAmountSum: number;
  };
  readonly loading: boolean;
}

function ReportsUserSummaryCards({ totals, loading }: ReportsUserSummaryCardsProps) {
  // Create card data for the two totals
  const cardData = [
    {
      id: 'grossTotal',
      title: 'Total Agreement Value (AV)​',
      amount: totals.grossTotalValueSum,
     
      gradientColor: ['#1976d2', '#42a5f5'], // Blue gradient
     
      type: 'grossTotal',
    },
    {
      id: 'incentiveTotal',
      title: 'Total Incentive Amount',
      amount: totals.incentiveAmountSum,
      
      gradientColor: ['#388e3c', '#66bb6a'], // Green gradient
     
      type: 'incentiveTotal',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '24px',
        flexWrap: 'wrap',
        justifyContent: 'start',
        width: '100%',
        margin: '0 auto 30px',
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex' }}>
          <Skeleton variant="rounded" width={450} height={150} sx={{ marginRight: '10px' }} />
          <Skeleton variant="rounded" width={450} height={150} sx={{ marginRight: '10px' }} />
        </Box>
      ) : (
        cardData.map((card) => (
          <IncentiveCard
            key={card.id}
            title={card.title}
            amount={card.amount}
           
            gradientColor={card.gradientColor}
            
            type={card.type}
            isActive={false}

          />
        ))
      )}
    </div>
  );
}

export default ReportsUserSummaryCards;