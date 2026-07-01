import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { crmNav } from 'src/layouts/config-nav-dashboard';

import { LoadingScreen } from 'src/components/loading-screen';
import { SignatureBookingRouteGuard } from 'src/components/signature-booking-gate/signature-booking-route-guard';

import { AuthGuard } from 'src/auth/guard';
// ----------------------------------------------------------------------

const AgreementESignatureEdit = lazy(
  () => import('src/pages/crm/dashboard/agreement-eSignature-edit')
);
const AgreementESignatureList = lazy(() => import('src/pages/crm/dashboard/page'));
const ExpressionOfInterest = lazy(
  () => import('src/sections/common-module/expression-of-interest/expression-of-interest-table-view')
);

const Dashboard = lazy(() => import('src/pages/common-module/eoi-dashboard/dashboard'));
const EOIPreviewView = lazy(
  () => import('src/sections/common-module/expression-of-interest/eoi-preview-view')
);
const FinanceRecordDetailsTable = lazy(() => import('src/sections/common-module/expression-of-interest/components/finance-components/finance-record-details-table-view'));
const BatchManagerView = lazy(() => import('src/sections/common-module/batch-manager/batch-manager-view'));
const BatchListingView = lazy(() => import('src/sections/common-module/batch-manager/batch-listing-view'));
const BatchTrackerView = lazy(() => import('src/sections/common-module/batch-manager/batch-tracker-view'));
const BatchSlotDetails = lazy(() => import('src/sections/common-module/batch-manager/components/batch-slot-details-listing/batch-slot-details-list-view'));
const BatchVoucherListView = lazy(() => import('src/sections/common-module/batch-manager/components/batch-voucher-listing/batch-voucher-list-view'));
const IomManagementView = lazy(() => import('src/sections/common-module/internal-office-memo/iom-management-view'));
const IomDetailsView = lazy(() => import('src/sections/common-module/internal-office-memo/iom-details-view'));
const GenerateIomView = lazy(() => import('src/sections/common-module/internal-office-memo/generate-iom-view'));
const ProfileSettingsPage = lazy(() => import('src/pages/profile/settings'));
// ------

const layoutContent = (
  <DashboardLayout navData={crmNav}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const crmRoutes = {
  path: '/crm',
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
    { path: 'dashboard/', element: <AgreementESignatureList />, index: true },
    { path: 'dashboard/:agreementId', element: <AgreementESignatureEdit />, index: true },
    { path: 'eoi-records', element: <ExpressionOfInterest />, index: true },
    { path: 'eoi-dashboard', element: <Dashboard /> },
    { path: 'preview-voucher/:id', element: <EOIPreviewView /> },
    { path: 'eoi-records/finance-record-details/:id', element: <FinanceRecordDetailsTable/>, index: true },
    { path: 'batch/manager', element: <BatchManagerView /> },
    { path: 'batch/listing', element: <BatchListingView /> },
    { path: 'batch/tracker', element: <BatchTrackerView /> },
    { path: 'batch/listing/slot-details/:id', element: <BatchSlotDetails /> },
    { path: 'batch/listing/batch-voucher-list/:id', element: <BatchVoucherListView /> },
    { 
      path: 'iom-management', 
      element: (
        <SignatureBookingRouteGuard variant="crm">
          <IomManagementView />
        </SignatureBookingRouteGuard>
      )
    },
    { path: 'iom-management/view/:id', element: <IomDetailsView />},
    { path: 'iom-management/generate-iom/:id', element: <GenerateIomView />},
    { path: 'iom-management/edit-iom/:id', element: <GenerateIomView />},
    { path: 'profile/settings', element: <ProfileSettingsPage /> },
  ],
};
