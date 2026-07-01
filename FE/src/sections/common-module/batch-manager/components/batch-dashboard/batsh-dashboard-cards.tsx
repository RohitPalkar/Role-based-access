import React from 'react';

import { Grid, Skeleton } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { ListingCards } from 'src/components/listing-cards/listing-cards';

interface CardsData {
  [key: string]: number | string;
}

interface Props {
  cardsData?: CardsData;
  loading?: boolean;
}

const SKELETON_KEYS = Array.from(
  { length: 7 },
  (_, index) => `batch-dashboard-skeleton-${index + 1}`
);

function BatchDashboardCards({ cardsData, loading }: Readonly<Props>) {
  const skeletonCount = 7;
  const colCount = 4;
  const { cardLabel } = uiText.batchManager.dashboard;
  const cards = [
    {
      id: 1,
      heading: cardsData?.invited || 1000,
      title: cardLabel.invited,
      gradientColor: '#10A3FF',
      border: false,
    },
    {
      id: 2,
      heading: cardsData?.attended || 870,
      title: cardLabel.attended,
      gradientColor: '#10A3FF',
      border: false,
    },
    {
      id: 3,
      heading: cardsData?.proratedInvites || 320,
      title: cardLabel.proratedInvites,
      gradientColor: '#10A3FF',
      border: false,
    },
    {
      id: 4,
      heading: cardsData?.totalHeadcount || 80,
      title: cardLabel.totalHeadcount,
      gradientColor: '#FF4410',
      border: false,
    },
    {
      id: 5,
      heading: cardsData?.unitsBooked || 890,
      title: cardLabel.unitsBooked,
      gradientColor: '#10FFD7',
      border: false,
    },
    {
      id: 6,
      heading: cardsData?.totalSalesValue || 3434340,
      title: cardLabel.totalSalesValue,
      gradientColor: '#8F10FF',
      border: false,
      showHeadingRupeeSymbol: true,
    },
    {
      id: 7,
      heading: cardsData?.agreementValueCollected || 34348760,
      title: cardLabel.agreementValueCollected,
      gradientColor: '#FFAB00',
      border: false,
      showHeadingRupeeSymbol: true,
    },
  ];

  const firstRowCards = cards.slice(0, 3);
  const secondRowCards = cards.slice(3);

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
        <Grid container spacing={2}>
          {SKELETON_KEYS.slice(0, skeletonCount).map((skeletonKey) => (
            <Grid item key={skeletonKey} xs={12} sm={6} md={6} lg={colCount} sx={{ minWidth: 220 }}>
              <Skeleton variant="rounded" height={150} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={2}>
            {firstRowCards?.map((card: any, index: number) => (
              <Grid
                item
                key={card.id}
                xs={12}
                sm={6}
                md={6}
                lg={4}
                sx={{
                  minWidth: 220,
                }}
              >
                <ListingCards
                  title={card.title}
                  heading={card.heading}
                  gradientColor={card.gradientColor}
                  isActive={false}
                  borderBottom={card.border}
                  showHeadingRupeeSymbol={card.showHeadingRupeeSymbol}
                />
              </Grid>
            ))}
          </Grid>
          {/* Second Row */}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {secondRowCards.map((card) => (
              <Grid item key={card.id} xs={12} sm={6} md={3} lg={3}>
                <ListingCards
                  title={card.title}
                  heading={String(card.heading)}
                  gradientColor={card.gradientColor}
                  isActive={false}
                  borderBottom={card.border}
                  showHeadingRupeeSymbol={card.showHeadingRupeeSymbol}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </div>
  );
}

export default BatchDashboardCards;
