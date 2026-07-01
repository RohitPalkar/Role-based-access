# RBAC Gap Analysis

> **Date:** 2026-06-30
> **Source:** RBAC Info.xlsx (3 sheets) vs Existing FE + BE codebases
> **Scope:** Complete end-to-end gap identification

---

## Executive Summary

The codebase has a **basic role-based access control** (role name → route/UI filtering) but is missing the **full permission-based RBAC model** required by the Excel spec. The current system uses hardcoded configs on the frontend and role-name string matching on the backend, while the target model requires database-driven module/sub-module/action permissions with project scoping, hierarchy management, and dynamic role switching.

---

## 1. Missing Database Tables

### 1.1 New Tables Required

| # | Table | Purpose | Existing Equivalent | Gap |
|---|-------|---------|---------------------|-----|
| 1 | `zones` | Geographic zone master (West, East, etc.) | None | **MISSING** |
| 2 | `cities` | City within zone with FK → zones | `masters` module may have city data, but no `zone_id` FK | **MISSING** (or needs FK) |
| 3 | `levels` | Hierarchy levels (L1, L2, L3, L4) | None (levels are conceptual only) | **MISSING** |
| 4 | `role_definitions` | Roles with level + department FK | `roles` table exists (id, name only) | **PARTIAL** — needs `department_id`, `level_id`, `code` columns |
| 5 | `module_definitions` | Feature modules (EOI, IOM, Bookings, etc.) | None (modules are strings in FE config only) | **MISSING** |
| 6 | `sub_module_definitions` | Sub-modules with FK → modules | None | **MISSING** |
| 7 | `action_definitions` | Action types (CRUD + custom) with FK → module | None | **MISSING** |
| 8 | `dept_role_module_mappings` | Department → Role → Module → Sub-Module → Action mapping | None | **MISSING** |
| 9 | `user_role_assignments` | User primary/secondary role assignments with project_access JSON | `users.role_id` (single role only) | **GAP** — single FK vs multi-role with project scope |
| 10 | `user_hierarchies` | User's L2 manager, L3 team admin, L4 dept admin | `users.reporting_to` (single manager only) | **PARTIAL** — needs multi-level hierarchy |
| 11 | `user_project_module_access` | Per-user, per-project module toggle (is_enabled) | None | **MISSING** |

### 1.2 Existing Tables Requiring Modification

| Table | Missing Columns | Purpose |
|-------|----------------|---------|
| `roles` → rename/upgrade to `role_definitions` | `department_id` (FK), `level_id` (FK), `code` | Link roles to departments and hierarchy levels |
| `users` | `zone_id` (FK), `employment_status`, `user_group`, `group_start_date`, `group_end_date`, `primary_role_id`, `secondary_role_id` | Support new user creation flow |
| `departments` | `level` (default L5), `code` | Categorize department within org hierarchy |
| `projects` | `billing_entity`, `address`, `gstin`, `pin_code`, `company`, `payment_gateway`, `incentive_criteria` | Support IOM loyalty popup and project enrichment |
| `brands` | `address`, `gstin`, `pan`, `billing_entity` | Support IOM loyalty popup |

### 1.3 Database Gap Summary

| Status | Count |
|--------|-------|
| Fully missing tables | 9 |
| Partially existing (needs modification) | 2 (roles, users) |
| Minor enhancement needed | 3 (departments, projects, brands) |

---

## 2. Missing APIs

### 2.1 Master Data APIs (Fully Missing)

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | `/zones` | GET | List all zones |
| 2 | `/zones` | POST | Create zone |
| 3 | `/zones/:id` | PUT | Update zone |
| 4 | `/zones/:id` | DELETE | Delete zone |
| 5 | `/zones/:id/cities` | GET | List cities by zone |
| 6 | `/cities` | GET | List all cities |
| 7 | `/cities` | POST | Create city |
| 8 | `/cities/:id` | PUT | Update city |
| 9 | `/cities/:id` | DELETE | Delete city |
| 10 | `/levels` | GET | List hierarchy levels (L1–L4) |

### 1.2 Module/Sub-Module/Action APIs (Fully Missing)

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 11 | `/module-definitions` | GET | List all modules with sub-modules |
| 12 | `/module-definitions` | POST | Create module |
| 13 | `/module-definitions/:id` | PUT | Update module |
| 14 | `/module-definitions/:id` | DELETE | Delete module |
| 15 | `/sub-module-definitions` | GET | List sub-modules |
| 16 | `/sub-module-definitions` | POST | Create sub-module |
| 17 | `/sub-module-definitions/:id` | PUT | Update sub-module |
| 18 | `/action-definitions` | GET | List actions |
| 19 | `/action-definitions` | POST | Create action |
| 20 | `/action-definitions/:id` | PUT | Update action |

### 2.2 Permission Mapping APIs (Fully Missing)

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 21 | `/dept-role-module-mappings` | GET | Query mappings (by department, role, module) |
| 22 | `/dept-role-module-mappings` | POST | Create/update mapping |
| 23 | `/dept-role-module-mappings/:id` | PUT | Update single mapping |
| 24 | `/dept-role-module-mappings/:id` | DELETE | Remove mapping |
| 25 | `/dept-role-module-mappings/bulk` | POST | Bulk update mappings for a role |

### 2.3 Role Management APIs (Need Enhancement)

| # | Endpoint | Method | Existing | Gap |
|---|----------|--------|----------|-----|
| 26 | `/role-definitions` | GET | `/roles` exists (returns id, name only) | Needs `department_id`, `level`, `code` in response |
| 27 | `/role-definitions` | POST | `/roles` may exist | Needs full role creation with level + department |
| 28 | `/role-definitions/:id` | PUT | May exist | Needs hierarchy fields |
| 29 | `/role-definitions/:id` | DELETE | May exist | — |
| 30 | `/departments/:id/roles` | GET | None | List roles filtered by department + level |

### 2.4 User Assignment APIs (Fully or Partially Missing)

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 31 | `/users/:id/roles` | POST | Assign primary + secondary roles to user |
| 32 | `/users/:id/roles/:roleId/projects` | PUT | Update project-module toggles for a role assignment |
| 33 | `/users/:id/hierarchy` | GET | Get user's L2/L3/L4 chain |
| 34 | `/users/:id/hierarchy` | PUT | Set user's L2/L3/L4 |
| 35 | `/users/:id/project-access` | GET | Get project-module toggle matrix |
| 36 | `/users/hierarchy-candidates` | GET | Get eligible L2/L3/L4 candidates filtered by department + project overlap |

### 2.5 Permission Resolution APIs (Fully Missing)

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 37 | `/permissions/check` | GET | Check single permission (module + action + projectId) → bool |
| 38 | `/permissions/batch-check` | POST | Check multiple permissions in one call |
| 39 | `/permissions/my-permissions` | GET | Full resolved permission tree for current user + active role |
| 40 | `/permissions/my-permissions?roleId=X` | GET | Preview permissions for a different role (for role switcher) |

### 2.6 Auth/Login APIs (Need Enhancement)

| # | Endpoint | Method | Existing | Gap |
|---|----------|--------|----------|-----|
| 41 | `POST /auth/login` (or `/sso/callback`) | POST | Returns JWT with role | Must return permission tree + project access + hierarchy |
| 42 | `/auth/switch-role` | POST | None | Switch active role, return new permission tree |

### 2.7 Project/Brand Enrichment APIs

| # | Endpoint | Method | Existing | Gap |
|---|----------|--------|----------|-----|
| 43 | `/projects/enriched` | GET | `/projects` exists | Needs billing_entity, address, GSTIN, etc. |
| 44 | `/brands/:id` | PUT | Likely exists | Needs address, GSTIN, PAN fields |

### 2.8 API Gap Summary

| Status | Count |
|--------|-------|
| Fully missing endpoints | 37 |
| Need enhancement | 7 (login, role-definitions, projects, brands, users) |

---

## 3. Missing Middleware (Backend)

### 3.1 Full Gap

| # | Middleware | Description | Existing | Gap |
|---|-----------|-------------|----------|-----|
| 1 | **PermissionGuard** | Checks if user has a specific permission (module + action) for a request | `RolesGuard` exists but checks **role name only** | **MISSING** — need granular action-level guard |
| 2 | **Permission Cache Middleware** | Caches resolved permissions per user/role in Redis | No permission caching exists | **MISSING** |
| 3 | **Project Scope Middleware** | Extracts and validates project context from request params/query | None | **MISSING** |
| 4 | **Audit Log Middleware** | Logs all permission-related changes (who changed what) | `user_requests` table logs requests but not permission-specific | **PARTIAL** |
| 5 | **@Permissions() decorator** | Route handler decorator for required permissions | `@Roles()` decorator exists (checks role names) | **MISSING** — need `@Permissions('EOI', 'edit')` |
| 6 | **@ProjectScoped() decorator** | Marks endpoint as project-scoped, auto-injects project check | None | **MISSING** |
| 7 | **Admin Bypass Middleware** | Auto-approves Super Admin/Admin for all requests | No bypass exists (must manually add admin to `@Roles()`) | **MISSING** |

### 3.2 Current Middleware Limitations

| Current Middleware | Limitation vs RBAC Requirement |
|--------------------|-------------------------------|
| `RolesGuard` | Only checks role name equality; doesn't check module/action/project scope |
| `RmAdminAuthGuard` | Only validates JWT; no permission check |
| `OppAccessGuard` | Only checks opportunity-level access for RM; not reusable for other modules |
| `DecryptRequestGuard` | Encrypt/decrypt only; no permission awareness |
| No middleware | Can't enforce "User X can edit EOI records only in Project Y" at infrastructure level |

### 3.3 Middleware Gap Summary

| Status | Count |
|--------|-------|
| Fully missing | 5 |
| Partially existing | 1 (audit logging) |

---

## 4. Missing Guards (Frontend)

### 4.1 Full Gap

| # | Guard | Description | Existing | Gap |
|---|-------|-------------|----------|-----|
| 1 | **Route-Level Permission Guard** | Checks if user has permission to view a specific page/module before rendering | `AuthGuard` checks authentication only; `RoleBasedGuard` is **commented out** in all routes | **MISSING** — need `PermissionGuard` at route level |
| 2 | **Module Access Guard** | Shows 403 if user's role lacks module-level access | Only handled by switch statement (role-based route selection) | **MISSING** — need dynamic module permission check |
| 3 | **Project Scope Guard** | Restricts page data based on user's assigned projects | None | **MISSING** |

### 4.2 RoleBasedGuard Status

| File | Line | Current State |
|------|------|---------------|
| admin-routes.tsx | 85-87 | `{/* <RoleBasedGuard ...> */}` — **commented out** |
| super-admin-routes.tsx | 85-87 | `{/* <RoleBasedGuard ...> */}` — **commented out** |
| rm-panel-routes.tsx | 99-101 | `{/* <RoleBasedGuard ...> */}` — **commented out** |
| crm-routes.tsx | 52-54 | `{/* <RoleBasedGuard ...> */}` — **commented out** |
| gre-routes.tsx | 38-40 | `{/* <RoleBasedGuard ...> */}` — **commented out** |
| mis-routes.tsx | 58-60 | `{/* <RoleBasedGuard ...> */}` — **commented out** |
| project-head-routes.tsx | 50-52 | `{/* <RoleBasedGuard ...> */}` — **commented out** |
| finance-admin-routes.tsx | 46-48 | `{/* <RoleBasedGuard ...> */}` — **commented out** |

### 4.3 Guard Gap Summary

| Status | Count |
|--------|-------|
| Fully missing | 3 |
| Exists but disabled (commented out) | 1 (RoleBasedGuard in 8 route files) |

---

## 5. Missing Frontend Components

### 5.1 Admin/Access Management Components (Fully Missing)

| # | Component | Purpose |
|---|-----------|---------|
| 1 | **ZoneManager** | Zone CRUD page (list, create, edit, delete zones) |
| 2 | **CityManager** | City CRUD page with zone mapping |
| 3 | **LevelManager** | Hierarchy level configuration (L1–L4) |
| 4 | **RoleDefinitionManager** | Role CRUD with level + department assignment |
| 5 | **ModuleDefinitionManager** | Module/sub-module CRUD with sort order |
| 6 | **ActionDefinitionManager** | Action CRUD per module |
| 7 | **DeptRoleModuleMapping** | Department → Role → Module → Sub-Module → Action mapping UI with multi-select dropdowns |
| 8 | **RolePermissionPreview** | Preview what a role can access before saving |

### 5.2 User Management Components (Need Enhancement)

| # | Component | Existing | Gap |
|---|-----------|----------|-----|
| 9 | **UserCreateWizard** | Basic user creation form | Needs multi-step: Zone → Department → Role → Project-Module toggle → Hierarchy |
| 10 | **ZoneMultiSelect** | None | New component for zone selection |
| 11 | **DepartmentSelect** | Likely exists | Needs to fetch roles on department change |
| 12 | **RoleSelect** | Basic dropdown | Needs primary/secondary role distinction |
| 13 | **ProjectModuleToggle** | None | Per-project module checkbox matrix |
| 14 | **HierarchySelect** | None | L2/L3/L4 manager selection dropdowns |

### 5.3 Login/Role Components (Fully Missing)

| # | Component | Purpose |
|---|-----------|---------|
| 15 | **RoleSwitcher** | Dropdown/modal to switch between primary and secondary roles |
| 16 | **DynamicSidebar** | Navigation sidebar that renders from API-returned permission tree instead of static config |

### 5.4 Permission-Aware UI Enhancements (Partly Missing)

| # | Component | Existing | Gap |
|---|-----------|----------|-----|
| 17 | **PermissionGate** (wrapping component) | None | `<PermissionGate module="EOI" action="edit">` wrapper to conditionally render children based on API check |
| 18 | **ProjectScopeFilter** | None | Dropdown/project selector scoped to user's assigned projects |
| 19 | **DynamicMenuRenderer** | Static per-role arrays | Build menus from backend permission tree |
| 20 | **ForbiddenPage** | `Page401` exists | Needs to show specific reason (module vs action vs project scope denial) |

### 5.5 Component Gap Summary

| Status | Count |
|--------|-------|
| Fully missing | 15 |
| Need enhancement | 5 |

---

## 6. Missing Route Protection

### 6.1 Current Route Protection

| Layer | Mechanism | Covers |
|-------|-----------|--------|
| Authentication | `AuthGuard` wrapping all role route sections | Only checks logged-in state |
| Role-based routing | `switch(user.role)` in `index.tsx` | Prevents wrong role from seeing another role's pages |
| Permission check | ❌ **Not implemented at route level** | No way to say "User can see EOI pages but can't see IOM pages" without the role switch |

### 6.2 Gap

| # | Missing Feature | Impact |
|---|----------------|--------|
| 1 | `RoleBasedGuard` is defined but **commented out** in all 9 route files | No defense-in-depth; if the switch statement logic is bypassed or misconfigured, users could access unauthorized pages |
| 2 | No API call to verify page-level permission on route enter | Permission config is client-side only; a malicious user could modify the JS to see UI for modules they shouldn't access |
| 3 | No dynamic route loading based on resolved permissions | Routes are statically linked to role names; a new module for an existing role requires code changes in 3+ files |

### 6.3 Routes That Need Protection Enhancement

All 18 route section files need:
- Reactivate and upgrade `RoleBasedGuard` with API-driven permission check
- OR replace with a new `PermissionGuard` that calls backend `/permissions/check`

---

## 7. Missing Menu Authorization

### 7.1 Current State

Navigation is defined as **static arrays** in `src/layouts/config-nav-dashboard.tsx`:

```typescript
export const adminNav = [
  { items: [{ title: 'Users', path: '/admin/user', icon: ICONS.user }, ...] }
];
export const rmNav = [ ... ];
// 18+ static arrays
```

### 7.2 Gap

| # | Missing Feature | Current Approach | Required Approach |
|---|----------------|-----------------|-------------------|
| 1 | **Dynamic menu building** | Static per-role arrays in TypeScript | Build menu items from API `/permissions/my-permissions` response |
| 2 | **Project-scoped menu items** | Single path per menu item | Menu items should filter/show based on user's project assignments |
| 3 | **Role-switch-aware menu** | Nav is tied to one role | When user switches role, nav must re-render with new role's permissions |
| 4 | **Icon resolution from backend** | Icons hardcoded in `ICONS` object | Should be configurable or mapped from module code |

### 7.3 Configuration That Must Be Replaced

| File | What Changes |
|------|-------------|
| `src/layouts/config-nav-dashboard.tsx` | Static arrays → dynamic builder function or replace entirely with API-driven component |
| `src/layouts/dashboard/layout.tsx` | `navData` prop receives static data → must switch to async data from API |

---

## 8. Missing Button Authorization

### 8.1 Current State

Button authorization is driven by the **client-side config** `role-based-permissions.ts`:

```typescript
const { canCreate, canExport } = useRoleBasedPermissions({ module: 'eoi' });
{ canCreate && <CreateButton /> }
```

### 8.2 Gap

| # | Gap | Current | Required |
|---|-----|---------|----------|
| 1 | **No backend enforcement** | Button visibility controlled by FE config only | Backend must also reject unauthorized actions via PermissionGuard |
| 2 | **No real-time permission refresh** | Config is static; permissions only change on page refresh | User's permissions should be invalidatable via Redis cache when admin changes mappings |
| 3 | **No secondary role action merging** | Only primary role's permissions checked | When user has secondary role, permitted actions from both roles should be merged |
| 4 | **No project-context buttons** | No project-level filtering on action buttons | Buttons like "Edit EOI" should be disabled/hidden if user lacks EOI access for the current project |

### 8.3 Components Affected (40+ files using `useRoleBasedPermissions`)

All existing usages must be migrated from config-driven to API-driven:

| Module | Files Affected |
|--------|---------------|
| EOI Records | `expression-of-interest-table-view`, `pre-booking-form-view`, etc. (10+ files) |
| IOM Management | `iom-management-table-view`, `iom-details-view`, `invoice-table-view`, etc. (6+ files) |
| Inventory | `unit-inventory-view`, `map-unit-to-voucher-view`, etc. (4+ files) |
| Batch Manager | `batch-listing-view`, `batch-manager-view`, etc. (5+ files) |
| Channel Partners | `channel-partner-table-view` |
| EOI Dashboard | `eoi-dashboard-list-view`, `bhk-wise-split-list-view` |
| Admin Reports | `incentive-reports-list-view` |
| Agreement | `agreement-management-dashboard` |
| Booking Modifications | `booking-date-modification-view` |

---

## 9. Missing API Authorization

### 9.1 Current State

Backend uses `@Roles()` decorator with role-name matching:

```typescript
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
@Get()
getAllUsers() { ... }
```

### 9.2 Gap

| # | Gap | Current | Required |
|---|-----|---------|----------|
| 1 | **No granular permission check** | Only checks if user's role is in allowed list | Must check `module + action + projectId` |
| 2 | **No module context** | All endpoints are protected by role name | Each endpoint needs a `module` and `action` annotation |
| 3 | **No project scope enforcement** | Opportunities guard exists for RM only | Every project-scoped endpoint must verify user has access to that project's module |
| 4 | **No dynamic permission evaluation** | Role list is compile-time constant | Permissions are evaluated against database mappings at runtime |
| 5 | **Admin bypass is manual** | Admin must be added to every `@Roles()` call | Admin/Super Admin should auto-bypass all permission checks |
| 6 | **No permission caching** | Every request re-evaluates auth | Resolved permissions should be cached per user+role |
| 7 | **Audit trail for permission changes** | No permission change logging | Every mapping CRUD operation must be logged with who/when/what |

### 9.3 Backend Controllers Requiring Permission Retrofit

All ~40+ controllers across all modules need:

| Module | Current Protection | Missing |
|--------|-------------------|---------|
| Users | `@Roles(ADMIN, SUPER_ADMIN)` | Needs `@Permissions('users', 'list')` |
| Bookings | `@Roles(ADMIN, RM, ...)` | Needs `@Permissions('bookings', 'create')` |
| EOI | `@UseGuards(RmAdminAuthGuard)` | Needs `@Permissions('eoi', 'view')` |
| IOM | `@UseGuards(RmAdminAuthGuard)` | Needs `@Permissions('iom', action)` |
| Batch | JWT guard | Needs `@Permissions('batch', action)` |
| Sales | JWT guard | Needs `@Permissions('bookings', action)` |
| Masters | JWT guard | Needs `@Permissions('masters', action)` + project scope |
| Incentives | JWT guard | Needs `@Permissions('incentives', action)` |
| ... | JWT guard | **All 40+ modules** need retrofit |

---

## 10. Missing Page Authorization

### 10.1 Current State

Page-level authorization is achieved by role-based route splitting:

```
Router() → switch(user.role) →
  case ROLES.Admin: load adminRoutes
  case ROLES.RM:   load rmRoutes
  ...
```

This means each page is accessible only to its designated role — but there is **no check** at the page level that the user can actually access that module within their role.

### 10.2 Gap

| # | Gap | Current | Required |
|---|-----|---------|----------|
| 1 | **No module-level page guard** | Role → Routes mapping assumes all modules in that route file are accessible | User may have role "Admin" but module "EOI" might be toggled off for their project assignment |
| 2 | **No forbidden page per module** | `Page401` is generic | Each module should show a meaningful "Access Denied" page with reason |
| 3 | **No redirect on module denial** | If user accesses a URL for a disabled module, the route still renders | Should redirect to dashboard or show forbidden page |
| 4 | **No loading/checking state** | Pages render immediately | Should show spinner while permission check API resolves |

### 10.3 Page Authorization Must Be Added To

All 18 route section files, which collectively contain 150+ lazy-loaded page components.

---

## Gap Analysis Checklist

### DATABASE

- [ ] Table: `zones`
- [ ] Table: `cities` (with FK → zones)
- [ ] Table: `levels` (L1, L2, L3, L4)
- [ ] Table: `role_definitions` (upgrade from `roles` — add `department_id`, `level_id`, `code`)
- [ ] Table: `module_definitions`
- [ ] Table: `sub_module_definitions` (with FK → modules)
- [ ] Table: `action_definitions` (with FK → module, sub_module)
- [ ] Table: `dept_role_module_mappings`
- [ ] Table: `user_role_assignments`
- [ ] Table: `user_hierarchies` (L2/L3/L4 per user)
- [ ] Table: `user_project_module_access`
- [ ] Modify: `users` — add `zone_id`, `employment_status`, `user_group`, `group_start_date`, `group_end_date`
- [ ] Modify: `roles` → migrate to `role_definitions`
- [ ] Modify: `departments` — add `level`, `code`
- [ ] Modify: `projects` — add `billing_entity`, `address`, `gstin`, `pin_code`, `company`, `payment_gateway`, `incentive_criteria`
- [ ] Modify: `brands` — add `address`, `gstin`, `pan`, `billing_entity`
- [ ] Seed: level data (L1–L4)
- [ ] Seed: module definitions (EOI, IOM, Batch, Bookings, etc.)
- [ ] Seed: sub-module definitions (EOI Records, EOI Dashboard, etc.)
- [ ] Seed: action definitions (list, view, create, edit, delete, export, + custom)
- [ ] Seed: default department-role-module mappings for existing roles
- [ ] Seed: migration of existing users to `user_role_assignments`

### BACKEND

- [ ] API: Zone CRUD (GET/POST/PUT/DELETE `/zones`, `/zones/:id/cities`)
- [ ] API: City CRUD (GET/POST/PUT/DELETE `/cities`)
- [ ] API: Level list (`/levels`)
- [ ] API: Role definition CRUD (upgrade `/roles` → `/role-definitions` with level + department)
- [ ] API: Module definition CRUD (`/module-definitions`)
- [ ] API: Sub-module definition CRUD (`/sub-module-definitions`)
- [ ] API: Action definition CRUD (`/action-definitions`)
- [ ] API: Department-Role-Module mapping CRUD (`/dept-role-module-mappings`)
- [ ] API: User role assignment (`/users/:id/roles`)
- [ ] API: User project-module toggles (`/users/:id/roles/:roleId/projects`)
- [ ] API: User hierarchy management (`/users/:id/hierarchy`)
- [ ] API: Hierarchy candidates lookup (`/users/hierarchy-candidates`)
- [ ] API: Permission check (`/permissions/check`, `/permissions/batch-check`)
- [ ] API: My permissions tree (`/permissions/my-permissions`)
- [ ] API: Role switch (`/auth/switch-role`)
- [ ] Modify: Auth login response — include permission tree + project access
- [ ] Modify: Project API — include enriched fields
- [ ] Modify: Brand API — include IOM fields
- [ ] Middleware: `PermissionGuard` — granular module+action+scope check
- [ ] Middleware: Admin/Super Admin bypass logic
- [ ] Middleware: Permission cache (Redis, 15-min TTL)
- [ ] Decorator: `@Permissions(module, action, opts?)`
- [ ] Decorator: `@ProjectScoped()`
- [ ] Enhancement: Audit logging for permission mapping changes
- [ ] Enhancement: Rate limiting on permission check endpoints
- [ ] Enhancement: Field-level permission utils upgrade (read from DB, not hardcoded)

### FRONTEND

- [ ] Component: ZoneManager (CRUD page)
- [ ] Component: CityManager (with zone mapping)
- [ ] Component: RoleDefinitionManager (with level + department)
- [ ] Component: ModuleDefinitionManager (module/sub-module tree)
- [ ] Component: ActionDefinitionManager
- [ ] Component: DeptRoleModuleMapping (mapping UI with cascading dropdowns)
- [ ] Component: UserCreateWizard (multi-step: zone → dept → role → project-module → hierarchy)
- [ ] Component: ProjectModuleToggle (per-project checkbox matrix)
- [ ] Component: HierarchySelect (L2/L3/L4 cascading dropdown)
- [ ] Component: RoleSwitcher (primary/secondary role toggle)
- [ ] Component: DynamicSidebar (API-driven navigation)
- [ ] Component: PermissionGate (wrapper component for conditional rendering)
- [ ] Component: ProjectScopeFilter (project dropdown for scoped views)
- [ ] Page: ForbiddenPage enhancement (show denial reason)
- [ ] Hook: Update `useRoleBasedPermissions` to call backend API
- [ ] Hook: New `usePermissionCheck(module, action, projectId)` for real-time checks
- [ ] Hook: New `useProjectScope()` for current project context
- [ ] Hook: New `useRoleSwitcher()` for role change management
- [ ] Guard: Reactivate `RoleBasedGuard` in all route sections
- [ ] Guard: New `PermissionRouteGuard` — API-driven route-level check
- [ ] Guard: `AuthGuard` enhancement — fetch permission tree on login
- [ ] Route: Replace static nav arrays with dynamic rendering
- [ ] Route: Add loading state for permission resolution before route render
- [ ] Redux: New slices for permissions, role assignments, project access
- [ ] Redux: Modify auth slice to include permission tree
- [ ] Service: New API service module for permission endpoints
- [ ] Service: New API service module for RBAC management endpoints
- [ ] Migration: 40+ component files from config-driven → API-driven permissions

### TESTING

- [ ] Test: Zone CRUD operations
- [ ] Test: City CRUD with zone mapping validation
- [ ] Test: Role definition CRUD with level/department constraints
- [ ] Test: Module definition CRUD with parent-child validation
- [ ] Test: Sub-module CRUD with module FK validation
- [ ] Test: Action definition CRUD
- [ ] Test: Dept-role-module mapping CRUD
- [ ] Test: Mapping uniqueness constraints
- [ ] Test: User role assignment (primary + secondary)
- [ ] Test: User project-module toggles
- [ ] Test: User hierarchy assignment and cascade
- [ ] Test: Permission check API — allow/deny scenarios
- [ ] Test: Batch permission check API
- [ ] Test: My permissions tree response structure
- [ ] Test: Role switch flow and permission tree change
- [ ] Test: Admin/Super Admin bypass (all permissions granted)
- [ ] Test: Default-deny for unmapped roles/modules
- [ ] Test: Permission cache invalidation on mapping change
- [ ] Test: 403 response for unauthorized API calls
- [ ] Test: Frontend `PermissionGate` rendering logic
- [ ] Test: Frontend dynamic nav rendering matches API response
- [ ] Test: Frontend role switcher UI + permission update
- [ ] Test: Frontend project scope filtering
- [ ] Test: E2E — full flow: create mapping → assign role → login → see correct modules
- [ ] Test: E2E — role switcher: switch role → nav updates
- [ ] Test: E2E — admin bypass: admin user sees all modules regardless of mapping
- [ ] Test: Performance — permission cache hit ratio under load
- [ ] Test: Audit log review — all mapping changes logged correctly

### DEPLOYMENT

- [ ] Migration script: Phase 1 — create zone, city, level, role_definition tables
- [ ] Migration script: Phase 2 — create module, sub-module, action definitions
- [ ] Migration script: Phase 3 — create dept_role_module_mappings table
- [ ] Migration script: Phase 4 — create user_role_assignments, user_hierarchies, user_project_module_access
- [ ] Migration script: Phase 5 — alter users, departments, projects, brands tables
- [ ] Seed script: Phase 6 — seed levels, modules, sub-modules, actions
- [ ] Seed script: Phase 7 — migrate existing role data to role_definitions
- [ ] Seed script: Phase 8 — migrate existing users to user_role_assignments
- [ ] Seed script: Phase 9 — create default mappings for existing roles
- [ ] Rollback script: Each phase must have revert migration
- [ ] Environment config: Add permission cache TTL settings per environment
- [ ] Feature flag: `ENABLE_DYNAMIC_RBAC` — toggle between old static and new dynamic system
- [ ] Feature flag: `ENABLE_PERMISSION_CACHE` — toggle Redis caching
- [ ] CI/CD: Lint check for new permission decorators on all controllers
- [ ] CI/CD: Migration dry-run step in CI pipeline
- [ ] Monitoring: Dashboard for permission check latency
- [ ] Monitoring: Alert on high 403 rates (potential unauthorized access attempts)
- [ ] Monitoring: Audit trail export for compliance
- [ ] Documentation: API reference for new RBAC endpoints
- [ ] Documentation: Permission matrix for stakeholder sign-off
- [ ] Rollout: Canary deploy — enable RBAC for one module first (e.g., EOI)
- [ ] Rollout: A/B test — compare old static config vs new dynamic API response

---

## Implementation Roadmap

### Phase 0: Foundation (Weeks 1–2)

```
Database:
  ├── Create zone, city, level tables
  ├── Create module_definition, sub_module_definition, action_definition tables
  ├── Create dept_role_module_mapping table
  ├── Create user_role_assignment, user_hierarchy, user_project_module_access tables
  ├── Alter users, departments, projects, brands tables
  └── Seed base data (levels, modules, sub-modules, actions)

Backend:
  ├── Zone CRUD API
  ├── City CRUD API
  ├── Module/Sub-module/Action definition CRUD APIs
  ├── Dept-Role-Module mapping CRUD APIs
  └── Role definition upgrade API (with level + department)
```

### Phase 1: Permission Resolution (Weeks 3–4)

```
Backend:
  ├── @Permissions() decorator
  ├── @ProjectScoped() decorator
  ├── PermissionGuard middleware
  ├── Admin bypass logic
  ├── Permission cache (Redis)
  ├── /permissions/check API
  ├── /permissions/batch-check API
  ├── /permissions/my-permissions API
  └── User assignment APIs (roles, hierarchy, project toggles)

Database:
  └── Seed: default mappings for all existing roles
```

### Phase 2: Frontend RBAC Components (Weeks 5–7)

```
Frontend:
  ├── Admin: ZoneManager, CityManager, RoleDefinitionManager
  ├── Admin: ModuleDefinitionManager, ActionDefinitionManager
  ├── Admin: DeptRoleModuleMapping UI
  ├── Admin: UserCreateWizard (multi-step)
  ├── Shared: PermissionGate component
  ├── Shared: RoleSwitcher component
  ├── Shared: DynamicSidebar (API-driven nav)
  ├── Shared: ProjectScopeFilter
  ├── Hooks: usePermissionCheck, useProjectScope, useRoleSwitcher
  └── Redux: permission slice, role assignment slice
```

### Phase 3: API Retrofit (Weeks 8–10)

```
Backend:
  ├── Retrofit all ~40 controllers with @Permissions() decorator
  ├── Add project scope check to scoped endpoints
  ├── Update auth login to return permission tree
  ├── /auth/switch-role endpoint
  └── Audit logging for all mapping changes

Frontend:
  ├── Reactivate RoleBasedGuard in all route sections
  ├── Add PermissionRouteGuard
  ├── Migrate 40+ components from config-driven to API-driven permissions
  ├── Update AuthGuard to fetch permission tree on login
  └── Replace static nav arrays with DynamicSidebar
```

### Phase 4: Testing & Hardening (Weeks 11–12)

```
Testing:
  ├── Unit tests for all new backend services
  ├── Integration tests for permission check API
  ├── Integration tests for mapping CRUD
  ├── E2E tests for full RBAC flow
  ├── Performance tests for permission cache
  └── Security tests for default-deny and bypass scenarios

Backend:
  ├── Rate limiting on permission check endpoints
  ├── Error handling hardening
  └── Field-level permission utils upgrade (DB-driven)
```

### Phase 5: Deployment & Rollout (Weeks 13–14)

```
Deployment:
  ├── Feature flag: ENABLE_DYNAMIC_RBAC
  ├── Run all migrations on staging
  ├── Canary deploy — enable RBAC for EOI module first
  ├── Monitor permission check latency
  ├── A/B compare static config vs dynamic API
  ├── Roll out to all modules
  ├── Documentation: API reference, permission matrix
  └── Stakeholder sign-off on permission matrix
```

### Total Timeline: 14 Weeks

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 0 — Foundation | 2 weeks | DB schema + master data APIs |
| 1 — Permission Resolution | 2 weeks | Permission middleware + check APIs + caching |
| 2 — Frontend RBAC | 3 weeks | Admin UIs, permission-aware components, role switcher |
| 3 — API Retrofit | 3 weeks | All controllers permission-annotated, frontend migration |
| 4 — Testing | 2 weeks | Full test coverage + hardening |
| 5 — Deployment | 2 weeks | Phased rollout with feature flags + monitoring |
