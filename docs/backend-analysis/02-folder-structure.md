# Folder Structure Analysis

## Root Directory (`BE/`)

```
BE/
├── src/                    # Main application source
├── docs/                   # Architecture & integration docs
├── test/                   # E2E tests (Jest)
├── dist/                   # Compiled output (gitignored)
├── node_modules/           # Dependencies
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .eslintrc.js
├── .prettierrc
├── sonar-project.properties
├── run-sonar.sh
└── README.md
```

## Source Code (`src/`)

```
src/
├── app.controller.ts           # Health check endpoint
├── app.controller.spec.ts
├── app.module.ts               # Root module - imports all features + global middleware/guards
├── main.ts                     # Bootstrap: middleware, pipes, interceptors, filters, CORS
├── config/                     # Configuration system
│   ├── config.ts               # Environment config factory
│   ├── config.interface.ts     # TypeScript config interface
│   ├── constants.ts            # Application constants (226 lines)
│   ├── custom-config.service.ts # Decrypted config access
│   ├── custom-config.module.ts # ConfigModule definition
│   └── typeorm.config.ts       # TypeORM datasource config
├── entities/                   # Shared entity barrel export
│   ├── index.ts                # Re-exports 73 entities
│   └── user-request.entity.ts  # HTTP request audit log
├── enums/                      # Shared enumerations (20+ files)
│   ├── roles.enum.ts           # 20 system roles
│   ├── status.enum.ts          # ACTIVE/INACTIVE
│   ├── employee-status.enum.ts
│   ├── node-env.enum.ts
│   ├── payment-status.enum.ts
│   ├── event-messages.enum.ts
│   └── ...
├── modules/                    # 190+ feature modules
│   ├── bookings/               # Core booking management
│   ├── users/                  # User, role, group, availability
│   ├── roles/                  # Role CRUD
│   ├── sso/                    # Auth: SAML, OTP, JWT
│   ├── sfdc/                   # Salesforce REST integration
│   ├── sfdc_logs/              # SFDC audit trail
│   ├── incentives/             # Sales commissions & payouts
│   ├── payments/               # Multi-gateway payments
│   ├── eoi_manager/            # Expression of Interest campaigns
│   ├── iom/                    # Income Operations Management
│   ├── notifications/          # Email + WhatsApp
│   ├── masters/                # Master data (brands, projects, cities)
│   ├── aws/                    # S3, SES services
│   ├── whatsapp/               # WhatsApp Business API
│   ├── decentro/               # Banking/KYC integration
│   ├── pine-labs/              # Payment gateway
│   ├── salary_upload/          # Payroll processing
│   ├── crons/                  # Scheduled jobs
│   ├── user_activity_logs/     # User action audit
│   ├── inventory-unit/         # Inventory blocking/management
│   ├── queue_audit/            # BullMQ job auditing
│   ├── ws_publisher/           # WebSocket events
│   ├── pdf/                    # PDF generation (Puppeteer)
│   ├── email_templates/        # Template CRUD + rendering
│   ├── google/                 # Google services
│   ├── agreement_signature_form/
│   ├── site_visit_crud/
│   ├── site_visit_logIn/
│   ├── form_amendment_requests/
│   ├── booking_documents/
│   ├── project_terms/
│   ├── referrals/
│   ├── leegality/              # E-signature integration
│   ├── iom-dropdowns/
│   ├── user_finance/
│   ├── channel_partner/
│   └── sentry/
├── middleware/                 # Global middleware (applied to all routes)
│   ├── cors.middleware.ts
│   ├── decryptRequest.middleware.ts
│   ├── helper.middleware.ts
│   ├── request-context.middleware.ts
│   ├── response-catch.middleware.ts
│   ├── sanitize.middleware.ts
│   └── user-requests.middleware.ts
├── guards/                     # Global guards
│   └── otp-throttle.guard.ts   # Rate limiting for OTP endpoints
├── interceptors/               # Global interceptors
│   ├── transform.interceptor.ts    # Response standardization + encryption
│   ├── logging.interceptor.ts      # Request/response logging
│   ├── decorators/                 # Metadata decorators
│   └── user_activity.interceptor.ts
├── filters/                    # Exception filters
│   └── global-exception.filter.ts  # Sentry + email alerts + standard response
├── helpers/                    # 30+ business utility functions
│   ├── bulk-transaction-upload.helper.ts
│   ├── agreementExport.helper.ts
│   ├── date.helper.ts
│   ├── findUserId.ts
│   ├── formatIndianAmount.ts
│   └── *.helper.ts
├── utils/                      # 28 shared utilities
│   ├── encryption-decryption.util.ts
│   ├── errorLogHandler.ts
│   ├── generateRandomNumber.ts
│   ├── security-logger.ts
│   ├── safe-serialize.ts
│   └── image.utils.ts
├── logger/                     # Winston configuration
│   ├── winston.logger.ts
│   ├── logger.ts
│   ├── redact.format.ts
│   └── als.format.ts
├── infra/                      # Infrastructure primitives
│   ├── request-context.ts      # AsyncLocalStorage for tracing
│   ├── process-error.handler.ts
│   ├── pm2-alert-listener.ts
│   ├── ses-alert-sender.ts
│   └── context-wrappers.ts
├── validations/                # Custom validation
│   └── custom-pipe.validation.ts
├── types/                      # TypeScript declarations
│   └── razorpay.d.ts
├── templates/                  # EJS templates for PDF/email
├── websocket/                  # Socket.IO + Redis adapter
│   └── redis-io.adapter.ts
├── constants/                  # Shared constants
│   └── iom-export.columns.ts
├── events/                     # EventEmitter2 event classes
│   └── email.events.ts
└── migrations/                 # 190+ TypeORM migrations
    ├── *.ts                    # Timestamped migration classes
    └── db_migrate.sql          # Consolidated SQL reference
```

## Standard Module Structure

Each feature module follows:

```
modules/<feature>/
├── <feature>.module.ts           # @Module() definition
├── <feature>.controller.ts       # REST endpoints
├── <feature>.controller.spec.ts  # Controller tests
├── <feature>.service.ts          # Business logic
├── <feature>.service.spec.ts     # Service tests
├── entities/                     # TypeORM entities
│   └── *.entity.ts
├── dto/                          # Data Transfer Objects
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   └── *.dto.ts
├── interfaces/                   # TypeScript interfaces
├── services/                     # Sub-services (if complex)
├── processors/                   # BullMQ job processors
├── listeners/                    # Event listeners
├── cron/                         # Scheduled jobs
├── guards/                       # Module-specific guards
└── decorators/                   # Custom decorators
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `user.service.ts` |
| Classes | PascalCase | `UserService` |
| Interfaces | PascalCase | `CreateUserDto` |
| Enums | PascalCase + Enum | `RolesEnum` |
| DTOs | PascalCase + Dto | `UpdateUserDTO` |
| Constants | UPPER_SNAKE | `JWT_TTL` |
| Methods | camelCase | `getAllUser()` |
| Variables | camelCase | `userName` |

## Module Count Analysis

| Category | Count | Examples |
|----------|-------|----------|
| Core Business | ~15 | bookings, users, roles, sso, incentives |
| Integration | ~8 | sfdc, aws, whatsapp, decentro, pine-labs |
| Master Data | ~5 | masters (brands, projects, cities, companies) |
| Operations | ~6 | payments, iom, eoi_manager, inventory-unit |
| Infrastructure | ~6 | queue_audit, ws_publisher, pdf, notifications |
| Support | ~10 | crons, user_activity_logs, email_templates, salary_upload |

**Total: ~50 primary modules** (some have sub-modules like `incentives/incentive_booking`)

## Key Architectural Patterns

### 1. **Barrel Exports** (`entities/index.ts`)
- Single import point for all 73 entities
- Reduces import path complexity

### 2. **Shared Enums** (`enums/`)
- Centralized role, status, event definitions
- Used across modules for consistency

### 3. **Global Middleware Pipeline** (`app.module.ts:166-177`)
- Applied to all routes via `MiddlewareConsumer`
- Order matters: RequestContext → UserRequest → ResponseCatch → Cors → Helper → Sanitize

### 4. **Global Guards** (`app.module.ts:158-159`)
- `DecryptRequestGuard` - payload decryption
- `ThrottlerGuard` - rate limiting (100 req/min)

### 5. **Global Interceptors** (`app.module.ts:160`)
- `LoggingInterceptor` - request/response logging
- `ResponseInterceptor` - response transformation + encryption

### 6. **Global Exception Filter** (`app.module.ts:81`)
- `GlobalExceptionFilter` - Sentry + email alerts + standardized error response

### 7. **AsyncLocalStorage Context** (`infra/request-context.ts`)
- Request-scoped context propagation
- Used for tracing, logging, Sentry user context

## Migration Strategy

- **190+ timestamped migrations** - one per schema change
- **Naming**: `TIMESTAMP-Description.ts` (e.g., `1772440730858-InsertVoucherChangeApprovedEmailTemplate.ts`)
- **CLI Commands**:
  ```bash
  npm run migration:create    # Generate new migration
  npm run migration:run       # Apply pending migrations
  npm run migration:revert    # Rollback last migration
  ```

## Test Organization

- **Unit tests**: Co-located `*.spec.ts` files
- **E2E tests**: Separate `test/` directory with `jest-e2e.json` config
- **Coverage**: `npm run test:cov`