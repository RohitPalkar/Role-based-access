# RBAC Impact Analysis

## Overview

This document analyzes the impact of Role-Based Access Control (RBAC) on the frontend codebase, covering what would need to change when adding new roles, modifying permissions, or restructuring the access model.

## Current RBAC Touchpoints

### 1. Route Registration

**File:** `src/routes/sections/index.tsx`

- 18 role cases in `switch(user?.role)`
- Each maps `ROLES.X` → route section + shared routes + notFound
- **Default (unauthenticated)** loads ALL route sections for chunk pre-loading

**Impact of adding a role:**
- Add new `ROLES.X` enum value in `src/utils/constant.ts`
- Create `src/routes/sections/{role}-routes.tsx`
- Import and add case in `index.tsx`
- Add `ROOTS.X` in `src/routes/paths.ts`

### 2. Navigation Configuration

**File:** `src/layouts/config-nav-dashboard.tsx`

- 18+ nav arrays (one per role)
- Single `iomOnlyNav(roleRoot)` function shared by 5 IOM-only roles

**Impact of adding a role:**
- Add new `{role}Nav` array
- Wire into route section: `DashboardLayout navData={roleNav}`

### 3. Permission Configuration

**File:** `src/config/role-based-permissions.ts` (5074 lines)

- 20+ modules with per-role column/filter/action configs
- Shared stacks: `ADMIN_INCENTIVE_STACK_MODULES`, `ADMIN_ROLE_NAV_LIST_MODULES`

**Impact of adding a role:**
- Add `[ROLES.X]: { ...sharedStacks, module: { columns, filters, actions, booleans } }` entry
- Or reuse existing config via spread

### 4. API Integration

**File:** `src/services/apiRoutes.ts` and service modules

- Role-based route sections map to role-specific API endpoints
- Some services are role-exclusive (e.g., `finance-admin/`, `rm-panel/`)

**Impact of adding a role:**
- No API impact if role reuses existing backend endpoints
- Add new service module if role needs unique endpoints

### 5. Redux State

**File:** `src/redux/store.ts`

- 45+ slices, some role-specific (e.g., `greDashboard`, `financeAdmin`)

**Impact of adding a role:**
- Add new slice if role needs unique state
- Register in store

### 6. Layout Components

**File:** `src/layouts/dashboard/layout.tsx`

- Shared `DashboardLayout` renders role-specific nav data
- Layout variants (vertical/mini/horizontal) controlled by settings, not role

**Impact of adding a role:**
- No layout changes needed unless role requires a custom layout

## Permission Change Impact

### Adding a Column to a Module

1. Add `RoleColumn` definition in base columns (or inline)
2. Add to every role's column array that should see it
3. Or add to shared base and override visibility per role

### Adding a New Module

1. Define `ModulePermissions` (columns, filters, actions, booleans)
2. Add entry to every role's permission config that needs it
3. Create the UI view component using `useRolePermissions` hook
4. Add route in the appropriate role section
5. Add nav item in role's nav config

### Changing Permission Boolean (e.g., `canCreate: true → false`)

1. Edit `ROLE_BASED_PERMISSIONS[role][module].canCreate`
2. UI automatically reflects change via `useRolePermissions` hook

## Single-Point-of-Truth Analysis

| Aspect | Single Source? | Notes |
|--------|---------------|-------|
| **Role list** | Yes - `ROLES` enum in `src/utils/constant.ts` | Single enum used everywhere |
| **Route mapping** | No - `routes/sections/index.tsx` maps roles to routes | Switch statement must be manually updated |
| **Nav config** | No - `config-nav-dashboard.tsx` has standalone nav arrays | Each role has its own array (some duplication) |
| **Permissions** | Yes - `ROLE_BASED_PERMISSIONS` config object | Single config file for all role/module permissions |
| **Path constants** | Yes - `paths` object in `src/routes/paths.ts` | All URLs centralized |
| **API routes** | Yes - `route` object in `src/services/apiRoutes.ts` | Consolidated from sub-modules via spread |

## Risk Areas

### High Risk
1. **Role enumeration** - Adding/removing a role requires touching 6+ files
2. **Nav duplication** - Admin/Super Admin navs are nearly identical (paths differ)
3. **Permission config size** - 5074-line file is fragile; one typo can break multiple modules
4. **Default route case** - Loading all routes for unauthenticated users increases bundle size

### Medium Risk
5. **Role string mismatch** - `ROLES` enum values used in frontend must match backend role names
6. **Guard bypass** - `AuthGuard` is role-agnostic; `RoleBasedGuard` is used inconsistently (some route sections have it commented out)
7. **Service coupling** - Service modules reference role-specific patterns (e.g., `admin-services/` used by Admin, Super Admin, BIS)

### Low Risk
8. **Inactive auth methods** - Multiple auth provider paths defined but only JWT is wired
9. **SharedRoutes dependency** - Every role loads shared routes even if not needed
