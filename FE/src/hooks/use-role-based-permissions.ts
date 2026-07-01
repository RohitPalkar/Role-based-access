import type { RootState } from 'src/redux/store';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import {
  hasPermission,
  type RoleAction,
  type RoleColumn,
  type RoleFilter,
  getFilteredActions,
  type ModulePermissions,
  type RoleActionContext,
  getRoleBasedPermissions,
} from 'src/config/role-based-permissions';

interface UseRoleBasedPermissionsProps {
  module: string;
  rowData?: any;
  userRole?: string | null; // Optional: if role is passed directly from API
  /** EOI Records: pass Redux `tabValue` so `getFilteredActions` can scope `approveUnitTabOnly` actions. */
  eoiListTab?: string;
}

interface UseRoleBasedPermissionsReturn {
  /** 
   * Complete permissions object - Single source of truth
   * Contains columns, filters, actions, canCreate, canViewAll
   */
  permissions: ModulePermissions;
  
  /** Computed permission flags */
  canCreate: boolean;
  canExport: boolean;
  canRefresh: boolean;
  canViewAll: boolean;
  userRole: string | null;
  useTab: boolean;

  /** 
   * Direct access helpers for convenience - These reference permissions.*
   * Use these for cleaner destructuring: const { columns, filters } = useRoleBasedPermissions(...)
   */
  columns: RoleColumn[];
  filters: RoleFilter[];
  actions: RoleAction[];

  getRowActions: (rowData: any, context?: RoleActionContext) => RoleAction[];
  canSelectRows?: boolean;
}

/**
 * Custom hook for managing role-based permissions
 * @param module - Module name (e.g., 'eoi')
 * @param rowData - Optional row data for action filtering
 * @returns Role-based permissions and helper functions
 */
export function useRoleBasedPermissions({
  module,
  rowData,
  userRole: propsUserRole,
  eoiListTab,
}: UseRoleBasedPermissionsProps): UseRoleBasedPermissionsReturn {
  // Get user role from Redux store if not provided via props
  const reduxUserRole = useSelector((state: RootState) => {
    // Try auth state first
    const authRole = state?.auth?.user?.role;
    if (authRole && typeof authRole === 'string') {
      return authRole;
    }
    
    // Try userlist userDetails as fallback (from detail API)
    const userDetailsRole = state?.userlist?.userDetails?.role;
    if (userDetailsRole && typeof userDetailsRole === 'string') {
      return userDetailsRole;
    }
    
    return null;
  });

  // Use provided role or fall back to Redux role
  const userRole = propsUserRole || reduxUserRole;

  // Log missing role for debugging in development
  if (process.env.NODE_ENV === 'development' && !userRole) {
    console.warn('No user role found. Using default permissions.');
  }

  // Memoize permissions to avoid unnecessary recalculations
  const permissions = useMemo(() => 
    getRoleBasedPermissions(userRole, module), 
    [userRole, module]
  );

  const eoiListContext = useMemo(
    () => (module === 'eoi' && eoiListTab ? { eoiListTab } : undefined),
    [module, eoiListTab]
  );

  // Memoize role-based data
  const roleBasedData = useMemo(() => {
    const canCreate = hasPermission(userRole, module, 'canCreate');
    const canExport = hasPermission(userRole, module, 'canExport');
    const canRefresh = hasPermission(userRole, module, 'canRefresh');
    const canViewAll = hasPermission(userRole, module, 'canViewAll');
    const actions = getFilteredActions(userRole, module, rowData, eoiListContext);

    return {
      canCreate,
      canExport,
      canRefresh,
      canViewAll,
      actions,
    };
  }, [userRole, module, rowData, eoiListContext]);

  // Function to get actions for a specific row
  const getRowActions = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-shadow
      (rowData: any, _context?: RoleActionContext) =>
        getFilteredActions(userRole, module, rowData, eoiListContext),
    [userRole, module, eoiListContext]
  );

return {
  permissions,
  canCreate: roleBasedData.canCreate,
  canExport: roleBasedData.canExport,
  canRefresh: roleBasedData.canRefresh,
  canViewAll: roleBasedData.canViewAll,
  userRole,

  columns: permissions.columns ?? [],
  filters: permissions.filters ?? [],
  actions: permissions.actions ?? [],
  /** Only literal `true` in role config enables tab UIs (e.g. EOI sub-tabs, unit list vs tower). */
  useTab: permissions.useTab === true,
  getRowActions,
  canSelectRows: permissions.canSelectRows === true,
};

}

/**
 * Simplified hook for checking single permission
 * @param module - Module name
 * @param permission - Permission type
 * @returns boolean
 */
export function useHasPermission(
  module: string, 
  permission: 'canCreate' | 'canExport' | 'canRefresh' | 'canViewAll'
): boolean {
  const userRole = useSelector((state: RootState) => {
    const authRole = state?.auth?.user?.role;
    return (authRole && typeof authRole === 'string') ? authRole : null;
  });

  return useMemo(() => 
    hasPermission(userRole, module, permission), 
    [userRole, module, permission]
  );
}

/**
 * Hook to get user role
 * @returns User role string or null
 */
export function useUserRole(): string | null {
  return useSelector((state: RootState) => {
    const authRole = state?.auth?.user?.role;
    return (authRole && typeof authRole === 'string') ? authRole : null;
  });
}