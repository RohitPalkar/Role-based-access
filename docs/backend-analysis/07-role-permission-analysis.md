# Role & Permission Analysis

## Current Role System

### 20 Defined Roles (`src/enums/roles.enum.ts`)

| Enum Value | Display Name | Category | Portal Route |
|------------|--------------|----------|--------------|
| `SUPER_ADMIN` | Super Admin | Platform | `/super-admin/user` |
| `ADMIN` | Super User (BI Team) | Platform | `/admin/user` |
| `RM` | RM (Relationship Manager) | Sales | `/rm-panel/bookings` |
| `FINANCE_ADMIN` | Support Department Case User | Finance | `/finance-admin/employee-list` |
| `FINANCE_USER` | Finance User | Finance | - |
| `FINANCE_HEAD` | Finance Head | Finance | - |
| `SALES_TL` | Sales TL | Sales | `/sales-tl/bookings` |
| `SALES_RSH` | Sales RSH | Sales | `/sales-rsh/bookings` |
| `SALES_BH` | Sales BH | Sales | `/sales-bh-panel/eoi-records` |
| `CRM` | CRM | CRM | `/crm/dashboard` |
| `CRM_HEAD` | CRM Head | CRM | - |
| `CRM_TL` | CRM TL | CRM | - |
| `GRE` | GRE | Sales | `/gre/dashboard` |
| `MIS` | MIS | Analytics | `/mis/eoi-dashboard` |
| `CHANNEL_SALES` | Channel Sales | Sales | - |
| `PROJECT_HEAD` | Project Head | Sales | `/project-head/eoi-dashboard` |
| `LOYALTY` | Loyalty | Sales | - |
| `BIS` | BIS | Sales | `/bis/bookings` |

### Role Hierarchy (Implicit)

```
SUPER_ADMIN
    ├── ADMIN
    │     ├── SALES_BH
    │     │     ├── SALES_RSH
    │     │     │     ├── SALES_TL
    │     │     │     │     └── RM
    │     │     │     ├── CRM_TL
    │     │     │     │     └── CRM
    │     │     │     ├── PROJECT_HEAD
    │     │     │     ├── GRE
    │     │     │     ├── BIS
    │     │     │     ├── MIS
    │     │     │     ├── CHANNEL_SALES
    │     │     │     └── LOYALTY
    │     ├── FINANCE_HEAD
    │     │     ├── FINANCE_ADMIN
    │     │     └── FINANCE_USER
    │     └── CRM_HEAD
    └── (Platform only)
```

**Note**: Hierarchy is not enforced in code - it's only reflected in route access patterns.

---

## Current Authorization Implementation

### 1. Route-Level: `@Roles()` + `RolesGuard`

```typescript
// Decorator
@Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)

// Guard checks: user.role ∈ requiredRoles
```

**Applied on 30+ controller endpoints** across:
- `UserController` (12 endpoints)
- `BookingController` (via `OppAccessGuard`)
- `IncentiveController`
- `ProjectController`
- `NotificationController`

### 2. Resource-Level: `OppAccessGuard` (RM Only)

```typescript
// Checks Redis cache: user:opps:{email} → [oppIds]
// Validates: requested oppId ∈ user's opportunities
```

**Only protects RM booking endpoints** - not used for other roles/resources.

### 3. Service-Level: Ad-Hoc Checks

```typescript
// In UserService.validateTLAccess()
if (targetUser.role?.name !== RolesEnum.CRM) {
  throw new ForbiddenException('Target user must have CRM role');
}
if (targetUser.reportingTo !== tlUserId) {
  throw new ForbiddenException('You can only set availability for users in your team');
}
```

**Scattered across services** - no centralized policy.

### 4. Field-Level: None

- All fields returned based on role's endpoint access
- No column/field masking based on permissions
- `ResponseInterceptor` only omits audit fields (`createdAt`, etc.)

---

## Permission Gaps Analysis

### Missing Capabilities

| Capability | Current State | Gap |
|------------|---------------|-----|
| **Granular permissions** | Role-based only | No `booking:create`, `booking:read:own`, `user:update:profile` |
| **Resource ownership** | RM via OppAccessGuard | Not generalized |
| **Field-level security** | None | All fields visible if endpoint accessible |
| **Conditional access** | Hardcoded in services | No status-based, time-based, context-based policies |
| **Delegation/Impersonation** | None | TL cannot act as RM, no admin impersonation |
| **Permission inheritance** | Manual @Roles lists | No role hierarchy enforcement |
| **Dynamic policies** | None | Cannot configure without code deploy |
| **Audit trail for authZ** | Partial (activity log) | No decision logging (allow/deny with reason) |

### Over-Privileged Roles

| Role | Current Access | Should Be |
|------|---------------|-----------|
| `ADMIN` | All endpoints via @Roles lists | Platform admin only; delegate business ops |
| `SUPER_ADMIN` | Everything | Platform-only (infra, config, tenants) |
| `SALES_BH` | Most sales endpoints | Regional scope only |
| `FINANCE_ADMIN` | Employee list + finance | Finance ops only, no sales data |

### Under-Protected Resources

| Resource | Current Protection | Risk |
|----------|-------------------|------|
| **Booking payments** | RM: OppAccess; Others: @Roles | Finance can see all payment data |
| **User PII** | @Roles on user endpoints | CRM/TL can see contact info of non-team |
| **Incentive calculations** | @Roles on incentive module | Sales can see peer incentives |
| **Project master data** | @Roles on projects | All roles can modify pricing/gateways |
| **Email templates** | @Roles | Marketing content editable by many |

---

## JWT Token Claims (Current)

```json
{
  "sub": "user@domain.com",
  "dbId": 123,
  "name": "John Doe",
  "email": "john@domain.com",
  "role": "RM(Relationship Manager)"
}
```

**Missing**: permissions array, resource scopes, session metadata

---

## Database Schema (Current)

### `roles` Table
```sql
id, name, created_at, updated_at, deleted_at
```
- 20 rows, static
- No permission mapping

### `users` Table
```sql
role_id FK → roles.id
```
- Single role per user
- No direct permission overrides

### No Permission Tables
- ❌ `permissions`
- ❌ `role_permissions`
- ❌ `user_permissions`
- ❌ `resource_policies`

---

## Usage Patterns in Codebase

### Controllers Using `@Roles`

| Controller | Endpoints | Roles Used |
|------------|-----------|------------|
| `UserController` | 12 | SUPER_ADMIN, ADMIN, BIS, RM, CRM, MIS, SALES_* |
| `RolesController` | 3 | SUPER_ADMIN, ADMIN |
| `ProjectController` | 8 | ADMIN, SUPER_ADMIN, PROJECT_HEAD |
| `IncentiveController` | 15 | ADMIN, SUPER_ADMIN, FINANCE_*, SALES_* |
| `BookingController` | 5 | (via OppAccessGuard) |
| `NotificationController` | 4 | ADMIN, SUPER_ADMIN |
| `EoiCampaignController` | 10 | ADMIN, SUPER_ADMIN, MIS, PROJECT_HEAD |

### Services with Manual Checks

| Service | Method | Check Type |
|---------|--------|------------|
| `UserService` | `validateTLAccess` | Role + reporting line |
| `BookingService` | Multiple | Opportunity ownership |
| `IncentiveService` | `calculate` | Role-based formula selection |
| `IomService` | `editIom` | CRM role + project max brokerage |
| `SfdcService` | Multiple | User profile from SFDC |

---

## Comparison: Current vs Required

| Aspect | Current | Required for RBAC |
|--------|---------|-------------------|
| **Model** | Role-based (RBAC) | Attribute-based (ABAC) / Policy-based |
| **Granularity** | Endpoint-level | Resource + Action + Field |
| **Assignment** | User → Role | User → Role + Direct permissions |
| **Evaluation** | `user.role ∈ allowedRoles` | `policy.evaluate(user, resource, action, context)` |
| **Storage** | Enum in code | Database (dynamic) |
| **Inheritance** | None (manual lists) | Role hierarchy + permission sets |
| **Conditions** | Hardcoded in services | Policy expressions (CEL/OPA) |
| **Audit** | Activity log only | Decision log (allow/deny + policy) |

---

## Migration Readiness

### Ready for Enhancement
- ✅ `RolesGuard` pattern established
- ✅ `Reflector` for metadata
- ✅ JWT with role claim
- ✅ `RmAdminAuthGuard` for authentication
- ✅ Module structure supports new guards
- ✅ Event system for audit logging

### Needs Addition
- ❌ Permission registry
- ❌ Policy engine
- ❌ Resource identification utilities
- ❌ Field masking in serializers
- ❌ Admin UI for policy management
- ❌ Migration strategy for existing roles