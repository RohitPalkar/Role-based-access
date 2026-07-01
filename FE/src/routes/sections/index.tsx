import { Navigate, useRoutes } from 'react-router-dom';

import { useAppSelector } from 'src/hooks/use-redux';

import { ROLES } from 'src/utils/constant';

import { CONFIG } from 'src/config-global';

import { useAuthContext } from 'src/auth/hooks';

import { authRoutes } from './auth';
import { mainRoutes } from './main';
import { crmRoutes } from './crm-routes';
import { greRoutes } from './gre-routes';
import { misRoutes } from './mis-routes';
import { bisRoutes } from './bis-routes';
import { adminRoutes } from './admin-routes';
import { crmTlRoutes } from './crm-tl-routes';
import { sharedRoutes } from './shared-routes';
import { loyaltyRoutes } from './loyalty-routes';
import { rmPanelRoutes } from './rm-panel-routes';
import { salesTLRoutes } from './sales-tl-routes';
import { salesBHRoutes } from './sales-bh-routes';
import { crmHeadRoutes } from './crm-head-routes';
import { salesRSHRoutes } from './sales-rsh-routes';
import { superAdminRoutes } from './super-admin-routes';
import { projectHeadRoutes } from './project-head-routes';
import { financeUserRoutes } from './finance-user-routes';
import { financeHeadRoutes } from './finance-head-routes';
import { financeAdminRoutes } from './finance-admin-routes';

// ----------------------------------------------------------------------

const defaultRoutes = [
  {
    path: '/',
    element: <Navigate to={CONFIG.auth.redirectPath} replace />,
  },

  // Auth Routes
  ...authRoutes,

  // Main Routes
  ...mainRoutes,
];
const notFound = { path: '*', element: <Navigate to="/404" replace /> };
export function Router() {
  const { user } = useAppSelector((state) => state.auth);
  const { authenticated } = useAuthContext();

  // Define activeRoutes based on the user's role
  let activeRoutes: any = [];
  // Update activeRoutes based on the role after the user is available
  switch (user?.role) {
    case ROLES.SuperAdmin:
      activeRoutes = [superAdminRoutes, sharedRoutes, notFound];
      break;
    case ROLES.Admin:
      activeRoutes = [adminRoutes, sharedRoutes, notFound];
      break;
    case ROLES.RM:
      activeRoutes = [rmPanelRoutes, sharedRoutes, notFound];
      break;
    case ROLES.FinanceAdmin:
      activeRoutes = [financeAdminRoutes, notFound];
      break;
    case ROLES.CRM:
      activeRoutes = [crmRoutes, notFound];
      break;
    case ROLES.GRE:
      activeRoutes = [greRoutes, notFound];
      break;
    case ROLES.MIS:
      activeRoutes = [misRoutes, notFound];
      break;
    case ROLES.SALES_TL:
      activeRoutes = [salesTLRoutes, notFound];
      break;
    case ROLES.SALES_RSH:
      activeRoutes = [salesRSHRoutes, notFound];
      break;
    case ROLES.SALES_BH:
      activeRoutes = [salesBHRoutes, notFound];
      break;
    case ROLES.PROJECT_HEAD:
      activeRoutes = [projectHeadRoutes, notFound];
      break;
    case ROLES.BIS:
      activeRoutes = [bisRoutes, notFound];
      break;
    case ROLES.CRM_TL:
      activeRoutes = [crmTlRoutes, notFound];
      break;
    case ROLES.CRM_HEAD:
      activeRoutes = [crmHeadRoutes, notFound];
      break;
    case ROLES.FINANCE_USER:
      activeRoutes = [financeUserRoutes, notFound];
      break;
    case ROLES.FINANCE_HEAD:
      activeRoutes = [financeHeadRoutes, notFound];
      break;
    case ROLES.LOYALTY:
      activeRoutes = [loyaltyRoutes, notFound];
      break;

    default:
      activeRoutes = !authenticated
        ? [
            superAdminRoutes,
            adminRoutes,
            financeAdminRoutes,
            crmRoutes,
            greRoutes,
            rmPanelRoutes,
            misRoutes,
            salesTLRoutes,
            salesBHRoutes,
            salesRSHRoutes,
            projectHeadRoutes,
            bisRoutes,
            crmTlRoutes,
            crmHeadRoutes,
            financeUserRoutes,
            financeHeadRoutes,
            loyaltyRoutes,
            notFound,
            sharedRoutes,
          ]
        : [];
  }

  // Always call useRoutes unconditionally
  const routes = useRoutes([...defaultRoutes, ...activeRoutes]);

  // // Handle role-based routes after `useRoutes` is called, ensure it's always called
  // if (!user.role) {
  //   // Use the loading screen component or some other visual indicator while the user is not loaded
  //   return null;
  // }

  // Re-render with the updated routes
  return routes;
}
