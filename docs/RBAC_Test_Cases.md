# RBAC Test Cases

> **Project:** Puravankara RBAC Integration  
> **Date:** 2026-07-01  
> **Scope:** Frontend RBAC module + Backend RBAC APIs + Database permission mapping

---

## Table of Contents

1. [Unit Test Cases](#1-unit-test-cases)
2. [Integration Test Cases](#2-integration-test-cases)
3. [API Test Cases](#3-api-test-cases)
4. [Permission Matrix Validation](#4-permission-matrix-validation)
5. [Role Validation](#5-role-validation)
6. [Negative Test Cases](#6-negative-test-cases)
7. [Boundary Test Cases](#7-boundary-test-cases)
8. [Security Test Cases](#8-security-test-cases)
9. [Regression Test Cases](#9-regression-test-cases)
10. [Postman Collection](#10-postman-collection)
11. [Test Data](#11-test-data)
12. [Expected Results](#12-expected-results)

---

## 1. Unit Test Cases

### 1.1 Frontend — `normalizePermissions()` (permission-context.tsx:17)

| ID | Input | Expected Output | Condition |
|----|-------|-----------------|-----------|
| UT-FE-001 | `null` | `[]` | Null safety |
| UT-FE-002 | `undefined` | `[]` | Undefined safety |
| UT-FE-003 | `[]` (empty array) | `[]` | Empty array |
| UT-FE-004 | `[{ moduleCode: "USERS", actionCode: "VIEW" }]` | `[{ moduleCode: "users", actionCode: "view", subModuleCode: null }]` | Uppercase to lowercase normalization |
| UT-FE-005 | `[{ moduleCode: "EOI-RECORDS", actionCode: "CREATE" }]` | `[{ moduleCode: "eoi-records", actionCode: "create", subModuleCode: null }]` | Kebab-case normalization |
| UT-FE-006 | `[{ module: "USERS", actions: ["VIEW", "CREATE"] }]` | `[{ moduleCode: "users", actionCode: "view" }, { moduleCode: "users", actionCode: "create" }]` | Effective format → flat normalization |
| UT-FE-007 | `[{ module: "eoi-records", actions: [] }]` | `[]` | Empty actions array |
| UT-FE-008 | Mixed case: `{ moduleCode: "Batch", actionCode: "List" }` | `{ moduleCode: "batch", actionCode: "list" }` | Mixed case → lowercase |
| UT-FE-009 | Non-array object `{}` | `[]` | Invalid format |

### 1.2 Frontend — `hasModule()` (permission-context.tsx:82)

| ID | Input | Permissions Loaded | Expected |
|----|-------|--------------------|----------|
| UT-FE-010 | `"eoi-records"` | `[{ moduleCode: "eoi-records", actionCode: "view" }]` | `true` |
| UT-FE-011 | `"batch"` | `[]` | `false` |
| UT-FE-012 | `"EOI-RECORDS"` (uppercase) | `[{ moduleCode: "eoi-records", actionCode: "view" }]` | `true` (case-insensitive) |
| UT-FE-013 | `"users"` | `[{ moduleCode: "USERS", actionCode: "view" }]` | `true` (backend uppercase → normalized) |
| UT-FE-014 | `""` (empty string) | `[{ moduleCode: "", actionCode: "view" }]` | `true` |

### 1.3 Frontend — `hasPermission()` (permission-context.tsx:73)

| ID | Input Module | Input Action | Permissions | Expected |
|----|-------------|-------------|-------------|----------|
| UT-FE-015 | `"eoi-records"` | `"delete"` | `[{ moduleCode: "eoi-records", actionCode: "delete" }]` | `true` |
| UT-FE-016 | `"eoi-records"` | `"delete"` | `[{ moduleCode: "eoi-records", actionCode: "view" }]` | `false` |
| UT-FE-017 | `"EOI-RECORDS"` | `"DELETE"` | `[{ moduleCode: "eoi-records", actionCode: "delete" }]` | `true` |
| UT-FE-018 | `"eoi-records"` | `"delete"` | `[]` | `false` |
| UT-FE-019 | `"users"` | `"export"` | `[{ moduleCode: "USERS", actionCode: "EXPORT" }]` | `true` |

### 1.4 Frontend — `getModuleActions()` (permission-context.tsx:91)

| ID | Input | Permissions | Expected |
|----|-------|-------------|----------|
| UT-FE-020 | `"eoi-records"` | `[{moduleCode:"eoi-records",actionCode:"view"},{moduleCode:"eoi-records",actionCode:"edit"}]` | `["view", "edit"]` |
| UT-FE-021 | `"eoi-records"` | `[]` | `[]` |
| UT-FE-022 | `"users"` | `[{moduleCode:"USERS",actionCode:"VIEW"},{moduleCode:"USERS",actionCode:"CREATE"}]` | `["view", "create"]` |
| UT-FE-023 | `"eoi-records"` | Duplicates: `[{mc:"eoi-records",ac:"view"},{mc:"eoi-records",ac:"view"}]` | `["view"]` (deduped) |

### 1.5 Frontend — `filterNavByPermissions()` (utils.ts:47)

| ID | Nav Items | Permissions | Expected Visible |
|----|-----------|-------------|-----------------|
| UT-FE-024 | `[{title:"Users",permission:{moduleCode:"users"}}]` | `[{moduleCode:"users",actionCode:"view"}]` | 1 item |
| UT-FE-025 | `[{title:"Users",permission:{moduleCode:"users"}}]` | `[]` | 0 items |
| UT-FE-026 | `[{title:"Dashboard"}]` (no permission) | `[]` | 1 item (always visible) |
| UT-FE-027 | Parent with children, child has no permission | any | parent shown if any child present |
| UT-FE-028 | Parent with children, all children filtered out | any | parent removed |

### 1.6 Frontend — `PermissionGuard` rendering

| ID | Scenario | Module/Action | Has Access? | Renders Children? |
|----|----------|---------------|-------------|-------------------|
| UT-FE-029 | Module-level access granted | `moduleCode="eoi-records"` | Yes | Yes |
| UT-FE-030 | Module-level access denied | `moduleCode="batch"` | No | No — shows Access Denied |
| UT-FE-031 | Action-level access granted | `moduleCode="eoi-records", actionCode="delete"` | Yes | Yes |
| UT-FE-032 | Action-level access denied | `moduleCode="eoi-records", actionCode="delete"` | No | No — shows Access Denied |
| UT-FE-033 | Loading state | any | loading=true | `null` (no flash) |

### 1.7 Frontend — `CanAccess` rendering

| ID | ModuleCode | ActionCode | Has Permission? | Renders Children? | Fallback? |
|----|-----------|-----------|----------------|-------------------|-----------|
| UT-FE-034 | `"eoi-records"` | `"delete"` | Yes | Yes | N/A |
| UT-FE-035 | `"eoi-records"` | `"delete"` | No | No | `null` (default) |
| UT-FE-036 | `"eoi-records"` | `"delete"` | No | No | `<span>No access</span>` |

### 1.8 Backend — `checkPermission()` (rbac-permission.service.ts:59)

| ID | User | Module | Action | Role | Expected |
|----|------|--------|--------|------|----------|
| UT-BE-001 | Super Admin | any | any | `"Super Admin"` | `{ data: { allowed: true } }` (bypass) |
| UT-BE-002 | Super User (BI Team) | any | any | `"Super User (BI Team)"` | `{ data: { allowed: true } }` (bypass) |
| UT-BE-003 | Regular user with permission | `"EOI"` | `"view"` | `"RM"` | `{ data: { allowed: true } }` |
| UT-BE-004 | Regular user no module | `"BATCH"` | — | `"RM"` | `{ data: { allowed: false } }` |
| UT-BE-005 | Regular user module yes, action no | `"EOI"` | `"delete"` | `"RM"` | `{ data: { allowed: false } }` |

### 1.9 Backend — `getEffectivePermissions()` (rbac-permission.service.ts:151)

| ID | User Setup | Expected |
|----|-----------|----------|
| UT-BE-006 | User with no role assignments | `{ data: [] }` |
| UT-BE-007 | User with 1 role, 3 modules | grouped: `[{ module, actions }]` |
| UT-BE-008 | User with 2 roles, overlapping modules | deduplicated actions |
| UT-BE-009 | User with role that has no mappings | `{ data: [] }` |

### 1.10 Backend — `assignRole()` (rbac-assignment.service.ts:47)

| ID | Scenario | Expected |
|----|----------|----------|
| UT-BE-010 | Assign role to valid user | `{ statusCode: 200, data: assignment }` |
| UT-BE-011 | Assign role to nonexistent user | `NotFoundException` |
| UT-BE-012 | Assign nonexistent role | `NotFoundException` |
| UT-BE-013 | Assign duplicate active role | `BadRequestException` |
| UT-BE-014 | Assign with `isPrimary=true` demotes existing primary | old primary set to `isPrimary=false` |

### 1.11 Backend — `revokeRole()` (rbac-assignment.service.ts:96)

| ID | Scenario | Expected |
|----|----------|----------|
| UT-BE-015 | Revoke existing active assignment | status → `inactive`, `revokedAt` set |
| UT-BE-016 | Revoke nonexistent assignment | `NotFoundException` |
| UT-BE-017 | Revoke already-inactive assignment | `NotFoundException` |

---

## 2. Integration Test Cases

### 2.1 Login → Permission Fetch Flow

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| IT-001 | Full auth + permissions flow | 1. Login via OTP (`POST /sso/send-otp` + `POST /sso/verify-otp`)<br>2. JWT stored in localStorage + cookie<br>3. App loads AuthProvider → PermissionProvider<br>4. `GET /rbac/permissions/my` called | Permissions loaded, nav filtered, routes protected |
| IT-002 | Login → cached permissions | Same as IT-001, then reload page | `GET /rbac/permissions/my` called again, cache populated on server |
| IT-003 | Logout → permission clear | Logout via `/sso/logout` | `permissions` state reset to `[]`, `loading=false`, all guards deny |
| IT-004 | Token refresh → permission continuity | Wait for token expiry → `POST /sso/refresh-token` | User still authenticated, permissions still valid |

### 2.2 Nav + Permission Pipeline

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| IT-005 | Nav items filtered by permissions | Login as Super Admin → navigate | All nav items visible |
| IT-006 | Nav items hidden without permission | Create user with `users` module only → login | Only "Users" nav visible, "EOI", "Batch" etc. hidden |
| IT-007 | Nav children filtered | User has `eoi-dashboard` but not `eoi-records` | Parent "EOI" shown, only "EOI Dashboard" child visible |
| IT-008 | Unpermissioned nav items always visible | User has no module permissions | Items without `permission` metadata still show |

### 2.3 Route Guard + Permission Pipeline

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| IT-009 | Direct URL access with permission | Navigate to `/admin/eoi-records` with `eoi-records` permission | Page renders |
| IT-010 | Direct URL access without permission | Navigate to `/admin/eoi-records` without `eoi-records` permission | Access Denied page |
| IT-011 | Route guard changes on role switch | User has primary+secondary role → switch | Nav + routes update to match new role's permissions |

### 2.4 403 Error Handling

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| IT-012 | API returns 403 → toast shown | Call API user lacks permission for | `toast.error()` shows with backend error message |
| IT-013 | 403 with standard error format | Backend returns `{ success: false, errors: { message: "..." } }` | Toast shows the message |
| IT-014 | 403 with array error format | Backend returns `{ success: false, errors: [{ message: "..." }] }` | Toast shows first message |

### 2.5 Database Permission Loading

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| IT-015 | Permission resolves from role→module mapping | Query `GET /rbac/permissions/my` for user with Super Admin role | All modules returned |
| IT-016 | Permission resolves from dept→role→module→action chain | Query for user with mapped permissions | Only mapped modules returned |
| IT-017 | User with multiple roles → merged permissions | User has RM + Sales TL roles | Union of both roles' modules returned |

---

## 3. API Test Cases

### 3.1 `GET /rbac/permissions/my`

| ID | Method | Auth | Query | Expected Status | Expected Response Shape |
|----|--------|------|-------|-----------------|------------------------|
| API-001 | GET | Valid JWT | — | 200 | `{ statusCode: 200, message: "...", data: [{ module: string, actions: string[] }] }` |
| API-002 | GET | No JWT | — | 401 | `{ statusCode: 401, message: "Unauthorized" }` |
| API-003 | GET | Expired JWT | — | 401 | `{ statusCode: 401, message: "Unauthorized" }` |
| API-004 | GET | Valid JWT, user has no role | — | 200 | `{ data: [] }` |
| API-005 | GET | Valid JWT, user has role but no mappings | — | 200 | `{ data: [] }` |

### 3.2 `POST /rbac/permissions/check`

| ID | Body | Expected |
|----|------|----------|
| API-006 | `{ module: "EOI", action: "view" }` | `{ data: { allowed: true/false } }` |
| API-007 | `{ module: "EOI" }` (no action) | `{ data: { allowed: true } }` (module-level) |
| API-008 | `{ }` (empty body) | Validation error 400 |
| API-009 | `{ module: "" }` | Validation error 400 |

### 3.3 `GET /rbac/permissions/modules`

| ID | Expected |
|----|----------|
| API-010 | 200, returns array of modules with subModules and actions |

### 3.4 `GET /rbac/permissions/modules/:code/actions`

| ID | Code Param | Expected |
|----|-----------|----------|
| API-011 | `EOI` | 200, module details + actions + subModules |
| API-012 | `NONEXISTENT` | 404 |

### 3.5 `GET /rbac/permissions/roles/:roleId`

| ID | roleId | Expected |
|----|--------|----------|
| API-013 | 1 (valid) | 200, role + permissions array |
| API-014 | 9999 | 200, empty permissions array |

### 3.6 `GET /rbac/roles`

| ID | Query | Expected |
|----|-------|----------|
| API-015 | `?page=1&limit=10` | Paginated roles with department + level |
| API-016 | `?search=admin` | Filtered roles |
| API-017 | `?status=active` | Active only |
| API-018 | `?sortBy=rd.name:asc` | Sorted |

### 3.7 `POST /rbac/roles`

| ID | Body | Role Required | Expected |
|----|------|--------------|----------|
| API-019 | `{ name: "Test Role", code: "TEST_ROLE" }` | Super Admin | 200 |
| API-020 | `{ name: "", code: "TEST" }` | Super Admin | 400 validation |
| API-021 | `{ name: "Test", code: "" }` | Super Admin | 400 validation |
| API-022 | `{ name: "Test", code: "TEST" }` | Admin | 403 |
| API-023 | `{ name: "Test", code: "TEST" }` | RM | 403 |

### 3.8 `PATCH /rbac/roles/:id`

| ID | Body | Expected |
|----|------|----------|
| API-024 | `{ name: "Updated Role" }` | 200 |
| API-025 | `{ status: "inactive" }` | 200 |
| API-026 | `{ id: 9999 }` | 404 |

### 3.9 `DELETE /rbac/roles/:id`

| ID | Expected |
|----|----------|
| API-027 | 200 (soft delete) |
| API-028 | 404 for nonexistent |

### 3.10 `POST /rbac/assignments/assign`

| ID | Body | Expected |
|----|------|----------|
| API-029 | `{ userId: 1, roleDefinitionId: 1, isPrimary: true }` | 200 |
| API-030 | `{ userId: 1, roleDefinitionId: 1 }` (duplicate) | 400 |
| API-031 | `{ userId: 9999, roleDefinitionId: 1 }` | 404 |
| API-032 | `{ userId: 1, roleDefinitionId: 9999 }` | 404 |

### 3.11 `POST /rbac/assignments/revoke`

| ID | Body | Expected |
|----|------|----------|
| API-033 | `{ userId: 1, roleDefinitionId: 1 }` | 200 |
| API-034 | `{ userId: 1, roleDefinitionId: 9999 }` | 404 |

### 3.12 `GET /rbac/assignments/users/:userId/roles`

| ID | userId | Expected |
|----|--------|----------|
| API-035 | 1 | 200, array of role assignments |
| API-036 | 9999 | 404 |

### 3.13 `PATCH /rbac/assignments/mappings`

| ID | Body | Expected |
|----|------|----------|
| API-037 | `{ roleDefinitionId: 1, moduleId: 1, actionIds: [1,2,3] }` | 200 |
| API-038 | `{ roleDefinitionId: 1, moduleId: 1, actionIds: [] }` | 200 (clears all) |

### 3.14 `POST /rbac/assignments/project-access`

| ID | Body | Expected |
|----|------|----------|
| API-039 | `{ userId: 1, projectId: 1, moduleId: 1, isEnabled: true }` | 200 |
| API-040 | `{ userId: 1, projectId: 1, moduleId: 1, isEnabled: false }` | 200 (updates) |

---

## 4. Permission Matrix Validation

### 4.1 Super Admin / Admin Bypass

| ID | Role | Module | Action | Expected Access | Reason |
|----|------|--------|--------|-----------------|--------|
| PM-001 | Super Admin | Any | Any | **Allow** | Bypass role |
| PM-002 | Admin | Any | Any | **Allow** | Check `bypassRoles` — Admin NOT in list, only "Super Admin" and "Super User (BI Team)" are |
| PM-003 | Admin | — | — | **Check** | Admin is NOT a bypass role; they need explicit mappings |

> **Note:** The backend `checkPermission()` bypasses only for `['Super Admin', 'Super User (BI Team)']`. Admin must have explicit module-action mappings.

### 4.2 L1 Level Role Access

| ID | Role | Module | Expected Actions |
|----|------|--------|-----------------|
| PM-004 | RM (L1) | EOI | viewCustomer, previewForm, approveCancellation, exportBookingForm, editEOI, assignClosingRM, mapAndConvertEOI, etc. |
| PM-005 | RM (L1) | BATCH | mapEois, notifyCx |
| PM-006 | RM (L1) | INCENTIVES | list, view, export |
| PM-007 | CRM (L1) | EOI | crmCancellationAction |
| PM-008 | CRM (L1) | BATCH | listing |
| PM-009 | Finance User (L1) | IOM | view, draft, submitInvoice |
| PM-010 | GRE (L1) | BATCH | listing |
| PM-011 | MIS (L1) | EOI | view (read-only) |

### 4.3 L2 Manager Level Access

| ID | Role | Module | Additional Actions vs L1 |
|----|------|--------|--------------------------|
| PM-012 | Sales TL / Sales RSH (L2) | EOI | Same as RM + assignClosingRM |
| PM-013 | Sales TL / Sales RSH (L2) | Bookings | create, list, edit, view |

### 4.4 Module Coverage Verification

| ID | Module | Frontend Codes | DB Codes | Match? |
|----|--------|----------------|----------|--------|
| PM-014 | Users | `users` | `USERS` | ✅ (normalized) |
| PM-015 | EOI | `eoi`, `eoi-dashboard`, `eoi-leaderboard`, `eoi-records`, `eoi-manager` | `EOI`, `eoi-dashboard`, `eoi-leaderboard`, `eoi-records`, `eoi-manager` | ✅ |
| PM-016 | Batch | `batch`, `batch-listing`, `batch-tracker` | `BATCH`, `batch-listing`, `batch-tracker` | ✅ |
| PM-017 | Inventory | `inventory` | `inventory`, `UNIT_INVENTORY` | ✅ |
| PM-018 | Reports | `reports-users`, `reports-bookings`, `reports-incentives` | `reports-users`, `reports-bookings`, `reports-incentives` | ✅ |

### 4.5 Default-Deny Verification

| ID | Scenario | Expected |
|----|----------|----------|
| PM-019 | User has no role assignments | All modules denied |
| PM-020 | User has role but that role has no mapping for module X | Module X denied |
| PM-021 | User has module X but not action Y | Action Y denied |
| PM-022 | User has module X and action Y | Action Y granted |
| PM-023 | Module exists in DB but no role mapped to it | No user can access it |

---

## 5. Role Validation

### 5.1 Role CRUD

| ID | Test | Expected |
|----|------|----------|
| RV-001 | Create role with valid name + code | 200, role created |
| RV-002 | Create role with duplicate name | Error (unique constraint) |
| RV-003 | Create role with duplicate code | Error (unique constraint) |
| RV-004 | Create role with special characters in code | Should accept underscore only |
| RV-005 | Update role name | 200, name updated |
| RV-006 | Update role status to inactive | Users with this role lose access immediately |
| RV-007 | Soft delete role | Role marked deleted, existing assignments remain |
| RV-008 | Fetch all roles paginated | Page/limit respected, total count returned |

### 5.2 Role Assignment

| ID | Test | Expected |
|----|------|----------|
| RV-009 | Assign single role to user | User has that role's permissions |
| RV-010 | Assign primary + secondary role | Both roles' permissions merged |
| RV-011 | Demote primary by assigning new primary | Old primary → `isPrimary=false` |
| RV-012 | Revoke role → permissions removed | User loses all module access for that role |
| RV-013 | Assign same role again (active) | 400 — "already has this role" |
| RV-014 | User with no roles → empty permissions | API returns `[]` |

### 5.3 Role Hierarchy

| ID | Test | Expected |
|----|------|----------|
| RV-015 | L1 user reports to L2 manager | Manager field populated |
| RV-016 | L2 manager reports to L3 team admin | Team admin field populated |
| RV-017 | L3 reports to L4 dept admin | Dept admin field populated |
| RV-018 | Empty hierarchy (no manager) | All manager fields null |
| RV-019 | Circular hierarchy prevented | Validation error or self-reference blocked |

---

## 6. Negative Test Cases

### 6.1 Authentication Failures

| ID | Test | Expected |
|----|------|----------|
| NT-001 | Call `/rbac/permissions/my` without JWT | 401 |
| NT-002 | Call with malformed JWT | 401 |
| NT-003 | Call with JWT signed with wrong secret | 401 |
| NT-004 | Call with expired JWT | 401 |
| NT-005 | Call with JWT missing `dbId` claim | 401 or 500 |

### 6.2 Authorization Failures

| ID | Test | Expected |
|----|------|----------|
| NT-006 | Non-Super Admin calls `POST /rbac/roles` | 403 (RolesGuard) |
| NT-007 | Non-Super Admin calls `POST /rbac/assignments/assign` | 403 |
| NT-008 | Non-Super Admin calls `PATCH /rbac/assignments/mappings` | 403 |
| NT-009 | Non-Super Admin calls `POST /rbac/assignments/project-access` | 403 |
| NT-010 | Non-Super Admin calls `POST /rbac/assignments/revoke` | 403 |
| NT-011 | RM calls Admin-only endpoint | 403 |

### 6.3 Validation Failures

| ID | Test | Expected |
|----|------|----------|
| NT-012 | `POST /rbac/permissions/check` with empty body | 400 |
| NT-013 | `POST /rbac/roles` with empty name | 400 |
| NT-014 | `POST /rbac/roles` with too-long description | 400 |
| NT-015 | `POST /rbac/assignments/assign` with string userId | 400 |
| NT-016 | `PATCH /rbac/assignments/mappings` with string actionIds | 400 |
| NT-017 | `PATCH /rbac/assignments/mappings` with missing actionIds | 400 |

### 6.4 Data Integrity Failures

| ID | Test | Expected |
|----|------|----------|
| NT-018 | Delete module that has active mappings | Foreign key constraint (RESTRICT) |
| NT-019 | Delete role that has active assignments | Foreign key constraint (RESTRICT) |
| NT-020 | Delete user that has active role assignments | Cascade — assignments deleted |
| NT-021 | Assign role to deleted user | 404 |

### 6.5 Frontend Error States

| ID | Test | Expected |
|----|------|----------|
| NT-022 | `GET /rbac/permissions/my` returns 404 | PermissionProvider silently handles, `permissions=[]` |
| NT-023 | `GET /rbac/permissions/my` returns non-JSON | Catch block, `error` state set |
| NT-024 | `GET /rbac/permissions/my` times out | Catch block, `permissions=[]` |
| NT-025 | Network offline during permission load | Catch block, `permissions=[]`, guards deny |
| NT-026 | `PermissionProvider` used outside `AuthProvider` | Error thrown — "must be used within PermissionProvider" |

---

## 7. Boundary Test Cases

### 7.1 Pagination & Limits

| ID | Test | Expected |
|----|------|----------|
| BT-001 | `page=1, limit=1` | 1 role returned, `totalPages` > 1 |
| BT-002 | `page=1, limit=0` | Default limit applied or error |
| BT-003 | `page=1, limit=1000` | All roles returned (no cap) |
| BT-004 | `page=9999, limit=10` | Empty `roles` array, current page = 9999 |
| BT-005 | `page=-1, limit=10` | Default page (1) or validation error |
| BT-006 | `page=0, limit=10` | Default page (1) or validation error |

### 7.2 Permission Count Boundaries

| ID | Test | Expected |
|----|------|----------|
| BT-007 | Single role mapped to 0 modules | Empty permissions array |
| BT-008 | Single role mapped to 1 module | 1 entry in effective permissions |
| BT-009 | Single role mapped to all 39 modules | 39 entries |
| BT-010 | Single role mapped to 1 module with 52 actions | 52 entries in actions array |
| BT-011 | User with 2 roles, each 39 modules | 39 entries (deduplicated) |

### 7.3 String Length Boundaries

| ID | Test | Expected |
|----|------|----------|
| BT-012 | Role name of 1 character | Created (if valid) |
| BT-013 | Role name of 100 characters | Created (if within DB column limit) |
| BT-014 | Module code of 1 character | Created |
| BT-015 | Module code of 50 characters | Created (column is varchar(50)) |
| BT-016 | Description of 500 characters | Created (@Length(0, 500)) |
| BT-017 | Description of 501 characters | 400 validation error |

### 7.4 Concurrent Operations

| ID | Test | Expected |
|----|------|----------|
| BT-018 | 2 concurrent requests assign same role to same user | First succeeds, second gets 400 |
| BT-019 | Revoke role while permissions being fetched | Cache cleared, next fetch returns no permissions |
| BT-020 | Update mappings while user's cache is hot | User retains old permissions until cache TTL |

---

## 8. Security Test Cases

### 8.1 Authentication & Token Security

| ID | Test | Expected |
|----|------|----------|
| SC-001 | JWT token exposed in URL params | Token NOT in URL; only in `Authorization: Bearer` header |
| SC-002 | JWT token in localStorage XSS vulnerability | Token stored in localStorage (current impl); SSO cookie uses httpOnly |
| SC-003 | Token replay attack | JWT expiry enforced (6h), refresh token 1d |
| SC-004 | JWT secret brute force | Secret is 256-bit AES encrypted; strong |
| SC-005 | Permission API accessible with tampered `dbId` in JWT | JWT is signed; tampering invalidates signature → 401 |

### 8.2 Authorization Bypass

| ID | Test | Expected |
|----|------|----------|
| SC-006 | Direct API call bypassing frontend guard | Backend `PermissionGuard` checks JWT — denied |
| SC-007 | IDOR — user A views user B's permissions | `GET /rbac/assignments/users/:userId/permissions` reads `dbId` from JWT — only own data |
| SC-008 | IDOR — assign role to another user | `POST /rbac/assignments/assign` requires Super Admin role |
| SC-009 | SQL injection in `search` param | TypeORM parameterized query — safe |
| SC-010 | SQL injection in `sortBy` param | Whitelist of allowed fields — safe |

### 8.3 Data Exposure

| ID | Test | Expected |
|----|------|----------|
| SC-011 | Permissions endpoint exposes other users' data | Only current user's permissions returned |
| SC-012 | Role definitions expose sensitive info | Only name, code, description returned |
| SC-013 | Error messages leak implementation details | Generic error messages; no stack traces |

### 8.4 Rate Limiting

| ID | Test | Expected |
|----|------|----------|
| SC-014 | Rapid-fire permission check requests | ThrottlerGuard limits requests (configured in app.module) |
| SC-015 | OTP endpoint brute force | OtpThrottleGuard rate-limits |

### 8.5 Audit Trail

| ID | Test | Expected |
|----|------|----------|
| SC-016 | Role created → audit log entry | `permission_audit_log` has CREATE record |
| SC-017 | Role assignment → audit log entry | Audit log has ASSIGN record |
| SC-018 | Permission mapping changed → audit log entry | Audit log has UPDATE record |
| SC-019 | Role revoked → audit log entry | Audit log has REVOKE record |
| SC-020 | Audit log contains IP + user agent | Fields populated |

---

## 9. Regression Test Cases

### 9.1 Existing Auth Flow Unchanged

| ID | Test | Expected |
|----|------|----------|
| RT-001 | OTP login works | `POST /sso/send-otp` → `POST /sso/verify-otp` → JWT returned |
| RT-002 | Refresh token works | `POST /sso/refresh-token` → new JWT |
| RT-003 | SSO login works | `GET /sso/login` redirects to Azure AD |
| RT-004 | Logout clears tokens | localStorage + cookies cleared |

### 9.2 Existing Routes Unchanged

| ID | Route | Expected |
|----|-------|----------|
| RT-005 | `/admin/user` | Renders user list (users module) |
| RT-006 | `/admin/project` | Renders project list (projects module) |
| RT-007 | `/admin/eoi-records` | Renders EOI records (eoi-records module) |
| RT-008 | `/admin/batch/listing` | Renders batch listing (batch module) |
| RT-009 | `/super-admin/user` | Renders user list for super admin |
| RT-010 | `/rm-panel/bookings` | Renders RM bookings (no RBAC for RM routes yet) |

### 9.3 PermissionGuard Doesn't Break Unprotected Routes

| ID | Route | Has Permission? | Expected |
|----|-------|----------------|----------|
| RT-011 | Routes without PermissionGuard wrapper | N/A | Render normally |
| RT-012 | Routes with PermissionGuard + matching permission | Yes | Render normally |
| RT-013 | Routes with PermissionGuard + no permissions | No | Access Denied (doesn't crash) |

### 9.4 Existing API Contracts

| ID | Endpoint | Expected Response Shape |
|----|----------|------------------------|
| RT-014 | `GET /users/details` | `{ success, response: { data: { id, name, email, role, ... } }, errors }` |
| RT-015 | `POST /sso/verify-otp` | `{ success, response: { data: { accessToken, refreshToken, ... } }, errors }` |
| RT-016 | `GET /rbac/permissions/my` | `{ statusCode: 200, message: "...", data: [{ module, actions }] }` |

### 9.5 Nav Rendering Regression

| ID | Nav | Users Without RBAC | Expected |
|----|-----|-------------------|----------|
| RT-017 | CRM nav (crmNav) | N/A (no permission filtering) | All items visible |
| RT-018 | RM nav (rmNav) | N/A (no permission filtering) | All items visible |
| RT-019 | GRE nav (greNav) | N/A (no permission filtering) | All items visible |
| RT-020 | Admin/Super Admin nav | N/A (has permission filtering) | Filtered by permissions |

### 9.6 Frontend Bundle Size

| ID | Check | Expected |
|----|-------|----------|
| RT-021 | RBAC module import does not break tree-shaking | Only imported code bundled |
| RT-022 | PermissionGuard lazy-loaded | Routes using it are code-split |

---

## 10. Postman Collection

```json
{
  "info": {
    "name": "Puravankara RBAC API",
    "description": "Complete RBAC API collection for Puravankara backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth — Send OTP",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"admin@puravankara.com\"\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/sso/send-otp",
          "host": ["{{base_url}}"],
          "path": ["sso", "send-otp"]
        }
      }
    },
    {
      "name": "Auth — Verify OTP",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"admin@puravankara.com\",\n  \"otp\": \"123456\"\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/sso/verify-otp",
          "host": ["{{base_url}}"],
          "path": ["sso", "verify-otp"]
        }
      }
    },
    {
      "name": "Auth — Refresh Token",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"refreshToken\": \"{{refresh_token}}\"\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/sso/refresh-token",
          "host": ["{{base_url}}"],
          "path": ["sso", "refresh-token"]
        }
      }
    },
    {
      "name": "Permissions — Get My Permissions",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/permissions/my",
          "host": ["{{base_url}}"],
          "path": ["rbac", "permissions", "my"]
        }
      }
    },
    {
      "name": "Permissions — Check Permission",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"module\": \"EOI\",\n  \"action\": \"view\"\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/rbac/permissions/check",
          "host": ["{{base_url}}"],
          "path": ["rbac", "permissions", "check"]
        }
      }
    },
    {
      "name": "Permissions — Get Modules",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/permissions/modules",
          "host": ["{{base_url}}"],
          "path": ["rbac", "permissions", "modules"]
        }
      }
    },
    {
      "name": "Permissions — Get Module Actions",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/permissions/modules/EOI/actions",
          "host": ["{{base_url}}"],
          "path": ["rbac", "permissions", "modules", "EOI", "actions"]
        }
      }
    },
    {
      "name": "Permissions — Get Role Permissions",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/permissions/roles/1",
          "host": ["{{base_url}}"],
          "path": ["rbac", "permissions", "roles", "1"]
        }
      }
    },
    {
      "name": "Roles — List All",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/roles?page=1&limit=10",
          "host": ["{{base_url}}"],
          "path": ["rbac", "roles"],
          "query": [
            { "key": "page", "value": "1" },
            { "key": "limit", "value": "10" }
          ]
        }
      }
    },
    {
      "name": "Roles — List with Search",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/roles?search=admin&page=1&limit=10",
          "host": ["{{base_url}}"],
          "path": ["rbac", "roles"],
          "query": [
            { "key": "search", "value": "admin" },
            { "key": "page", "value": "1" },
            { "key": "limit", "value": "10" }
          ]
        }
      }
    },
    {
      "name": "Roles — Get By ID",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/roles/1",
          "host": ["{{base_url}}"],
          "path": ["rbac", "roles", "1"]
        }
      }
    },
    {
      "name": "Roles — Dropdown",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/roles/dropdown",
          "host": ["{{base_url}}"],
          "path": ["rbac", "roles", "dropdown"]
        }
      }
    },
    {
      "name": "Roles — Create",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Test Role\",\n  \"code\": \"TEST_ROLE\",\n  \"description\": \"Test role created via API\"\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/rbac/roles",
          "host": ["{{base_url}}"],
          "path": ["rbac", "roles"]
        }
      }
    },
    {
      "name": "Roles — Update",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Updated Role Name\",\n  \"status\": \"active\"\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/rbac/roles/1",
          "host": ["{{base_url}}"],
          "path": ["rbac", "roles", "1"]
        }
      }
    },
    {
      "name": "Roles — Delete",
      "request": {
        "method": "DELETE",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/roles/1",
          "host": ["{{base_url}}"],
          "path": ["rbac", "roles", "1"]
        }
      }
    },
    {
      "name": "Assignments — Assign Role",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"userId\": 1,\n  \"roleDefinitionId\": 1,\n  \"isPrimary\": true\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/rbac/assignments/assign",
          "host": ["{{base_url}}"],
          "path": ["rbac", "assignments", "assign"]
        }
      }
    },
    {
      "name": "Assignments — Revoke Role",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"userId\": 1,\n  \"roleDefinitionId\": 1\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/rbac/assignments/revoke",
          "host": ["{{base_url}}"],
          "path": ["rbac", "assignments", "revoke"]
        }
      }
    },
    {
      "name": "Assignments — Get User Roles",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/assignments/users/1/roles",
          "host": ["{{base_url}}"],
          "path": ["rbac", "assignments", "users", "1", "roles"]
        }
      }
    },
    {
      "name": "Assignments — Update Mappings",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"roleDefinitionId\": 1,\n  \"moduleId\": 1,\n  \"subModuleId\": null,\n  \"actionIds\": [1, 2, 3, 4, 5, 6]\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/rbac/assignments/mappings",
          "host": ["{{base_url}}"],
          "path": ["rbac", "assignments", "mappings"]
        }
      }
    },
    {
      "name": "Assignments — Set Project Access",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"userId\": 1,\n  \"projectId\": 1,\n  \"moduleId\": 1,\n  \"isEnabled\": true\n}",
          "options": { "raw": { "language": "json" } }
        },
        "url": {
          "raw": "{{base_url}}/rbac/assignments/project-access",
          "host": ["{{base_url}}"],
          "path": ["rbac", "assignments", "project-access"]
        }
      }
    },
    {
      "name": "Assignments — Get User Hierarchy",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{jwt_token}}" }
        ],
        "url": {
          "raw": "{{base_url}}/rbac/assignments/users/1/hierarchy",
          "host": ["{{base_url}}"],
          "path": ["rbac", "assignments", "users", "1", "hierarchy"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3001/api/dev",
      "type": "string"
    },
    {
      "key": "jwt_token",
      "value": "",
      "type": "string"
    },
    {
      "key": "refresh_token",
      "value": "",
      "type": "string"
    }
  ]
}
```

### Postman Usage Instructions

1. Import the JSON collection into Postman
2. Set environment variables:
   - `base_url`: `http://localhost:3001/api/dev` (or staging/production URL)
   - `jwt_token`: obtained from Auth → Verify OTP response
   - `refresh_token`: obtained from Auth → Verify OTP response
3. Run requests in order:
   - First: **Auth — Send OTP** → **Auth — Verify OTP** (copy tokens)
   - Then: **Permissions — Get My Permissions** (verify RBAC data)
   - Then: **Roles — List All** (verify role CRUD)
   - Then: **Assignments — Get User Roles** (verify assignments)

---

## 11. Test Data

### 11.1 Module Definitions (Minimal Required Set)

```sql
-- Core modules required for frontend integration
INSERT INTO module_definitions (code, name, sort_order, status) VALUES
('users', 'Users', 1, 'active'),
('masters', 'Masters', 2, 'active'),
('brands', 'Brands', 3, 'active'),
('projects', 'Projects', 4, 'active'),
('phases', 'Project Phases', 5, 'active'),
('incentives', 'Incentives', 6, 'active'),
('incentives-records', 'Incentive Records', 7, 'active'),
('reports-users', 'Reports — Users', 8, 'active'),
('reports-bookings', 'Reports — Bookings', 9, 'active'),
('reports-incentives', 'Reports — Incentives', 10, 'active'),
('leaderboard', 'Leaderboard', 11, 'active'),
('incentive-policy', 'Incentive Policy', 12, 'active'),
('booster-policy', 'Booster Policy', 13, 'active'),
('booking-date-modification', 'Booking Date Modification', 14, 'active'),
('eoi', 'EOI', 15, 'active'),
('eoi-dashboard', 'EOI Dashboard', 16, 'active'),
('eoi-leaderboard', 'EOI Leaderboard', 17, 'active'),
('eoi-records', 'EOI Records', 18, 'active'),
('eoi-manager', 'EOI Manager', 19, 'active'),
('cp-list', 'Channel Partner List', 20, 'active'),
('inventory', 'Unit Inventory', 21, 'active'),
('bank-details', 'Bank Details', 22, 'active'),
('sfdc-logs', 'SFDC Logs', 23, 'active'),
('batch', 'Batch', 24, 'active'),
('batch-listing', 'Batch Listing', 25, 'active'),
('batch-tracker', 'Batch Tracker', 26, 'active');
```

### 11.2 Role Definitions (Minimal Set)

```sql
INSERT INTO role_definitions (name, code, department_id, level_id, description, status) VALUES
('Super Admin', 'SUPER_ADMIN', 1, 4, 'Full system access — bypasses all permission checks', 'active'),
('Admin', 'ADMIN', 1, 3, 'System administrator with full access', 'active'),
('RM (Relationship Manager)', 'RM', 2, 1, 'Front-line sales — bookings, EOI, incentives', 'active'),
('CRM User', 'CRM', 3, 1, 'Customer relationship management', 'active'),
('Sales TL', 'SALES_TL', 2, 2, 'Sales Team Lead — manages RMs', 'active'),
('MIS User', 'MIS', 5, 1, 'Management Information System', 'active'),
('GRE User', 'GRE', 6, 1, 'Guest Relation Executive', 'active');
```

### 11.3 Action Definitions

```sql
INSERT INTO action_definitions (name, code, is_custom) VALUES
('Create', 'create', false),
('List', 'list', false),
('View', 'view', false),
('Edit', 'edit', false),
('Delete', 'delete', false),
('Export', 'export', false),
('Refresh', 'refresh', false);
```

### 11.4 User Assignments for Testing

```sql
-- Test User 1: Super Admin
INSERT INTO user_role_assignments (user_id, role_definition_id, is_primary, status) VALUES
(1, 1, true, 'active');

-- Test User 2: RM with limited permissions
INSERT INTO user_role_assignments (user_id, role_definition_id, is_primary, status) VALUES
(2, 3, true, 'active');

-- Test User 3: User with no role
-- (no assignment rows)
```

### 11.5 Test Users

| ID | Name | Email | Role Assignment | Expected Modules |
|----|------|-------|----------------|-----------------|
| U1 | System Admin | admin@puravankara.com | Super Admin | All 26+ modules |
| U2 | Test RM | rm@test.com | RM | EOI-related, Bookings, Incentives |
| U3 | Test CRM | crm@test.com | CRM User | EOI-related, Batch, IOM |
| U4 | No Role User | norole@test.com | None | No modules (empty permissions) |

### 11.6 Dept-Role-Module Mappings (Test)

```sql
-- Super Admin: all modules (via mass insert)
INSERT INTO dept_role_module_mappings (department_id, role_definition_id, module_id, action_id, level_id, status)
SELECT 1, 1, m.id, a.id, 4, 'active'
FROM module_definitions m
CROSS JOIN action_definitions a
WHERE m.id BETWEEN 1 AND 26;

-- RM: limited EOI + Bookings access
INSERT INTO dept_role_module_mappings (department_id, role_definition_id, module_id, action_id, level_id, status)
SELECT 2, 3, m.id, a.id, 1, 'active'
FROM module_definitions m
CROSS JOIN action_definitions a
WHERE m.code IN ('eoi-records', 'eoi-dashboard', 'eoi-leaderboard', 'cp-list', 'inventory', 'bank-details', 'bookings')
AND a.code IN ('view', 'list');
```

---

## 12. Expected Results

### 12.1 API Success Response Format

```json
{
  "statusCode": 200,
  "message": "Descriptive success message",
  "data": { "..." }
}
```

### 12.2 API Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Role name is required" }
  ]
}
```

### 12.3 Auth Error Response Format

```json
{
  "success": false,
  "response": null,
  "errors": {
    "statusCode": 401,
    "message": "Unauthorized"
  }
}
```

### 12.4 Forbidden Response Format

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "errors": {
    "statusCode": 403,
    "message": "Access denied: Missing module access for 'batch'"
  }
}
```

### 12.5 Frontend PermissionGuard — Access Denied Page

When a user lacks a module's permission, they see:

```
┌─────────────────────────────┐
│                             │
│      🔒 Access denied       │
│                             │
│  You do not have permission │
│  to access this page.       │
│                             │
│       [Forbidden SVG]       │
│                             │
└─────────────────────────────┘
```

### 12.6 Frontend 403 Toast

When an API returns 403, the user sees a toast:

```
┌──────────────────────┐
│ ⚠️ You do not have   │
│   permission to      │
│   perform this action│
└──────────────────────┘
```

### 12.7 Nav Filtering Result

| User | Nav items without permission | Nav items with matching permission |
|------|----------------------------|------------------------------------|
| Super Admin | All visible | All visible |
| RM with only `eoi-records` permission | Hidden (e.g., Users, Masters, Batch) | Visible (EOI section, EOI Records) |
| User with no permissions | All permission-tagged items hidden | Only items without `permission` field visible |

### 12.8 Test Pass/Fail Criteria

| Category | Minimum Pass Rate | Critical Failures |
|----------|------------------|-------------------|
| Unit Tests | 100% | Any failure blocks release |
| Integration Tests | 100% | Auth/permission pipeline failure blocks release |
| API Tests | 100% | Any endpoint returning wrong status code blocks release |
| Permission Matrix | 100% | Wrong allow/deny decision blocks release |
| Role Validation | 100% | Role creation/assignment failure blocks release |
| Negative Tests | 100% | Security bypass blocks release |
| Boundary Tests | 95% | Pagination or edge cases |
| Security Tests | 100% | Any vulnerability blocks release |
| Regression Tests | 100% | Breaking existing functionality blocks release |
