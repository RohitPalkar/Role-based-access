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

const BATCH_SLOT_SKELETON_KEYS = Array.from(
  { length: 6 },
  (_, slotIndex) => `batch-slot-skeleton-${slotIndex + 1}`
);

function BatchSlotDetailsCards({ cardsData, loading }: Readonly<Props>) {
  const skeletonCount = 6;
  const colCount = 4;
  const { cards: cardLabel } = uiText.batchSlotListing
  const cards = [
    {
      id: 1,
      heading: cardsData?.expectedWalkin || 0,
      title: cardLabel.expectedWalkin,
      gradientColor: '#22C55E',
      border: false,
    },
    {
      id: 2,
      heading: cardsData?.proratedWalkin || 0,
      title: cardLabel.proratedWalkin,
      gradientColor: '#FFAB00',
      border: false,
    },
    {
      id: 4,
      heading: cardsData?.attended || 0,
      title: cardLabel.actualWalkin,
      gradientColor: '#8E33FF',
      border: false,
    },
  ] as any;

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
          {BATCH_SLOT_SKELETON_KEYS.slice(0, skeletonCount).map((skeletonKey) => (
            <Grid item key={skeletonKey} xs={12} sm={6} md={6} lg={colCount} sx={{ minWidth: 220 }}>
              <Skeleton variant="rounded" height={150} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {cards?.map((card: any, index: number) => (
            <Grid
              item
              key={card.id}
              xs={12}
              sm={6}
              md={6}
              lg={colCount}
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
              />
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
}

export default BatchSlotDetailsCards;
