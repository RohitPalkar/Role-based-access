# RBAC Implementation Document

> **Source:** `RBAC Info.xlsx` (3 sheets)
> **Date:** 2026-06-30
> **Status:** Analysis Complete — Ready for Implementation

---

## 1. Complete RBAC Model

### 1.1 Concept

The application implements a **Department → Role → Module → Sub-Module → Action** permission model with a **4-level hierarchy** (L1–L4, with internal L5–L7 for department structure). Permissions are assigned at the intersection of role and module, scoped to specific projects and zones.

### 1.2 Entity Map

```
Zone (West, East, etc.)
  └── City (Chennai, Mumbai, etc.)
       └── Department (CRM, Finance, Sales, etc.)
            └── Level (L1, L2, L3, L4)
                 └── Role (CRM User, RM TL, etc.)
                      └── Module (IOM, EOI, Bookings, etc.)
                           └── Sub-Module (Loyalty, EOI Records, etc.)
                                └── Action (Generate IOM, Edit EOI, etc.)
                                     └── Project Scope (Atmosphere, Purva, etc.)
```

### 1.3 Hierarchy Levels

| Level | Title | Description |
|-------|-------|-------------|
| **L1** | Individual Contributor | Executes tasks within assigned modules |
| **L2** | Manager | Reports to L3; manages L1 users; optional per user |
| **L3** | Reporting Manager / Team Admin | Reports to L4; oversees L2 |
| **L4** | Department Admin / Reporting Head | Top-level department authority |
| **L5** | (Internal) Department sub-level | e.g., Department itself |
| **L6** | (Internal) Role sub-level | Role definition layer |
| **L7** | (Internal) Base level | Lowest organizational unit |

L1–L4 are user-facing hierarchy levels used in user management. L5–L7 are internal categorization levels for department/role definitions.

### 1.4 Core Entities

| Entity | Source | Description |
|--------|--------|-------------|
| **Zone** | Master | Geographic zone (West, East, North, South) |
| **City** | Master | City within zone; includes zone mapping |
| **Department** | Master | Business department (CRM, Finance, Sales, etc.) |
| **Role** | Master | Named role within department (CRM User, RM TL, etc.) |
| **Level** | Backend config | Hierarchy level (L1–L4 for users) |
| **Module** | Backend config | Feature module (EOI, IOM, Bookings, etc.) |
| **Sub-Module** | Backend config | Feature sub-module (Loyalty, EOI Records, etc.) |
| **Action** | Backend config | Permitted action (CRUD + custom) |
| **Project** | Existing master | Project scope for permission filtering |

### 1.5 User Management Flow

```
1. Select Zone(s) [multi-select]
2. Select Department [single-select]
3. Fetch Roles based on Department → Role → Module mapping
4. Select Primary Role + optional Secondary Role
5. On Primary Role selection:
   - Select Project(s) [multi-select]
   - Per Project, toggle Module/Sub-Module access:
       Project 1: [✓] EOI  [✓] IOM  [ ] Bookings
       Project 2: [✓] EOI  [ ] IOM  [ ] Bookings
6. Select Manager (L2) [optional] — users of roles mapped at L2, filtered by department + project access
7. Select Team Admin / Reporting Manager (L3) [optional] — same filter logic
8. Select Department Admin / Reporting Head (L4) [optional] — same filter logic
```

### 1.6 Admin Access Handling

**Super Admin** and **Admin** roles bypass access management entirely — they automatically have all permissions across all modules. Their access cannot be restricted through the access management UI.

### 1.7 Login Changes

Post-login, the system must:

1. Resolve the **Primary Role** → load associated Module/Sub-Module set
2. Resolve the **Secondary Role** (if set) → merge additional Module/Sub-Module access
3. Provide a **Role Switcher** UI to toggle between primary/secondary roles
4. Dynamically populate navigation and permissions based on the active role + project scope

---

## 2. Permission Matrix

### 2.1 Module-to-Role Matrix

| Module | Sub-Modules | Roles |
|--------|-------------|-------|
| **Users** | (none) | Admin, Super Admin |
| **Masters** | Brands, Projects, Project Phases | Admin, Super Admin, BIS |
| **Bookings** | Add Admin Bookings | RM, Sales TL, Sales RSH, BIS |
| **E-Signer** | — | RM, CRM, Sales TL, Sales RSH, Project Head, CRM TL, CRM Head, Finance User, Finance Head, Loyalty |
| **Incentives** | Records, Leaderboard, Incentive Policy, Booster Policy, Modify Booking Dates, Incentive Slabs, Reports, Dashboard | Admin, Super Admin, RM, BIS |
| **EOI** | EOI Dashboard, EOI Leaderboard, EOI Records, EOI Manager, CP List, Inventory, Bank Details | Almost all roles |
| **Batch** | Listing, Tracker, View Records, Dashboard, Slot Listing, Voucher Listing, Batch Manager | Admin, Super Admin, CRM, GRE, MIS, Sales RSH, BIS |
| **IOM Management** | IOM Listing, Invoice Listing, IOM My Team | CRM, CRM TL, CRM Head, Finance User, Finance Head, Loyalty |
| **Logs** | Logs, Logs History | Super Admin, Finance Admin |
| **Employee** | List | Finance Admin |
| **Uploads** | Salary | Finance Admin |
| **Dashboard** | — | GRE |
| **Site Visit** | — | GRE |
| **Channel Partners** | — | Super Admin, Admin, RM, Sales RSH, Sales TL |
| **Unit Inventory** | — | Super Admin, Admin, MIS, Project Head, Sales TL, BIS |
| **Bank Details** | — | All roles with EOI module |
| **SFDC Logs** | — | Super Admin |
| **Agreement Management** | — | RM, Project Head, Sales RSH, Sales TL, CRM |

### 2.2 Super Admin / Admin Override

| Role | Access Management Control |
|------|--------------------------|
| **Super Admin** | Bypasses all permission checks. Full access to every module. |
| **Admin** | Bypasses all permission checks. Full access to every module. |
| **All Others** | Governed by Department → Role → Module → Action mapping. |

---

## 3. Role Hierarchy

### 3.1 Hierarchy Levels (User-Facing)

```
L1 (Individual Contributor)
  ↑ Reports to
L2 (Manager)
  ↑ Reports to
L3 (Reporting Manager / Team Admin)
  ↑ Reports to
L4 (Department Admin / Reporting Head)
```

### 3.2 Level Definitions

| Level | Code | Reports To | Assignment |
|-------|------|------------|------------|
| L1 | IC | L2 | Default level for most roles |
| L2 | MGR | L3 | Optional; selected during user creation |
| L3 | TM_ADMIN | L4 | Optional; selected during user creation |
| L4 | DEPT_ADMIN | — | Optional; selected during user creation (top of hierarchy) |

### 3.3 Department-Role-Level Mapping

Each role is assigned a Level (L1–L4). This determines:

- **Reporting structure** — who manages whom
- **Permission scope** — L3/L4 may see department-wide data; L1 sees own data
- **User management** — higher levels can manage users at lower levels

### 3.4 Hierarchy Example

```
Department: CRM
  L4: Department Admin (e.g., Sanjay)
    L3: Reporting Manager (e.g., Raghav)
      L2: Manager
        L1: CRM User → Modules: IOM, EOI
        L1: CRM TL → Modules: IOM, EOI
```

### 3.5 Manager/Admin Selection Logic

When assigning L2/L3/L4 during user creation:

1. Fetch candidate users whose **role is mapped to the target level** (L2/L3/L4) within the selected department
2. Filter by **project access overlap** — only show managers who have access to at least the same projects as the new user
3. Display in a dropdown for optional selection

---

## 4. Action Mapping

### 4.1 CRUD Base Actions

| Action | Code | Description |
|--------|------|-------------|
| Create | `create` | Add new record |
| Read / List | `list` | View list of records |
| Read / View | `view` | View single record detail |
| Update | `edit`, `update` | Edit existing record |
| Delete | `delete` | Remove record |

### 4.2 Module-Specific Actions

| Module | Actions |
|--------|---------|
| **Users** | create, list, edit, view, delete, refresh, export |
| **Masters** (Brands) | create, list, edit, view, delete |
| **Masters** (Projects) | create, list, edit, view, delete |
| **Masters** (Phases) | create, list, edit, view, delete |
| **Bookings** | create, list, edit, view, delete, export |
| **E-Signer** | add, edit, signedPdf, viewLink, listing |
| **Incentives** | list, view, export, refresh, create, edit |
| **EOI** | viewCustomer, previewForm, approveCancellation, exportBookingForm, manageSfdcOpportunity, deleteEoi, restoreEoi, createLeadsOnSFDC, convertLeadsOnSFDC, approveUnit, editEOI, assignClosingRM, mapAndConvertEOI, requestCancellation, changeSource, view, edit, previewForm, verify, requestChanges, sendLink, crmCancellationAction, export |
| **Batch** | mapEois, notifyCx, editBatch, deleteBatch, listing, moveTo, generateBatches, sharePreview, openBatch, lockBatch |
| **IOM Management** | addLoyaltyPoints, approveIOM, view, draft, cancel, requestInvoice, submitInvoice, closeIOM, rejectIOM |
| **Channel Partners** | copyLink, create, list, edit, export |
| **Unit Inventory** | updateStatus, mapUnitToVoucher |
| **Bank Details** | share |
| **Agreement Management** | edit, download, viewLink, signNow |

### 4.3 Action Assignment via UI

In the **Department-Role-Module-Action Mapping** screen:

- Department: single-select dropdown
- Level (L1–L4): single-select dropdown
- Role: single-select dropdown (filtered by department + level)
- Module: multi-select dropdown
- Sub-Module: multi-select dropdown (filtered by module)
- Action: multi-select dropdown (filtered by sub-module)

Additional context: Signature Upload flag (for E-Signer module, tracks whether the role's signature is on file).

---

## 5. Module Mapping

### 5.1 Module Tree

```
System Modules
├── Users (Admin/Super Admin only)
├── Masters
│   ├── Brands
│   ├── Projects
│   └── Project Phases
├── Bookings
│   └── Add Admin Bookings
├── E-Signer
├── Incentives
│   ├── Records (Users, Bookings, Incentive Reports)
│   ├── Leaderboard
│   ├── Incentive Policy
│   ├── Booster Policy
│   ├── Modify Booking Dates
│   ├── Incentive Slabs
│   ├── Reports
│   └── Dashboard
├── EOI
│   ├── EOI Dashboard
│   ├── EOI Leaderboard
│   ├── EOI Records
│   ├── EOI Manager
│   ├── CP List
│   ├── Inventory
│   └── Bank Details
├── Batch
│   ├── Listing
│   ├── Tracker
│   ├── View Records
│   ├── Dashboard
│   ├── Slot Listing
│   ├── Voucher Listing
│   └── Batch Manager
├── IOM Management
│   ├── IOM Listing
│   ├── Invoice Listing
│   └── IOM My Team
├── Logs
│   ├── Logs
│   └── Logs History
├── Employee
│   └── List
├── Uploads
│   └── Salary
├── Dashboard (GRE)
├── Site Visit (GRE)
├── Channel Partners
├── Unit Inventory
├── Bank Details
├── SFDC Logs
├── Agreement Management
└── Others
    ├── reportsUsers
    ├── reportsBookings
    ├── incentiveReports
    ├── leaderboardRmSummary
    ├── incentiveStructure
    ├── booster
    ├── bookingDateModification
    ├── brandList
    ├── projectList
    ├── phaseList
    ├── userList
    ├── eoiDashboard
    ├── bhkWiseSplit
    ├── dailyTracker
    ├── eoiLeaderboard
    ├── approvalUnitList
    ├── recentHistory
    ├── changeSourceRecentHistory
    ├── financeRecordDetails
    └── batchViewRecords
```

### 5.2 Zone → City → Project Scoping

Projects are scoped to Cities which are scoped to Zones. When a module is assigned to a role for a specific project:

- The user sees only data relevant to that project
- Module access is independently toggleable per project
- A user may have EOI access on Project A but not on Project B

### 5.3 Dynamic Module Population

On login, modules are resolved as follows:

```
Active Role (Primary or Secondary)
  → Lookup Department → Role → Module Mapping
    → Filter by assigned Projects → Project-level Module toggles
      → Resolve permitted Sub-Modules
        → Resolve permitted Actions
          → Build Navigation + API permissions
```

---

## 6. CRUD Permission Mapping

### 6.1 Permission Model

```
User
  └── Role (Primary / Secondary)
       └── Department → Role → Module → Sub-Module → Action mapping
            └── Project-level scope (per-module toggle)
                 └── Action: { create: bool, read: bool, update: bool, delete: bool, custom: [string] }
```

### 6.2 Permission Resolution Priority

```
1. Is user Super Admin? → Full access (skip all checks)
2. Is user Admin? → Full access (skip all checks)
3. Lookup Department → Role → Module mapping from database
4. Check Project-level module toggle
5. Resolve permitted Actions for that Module+Sub-Module+Role
6. If no mapping found → Deny access (default deny)
```

### 6.3 CRUD Mapping Table (by Role Group)

| Role Group | Modules | Create | Read | Update | Delete | Custom Actions |
|------------|---------|--------|------|--------|--------|----------------|
| **Super Admin** | All | ✓ | ✓ | ✓ | ✓ | All |
| **Admin** | All | ✓ | ✓ | ✓ | ✓ | All |
| **BIS** | Masters, Incentives, EOI, Batch, Users | ✓ | ✓ | ✓ | ✓ | All |
| **RM** | Bookings, E-Signer, Incentives, EOI, CP, Agreement | ✓ | ✓ | ✓ | Limited | mapAndConvert, assignClosingRM |
| **Sales TL** | Bookings, E-Signer, EOI, CP, Unit Inventory | ✓ | ✓ | ✓ | Limited | assignClosingRM |
| **Sales RSH** | Bookings, E-Signer, EOI, Batch, CP, Agreement | ✓ | ✓ | ✓ | Limited | assignClosingRM |
| **Sales BH** | EOI | — | ✓ | — | — | — |
| **CRM** | E-Signer, EOI, Batch, IOM, Agreement | ✓ | ✓ | ✓ | Limited | crmCancellationAction |
| **CRM TL/Head** | IOM, E-Signer | ✓ | ✓ | ✓ | Limited | approveIOM |
| **GRE** | Dashboard, Batch, Site Visit | ✓ | ✓ | ✓ | — | — |
| **MIS** | EOI, Batch, Unit Inventory | — | ✓ | Limited | — | — |
| **Finance Admin** | Employee, Uploads, Logs, EOI | ✓ | ✓ | ✓ | — | financeRecordDetails |
| **Finance User/Head** | IOM, E-Signer | ✓ | ✓ | ✓ | — | requestInvoice, approveIOM |
| **Loyalty** | IOM, E-Signer | ✓ | ✓ | ✓ | — | addLoyaltyPoints |
| **Project Head** | E-Signer, EOI, Agreement | ✓ | ✓ | ✓ | — | — |

### 6.4 Default-Deny Principle

Any module/action not explicitly mapped for a given role is **denied by default**. The permission check chain is:

```
Is Admin/Super Admin? → Allow
Has Department → Role → Module → Action mapping? → Allow
Has Project-level module toggle? → Allow
Else → Deny (403)
```

---

## 7. Backend Permission Requirements

### 7.1 New Data Models

```
Zone
├── id, name, code, status, timestamps

City
├── id, name, zone_id (FK → Zone), status, timestamps

Department
├── id, name, code, level (L5), status, timestamps

RoleDefinition
├── id, name, code, department_id (FK → Department), level (L1-L4), status, timestamps

ModuleDefinition
├── id, name, code, parent_id (nullable FK → self), sort_order, status, timestamps

SubModuleDefinition
├── id, name, code, module_id (FK → ModuleDefinition), sort_order, status, timestamps

ActionDefinition
├── id, name, code, module_id (FK → ModuleDefinition), sub_module_id (nullable FK), timestamps

DepartmentRoleModuleMapping
├── id, department_id (FK), role_definition_id (FK), module_id (FK), sub_module_id (FK), action_id (FK), level (L1-L4), status, timestamps

UserRoleAssignment
├── id, user_id (FK → users), role_definition_id (FK), is_primary (bool), project_access (JSON), status, timestamps

UserHierarchy
├── id, user_id (FK), manager_id (FK → users, nullable), team_admin_id (FK → users, nullable), dept_admin_id (FK → users, nullable), timestamps

UserProjectModuleAccess
├── id, user_id (FK), project_id (FK → projects), module_id (FK → ModuleDefinition), is_enabled (bool), timestamps
```

### 7.2 Middleware Requirements

```
PermissionMiddleware
├── Extracts user + active role from JWT
├── Resolves Department → Role → Module mapping
├── Checks project scope if applicable
├── Validates action against mapping
├── Returns 403 if denied
└── Caches permissions per user/role (Redis or in-memory)
```

### 7.3 Permission Check Endpoint

```
GET /permissions/check?module=EOI&subModule=EOI_Records&action=edit&projectId=123
→ { allowed: true/false, reason: "..." }

GET /permissions/my-permissions
→ {
    role: "CRM User",
    secondaryRole: null,
    modules: {
      EOI: {
        subModules: {
          EOI_Records: { actions: ["view", "edit", "export"], projects: [1, 2, 3] },
          EOI_Dashboard: { actions: ["view"], projects: [1, 2] }
        }
      },
      IOM: { ... }
    }
  }
```

### 7.4 Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|----------------------|
| `permissions:{userId}:{roleId}` | 15 min | Role mapping update, user update |
| `dept_role_module_map` | 1 hour | Department-Role-Module mapping change |
| `user_hierarchy:{userId}` | 30 min | Manager assignment change |

---

## 8. Frontend Permission Requirements

### 8.1 Current State vs Target State

| Aspect | Current | Target (with RBAC) |
|--------|---------|-------------------|
| **Permission source** | Hardcoded `config/role-based-permissions.ts` | **API-driven** from backend |
| **Role resolution** | Static `ROLES` enum | Dynamic from user profile |
| **Module access** | Role-based route sections | API-returned module list |
| **Action control** | `ModulePermissions` config | Backend `canCreate`/`canExport` etc. flags |
| **Nav construction** | Static `{role}Nav` arrays | Dynamic from resolved modules |
| **Project scoping** | None | Per-project module toggles |
| **Admin override** | Route-level guard | Backend-forced full access |

### 8.2 New API Calls

```
POST /auth/login → returns { user, roles: [{ primary, secondary }], modules: [...] }
GET  /permissions/my-permissions → returns resolved permission tree
GET  /user/project-access → returns project-module toggle state
```

### 8.3 Frontend Permission Hook (Updated)

```typescript
// Proposed interface
interface PermissionCheck {
  module: string;
  subModule?: string;
  action: string;
  projectId?: number;
}

function usePermission(): {
  can: (check: PermissionCheck) => boolean;
  permissions: ResolvedPermissionTree;
  activeRole: RoleDefinition;
  switchRole: (roleId: string) => void;
  activeProjects: Project[];
}
```

### 8.4 Dynamic Navigation

Instead of static `{role}Nav` arrays, navigation must be built dynamically:

```typescript
// Pseudocode
const resolvedModules = await fetchMyPermissions();
const navItems = resolvedModules.map(module => ({
  title: module.displayName,
  path: module.defaultRoute,
  icon: module.icon,
  children: module.subModules.map(sub => ({
    title: sub.displayName,
    path: sub.defaultRoute,
  })),
}));
```

### 8.5 UI Changes Required

| UI Component | Change |
|-------------|--------|
| **Login** | After login, fetch resolved permissions + project access |
| **Role Switcher** | New dropdown to toggle Primary/Secondary role |
| **Sidebar Navigation** | Dynamically render modules based on active role + project scope |
| **User Creation/Edit** | New zone-select → department-select → role-select → project-module toggle → hierarchy selection flow |
| **Access Management** | New admin UI for Department → Role → Module → Action mapping |
| **Module Toggle** | Per-project checkbox list for module enable/disable |
| **Permission Denied** | Show "Access Denied" with reason (missing module vs missing action vs wrong project) |

### 8.6 Frontend Security Rules

1. **Never trust the frontend** — all permission checks must be verified by the backend
2. **Route guards** must call backend `/permissions/check` before rendering
3. **Action buttons** must be hidden/disabled based on backend permission response
4. **Admin/Super Admin** flag is backend-enforced; frontend cannot override
5. **Default-deny** — if permission API is unreachable, deny access (fail closed)

---

## 9. Database Changes Required

### 9.1 New Tables

| Table | Columns | Purpose |
|-------|---------|---------|
| `zones` | id, name, code, status, created_at, updated_at | Geographic zone master |
| `cities` | id, name, zone_id (FK), status, timestamps | City within zone |
| `departments` | id, name, code, level (default 'L5'), status, timestamps | Department master |
| `role_definitions` | id, name, code, department_id (FK), level (ENUM: L1-L4), status, timestamps | Role definition with hierarchy level |
| `module_definitions` | id, name, code, parent_id (nullable FK self), sort_order, status, timestamps | Module hierarchy |
| `sub_module_definitions` | id, name, code, module_id (FK), sort_order, status, timestamps | Sub-modules under modules |
| `action_definitions` | id, name, code, module_id (FK), sub_module_id (nullable FK), timestamps | Action types per module |
| `dept_role_module_mappings` | id, department_id (FK), role_definition_id (FK), module_id (FK), sub_module_id (FK), action_id (FK), level (ENUM: L1-L4), status, timestamps | Core permission mapping |
| `user_role_assignments` | id, user_id (FK), role_definition_id (FK), is_primary (bool), project_access (JSONB), status, timestamps | User-role linkage with project scope |
| `user_hierarchies` | id, user_id (FK unique), manager_id (FK nullable), team_admin_id (FK nullable), dept_admin_id (FK nullable), timestamps | Reporting hierarchy |
| `user_project_module_access` | id, user_id (FK), project_id (FK), module_id (FK), is_enabled (bool), timestamps | Per-project module toggle |

### 9.2 Existing Table Modifications

| Table | Change |
|-------|--------|
| `users` | Add `zone_id` (FK → zones), `department_id` (FK → departments) |
| `users` | Add `employment_status` column |
| `users` | Add `user_group` column (Closing RM etc.) |
| `users` | Add `group_start_date`, `group_end_date` columns |
| `projects` | Add `billing_entity`, `address`, `gstin`, `pin_code`, `company` columns |
| `projects` | Add `payment_gateway` column (e.g., Easebuzz) |
| `projects` | Add `incentive_criteria` column (RERA/Non-RERA) |
| `brands` | Add `address`, `gstin`, `pan`, `billing_entity` columns (for IOM loyalty popup) |

### 9.3 Seed Data

```sql
-- Levels
INSERT INTO levels (code, name) VALUES
('L1', 'Individual Contributor'),
('L2', 'Manager'),
('L3', 'Reporting Manager / Team Admin'),
('L4', 'Department Admin / Reporting Head');

-- Master Actions
INSERT INTO action_definitions (name, code) VALUES
('Create', 'create'), ('List', 'list'), ('View', 'view'),
('Edit', 'edit'), ('Delete', 'delete'), ('Export', 'export'),
('Refresh', 'refresh');

-- Module-specific actions as defined in Section 4.2
```

### 9.4 Migration Strategy

```
Phase 1: Create master tables (zones, cities, departments, role_definitions)
Phase 2: Create module/sub-module/action definitions
Phase 3: Create mapping table (dept_role_module_mappings)
Phase 4: Migrate existing roles to role_definitions
Phase 5: Add user assignment tables (user_role_assignments, user_hierarchies)
Phase 6: Add project-scoping table (user_project_module_access)
Phase 7: Modify existing tables (users, projects, brands)
Phase 8: Seed data + migrate existing mappings
```

---

## 10. API Changes Required

### 10.1 New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/zones` | List all zones |
| GET | `/zones/{id}/cities` | List cities in zone |
| GET | `/departments` | List all departments |
| GET | `/departments/{id}/roles` | List roles in department (with level filter) |
| GET | `/role-definitions` | List all role definitions |
| GET | `/module-definitions` | Module tree with sub-modules and actions |
| POST | `/dept-role-module-mappings` | Create/update permission mapping |
| GET | `/dept-role-module-mappings` | Query mappings (filter by department, role, module) |
| GET | `/dept-role-module-mappings/{id}` | Get single mapping |
| DELETE | `/dept-role-module-mappings/{id}` | Remove mapping |
| POST | `/users/{id}/roles` | Assign primary/secondary role to user |
| PUT | `/users/{id}/roles/{roleId}/projects` | Update project-module toggles per role |
| GET | `/users/{id}/hierarchy` | Get user's manager chain |
| PUT | `/users/{id}/hierarchy` | Update manager/team-admin/dept-admin |
| GET | `/users/{id}/project-access` | Get project-module toggles |
| GET | `/permissions/check` | Check specific permission (query params) |
| GET | `/permissions/my-permissions` | Get full resolved permission tree for current user |
| POST | `/auth/switch-role` | Switch active role (returns new permission tree) |
| GET | `/projects/enriched` | Projects with billing entity, address, GSTIN, etc. |
| PUT | `/brands/{id}` | Update brand with IOM fields (address, GSTIN, PAN) |

### 10.2 Modified Endpoints

| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/auth/login` | Return role assignments, project access, initial permission tree |
| GET | `/users/{id}` | Include zone, department, role assignments, hierarchy |
| PUT | `/users/{id}` | Accept zone, department, role assignments, hierarchy |
| POST | `/users` | Accept new user creation flow fields |
| GET | `/projects` | Include billing entity, address, GSTIN, company fields |
| PUT | `/projects/{id}` | Accept new project fields |

### 10.3 Auth/Login Flow (Updated)

```
POST /auth/login
  → Validate credentials
  → Fetch user's role assignments (primary + secondary)
  → Fetch resolved permissions per role
  → Fetch project access with module toggles
  → Return:
      {
        accessToken,
        user: { id, name, email, zone, department, ... },
        roles: [
          { id, name, level, isPrimary: true,
            modules: { EOI: { subModules: [...], actions: [...] }, ... },
            projectAccess: { projectId: 1, moduleToggles: { EOI: true, IOM: false } }
          }
        ],
        hierarchy: { manager, teamAdmin, deptAdmin }
      }

POST /auth/switch-role { roleId }
  → Validate role belongs to user
  → Resolve permissions for new role
  → Return new role's permission tree
  → Update JWT with active role
```

### 10.4 Permission Check Middleware (Backend)

```typescript
// Pseudo-middleware
function requirePermission(module: string, action: string, subModule?: string) {
  return async (req, res, next) => {
    const userId = req.user.id;
    const activeRoleId = req.user.activeRoleId;
    const projectId = req.query.projectId || req.body.projectId;

    // 1. Admin/Super Admin bypass
    if (req.user.isSuperAdmin || req.user.isAdmin) return next();

    // 2. Check cache
    const cached = await cache.get(`perm:${userId}:${activeRoleId}:${module}:${action}`);
    if (cached !== null) return cached ? next() : res.status(403).json(...);

    // 3. Query mapping
    const mapping = await DeptRoleModuleMapping.findOne({
      where: { roleId: activeRoleId, module, subModule, action },
      include: [{ model: UserProjectModuleAccess, where: { userId, projectId } }]
    });

    // 4. Cache + respond
    await cache.set(`perm:...`, !!mapping, 900);
    mapping ? next() : res.status(403).json({ error: 'Access Denied' });
  };
}
```

### 10.5 API Security Requirements

1. All new RBAC endpoints must require Super Admin or Admin authentication
2. Permission check endpoints must use the authenticated user's JWT (no impersonation)
3. Role switch endpoint must verify role belongs to user before returning permissions
4. Rate limiting on permission check endpoints (to prevent brute-force probing)
5. Audit logging on all mapping changes (who changed what, when)

---

## Summary

This document defines the complete RBAC model extracted from `RBAC Info.xlsx`. The implementation requires:

| Area | Effort |
|------|--------|
| **New DB tables** | 11 new tables + 5 modified tables |
| **New API endpoints** | 18 new endpoints + 5 modified endpoints |
| **Backend middleware** | Permission check middleware with caching |
| **Frontend changes** | Permission hook, dynamic nav, role switcher, user creation flow, access management UI |
| **Migration** | 8-phase migration from static to dynamic permissions |

The model supports:

- Department-level role definitions with 4-level hierarchy (L1–L4)
- Module/sub-module/action granularity
- Project-scoped module access toggles
- Primary + Secondary role support with runtime role switching
- Super Admin / Admin bypass for full access
- Default-deny security principle
