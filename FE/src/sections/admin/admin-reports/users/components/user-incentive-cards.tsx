import { useParams } from 'react-router';
import React, { useEffect, useCallback } from 'react';

import { Box, Skeleton } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { setActiveCardId } from 'src/redux/slices/incentive-dashboard/incentive-dashboard-card-slices';
import { fetchIncentiveCardData } from 'src/redux/actions/incentive-dashboard/incentive-dashboard-actions';

import { IncentiveCard } from 'src/sections/rm-panel/incentive-dashboard/incentive-view/component/incentive-cards/incentive-cards';

interface UserIncentiveCardsListProps {
  readonly rmId?: string;
}

function UserIncentiveCardsList({ rmId }: UserIncentiveCardsListProps) {
  const { id } = useParams();
  const dispatch = useAppDispatch();


  // ✅ Use shallowEqual to prevent unnecessary re-renders
  const { cards: incentiveCards, activeCardId, loading } = useAppSelector((state) => state.cards);

  // ✅ Memoize the click handler to avoid unnecessary updates
  const handleCardClick = useCallback(
    (type: any) => {
      dispatch(setActiveCardId(activeCardId === type ? null : type));
    },
    [activeCardId, dispatch]
  );

  useEffect(() => {
   
    
    const params =  { rmId: id } ;
    // @ts-ignore
    dispatch(fetchIncentiveCardData(params));

    return () => {
      dispatch(setActiveCardId(''));
    };
  
  }, [dispatch, id]);

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
          <Skeleton variant="rounded" width={360} height={150} sx={{ marginRight: '10px' }} />
          <Skeleton variant="rounded" width={360} height={150} sx={{ marginRight: '10px' }} />
          <Skeleton variant="rounded" width={360} height={150} sx={{ marginRight: '10px' }} />
          <Skeleton variant="rounded" width={360} height={150} sx={{ marginRight: '10px' }} />
        </Box>
      ) : (
        incentiveCards?.map((card: any, index: any) => (
          <IncentiveCard
            key={index + 1}
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
        ))
      )}
    </div>
  );
}

export default UserIncentiveCardsList;