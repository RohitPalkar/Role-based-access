# Middleware Architecture Analysis

## Global Middleware Pipeline

Applied to **all routes** via `AppModule.configure()` (`src/app.module.ts:166-177`):

```typescript
consumer
  .apply(
    RequestContextMiddleware,    // 1. Trace ID & async context
    UserRequestMiddleware,       // 2. Log request to DB
    ResponseCatchMiddleware,     // 3. Capture response metadata
    CorsMiddleware,              // 4. CORS headers
    HelperMiddleware,            // 5. Attach helper functions
    SanitizeMiddleware,          // 6. XSS/sanitization
  )
  .forRoutes('*');

consumer.apply(sentryResponseContext).forRoutes('*');  // Sentry context
```

**Execution Order**: Top to bottom (RequestContext → Sanitize)

---

## Middleware Details

### 1. RequestContextMiddleware (`src/middleware/request-context.middleware.ts`)

**Purpose**: Distributed tracing & request-scoped context

```typescript
// Generates/extracts trace ID
traceId = req.headers['x-request-id'] || req.headers['x-datadog-trace-id'] || randomUUID()

// Sets response header for client correlation
res.setHeader('x-request-id', traceId)

// Runs handler within AsyncLocalStorage context
requestContext.run({ requestId: traceId, type: 'HTTP', name: req.originalUrl }, next)
```

**Context Access** (anywhere in request lifecycle):
```typescript
import { requestContext } from 'src/infra/request-context';
const ctx = requestContext.getStore(); // { requestId, type, type, type, name }
```

**Used by**: Logger (ALS format), Sentry (scope), any service needing trace ID

---

### 2. UserRequestMiddleware (`src/middleware/user-requests.middleware.ts`)

**Purpose**: Audit logging of all HTTP requests

```typescript
// Extracts client info
ipAddress = req.headers['x-forwarded-for'] || req.ip
userAgent = req.headers['user-agent'] || req.headers['sec-ch-ua'] || 'unknown'

// Persists to DB (fire-and-forget)
userRequestRepository.save({
  ip_address,
  user_agent,
  request_url: req.originalUrl,
  method: req.method
}).catch(err => logger.error('Failed to save user request log', err))
```

**Entity**: `UserRequest` (`src/entities/user-request.entity.ts`)
- `id`, `ip_address`, `user_agent`, `request_url`, `method`, `created_at`

**Performance**: Async, non-blocking (errors only logged)

---

### 3. ResponseCatchMiddleware (`src/middleware/response-catch.middleware.ts`)

**Purpose**: Capture response metadata for logging/auditing

```typescript
// Wraps res.json to capture response body
const originalJson = res.json.bind(res);
res.json = (body) => {
  // Store response for later use (logging, Sentry)
  res.locals.responseBody = body;
  return originalJson(body);
};
```

**Used by**: `LoggingInterceptor`, `GlobalExceptionFilter`

---

### 4. CorsMiddleware (`src/middleware/cors.middleware.ts`)

**Purpose**: Dynamic CORS handling (complements `main.ts` config)

```typescript
// Allows credentialed requests
res.header('Access-Control-Allow-Credentials', 'true');
res.header('Access-Control-Allow-Origin', origin);  // Reflects request origin
res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
```

**Note**: Main CORS config in `main.ts:61-78` with environment-based origin validation

---

### 5. HelperMiddleware (`src/middleware/helper.middleware.ts`)

**Purpose**: Attach common utilities to request object

```typescript
req.helpers = {
  formatIndianAmount,
  getUserId,
  // ... other helpers from src/helpers/
};
```

**Usage**: `req.helpers.formatIndianAmount(amount)` in controllers/services

---

### 6. SanitizeMiddleware (`src/middleware/sanitize.middleware.ts`)

**Purpose**: XSS prevention via `sanitize-html`

```typescript
// Recursively sanitizes req.body, req.query, req.params
// Whitelists HTML for specific fields:
// - voucherTermsAndCondition
// - eoiTermsAndCondition  
// - unitPrefStaticContent
// - email template body (special handling)
```

**Configuration**:
```typescript
private readonly allowHtmlFields = new Set([
  'voucherTermsAndCondition',
  'eoiTermsAndCondition',
  'unitPrefStaticContent',
]);
```

**Email Template Handling** (`sanitizeString`):
- Allows rich text tags: `a, p, ul, ol, li, strong, em, span, br, b, i, u, h1-h6, table, thead, tbody, tr, th, td, img, div`
- Attributes: `href, target, rel, name, src, alt, width, height, style`
- Schemes: `http, https, mailto`

**Non-HTML fields**: Strips all tags, returns plain text

---

## Global Guards (Applied via `APP_GUARD`)

### 1. DecryptRequestGuard (`src/middleware/decryptRequest.middleware.ts`)

**Purpose**: Decrypt encrypted request payloads

```typescript
// Config: ENABLE_ENCRYPTION=true
// Opt-out: @SkipDecryption() on controller/handler

// Expects: { payload: "<encrypted_string>" }
// Decrypts via crypto-js AES
// Parses JSON, replaces req.body
```

**Flow**:
1. Check `ENABLE_ENCRYPTION` env
2. Check `@SkipDecryption()` decorator
3. Extract `req.body.payload`
4. Decrypt → JSON.parse → replace `req.body`
5. Throw 400 if missing/invalid

---

### 2. ThrottlerGuard (`@nestjs/throttler`)

**Config** (`app.module.ts:114-119`):
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,    // 1 minute
  limit: 100     // 100 requests per minute per IP
}])
```

**Scope**: Global rate limiting

---

## Route-Level Guards (Per-Controller/Handler)

### Authentication Guards

| Guard | Strategy | Purpose |
|-------|----------|---------|
| `RmAdminAuthGuard` | `rm-admin-jwt` | Validates JWT from Authorization header |
| `AuthGuard('sso')` | `sso` | SAML SSO authentication |

### Authorization Guards

| Guard | Purpose |
|-------|---------|
| `RolesGuard` | Checks `@Roles(...)` decorator against `user.role` |
| `OppAccessGuard` | Validates RM has access to requested opportunity ID |
| `OtpThrottleGuard` | Rate limits OTP endpoints (5-10/min per IP+contact) |

### Custom Decorators for Guards

```typescript
// src/modules/sso/decorators/roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// src/interceptors/decorators/skip-encryption.decorator.ts
export const SkipEncryption = () => SetMetadata(SKIP_ENCRYPTION_KEY, true);

// src/interceptors/decorators/skip-decryption.decorator.ts
export const SkipDecryption = () => SetMetadata(SKIP_DECRYPTION_KEY, true);

// src/interceptors/decorators/skip-response-interceptor.decorator.ts
export const SkipResponseInterceptor = () => SetMetadata('skipResponseInterceptor', true);

// src/interceptors/decorators/expose-fields-from-response.decorator.ts
export const ExposeFields = (...fields: string[]) => SetMetadata(EXPOSE_FIELDS_METADATA_KEY, fields);
```

---

## Interceptors (Global via `APP_INTERCEPTOR`)

### 1. LoggingInterceptor (`src/interceptors/logging.interceptor.ts`)

```typescript
// Logs request/response with timing
// Uses requestContext for trace ID
// Sanitizes sensitive headers (auth, cookie, api-key)
```

### 2. ResponseInterceptor (`src/interceptors/transform.interceptor.ts`)

**Purpose**: Standardize API response format + optional encryption

**Output Format**:
```typescript
{
  success: true,
  response: {
    statusCode: 200,
    message: "Operation successful",
    data: { ... }  // sanitized, optionally encrypted
  },
  errors: null
}
```

**Features**:
- **Sanitization**: Omits `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `isDeleted` unless `@ExposeFields()` used
- **Encryption**: If `ENABLE_ENCRYPTION=true` and not `@SkipEncryption()`, encrypts `data` payload
- **Date Serialization**: Converts Date → ISO string
- **Error Handling**: Delegates to `GlobalExceptionFilter` if `DELEGATE_ERRORS_TO_FILTER=true`

---

## Exception Filter (Global)

### GlobalExceptionFilter (`src/filters/global-exception.filter.ts`)

**Responsibilities**:
1. Normalize all exceptions to standard format
2. Log to Winston (with request context)
3. Report to Sentry (with user context, sanitized headers/body)
4. Send critical alerts (5xx in prod) via SES email
5. Return standardized error response

**Error Response Format**:
```typescript
{
  success: false,
  response: null,
  errors: {
    statusCode: 500,
    path: "/api/users",
    message: "Internal server error",
    // ... original error details
    stack: "..."  // only in non-prod
  }
}
```

**Sentry Integration**:
- Sets user context from `req.user` (dbId, email, username)
- Sanitizes headers (removes auth, cookie, api-key)
- Redacts request body in production

---

## Request Lifecycle Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        INCOMING REQUEST                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  MIDDLEWARE PIPELINE (global, order matters)                   │
├─────────────────────────────────────────────────────────────────┤
│  1. RequestContextMiddleware  → traceId, AsyncLocalStorage     │
│  2. UserRequestMiddleware     → audit log to DB                │
│  3. ResponseCatchMiddleware   → capture response for logging   │
│  4. CorsMiddleware            → CORS headers                   │
│  5. HelperMiddleware          → attach helpers to req          │
│  6. SanitizeMiddleware        → XSS protection                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  GLOBAL GUARDS                                                  │
├─────────────────────────────────────────────────────────────────┤
│  • DecryptRequestGuard  (if ENABLE_ENCRYPTION)                 │
│  • ThrottlerGuard        (100 req/min/IP)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  ROUTE-LEVEL GUARDS                                             │
├─────────────────────────────────────────────────────────────────┤
│  • RmAdminAuthGuard    → JWT validation → attaches req.user    │
│  • RolesGuard          → @Roles() check                        │
│  • OppAccessGuard      → opportunity access check              │
│  • OtpThrottleGuard    → OTP rate limiting                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONTROLLER → SERVICE → REPOSITORY                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  GLOBAL INTERCEPTORS                                            │
├─────────────────────────────────────────────────────────────────┤
│  • LoggingInterceptor  → request/response logging              │
│  • ResponseInterceptor → format, sanitize, encrypt response    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  EXCEPTION FILTER (if error thrown)                             │
├─────────────────────────────────────────────────────────────────┤
│  GlobalExceptionFilter → Sentry, alert, standard error response │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        OUTGOING RESPONSE                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Configuration Flags

| Env Variable | Purpose | Default |
|--------------|---------|---------|
| `ENABLE_ENCRYPTION` | Enable request/response encryption | `false` |
| `DELEGATE_ERRORS_TO_FILTER` | Let filter handle errors vs interceptor | `false` |
| `NODE_ENV` | Environment (prod/stage/dev) | `development` |
| `CORS_ALLOWED_DOMAIN_LIST` | JSON array of allowed origins | `[]` |
| `JWT_SECRET` | Token signing secret (encrypted) | Required |
| `STATIC_LOGIN_OTP` | Static OTP for testing | Optional |

---

## Extensibility Points

1. **Add Global Middleware**: Add to `AppModule.configure()` array
2. **Add Global Guard**: Provide via `APP_GUARD` in `app.module.ts`
3. **Add Global Interceptor**: Provide via `APP_INTERCEPTOR` in `app.module.ts`
4. **Custom Decorator**: Create in `interceptors/decorators/` or `sso/decorators/`
5. **Route-Level Opt-Out**: Use `@SkipEncryption()`, `@SkipDecryption()`, `@SkipResponseInterceptor()`, `@ExposeFields()`