import { Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { financeAdminNav } from 'src/layouts/config-nav-dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import FinanceRecordDetailsTable from 'src/sections/common-module/expression-of-interest/components/finance-components/finance-record-details-table-view';

import { AuthGuard } from 'src/auth/guard';

import { ROOTS } from '../paths';
// ----------------------------------------------------------------------

const EmployeeListPage = lazy(() => import('src/pages/finance-admin/employee-list/employee-list'));
const EditEmployeeListPage = lazy(() => import('src/pages/finance-admin/employee-list/employee-list-edit'));
const SalaryPage = lazy(() => import('src/pages/finance-admin/salary/salary'));
const LogsPage = lazy(() => import('src/pages/finance-admin/log-list/logs-list'));
const ExpressionOfInterest = lazy(
  () => import('src/sections/common-module/expression-of-interest/expression-of-interest-table-view')
);
const EOIPreviewView = lazy(() => import('src/sections/common-module/expression-of-interest/eoi-preview-view'));
const FinanceUpload = lazy(() => import('src/sections/common-module/finance-upload/finance-file-upload'));
const ProfileSettingsPage = lazy(() => import('src/pages/profile/settings'));
// ----------------------------------------------------------------------

const layoutContent = (
    <DashboardLayout navData={financeAdminNav}>
        <Suspense fallback={<LoadingScreen />}>
            <Outlet />
        </Suspense>
    </DashboardLayout>
);



export const financeAdminRoutes = 
     {
        path: ROOTS?.FINANCE_ADMIN,
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
            { path: 'employee-list', element: <EmployeeListPage />, index: true },
            { path: 'employee-list/:id/edit', element: <EditEmployeeListPage />, index: true },
            { path: 'salary', element: <SalaryPage />, index: true },
            { path: 'logs', element: <LogsPage />, index: true },
            { path: 'eoi-records', element: <ExpressionOfInterest />, index: true },
            { path: 'eoi-records/finance-record-details/:id', element: <FinanceRecordDetailsTable/>, index: true },
            { path: 'preview-voucher/:id', element: <EOIPreviewView /> },
            { path: 'upload-finance-records', element: <FinanceUpload /> },
            { path: 'profile/settings', element: <ProfileSettingsPage /> },
        ],
    };
