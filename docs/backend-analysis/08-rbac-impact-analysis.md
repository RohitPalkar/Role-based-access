# RBAC Impact Analysis

## Areas Requiring RBAC Integration

### 1. Controllers Needing Authorization Updates

| Controller | Current State | RBAC Integration Needed |
|------------|---------------|------------------------|
| **BookingsController** | Only `OppAccessGuard` on some routes | Full `@Roles` + resource policies |
| **ProjectsController** | No guards observed | Brand/project-level access |
| **IncentivesController** | Partial/inconsistent | Role-based calculation access |
| **PaymentsController** | No `@Roles` | Finance role segregation |
| **NotificationsController** | No guards | Admin vs user access |
| **EoiCampaignController** | Unknown | Campaign ownership |
| **Masters Controllers** (Brands, Cities, etc.) | No guards | Admin-only management |
| **UserActivityLogsController** | Unknown | Audit access control |
| **SfdcController** | Webhook only | Internal API protection |
| **WhatsAppController** | Unknown | Template management |
| **EmailTemplatesController** | Unknown | Template CRUD roles |

### 2. Service Layer Authorization Gaps

| Service | Current Checks | Missing |
|---------|----------------|---------|
| **UserService** | Role checks in controller only | Service-level enforcement |
| **BookingService** | Opportunity access only | Status-based field permissions |
| **IncentiveService** | None observed | Role-based calculation visibility |
| **PaymentService** | None | Brand/gateway segregation |
| **ProjectService** | None | Project-user mapping enforcement |
| **NotificationService** | None | Recipient role filtering |

### 3. Database-Level Access Control

| Table | Current Access | RBAC Need |
|-------|----------------|-----------|
| `users` | Service filters by roleId | Row-level security |
| `bookings` | OppAccessGuard for RM | Policy-based filtering |
| `projects` | No filtering | Brand/region isolation |
| `voucher_forms` | Campaign-based | Role + campaign access |
| `iom` | No filtering | Project/role access |
| `incentive_bookings` | No filtering | Finance vs Sales segregation |
| `notifications` | User_id filter | Role-based broadcast |

### 4. API Endpoints by Risk Level

#### High Risk (Data Exposure/Modification)
```
POST   /bookings/create-booking           → Any authenticated user
PATCH  /bookings/update-payment-details   → No role check
POST   /bookings/delete-booking           → No role check
POST   /payments/*                        → No role check
POST   /incentives/*                      → No role check
PATCH  /users/:id                         → Only ADMIN/SUPER_ADMIN/RM
POST   /users                             → Only SUPER_ADMIN
```

#### Medium Risk (Read Access)
```
GET    /bookings/get-booking/:oppId       → OppAccessGuard only
GET    /projects/*                        → No filtering
GET    /eoi-campaigns/*                   → Unknown
GET    /notifications/*                   → User-only, no role
```

#### Low Risk (Master Data)
```
GET    /roles/*                           → No guard
GET    /brands/*                          → No guard
GET    /cities/*                          → No guard
```

---

## Impact Assessment by Module

### Bookings Module (Highest Impact)
- **50+ endpoints** - Core business logic
- **Current**: Only `OppAccessGuard` protects RM opportunity access
- **Risk**: Any authenticated user can create/modify/delete bookings
- **RBAC Need**: 
  - RM: CRUD own opportunities (status-gated)
  - TL/RSH/BH: Team opportunity oversight
  - Admin: Full access
  - Finance: Read-only payment data
  - CRM: Applicant/document access only

### Users Module (High Impact)
- **Already well-protected** with `@Roles`
- **Gaps**: 
  - No field-level permissions (e.g., salary visible only to Finance)
  - Group/project assignment not guarded
  - Availability management only for CRM_TL

### Incentives Module (High Impact)
- **Financial data** - High sensitivity
- **Current**: Minimal guards observed
- **RBAC Need**:
  - RM: View own incentives only
  - TL/RSH: Team aggregates
  - Finance Admin: Full calculation access
  - Finance User: Payout processing only
  - Admin: Configuration + overrides

### Payments Module (High Impact)
- **PII + Financial** - PCI/DSS relevant
- **Current**: No role guards
- **RBAC Need**:
  - Gateway configs: Admin only
  - Transaction processing: Finance + RM (own)
  - Refunds: Finance Head + Admin
  - Reports: Finance + MIS

### Projects/Masters Module (Medium Impact)
- **Configuration data** - Affects all modules
- **Current**: No guards
- **RBAC Need**:
  - Brand/Project CRUD: SUPER_ADMIN only
  - City/Region: Admin + Project Head
  - Price/Gateway config: Finance Admin + Project Head

### EOI/Voucher Module (Medium Impact)
- **Campaign-based access**
- **Current**: Unknown guard coverage
- **RBAC Need**:
  - Campaign Owner: Full CRUD
  - Channel Sales: Own campaign vouchers
  - MIS: Read-only analytics
  - Finance: Payment verification

### Notifications Module (Low-Medium Impact)
- **Broadcast capabilities**
- **Current**: No guards
- **RBAC Need**:
  - Template CRUD: Admin + Marketing
  - Send notifications: Role-based recipient selection
  - Audit logs: Admin only

---

## Files Requiring Modification (Estimated)

### Controllers (~30 files)
```
modules/bookings/bookings.controller.ts
modules/projects/projects.controller.ts
modules/incentives/incentive_booking/incentive_booking.controller.ts
modules/payments/payments.controller.ts
modules/notifications/notification.controller.ts
modules/eoi_manager/eoi_campaign/eoi_campaign.controller.ts
modules/masters/brands/brand.controller.ts
modules/masters/projects/projects.controller.ts
modules/masters/citymaster/citymaster.controller.ts
modules/users/user.controller.ts (enhance)
modules/roles/roles.controller.ts (add guards)
... and 15+ more
```

### Services (~25 files)
```
modules/bookings/bookings.service.ts
modules/projects/projects.service.ts
modules/incentives/incentive_booking/incentive_booking.service.ts
modules/payments/payments.service.ts
modules/notifications/notification.service.ts
modules/eoi_manager/eoi_campaign/eoi_campaign.service.ts
modules/users/user.service.ts (add field-level)
... and 15+ more
```

### Guards & Decorators (New Files)
```
modules/sso/guards/permission.guard.ts
modules/sso/decorators/permissions.decorator.ts
modules/sso/decorators/resource-owner.decorator.ts
common/guards/rbac.guard.ts
common/decorators/require-permission.decorator.ts
```

### Database (Migrations)
```
- Add permissions table
- Add role_permissions junction table
- Add resource_policies table
- Add user_permissions (override) table
- Indexes for policy evaluation
```

### Configuration
```
config/constants.ts (permission constants)
config/rbac.config.ts (policy definitions)
```

---

## Breaking Changes Risk

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| Add `@Roles` to unprotected controllers | **High** | Phase rollout, feature flag |
| Change JWT payload to include permissions | **Medium** | Version tokens, backward compat |
| Add service-level authorization | **Medium** | Unit tests, integration tests |
| Database policy tables | **Low** | Additive migration |
| Remove `OppAccessGuard` dependency | **High** | Parallel implementation |

---

## Testing Impact

### Existing Tests Affected
- All controller tests need auth mocking updates
- Service tests need policy mock objects
- E2E tests need role-based scenarios

### New Test Requirements
- Permission matrix test coverage
- Resource policy evaluation tests
- Field-level access tests
- Delegation/impersonation tests
- Performance tests for policy evaluation

---

## Migration Strategy

### Phase 1: Foundation (Non-Breaking)
1. Create permission system tables
2. Build `PermissionGuard` + `@RequirePermission` decorator
3. Map current roles → permission sets
4. Add permissions to JWT payload (alongside role)

### Phase 2: Controller Migration (Controlled)
1. Protect master data controllers first (low risk)
2. Add resource policies for Bookings (high value)
3. Implement field-level for Users/Finance
4. Replace `OppAccessGuard` with resource policies

### Phase 3: Advanced Features
1. Delegation/impersonation
2. Dynamic policies (status-based, time-based)
3. Admin UI for permission management
4. Audit logging for authZ decisions

---

## Effort Estimation

| Task | Effort (Person-Days) |
|------|---------------------|
| Design permission model | 3 |
| Database migrations | 2 |
| Core RBAC engine (guard, decorator, service) | 5 |
| JWT enhancement | 2 |
| Controller migration (~30) | 15 |
| Service migration (~25) | 10 |
| Testing (unit + integration + e2e) | 10 |
| Documentation + Admin UI | 5 |
| **Total** | **~52 days** |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing integrations | High | High | Feature flags, gradual rollout |
| Performance degradation | Medium | High | Caching, optimized queries |
| Permission model too rigid | Medium | Medium | Policy-based, not role-based |
| Team adoption resistance | Medium | Medium | Training, clear documentation |
| Data leakage during transition | Low | Critical | Parallel run, monitoring |