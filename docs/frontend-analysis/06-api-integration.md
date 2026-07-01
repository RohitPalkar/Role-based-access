# API Integration Analysis

## Overview

API communication is handled through a **centralized Axios instance** with request/response interceptors, typed HTTP method helpers, and route-level service modules organized by domain.

## Architecture

```
Components / Hooks / Sections
  └── Service Modules (src/services/*/)
      └── axiosInstance.ts (GET, POST, PUT, PATCH, DELETE)
          └── axiosInterceptors.ts (Axios instance)
              └── Axios (configured instance)
```

## Axios Instance

**File:** `src/services/axiosInterceptors.ts`

```typescript
const Axios = axios.create({
  baseURL: CONFIG.site.serverUrl,
  headers: { 'Content-Type': 'application/json' },
});
```

### Request Interceptor

```typescript
Axios.interceptors.request.use(async (config) => {
  // 1. Attach Bearer token from localStorage
  const token = localStorage.getItem(STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Encrypt payload (non-GET, non-FormData, non-ArrayBuffer)
  if (enableEncryption && hasBody && body && !(body instanceof FormData) && !(body instanceof ArrayBuffer)) {
    const encrypted = await encryptText(JSON.stringify(body));
    config.data = { payload: encrypted };
  }

  return config;
});
```

### Response Interceptor

```typescript
Axios.interceptors.response.use(
  async (response) => {
    // Decrypt { payload: "<encrypted>" } (root level)
    // Decrypt { response: { data: "<encrypted>" } } (nested)
    // Return decrypted data
  },
  async (error) => {
    // 401 → logoutUser() (except OTP endpoints)
    // Decrypt error payload if encrypted
    throw error;
  }
);
```

### Logout on 401

```typescript
function logoutUser() {
  localStorage.removeItem(STORAGE_KEY);
  delete Axios.defaults.headers.common.Authorization;
  if (!onAuthPage) {
    window.location.href = paths.auth.jwt.signIn;
  }
}
```

## Typed HTTP Helpers

**File:** `src/services/axiosInstance.ts`

| Helper | Method | Signature |
|--------|--------|-----------|
| `GET<T>(path, params?)` | GET | `(path: string, params?: string) => Promise<ApiResponse<T>>` |
| `POST<T>(path, payload?, headers?)` | POST | `(path, payload?: Record, headers?: Record) => Promise<ApiResponse<T>>` |
| `PUT<T>(path, payload, headers?)` | PUT | `(path, payload, headers?) => Promise<ApiResponse<T>>` |
| `PATCH<T>(path, payload)` | PATCH | `(path, payload) => Promise<ApiResponse<T>>` |
| `DELETE<T>(path, payload?, headers?)` | DELETE | `(path, payload?, headers?) => Promise<ApiResponse<T>>` |

All return `{ response: T; status: number }`.

## API Routes

**File:** `src/services/apiRoutes.ts`

Centralized endpoint constants (107+ routes):

| Category | Example Routes |
|----------|---------------|
| **Auth** | `LOGOUT`, `REFRESH_TOKEN_API`, `USERDETAIL`, `SEND_OTP`, `VERIFY_OTP`, `RESEND_OTP` |
| **Admin** | `INCENTIVE_STRUCTURE`, `GET_USER_LIST`, `BRANDS`, `CREATE_PROJECT`, `BOOSTER` |
| **Sales/Bookings** | `CREATE_BOOKING_API`, `GET_OPPORTUNITY_DETAILS`, `SALES_OPPORTUNITY_LIST`, `SALES_SUBMIT_PRE_BOOKING` |
| **EOI** | `EOI_LIST`, `CREATE_VOUCHER_EOI`, `UPDATE_VOUCHER_EOI`, `CANCEL_EOI`, `APPROVE_UNIT` |
| **Finance** | `LOG_HISTORY`, `SALARY_UPLOAD`, `EMPLOYEE_LIST`, `EXPORT_EOI_FINANCE_LIST` |
| **Batch** | `BATCH_MANAGER_LIST`, `BATCH_MANAGER_CREATE`, `BATCH_SLOTS_LIST`, `BATCH_VOUCHERS_LIST` |
| **CRM** | `AGREEMENT_LIST`, `AGREEMENT_DETAILS` |
| **IOM** | From `iomRoutes` |
| **GRE** | From `grePanelRoutes` |
| **Misc** | `UNIT_INVENTORY_DROPDOWNS`, `BANK_DETAILS_LIST`, `SFDC_LOGS_LIST` |

Routes are consolidated via spread operators:
```typescript
export const route = {
  LOGOUT: '/sso/logout',
  ...adminRoutes,
  ...eoiRoutes,
  ...grePanelRoutes,
  ...multiUnitRoutes,
  ...iomRoutes,
  // 40+ direct routes
};
```

## Service Modules

### Admin Services (`src/services/admin-services/`)

| File | Purpose |
|------|---------|
| `user-service.ts` | User CRUD |
| `project-service.ts` | Project CRUD |
| `brand-srvice.ts` | Brand CRUD |
| `phase-service.ts` | Phase CRUD |
| `booster-srvice.ts` | Booster policy CRUD |
| `incentive-srvice.ts` | Incentive structure CRUD |
| `reports-service.ts` | Reports (users, bookings, incentives) |
| `reports-user-services.ts` | Per-user report details |
| `notification-service.ts` | Notification CRUD |
| `common-services.ts` | Misc admin data |
| `eoi-dashboard-service.ts` | EOI dashboard data |
| `eoi-manager-services.ts` | EOI manager CRUD |
| `leader-board-rmSummary-service.ts` | RM summary leaderboard |
| `sdfc-logs-service.ts` | SFDC logs |

### RM Panel Services (`src/services/rm-panel/`)

| File | Purpose |
|------|---------|
| `eoi-service.ts` | EOI voucher CRUD |
| `eoi-finance-service.ts` | EOI finance transactions |
| `eoi-leaderboard-service.ts` | EOI leaderboard |
| `cp-listing-service.ts` | Channel partner listing |
| `unit-inventory-service.ts` | Unit inventory |
| `bank-details-service.tsx` | Bank details |
| `multi-unit-service.ts` | Multi-unit operations |

### Common Module Services (`src/services/common-module/`)

| File | Purpose |
|------|---------|
| `batch-manager-services.ts` | Batch campaign CRUD |
| `iom-management-service.ts` | IOM management |
| `iom-details-service.ts` | IOM details |

### Other Services

| File | Purpose |
|------|---------|
| `otp-service.ts` | OTP send/verify/resend |
| `unit-swapping-service.ts` | Unit swap operations |
| `adminRoutes.ts` | Admin endpoint constants (60+) |
| `EoiRoutes.ts` | EOI endpoint constants (71+) |
| `grePanelRoutes.ts` | GRE panel endpoints |
| `financeAdminRoutes.ts` | Finance admin endpoints |
| `crmroutes.ts` | CRM endpoints |
| `iomRoutes.ts` | IOM endpoints |
| `multiUnitRoutes.ts` | Multi-unit endpoints |

## Encryption

**File:** `src/utils/encryption.ts`

| Function | Purpose |
|----------|---------|
| `encryptText(text)` | AES encrypt payload |
| `decryptText(encrypted)` | AES decrypt payload |
| `maybeParseJSON(text)` | Safely parse decrypted JSON |
| `enableEncryption` | Config flag from env |

## Key Characteristics

1. **Encryption is optional** - Controlled by `enableEncryption` flag
2. **Centralized route constants** - All endpoints in one file with sub-module spread
3. **Per-domain service modules** - Logic grouped by business domain
4. **No interceptors for error handling** - Errors must be handled in calling code
5. **Hard redirect on 401** - Uses `window.location.href` (not React Router) for logout
6. **Token from localStorage** - Not from cookies (cookies used in auth provider, but interceptor reads localStorage)
