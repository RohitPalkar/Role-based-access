# Role & Permission Analysis

## Overview

The frontend implements a **module-level permission system** defined in `src/config/role-based-permissions.ts` (5074 lines). Permissions control which columns, filters, actions, and capabilities each role has per module.

## Permission Model

### Architecture

```
ROLE_BASED_PERMISSIONS[role][module] → ModulePermissions
```

Where:
- **Role**: One of 18+ roles (Super Admin, Admin, RM, etc.)
- **Module**: Feature area (eoi, userList, eoiDashboard, channelPartners, etc.)
- **ModulePermissions**: Columns, filters, actions, booleans (canCreate, canExport, canRefresh, etc.)

### Interfaces

```typescript
interface ModulePermissions {
  columns?: RoleColumn[];      // Table column config (visibility, width, order)
  filters?: RoleFilter[];      // Available filter controls
  actions?: RoleAction[];      // Row-level action buttons
  canCreate?: boolean;         // Show "Create" button
  canExport?: boolean;         // Show "Export" button
  canRefresh?: boolean;        // Show "Refresh/Sync" button
  canViewAll?: boolean;        // View all records (vs. own records)
  useTab?: boolean;            // Enable sub-tabs
  canEdit?: boolean;           // Allow inline editing
  canSelectRows?: boolean;     // Allow row selection
  eoiRecordsTabs?: EoiRecordsTabVisibility;    // EOI sub-tab config
  unitInventoryTabs?: UnitInventoryTabVisibility;
  iomManagementTabs?: IomManagementTabVisibility;
}

interface RoleColumn {
  id: string; label: string; width?: number;
  visible: boolean; disableToggle?: boolean;
  tab?: string; group?: string;
}

interface RoleFilter {
  id: string; label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'boolean';
}

interface RoleAction {
  id?: string; label?: string; icon?: string;
  disabled?: boolean | ((row) => boolean);
  condition?: (row) => boolean;
  visible?: (row) => boolean;
  approveUnitTabOnly?: boolean;
}
```

## Permission Resolution

### `getRoleBasedPermissions(role, module)`

```
role? → ROLE_BASED_PERMISSIONS[role]? → RolePermissions[module]? → ModulePermissions
  ↓ null/default                                          ↓ not found/default
  DEFAULT_PERMISSIONS (empty)                             DEFAULT_PERMISSIONS
```

### `hasPermission(role, module, permission)`

Returns boolean for `canCreate`, `canExport`, `canRefresh`, `canViewAll`, `useTab`.

### `getFilteredActions(role, module, rowData, context)`

Returns actions filtered by:
1. `approveUnitTabOnly` flag (EOI tab context)
2. `visible(rowData)` function
3. `condition(rowData)` function

## Modules with Permission Configs

| Module | Permissions Customized For |
|--------|---------------------------|
| `eoi` | Columns (30+), filters, actions, canExport, useTab, eoiRecordsTabs |
| `eoiDashboard` | Columns (20+), filters, canExport |
| `eoiManager` | Columns, filters, actions, canCreate |
| `channelPartners` | Columns, filters, actions |
| `unitInventory` | Columns, filters, actions, useTab, unitInventoryTabs |
| `eoiLeaderboard` | Columns, filters, actions |
| `userList` | Columns, filters, actions, canCreate |
| `project` | Columns, filters, actions, canCreate |
| `booster` | Columns, filters, actions, canCreate |
| `incentiveStructure` | Columns, filters, actions, canCreate |
| `brands` | Columns, filters, actions |
| `phase` | Columns, filters, actions |
| `reportsUser` | Columns, filters, actions |
| `reportsBooking` | Columns, filters, actions |
| `reportsIncentive` | Columns, filters |
| `incentiveDashboard` | Columns |
| `leaderBoard` | Columns |
| `bankDetails` | Columns, filters, actions |
| `iomManagement` | Columns, filters, actions, useTab, iomManagementTabs |
| `invoiceListing` | Columns, filters |
| `agreementManagement` | Columns, filters, actions |
| `salaryUpload` | Columns, actions |
| `employeeList` | Columns, actions |
| `logHistory` | Columns |
| `approvalUnitList` | Columns |

## Shared Permission Modules

Some modules are shared across admin-shaped roles via spread:

```typescript
const ADMIN_INCENTIVE_STACK_MODULES = { /* booster, incentiveStructure, incentiveDashboard, leaderBoard */ };
const ADMIN_ROLE_NAV_LIST_MODULES = { /* userList, project, brands, phase, ... */ };
```

These are applied to Super Admin, Admin, and BIS roles.

## Frontend Permission Hooks

**File:** `src/hooks/use-role-based-permissions.ts`

| Hook | Return | Usage |
|------|--------|-------|
| `useRolePermissions({ module, userRole })` | `{ permissions, canCreate, canExport, canRefresh, canViewAll, columns, filters, actions, getRowActions }` | Main hook for permission-aware views |
| `useHasPermission(module, permission)` | `boolean` | Quick permission check |
| `useUserRole()` | `string \| null` | Current user's role from Redux |

### Role Resolution Priority

1. `userRole` prop passed to hook
2. `state.auth.user.role` from Redux
3. `state.userlist.userDetails.role` from Redux (fallback)

## Route Guards vs Permission System

| Layer | Component | Purpose |
|-------|-----------|---------|
| **Route Guard** | `AuthGuard` | Prevents unauthenticated access |
| **Route Guard** | `RoleBasedGuard` | Shows "permission denied" for entire pages |
| **Component Permission** | `useRolePermissions` hook | Controls UI elements (buttons, columns, actions) |

## Key Characteristics

1. **5074-line config file** - All permissions defined in a single file
2. **Column-level control** - Each role sees different columns with custom visibility
3. **Row-level action filtering** - Actions conditionally shown/hidden per row via `visible`/`condition` callbacks
4. **Tab-level scoping** - EOI actions scoped to specific tabs (`approveUnitTabOnly`)
5. **No server-side permission sync** - All permission logic is frontend-only, derived from role string
6. **Admin-shaped reuse** - Super Admin, Admin, BIS share permission configs via object spread
7. **IOM-only roles** - CRM TL/Head, Finance User/Head, Loyalty have minimal permission configs
