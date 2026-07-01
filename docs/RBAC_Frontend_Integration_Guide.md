# RBAC Frontend Integration Guide

## Overview

This document describes the integration of backend RBAC into the existing React frontend. The system provides module-level and action-level permission checks for navigation filtering, route protection, and conditional UI rendering.

## Architecture

```
Backend (NestJS + TypeORM)
  └── GET /rbac/permissions/my
       → [{ module: string, actions: string[] }]

Frontend
  ├── PermissionProvider (context/permission-context.tsx)
  │   └── Fetches permissions on login, normalizes response
  ├── usePermission() hook
  │   └── Provides hasModule(), hasPermission(), getModuleActions()
  ├── filterNavByPermissions() (utils.ts)
  │   └── Filters nav items by permission metadata
  ├── PermissionGuard (<Route> wrapper)
  │   └── Blocks route access, renders Access Denied
  └── CanAccess (<Component> wrapper)
      └── Conditionally renders children or fallback
```

## Migration & Seed

Two TypeORM migrations must be run against the database:

```bash
# Create RBAC tables
npx typeorm-ts-node-commonjs migration:run -d src/config/typeorm.config.ts
# (1783000000000-CreateRBACTables.ts creates 11 tables)

# Seed lookup data
# (1783000000001-SeedRBACData.ts seeds levels, zones, 31 modules, 5 actions)
```

The seed data includes 31 module definitions with codes matching frontend nav permission keys (e.g., `users`, `eoi-records`, `batch`, `inventory`).

## Frontend RBAC Module

All RBAC frontend code lives in `src/rbac/`:

| File | Purpose |
|------|---------|
| `types.ts` | Type definitions; augments `NavItemBaseProps` with `permission` field |
| `context/permission-context.tsx` | `PermissionProvider` — watches auth state, fetches `/rbac/permissions/my`, provides context |
| `hooks/use-permission.ts` | `usePermission()` — consumer hook returning context value |
| `guards/permission-guard.tsx` | `<PermissionGuard moduleCode="..." actionCode?="...">` — route guard |
| `components/can-access.tsx` | `<CanAccess moduleCode="..." actionCode?="..." fallback?={...}>` — conditional render |
| `utils.ts` | `filterNavByPermissions()` — filter nav items by permission metadata |

### PermissionProvider

Wraps the app inside `AuthProvider` in `app.tsx`:

```tsx
<AuthProvider>
  <PermissionProvider>
    <StoreProvider>
      <Router />
    </StoreProvider>
  </PermissionProvider>
</AuthProvider>
```

On mount and whenever `authenticated` becomes true, it calls `GET /rbac/permissions/my` and normalizes the response. The context exposes:

- `permissions: UserPermission[]` — flat array of `{ module: string, actions: string[] }`
- `hasModule(moduleCode: string): boolean` — check module access
- `hasPermission(moduleCode: string, actionCode: string): boolean` — check module+action
- `getModuleActions(moduleCode: string): string[]` — list permitted actions for a module

### Nav Filtering

In `layouts/dashboard/layout.tsx`, the layout reads permissions via `usePermission()` and filters `navData` before passing to nav components:

```tsx
const { permissions } = usePermission();
const filteredNavData = filterNavByPermissions(navData, permissions);
```

Nav items in `config-nav-dashboard.tsx` include a `permission` field:

```tsx
{
  title: 'EOI Records',
  path: '/admin/eoi-records',
  permission: { moduleCode: 'eoi-records' },
}
```

Items without `permission` metadata are always visible.

### Route Protection

`PermissionGuard` wraps route elements in `admin-routes.tsx` and `super-admin-routes.tsx`:

```tsx
{
  path: 'eoi-records',
  element: <PermissionGuard moduleCode="eoi-records"><ExpressionOfInterest /></PermissionGuard>,
}
```

If the user lacks the module, PermissionGuard renders an Access Denied page instead.

### Conditional UI

`CanAccess` hides/shows UI elements based on permissions:

```tsx
<CanAccess moduleCode="eoi-records" actionCode="delete" fallback={null}>
  <button onClick={handleDelete}>Delete</button>
</CanAccess>
```

### 403 Error Handling

In `services/axiosInterceptors.ts`, 403 responses trigger a `toast.error()` with the backend's error message:

```
{ success: false, response: null, errors: { statusCode: 403, message: "..." } }
```

## Wiring Checklist

### Backend

- [ ] Run `1783000000000-CreateRBACTables.ts` migration
- [ ] Run `1783000000001-SeedRBACData.ts` migration (seeds lookup data)
- [ ] Create user-role assignments in `user_role_assignments` table
- [ ] Create department-role-module mappings in `dept_role_module_mappings` table
- [ ] Verify `GET /rbac/permissions/my` returns data for authenticated users

### Frontend

- [ ] `PermissionProvider` is wrapped inside `AuthProvider` in `app.tsx` ✓
- [ ] Dashboard layout filters nav by permissions ✓
- [ ] Nav items annotated with `permission.moduleCode` ✓
- [ ] Admin/super-admin routes wrapped with `PermissionGuard` ✓
- [ ] 403 interceptor shows toast ✓
- [ ] `RBAC_PERMISSIONS_MY` route constant exists in `apiRoutes.ts` ✓

## Module Codes (Nav → Backend)

| Nav Module Code | Description |
|----------------|-------------|
| `users` | User management |
| `masters` | Masters section |
| `brands` | Brand listing |
| `projects` | Project listing |
| `phases` | Phase listing |
| `incentives` | Incentives section |
| `incentives-records` | Incentive records |
| `reports-users` | Reports — users |
| `reports-bookings` | Reports — bookings |
| `reports-incentives` | Reports — incentives |
| `leaderboard` | Leaderboard |
| `incentive-policy` | Incentive policy |
| `booster-policy` | Booster policy |
| `booking-date-modification` | Booking date modification |
| `eoi` | EOI section |
| `eoi-dashboard` | EOI dashboard |
| `eoi-leaderboard` | EOI leaderboard |
| `eoi-records` | EOI records |
| `eoi-manager` | EOI manager |
| `cp-list` | Channel partner list |
| `inventory` | Unit inventory |
| `bank-details` | Bank details |
| `sfdc-logs` | SFDC logs |
| `batch` | Batch manager |

## PermissionGuard Module Codes (Route → Backend)

Routes are mapped to module codes exactly as above. Key mappings:

- `/admin/eoi-records/*` → `eoi-records`
- `/admin/eoi-manager/*` → `eoi-manager`
- `/admin/batch/*` → `batch`
- `/admin/inventory/*` → `inventory`
- `/admin/bank-details` → `bank-details`
- `/admin/leader-board/*` → `leaderboard`
- `/admin/booking-date-modification` → `booking-date-modification`
- `/admin/reports/users/*` → `reports-users`
- `/admin/reports/bookings` → `reports-bookings`
- `/admin/reports/incentives` → `reports-incentives`
- `/admin/sfdc-logs` → `sfdc-logs`
