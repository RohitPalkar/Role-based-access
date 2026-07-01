import React from 'react';

import { Grid, Skeleton } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { EOICards } from './eoi-cards';

function EOICardsList() {
  const { cards, loading } = useAppSelector((state) => state.eoiDashboard);
  const eoiCards = [
    {
      id: 1,
      type: 'totalCompaigns',
      title: 'Campaigns',
      amount: cards?.totalCompaigns || 0,
      status: 'active',
      gradientColor: '#22C55E',
    },
    {
      id: 2,
      type: 'vouchersCollected',
      title: 'EOIs Collected',
      amount: cards?.vouchersCollected || 0,
      subtitle: `${cards?.vouchersCreated || 0} Shared | ${cards?.vouchersInProgress || 0} In Progress`,
      status: 'pending',
      gradientColor: '#FFAB00',
    },
    {
      id: 3,
      type: 'totalAmountPayable',
      title: 'Value of EOIs',
      amount: cards?.totalAmountPayable || 0,
      status: 'completed',
      gradientColor: '#8E33FF',
    },
    {
      id: 4,
      type: 'amountCollected',
      title: 'EOIs Amount Collected',
      amount: cards?.amountCollected || 0,
      status: 'upcoming',
      gradientColor: '#FF00F6',
    },
    {
      id: 5,
      type: 'amountRefunded',
      title: 'Cancellations & Refunds',
      amount: cards?.amountRefunded || 0,
      subtitle: `${cards?.unitsRefunded || 0} Units`,
      status: 'upcoming',
      gradientColor: '#00B8D9',
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
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={2.4}
            sx={{
              minWidth: 220,
            }}
          >
            <Skeleton variant="rounded" height={150} />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={2.4}
            sx={{
              minWidth: 220,
            }}
          >
            <Skeleton variant="rounded" height={150} />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={2.4}
            sx={{
              minWidth: 220,
            }}
          >
            <Skeleton variant="rounded" height={150} />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={2.4}
            sx={{
              minWidth: 220,
            }}
          >
            <Skeleton variant="rounded" height={150} />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={2.4}
            sx={{
              minWidth: 220,
            }}
          >
            <Skeleton variant="rounded" height={150} />
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {eoiCards?.map((card: any, index: number) => (
            <Grid
              item
              key={card.id}
              xs={12}
              sm={6}
              md={4}
              lg={2.4}
              sx={{
                minWidth: 220,
              }}
            >
              <EOICards
                title={card.title}
                amount={card.amount}
                subtitle={card.subtitle}
                gradientColor={card.gradientColor}
                type={card.type}
                showRupeeSymbol={
                  !(card.type === 'totalCompaigns' || card.type === 'vouchersCollected')
                }
                isActive={false}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
}

export default EOICardsList;
