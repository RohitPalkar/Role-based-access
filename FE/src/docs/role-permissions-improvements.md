# Role-Based Permissions Improvements

## Problem: Data Duplication
Previously, columns and filters were duplicated in the permissions structure:

```typescript
// OLD - Redundant structure
interface UseRoleBasedPermissionsReturn {
  permissions: ModulePermissions;  // Contains columns, filters, actions
  columns: RoleColumn[];           // Duplicate of permissions.columns
  filters: RoleFilter[];           // Duplicate of permissions.filters
  actions: RoleAction[];           // Duplicate of permissions.actions
  // ...
}
```

## Solution: Single Source of Truth + Convenience Helpers

```typescript
// NEW - Clean structure
interface UseRoleBasedPermissionsReturn {
  permissions: ModulePermissions;  // Single source of truth
  
  // Direct access helpers for convenience (reference permissions.*)
  columns: RoleColumn[];           // = permissions.columns
  filters: RoleFilter[];           // = permissions.filters  
  actions: RoleAction[];           // = permissions.actions
  // ...
}
```

## Benefits

### 1. **Single Source of Truth**
- All role data is stored in `permissions` object
- No data duplication
- Consistent data access

### 2. **Backward Compatibility** 
- Components can still destructure: `const { columns, filters } = useRoleBasedPermissions(...)`
- No breaking changes to existing code

### 3. **Flexibility**
```typescript
// Both approaches work:

// Approach 1: Direct access (convenient)
const { columns, filters, canCreate,canExport } = useRoleBasedPermissions({ module: 'eoi' });

// Approach 2: Permissions object (explicit)
const { permissions } = useRoleBasedPermissions({ module: 'eoi' });
const columns = permissions.columns;
const filters = permissions.filters;
```

## Action Disable Conditions

### New Feature: Function-Based Disabled Property
```typescript
// Actions can now have dynamic disable conditions
{
  id: 'viewCustomer',
  label: 'View Customer Page',
  disabled: (row: any) => row.formStatus !== 'Submitted'
}
```

### Helper Functions
- `isActionDisabled(action, rowData)` - Handles both boolean and function disabled properties
- `getActionsWithDisabledState(role, module, rowData)` - Returns actions with resolved disabled states

### UI Integration
Updated MenuItem components to use `isActionDisabled(action, row)` instead of `action.disabled` for proper function evaluation.

## Performance Optimizations

1. **Memoization**: All computed values are memoized in the hook
2. **Single Calculation**: Permissions are calculated once and referenced multiple times
3. **Conditional Evaluation**: Disabled conditions are only evaluated when needed

## Usage Examples

```typescript
// EOI Table Component
const { columns, filters, canCreate,canExport, getRowActions } = useRoleBasedPermissions({ 
  module: 'eoi' 
});

// Dynamic row actions with disable conditions
const rowActions = getRowActions(rowData);
rowActions.forEach(action => {
  const isDisabled = isActionDisabled(action, rowData);
  // Use isDisabled in MenuItem
});
```

## Migration Guide

### No Changes Required
Existing components continue to work without modification due to backward compatibility.

### Recommended Updates
Replace direct `action.disabled` checks with `isActionDisabled(action, row)` for proper function support.

```typescript
// OLD
disabled={action.disabled}

// NEW  
disabled={isActionDisabled(action, row)}
```