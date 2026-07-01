import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { adminNav } from 'src/layouts/config-nav-dashboard';
import IncentiveReportsList from 'src/pages/admin/reports/incentive';

import { LoadingScreen } from 'src/components/loading-screen';

import EditEOIView from 'src/sections/common-module/expression-of-interest/edit-eoi-view';

import { AuthGuard } from 'src/auth/guard';

import { PermissionGuard } from 'src/rbac/guards/permission-guard';

// ----------------------------------------------------------------------

const IndexPage = lazy(() => import('src/pages/admin/user/list'));
const Dashboard = lazy(() => import('src/pages/common-module/eoi-dashboard/dashboard'));
const BoosterPage = lazy(() => import('src/pages/admin/booster/list'));
const ProjectPage = lazy(() => import('src/pages/admin/project/list'));
const EditProjectPage = lazy(() => import('src/pages/admin/project/edit'));
const EditPhasePage = lazy(() => import('src/pages/admin/phase/edit'));
const EditUserPage = lazy(() => import('src/pages/admin/user/edit'));
const IncentiveListPage = lazy(() => import('src/pages/admin/incentive-structure/list'));
const CreateIncentiveStructure = lazy(() => import('src/pages/admin/incentive-structure/create'));
const EditIncentiveStruture = lazy(() => import('src/pages/admin/incentive-structure/edit'));
const CreateBoosterPage = lazy(() => import('src/pages/admin/booster/create'));
const EditBoosterPage = lazy(() => import('src/pages/admin/booster/edit'));
const BrandPage = lazy(() => import('src/pages/admin/brand/list'));
const EditBrandPage = lazy(() => import('src/pages/admin/brand/edit'));
const PhasePage = lazy(() => import('src/pages/admin/phase/list'));
const CreateProject = lazy(() => import('src/pages/admin/project/create'));
const UserBookingsList = lazy(
  () => import('src/sections/admin/admin-reports/users/user-bookings-list-view')
);
const ReportsUser = lazy(() => import('src/pages/admin/admin-reports/reports-user/list'));
const ReportsUserView = lazy(() => import('src/pages/admin/admin-reports/reports-user/view'));
const LeaderBoardListPage = lazy(() => import('src/pages/rm-panel/leader-board/list'));
const LeaderBoardRMSummaryPage = lazy(() => import('src/pages/admin/leader-board/rmSummary'));
const BookingDateModification = lazy(() => import('src/pages/admin/booking-date-modification/booking-date-modification'));
const ExpressionOfInterest = lazy(
  () => import('src/sections/common-module/expression-of-interest/expression-of-interest-table-view')
);
const EOIDashboardView = lazy(
    () => import('src/sections/common-module/eoi-manager/eoi-dashborad-view')
)

const EOIManagerForm = lazy(() => import('src/sections/common-module/eoi-manager/components/EOIManagerForm'));

const ChannelPartners = lazy(
  () => import('src/sections/common-module/channel-partners/channel-partner-table-view')
);
const EOIPreviewView = lazy(
  () => import('src/sections/common-module/expression-of-interest/eoi-preview-view')
);
const Leaderboard = lazy(() => import('src/sections/common-module/eoi-leaderboard/leaderboard'));
const MapAndConvertView = lazy(() => import('src/sections/common-module/expression-of-interest/map-and-convert-view'));
const UnitInventoryView = lazy(() => import('src/sections/common-module/inventory/unit-inventory-view'));
const BankDetailsListView = lazy(() => import('src/sections/common-module/bank-details/bank-details-list-view'));
const UnitInventoryFileUpload = lazy(() => import('src/sections/common-module/inventory/unit-inventory-components/unit-invnetory-file-upload'));
const MapUnitToVoucher = lazy(() => import('src/sections/common-module/inventory/map-unit-to-voucher-view'));
const BatchManagerView = lazy(() => import('src/sections/common-module/batch-manager/batch-manager-view'));
const BatchListingView = lazy(() => import('src/sections/common-module/batch-manager/batch-listing-view'));
const BatchTrackerView = lazy(() => import('src/sections/common-module/batch-manager/batch-tracker-view'));
const BatchSlotDetails = lazy(() => import('src/sections/common-module/batch-manager/components/batch-slot-details-listing/batch-slot-details-list-view'));
const BatchVoucherListView = lazy(() => import('src/sections/common-module/batch-manager/components/batch-voucher-listing/batch-voucher-list-view'));
const BatchDashboardView = lazy(() => import('src/sections/common-module/batch-manager/batch-dashboard-view'));

// ----------------------------------------------------------------------

const layoutContent = (
  <DashboardLayout navData={adminNav}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const adminRoutes = {
  path: '/admin',
  element: CONFIG.auth.skip ? (
    <>{layoutContent}</>
  ) : (
    <AuthGuard>
      {/* <RoleBasedGuard currentRole={role} acceptRoles={['admin']} hasContent> */}
      {layoutContent}
      {/* </RoleBasedGuard> */}
    </AuthGuard>
  ),
  children: [
    { path: 'user', element: <IndexPage />, index: true },
    { path: 'user/:id/edit', element: <EditUserPage />, index: true },
    { path: 'booster', element: <BoosterPage />, index: true },
    { path: 'project', element: <ProjectPage />, index: true },
    { path: 'project/:id/edit', element: <EditProjectPage />, index: true },
    { path: 'project/create', element: <CreateProject />, index: true },
    { path: 'brand', element: <BrandPage />, index: true },
    { path: 'brand/:id/edit', element: <EditBrandPage />, index: true },
    { path: 'phase', element: <PhasePage />, index: true },
    { path: 'phase/create', element: <EditPhasePage />, index: true },
    { path: 'phase/:id/edit', element: <EditPhasePage />, index: true },
    { path: 'incentive-structure', element: <IncentiveListPage />, index: true },
    { path: 'incentive-structure/create', element: <CreateIncentiveStructure />, index: true },
    { path: 'incentive-structure/:id/edit', element: <EditIncentiveStruture />, index: true },
    { path: 'booster/create', element: <CreateBoosterPage />, index: true },
    { path: 'booster/:id/edit', element: <EditBoosterPage />, index: true },
    { path: 'reports/users', element: <PermissionGuard moduleCode="reports-users"><ReportsUser /></PermissionGuard>, index: true },
    { path: 'reports/users/:id/edit', element: <PermissionGuard moduleCode="reports-users"><ReportsUserView /></PermissionGuard>, index: true },
    { path: 'reports/users/:id/bookings', element: <PermissionGuard moduleCode="reports-bookings"><UserBookingsList /></PermissionGuard>, index: true },
    { path: 'reports/bookings', element: <PermissionGuard moduleCode="reports-bookings"><UserBookingsList /></PermissionGuard>, index: true },
    // { path: 'reports/bookings/booking-date-modification', element: <BookingDateModification />, index: true },
    { path: 'reports/incentives', element: <PermissionGuard moduleCode="reports-incentives"><IncentiveReportsList /></PermissionGuard>, index: true },
    {
      path: 'uploads/booking-date-modification',
      element: <PermissionGuard moduleCode="booking-date-modification"><BookingDateModification /></PermissionGuard>,
      index: true,
    },
    { path: 'booking-date-modification', element: <PermissionGuard moduleCode="booking-date-modification"><BookingDateModification /></PermissionGuard>, index: true },
    { path: 'leader-board', element: <PermissionGuard moduleCode="leaderboard"><LeaderBoardListPage /></PermissionGuard>, index: true },
    { path: 'leader-board/rmSummary', element: <PermissionGuard moduleCode="leaderboard"><LeaderBoardRMSummaryPage /></PermissionGuard>, index: true },
    { path: 'eoi-records', element: <PermissionGuard moduleCode="eoi-records"><ExpressionOfInterest /></PermissionGuard>, index: true },
    { path: 'cp-list', element: <PermissionGuard moduleCode="cp-list"><ChannelPartners /></PermissionGuard>, index: true },
    { path: 'eoi-records/edit/:id', element: <PermissionGuard moduleCode="eoi-records"><EditEOIView /></PermissionGuard> },
    { path: 'eoi-manager', element: <PermissionGuard moduleCode="eoi-manager"><EOIDashboardView /></PermissionGuard>, index: true },
    { path: 'eoi-manager/create', element: <PermissionGuard moduleCode="eoi-manager"><EOIManagerForm /></PermissionGuard> },
    { path: 'eoi-manager/edit/:id', element: <PermissionGuard moduleCode="eoi-manager"><EOIManagerForm /></PermissionGuard> },
    { path: 'eoi-dashboard', element: <PermissionGuard moduleCode="eoi-dashboard"><Dashboard /></PermissionGuard> },
    { path: 'preview-voucher/:id', element: <PermissionGuard moduleCode="eoi-manager"><EOIPreviewView /></PermissionGuard> },
    { path: 'eoi-leaderboard', element: <PermissionGuard moduleCode="eoi-leaderboard"><Leaderboard /></PermissionGuard>, index: true },
    { path: 'eoi-records/map-convert/:id', element: <PermissionGuard moduleCode="eoi-records"><MapAndConvertView /></PermissionGuard> },
    { path: 'inventory', element: <PermissionGuard moduleCode="inventory"><UnitInventoryView /></PermissionGuard> },
    { path: 'inventory/upload-unit-inventory/:id', element: <PermissionGuard moduleCode="inventory"><UnitInventoryFileUpload /></PermissionGuard> },
    { path: 'bank-details', element: <PermissionGuard moduleCode="bank-details"><BankDetailsListView /></PermissionGuard> },
    { path: 'inventory/map-unit-to-voucher/:id', element: <PermissionGuard moduleCode="inventory"><MapUnitToVoucher /></PermissionGuard> },
    { path: 'batch/listing/create', element: <PermissionGuard moduleCode="batch"><BatchManagerView /></PermissionGuard> },
    { path: 'batch/listing/edit/:id', element: <PermissionGuard moduleCode="batch"><BatchManagerView /></PermissionGuard> },
    { path: 'batch/listing', element: <PermissionGuard moduleCode="batch"><BatchListingView /></PermissionGuard> },
    { path: 'batch/tracker', element: <PermissionGuard moduleCode="batch"><BatchTrackerView /></PermissionGuard> },
    { path: 'batch/listing/slot-details/:id', element: <PermissionGuard moduleCode="batch"><BatchSlotDetails /></PermissionGuard> },
    { path: 'batch/listing/batch-voucher-list/:id', element: <PermissionGuard moduleCode="batch"><BatchVoucherListView /></PermissionGuard> },
    { path: 'batch/dashboard', element: <PermissionGuard moduleCode="batch"><BatchDashboardView /></PermissionGuard> },
  ],
};
