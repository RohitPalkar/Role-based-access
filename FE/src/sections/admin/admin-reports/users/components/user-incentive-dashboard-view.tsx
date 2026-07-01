import type { RootState } from 'src/redux/store';
import type { IncentiveDashboardTableFilters } from 'src/sections/rm-panel/incentive-dashboard/incentive-view/incentive-dashboard-table-view';

import { useCallback } from 'react';
import { useParams } from 'react-router';
import { useSelector } from 'react-redux';
import { useSetState } from 'minimal-shared/hooks';

import { Box } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { IncentiveDashboardListView } from 'src/sections/rm-panel/incentive-dashboard/incentive-view/incentive-dashboard-table-view';

import UserIncentiveCardsList from './user-incentive-cards';


function UserIncentiveDashboardView() {
  const { id } = useParams();
  const { selectedUser } = useAppSelector((state) => state.selectedUser);
  const { incentiveData} = useSelector(
    (state: RootState) => state.incentiveDashboard
  );
    const {rmName } = useAppSelector((state) => state.cards);
  
  const filters = useSetState<IncentiveDashboardTableFilters>({
    search: '',
    role: [],
    status: 'all',
    filterBy: '',
    projectIds: [],
    year: '',
    month: '',
    rmId: id || '', // Add user ID to filters with fallback
    resetState (): void {
      throw new Error('Function not implemented.');
    }
  });
  const { state: currentFilters, setState } = filters;

  const updateFilters = useCallback(
    (payload: Partial<IncentiveDashboardTableFilters>) => {
      setState(payload)
    },
    [setState],
  )
  

  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <CustomBreadcrumbs 
        heading={selectedUser?.name || incentiveData?.[0]?.rmName || rmName}
        
        sx={{ 
           mb: { xs: 0.5 },
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'background.default',
          py: 2
        }} 
      />


      {/* Incentive Cards */}
      <UserIncentiveCardsList rmId={id || ''}  />
      
      {/* Incentive Dashboard Table */}
      <Box sx={{ mb: 3 }}>
        <IncentiveDashboardListView
          currentFilters={currentFilters}
          updateFilters={updateFilters}
          filters={filters}
          isUserView
        />
      </Box>
    </DashboardContent>
  );
}

export default UserIncentiveDashboardView;