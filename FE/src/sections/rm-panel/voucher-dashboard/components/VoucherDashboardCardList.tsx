import React, { useEffect, useCallback } from 'react';

import { Box, Grid, Skeleton } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { setActiveCardId } from 'src/redux/slices/incentive-dashboard/incentive-dashboard-card-slices';
import { fetchIncentiveCardData } from 'src/redux/actions/incentive-dashboard/incentive-dashboard-actions';

import VoucherCard from './VoucherCard';

function VoucherDashboardCardList() {
  const dispatch = useAppDispatch();

  // ✅ Use shallowEqual to prevent unnecessary re-renders
  const { activeCardId, loading } = useAppSelector((state) => state.cards);

  // ✅ Memoize the cards list to prevent re-renders
  // const memoizedCards = useMemo(() => incentiveCards, [incentiveCards]);

  // ✅ Memoize the click handler to avoid unnecessary updates
  const handleCardClick = useCallback(
    (type: any) => {
      dispatch(setActiveCardId(activeCardId === type ? null : type));
    },
    [activeCardId, dispatch]
  );

  const List = [
    {
      title: 'Vouchers Collected',
      amount: 10,
      status: 'paid_ytd',
      gradientColor: 'rgba(255,171,0,1)',
      subtitle: 'Successfully collected',
    },
    {
      title: 'Vouchers in Progress',
      amount: 0,
      status: 'payable',
      gradientColor: 'rgba(34,197,94,1)',

      subtitle: 'Total vouchers/EOI',
    },
    {
      title: 'Amount Collected',
      amount: 0,
      type: 'paid',
      gradientColor: 'rgba(255, 68, 139, 1)',
      subtitle: 'Amount collected of all vouchers',
    },
    {
      title: '2BHK Units',
      amount: 0,
      subtitle: 'Units sold',
      gradientColor: 'rgba(142,51,255,1)',
    },
    {
      title: '3BHK Units',
      amount: 0,
      subtitle: 'Successfully collected',
      gradientColor: 'rgba(122,9,22,1)',
    },
  ];

  useEffect(() => {
    // @ts-ignore
    dispatch(fetchIncentiveCardData({}));

    return () => {
      dispatch(setActiveCardId(''));
    };
  }, [dispatch]);

  return (
    <Grid
      container
      spacing={3}
      columns={{ xs: 12, sm: 12, md: 12, lg: 20 }}
      sx={{ marginTop: 1, marginBottom: 4 }}
    >
      {loading ? (
        <Box sx={{ display: 'flex' }}>
          <Skeleton variant="rounded" width={360} height={150} sx={{ marginRight: '10px' }} />
          <Skeleton variant="rounded" width={360} height={150} sx={{ marginRight: '10px' }} />
          <Skeleton variant="rounded" width={360} height={150} sx={{ marginRight: '10px' }} />
          <Skeleton variant="rounded" width={360} height={150} sx={{ marginRight: '10px' }} />
        </Box>
      ) : (
        List?.map((card: any, index: any) => (
          <Grid item key={index} xs={12} sm={6} md={4} lg={4}>
            <VoucherCard
              title={card.title}
              amount={card.amount}
              subtitle={card.subtitle}
              gradientColor={card.gradientColor}
              onClick={() => handleCardClick(card.type)}
            />
          </Grid>
        ))
      )}
    </Grid>
  );
}

export default VoucherDashboardCardList;
