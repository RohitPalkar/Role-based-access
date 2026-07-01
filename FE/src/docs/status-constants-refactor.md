# Status Constants Refactor - Comprehensive Improvements

## 🎯 Problem Addressed
Moving from hardcoded status strings to centralized status enums for better maintainability, type safety, and consistency.

## 📁 Files Modified

### 1. `/src/utils/constant.ts` - Status Enums Hub
```typescript
// NEW: Comprehensive status enums
export enum EOIFormStatus {
  CREATED = 'Created',
  IN_PROGRESS = 'In Progress', 
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'Under Review',
  CLAIMED = 'Claimed',
  EXPIRED = 'Expired',
  CANCEL_ACCEPTED = 'Cancel Initiated',
  CANCELLED = 'Cancelled',
  UPGRADING = 'Upgrading',
  UPGRADED = 'Upgraded',
  COMPLETED = 'Completed',
}

export enum EOIPaymentStatus {
  PENDING = 'Pending',
  PARTIALLY_PAID = 'Partially Paid',
  PAID = 'Paid',
  REFUNDED = 'Refunded',
}

export enum EOILeadStatus {
  QUALIFIED = 'Qualified',
  NEW = 'New',
  CONVERTED = 'Converted',
}

// Status color mapping for consistent UI
export const STATUS_COLORS = {
  FORM_STATUS: {
    [EOIFormStatus.CREATED]: 'info',
    [EOIFormStatus.IN_PROGRESS]: 'warning',
    [EOIFormStatus.SUBMITTED]: 'success',
    // ... all statuses mapped
  },
  PAYMENT_STATUS: { /* ... */ },
  LEAD_STATUS: { /* ... */ }
} as const;
```

### 2. `/src/config/role-based-permissions.ts` - Using Enums in Permissions
```typescript
// BEFORE: Hardcoded strings
disabled: (row: any) => row.formStatus !== 'Submitted'

// AFTER: Type-safe enums
import { EOIFormStatus, EOIPaymentStatus } from 'src/utils/constant';
disabled: (row: any) => row.formStatus !== EOIFormStatus.SUBMITTED
```

### 3. `/src/sections/.../expression-of-interest-table-view.tsx` - Status Color Mapping
```typescript
// BEFORE: Long switch statements with hardcoded strings
case 'formStatus': {
  switch (statusKey) {
    case 'created': return 'info';
    case 'in progress': return 'warning';
    case 'submitted': return 'success';
    // ... 20+ more cases
  }
}

// AFTER: Clean constant-based mapping
import { STATUS_COLORS, EOIFormStatus } from 'src/utils/constant';
const getStatusColor = (column: string, statusValue: string) => {
  switch (column) {
    case 'formStatus':
      return STATUS_COLORS.FORM_STATUS[statusValue as EOIFormStatus] || 'default';
    case 'paymentStatus':
      return STATUS_COLORS.PAYMENT_STATUS[statusValue as EOIPaymentStatus] || 'default';
    // ...
  }
};
```

## ✅ Benefits Achieved

### 1. **Type Safety & IntelliSense**
```typescript
// ✅ TypeScript will catch typos and provide autocomplete
row.formStatus !== EOIFormStatus.SUBMITTED

// ❌ No protection against typos
row.formStatus !== 'Submited'  // typo!
```

### 2. **Single Source of Truth**
- All status values defined once in `constant.ts`
- No duplication across files
- Easy to add/modify statuses globally

### 3. **Consistent Color Mapping**
- Status colors defined once, used everywhere
- No risk of different colors for same status
- Easy to update UI theme globally

### 4. **Better Maintainability**
```typescript
// Adding new status is simple:
export enum EOIFormStatus {
  // ... existing statuses
  PENDING_APPROVAL = 'Pending Approval',  // Add here
}

// Update color mapping:
FORM_STATUS: {
  // ... existing mappings  
  [EOIFormStatus.PENDING_APPROVAL]: 'warning',  // Add here
}
```

### 5. **Backward Compatibility**
```typescript
// Legacy aliases ensure no breaking changes
export const VoucherFormStatusEnum = EOIFormStatus;
export const PaymentProofStatusEnum = EOIPaymentStatus;
```

## 🔧 Code Quality Improvements

### Before vs After Comparison

#### Role-Based Permissions:
```typescript
// BEFORE: Magic strings
{
  id: 'viewCustomer',
  disabled: (row: any) => row.formStatus !== 'Submitted'
}

// AFTER: Type-safe constants  
{
  id: 'viewCustomer', 
  disabled: (row: any) => row.formStatus !== EOIFormStatus.SUBMITTED
}
```

#### Status Color Logic:
```typescript
// BEFORE: 50+ lines of nested switches
const getStatusColor = (column, statusKey) => {
  switch (column) {
    case 'formStatus': {
      switch (statusKey) {
        case 'created': return 'info';
        case 'in progress': return 'warning';
        // ... 15 more cases
      }
    }
    // ... more columns
  }
};

// AFTER: 5 lines with constant lookup
const getStatusColor = (column, statusValue) => {
  switch (column) {
    case 'formStatus': return STATUS_COLORS.FORM_STATUS[statusValue] || 'default';
    case 'paymentStatus': return STATUS_COLORS.PAYMENT_STATUS[statusValue] || 'default';
    case 'leadStatus': return STATUS_COLORS.LEAD_STATUS[statusValue] || 'default';
    default: return 'default';
  }
};
```

## 🚀 Usage Examples

### Using Status Enums in Components
```typescript
import { EOIFormStatus, EOIPaymentStatus } from 'src/utils/constant';

// Type-safe comparisons
if (row.formStatus === EOIFormStatus.SUBMITTED) {
  // Enable actions
}

// Type-safe filtering
const submittedRows = data.filter(row => 
  row.formStatus === EOIFormStatus.SUBMITTED
);
```

### Using Status Colors
```typescript
import { STATUS_COLORS } from 'src/utils/constant';

<Label 
  color={STATUS_COLORS.FORM_STATUS[row.formStatus] || 'default'}
  variant="soft"
>
  {row.formStatus}
</Label>
```

## 📈 Performance Impact
- **Positive**: Reduced code bundle size (less repeated strings)
- **Positive**: Faster lookups (direct object access vs switch statements)
- **Neutral**: No runtime performance difference in disable conditions

## 🎉 Summary
This refactor transforms status handling from error-prone string literals to a robust, type-safe constant system that's easier to maintain and extend. The changes maintain full backward compatibility while providing significant improvements in code quality and developer experience.