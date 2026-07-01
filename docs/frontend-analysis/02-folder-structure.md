# Frontend Folder Structure Analysis

## Root Directory (FE/)

```
FE/
├── src/                    # Main source code
├── public/                 # Static assets
├── csp/                    # Content Security Policy configs
├── docs/                   # Internal AI documentation
├── test/                   # Test setup
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vite-plugin-csp.ts
└── README.md (assumed)
```

## Source Code Structure (src/)

```
src/
├── app.tsx                 # Root component with providers
├── main.tsx                # Entry point, Sentry, router setup
├── global.css              # Global styles (21KB)
├── style.css               # Additional global styles
├── config-global.ts        # Global config constants
├── vite-env.d.ts           # Vite type declarations
├── assets/                 # Images, icons, illustrations
├── auth/                   # Authentication module
├── components/             # Shared UI components (70+)
├── config/                 # Environment configuration
├── docs/                   # Architecture docs
├── hooks/                  # Custom React hooks
├── layouts/                # Page layouts per role
├── locales/                # Internationalization
├── pages/                  # Page components by role
├── redux/                  # Redux store & slices
├── routes/                 # Routing configuration
├── sections/               # Section-level components
├── services/               # API service layer
├── theme/                  # MUI theming system
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
```

## Detailed Module Analysis

### auth/ - Authentication System
```
auth/
├── context/
│   ├── auth-context.tsx        # Auth context definition
│   └── jwt/
│       ├── auth-provider.tsx   # JWT token management, user session
│       └── constant.ts         # Storage keys
├── guard/
│   ├── auth-guard.tsx          # Route protection (auth required)
│   ├── guest-guard.tsx         # Redirect if authenticated
│   └── role-based-guard.tsx    # Role-based access control
└── hooks/
    └── use-auth.ts             # Auth context hook
```

### components/ - Shared UI Components (70+)
```
components/
├── animate/                    # Framer Motion animations
├── badge/                      # Badge/tag components
├── breadcrumbs/                # Navigation breadcrumbs
├── button/                     # Button variants
├── card/                       # Card components
├── chart/                      # Chart wrappers (ApexCharts)
├── checkbox/                   # Custom checkboxes
├── dialog/                     # Modal dialogs
├── dropdown/                   # Dropdown menus
├── form/                       # Form components (Formik + MUI)
├── icon/                       # Icon wrappers
├── input/                      # Input components
├── label/                      # Label components
├── layout/                     # Layout primitives (Container, Grid, Stack)
├── list/                       # List components
├── loading/                    # Loading states (SplashScreen, Skeleton)
├── menu/                       # Navigation menus
├── modal/                      # Modal components
├── pagination/                 # Pagination
├── popover/                    # Popover/tooltip
├── progress/                   # Progress indicators
├── radio/                      # Radio groups
├── select/                     # Select/dropdown
├── table/                      # Table components (MUI DataGrid wrappers)
├── tabs/                       # Tab components
├── typography/                 # Text components
├── avatar/                     # User avatars
├── snackbar/                   # Toast notifications
├── settings/                   # Settings drawer
├── scroll-to-top/              # Scroll restoration
├── progress-bar/               # Top progress bar (nprogress)
└── ... (20+ more)
```

### layouts/ - Page Layouts (11+)
```
layouts/
├── admin/                      # Admin panel layout
├── auth/                       # Auth pages layout (login, OTP)
├── bis/                        # BIS role layout
├── crm/                        # CRM layout
├── crm-head/                   # CRM Head layout
├── crm-tl/                     # CRM TL layout
├── dashboard/                  # Default dashboard layout
├── finance-admin/              # Finance Admin layout
├── finance-head/               # Finance Head layout
├── finance-user/               # Finance User layout
├── gre/                        # GRE layout
├── loyalty/                    # Loyalty layout
├── mis/                        # MIS layout
├── project-head/               # Project Head layout
├── rm-panel/                   # RM Panel layout
├── sales-bh/                   # Sales BH layout
├── sales-rsh/                  # Sales RSH layout
├── sales-tl/                   # Sales TL layout
├── super-admin/                # Super Admin layout
└── shared/                     # Shared layout components
```

### pages/ - Role-Based Page Components
```
pages/
├── admin/                      # Admin pages (15+)
├── auth/                       # Login, OTP, sign-in
├── bis/                        # BIS pages
├── crm/                        # CRM pages
├── crm-head/                   # CRM Head pages
├── crm-tl/                     # CRM TL pages
├── dashboard/                  # Generic dashboard pages
├── error/                      # 404, 401 pages
├── finance-admin/              # Finance Admin pages
├── finance-head/               # Finance Head pages
├── finance-user/               # Finance User pages
├── gre/                        # GRE pages
├── loyalty/                    # Loyalty pages
├── mis/                        # MIS pages
├── profile/                    # User profile/settings
├── project-head/               # Project Head pages
├── rm-panel/                   # RM Panel pages (20+)
├── sales-bh/                   # Sales BH pages
├── sales-rsh/                  # Sales RSH pages
├── sales-tl/                   # Sales TL pages
├── super-admin/                # Super Admin pages
└── settings/                   # Settings pages
```

### routes/ - Routing Configuration
```
routes/
├── paths.ts                    # Route path constants
├── constants.ts                # Route constants
├── utils.ts                    # Route utilities
├── hooks/                      # Router hooks (useParams, useSearchParams, etc.)
├── components/                 # RouterLink component
├── sections/                   # Role-based route sections (18 files)
│   ├── auth.tsx                # Auth routes (login, OTP)
│   ├── main.tsx                # Error pages (404, 401)
│   ├── super-admin-routes.tsx  # Super Admin routes
│   ├── admin-routes.tsx        # Admin routes
│   ├── finance-admin-routes.tsx
│   ├── finance-head-routes.tsx
│   ├── finance-user-routes.tsx
│   ├── crm-routes.tsx
│   ├── crm-head-routes.tsx
│   ├── crm-tl-routes.tsx
│   ├── gre-routes.tsx
│   ├── mis-routes.tsx
│   ├── bis-routes.tsx
│   ├── loyalty-routes.tsx
│   ├── rm-panel-routes.tsx
│   ├── sales-tl-routes.tsx
│   ├── sales-rsh-routes.tsx
│   ├── sales-bh-routes.tsx
│   ├── project-head-routes.tsx
│   └── shared-routes.tsx       # Shared across roles
└── index.tsx                   # Main router with role switching
```

### services/ - API Service Layer (23+ modules)
```
services/
├── axiosInstance.ts            # Typed axios helpers (GET, POST, PUT, PATCH, DELETE)
├── axiosInterceptors.ts        # Request/response interceptors, auth, encryption
├── apiRoutes.ts                # Centralized API endpoint constants (100+)
├── adminRoutes.ts              # Admin API routes
├── admin-services/             # Admin feature services (12 files)
├── crm/                        # CRM services
├── finance-admin/              # Finance Admin services
├── rm-panel/                   # RM Panel services (8 files)
├── incentive-dashboard-services/ # Incentive dashboard (4 files)
├── leader-board-services/      # Leaderboard (4 files)
├── common-module/              # Shared services
├── gre-dashboard-services/     # GRE dashboard
├── eoiManagerRoutes.ts         # EOI Manager routes
├── grePanelRoutes.ts           # GRE Panel routes
├── iomRoutes.ts                # IOM routes
├── multiUnitRoutes.ts          # Multi-unit routes
├── crmroutes.ts                # CRM routes
├── adminRoutes.ts              # Admin routes
├── financeAdminRoutes.ts       # Finance Admin routes
├── EoiRoutes.ts                # EOI routes
├── otp-service.ts              # OTP authentication
├── unit-swapping-service.ts    # Unit swapping
└── ...
```

### redux/ - State Management
```
redux/
├── store.ts                    # Store configuration
├── store-provider.tsx          # Provider component
├── hooks/
│   ├── use-redux.ts            # Typed useSelector/useDispatch
├── slices/
│   ├── auth/
│   │   ├── auth-slice.ts       # Auth state (user, loading)
│   │   └── index.ts
│   ├── settings/
│   │   └── settings-slice.ts   # UI settings (theme, layout)
│   └── ...
└── index.ts
```

### theme/ - MUI Theming System
```
theme/
├── theme-provider.tsx          # ThemeProvider wrapper
├── create-theme.ts             # Theme creation logic
├── theme-config.ts             # Theme configuration
├── overrides-theme.ts          # Component overrides
├── create-classes.ts           # CSS-in-JS utilities
├── with-settings/              # Runtime settings
│   ├── right-to-left.tsx
│   ├── update-theme.ts
│   └── primary-color.json
├── styles/                     # Global style utilities
│   ├── mixins.ts
│   ├── utils.ts
│   └── index.ts
└── types.ts                    # Theme types
```

### hooks/ - Custom React Hooks (16+)
```
hooks/
├── use-redux.ts                # Typed Redux hooks
├── use-set-state.ts            # useState with object merge
├── use-media-query.ts          # Responsive breakpoints
├── use-debounce.ts             # Debounced values
├── use-local-storage.ts        # localStorage sync
├── use-on-click-outside.ts     # Click outside detection
├── use-permissions.ts          # Role/permission checks
├── use-user-details.ts         # User details from Redux
└── ...
```

### utils/ - Utility Functions
```
utils/
├── axios.ts                    # Base axios instance
├── encryption.ts               # AES encryption/decryption
├── constant.ts                 # Roles, statuses, enums (944 lines)
├── helpers/                    # Helper functions
├── formatters/                 # Data formatting
├── validators/                 # Yup validation schemas
└── ...
```

### types/ - TypeScript Definitions
```
types/
├── index.ts                    # Global types
├── eoi/
│   └── eoi.ts                  # EOI-specific types
└── ...
```

### locales/ - Internationalization
```
locales/
├── localization-provider.tsx   # i18n provider
├── en.json                     # English translations
└── ...
```

### config/ - Environment Config
```
config/
├── index.ts                    # Config exports
└── env.ts                      # Environment variables
```

## Key Observations

1. **Role-centric organization** - Pages, layouts, routes grouped by user role
2. **Colocated route definitions** - Each role has its own route file
3. **Service-per-domain** - API services organized by business domain
4. **Component library approach** - 70+ reusable components in `components/`
5. **Centralized constants** - All enums, roles, statuses in one file (constant.ts)
6. **Type safety** - Extensive TypeScript usage with generic API helpers
7. **Lazy loading** - Route-level code splitting throughout