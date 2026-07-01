import type { NavItemBaseProps } from 'src/components/nav-section/types';
import type { NavSectionProps } from 'src/components/nav-section';

import type { PermissionContextValue } from './types';

type NavGroup = NavSectionProps['data'][number];

function getNavPermission(item: NavItemBaseProps): { moduleCode: string; actionCode?: string } | undefined {
  return (item as any).permission;
}

function hasItemPermission(
  item: NavItemBaseProps,
  permissions: PermissionContextValue
): boolean {
  const permission = getNavPermission(item);
  if (!permission) return true;
  if (permission.actionCode) {
    return permissions.hasPermission(permission.moduleCode, permission.actionCode);
  }
  return permissions.hasModule(permission.moduleCode);
}

function filterNavItems(
  items: NavItemBaseProps[],
  permissions: PermissionContextValue
): NavItemBaseProps[] {
  return items
    .filter((item) => hasItemPermission(item, permissions))
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: filterNavItems(item.children, permissions),
        };
      }
      return item;
    })
    .filter((item) => {
      if (item.children && Array.isArray(item.children)) {
        return item.children.length > 0;
      }
      return true;
    });
}

export function filterNavByPermissions(
  navData: NavSectionProps['data'],
  permissions: PermissionContextValue
): NavSectionProps['data'] {
  if (!permissions.permissions.length) {
    return navData;
  }

  return navData
    .map((group: NavGroup) => ({
      ...group,
      items: filterNavItems(group.items, permissions),
    }))
    .filter((group) => group.items.length > 0);
}
