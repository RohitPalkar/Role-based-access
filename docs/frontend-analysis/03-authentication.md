# Authentication Analysis

## Overview

The frontend implements a **JWT-based authentication system** with:
- **Cookie + localStorage** token storage
- **Automatic token validation** on app load
- **Role-based route protection** via guards
- **Encryption support** for API payloads
- **Sentry integration** for error tracking

## Auth Flow

```
App Load
    │
    ▼
AuthProvider (src/auth/context/jwt/auth-provider.tsx)
    │
    ├── Read accessToken from cookies (js-cookie)
    ├── Read refreshToken from cookies → localStorage
    ├── Read accessToken from localStorage (STORAGE_KEY)
    │
    ├── If accessToken exists:
    │   ├── Validate token (isValidToken - checks expiry)
    │   ├── Set axios Authorization header
    │   ├── Call /users/details API
    │   ├── Decrypt response (if enableEncryption)
    │   ├── Update Redux state (setUserDetails)
    │   └── Set AuthContext user
    │
    └── If no valid token:
        ├── Clear state
        ├── Clear Redux
        └── Redirect to login (handled by guards)
```

## Token Management

### Storage Locations
| Token | Primary | Fallback | Sync |
|-------|---------|----------|------|
| **accessToken** | Cookie (`accessToken`) | localStorage (`STORAGE_KEY`) | Cookie → localStorage on refresh |
| **refreshToken** | Cookie (`refreshToken`) | localStorage (`refreshToken`) | Cookie → localStorage |

### Token Validation
```typescript
// src/auth/context/jwt/utils.ts
export const isValidToken = (accessToken: string): boolean => {
  if (!accessToken) return false;
  const decoded = decode(accessToken); // jwt-decode
  const currentTime = Date.now() / 1000;
  return decoded.exp > currentTime;
};
```

### Session Persistence
- **Storage event listener** - Syncs logout across tabs
- **Auto-refresh** - Not implemented (relies on long-lived access token)
- **401 handling** - Axios interceptor clears tokens and redirects

## Auth Context API

```typescript
// AuthContext value
{
  user: User | null,              // Current user with role, accessToken
  checkUserSession: () => Promise<void>,  // Re-validate session
  logout: () => void,             // Clear tokens, reset state
  loading: boolean,               // Session check in progress
  authenticated: boolean,         // Has valid user
  unauthenticated: boolean        // No valid user
}
```

## Route Guards

### 1. AuthGuard (`src/auth/guard/auth-guard.tsx`)
```typescript
// Protects routes requiring authentication
// Redirects to /auth/sign-in if unauthenticated
// Shows loading spinner during auth check
```

### 2. GuestGuard (`src/auth/guard/guest-guard.tsx`)
```typescript
// Protects auth pages (login, OTP)
// Redirects authenticated users to dashboard
```

### 3. RoleBasedGuard (`src/auth/guard/role-based-guard.tsx`)
```typescript
// Component-level role checking
<RoleBasedGuard 
  currentRole={user?.role}
  acceptRoles={[ROLES.Admin, ROLES.SuperAdmin]}
  hasContent={true}
>
  <AdminOnlyComponent />
</RoleBasedGuard>
```

## Login Flows

### 1. SSO Login (SAML)
```
User → /auth/sign-in → SSO Redirect → Azure AD → /sso/callback → Set Cookies → Redirect to Role Dashboard
```

### 2. OTP Login
```
User → /auth/sign-in → Enter Email → /sso/send-otp → Email OTP → /auth/otp → Enter OTP → /sso/verify-otp → Set Cookies → Redirect
```

### OTP Service (`src/services/otp-service.ts`)
```typescript
sendOtp(email: string)
verifyOtp(email: string, otp: string)
resendOtp(email: string)
```

## Redux Integration

### Auth Slice (`src/redux/slices/auth/auth-slice.ts`)
```typescript
interface AuthState {
  user: User | null;
  loading: boolean;
}

setUserDetails(user: User)  // Updates user in Redux
```

### Usage in Components
```typescript
const { user } = useAppSelector(state => state.auth);
const dispatch = useAppDispatch();
dispatch(setUserDetails(user));
```

## API Integration

### Axios Interceptors (`src/services/axiosInterceptors.ts`)

**Request Interceptor:**
- Adds `Authorization: Bearer <token>` header
- Encrypts request body (non-GET, non-FormData) if `enableEncryption=true`

**Response Interceptor:**
- Decrypts encrypted payloads (`{ payload: "..." }` or `{ response: { data: "..." } }`)
- Handles 401: Clears tokens, redirects to login (except OTP endpoints)

### Encryption Utilities (`src/utils/encryption.ts`)
```typescript
encryptText(text: string): Promise<string>
decryptText(encrypted: string): Promise<string>
maybeParseJSON(text: string): any
enableEncryption: boolean  // Config flag
```

## Logout Flow

```typescript
const logout = () => {
  Cookies.remove("accessToken");
  localStorage.clear();
  setSession(null);  // Clear axios defaults
  setState({ user: null, loading: false });
  dispatch(setUserDetails({}));
};
```

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| **Token Storage** | HttpOnly cookies (preferred) + localStorage fallback |
| **Token Expiry** | JWT `exp` claim validated client-side |
| **CSRF Protection** | SameSite cookies (configured on backend) |
| **XSS Protection** | Content Security Policy (CSP) per environment |
| **Encryption** | Optional AES for sensitive payloads |
| **Session Sync** | Storage event listener for multi-tab logout |
| **Error Tracking** | Sentry captures auth errors with user context |

## Current Limitations

1. **No automatic token refresh** - Relies on long-lived access tokens (6h per backend)
2. **No refresh token API call** - `REFRESH_TOKEN_API` defined but not used
3. **Role in localStorage** - Role derived from JWT, not separately stored
4. **No MFA support** - Only OTP as second factor
5. **Session validation only on load** - No periodic re-validation