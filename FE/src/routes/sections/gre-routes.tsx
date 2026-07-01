import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { greNav } from 'src/layouts/config-nav-dashboard';
import GreDashboardPage from 'src/pages/gre/dashboard/page';

import { LoadingScreen } from 'src/components/loading-screen';

import EditEnquiry from 'src/sections/gre-panel/components/edit-enquiry/EditEnquiry';

import { AuthGuard } from 'src/auth/guard';

const BatchListingView = lazy(() => import('src/sections/common-module/batch-manager/batch-listing-view'));
const BatchRecordsView = lazy(() => import('src/sections/common-module/batch-manager/batch-records-view'));
const BatchSlotDetails = lazy(() => import('src/sections/common-module/batch-manager/components/batch-slot-details-listing/batch-slot-details-list-view'));
const BatchVoucherListView = lazy(() => import('src/sections/common-module/batch-manager/components/batch-voucher-listing/batch-voucher-list-view'));

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

const layoutContent = (
  <DashboardLayout navData={greNav}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const greRoutes = {
  path: '/gre',
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
    { path: 'dashboard', element: <GreDashboardPage />, index: true },
    { path: 'enquiry/:id/edit', element: <EditEnquiry />, index: true },
    { path: 'batch/listing', element: <BatchListingView /> },
    { path: 'batch/listing/slot-details/:id', element: <BatchSlotDetails /> },
    { path: 'batch/records', element: <BatchRecordsView /> },
    { path: 'batch/listing/batch-voucher-list/:id', element: <BatchVoucherListView /> },
  ],
};
