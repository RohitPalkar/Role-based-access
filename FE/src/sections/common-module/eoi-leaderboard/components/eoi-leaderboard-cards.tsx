import React from 'react';

import { Grid, Skeleton } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { convertNumberToShortForm } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { LeaderboardCards } from './leaderboard-cards';

interface Props {
  view: string;
}

function EOILeaderboardCards({ view }: Readonly<Props>) {
  const { cards, loading } = useAppSelector((state) => state.eoiLeaderboard);
  const isCpView = view === 'channelPartner';
  const skeletonCount = isCpView ? 4 : 3;
  const colCount = isCpView ? 3 : 4;
  const { title, subtitle } = uiText.eoiLeaderboard.cards;

  const cpCards = [
    {
      id: 1,
      heading: `${title.cpEois}: ${cards?.cpEois || 0} (${cards?.cpPercentage || 0}%)`,
      subtitle: subtitle.totalEois,
      subtitleAmount: cards?.totalEOIs || 0,
      gradientColor: '#22C55E',
      border: false,
    },
    {
      id: 2,
      title: `${title.cpEoiValue}: ${convertNumberToShortForm(cards?.cpEoiValues || 0)}`,
      heading: title.cpEois,
      subtitle: subtitle.cpEoiCollected,
      subtitleAmount: convertNumberToShortForm(cards?.cpEoiCollected || 0),
      gradientColor: '#FFAB00',
      border: true,
    },
    {
      id: 3,
      title: title.onboardedCP,
      heading: cards?.onboardedCps || 0,
      gradientColor: '#FF00F6',
      border: false,
    },
    {
      id: 4,
      title: title.eoiActiveCp,
      heading: cards?.activeCps || 0,
      gradientColor: '#00B8D9',
      border: false,
    },
  ] as any;

  const rmCards = [
    {
      id: 1,
      title: `${title.eoiValue} - ${convertNumberToShortForm(cards?.eoiValue || 0)}`,
      heading: title.overallEois,
      subtitle: subtitle.totalEois,
      subtitleAmount: cards?.totalEOIs || 0,
      gradientColor: '#22C55E',
      border: true,
    },
    {
      id: 2,
      title: `${title.eoiValue} - ${convertNumberToShortForm(cards?.topRmValues || 0)}`,
      heading: `${title.topTenRmContribution} (${cards?.topRmContributions}%)`,
      subtitle: subtitle.eoisCollected,
      subtitleAmount: convertNumberToShortForm(cards?.eoisCollected || 0),
      gradientColor: '#FFAB00',
      border: true,
    },
    {
      id: 3,
      title: `${subtitle.formFillInProgress}: ${cards?.formFillInProgress || 0}`,
      heading: title.overallPipeline,
      subtitle: subtitle.formLinksShared,
      subtitleAmount: cards?.formLinksShared || 0,
      gradientColor: '#FF00F6',
      border: true,
    },
  ] as any;

  const eoiCards = isCpView ? cpCards : rmCards;

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
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <Grid item key={index} xs={12} sm={6} md={6} lg={colCount} sx={{ minWidth: 220 }}>
              <Skeleton variant="rounded" height={150} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {eoiCards?.map((card: any, index: number) => (
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
              <LeaderboardCards
                title={card.title}
                heading={card.heading}
                subtitle={card.subtitle}
                subtitleAmount={card?.subtitleAmount}
                gradientColor={card.gradientColor}
                isActive={false}
                borderBottom={card.border}
                emphasizeSubtitle={Boolean(!card?.title)}
                emphasizeTitle={!card.border}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
}

export default EOILeaderboardCards;
