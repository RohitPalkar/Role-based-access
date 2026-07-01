# Backend Overview

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | NestJS | ^10.4.4 |
| **Language** | TypeScript | ^5.9.3 |
| **Database** | MySQL (mysql2) | ^3.22.4 |
| **ORM** | TypeORM | ^0.3.28 |
| **Authentication** | Passport (JWT + SAML) | @nestjs/passport ^11.0.4 |
| **Authorization** | Custom Roles Guard | - |
| **Caching** | Redis (cache-manager + ioredis) | ^5.7.6 / ^2.1.2 |
| **Queue** | BullMQ | ^5.78.0 |
| **Validation** | class-validator + class-transformer | ^0.15.1 / ^0.5.1 |
| **Documentation** | Swagger (implied) | - |
| **Monitoring** | Sentry | ^10.56.0 |
| **Logging** | Winston + nest-winston | ^3.19.0 / ^1.9.4 |
| **Testing** | Jest | ^30.3.0 |

## Architecture Style

**Modular Monolith** with:
- **190+ feature modules** (highly granular)
- **Shared kernel** (config, middleware, interceptors, guards, entities)
- **Event-driven** communication via `@nestjs/event-emitter`
- **Async processing** via BullMQ queues
- **Multi-tenant ready** (brand/project isolation)

## Core Design Principles

1. **Module per feature** - Each business domain is isolated
2. **Controller-Service-Repository** pattern via TypeORM
3. **Global middleware pipeline** for cross-cutting concerns
4. **Decorator-based metadata** for authorization, encryption, response transformation
5. **Transaction-per-request** for data consistency
6. **Encryption at rest & in transit** (payload encryption, HTTPS, encrypted DB credentials)

## High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GLOBAL MIDDLEWARE PIPELINE                    │
│  RequestContext → UserRequest → ResponseCatch → Cors →          │
│  Helper → Sanitize → DecryptRequest (Guard)                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GLOBAL GUARDS                                │
│  ThrottlerGuard (100 req/min) → DecryptRequestGuard             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLING                              │
│  Controller → @Roles() → RolesGuard → Service → Repository      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GLOBAL INTERCEPTORS                           │
│  LoggingInterceptor → ResponseInterceptor (transform/encrypt)   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GLOBAL EXCEPTION FILTER                         │
│  Sentry reporting → Email alerts (prod 5xx) → Standard response │
└──────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. **Dual Authentication Strategy**
- **SAML SSO** (Azure AD) for internal users → `/sso/login` → `/sso/callback`
- **OTP-based** for external/partner access → `/sso/send-otp` → `/sso/verify-otp`
- Both issue **JWT tokens** (access: 6h, refresh: 1d) signed with HS256

### 2. **Role-Based Access Control (RBAC)**
- **20 defined roles** in `RolesEnum`
- **Decorator-driven**: `@Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)`
- **Guard**: `RolesGuard` reads metadata via `Reflector`
- **No permission granularity** - roles are coarse-grained

### 3. **Payload Encryption**
- **Optional** via `ENABLE_ENCRYPTION=true`
- **Request**: `DecryptRequestGuard` decrypts `payload` field
- **Response**: `ResponseInterceptor` encrypts response data
- **Opt-out**: `@SkipDecryption()`, `@SkipEncryption()` decorators

### 4. **Request Context & Tracing**
- **AsyncLocalStorage** via `request-context.ts`
- **Trace ID** from `x-request-id` or generated UUID
- **Propagated** to logs, Sentry, response headers

### 5. **Multi-Layer Caching**
- **Redis** (global cache-manager)
- **TTL-based**: OTP (10min), Opportunity access (60min), User flag (1min)
- **BullMQ** uses same Redis for job queues

### 6. **Event-Driven Architecture**
- **EventEmitter2** for domain events
- **Async listeners** for: email, notifications, SFDC sync, webhooks
- **Decouples** business logic from side effects

### 7. **Database Design**
- **Soft deletes** (`deleted_at`) on all entities
- **Audit columns**: `created_at`, `updated_at`, `created_by`
- **JSON columns** for flexible attributes (region_ids, inventory_options)
- **Many-to-Many** via join tables (project_user_mapping, booster_project_mapping)

## Scalability Considerations

| Aspect | Current State | Scaling Path |
|--------|---------------|--------------|
| **App Instances** | PM2 cluster mode | Horizontal (stateless) |
| **Database** | Single MySQL | Read replicas, connection pooling (limit: 100) |
| **Cache** | Single Redis | Redis Cluster / Sentinel |
| **Queues** | BullMQ on Redis | Separate Redis for queues |
| **File Storage** | AWS S3 | CDN (CloudFront) |
| **WebSocket** | Socket.IO + Redis adapter | Sticky sessions or Redis pub/sub |

## Security Posture

- **Helmet.js** with CSP, HSTS, frameguard
- **CORS** - strict in prod, permissive in dev
- **Rate limiting** - Global (100/min) + per-route throttling
- **Input sanitization** - Global middleware strips HTML
- **Payload encryption** - Optional AES encryption
- **Secrets management** - Encrypted in config, decrypted at runtime
- **Audit logging** - All requests logged to DB + Sentry
- **Security events** - Brute force, OTP abuse logged separately

## Deployment Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PM2       │     │   PM2       │     │   PM2       │
│  Instance 1 │     │  Instance 2 │     │  Instance N │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌──────────┐              ┌──────────┐
        │  MySQL   │              │  Redis   │
        │  (Primary)              │  (Cache) │
        └──────────┘              └──────────┘
              │                         │
              ▼                         ▼
        ┌──────────┐              ┌──────────┐
        │  MySQL   │              │  Redis   │
        │ (Replica)│              │ (Queue)  │
        └──────────┘              └──────────┘
```

## Configuration Management

- **Environment-based**: `.env` files per environment
- **CustomConfigService** - decrypts secrets on-the-fly
- **Type-safe** via `config.interface.ts`
- **Feature flags** via env vars (`ENABLE_ENCRYPTION`, `DELEGATE_ERRORS_TO_FILTER`)

## Observability

- **Structured logging** (Winston) with request context
- **Sentry** for error tracking + performance monitoring
- **Custom metrics** via log events (security, business)
- **Health checks** - implied via NestJS Terminus (not explicitly shown)