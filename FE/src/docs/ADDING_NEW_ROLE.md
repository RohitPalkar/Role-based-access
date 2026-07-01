# Adding a New User Role (Frontend)

This guide lists the steps to wire a **new role** into the Puravankara portal so users receive the correct routes, navigation, permissions, and redirects. Follow them in order; skip steps that do not apply to your role (for example, a role that only uses shared modules).

---

## 1. Align with backend

- The JWT / user API must return a **role string** that matches the app exactly (same spelling and casing).
- If roles are managed in an admin API, ensure the new role is **created in the backend** and appears in any **role dropdown** used when creating or editing users.
- Until the backend exposes the role, the frontend cannot resolve permissions correctly for that user.

---

## 2. Register the role in `ROLES`

**File:** `src/utils/constant.ts`

- Add a new entry to the `ROLES` enum, for example: `NEW_ROLE = 'Display Name As Returned By API'`.
- The **enum value** must match the string the API sends for `user.role`.

---

## 3. Role-based permissions (tables, filters, actions)

**File:** `src/config/role-based-permissions.ts`

- Add a top-level key `[ROLES.YourRole]: { ... }` inside `ROLE_BASED_PERMISSIONS`.
- For each module the role uses (for example `eoi`, `eoiDashboard`, `bankDetails`), define:
  - `columns`, `filters`, `actions`
  - `canCreate`, `canExport`, `canViewAll`, `useTab` as needed
- Reuse existing action arrays (for example `ADMIN_ACTIONS`, `MIS_ACTIONS`) or define a small dedicated array if the role should only have specific row actions (for example preview-only).
- If you add **new conditional logic** inside `ACTIONS.*.disabled` or similar, you may need to branch on `ROLES.YourRole` there.

See [ROLE_BASED_PERMISSIONS.md](./ROLE_BASED_PERMISSIONS.md) for the permission model and hook usage.

---

## 4. URL prefix and path helpers

**File:** `src/routes/paths.ts`

- Add a `ROOTS` entry, for example: `YOUR_ROLE: '/your-role-slug'`.
- Add a `paths.yourRole` (or consistent naming) object with at least:
  - `root` — default landing path after login (often `/${ROOTS}/eoi-records` or your main screen).

**File:** `src/utils/constant.ts` — function `generateRoleBasedRoute`

- Map `[ROLES.YourRole]: 'your-role-slug'` so deep links and panel-relative URLs resolve correctly.

---

## 5. Route module (layout + pages)

**New file (pattern):** `src/routes/sections/<role>-routes.tsx`

- Use `DashboardLayout` with nav data from the next step.
- Wrap with `AuthGuard` the same way as similar roles (`CONFIG.auth.skip` for local dev if applicable).
- Declare `children` routes: index routes, lazy-loaded views, and any extra paths such as `preview-voucher/:id` if the role uses EOI preview.

**Wire the router**

**File:** `src/routes/sections/index.tsx`

- Import the new route object.
- In the `switch (user?.role)`, add `case ROLES.YourRole:` and set `activeRoutes` to include your routes plus `notFound` as other roles do.
- In the `default` branch used when auth is skipped / dev, include the new routes if unauthenticated routing should still reach them during development.

**File:** `src/routes/sections/dashboard.tsx` (if used in your build)

- Add the new route module to the `dashboardRoutes` array so dev or bundled dashboard routing stays consistent.

---

## 6. Navigation (sidebar)

**File:** `src/layouts/config-nav-dashboard.tsx`

- Export a nav config (for example `yourRoleNav`) that uses `paths.yourRole.*` for menu items and icons consistent with similar roles.

---

## 7. Auth redirect after login

**File:** `src/sections/auth/jwt/jwt-otp-sign-in-view.tsx`

- In `getRedirectPath`, add a `case` for `ROLES.YourRole.toLowerCase()` that returns `paths.yourRole.root` (or the correct first screen).

---

## 8. 404 “home” link

**File:** `src/sections/error/not-found-view.tsx`

- In the switch on `user?.role`, add a case for `ROLES.YourRole` so the “go home” action sends users to the same base path as post-login redirect.

---

## 9. Hardcoded role checks (search when needed)

Some screens branch on `userRole` or `ROLES.*` (for example tabs, dialogs, or APIs). After adding a role:

- Search the codebase for patterns such as `ROLES.MIS`, `userRole ===`, and module-specific strings (`eoi`, `expression-of-interest`).
- Extend conditions only when the new role should behave like an existing one; otherwise leave defaults so the role follows **role-based permissions** from step 3.

---

## 10. Smoke test checklist

- Log in as a user with the new role; confirm redirect to the expected URL.
- Open each menu item; confirm no blank routes or 404s.
- Open list screens (for example EOI Records); confirm columns, filters, export/create flags, and row actions match the config.
- Open preview or detail flows if applicable; confirm `preview-voucher` (or other) routes exist under the role’s path.

---

## Quick reference: files often touched

| Area | File(s) |
|------|---------|
| Role string enum | `src/utils/constant.ts` |
| Permissions | `src/config/role-based-permissions.ts` |
| Paths | `src/routes/paths.ts`, `generateRoleBasedRoute` in `src/utils/constant.ts` |
| Router | `src/routes/sections/index.tsx`, `src/routes/sections/<role>-routes.tsx`, `dashboard.tsx` |
| Nav | `src/layouts/config-nav-dashboard.tsx` |
| Login / 404 | `jwt-otp-sign-in-view.tsx`, `not-found-view.tsx` |

---

## Related documentation

- [ROLE_BASED_PERMISSIONS.md](./ROLE_BASED_PERMISSIONS.md) — column, filter, and action configuration
