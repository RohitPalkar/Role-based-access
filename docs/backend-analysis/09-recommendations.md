# RBAC Integration Recommendations

## Recommended Architecture: Policy-Based Access Control (PBAC)

Move from **Role-Based (RBAC)** to **Policy-Based (PBAC)** with roles as permission bundles.

```
┌─────────────────────────────────────────────────────────────────┐
│                      POLICY ENGINE                               │
│  evaluate(user, resource, action, context) → Allow/Deny        │
└─────────────────────────────────────────────────────────────────┘
          ▲                    ▲                    ▲
          │                    │                    │
    ┌─────┴─────┐        ┌─────┴─────┐        ┌─────┴─────┐
    │  Roles    │        │ Direct    │        │  Context  │
    │ (bundles) │        │ Perms     │        │ (attrs)   │
    └───────────┘        └───────────┘        └───────────┘
```

---

## 1. Database Schema

### Core Tables

```sql
-- Permissions (atomic actions)
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,        -- 'booking:create', 'user:read:finance'
    resource VARCHAR(50) NOT NULL,            -- 'booking', 'user', 'project'
    action VARCHAR(50) NOT NULL,              -- 'create', 'read', 'update', 'delete'
    scope VARCHAR(20) DEFAULT 'own',          -- 'own', 'team', 'brand', 'all'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- User direct permissions (overrides)
CREATE TABLE user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    effect ENUM('allow', 'deny') DEFAULT 'allow',
    resource_id VARCHAR(50),                  -- Optional: specific resource
    expires_at TIMESTAMP NULL,
    granted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id),
    UNIQUE KEY unique_user_perm_resource (user_id, permission_id, resource_id)
);

-- Resource policies (ABAC rules)
CREATE TABLE resource_policies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    effect ENUM('allow', 'deny') DEFAULT 'allow',
    priority INT DEFAULT 0,
    conditions JSON NOT NULL,                 -- CEL expression or JSON logic
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Example policy: RM can update booking only in 'draft' status
INSERT INTO resource_policies (name, resource, action, effect, priority, conditions)
VALUES (
  'rm_booking_update_draft_only',
  'booking', 'update', 'allow', 10,
  '{"all": [{"==": [{"var": "user.role"}, "RM"]}, {"==": [{"var": "resource.status"}, "draft"]}]}'
);
```

### Indexes
```sql
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_resource_policies_resource_action ON resource_policies(resource, action);
CREATE INDEX idx_user_permissions_resource ON user_permissions(resource_id);
```

---

## 2. Permission Catalog (Initial)

### Booking Permissions
| Permission | Scope | Description |
|------------|-------|-------------|
| `booking:create` | own | Create new booking |
| `booking:read` | own | Read own bookings |
| `booking:read` | team | Read team bookings (TL/RSH) |
| `booking:read` | all | Read all (Admin/Finance) |
| `booking:update` | own | Update own (status-gated via policy) |
| `booking:update:payment` | own | Update payment details |
| `booking:delete` | own | Soft delete own |
| `booking:submit` | own | Submit for signature |
| `booking:sign` | own | E-signature |
| `booking:export` | team | Export team data |

### User Permissions
| Permission | Scope | Description |
|------------|-------|-------------|
| `user:create` | all | Create users (SUPER_ADMIN) |
| `user:read` | own | Read own profile |
| `user:read` | team | Read team (TL) |
| `user:read` | brand | Read brand users (Project Head) |
| `user:read` | all | Read all (Admin/HR) |
| `user:update` | own | Update own profile |
| `user:update:role` | all | Change roles (SUPER_ADMIN) |
| `user:update:finance` | all | Update salary/bank (Finance) |
| `user:assign:group` | team | Assign groups (CRM_TL) |
| `user:availability:manage` | team | Manage team availability (CRM_TL) |

### Project Permissions
| Permission | Scope | Description |
|------------|-------|-------------|
| `project:create` | all | Create projects (SUPER_ADMIN) |
| `project:read` | brand | Read brand projects |
| `project:update` | brand | Update brand projects (Project Head) |
| `project:update:pricing` | all | Update pricing (Finance + Project Head) |
| `project:assign:user` | brand | Assign users to project |

### Incentive Permissions
| Permission | Scope | Description |
|------------|-------|-------------|
| `incentive:read` | own | View own incentives |
| `incentive:read` | team | View team (TL/RSH) |
| `incentive:calculate` | all | Run calculations (Finance) |
| `incentive:override` | all | Manual overrides (Finance Head) |
| `incentive:payout:approve` | all | Approve payouts (Finance Head) |
| `incentive:payout:process` | all | Process payouts (Finance) |

### Finance Permissions
| Permission | Scope | Description |
|------------|-------|-------------|
| `payment:read` | own | View own payments (RM) |
| `payment:read` | all | View all (Finance) |
| `payment:process` | all | Process payments (Finance) |
| `payment:refund` | all | Refunds (Finance Head) |
| `payment:gateway:config` | all | Gateway config (SUPER_ADMIN) |

---

## 3. Implementation Components

### A. Permission Service (`src/modules/rbac/permission.service.ts`)

```typescript
@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private rpRepo: Repository<RolePermission>,
    @InjectRepository(UserPermission) private upRepo: Repository<UserPermission>,
    @InjectRepository(ResourcePolicy) private policyRepo: Repository<ResourcePolicy>,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  // Get all effective permissions for user
  async getUserPermissions(userId: number): Promise<Permission[]> {
    const cacheKey = `perms:user:${userId}`;
    const cached = await this.cache.get<Permission[]>(cacheKey);
    if (cached) return cached;

    // 1. Role permissions
    const user = await this.userRepo.findOne({ 
      where: { id: userId }, 
      relations: ['role', 'role.permissions', 'role.permissions.permission'] 
    });
    const rolePerms = user?.role?.permissions?.map(rp => rp.permission) ?? [];

    // 2. Direct user permissions (allow)
    const directAllows = await this.upRepo.find({
      where: { userId, effect: 'allow' },
      relations: ['permission']
    });

    // 3. Direct user permissions (deny) - highest priority
    const directDenies = await this.upRepo.find({
      where: { userId, effect: 'deny' },
      relations: ['permission']
    });

    // Merge with deny precedence
    const permissions = this.mergePermissions(rolePerms, directAllows, directDenies);
    
    await this.cache.set(cacheKey, permissions, 300000); // 5 min
    return permissions;
  }

  // Evaluate single permission
  async can(userId: number, permission: string, resource?: any): Promise<boolean> {
    const perms = await this.getUserPermissions(userId);
    const hasDirect = perms.some(p => p.name === permission);
    if (!hasDirect) return false;

    // Check resource policies
    return this.evaluatePolicies(userId, permission, resource);
  }

  // Bulk check for UI
  async canMany(userId: number, permissions: string[]): Promise<Record<string, boolean>> {
    const perms = await this.getUserPermissions(userId);
    return Object.fromEntries(
      permissions.map(p => [p, perms.some(perm => perm.name === p)])
    );
  }
}
```

### B. Authorization Guard (`src/modules/rbac/guards/permission.guard.ts`)

```typescript
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private permService: PermissionService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.dbId) throw new ForbiddenException('Unauthenticated');

    // Extract resource from request (params, body, query)
    const resource = this.extractResource(request);

    for (const perm of required) {
      const allowed = await this.permService.can(user.dbId, perm, resource);
      if (!allowed) {
        throw new ForbiddenException(`Missing permission: ${perm}`);
      }
    }
    return true;
  }

  private extractResource(req: any): any {
    return {
      id: req.params?.id || req.params?.oppId || req.body?.id,
      status: req.body?.status,
      projectId: req.body?.projectId || req.user?.projectId,
      brandId: req.body?.brandId || req.user?.brandId,
      ownerId: req.body?.userId || req.user?.dbId,
    };
  }
}
```

### C. Decorators (`src/modules/rbac/decorators/permissions.decorator.ts`)

```typescript
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

export const RequirePermission = (permission: string) => 
  SetMetadata('permissions', [permission]);

// Resource-aware decorator
export const RequireResourcePermission = (
  permission: string,
  resourceExtractor?: (req: any) => any
) => SetMetadata('resource:permission', { permission, resourceExtractor });
```

### D. Policy Evaluator (`src/modules/rbac/policy.evaluator.ts`)

```typescript
@Injectable()
export class PolicyEvaluator {
  constructor(
    @InjectRepository(ResourcePolicy) private policyRepo: Repository<ResourcePolicy>,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async evaluate(
    user: UserContext,
    resource: string,
    action: string,
    context: Record<string, any>
  ): Promise<boolean> {
    const policies = await this.getPolicies(resource, action);
    
    // Sort by priority (deny first, then allow by priority desc)
    const sorted = policies.sort((a, b) => {
      if (a.effect !== b.effect) return a.effect === 'deny' ? -1 : 1;
      return b.priority - a.priority;
    });

    for (const policy of sorted) {
      if (this.matchConditions(policy.conditions, user, context)) {
        return policy.effect === 'allow';
      }
    }
    return false; // Default deny
  }

  private matchConditions(conditions: any, user: any, context: any): boolean {
    // Use CEL (Common Expression Language) or simple JSON logic
    // Example: {"all": [{"==": [{"var": "user.role"}, "RM"]}, {"==": [{"var": "resource.status"}, "draft"]}]}
    return this.evaluateCEL(conditions, { user, resource: context });
  }
}
```

---

## 4. Integration Points

### JWT Enhancement
```typescript
// In SsoService.generateAuthToken()
const permissions = await this.permissionService.getUserPermissions(userId);
const permissionNames = permissions.map(p => p.name);

const payload = {
  sub: user.id,
  dbId: userId,
  name: user.name,
  email: user.email,
  role: user.role.name,
  permissions: permissionNames,  // Add to JWT
};
```

### Controller Migration Pattern
```typescript
// BEFORE
@Get()
@UseGuards(RmAdminAuthGuard, RolesGuard)
@Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
async getAllUser()

// AFTER
@Get()
@UseGuards(RmAdminAuthGuard, PermissionGuard)
@RequirePermissions('user:read:all')
async getAllUser()
```

### Service-Level Checks
```typescript
// In BookingService.updateBooking()
async updateBooking(userId: number, bookingId: string, data: UpdateBookingDto) {
  // Check permission + policy (status-gated)
  const allowed = await this.permService.can(userId, 'booking:update', { 
    id: bookingId, 
    status: existingBooking.status 
  });
  if (!allowed) throw new ForbiddenException('Cannot update booking in current status');
  // ...
}
```

---

## 5. Phase Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Create database migrations for permission tables
- [ ] Seed initial permissions (50+)
- [ ] Map current 20 roles → permission sets
- [ ] Build `PermissionService` with caching
- [ ] Add permissions to JWT payload
- [ ] Unit tests for permission resolution

### Phase 2: Guard & Decorators (Week 2-3)
- [ ] Implement `PermissionGuard`
- [ ] Create `@RequirePermissions` decorator
- [ ] Build `PolicyEvaluator` with CEL support
- [ ] Add resource extraction utilities
- [ ] Integration tests

### Phase 3: Controller Migration (Week 3-5)
- [ ] Migrate `UserController` (high confidence)
- [ ] Migrate `RolesController`, `ProjectController` (master data)
- [ ] Migrate `BookingController` with resource policies
- [ ] Migrate `IncentiveController`, `PaymentController`
- [ ] Migrate remaining controllers
- [ ] E2E test all endpoints

### Phase 4: Advanced Features (Week 5-6)
- [ ] Field-level serialization (`@ExposeFields` + permissions)
- [ ] Admin UI for permission management
- [ ] Delegation/impersonation API
- [ ] Audit logging for authZ decisions
- [ ] Performance optimization (policy caching)

### Phase 5: Cleanup (Week 6)
- [ ] Remove `RolesGuard` usage
- [ ] Deprecate `@Roles` decorator
- [ ] Remove `OppAccessGuard` (replace with policies)
- [ ] Documentation & training

---

## 6. Backward Compatibility

### Dual Guard Support
```typescript
// Temporary: support both @Roles and @RequirePermissions
@Injectable()
export class HybridAuthGuard implements CanActivate {
  constructor(
    private rolesGuard: RolesGuard,
    private permGuard: PermissionGuard,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(), context.getClass()
    ]);
    const perms = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(), context.getClass()
    ]);

    if (roles?.length) return this.rolesGuard.canActivate(context);
    if (perms?.length) return this.permGuard.canActivate(context);
    return true;
  }
}
```

### Feature Flag
```typescript
// config/rbac.config.ts
export const RBAC_CONFIG = {
  enabled: process.env.RBAC_ENABLED === 'true',
  legacyRoles: process.env.RBAC_LEGACY_ROLES !== 'false',
  policyEngine: 'cel', // or 'json-logic'
};
```

---

## 7. Testing Strategy

### Unit Tests
- `PermissionService.getUserPermissions()` - role perms, direct perms, deny precedence
- `PolicyEvaluator.evaluate()` - CEL expressions, priority ordering
- `PermissionGuard.canActivate()` - various resource extraction scenarios

### Integration Tests
- Full request flow: JWT → Guard → Service → Policy
- Role migration: existing users get correct permissions
- Cache invalidation on permission changes

### E2E Scenarios
```gherkin
Scenario: RM cannot update submitted booking
  Given user has RM role
  And booking status is "submitted"
  When RM calls PATCH /bookings/update-payment-details
  Then response is 403 Forbidden

Scenario: TL can read team bookings
  Given user has SALES_TL role
  And team member has booking
  When TL calls GET /bookings/get-booking/:oppId
  Then response is 200 with booking data
```

---

## 8. Monitoring & Observability

### Metrics to Track
```typescript
// In PermissionGuard
Metrics.increment('rbac.check.total', { result: allowed ? 'allow' : 'deny' });
Metrics.histogram('rbac.check.duration', duration);
Metrics.increment('rbac.policy.evaluated', { policy: policyName });
```

### Alerting
- Deny rate spike (>50% in 5min)
- Policy evaluation latency >100ms
- Cache miss rate >20%

### Audit Log Enhancement
```typescript
// In PermissionGuard
await this.auditService.log({
  userId: user.dbId,
  action: 'authorization_check',
  resource: requiredPermissions.join(','),
  result: allowed ? 'allow' : 'deny',
  policies: evaluatedPolicies,
  context: resourceContext,
});
```

---

## 9. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing API consumers | High | High | Dual guard, feature flag, phased rollout |
| Performance regression | Medium | High | Redis caching, policy indexing, async evaluation |
| Policy complexity explosion | Medium | Medium | Policy review process, versioning, testing |
| Permission drift (code vs DB) | Medium | Medium | Sync script, CI validation, audit job |
| Team adoption resistance | Medium | Medium | Training, clear docs, gradual migration |

---

## 10. Estimated Effort Summary

| Component | Effort (Days) |
|-----------|---------------|
| Database & Migrations | 3 |
| Core RBAC Engine | 5 |
| Guards & Decorators | 3 |
| Policy Evaluator (CEL) | 4 |
| Controller Migration (30+) | 15 |
| Service Integration | 8 |
| Admin UI | 5 |
| Testing (Unit + Int + E2E) | 10 |
| Documentation & Rollout | 3 |
| **Total** | **~56 days** |

---

## 11. Quick Wins (Can Start Immediately)

1. **Add permissions to JWT** - No breaking changes, enables future guards
2. **Create permission tables** - Additive migration
3. **Map current roles to permissions** - Documentation exercise
4. **Build PermissionService** - Core utility, no endpoint changes
5. **Add `@RequirePermissions` alongside `@Roles`** - Dual decorator pattern

---

## 12. Recommended Tech Choices

| Component | Recommendation | Rationale |
|-----------|----------------|-----------|
| Policy Language | **CEL (Common Expression Language)** | Google-standard, fast, type-safe, used in Kubernetes/Knative |
| Cache | **Redis (existing)** | Already in stack, 5-min TTL for permissions |
| Evaluation | **Sync in guard** | Low latency (<5ms), cache hits |
| Admin UI | **Separate admin module** | NestJS module, Role: SUPER_ADMIN only |
| Migration Tool | **TypeORM migrations** | Consistent with existing |

---

## 13. File Structure for New RBAC Module

```
src/modules/rbac/
├── rbac.module.ts
├── permission.service.ts
├── policy.evaluator.ts
├── guards/
│   ├── permission.guard.ts
│   └── resource-owner.guard.ts
├── decorators/
│   ├── permissions.decorator.ts
│   └── resource-permission.decorator.ts
├── entities/
│   ├── permission.entity.ts
│   ├── role-permission.entity.ts
│   ├── user-permission.entity.ts
│   └── resource-policy.entity.ts
├── dto/
│   ├── create-permission.dto.ts
│   ├── assign-role-permissions.dto.ts
│   └── resource-policy.dto.ts
├── interfaces/
│   └── policy-context.interface.ts
└── rbac.controller.ts (admin UI endpoints)
```

---

## 14. Next Steps

1. **Review & Approve** this recommendation with stakeholders
2. **Create spike** for CEL policy evaluator integration
3. **Design permission catalog** with business owners
4. **Plan Phase 1 sprint** (2 weeks)
5. **Set up feature flags** in config
6. **Communicate timeline** to frontend teams (JWT changes)