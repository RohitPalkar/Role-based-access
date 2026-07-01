import React, { useState } from 'react';

import { Typography } from '@mui/material';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import EOILeaderboardCards from './components/eoi-leaderboard-cards';
import EOILeaderboardListView from './components/eoi-leaderboard-list-view';

const EOILeaderboard = () => {
  const [campaignName, setCampaignName] = useState('All')
  const [view, setView] = useState('channelPartner')
  return (
    <DashboardContent>
      <CustomBreadcrumbs heading="EOI Leaderboard" sx={stickyBreadcrumbsStyles} />
      <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 3, mt: 1 }}>{uiText.eoiDashboard.campaignName}: {campaignName}</Typography>
      <EOILeaderboardCards view={view} />
      <EOILeaderboardListView setCampaignName={setCampaignName} setView={setView} />
    </DashboardContent>
  )
};

export default EOILeaderboard;