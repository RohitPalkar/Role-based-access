# API Architecture Analysis

## API Design Overview

The API follows **RESTful conventions** with **NestJS** controllers, organized by feature modules. All routes are prefixed with `/api` (or `/api/{env}` in non-production).

## Base URL Structure

```
Production:     https://api.puravankaraprojects.com/api/
Staging:        https://api.puravankaraprojects.com/api/stage/
Development:    https://api.puravankaraprojects.com/api/dev/
```

## Global Prefix Configuration (`src/main.ts:28-37`)

```typescript
let routePrefix = 'api';
const nodeEnv = configService.get<string>('NODE_ENV');

if (nodeEnv !== NodeEnv.PROD) {
  routePrefix += `/${nodeEnv}`;  // api/stage, api/dev
}
app.setGlobalPrefix(routePrefix);
```

## Standard Response Format

All responses are transformed by `ResponseInterceptor` (`src/interceptors/transform.interceptor.ts`):

### Success Response
```json
{
  "success": true,
  "response": {
    "statusCode": 200,
    "message": "Operation successful",
    "data": { ... }
  },
  "errors": null
}
```

### Error Response
```json
{
  "success": false,
  "response": null,
  "statusCode": 400,
  "errors": {
    "message": "Validation failed",
    "details": [...],
    "statusCode": 400,
    "path": "/api/users"
  }
}
```

## Controller Patterns

### 1. Resource-Based Controllers

Each module has a primary controller following REST conventions:

| Module | Controller | Base Path | Key Endpoints |
|--------|------------|-----------|---------------|
| Bookings | `BookingsController` | `/bookings` | CRUD + custom actions |
| Users | `UserController` | `/users` | CRUD + availability |
| Roles | `RolesController` | `/roles` | List, dropdown |
| SSO | `SsoController` | `/sso` | Auth flows |
| Projects | `ProjectsController` | `/projects` | Master data |
| Incentives | `IncentiveBookingController` | `/incentives` | Calculations, payouts |
| Payments | `PaymentsController` | `/payments` | Gateway integration |
| Notifications | `NotificationController` | `/notifications` | Email/WhatsApp |
| EOI Manager | `EoiCampaignController` | `/eoi-campaigns` | Campaign CRUD |

### 2. HTTP Method Conventions

| Method | Purpose | Example |
|--------|---------|---------|
| `GET` | Retrieve resource(s) | `GET /bookings/get-booking/:oppId` |
| `POST` | Create resource or action | `POST /bookings/create-booking` |
| `PATCH` | Partial update | `PATCH /bookings/update-applicant` |
| `PUT` | Full replacement | `PUT /bookings/map-applicants` |
| `DELETE` | Soft delete | `POST /bookings/delete-booking` |

**Note**: Uses `POST` for deletions (body contains ID) rather than `DELETE` method.

### 3. Parameter Patterns

```typescript
// Path parameters
@Get('/get-booking/:oppId')
getBookingByOppId(@Param('oppId') oppId: string)

// Query parameters (DTO validation)
@Get()
getAllUser(@Query() query: GetAllUserDTO)

// Body parameters (DTO validation)
@Post('create-booking')
createBooking(@Body() dto: CreateBookingDto)

// Current user (from JWT)
@Get('/details')
getUserDetails(@User() user: any)

// File upload
@Post('extract-signature')
@UseInterceptors(FileInterceptor('file'))
extractSignature(@UploadedFile('file') file: File)
```

## DTO-Driven Validation

All inputs use **class-validator** DTOs with **whitelist** enforcement (`main.ts:84-87`):

```typescript
// Global pipes
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, stopAtFirstError: true }),
  new CustomValidationPipe(),
);
```

### Common DTO Patterns

```typescript
// Pagination DTO (src/helpers/dto/commonFindAll.dto.ts)
export class CommonFindAllDto {
  @IsOptional() @IsNumber() @Min(1) page = 1;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit = 10;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sortBy?: string;  // "field:ASC|DESC"
}

// Search/Filter DTO
export class GetAllUserDTO extends CommonFindAllDto {
  @IsOptional() @IsArray() brandUserId?: number[];
  @IsOptional() @IsNumber() groupUserId?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsNumber() role?: number;
}
```

## Authentication & Authorization on Routes

### Public Routes (No Auth)
- `GET /sso/metadata` - SAML metadata
- `GET /sso/login` - Initiates SSO
- `POST /sso/callback` - SAML callback
- `POST /sso/send-otp` - OTP request
- `POST /sso/verify-otp` - OTP verification
- `POST /sso/resend-otp` - OTP resend
- `POST /sso/refresh-token` - Token refresh
- `GET /sso/logout` - Logout
- Webhook endpoints (SFDC, Leegality)

### Protected Routes (Require JWT)
All other routes use `@UseGuards(RmAdminAuthGuard)` + optionally `@UseGuards(RolesGuard)` + `@Roles(...)`

```typescript
// Example: Admin-only endpoint
@Get('refresh')
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
async refreshData()

// Example: Multiple roles allowed
@Get('rm-dropdown')
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(
  RolesEnum.ADMIN,
  RolesEnum.SUPER_ADMIN,
  RolesEnum.SALES_RSH,
  RolesEnum.SALES_TL,
  RolesEnum.BIS,
  RolesEnum.RM,
  RolesEnum.FINANCE_ADMIN,
  RolesEnum.MIS,
  RolesEnum.CRM,
  RolesEnum.GRE,
  RolesEnum.SALES_BH,
  RolesEnum.PROJECT_HEAD,
)
async getRmUsers()

// Example: Authenticated only (no role check)
@Get('/details')
@UseGuards(RmAdminAuthGuard)
async getUserDetails(@User() user: any)
```

### Opportunity-Level Access (RM Only)
```typescript
@Get('/booking/:oppId')
@UseGuards(RmAdminAuthGuard, OppAccessGuard)
async getBooking(@Param('oppId') oppId: string)
```

## API Versioning

**Not explicitly implemented**. Versioning handled via:
- Environment prefix (`/api/stage/`, `/api/dev/`)
- Backward-compatible changes only
- No `/v1/`, `/v2/` in routes

## Rate Limiting

### Global (ThrottlerModule)
```typescript
// app.module.ts:114-119
ThrottlerModule.forRoot([{
  ttl: 60000,    // 1 minute window
  limit: 100     // 100 requests per minute per IP
}])
```

### Per-Route (Custom Guards)
```typescript
// OTP endpoints: 5-10 requests per minute per IP+contact
@UseGuards(OtpThrottleGuard)
@Post('/send-otp')

// Booking PDF download: 5 requests per minute
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Get('/download-pdf/:oppId/:isOffline?')
```

## Request/Response Encryption

**Optional** via `ENABLE_ENCRYPTION=true` env variable.

### Request Decryption
- Guard: `DecryptRequestGuard` (global)
- Expects: `{ "payload": "<encrypted_base64>" }`
- Decrypts via AES (crypto-js)
- Opt-out: `@SkipDecryption()`

### Response Encryption
- Interceptor: `ResponseInterceptor`
- Encrypts `response.data` field
- Opt-out: `@SkipEncryption()`

## File Upload Handling

```typescript
// Multer configuration
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: UPLOAD_LIMIT },  // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)) {
      return cb(new BadRequestException('Only images allowed'), false);
    }
    cb(null, true);
  }
}))
@Post('extract-signature')
async extractSignature(@UploadedFile('file') file: File, @Res() res: Response)
```

## Webhook Endpoints

Special handling for external callbacks:

```typescript
@Post('/booking-status-webhook')
@SkipDecryption()
@SkipEncryption()
async handleWebhook(@Body() webhookData: any)

@Post('/referrer-sign-webhook')
@SkipDecryption()
@SkipEncryption()
async referrerWebhook(@Body() webhookData: any)
```

- Skip encryption/decryption
- No authentication (validated via payload signatures)
- Raw body preservation for signature verification (`main.ts:101-118`)

## PDF Generation Endpoints

```typescript
// Server-side rendered PDF (EJS template)
@Get('/booking-preview/:oppId')
@SkipResponseInterceptor()
@Render('bookings/booking-preview')
async renderBookingPreview(@Param('oppId') oppId: string)

// Direct PDF download
@Get('/download-pdf/:oppId/:isOffline?')
async downloadPdf(@Param('oppId') oppId: string, @Param('isOffline') isOffline: boolean)

// Get PDF as base64/buffer
@Get('/get-booking-pdf/:oppId')
getBookingPDF(@Param('oppId') oppId: string)
```

## Event-Driven Endpoints

Some controllers listen to internal events:

```typescript
@OnEvent(EventMessagesEnum.OPP_PUSH_TO_SFDC)
async handleLogsCreatedEvent(data) {
  this.bookingsService.sendBookingToSFDCApi(data?.opportunityId, data?.isReset);
}
```

## Error Handling Patterns

### Service Layer
```typescript
try {
  // business logic
  return { message: 'Success', data: result };
} catch (error) {
  logger.error('Operation failed:', error);
  logsAndErrorHandling('ServiceMethod', error, { context });
  throw error;  // Let global filter handle
}
```

### Controller Layer
```typescript
@Get(':id')
async findOne(@Param('id') id: number) {
  // Service throws NotFoundException/BadRequestException
  // Global filter catches and formats
  return this.service.findOne(id);
}
```

## API Documentation

**No Swagger/OpenAPI configuration found** in codebase. Documentation appears to be:
- External (Postman collections, Confluence)
- Inferred from DTOs and controller signatures

## CORS Configuration

```typescript
// main.ts:61-78
app.enableCors({
  origin: (origin, callback) => {
    if (nodeEnv === NodeEnv.PROD) {
      // Strict: only allowed domains
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    } else {
      // Permissive in dev
      callback(null, true);
    }
  },
  methods: 'GET,PATCH,POST,PUT,DELETE',
  credentials: true,
});
```

## Request Size Limits

```typescript
// main.ts:101-118
app.use(express.json({ limit: PAYLOAD_SIZE_LIMIT }));  // '5mb'
app.use(express.urlencoded({ limit: PAYLOAD_SIZE_LIMIT, extended: true }));
```

## Health Check

Implicit via root controller:
```typescript
// app.controller.ts
@Get()
getHello(): string {
  return 'Service is running!';
}
```

## WebSocket API

Separate gateway via `WsPublisherModule`:
- Adapter: `redis-io.adapter.ts` (Redis pub/sub for scaling)
- Namespace: Not explicitly shown
- Events: Published via `WsPublisherService`

## Summary: API Design Principles

| Principle | Implementation |
|-----------|----------------|
| **RESTful** | Resource-based paths, HTTP verbs |
| **DTO Validation** | class-validator + global ValidationPipe |
| **Standardized Responses** | ResponseInterceptor (success/error format) |
| **Auth First** | Guards on all non-public routes |
| **Role-Based** | @Roles() decorator + RolesGuard |
| **Resource Scoping** | OppAccessGuard for RM opportunity access |
| **Rate Limited** | Global + per-route throttling |
| **Observable** | Logging, Sentry, audit trails |
| **Extensible** | Decorators for encryption, response shaping |
| **Async Ready** | EventEmitter for side effects |