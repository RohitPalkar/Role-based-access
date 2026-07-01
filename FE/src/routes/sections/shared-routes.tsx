import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { DashboardLayout } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

const EncryptionDebugger = lazy(
  () => import('src/pages/EncryptionDebugger/EncryptionDebugger')
);
export const sharedRoutesNav = [];

const layoutContent = (
<DashboardLayout navData={sharedRoutesNav}>
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

export const sharedRoutes = {
  path: '/shared-routes',
  element: (
    <AuthGuard>
      {layoutContent}
    </AuthGuard>
  ),
  children: [
    {
      path: 'encryption-debugger',
      element: <EncryptionDebugger />,
    },
  ],
};
