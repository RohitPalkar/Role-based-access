import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { bisNav } from 'src/layouts/config-nav-dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

import { ROOTS } from '../paths';

// ----------------------------------------------------------------------
const OpportunityListPage = lazy(() => import('src/pages/dashboard/page'));
const ExpressionOfInterest = lazy(
  () => import('src/sections/common-module/expression-of-interest/expression-of-interest-table-view')
);
const FinanceRecordDetailsTable = lazy(
  () =>
    import(
      'src/sections/common-module/expression-of-interest/components/finance-components/finance-record-details-table-view'
    )
);
const ChangeSource = lazy(
  () => import('src/sections/common-module/expression-of-interest/components/change-source')
);
const EOIPreviewView = lazy(() => import('src/sections/common-module/expression-of-interest/eoi-preview-view'));
const Dashboard = lazy(() => import('src/pages/common-module/eoi-dashboard/dashboard'));
const UserBookingsList = lazy(
  () => import('src/sections/admin/admin-reports/users/user-bookings-list-view')
);
const IncentiveReportsList = lazy(() => import('src/pages/admin/reports/incentive'));
const BoosterPage = lazy(() => import('src/pages/admin/booster/list'));
const IncentiveListPage = lazy(() => import('src/pages/admin/incentive-structure/list'));
const ReportsUser = lazy(() => import('src/pages/admin/admin-reports/reports-user/list'));
const ReportsUserView = lazy(() => import('src/pages/admin/admin-reports/reports-user/view'));
const LeaderBoardRMSummaryPage = lazy(() => import('src/pages/admin/leader-board/rmSummary'));
const BookingDateModification = lazy(
  () => import('src/pages/admin/booking-date-modification/booking-date-modification')
);
const UnitInventoryView = lazy(() => import('src/sections/common-module/inventory/unit-inventory-view'));
const UnitInventoryFileUpload = lazy(
  () => import('src/sections/common-module/inventory/unit-inventory-components/unit-invnetory-file-upload')
);
const BrandPage = lazy(() => import('src/pages/admin/brand/list'));
const ProjectPage = lazy(() => import('src/pages/admin/project/list'));
const PhasePage = lazy(() => import('src/pages/admin/phase/list'));
const UserListPage = lazy(() => import('src/pages/admin/user/list'));
const BatchManagerView = lazy(() => import('src/sections/common-module/batch-manager/batch-manager-view'));
const BatchListingView = lazy(() => import('src/sections/common-module/batch-manager/batch-listing-view'));
const BatchTrackerView = lazy(() => import('src/sections/common-module/batch-manager/batch-tracker-view'));
const BatchSlotDetails = lazy(() => import('src/sections/common-module/batch-manager/components/batch-slot-details-listing/batch-slot-details-list-view'));
const BatchVoucherListView = lazy(() => import('src/sections/common-module/batch-manager/components/batch-voucher-listing/batch-voucher-list-view'));

// ----------------------------------------------------------------------

const layoutContent = (
  <DashboardLayout navData={bisNav}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const bisRoutes = {
  path: ROOTS.BIS,
  element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
  children: [
    { path: 'user', element: <UserListPage />, index: true },
    { path: 'bookings', element: <OpportunityListPage /> },
    { path: 'eoi-records', element: <ExpressionOfInterest />, index: true },
    {
      path: 'eoi-records/finance-record-details/:id',
      element: <FinanceRecordDetailsTable />,
      index: true,
    },
    { path: 'eoi-records/change-source/view/:id', element: <ChangeSource /> },
    { path: 'eoi-dashboard', element: <Dashboard /> },

    { path: 'brand', element: <BrandPage />, index: true },
    { path: 'project', element: <ProjectPage />, index: true },
    { path: 'phase', element: <PhasePage />, index: true },

    { path: 'reports/users', element: <ReportsUser />, index: true },
    { path: 'reports/users/:id/edit', element: <ReportsUserView />, index: true },
    { path: 'reports/users/:id/bookings', element: <UserBookingsList />, index: true },
    { path: 'reports/bookings', element: <UserBookingsList /> },
    { path: 'reports/incentives', element: <IncentiveReportsList /> },
    { path: 'leader-board/rmSummary', element: <LeaderBoardRMSummaryPage />, index: true },
    { path: 'incentive-structure', element: <IncentiveListPage />, index: true },
    { path: 'booster', element: <BoosterPage />, index: true },
    {
      path: 'uploads/booking-date-modification',
      element: <BookingDateModification />,
      index: true,
    },
    { path: 'inventory', element: <UnitInventoryView /> },
    { path: 'inventory/upload-unit-inventory/:id', element: <UnitInventoryFileUpload /> },
    { path: 'preview-voucher/:id', element: <EOIPreviewView /> },
    { path: 'batch/manager', element: <BatchManagerView /> },
    { path: 'batch/listing', element: <BatchListingView /> },
    { path: 'batch/tracker', element: <BatchTrackerView /> },
    { path: 'batch/listing/slot-details/:id', element: <BatchSlotDetails /> },
    { path: 'batch/listing/batch-voucher-list/:id', element: <BatchVoucherListView /> },
  ],
};
