# State Management Analysis

## Overview

The application uses **Redux Toolkit** for global state management, supplemented by React Context for cross-cutting concerns (auth, settings, theme, locale).

## Redux Store

**File:** `src/redux/store.ts`

### Store Configuration

```typescript
export const makeStore = () =>
  configureStore({
    reducer: {
      auth,             // User state, role, auth status
      dashboard,        // RM panel dashboard
      opportunity,      // Opportunity list
      userlist,         // Admin user list CRUD
      project,          // Project CRUD
      common,           // Admin common/data
      boosters,         // Booster policy
      incentive,        // Incentive policy
      reportsList,      // Reports
      brandsList,       // Brands
      phasesList,       // Phases
      notification,     // Notifications
      // ... (45+ slices total)
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
```

### 45+ Slices Organized by Domain

| Domain | Slices |
|--------|--------|
| **Auth** | `auth` |
| **Admin** | `userlist`, `project`, `boosters`, `incentive`, `brandsList`, `phasesList`, `reportsList`, `notification`, `common`, `sfdcLogsHistory` |
| **RM Panel** | `dashboard`, `opportunity`, `expressonOfInterest`, `eoiFinance`, `channelpartner`, `unitInventory`, `searchCp`, `bankDetails`, `multiUnit` |
| **Finance Admin** | `logHistory`, `salaryUpload`, `employeeList` |
| **Leaderboard** | `topPerformers`, `cancellations`, `highestRevenue`, `leaderBoardRMSummary` |
| **Incentive Dashboard** | `incentiveDashboard`, `semicircleChartData`, `boosterPrize`, `incentiveSlabs`, `cards` |
| **CRM** | `agreements` |
| **GRE** | `visit`, `greDashboard` |
| **Common Module** | `batchManager`, `iomManagement` |
| **Misc** | `title`, `bookings`, `bookingDateUpload`, `countries`, `eoiDashboard`, `eoiLeaderboard`, `eoiManager` |

## Redux Provider

**File:** `src/redux/store-provider.tsx`

```typescript
export default function StoreProvider({ children }) {
  const storeRef = useRef<AppStore>();
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

Wraps the entire app in `App.tsx` at the outermost provider level.

## Typed Hooks

**File:** `src/hooks/use-redux.ts`

```typescript
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
```

### Usage Pattern

```typescript
const { user } = useAppSelector((state) => state.auth);
const dispatch = useAppDispatch();
dispatch(setUserDetails(userData));
```

## Auth Slice

**File:** `src/redux/slices/auth/auth-slice.ts`

```typescript
interface AuthState {
  user: AuthUser | null;   // Partial<User> with role
  loading: boolean;
  error: string | null;
}

// Actions
setUserDetails(user)   // Updates user in Redux
```

- Simple slice with a single reducer
- User object includes `role` used for route selection and permission checks
- State is hydrated by `AuthProvider` on app load and after login

## Context Providers

| Context | Provider | Location | Purpose |
|---------|----------|----------|---------|
| **Auth** | `AuthProvider` | `src/auth/context/jwt/auth-provider.tsx` | User session, token validation, login/logout |
| **Settings** | `SettingsProvider` | `src/components/settings` | Theme mode, nav layout, nav color |
| **Theme** | `ThemeProvider` | `src/theme` | MUI theming |
| **Locale** | `LocalizationProvider` | `src/locales` | i18n |
| **Animation** | `MotionLazy` | `src/components/animate` | Framer Motion lazy loading |

## Provider Chain (from `App.tsx`)

```
StoreProvider (Redux) → AuthProvider → SettingsProvider → LocaleProvider → ThemeProvider → MotionLazy → Router
```

## Data Flow

```
API Response
  → Service Module (src/services/*)
    → dispatch(action)
      → Redux Slice (update state)
        → useSelector (component re-render)
```

## Key Characteristics

1. **Serializable check disabled** - Allows non-serializable values in state
2. **No Redux Toolkit Query** - All API calls use custom Axios helpers
3. **Slice-per-domain** - Each feature area has its own slice
4. **Minimal auth slice** - Only stores user object; no loading/error for auth actions
5. **No middleware** - No saga, thunk, or RTK query middleware beyond defaults
