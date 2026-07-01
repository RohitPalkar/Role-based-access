import { HttpStatus } from '@nestjs/common';
import { RolesEnum } from 'src/enums/roles.enum';

export const IST_TIME_ZONE = 'Asia/Kolkata';
export const LISTING_DATE_FORMAT = 'dd/MM/yyyy hh:mm a';

export const JWT_TTL = '6h';
export const R_JWT_TTL = '1d';
export const OPP_ACCESS_TTL = 60 * 60 * 1000; // 60 minutes in milliseconds
export const JWT_ALGORITHM = 'RS256';
export const OTP_EXPIRY_TTL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
export const OTP_CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
export const OTP_RESEND_TTL_MS = 60 * 1000; // 60 secs in milliseconds
export const OTP_MAX_RESEND_COUNT = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_REGEX = /^\d{6}$/;
export const ALLOWED_FOLDERS = []; //assets folder
export const AADHAAR_REGEX = /^\d{12}$/;
export const PAN_CARD_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
export const PHONE_REGEX = /^\d{7,15}$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const BRAND_PURAVANKARA = 'Puravankara';
export const BRAND_PURVA_LAND = 'Purva Land';
export const BRAND_PROVIDENT = 'Provident';
export const BRAND_PROVIDENT_LAND = 'Provident Land';
export const ENV_SECRET_KEY = 'iPRo8W11EzJWZrW88RTwh73If7fMBY5r4p';

// Channel Partner Constants
export const UPCOMING_ESTATES_NAME = 'Upcoming Estates';
export type BrandType =
  | typeof BRAND_PURAVANKARA
  | typeof BRAND_PURVA_LAND
  | typeof BRAND_PROVIDENT
  | typeof BRAND_PROVIDENT_LAND;
export const INDIAN_COUNTRY_CODE = '+91';
export const DATE_FORMAT = 'YYYY-MM-DD';

export const FY_START = '04-01';
export const FY_END = '03-31';

export const DISPLAY_DATE_FORMAT = 'DD/MM/YYYY';
export const DISPLAY_DATE_TIME_FORMAT = 'YYYY-MM-DD hh:mm A';
export const DISPLAY_DATE_TIME_FORMAT_FOR_FILE_NAME = 'YYYY-MM-DD_HH-mm-ss';
export const DISPLAY_YEAR_MONTH = 'yyyy-MM';
export const DISPLAY_YEAR_MONTH_DATE = 'YYYY-MM-DD';
export const DATE_FORMAT_DD_MMMM_YYYY = 'dd MMMM yyyy';
export const MONTH_DATE_YEAR = 'M/D/YYYY';
export const DATE_FORMAT_DD_MM_YYYY = 'DD-MM-YYYY';
export const DATE_FORMAT_DMY = 'DD_MM_YYYY';
export const MONTH_YEAR_FORMAT = 'MMM yyyy';
export const ONE_CRORE = 10_000_000;
export const ONE_LAKH = 1_00_000;
export const ONE_THOUSAND = 1_000;
export const GST_NUMBER_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

// Status code
export const TEMP_EXPIRED = HttpStatus.FORBIDDEN;
export const UNAUTHORIZE = HttpStatus.UNAUTHORIZED;
export const RESET_VALIDATION_FAILED = HttpStatus.PARTIAL_CONTENT;
export const MFA_SETUP_REQUIRED = HttpStatus.CONFLICT;
export const SUCCESS = HttpStatus.OK;
export const ACCEPTED = HttpStatus.ACCEPTED;
export const TOO_MANY_REQUESTS = HttpStatus.TOO_MANY_REQUESTS;
export const NOT_FOUND = HttpStatus.NOT_FOUND;
export const FORBIDDEN = HttpStatus.FORBIDDEN;

export const CRON_SCHEDULE_11PM_IST_530PM_UTC = '30 17 * * *';
export const CRON_SCHEDULE_1AM_LOCAL_7PM_UTC = '0 20 1 * *';
export const CRON_SCHEDULE_2AM_LOCAL_7PM_UTC = '0 21 1 * *';

export const DECIMAL_REGEX = /^(?:100(?:\.00)?|[1-9]?\d(?:\.\d{1,3})?)$/;

export const DATE_TIME_12H_FORMAT_REGEX =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;

export const DATE_LOCALE = 'en-IN';
export const FINANCIAL_YEAR_FORMAT = /^(\d{4})-(\d{4})$/;

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const SLAB_MULTIPLIER = 10000000;

export const COOKIE_CONFIG = {
  ACCESS_TOKEN_NAME: 'accessToken',
  REFRESH_TOKEN_NAME: 'refreshToken',
  SECURE: true,
  DOMAIN: '.puravankaraprojects.com',
  SAME_SITE: 'lax' as const, // TypeScript type safety
  MAX_AGE: 20 * 1000, // 20 seconds
  REFRESH_MAX_AGE: 20 * 1000, // 20 seconds
};
export const SSO_PROFILE = {
  NAME: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
  EMAIL: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  DISPLAY_NAME: 'http://schemas.microsoft.com/identity/claims/displayname',
  TENANT_ID: 'http://schemas.microsoft.com/identity/claims/tenantid',
};

export const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
};

export const LONG_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
};

export const DEPARTMENTS = {
  LOYALTY_SALES: 'LOYALTY SALES',
  SALES: 'SALES',
};

export const GROUPS = {
  NRI: 'NRI',
  GCC: 'GCC',
  CLOSING_RM: 'Closing RM',
  SOURCING_CP_RM: 'Sourcing CP RM',
  CP_RM_AOP: 'CP RM - AOP',
  LOYALTY_RM: 'Loyalty RM',
};

export const INDIAN_GROUPS = new Set([
  GROUPS.CLOSING_RM,
  GROUPS.SOURCING_CP_RM,
  GROUPS.CP_RM_AOP,
]);
export const NRI_CITIES = ['Dubai'];
export const RM_OPP_TTL = 1 * 24 * 60 * 60; // 1 day in seconds

export const EXCLUDED_BRANDS_FROM_SAP = ['propmart', 'streak'];

// Pagination
export const DEFAULT_LIMIT = 10;
export const DEFAULT_PAGE = 1;

export const UPLOAD_LIMIT = 10 * 1024 * 1024; // 10 MB limit
export const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

export const TEST_EXECUTION_TIME = 500;
// Voucher form verification timeout
export const VERIFICATION_TIMEOUT_MINUTES = 15; // 15 minutes timeout for verification

// Masking character to be used with mobile number and email id
export const MASKING_CHARACTER = '*';
export const MASKED_QUEUE_ID = '*****';

// Agreement E-Signature
export const EMPTY_SLOTS = 4;
export const PAYLOAD_SIZE_LIMIT = '5mb';
export const PINCODE_REGEX = /^\d{4,10}$/;

// Url endpoints
export const BOOKING_FORM_URL = 'booking-form';
export const REFERRAL_FORM_URL = 'referral-form';
export const VOUCHER_FORM_URL = 'voucher-form';
export const GROUP_LISTING_URL = 'group-listing';

// Cheque alert message
export const CHEQUE_DEPOSIT_SLIP_MISSING_MESSAGE =
  'Cheque deposit slip is missing';

export const ROLES_TO_DISPLAY = [
  RolesEnum.RM,
  RolesEnum.ADMIN,
  RolesEnum.FINANCE_ADMIN,
  RolesEnum.SALES_BH,
  RolesEnum.SALES_RSH,
  RolesEnum.SALES_TL,
  RolesEnum.MIS,
  RolesEnum.BIS,
  RolesEnum.CRM,
  RolesEnum.GRE,
  RolesEnum.PROJECT_HEAD,
  RolesEnum.LOYALTY,
  RolesEnum.CHANNEL_SALES,
];

export const SFDC_BATCH_SIZE = 50; // tune based on SFDC limits
export const SFDC_BATCH_DELAY_MS = 2000;
export const SFDC_MAX_RETRIES = 2;

export const ADULT_AGE = 18;

// KVN Group Logo
export const KVN_GROUP_LOGO_FILENAME = 'KVN_GROUP_WHITE.png';

export const AGREEMENT_PERCENT = 0.09;
export const GST_PERCENT = 0.05;

/** BullMQ queue name for PE-483 finance bulk transaction Excel processing. */
export const BULK_TRANSACTION_UPDATE_QUEUE = 'bulk-transaction-updates';
export const BULK_PAYOUT_UPDATE_QUEUE = 'bulk-payout-updates';

/** PE-483: worksheet name for finance transaction export/import; must match `buildTxExcelSheet` / `parseBulkTransactionsWorkbook`. */
export const BULK_TXN_WORKSHEET_NAME = 'Transactions';

export const RM_BUDDY_ALLOWED_ROLES = [
  RolesEnum.RM,
  RolesEnum.SALES_TL,
  RolesEnum.PROJECT_HEAD,
];

export const BATCH_NOTIFICATION_QUEUE = 'batch-notifications';

// PB-188 SFDC inbound webhook (`POST /api/sfdc/webhooks/lead-changes`)
/** Notification `type` used for the "new SFDC change request awaiting review" admin notification. */
export const SFDC_WEBHOOK_NOTIFICATION_TYPE = 'sfdc_voucher_change_request';

// HMAC-based webhook authentication headers. SFDC sends these on every
// inbound request and `SfdcWebhookSignatureGuard` validates them against
// the `integration_clients` table.
/** Public client identifier; looked up against `integration_clients.api_key`. */
export const SFDC_WEBHOOK_API_KEY_HEADER = 'x-api-key';
/** Unix epoch (seconds) when SFDC built the request; rejected if drift > 5 minutes. */
export const SFDC_WEBHOOK_TIMESTAMP_HEADER = 'x-timestamp';
/** Hex-encoded HMAC-SHA256(`timestamp + "." + rawBody`, clientSecret). */
export const SFDC_WEBHOOK_SIGNATURE_HEADER = 'x-signature';
/**
 * Maximum allowed clock drift between SFDC's `X-Timestamp` and the
 * server, in milliseconds. Requests outside this window are rejected as
 * replay candidates. Keep ≤ 5 minutes — longer windows materially
 * weaken replay protection.
 */
export const SFDC_WEBHOOK_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutes
