import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { paths, ROOTS } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { iomOnlyNav } from 'src/layouts/config-nav-dashboard';

import { LoadingScreen } from 'src/components/loading-screen';
import { SignatureBookingRouteGuard } from 'src/components/signature-booking-gate/signature-booking-route-guard';

import { AuthGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

const IomManagementView = lazy(
  () => import('src/sections/common-module/internal-office-memo/iom-management-view')
);
const IomDetailsView = lazy(
  () => import('src/sections/common-module/internal-office-memo/iom-details-view')
);
const ProfileSettingsPage = lazy(() => import('src/pages/profile/settings'));
const AddLoyaltyPointsView = lazy(() => import('src/sections/loyalty/add-loyalty-points-view'));
const InvoiceTableView = lazy(() => import('src/sections/common-module/internal-office-memo/components/invoice-listing-table/invoice-table-view'));

// ----------------------------------------------------------------------

const layoutContent = (
  <DashboardLayout navData={iomOnlyNav(paths.loyalty.iomManagement.root)}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const loyaltyRoutes = {
  path: ROOTS.LOYALTY,
  element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
  children: [
    {
      path: 'iom-management',
      element: (
        <SignatureBookingRouteGuard variant="crm">
          <IomManagementView />
        </SignatureBookingRouteGuard>
      ),
      index: true,
    },
    { path: 'iom-management/view/:id', element: <IomDetailsView /> },
    { path: 'iom-management/add-loyalty-points/:id', element: <AddLoyaltyPointsView />},
    { path: 'iom-management/close-invoice/:id', element: <InvoiceTableView /> },
    { path: 'profile/settings', element: <ProfileSettingsPage /> },
  ],
};
