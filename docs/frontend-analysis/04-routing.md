# Routing Analysis

## Overview

The frontend uses **React Router v6** with a **role-based routing architecture**. Routes are split into 18 per-role sections, dynamically selected at runtime based on the authenticated user's role.

## Route Resolution

```
Router Component (src/routes/sections/index.tsx)
  ├── defaultRoutes (redirect "/" → auth, auth routes, main routes)
  └── activeRoutes (selected by user.role via switch)
      ├── <RoleRoutes>       # Role-specific pages
      ├── sharedRoutes       # Shared pages (e.g., encryption debugger)
      └── notFound           # Catch-all → /404
```

All routes are passed to `useRoutes()` for rendering.

## Role-to-Route Mapping

| Role | Route Section File | Base Path |
|------|-------------------|-----------|
| Super Admin | `super-admin-routes.tsx` | `/super-admin` |
| Admin | `admin-routes.tsx` | `/admin` |
| RM | `rm-panel-routes.tsx` | `/rm-panel` |
| Finance Admin | `finance-admin-routes.tsx` | `/finance-admin` |
| CRM | `crm-routes.tsx` | `/crm` |
| GRE | `gre-routes.tsx` | `/gre` |
| MIS | `mis-routes.tsx` | `/mis` |
| Sales TL | `sales-tl-routes.tsx` | `/sales-tl` |
| Sales RSH | `sales-rsh-routes.tsx` | `/sales-rsh` |
| Sales BH | `sales-bh-routes.tsx` | `/sales-bh` |
| Project Head | `project-head-routes.tsx` | `/project-head` |
| BIS | `bis-routes.tsx` | `/bis` |
| CRM TL | `crm-tl-routes.tsx` | `/crm-tl` |
| CRM Head | `crm-head-routes.tsx` | `/crm-head` |
| Finance User | `finance-user-routes.tsx` | `/finance-user` |
| Finance Head | `finance-head-routes.tsx` | `/finance-head` |
| Loyalty | `loyalty-routes.tsx` | `/loyalty` |
| (Shared) | `shared-routes.tsx` | `/shared-routes` |

The **default (unauthenticated)** case loads ALL role routes to enable Vite to pre-load chunks, then the `AuthGuard` redirects to login.

## Route Section Pattern

Each role route file follows this structure:

```
1. Lazy imports for all page components
2. layoutContent = <DashboardLayout navData={roleNav}>
     <Suspense fallback={<LoadingScreen />}>
       <Outlet />
     </Suspense>
   </DashboardLayout>
3. export const roleRoutes = {
     path: '/role-base-path',
     element: (
       <AuthGuard>
         {layoutContent}
       </AuthGuard>
     ),
     children: [
       { path: 'page1', element: <Page1 />, index: true },
       { path: 'page2/:id/edit', element: <Page2 />, index: true },
     ],
   }
```

### Key Characteristics:
- Every role section is wrapped in `AuthGuard` (redirects if not logged in)
- `DashboardLayout` receives a `navData` prop specific to the role
- All page components are **lazy-loaded** via `React.lazy`
- `Suspense` with `LoadingScreen` handles chunk loading states
- `index: true` is set on every child route

## Path Constants

### ROOTS (base paths per role)
Defined in `src/routes/paths.ts`:

| Constant | Path |
|----------|------|
| `ROOTS.AUTH` | `/auth` |
| `ROOTS.ADMIN` | `/admin` |
| `ROOTS.SUPER_ADMIN` | `/super-admin` |
| `ROOTS.RM_PANEL` | `/rm-panel` |
| `ROOTS.FINANCE_ADMIN` | `/finance-admin` |
| `ROOTS.CRM` | `/crm` |
| `ROOTS.GRE` | `/gre` |
| `ROOTS.MIS` | `/mis` |
| `ROOTS.SALES_TL` | `/sales-tl` |
| `ROOTS.SALES_RSH` | `/sales-rsh` |
| `ROOTS.SALES_BH` | `/sales-bh` |
| `ROOTS.PROJECT_HEAD` | `/project-head` |
| `ROOTS.BIS` | `/bis` |
| `ROOTS.CRM_TL` | `/crm-tl` |
| `ROOTS.CRM_HEAD` | `/crm-head` |
| `ROOTS.FINANCE_USER` | `/finance-user` |
| `ROOTS.FINANCE_HEAD` | `/finance-head` |
| `ROOTS.LOYALTY` | `/loyalty` |

### `paths` Object
The `paths` object in `src/routes/paths.ts` (532 lines) provides full URL builders for every page:
- `paths.admin.user.root` → `/admin/user`
- `paths.admin.user.edit(id)` → `/admin/user/:id/edit`
- Same pattern for all 18 roles

## Guard Hierarchy

```
App Route
  └── AuthGuard
      └── DashboardLayout (with role nav)
          └── Suspense (LoadingScreen)
              └── Page Component
```

### Guard Components

| Guard | Location | Purpose |
|-------|----------|---------|
| **AuthGuard** | `src/auth/guard/auth-guard.tsx` | Redirects unauthenticated users to sign-in with `returnTo` query param |
| **GuestGuard** | `src/auth/guard/guest-guard.tsx` | Redirects authenticated users away from login pages |
| **RoleBasedGuard** | `src/auth/guard/role-based-guard.tsx` | Shows "Permission denied" if role not in `acceptRoles` |

## Auth Routes

```
/auth/jwt/sign-in  →  GuestGuard → AuthSplitLayout → SignInPage
```

Single sign-in page for JWT auth. Other auth methods (Amplify, Firebase, Auth0, Supabase) are defined in `paths` but may not all be wired.

## Error Routes

```
/404  →  Page404
/401  →  Page401
*     →  Navigate to /404
```

## Route Utilities

| Utility | File | Purpose |
|---------|------|---------|
| `hasParams(url)` | `src/routes/utils.ts` | Checks if URL has query params |
| `removeLastSlash(path)` | `src/routes/utils.ts` | Strips trailing slash |
| `removeParams(url)` | `src/routes/utils.ts` | Returns pathname without query string |
| `isExternalLink(url)` | `src/routes/utils.ts` | Checks if URL starts with `http` |

## Route Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useRouter()` | `src/routes/hooks/use-router.ts` | Wraps React Router's `useNavigate` |
| `usePathname()` | `src/routes/hooks/use-pathname.ts` | Returns current pathname |
| `useSearchParams()` | `src/routes/hooks/use-search-params.ts` | Returns URLSearchParams |
| `useParams()` | `src/routes/hooks/use-params.ts` | Wraps React Router's `useParams` |
| `useActiveLink()` | `src/routes/hooks/use-active-link.ts` | Checks if a path matches current route |

## RouterLink Component

`src/routes/components/router-link.tsx` - wraps React Router's `<Link>` with an `href` prop (instead of `to`) for MUI compatibility:

```typescript
<Button component={RouterLink} href={paths.admin.user.root}>
  Users
</Button>
```
