import { useState, useEffect, useCallback } from 'react';

import { usePathname } from 'src/routes/hooks';
import { useActiveLink } from 'src/routes/hooks/use-active-link';
import { isExternalLink, removeLastSlash } from 'src/routes/utils';

import { NavItem } from './nav-item';
import { navSectionClasses } from '../classes';
import { NavUl, NavLi, NavCollapse } from '../styles';

import type { NavListProps, NavSubListProps, NavItemBaseProps } from '../types';

// ----------------------------------------------------------------------

/** Match route like useActiveLink: exact or child segment (avoids `/a` matching `/ab`). */
function navPathMatches(pathname: string, itemPath: string | undefined): boolean {
  if (!itemPath || itemPath.startsWith('#')) return false;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

/** True if pathname matches this item or any nested child (any depth). */
function hasActiveNavDescendant(item: NavItemBaseProps, pathname: string): boolean {
  const { children } = item;
  if (!Array.isArray(children) || children.length === 0) return false;
  return children.some((child: NavItemBaseProps) => {
    if (navPathMatches(pathname, child.path)) return true;
    return hasActiveNavDescendant(child, pathname);
  });
}

export function NavList({ data, render, depth, slotProps, enabledRootRedirect }: NavListProps) {
  const pathname = removeLastSlash(usePathname());

  const isChildActive = data.children ? hasActiveNavDescendant(data, pathname) : false;
  
  const active = useActiveLink(data.path, !!data.children) || pathname.includes(data.path) || isChildActive;

  const [openMenu, setOpenMenu] = useState(active);

  useEffect(() => {
    if (!active) {
      handleCloseMenu();
    } else if (isChildActive && data.children) {
      setOpenMenu(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, active, isChildActive]);

  const handleToggleMenu = useCallback(() => {
    if (data.children) {
      setOpenMenu((prev: any) => !prev);
    }
  }, [data.children]);

  const handleCloseMenu = useCallback(() => {
    setOpenMenu(false);
  }, []);

  const renderNavItem = (
    <NavItem
      render={render}
      // slots
      path={data.path}
      icon={data.icon}
      info={data.info}
      title={data.title}
      caption={data.caption}
      // state
      depth={depth}
      active={active}
      disabled={data.disabled}
      hasChild={!!data.children}
      open={data.children && openMenu}
      externalLink={isExternalLink(data.path)}
      enabledRootRedirect={enabledRootRedirect}
      // styles
      slotProps={depth === 1 ? slotProps?.rootItem : slotProps?.subItem}
      // actions
      onClick={handleToggleMenu}
    />
  );

  // Hidden item by role
  if (data.roles && slotProps?.currentRole) {
    if (!data?.roles?.includes(slotProps?.currentRole)) {
      return null;
    }
  }

  // Has children
  if (data.children) {
    return (
      <NavLi
        disabled={data.disabled}
        sx={{
          [`& .${navSectionClasses.li}`]: {
            '&:first-of-type': { mt: 'var(--nav-item-gap)' },
          },
        }}
      >
        {renderNavItem}

        <NavCollapse data-group={data.title} in={openMenu} depth={depth} unmountOnExit mountOnEnter>
          <NavSubList
            data={data.children}
            render={render}
            depth={depth}
            slotProps={slotProps}
            enabledRootRedirect={enabledRootRedirect}
          />
        </NavCollapse>
      </NavLi>
    );
  }

  // Default
  return <NavLi disabled={data.disabled}>{renderNavItem}</NavLi>;
}

// ----------------------------------------------------------------------

function NavSubList({ data, render, depth, slotProps, enabledRootRedirect }: NavSubListProps) {
  return (
    <NavUl sx={{ gap: 'var(--nav-item-gap)' }}>
      {data.map((list) => (
        <NavList
          key={list.title}
          data={list}
          render={render}
          depth={depth + 1}
          slotProps={slotProps}
          enabledRootRedirect={enabledRootRedirect}
        />
      ))}
    </NavUl>
  );
}
