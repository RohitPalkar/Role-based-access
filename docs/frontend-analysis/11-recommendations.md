# Recommendations

## Priority: High

### 1. Centralize Route Registration
Replace the `switch(user?.role)` in `routes/sections/index.tsx` with a **role-to-route map**:

```typescript
const ROLE_ROUTES: Record<string, any> = {
  [ROLES.Admin]: [adminRoutes, sharedRoutes],
  [ROLES.SuperAdmin]: [superAdminRoutes, sharedRoutes],
  // ...
};

const activeRoutes = ROLE_ROUTES[user?.role] ?? (authenticated ? [] : fallbackRoutes);
```

This eliminates the 18-case switch and makes adding a role a single-line change.

### 2. Deduplicate Nav Configs
Admin and Super Admin navs are nearly identical but duplicated. Create a **nav factory**:

```typescript
const createAdminNav = (pathBuilder: typeof paths.admin) => ({
  items: [
    { title: 'Users', path: pathBuilder.user.root, icon: ICONS.user },
    // ... shared structure, use `pathBuilder` instead of hardcoded paths
  ],
});

export const adminNav = createAdminNav(paths.admin);
export const superAdminNav = createAdminNav(paths.superAdmin);
```

Apply same pattern for shared nav sections across roles.

### 3. Extract Permissions into Module Files
The 5074-line `role-based-permissions.ts` should be **split by module**:

```
src/config/permissions/
  ├── index.ts          # Combines all modules
  ├── eoi.ts            # EOI module permissions per role
  ├── userList.ts       # User list permissions
  ├── iomManagement.ts  # IOM management permissions
  └── shared.ts         # Shared stacks (ADMIN_INCENTIVE_STACK, etc.)
```

Each module file exports a `get{Module}Permissions(role)` function.

### 4. Unify Admin-Shaped Path Helpers
Instead of `paths.admin`, `paths.superAdmin`, `paths.bis` with duplicated structure, use a **dynamic path resolver**:

```typescript
// Prefer existing useAdminPanelPaths() hook pattern across all admin-shaped pages
const panelPaths = useAdminPanelPaths(); // returns paths.admin | paths.superAdmin | paths.bis
```

### 5. Strengthen RoleBasedGuard Usage
`RoleBasedGuard` exists but is commented out in most route sections (`// <RoleBasedGuard ...>`). Enable it:

```typescript
element: (
  <AuthGuard>
    <RoleBasedGuard currentRole={user?.role} acceptRoles={['admin']} hasContent>
      {layoutContent}
    </RoleBasedGuard>
  </AuthGuard>
)
```

This adds defense-in-depth at the route level, even if nav links only show for the correct role.

## Priority: Medium

### 6. Implement Token Refresh
The `REFRESH_TOKEN_API` constant is defined but never called. Implement automatic token refresh when the access token expires, using the refreshToken stored in localStorage.

### 7. Preload Routes Selectively
Instead of loading ALL role routes for unauthenticated users, load only auth routes and lazily load role routes after login. This reduces initial bundle size.

### 8. Add Route-Level Code Splitting Metrics
Monitor chunk sizes for each role section. Some role sections (e.g., admin) import many shared components that could be extracted into a common chunk.

### 9. Normalize API Route Constants
Some API routes in `apiRoutes.ts` are duplicated (e.g., `INCENTIVE_STRUCTURE` and `incentiveStructure`). Deduplicate to a single source.

### 10. Add Permission Unit Tests
The `hasPermission`, `getRoleBasedPermissions`, and `getFilteredActions` functions have no tests. Add unit tests covering:

- Each role returns expected permissions for key modules
- Action filtering by row data conditions
- Default permission fallback for unknown roles/modules

## Priority: Low

### 11. Remove Dead Auth Method Code
Multiple auth providers (Amplify, Firebase, Auth0, Supabase) have path definitions but no implemented flows. Clean up to reduce confusion.

### 12. Standardize Service Module Naming
Some files have typos (e.g., `booster-srvice.ts`, `brand-srvice.ts`). Rename for consistency.

### 13. Add Permission Documentation Generator
Create a script that reads `ROLE_BASED_PERMISSIONS` and generates a permissions matrix document (markdown or spreadsheet) for stakeholders.

### 14. Reduce Nav Config Boilerplate
Roles with single modules (CRM TL, CRM Head, Finance User, Finance Head, Loyalty) all use `iomOnlyNav(root)`. Consider making this the default pattern for single-purpose roles and removing per-role nav exports.
