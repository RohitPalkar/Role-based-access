
import { crmRoutes } from './crm-routes';
import { greRoutes } from './gre-routes';
import { misRoutes } from './mis-routes';
import { bisRoutes } from './bis-routes';
import { adminRoutes } from './admin-routes';
import { rmPanelRoutes } from './rm-panel-routes';
import { salesBHRoutes } from './sales-bh-routes';
import { salesTLRoutes } from './sales-tl-routes';
import { salesRSHRoutes } from './sales-rsh-routes';
import { superAdminRoutes } from './super-admin-routes';
import { financeAdminRoutes } from './finance-admin-routes';

export const dashboardRoutes = [
  adminRoutes,
  superAdminRoutes,
  financeAdminRoutes,
  rmPanelRoutes,
  crmRoutes,
  greRoutes,
  misRoutes,
  salesTLRoutes,
  salesBHRoutes,
  bisRoutes,
  salesRSHRoutes

];
