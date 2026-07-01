import type { RootState, AppDispatch } from 'src/redux/store';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Box, Card, Stack, Typography } from '@mui/material';

import boosterGift from 'src/assets/images/gift-animation.gif';
import getBoosterPrize from 'src/redux/actions/incentive-dashboard/booster-prize-action';

import { LoadingScreen } from 'src/components/loading-screen';

import { AppFeatured } from './booster-carousel';

function BoosterPrizeCard() {
  const dispatch: AppDispatch = useDispatch();
  const { boosterPrize, loading } = useSelector((state: RootState) => state.boosterPrize);
  useEffect(() => {
    // We need to pass role id here
    dispatch(getBoosterPrize());
  }, [dispatch]);

  const formattedPrizeList = Array.isArray(boosterPrize)
    ? boosterPrize.map((prize, index) => ({
        id: String(index),
        title: prize.prizeValue,
        description: `Target Sales: ${prize.targetSales}`,
        coverUrl: boosterGift,
        progress: prize.progress,
        targetSales: prize.targetSales,
        type: prize.PrizeType,
        boosterName: prize.boosterName
      }))
    : [];

  return (
    <Card
      sx={{
        display: { lg: 'flex', md: 'flex', xs: 'block' },
        alignItems: 'center',
        justifyContent: 'space-between',
        my: 4,
        p: 2,
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ textWrap: 'nowrap', mr: 4, mb: { xs: 3, sm: 3, md: 3, lg: 0 } }}
      >
        Booster Prize
      </Typography>

      {loading ? (
        <LoadingScreen />
      ) : (
        <Stack sx={{ width: '100%' }}>
          {boosterPrize?.length ? (
            <AppFeatured list={formattedPrizeList} />
          ) : (
            'No Booster and projects Found'
          )}
        </Stack>
      )}

      <Box sx={{ width: '100px', mx: 'auto' }}>
        <img src={boosterGift} alt="Animation" />
      </Box>
    </Card>
  );
}

export default BoosterPrizeCard;
