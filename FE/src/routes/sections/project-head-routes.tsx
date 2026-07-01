import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { projectHeadNav } from 'src/layouts/config-nav-dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

import { ROOTS } from '../paths';
// ----------------------------------------------------------------------

const ExpressionOfInterest = lazy(
  () => import('src/sections/common-module/expression-of-interest/expression-of-interest-table-view')
);

const Dashboard = lazy(() => import('src/pages/common-module/eoi-dashboard/dashboard'));
const  EOIPreviewView = lazy(() => import('src/sections/common-module/expression-of-interest/eoi-preview-view'));
const BankDetailsListView = lazy(() => import('src/sections/common-module/bank-details/bank-details-list-view'));
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
  <DashboardLayout navData={projectHeadNav}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const projectHeadRoutes = {
  path: ROOTS.PROJECT_HEAD,
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
    { path: 'eoi-dashboard', element: <Dashboard /> },
    { path: 'preview-voucher/:id', element: <EOIPreviewView /> },
    { path: 'bank-details', element: <BankDetailsListView /> },
    { path: 'eoi-records/edit/:id', element: <CreateEOIView /> },
    { path: 'eoi-records/map-convert/:id', element: <MapAndConvertView /> },
    { path: 'eoi-records/pre-booking-form/:id', element: <PreBookingFormView /> },
    { path: 'inventory', element: <UnitInventoryView /> },
    { path: 'inventory/map-unit-to-voucher/:id', element: <MapUnitToVoucher /> },
    { path: 'dashboard', element: <AgreementESignatureList /> },
    { path: 'dashboard/:agreementId', element: <AgreementESignatureEdit /> },
  ],
};
