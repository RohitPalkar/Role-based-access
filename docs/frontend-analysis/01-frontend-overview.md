# Frontend Overview

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | React | ^18.3.1 |
| **Build Tool** | Vite | ^5.3.0 |
| **Language** | TypeScript | ^5.4.5 |
| **UI Library** | Material UI (MUI) | ^5.16.14 / ^6.4.3 |
| **State Management** | Redux Toolkit | ^2.11.2 |
| **Routing** | React Router | ^6.23.1 |
| **HTTP Client** | Axios | ^1.13.2 |
| **Forms** | Formik + Yup | ^2.4.9 / ^1.6.1 |
| **Animation** | Framer Motion | ^12.24.11 |
| **Charts** | ApexCharts + react-apexcharts | ^5.3.6 / ^1.9.0 |
| **Data Grid** | MUI X Data Grid | ^7.7.0 |
| **Date Handling** | Day.js | ^1.11.19 |
| **Internationalization** | Custom (src/locales) | - |
| **Testing** | Vitest + React Testing Library | ^3.0.5 |
| **Linting** | ESLint (Airbnb config) | ^8.57.0 |
| **Formatting** | Prettier | ^3.7.4 |
| **Error Tracking** | Sentry | ^10.32.1 |

## Architecture Pattern

The application follows a **feature-based modular architecture** with:

- **Layout-driven routing** - Different layouts per role (admin, RM, CRM, finance, etc.)
- **Role-based route sections** - 18 separate route modules for each role
- **Centralized API layer** - Axios instance with interceptors for auth, encryption, error handling
- **Redux for global state** - Auth, UI settings, user details
- **Context for cross-cutting concerns** - Theme, localization, auth, settings
- **Component library approach** - Reusable components in `src/components/`

## Key Design Decisions

### 1. Multi-Role Application
- **18 distinct roles** each with dedicated route sections
- Route configuration per role in `src/routes/sections/*.tsx`
- Dynamic route registration based on user role at runtime

### 2. Encryption Support
- Request/response encryption via axios interceptors
- Configurable via `enableEncryption` flag
- AES encryption for payloads (non-GET requests)

### 3. Theme System
- MUI v5/v6 with custom theme provider
- RTL support
- Settings drawer for runtime theme customization
- CSS variables for dynamic theming

### 4. Code Splitting
- Route-level lazy loading via `React.lazy` + `Suspense`
- Splash screen during chunk loading

### 5. Environment Configuration
- Multiple build modes: development, local, staging, production
- CSP headers generated per environment
- Base path configuration for subdirectory deployments

## Application Entry Point

```
main.tsx
  → Sentry init
  → BrowserRouter (basename from config)
  → HelmetProvider (SEO/meta)
  → ScrollToTop
  → App.tsx
    → StoreProvider (Redux)
    → AuthProvider (JWT context)
    → SettingsProvider (theme/layout)
    → LocalizationProvider (i18n)
    → ThemeProvider (MUI)
    → MotionLazy (Framer Motion)
    → Snackbar + ProgressBar + SettingsDrawer
    → Router (role-based routes)
```

## Project Structure Philosophy

```
src/
├── auth/           # Authentication context, guards, JWT handling
├── components/     # Reusable UI components (70+)
├── config/         # Environment config
├── docs/           # Internal documentation
├── hooks/          # Custom React hooks (16+)
├── layouts/        # Page layouts per role (11+)
├── locales/        # i18n setup
├── pages/          # Page components (13+ role-based folders)
├── redux/          # Redux store, slices, provider
├── routes/         # Route definitions per role (18 sections)
├── sections/       # Section-level components
├── services/       # API services (23+ modules)
├── theme/          # MUI theme, overrides, CSS variables
├── types/          # TypeScript types (eoi, etc.)
└── utils/          # Utilities (axios, encryption, constants, etc.)
```

## Notable Patterns

1. **Route-per-role** - Each role gets its own route file with lazy-loaded pages
2. **Service-per-feature** - API calls grouped by feature/domain
3. **Guard components** - `AuthGuard`, `RoleBasedGuard` for route protection
4. **Centralized constants** - Roles, statuses, enums in `src/utils/constant.ts`
5. **Type-safe API** - Generic axios helpers (GET, POST, PUT, PATCH, DELETE)