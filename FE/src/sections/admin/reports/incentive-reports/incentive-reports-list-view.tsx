import type { IReportsTableFilters } from 'src/types/admin/feature/reports';

// eslint-disable-next-line import/no-extraneous-dependencies
import { useSetState } from 'minimal-shared/hooks';

import Card from '@mui/material/Card';

import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { DashboardContent } from 'src/layouts/dashboard';

import { useTable } from 'src/components/table';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ReportsTableToolbar } from '../components/report-table-toolbar';

// ----------------------------------------------------------------------

const currentYear = new Date().getFullYear();
const yearArray = Array.from({ length: 3 }, (_, i) => (currentYear - i).toString());

// ----------------------------------------------------------------------

export function IncentiveReportsListView() {
  const { canExport } = useRoleBasedPermissions({ module: 'incentiveReports' });
  const table = useTable();
  const filters = useSetState<IReportsTableFilters>({ 
    year: String(new Date().getFullYear()),
    rmId: null
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs heading="Incentive Reports"
     sx={stickyBreadcrumbsStyles}  />

      <Card>
        <ReportsTableToolbar
          filters={filters}
          options={yearArray}
          onResetPage={table?.onResetPage}
          isAdminReport
          canExport={canExport}
        />
      </Card>
    </DashboardContent>
  );
}