import React, { useEffect, useCallback } from 'react';

import { Box, Skeleton, Unstable_Grid2 as Grid } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { setActiveCardId } from 'src/redux/slices/incentive-dashboard/incentive-dashboard-card-slices';
import { fetchIncentiveCardData } from 'src/redux/actions/incentive-dashboard/incentive-dashboard-actions';

import { IncentiveCard } from './incentive-cards';

function IncentiveCardsList() {
  const dispatch = useAppDispatch();

  // ✅ Use shallowEqual to prevent unnecessary re-renders
  const { cards: incentiveCards, activeCardId, loading } = useAppSelector((state) => state.cards);

  // ✅ Memoize the cards list to prevent re-renders
  // const memoizedCards = useMemo(() => incentiveCards, [incentiveCards]);

  // ✅ Memoize the click handler to avoid unnecessary updates
  const handleCardClick = useCallback(
    (type: any) => {
      dispatch(setActiveCardId(activeCardId === type ? null : type));
    },
    [activeCardId, dispatch]
  );

  useEffect(() => {
    // @ts-ignore
    dispatch(fetchIncentiveCardData({}));

    return () => {
      dispatch(setActiveCardId(''));
    };
  }, [dispatch]);

  const displayCards = incentiveCards?.filter((card: any) => card.type !== 'risk') || [];
  const cardCount = displayCards.length;
  // Calculate span based on actual display count: 12/3 = 4, 12/4 = 3, etc.
  const mdSpan = cardCount > 0 ? Math.max(3, Math.floor(12 / cardCount)) : 3;

  return (
    <Grid
      container
      spacing={3}
      sx={{
        mb: 3,
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Skeleton variant="rounded" width="100%" height={150} />
          <Skeleton variant="rounded" width="100%" height={150} />
          <Skeleton variant="rounded" width="100%" height={150} />
          <Skeleton variant="rounded" width="100%" height={150} />
        </Box>
      ) : (
        displayCards.map((card: any, index: any) => (
          <Grid key={index + 1} xs={12} sm={6} md={mdSpan}>
            <IncentiveCard
              title={card.title}
              amount={card.amount}
              subtitle={card.subtitle}
              subtitleAmount={card.subtitleAmount}
              gradientColor={card.gradientColor}
              dateRange={card.dateRange}
              type={card.type}
              isActive={activeCardId === card.type}
              onClick={() => handleCardClick(card.type)}
            />
          </Grid>
        ))
      )}
    </Grid>
  );
}

export default IncentiveCardsList;
