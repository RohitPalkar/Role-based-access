import React from 'react';

import { Stack } from '@mui/material';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import EOICardsList from './components/eoi-dashboard-cards';
import EOIDashboardListView from './components/eoi-dashboard-list-view';
import BHKListView from './components/bhk-wise-split/bhk-wise-split-list-view';
import DailyTrackerListView from './components/daily-tracker/daily-tracker-list-view';

export const EOIDashboardNew = () => (
  <DashboardContent>
    <CustomBreadcrumbs heading="EOI Dashboard" sx={stickyBreadcrumbsStyles} />
    <EOICardsList />
    <Stack spacing={5}>
      <EOIDashboardListView />
      <BHKListView />
      <DailyTrackerListView />
    </Stack>
  </DashboardContent>
);
