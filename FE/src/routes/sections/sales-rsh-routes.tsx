import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { salesRSHNav } from 'src/layouts/config-nav-dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

import { ROOTS } from '../paths';

// ----------------------------------------------------------------------

// Lazy load components for Sales RSH
const ExpressionOfInterest = lazy(
  () => import('src/sections/common-module/expression-of-interest/expression-of-interest-table-view')
);
const OpportunityListPage = lazy(() => import('src/pages/dashboard/page'));
const ChannelPartners = lazy(
  () => import('src/sections/common-module/channel-partners/channel-partner-table-view')
);
const EOIPreviewView = lazy(
  () => import('src/sections/common-module/expression-of-interest/eoi-preview-view')
);
const BankDetailsListView = lazy(() => import('src/sections/common-module/bank-details/bank-details-list-view'));
const Dashboard = lazy(() => import('src/pages/common-module/eoi-dashboard/dashboard'));
const BatchManagerView = lazy(() => import('src/sections/common-module/batch-manager/batch-manager-view'));
const BatchListingView = lazy(() => import('src/sections/common-module/batch-manager/batch-listing-view'));
const BatchTrackerView = lazy(() => import('src/sections/common-module/batch-manager/batch-tracker-view'));
const BatchSlotDetails = lazy(() => import('src/sections/common-module/batch-manager/components/batch-slot-details-listing/batch-slot-details-list-view'));
const BatchVoucherListView = lazy(() => import('src/sections/common-module/batch-manager/components/batch-voucher-listing/batch-voucher-list-view'));
const AgreementESignatureEdit = lazy(
  () => import('src/pages/crm/dashboard/agreement-eSignature-edit')
);
const AgreementESignatureList = lazy(() => import('src/pages/crm/dashboard/page'));

// ----------------------------------------------------------------------

const layoutContent = (
  <DashboardLayout navData={salesRSHNav}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const salesRSHRoutes = {
  path: ROOTS.SALES_RSH,
  element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
  children: [
    { path: 'bookings', element: <OpportunityListPage /> },
    { path: 'eoi-records', element: <ExpressionOfInterest />, index: true },
    { path: 'preview-voucher/:id', element: <EOIPreviewView /> },
    { path: 'cp-list', element: <ChannelPartners /> },
    { path: 'bank-details', element: <BankDetailsListView /> },
    { path: 'eoi-dashboard', element: <Dashboard /> },
    { path: 'batch/manager', element: <BatchManagerView /> },
    { path: 'batch/listing', element: <BatchListingView /> },
    { path: 'batch/tracker', element: <BatchTrackerView /> },
    { path: 'batch/listing/slot-details/:id', element: <BatchSlotDetails /> },
    { path: 'batch/listing/batch-voucher-list/:id', element: <BatchVoucherListView /> },
    { path: 'dashboard', element: <AgreementESignatureList /> },
    { path: 'dashboard/:agreementId', element: <AgreementESignatureEdit /> },
  ],
};
