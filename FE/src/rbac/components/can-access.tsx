import type { ReactElement } from 'react';

import { usePermission } from '../hooks/use-permission';

import type { CanAccessProps } from '../types';

export function CanAccess({ moduleCode, actionCode, children, fallback = null }: CanAccessProps): ReactElement | null {
  const { hasPermission } = usePermission();

  if (hasPermission(moduleCode, actionCode)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
