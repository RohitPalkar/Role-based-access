import { useContext } from 'react';

import { PermissionContext } from '../context/permission-context';

import type { PermissionContextValue } from '../types';

export function usePermission(): PermissionContextValue {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }

  return context;
}
