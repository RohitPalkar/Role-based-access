# Authentication Flow Analysis

## Overview

The system implements a **dual authentication strategy**:
1. **SAML 2.0 SSO** (Azure AD) for internal employees
2. **Email OTP** for external users/partners

Both flows converge to **JWT token issuance** (access + refresh tokens).

## Authentication Methods

### 1. SAML SSO Flow (Internal Users)

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │────▶│ /sso/   │────▶│  Azure  │────▶│ /sso/   │────▶│  JWT    │
│ Browser │     │ login   │     │    AD   │     │callback │     │ Tokens  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
                     │                                      │
                     │         Passport-SAML Strategy       │
                     ▼                                      ▼
              SsoStrategy                           SsoService.generateAuthToken()
              (src/modules/sso/                   (src/modules/sso/
               sso.strategy.ts)                    sso.service.ts:66)
```

**Entry Point**: `GET /api/sso/login` → Redirects to Azure AD

**Callback**: `POST /api/sso/callback` (SAML assertion consumer)

**Strategy**: `SsoStrategy` extends `PassportStrategy(Strategy, 'sso')`
- Reads config: `SSO_ENTRY_POINT`, `SSO_ISSUER_URL`, `SSO_CALLBACK_URL`
- Loads certificates from `src/config/cert/`
- Extracts claims: `nameID`, `email`, `displayName`, `tenantId`

**Token Generation**: `SsoService.generateAuthToken(user)`
1. Validates user exists in DB with `status = ACTIVE`
2. Loads `role` relation
3. For RM role: Verifies opportunity access via SFDC (cached in Redis)
4. Creates JWT payload:
   ```typescript
   {
     sub: user.id (lowercase) or email,
     dbId: user.id,
     name: user.name,
     email: user.email,
     role: user.role.name
   }
   ```
5. Signs **access token** (6h, HS256) + **refresh token** (1d, HS256)
6. Sets HTTP-only cookies: `accessToken`, `refreshToken`
7. Redirects to role-specific portal URL

### 2. Email OTP Flow (External/Partner Users)

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│  User   │────▶│ /sso/    │────▶│  Email  │────▶│ /sso/    │────▶│  JWT    │
│ Browser │     │send-otp  │     │  with   │     │verify-otp│     │ Tokens  │
└─────────┘     └──────────┘     │  6-digit │     └──────────┘     └─────────┘
                                 │   OTP   │
                                 └─────────┘
```

**Send OTP**: `POST /api/sso/send-otp`
- Rate limited: 5 req/min per IP+email (`OtpThrottleGuard`)
- Validates user exists
- Generates 6-digit OTP (or static OTP from env `STATIC_LOGIN_OTP`)
- Stores SHA-256 hash in Redis (`otp:{email}`, TTL 10min)
- Tracks resend count & window (max 5 resends/10min)
- Emits `COMPOSE_EMAIL` event for async delivery

**Verify OTP**: `POST /api/sso/verify-otp`
- Rate limited: 10 req/min per IP+email
- Validates OTP format (6 digits)
- Compares SHA-256 hash
- Tracks failed attempts (max 5, locks for 10min)
- On success: Deletes OTP caches, calls `generateAuthToken()`

**Resend OTP**: `POST /api/sso/resend-otp`
- Same rate limit as send
- Enforces 60s cooldown
- Updates resend tracking

### 3. Token Refresh Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────┐
│  Client │────▶│ /sso/        │────▶│  New    │
│         │     │refresh-token │     │ Access  │
└─────────┘     └──────────────┘     │ Token   │
                                      └─────────┘
```

**Endpoint**: `POST /api/sso/refresh-token`
- Validates refresh token signature & expiry
- Re-fetches user from DB (checks ACTIVE status + role)
- Issues new access token (same payload, new expiry)
- Returns same refresh token (sliding window)

### 4. Logout Flow

```
┌─────────┐     ┌──────────┐     ┌─────────────────┐
│  User   │────▶│ /sso/    │────▶│ Clear cookies + │
│ Browser │     │logout    │     │ redirect home   │
└─────────┘     └──────────┘     └─────────────────┘
```

- Clears `accessToken` and `refreshToken` cookies
- `logout-user` variant redirects to portal home

## JWT Token Structure

### Access Token (6 hours)
```json
{
  "sub": "user@domain.com",
  "dbId": 123,
  "name": "John Doe",
  "email": "john@domain.com",
  "role": "RM(Relationship Manager)",
  "iat": 1700000000,
  "exp": 1700021600
}
```

### Refresh Token (1 day)
Same payload, longer expiry.

### Signing
- Algorithm: **HS256** (symmetric)
- Secret: `JWT_SECRET` (encrypted in config, decrypted at runtime)
- Issued by: `JwtService` from `@nestjs/jwt`

## Token Validation (Request Authentication)

### Guard: `RmAdminAuthGuard` → `AuthGuard('rm-admin-jwt')`
### Strategy: `RmAdminJwtStrategy` (`src/modules/sso/rm-jwt.strategy.ts`)

```typescript
// Extracts token from Authorization: Bearer <token>
jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()

// Validates signature & expiry
secretOrKey: configService.getDecrypted('JWT_SECRET')

// Returns user object attached to request.user
validate(payload) {
  return {
    userId: payload.sub,
    username: payload.sub,
    dbId: payload.dbId,
    name: payload.name,
    email: payload.email,
    role: payload.role
  };
}
```

## Session Management

### Cookie Configuration (`src/config/constants.ts:83-91`)
```typescript
COOKIE_CONFIG = {
  ACCESS_TOKEN_NAME: 'accessToken',
  REFRESH_TOKEN_NAME: 'refreshToken',
  SECURE: true,                    // HTTPS only
  DOMAIN: '.puravankaraprojects.com',  // Shared across subdomains
  SAME_SITE: 'lax',                // CSRF protection
  MAX_AGE: 20 * 1000,              // 20 seconds (NOTE: seems low)
  REFRESH_MAX_AGE: 20 * 1000       // 20 seconds (NOTE: seems low)
}
```

**Note**: Cookie max age (20s) doesn't match JWT expiry (6h/1d). This may be intentional for security (tokens in memory, cookies for transport only).

### Redis Caching for RM Opportunity Access
- Key: `user:opps:{username}`
- Value: Array of SFDC Opportunity IDs
- TTL: 60 minutes (`OPP_ACCESS_TTL`)
- Populated on login via `SsoService.ensureRmOppAccessCached()`
- Validated by `OppAccessGuard` on opportunity-scoped endpoints

## Security Features

| Feature | Implementation |
|---------|----------------|
| **Brute Force Protection** | OTP attempt tracking (5 max), lockout 10min |
| **Rate Limiting** | Global (100/min), Per-route (OTP: 5-10/min) |
| **Token Expiry** | Access: 6h, Refresh: 1d |
| **Secure Cookies** | HttpOnly, Secure, SameSite=lax |
| **Encrypted Secrets** | JWT_SECRET decrypted at runtime |
| **Static OTP** | Dev/testing via `STATIC_LOGIN_OTP` env |
| **Audit Logging** | All auth events logged to DB + Sentry |

## Role-Based Redirect After Login

| Role | Redirect URL |
|------|--------------|
| SUPER_ADMIN | `/super-admin/user` |
| ADMIN | `/admin/user` |
| RM | `/rm-panel/bookings` |
| FINANCE_ADMIN | `/finance-admin/employee-list` |
| CRM | `/crm/dashboard` |
| MIS | `/mis/eoi-dashboard` |
| SALES_TL | `/sales-tl/bookings` |
| SALES_RSH | `/sales-rsh/bookings` |
| SALES_BH | `/sales-bh-panel/eoi-records` |
| PROJECT_HEAD | `/project-head/eoi-dashboard` |
| GRE | `/gre/dashboard` |
| BIS | `/bis/bookings` |
| Others | `/404` |

## Integration Points

1. **SFDC** - Validates RM opportunity access on login
2. **Redis** - Caches OTPs, attempt counts, opportunity access
3. **EventEmitter** - Async email delivery for OTP
4. **Config Service** - Decrypts JWT_SECRET, SSO certs
5. **Sentry** - Auth errors tracked with user context

## Potential Issues

1. **Cookie Max Age Mismatch** - 20s vs 6h/1d token expiry
2. **HS256 Symmetric Key** - Consider RS256 for better key rotation
3. **No Token Revocation** - Refresh tokens valid until expiry
4. **Single JWT Secret** - All tokens use same secret
5. **Static OTP in Config** - Security risk if enabled in prod