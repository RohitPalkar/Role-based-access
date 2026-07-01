import type { AppDispatch } from 'src/redux/store';

import { useDispatch } from 'react-redux';
import React, { useMemo, useState, useEffect } from 'react';

import { Box, Card } from '@mui/material';

import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { generateRoleBasedRoute } from 'src/utils/constant';
import { tableContainerStyles, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchIomDropdowns } from 'src/redux/actions/admin/common-actions';
import { buildIomManagementTabOptions } from 'src/config/role-based-permissions';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import ViewTypeTabs from 'src/sections/common-module/eoi-dashboard/components/view-type-tabs';

import IomMyTeamTableView from './components/my-team-table/iom-my-team-table-view';
import IomManagementTableView from './components/iom-listing-table/iom-management-table-view';

const IomManagementView = () => {
  const dispatch: AppDispatch = useDispatch();
  const { userRole, permissions, useTab } = useRoleBasedPermissions({ module: 'iomManagement' });
  const [tabValue, setTabValue] = useState('iom');

  useEffect(() => {
    dispatch(fetchIomDropdowns(['projects', 'adjustmentType', 'InvoiceStatus', 'IomStatus']));
  }, [dispatch]);

  const tabLabels = useMemo(
    () => ({
      iom: uiText.internalOfficeMemo.tabs.iom,
      myTeam: uiText.internalOfficeMemo.tabs.myTeam,
    }),
    []
  );

  const tabOptions = useMemo(
    () => buildIomManagementTabOptions(permissions, tabLabels),
    [permissions, tabLabels]
  );

  const showTabs = useTab && tabOptions.length > 1;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={uiText.internalOfficeMemo.title}
          links={[
            {
              name: uiText.internalOfficeMemo.title,
              href: generateRoleBasedRoute(userRole, 'iom-management'),
            },
          ]}
        />
      </Box>
      <Card sx={{ ...tableContainerStyles, mt: 2 }}>
        {showTabs && (
          <ViewTypeTabs
            value={tabValue}
            onChange={handleTabChange}
            options={tabOptions}
          />
        )}
        {tabValue === 'myTeam' ? <IomMyTeamTableView /> : <IomManagementTableView />}
      </Card>
    </DashboardContent>
  );
};

export default IomManagementView;
