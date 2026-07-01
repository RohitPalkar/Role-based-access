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
const GenerateIomView = lazy(
  () => import('src/sections/common-module/internal-office-memo/generate-iom-view')
);
const ProfileSettingsPage = lazy(() => import('src/pages/profile/settings'));

// ----------------------------------------------------------------------

const layoutContent = (
  <DashboardLayout navData={iomOnlyNav(paths.financeHead.iomManagement.root)}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const financeHeadRoutes = {
  path: ROOTS.FINANCE_HEAD,
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
    { path: 'iom-management/verify-iom/:id', element: <GenerateIomView /> },
    { path: 'profile/settings', element: <ProfileSettingsPage /> },
  ],
};
