import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { RmPanelDashboardLayout } from 'src/layouts/dashboard/rm-panel-dashboard-layout';

import { LoadingScreen } from 'src/components/loading-screen';
import { SignatureBookingRouteGuard } from 'src/components/signature-booking-gate/signature-booking-route-guard';

import PreBookingForm from 'src/sections/rm-panel/pre-booking-form/pre-booking-form';
import PostBookingForm from 'src/sections/rm-panel/post-booking-form/post-booking-form';
import GroupListingDeatilByID from 'src/sections/rm-panel/multi-unit/components/group-list-detail-by-id';

import { AuthGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

const IndexPage = lazy(() => import('src/pages/dashboard/page'));
const PageTwo = lazy(() => import('src/sections/rm-panel/post-booking-form/post-booking-form'));
const PageThree = lazy(() => import('src/pages/dashboard/three'));
const PageFour = lazy(() => import('src/pages/dashboard/four'));
const PageFive = lazy(() => import('src/pages/dashboard/five'));
const PageSix = lazy(() => import('src/pages/dashboard/page'));
const IncentiveDashboard = lazy(() => import('src/pages/rm-panel/incentive-dashboard/list'));
const IncentiveSlabsListPage = lazy(() => import('src/pages/rm-panel/incentive-slabs/list'));
const ReportsPage = lazy(() => import('src/pages/rm-panel/reports/list'));
const ProfileSettingsPage = lazy(() => import('src/pages/profile/settings'));
const UnitSwapPage = lazy(() => import('src/pages/rm-panel/unit-swap/unit-swap-page'));
const GroupListingPage = lazy(() => import('src/pages/rm-panel/group-listing/group-listing-page'));
const CreateMUltiUnit = lazy(() => import('src/pages/rm-panel/group-listing/create-mutli-unit'));
const ApplicantMapping = lazy(
  () => import('src/sections/rm-panel/opportunity-list/components/applicant-mapping')
);
const AgreementESignatureEdit = lazy(
  () => import('src/pages/crm/dashboard/agreement-eSignature-edit')
);
const AgreementESignatureList = lazy(() => import('src/pages/crm/dashboard/page'));

const ExpressionOfInterest = lazy(
  () =>
    import('src/sections/common-module/expression-of-interest/expression-of-interest-table-view')
);
const CreateEOIView = lazy(
  () => import('src/sections/common-module/expression-of-interest/create-eoi-view')
);
const ChangeSource = lazy(
  () => import('src/sections/common-module/expression-of-interest/components/change-source')
);
const EOIPreviewView = lazy(
  () => import('src/sections/common-module/expression-of-interest/eoi-preview-view')
);
const ChannelPartners = lazy(
  () => import('src/sections/common-module/channel-partners/channel-partner-table-view')
);
const CreateChannelPartner = lazy(
  () => import('src/sections/common-module/channel-partners/create-channel-partner')
);
const VoucherDashboard = lazy(
  () => import('src/sections/rm-panel/voucher-dashboard/VoucherDashboard')
);
const Dashboard = lazy(() => import('src/pages/common-module/eoi-dashboard/dashboard'));
const Leaderboard = lazy(() => import('src/sections/common-module/eoi-leaderboard/leaderboard'));
const MapAndConvertView = lazy(
  () => import('src/sections/common-module/expression-of-interest/map-and-convert-view')
);
const UnitInventoryView = lazy(
  () => import('src/sections/common-module/inventory/unit-inventory-view')
);
const UnitInventoryFileUpload = lazy(
  () =>
    import('src/sections/common-module/inventory/unit-inventory-components/unit-invnetory-file-upload')
);
const MapUnitToVoucher = lazy(
  () => import('src/sections/common-module/inventory/map-unit-to-voucher-view')
);
const BankDetailsListView = lazy(
  () => import('src/sections/common-module/bank-details/bank-details-list-view')
);
const PreBookingFormView = lazy(
  () => import('src/sections/common-module/expression-of-interest/pre-booking-form-view')
);

// ----------------------------------------------------------------------

const layoutContent = (
  <RmPanelDashboardLayout>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </RmPanelDashboardLayout>
);

export const rmPanelRoutes = {
  path: '/rm-panel',
  element: CONFIG.auth.skip ? (
    <>{layoutContent}</>
  ) : (
    <AuthGuard>
      {/* <RoleBasedGuard currentRole={currentRole} acceptRoles={['rm-user']} hasContent> */}
      {layoutContent}
      {/* </RoleBasedGuard> */}
    </AuthGuard>
  ),
  children: [
    { element: <IndexPage />, index: true },
    { path: 'two', element: <PageTwo /> },
    { path: 'three', element: <PageThree /> },
    {
      path: 'bookings/pre-booking-form/:oppId',
      element: (
        <SignatureBookingRouteGuard>
          <PreBookingForm />
        </SignatureBookingRouteGuard>
      ),
    },
    {
      path: 'bookings/post-booking-form/:oppId',
      element: (
        <SignatureBookingRouteGuard>
          <PostBookingForm />
        </SignatureBookingRouteGuard>
      ),
    },
    {
      path: 'bookings',
      element: (
        <SignatureBookingRouteGuard>
          <IndexPage />
        </SignatureBookingRouteGuard>
      ),
    },
    { path: 'dashboard', element: <AgreementESignatureList /> },
    { path: 'dashboard/:agreementId', element: <AgreementESignatureEdit /> },
    {
      path: 'incentive-dashboard',
      element: <IncentiveDashboard />,
    },
    { path: 'incentive-slabs', element: <IncentiveSlabsListPage /> },
    { path: 'reports', element: <ReportsPage /> },
    { path: 'unit-swap', element: <UnitSwapPage /> },
    { path: 'voucherDashboard', element: <VoucherDashboard /> },
    { path: 'eoi-records', element: <ExpressionOfInterest /> },
    { path: 'eoi-records/create', element: <CreateEOIView /> },
    { path: 'eoi-records/edit/:id', element: <CreateEOIView /> },
    { path: 'eoi-records/change-source/edit/:id', element: <ChangeSource /> },
    { path: 'eoi-records/change-source/create/:id', element: <ChangeSource /> },
    { path: 'preview-voucher/:id', element: <EOIPreviewView /> },
    { path: 'cp-list/create', element: <CreateChannelPartner /> },
    { path: 'cp-list', element: <ChannelPartners /> },
    { path: 'profile/settings', element: <ProfileSettingsPage /> },
    { path: 'eoi-records/map-convert/:id', element: <MapAndConvertView /> },
    { path: 'eoi-records/pre-booking-form/:id', element: <PreBookingFormView /> },

    {
      path: 'group',
      children: [
        { element: <PageFour />, index: true },
        { path: 'five', element: <PageFive /> },
        { path: 'six', element: <PageSix /> },
      ],
    },
    { path: 'group-list', element: <GroupListingPage /> },
    { path: 'manage-applicants/:oppId', element: <ApplicantMapping /> },
    { path: 'group-list/create-multi-unit', element: <CreateMUltiUnit /> },
    { path: 'group-list/edit-multi-unit/:groupId', element: <CreateMUltiUnit /> },
    { path: 'group-list/group-details/:id', element: <GroupListingDeatilByID /> },
    { path: 'eoi-dashboard', element: <Dashboard /> },
    { path: 'eoi-leaderboard', element: <Leaderboard /> },
    { path: 'inventory', element: <UnitInventoryView /> },
    { path: 'inventory/upload-unit-inventory/:id', element: <UnitInventoryFileUpload /> },
    { path: 'inventory/map-unit-to-voucher/:id', element: <MapUnitToVoucher /> },
    { path: 'bank-details', element: <BankDetailsListView /> },
  ],
};
