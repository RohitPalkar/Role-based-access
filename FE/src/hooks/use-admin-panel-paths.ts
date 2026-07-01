import { useLocation } from 'react-router-dom';

import { paths } from 'src/routes/paths';

/**
 * Returns admin, super-admin, or bis path helpers based on current URL.
 * Use in admin/super-admin/bis section components so links stay under the active panel.
 */
export function useAdminPanelPaths(): typeof paths.admin {
  const { pathname } = useLocation();
  if (pathname.startsWith('/super-admin')) {
    return paths.superAdmin;
  }
  if (pathname.startsWith('/bis')) {
    // `paths.bis` is a subset of admin URLs; only keys present on `bis` are safe to use under /bis.
    return paths.bis as unknown as typeof paths.admin;
  }
  return paths.admin;
}

