import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { misNav } from 'src/layouts/config-nav-dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

import { ROOTS } from '../paths';
// ----------------------------------------------------------------------

const ExpressionOfInterest = lazy(
  () => import('src/sections/common-module/expression-of-interest/expression-of-interest-table-view')
);

const EOIDashboardView = lazy(() => import('src/sections/common-module/eoi-manager/eoi-dashborad-view'));

const EOIManagerForm = lazy(
  () => import('src/sections/common-module/eoi-manager/components/EOIManagerForm')
);

const Dashboard = lazy(() => import('src/pages/common-module/eoi-dashboard/dashboard'));

const EOIPreviewView = lazy(
  () => import('src/sections/common-module/expression-of-interest/eoi-preview-view')
);
const ChangeSource = lazy(
  () => import('src/sections/common-module/expression-of-interest/components/change-source')
);
const UnitInventoryView = lazy(() => import('src/sections/common-module/inventory/unit-inventory-view'));
const UnitInventoryFileUpload = lazy(() => import('src/sections/common-module/inventory/unit-inventory-components/unit-invnetory-file-upload'));
const BatchManagerView = lazy(() => import('src/sections/common-module/batch-manager/batch-manager-view'));
const BatchListingView = lazy(() => import('src/sections/common-module/batch-manager/batch-listing-view'));
const BatchTrackerView = lazy(() => import('src/sections/common-module/batch-manager/batch-tracker-view'));
const BatchSlotDetails = lazy(() => import('src/sections/common-module/batch-manager/components/batch-slot-details-listing/batch-slot-details-list-view'));
const BatchVoucherListView = lazy(() => import('src/sections/common-module/batch-manager/components/batch-voucher-listing/batch-voucher-list-view'));
// ----------------------------------------------------------------------

const layoutContent = (
    <DashboardLayout navData={misNav}>
        <Suspense fallback={<LoadingScreen />}>
            <Outlet />
        </Suspense>
    </DashboardLayout>
);



export const misRoutes = {
  path: ROOTS.MIS,
  element: CONFIG.auth.skip ? (
    <>{layoutContent}</>
  ) : (
    <AuthGuard>
      {/* <RoleBasedGuard currentRole={currentRole} acceptRoles={['finance-admin']} hasContent> */}
      {layoutContent}
      {/* </RoleBasedGuard> */}
    </AuthGuard>
  ),
  children: [
    { path: 'eoi-records', element: <ExpressionOfInterest />, index: true },
    { path: 'eoi-manager', element: <EOIDashboardView />, index: true },
    { path: 'eoi-manager/create', element: <EOIManagerForm /> },
    { path: 'eoi-manager/edit/:id', element: <EOIManagerForm /> },
    { path: 'eoi-dashboard', element: <Dashboard/> },
    { path: 'preview-voucher/:id', element: <EOIPreviewView /> },
    { path: 'eoi-records/change-source/view/:id', element: <ChangeSource /> },
    { path: 'inventory', element: <UnitInventoryView /> },
    { path: 'inventory/upload-unit-inventory/:id', element: <UnitInventoryFileUpload /> },
    { path: 'batch/manager', element: <BatchManagerView /> },
    { path: 'batch/listing', element: <BatchListingView /> },
    { path: 'batch/tracker', element: <BatchTrackerView /> },
    { path: 'batch/listing/slot-details/:id', element: <BatchSlotDetails /> },
    { path: 'batch/listing/batch-voucher-list/:id', element: <BatchVoucherListView /> },
  ],
};
