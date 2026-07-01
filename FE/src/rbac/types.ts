import type { NavItemBaseProps } from 'src/components/nav-section/types';

export interface UserPermission {
  moduleCode: string;
  subModuleCode?: string | null;
  actionCode?: string | null;
}

export interface EffectivePermission {
  module: string;
  actions: string[];
}

export interface PermissionContextValue {
  permissions: UserPermission[];
  loading: boolean;
  error: string | null;
  refreshPermissions: () => Promise<void>;
  hasPermission: (moduleCode: string, actionCode: string) => boolean;
  hasModule: (moduleCode: string) => boolean;
  getModuleActions: (moduleCode: string) => string[];
}

export interface PermissionGuardProps {
  moduleCode: string;
  actionCode?: string;
  children: React.ReactNode;
  redirectTo?: string;
}

export interface CanAccessProps {
  moduleCode: string;
  actionCode: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface NavItemPermission {
  moduleCode: string;
  actionCode?: string;
}

declare module 'src/components/nav-section/types' {
  interface NavItemBaseProps {
    permission?: NavItemPermission;
  }
}
