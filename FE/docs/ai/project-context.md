# Project Context

Compact index for AI-assisted work on this repo. Authoritative product/stack policy: [.opencode/agents/governance-agent.md](../../.opencode/agents/governance-agent.md). Day-to-day SDLC behaviour: [.opencode/agents/_sdlc-rules.md](../../.opencode/agents/_sdlc-rules.md). Machine index: [context-map.json](context-map.json).

## Stack

- **App:** React 18 SPA, TypeScript (strict), Vite 5, `@vitejs/plugin-react-swc`.
- **UI:** MUI v5 + Emotion; MUI X (Data Grid, Date Pickers, Tree View); global `src/global.css`; theme under `src/theme/`.
- **Data:** Redux Toolkit + React Redux; Axios (`src/services/`) with interceptors and `GET`/`POST`/… wrappers.
- **Routing:** `react-router-dom` v6; `BrowserRouter` + basename from `CONFIG` in `src/main.tsx`.
- **Forms:** Formik + Yup and react-hook-form + Zod **both** present—extend the pattern used in the touched folder.
- **Cross-cutting:** `react-helmet-async`, Sentry (`import.meta.env` DSN), Framer Motion (lazy), Sonner/snackbar patterns, TipTap/socket.io/dayjs where those areas already use them.
- **Build/security:** CSP generation via `node csp/buildCSP.js <mode>` before `tsc` + `vite build`; `vite-plugin-csp` + `vite-plugin-checker` (TS + ESLint overlay) in dev (tests skip CSP/checker plugins).
- **Env:** Vite modes `development` | `local` | `staging` | `production`; `loadEnv` in `vite.config.ts`. Common `VITE_*` names live in `src/config-global.ts` (e.g. `VITE_SERVER_URL`, `VITE_BASE_PATH`, `VITE_APP_SENTRY_DSN`, `VITE_APP_TURNSTILE_ENABLED`, `VITE_APP_CLOUDFLARE_SITE_KEY`, Mapbox/Firebase/Amplify/Auth0/Supabase keys—**never commit values**).

## Commands

| Purpose | Command |
|--------|---------|
| Dev (modes) | `yarn dev` / `yarn dev:local` / `yarn dev:stage` / `yarn dev:prod` |
| Quality gates | `yarn type-check`, `yarn lint`, `yarn fm:check`, `yarn test:run` |
| Tests (watch) | `yarn test` |
| Coverage | `yarn test:coverage` |
| Build | `yarn build`, `yarn build:stage`, `yarn build:prod` (each runs CSP script then `tsc` + `vite build`) |
| Preview | `yarn preview:dev` / `preview:stage` / `preview:prod` |
| Lint/format fix | `yarn lint:fix`, `yarn fm:fix` |

## Folder Map

| Area | Role |
|------|------|
| `src/sections/` | Feature UI by domain (`admin/`, `crm/`, `rm-panel/`, `common-module/`, `gre-panel/`, `finance-admin/`, etc.)—colocate section-specific code here. |
| `src/redux/` | Store (`store.ts`, `store-provider.tsx`), `slices/**`, `actions/**`. |
| `src/services/` | Axios instance/interceptors, `apiRoutes.ts` + split route modules, domain API helpers. |
| `src/routes/` | `paths.ts`, `sections/` route modules and `index.tsx` (role-based `useRoutes`). |
| `src/components/` | Shared UI, Formik/RHF helpers, global chrome (progress, snackbar, settings). |
| `src/auth/` | JWT `AuthProvider`, hooks, constants—no token values in docs or logs. |
| `src/hooks/`, `src/layouts/`, `src/locales/`, `src/theme/`, `src/config/` | Cross-cutting hooks, shells, i18n, theme, role permissions config. |
| `src/utils/`, `src/types/` | Pure helpers and shared types. |
| `src/pages/` | Page shells wiring sections. |
| `src/docs/` | Maintainer markdown (roles, env, permissions)—link, do not duplicate. |
| `src/test/` | Vitest setup (`setup.ts`). |
| `csp/` | CSP build script consumed by `yarn build*`. |

## Architecture Rules

- **Governance:** Follow [.opencode/agents/governance-agent.md](../../.opencode/agents/governance-agent.md) for allowed stack, security, dependencies, and review gates.
- **Routes:** `src/routes/sections/index.tsx` switches route trees by `user.role` (`src/utils/constant` / `ROLES`) and `useAuthContext`; changing routes impacts auth and lazy loading—coordinate with role docs.
- **API:** Prefer centralized route strings (`apiRoutes`, domain route files) + `axiosInstance` wrappers; interceptors handle bearer token and optional request/response encryption (`src/utils/encryption`).
- **State:** Add or extend slices in `src/redux/slices/**` consistent with neighbouring domains; avoid new global state libraries.
- **Features:** Smallest file set for the story; no new top-level `src/*` buckets without aligning with existing domains.

## Testing Rules

- **Runner:** Vitest + jsdom; includes `src/**/*.{test,spec}.{ts,tsx}`; setup `src/test/setup.ts` (jest-dom for Vitest).
- **Libraries:** RTL + user-event; colocate tests with code or local `__tests__/` per area convention.
- **Scope:** Unit-test pure utils/mappers/reducers; RTL for behaviour with `getByRole` / `getByLabelText`; mock HTTP (Axios/MSW)—no real network in CI.
- **Repo policy:** See [.cursor/rules/frontend-testing.mdc](../../.cursor/rules/frontend-testing.mdc) for conventions; substantive logic/UI changes should include tests when that area already has coverage.

## Styling and Component Rules

- **MUI-first:** `sx`, theme palette/spacing/breakpoints; layout via `Box`/`Stack`/`Grid` patterns matching neighbours.
- **Responsive:** breakpoint-driven layout; avoid rigid full-width pixel layouts on small screens (see [.cursor/rules/mui-responsive-ui.mdc](../../.cursor/rules/mui-responsive-ui.mdc)).
- **Icons:** `@mui/icons-material` or existing `@iconify/react` usage in the same feature area.

## Common Paths

- `src/main.tsx` — entry, Sentry, `BrowserRouter`, `Suspense`.
- `src/app.tsx` — providers (`StoreProvider`, `AuthProvider`, settings, locale, theme, motion, global UI, `Router`).
- `src/routes/paths.ts` — path constants and helpers.
- `src/routes/sections/index.tsx` — role-based route assembly.
- `src/routes/sections/*-routes.tsx` — per-role route modules (admin, crm, rm-panel, finance-admin, gre, mis, sales TL/RSH/BH, super-admin, project-head, bis, shared, auth, main).
- `src/redux/store.ts` — `configureStore` and domain reducer map.
- `src/services/axiosInterceptors.ts`, `src/services/axiosInstance.ts`, `src/services/apiRoutes.ts`.
- `src/config-global.ts` — `CONFIG` and `import.meta.env` wiring (names only in handoffs).
- `vite.config.ts` — aliases (`src/…`, `~/` → `node_modules`), Vitest, checker, CSP plugin.
- `csp/buildCSP.js` — CSP generation for builds.
- `sonar-project.properties` — Sonar sources under `src` (exclusions include `src/pages/customer-form/**`); **do not** paste tokens from this file into AI artifacts.

## Deeper Docs

All under `src/docs/`:

- [ADDING_NEW_ROLE.md](../../src/docs/ADDING_NEW_ROLE.md) — wiring a new JWT role into routes, nav, permissions.
- [ENVIRONMENT_SETUP.md](../../src/docs/ENVIRONMENT_SETUP.md) — env files and variables by deployment mode.
- [ROLE_BASED_PERMISSIONS.md](../../src/docs/ROLE_BASED_PERMISSIONS.md) — column/filter/action permissions system (`src/config/role-based-permissions.ts`).
- [map-and-convert-flow.md](../../src/docs/map-and-convert-flow.md) — EOI/voucher to unit mapping flow.
- [CHANGE_SOURCE_GUIDE.md](../../src/docs/CHANGE_SOURCE_GUIDE.md) — EOI change-request workflow (RM/MIS).
- [role-permissions-improvements.md](../../src/docs/role-permissions-improvements.md), [status-constants-refactor.md](../../src/docs/status-constants-refactor.md) — internal design/refactor notes.

## Agent Notes

- **Read order:** `_sdlc-rules.md` → `governance-agent.md` → this file / `context-map.json` → neighbours in the touched path → relevant `src/docs/*.md`.
- **Scope:** Minimal diffs, no speculative deps or refactors; no destructive git unless the user explicitly asks.
- **Validation before handoff:** `yarn type-check`, `yarn lint`, `yarn fm:check`, `yarn test:run` (plus mode-appropriate `yarn build*` if CSP/env/Vite changed).
- **Secrets:** Never output DSNs, Sonar tokens, or env values—reference variable names and file paths only.
- **Stack/quality reminders:** [.cursor/rules/stack-and-quality.mdc](../../.cursor/rules/stack-and-quality.mdc).
