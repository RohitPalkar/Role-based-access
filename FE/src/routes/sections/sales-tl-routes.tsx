import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { salesTLNav } from 'src/layouts/config-nav-dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

import { ROOTS } from '../paths';

// ----------------------------------------------------------------------

// Lazy load components for Sales TL
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
const MapAndConvertView = lazy(() => import('src/sections/common-module/expression-of-interest/map-and-convert-view'));
const CreateEOIView = lazy(
  () => import('src/sections/common-module/expression-of-interest/create-eoi-view')
);
const PreBookingFormView = lazy(() => import('src/sections/common-module/expression-of-interest/pre-booking-form-view'));
const UnitInventoryView = lazy(() => import('src/sections/common-module/inventory/unit-inventory-view'));
const MapUnitToVoucher = lazy(() => import('src/sections/common-module/inventory/map-unit-to-voucher-view'));
const AgreementESignatureEdit = lazy(
  () => import('src/pages/crm/dashboard/agreement-eSignature-edit')
);
const AgreementESignatureList = lazy(() => import('src/pages/crm/dashboard/page'));

// ----------------------------------------------------------------------

const layoutContent = (
  <DashboardLayout navData={salesTLNav}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const salesTLRoutes = {
  path: ROOTS.SALES_TL,
  element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
  children: [
    { path: 'bookings', element: <OpportunityListPage /> },
    { path: 'eoi-records', element: <ExpressionOfInterest />, index: true },
    { path: 'preview-voucher/:id', element: <EOIPreviewView /> },
    { path: 'cp-list', element: <ChannelPartners /> },
    { path: 'bank-details', element: <BankDetailsListView /> },
    { path: 'eoi-dashboard', element: <Dashboard /> },
    { path: 'eoi-records/edit/:id', element: <CreateEOIView /> },
    { path: 'eoi-records/map-convert/:id', element: <MapAndConvertView /> },
    { path: 'eoi-records/pre-booking-form/:id', element: <PreBookingFormView /> },
    { path: 'inventory', element: <UnitInventoryView /> },
    { path: 'inventory/map-unit-to-voucher/:id', element: <MapUnitToVoucher /> },
    { path: 'dashboard', element: <AgreementESignatureList /> },
    { path: 'dashboard/:agreementId', element: <AgreementESignatureEdit /> },
  ],
};
