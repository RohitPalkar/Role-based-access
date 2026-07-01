import { createContext, useMemo, useEffect, useCallback, useState } from 'react';

import axios from 'src/utils/axios';

import { route } from 'src/services/apiRoutes';

import { useAuthContext } from 'src/auth/hooks';

import type { UserPermission, EffectivePermission, PermissionContextValue } from '../types';

export const PermissionContext = createContext<PermissionContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

function normalizePermissions(raw: any): UserPermission[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    if ('moduleCode' in raw[0] && 'actionCode' in raw[0]) {
      return (raw as UserPermission[]).map((p) => ({
        ...p,
        moduleCode: p.moduleCode.toLowerCase(),
        actionCode: p.actionCode?.toLowerCase() ?? null,
        subModuleCode: p.subModuleCode?.toLowerCase() ?? null,
      }));
    }
    if ('module' in raw[0] && 'actions' in raw[0]) {
      const effective = raw as EffectivePermission[];
      return effective.flatMap((m) =>
        (m.actions ?? []).map((action) => ({
          moduleCode: m.module.toLowerCase(),
          actionCode: action.toLowerCase(),
          subModuleCode: null,
        }))
      );
    }
  }
  return [];
}

export function PermissionProvider({ children }: Props) {
  const { authenticated } = useAuthContext();

  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!authenticated) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(route.RBAC_PERMISSIONS_MY);
      const interceptorData = res?.data?.response?.data ?? res?.data?.data;
      const data = normalizePermissions(interceptorData);
      setPermissions(data);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        setError(err?.message ?? 'Failed to fetch permissions');
      }
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (moduleCode: string, actionCode: string): boolean => {
      if (!permissions.length) return false;
      const mc = moduleCode.toLowerCase();
      const ac = actionCode.toLowerCase();
      return permissions.some(
        (p) => p.moduleCode === mc && p.actionCode === ac
      );
    },
    [permissions]
  );

  const hasModule = useCallback(
    (moduleCode: string): boolean => {
      if (!permissions.length) return false;
      const mc = moduleCode.toLowerCase();
      return permissions.some((p) => p.moduleCode === mc);
    },
    [permissions]
  );

  const getModuleActions = useCallback(
    (moduleCode: string): string[] => {
      if (!permissions.length) return [];
      const mc = moduleCode.toLowerCase();
      return Array.from(
        new Set(
          permissions
            .filter((p) => p.moduleCode === mc && p.actionCode != null)
            .map((p) => p.actionCode!)
        )
      );
    },
    [permissions]
  );

  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions,
      loading,
      error,
      refreshPermissions: fetchPermissions,
      hasPermission,
      hasModule,
      getModuleActions,
    }),
    [permissions, loading, error, fetchPermissions, hasPermission, hasModule, getModuleActions]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}
