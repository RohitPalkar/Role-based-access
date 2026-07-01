# Role-Based Permissions System

## Overview

This system provides dynamic, role-based control over:
- **Table Columns**: Which columns are visible/hidden for each role
- **Filters**: Which filter options are available to each role
- **Actions**: Which actions can be performed on table rows
- **Permissions**: Create, Export, and View All capabilities

## Architecture

### 1. Configuration (`src/config/role-based-permissions.ts`)
- Defines permissions for each role
- Supports conditional actions based on row data
- Provides fallback permissions for unknown roles
- Type-safe configuration with TypeScript interfaces

### 2. Custom Hook (`src/hooks/use-role-based-permissions.ts`)
- Retrieves user role from Redux auth state
- Returns role-based permissions and helper functions
- Memoized for performance optimization
- Provides debugging information in development

### 3. Component Integration
- **Main Table Component**: Uses dynamic columns and permissions
- **Toolbar Component**: Shows role-appropriate filters and export buttons
- **Actions Menu**: Displays only allowed actions per role

## Configuration Structure

```typescript
{
  "Role Name": {
    "module": {
      "columns": [
        {
          "id": "column_id",
          "label": "Column Label", 
          "width": 150,
          "visible": true,
          "disableToggle": false
        }
      ],
      "filters": [
        {
          "id": "filter_id",
          "label": "Filter Label",
          "type": "select",
          "required": false
        }
      ],
      "actions": [
        {
          "id": "action_id",
          "label": "Action Label",
          "color": "primary",
          "condition": (row) => row.status === "active"
        }
      ],
      "canCreate": true,
      "canExport": true, 
      "canViewAll": true
    }
  }
}
```

## Supported Roles

### Super User (BI Team)
- **Access**: Full access to all columns, filters, and actions
- **Permissions**: Create ✓, Export ✓, View All ✓
- **Special**: Can cancel EOIs and edit customer forms

### RM (Relationship Manager)  
- **Access**: Limited columns (no mobile/email), basic filters
- **Permissions**: Create ✓, Export ✗, View All ✗
- **Actions**: Copy form links only

### CP (Channel Partner)
- **Access**: Basic columns only, minimal filters
- **Permissions**: Create ✗, Export ✗, View All ✗  
- **Actions**: Copy form links only

### Sales Manager
- **Access**: Most columns and filters, basic actions
- **Permissions**: Create ✓, Export ✓, View All ✓
- **Actions**: Copy links and edit EOI details

### Admin
- **Access**: Full access similar to Super User
- **Permissions**: Create ✓, Export ✓, View All ✓
- **Actions**: All actions including cancel and edit forms

## Usage Examples

### Basic Usage
```typescript
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

function MyComponent() {
  const { columns, actions, canCreate, userRole } = useRoleBasedPermissions({ 
    module: 'eoi' 
  });
  
  return (
    <div>
      {canCreate && <CreateButton />}
      {columns.map(col => col.visible && <Column key={col.id} {...col} />)}
    </div>
  );
}
```

### Check Single Permission
```typescript
import { useHasPermission } from 'src/hooks/use-role-based-permissions';

function ExportButton() {
  const canExport = useHasPermission('eoi', 'canExport');
  
  if (!canExport) return null;
  
  return <Button>Export</Button>;
}
```

### Get Row-Specific Actions
```typescript
const { getRowActions } = useRoleBasedPermissions({ module: 'eoi' });

function ActionMenu({ rowData }) {
  const availableActions = getRowActions(rowData);
  
  return (
    <Menu>
      {availableActions.map(action => (
        <MenuItem key={action.id}>{action.label}</MenuItem>
      ))}
    </Menu>
  );
}
```

## Key Features

### Conditional Actions
Actions can be conditionally shown based on row data:
```typescript
{
  id: "cancel",
  label: "Cancel EOI",
  condition: (row) => row.formStatus === 'Submitted'
}
```

### Null Safety
- Handles null/undefined roles gracefully
- Falls back to default permissions for unknown roles
- Provides development warnings for missing roles

### Performance Optimized
- Uses React.useMemo for expensive calculations
- Memoized permissions and actions
- Minimal re-renders when role changes

### Development Tools
- **RoleTester Component**: Temporarily set roles for testing
- **Debug Logging**: Console logs in development mode
- **Demo Component**: Visualize permissions for different roles

## Testing

### Development Mode
1. The system includes a `RoleTester` component for easy role switching
2. Debug information is logged to console
3. Validation warnings for missing configurations

### Role Testing
```typescript
// Test different roles
const testRoles = ['Super User (BI Team)', 'RM (Relationship Manager)'];

testRoles.forEach(role => {
  const permissions = getRoleBasedPermissions(role, 'eoi');
  console.log(`${role}:`, permissions);
});
```

## API Reference

### `useRoleBasedPermissions(props)`
Main hook for role-based permissions.

**Parameters:**
- `module: string` - Module name (e.g., 'eoi')
- `rowData?: any` - Optional row data for conditional actions

**Returns:**
- `columns: RoleColumn[]` - Allowed columns
- `filters: RoleFilter[]` - Allowed filters  
- `actions: RoleAction[]` - Allowed actions
- `canCreate: boolean` - Create permission
- `canExport: boolean` - Export permission
- `canViewAll: boolean` - View all permission
- `userRole: string | null` - Current user role
- `getRowActions: (row) => RoleAction[]` - Get actions for specific row

### `useHasPermission(module, permission)`
Check single permission.

### `useUserRole()`
Get current user role.

## Integration Notes

### Redux State Structure
The system looks for user role in the following order:
1. **Props**: Direct role passed via `userRole` prop
2. **Auth State**: `state.auth.user.role`
3. **User Details**: `state.userlist.userDetails.role` (from detail API)

### Getting Role from Detail API
If you get the role from a detail API, you can pass it directly:

```typescript
// Get role from your detail API response
const detailApiRole = useSelector(state => state.yourDetailApi.userRole);

const { columns, actions } = useRoleBasedPermissions({ 
  module: 'eoi', 
  userRole: detailApiRole 
});
```

### Module Names
- Use consistent module names across configuration
- Currently supports: 'eoi' (Expression of Interest)

### Adding New Roles
1. Add role configuration to `ROLE_BASED_PERMISSIONS`
2. Define columns, filters, actions, and permissions
3. Test with `RoleTester` component

### Adding New Modules
1. Extend configuration with new module
2. Update type definitions if needed
3. Implement module-specific logic in components

## Security Considerations

⚠️ **Important**: This system provides UI-level permission control only. 

- **Backend Validation**: Always validate permissions on the server side
- **API Security**: Ensure APIs check user roles before returning data
- **Data Filtering**: Server should filter data based on user permissions
- **Action Validation**: Server must validate actions before execution

This frontend system should complement, not replace, proper backend security measures.