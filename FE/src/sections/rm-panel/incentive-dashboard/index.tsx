import { useCallback } from 'react';
import { useSetState } from 'minimal-shared/hooks';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useInView } from 'react-intersection-observer';

import { Box } from '@mui/material';
import Grid2 from '@mui/material/Unstable_Grid2';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import IncentiveCardsList from './incentive-view/component/incentive-cards';
import { TargetStatistics } from './incentive-view/component/target/target';
import BoosterPrizeCard from './incentive-view/component/booster-prize/booster-prize-card';
import { IncentiveDashboardListView } from './incentive-view/incentive-dashboard-table-view';
import { IncentiveRatesAndAmounts } from './incentive-view/component/incentive-rates-and-amounts';

import type { IncentiveDashboardTableFilters } from './incentive-view/incentive-dashboard-table-view';

function Incentivedashboard() {
  const { ref: boosterPrizeCardRef, inView: boosterPrizeCardView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const filters = useSetState<IncentiveDashboardTableFilters>({
    search: '',
    role: [],
    status: 'all',
    filterBy: '',
    projectIds: [],
    year: '',
    month: '',
    resetState(): void {
      throw new Error('Function not implemented.');
    },
  });
  const { state: currentFilters, setState } = filters;

  const updateFilters = useCallback(
    (payload: Partial<IncentiveDashboardTableFilters>) => {
      setState(payload);
    },
    [setState]
  );

  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <CustomBreadcrumbs heading="Incentive Dashboard" sx={stickyBreadcrumbsStyles} />

      <IncentiveCardsList />

      <Box sx={{ mb: 3 }}>
        <IncentiveDashboardListView
          currentFilters={currentFilters}
          updateFilters={updateFilters}
          filters={filters}
        />
      </Box>

      <div ref={boosterPrizeCardRef}>{boosterPrizeCardView && <BoosterPrizeCard />}</div>
      <IncentiveRatesAndAmounts />
      <Grid2 container spacing={3}>
        <Grid2 xs={12} md={12} lg={12}>
          <TargetStatistics title="Target" />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}

export default Incentivedashboard;
