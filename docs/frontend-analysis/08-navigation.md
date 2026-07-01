# Navigation Analysis

## Overview

Navigation is handled through a **shared `DashboardLayout`** that receives role-specific navigation data. Each role has its own navbar configuration in `config-nav-dashboard.tsx`.

## Architecture

```
DashboardLayout (src/layouts/dashboard/layout.tsx)
  ├── NavMobile (mobile drawer)
  ├── HeaderBase (top bar)
  │   └── NavHorizontal (horizontal nav on desktop)
  ├── NavVertical (sidebar navigation)
  └── Main (page content)
```

## DashboardLayout

**File:** `src/layouts/dashboard/layout.tsx`

Props:
```typescript
type DashboardLayoutProps = {
  navData: NavSectionProps['data'];  // Role-specific navigation config
  children: React.ReactNode;
  sx?: SxProps;
};
```

### Layout Variants

| Variant | Setting | Behavior |
|---------|---------|----------|
| **Vertical** | `navLayout: 'vertical'` | Sidebar (300px width) |
| **Mini** | `navLayout: 'mini'` | Collapsed sidebar (88px width) |
| **Horizontal** | `navLayout: 'horizontal'` | Top nav bar |

Users can toggle between Vertical and Mini via a sidebar collapse button.

### Mobile Behavior
- On screens < `lg` breakpoint, sidebar becomes a drawer
- Toggled via hamburger menu in header
- No horizontal nav on mobile

## Navigation Config

**File:** `src/layouts/config-nav-dashboard.tsx`

18+ role nav arrays are defined, each exported as `{roleName}Nav`:

| Nav Array | Role | Sections |
|-----------|------|----------|
| `adminNav` | Admin | Users, Masters, Incentives, EOI, Batch |
| `superAdminNav` | Super Admin | Users, Masters, Incentives, EOI, Logs, Batch |
| `rmNav` | RM | Bookings, E-Signer, Incentives, EOI |
| `crmNav` | CRM | E-Signer, EOI, Batch, IOM Management |
| `greNav` | GRE | Dashboard, Batch |
| `misNav` | MIS | EOI, Batch |
| `financeAdminNav` | Finance Admin | Employee List, Uploads, Logs History, EOI |
| `salesTLNav` | Sales TL | Bookings, E-Signer, EOI |
| `salesRSHNav` | Sales RSH | Bookings, E-Signer, EOI, Batch |
| `salesBHNav` | Sales BH | EOI |
| `bisNav` | BIS | Users, Bookings, Masters, Incentives, EOI, Batch |
| `projectHeadNav` | Project Head | E-Signer, EOI |
| `iomOnlyNav(roleRoot)` | CRM TL/Head, Finance User/Head, Loyalty | IOM Management |

### Nav Data Structure

```typescript
export const adminNav = [
  {
    items: [
      {
        title: 'Users',
        path: paths.admin.user.root,
        icon: ICONS.user,
      },
      {
        title: 'Masters',
        path: paths.admin.brand.root,
        icon: ICONS.brand,
        children: [
          { title: 'Brands', path: paths.admin.brand.root },
          { title: 'Projects', path: paths.admin.project.root },
          { title: 'Project Phases', path: paths.admin.phase.root },
        ],
      },
      // ... more items
    ],
  },
];
```

Nav items can be:
- **Leaf items** - `{ title, path, icon }`
- **Group items** - `{ title, path, icon, children: [...] }`
- **Nested groups** - `{ title, children: [...] }` (up to 2 levels deep)

## Icon System

```typescript
const ICONS = {
  user: icon('user-icon'),
  dashboard: icon('dashboard-icon'),
  eoi: icon('EOI'),
  batchManager: icon('batch-manager'),
  // 30+ icons
};

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.site.basePath}/assets/icons/navbar/${name}.svg`} />
);
```

Icons are SVG files stored in `public/assets/icons/navbar/` and rendered via the `SvgColor` component which applies CSS color.

## Nav Components

| Component | File | Description |
|-----------|------|-------------|
| `NavVertical` | `src/layouts/dashboard/nav-vertical.tsx` | Sidebar with collapse toggle |
| `NavHorizontal` | `src/layouts/dashboard/nav-horizontal.tsx` | Top horizontal bar |
| `NavMobile` | `src/layouts/dashboard/nav-mobile.tsx` | Mobile drawer |
| `HeaderBase` | `src/layouts/core/header-base.tsx` | Top header bar |
| `NavBottomArea` | `src/layouts/components/nav-bottom-area.tsx` | Account + notifications at nav bottom |
| `LayoutSection` | `src/layouts/core/layout-section.tsx` | Grid layout wrapper |

## Account Configuration

**File:** `src/layouts/config-nav-account.tsx`

Defines the account dropdown items (profile settings, logout) displayed in the nav bottom area.

## Workspace Configuration

**File:** `src/layouts/config-nav-workspace.tsx`

Workspace switcher in the header (for multi-brand/project environments).

## CSS Variables

The layout uses CSS custom properties for dynamic theming:

```
--layout-nav-bg
--layout-nav-vertical-width (300px)
--layout-nav-mini-width (88px)
--layout-nav-horizontal-height (64px)
--layout-dashboard-content-pt
--layout-dashboard-content-pb
--layout-dashboard-content-px
```

## Key Characteristics

1. **Role-specific nav data** - Each role has its own nav array with relevant menu items
2. **Shared layout shell** - All roles use `DashboardLayout`; only `navData` changes
3. **Centralized icon registry** - All nav icons defined once in `config-nav-dashboard.tsx`
4. **No RBAC within nav** - Nav items are statically defined per role; no dynamic permission-based filtering
5. **Three nav modes** - Vertical sidebar, mini sidebar, horizontal top bar
6. **Single-module roles** - CRM TL/Head, Finance User/Head, Loyalty share `iomOnlyNav(roleRoot)`
