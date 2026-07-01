// eslint-disable-next-line import/no-extraneous-dependencies

import { Box, Grid } from '@mui/material';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import TopCPsCard from './components/TopCPsCard';
import SourceSplitCard from './components/SourceWiseCard';
import QuickActionsCard from './components/QuickActionsCard';
import VoucherDashboardCardList from './components/VoucherDashboardCardList';

function VoucherDashboard() {
  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <CustomBreadcrumbs heading="Dashboard" sx={stickyBreadcrumbsStyles} />
      <VoucherDashboardCardList />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'start',
          alignItems: 'center',
          flexDirection: 'row',
          width: '100%',
          gap: '24px',
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <SourceSplitCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <TopCPsCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <QuickActionsCard />
          </Grid>
        </Grid>
      </Box>
    </DashboardContent>
  );
}

export default VoucherDashboard;
