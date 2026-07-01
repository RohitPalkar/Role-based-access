import { RolesEnum } from 'src/enums/roles.enum';

export interface FieldPermission {
  visible: boolean;
}

/**
 * Role-based field permissions for voucher data filtering
 * Based on the permission matrix provided by the business team
 */

// Define all possible fields in a single place
const ALL_FIELDS = [
  'id',
  'voucherId',
  'sfdcEnquiryId',
  'sfdcLeadStatus',
  'uniqueReferenceId',
  'paidVoucherId',
  'stdEoiId',
  'preEoiId',
  'customerName',
  'email',
  'countryCode',
  'mobile',
  'dob',
  'residentStatus',
  'occupation',
  'industry',
  'companyName',
  'designation',
  'annualIncome',
  'companyAddress',
  'campaignName',
  'primarySource',
  'cpName',
  'cpType',
  'referrerName',
  'typologyPreference',
  'unitPreference',
  'queueId',
  'sequenceNo',
  'voucherCount',
  'formStatus',
  'paymentStatus',
  'financeStatus',
  'chronology',
  'sourcingRm',
  'closingRm',
  'amountPayable',
  'amountPaid',
  'finalPaidDate',
  'checkerRemarks',
  'customerAddress',
  'pinCode',
  'createdAt',
  'transactionDetails',
  'financeRemarks',
  'rmUniqueId',
  'deletionReason',
  'restoreReason',
  'isDeleted',
  'chequeAlerts',
  'bookingStatus',
  'isPreFillBookingForm',
  'opportunityId',
  'isUnitMapped',
  'preferredUnit',
  'isChangeRequestPending',
  'campaign',
  'projectName',
  'unitNumber',
  'blockingId',
  'inventoryUnitId',
  'isLeadCreated',
  'hasBuddyRMPermission',
  'slotName',
  'slotDate',
  'slotStartTime',
  'cxStatus',
] as const;

/**
 * Helper function to create permission object by excluding specified fields from all fields
 * @param excludedFields - Array of field names that should be hidden (not visible)
 * @returns Permission object with all fields, where excluded fields are not visible
 */
function createPermissionsByExclusion(
  excludedFields: readonly string[],
): Record<string, FieldPermission> {
  const permissions: Record<string, FieldPermission> = {};
  const excludedSet = new Set(excludedFields);

  // Create permissions for all fields, excluding specified ones
  for (const field of ALL_FIELDS) {
    permissions[field] = { visible: !excludedSet.has(field) };
  }

  return permissions;
}

// Define role-specific field exclusions based on permission matrix
// Sales head - TL/RSH/BH: Exclude email and mobile
const SALES_HEAD_EXCLUDED = ['email', 'mobile', 'countryCode'] as const;

// Finance: Exclude email, mobile, and source/preference-related fields
const FINANCE_EXCLUDED = [
  'sfdcEnquiryId',
  'opportunityId',
  'sfdcLeadStatus',
  'stdEoiId',
  'isPreFillBookingForm',
  'preferredUnit',
  'preEoiId',
  'queueId',
  'sequenceNo',
  'email',
  'occupation',
  'industry',
  'companyName',
  'designation',
  'annualIncome',
  'companyAddress',
  'mobile',
  'dob',
  'primarySource',
  'cpName',
  'cpType',
  'referrerName',
  'projectName',
  'unitNumber',
  'unitPreference',
  'sourcingRm',
  'closingRm',
  'checkerRemarks',
  'customerAddress',
  'pinCode',
  'slotName',
  'slotDate',
  'slotStartTime',
  'cxStatus',
] as const;

const RM_EXCLUDED = ['sequenceNo', 'email', 'mobile', 'countryCode'] as const;

const CRM_EXCLUDED = [
  'email',
  'mobile',
  'countryCode',
  'occupation',
  'industry',
  'companyName',
  'designation',
  'annualIncome',
  'companyAddress',
  'dob',
  'customerAddress',
  'pinCode',
  'deletionReason',
  'restoreReason',
] as const;

const COMMON_EXCLUDED = [
  'countryCode',
  'residentStatus',
  'deletionReason',
  'restoreReason',
  'isDeleted',
];

const salesHeadPermissions = createPermissionsByExclusion(SALES_HEAD_EXCLUDED);

const financePermissions = createPermissionsByExclusion([
  ...FINANCE_EXCLUDED,
  ...COMMON_EXCLUDED,
]);
const crmPermissions = createPermissionsByExclusion(CRM_EXCLUDED);
const rmPermissions = createPermissionsByExclusion(RM_EXCLUDED);

const adminAccessPermissions = createPermissionsByExclusion([]); // COMMON_EXCLUDED fields are only included for Admin
const superAdminAccessPermissions = createPermissionsByExclusion([]); // COMMON_EXCLUDED fields are only included for Admin
const misAccessPermissions = createPermissionsByExclusion([]);
const bisAccessPermissions = createPermissionsByExclusion([]);
const bhAccessPermissions = createPermissionsByExclusion([
  'slotName',
  'slotDate',
  'slotStartTime',
  'cxStatus',
]);

// Role to permission mapping
const rolePermissions: Record<string, Record<string, FieldPermission>> = {
  [RolesEnum.SUPER_ADMIN]: superAdminAccessPermissions,
  [RolesEnum.ADMIN]: adminAccessPermissions,
  [RolesEnum.FINANCE_ADMIN]: financePermissions,
  [RolesEnum.MIS]: misAccessPermissions,
  [RolesEnum.SALES_TL]: salesHeadPermissions,
  [RolesEnum.SALES_RSH]: salesHeadPermissions,
  [RolesEnum.SALES_BH]: bhAccessPermissions,
  [RolesEnum.RM]: rmPermissions,
  [RolesEnum.PROJECT_HEAD]: salesHeadPermissions,
  [RolesEnum.CRM]: crmPermissions,
  [RolesEnum.BIS]: bisAccessPermissions,
};

/**
 * Batch filter multiple vouchers (optimized for listing pages)
 * @param vouchers - Array of voucher data objects
 * @param role - The user's role
 * @returns Array of filtered voucher data
 */
export function filterVoucherList(vouchers: any[], role: RolesEnum): any[] {
  if (vouchers.length === 0) return [];

  // Get role permissions once for all vouchers
  const permissions = rolePermissions[role];
  if (!permissions) {
    return []; // No permissions = no data
  }

  // Pre-compute visible fields to avoid repeated lookups
  const visibleFields = new Set<string>();
  for (const field in permissions) {
    if (permissions[field]?.visible) {
      visibleFields.add(field);
    }
  }

  // Filter all vouchers using pre-computed visible fields
  return vouchers.map((voucher) => {
    const filteredVoucher: any = {};

    for (const field in voucher) {
      if (voucher.hasOwnProperty(field) && visibleFields.has(field)) {
        filteredVoucher[field] = voucher[field];
      }
    }

    return filteredVoucher;
  });
}

/**
 * Check if a field is visible for a specific role
 * @param field - The field name
 * @param role - The user's role
 * @returns True if field is visible, false otherwise
 */
export function isFieldVisible(field: string, role: RolesEnum): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) {
    return false;
  }

  // Check for admin wildcard
  if (permissions['*']) {
    return true;
  }

  return permissions[field]?.visible || false;
}

/**
 * Create dynamic columns based on actual data fields
 * @param vouchers - Array of voucher data
 * @returns Array of column definitions for Excel export
 */

const fieldMapping: Record<string, string> = {
  uniqueReferenceId: 'Payment Reference ID',
  sfdcEnquiryId: 'SFDC Enquiry ID',
  sfdcLeadStatus: 'SFDC Lead Status',
  paidVoucherId: 'Voucher/EOI ID',
  stdEoiId: 'Standard EOI ID',
  preEoiId: 'Preferential EOI ID',
  isPreFillBookingForm: 'Prefill Booking Form',
  preferredUnit: 'Preferred Unit Details',
  customerName: 'Customer Name',
  email: 'Email',
  countryCode: 'Country Code',
  mobile: 'Mobile',
  dob: 'Date of Birth',
  residentStatus: 'Resident Status',
  occupation: 'Occupation',
  industry: 'Industry',
  companyName: 'Company Name',
  designation: 'Designation',
  annualIncome: 'Annual Income',
  companyAddress: 'Company Address',
  campaignName: 'Campaign Name',
  primarySource: 'Primary Source',
  cpName: 'CP Name',
  cpType: 'CP Type',
  referrerName: 'Referrer Name',
  projectName: 'Referrer Project name',
  unitNumber: 'Referrer Unit Number',
  formStatus: 'Form Status',
  paymentStatus: 'Payment Status',
  financeStatus: 'Finance Status',
  queueId: 'Cx Queue ID',
  sequenceNo: 'Sequence No',
  chronology: 'Chronology',
  typologyPreference: 'Typology Preference',
  unitPreference: 'Unit Preference',
  sourcingRm: 'Sourcing RM',
  closingRm: 'Closing RM',
  amountPayable: 'Amount Payable',
  amountPaid: 'Amount Paid',
  voucherCount: 'Voucher Count',
  finalPaidDate: 'Final Paid Date',
  createdAt: 'Created At',
  checkerRemarks: 'Checker Remarks',
  customerAddress: 'Customer Address',
  pinCode: 'Pin Code',
  deletionReason: 'Deletion Reason',
  restoreReason: 'Restore Reason',
  opportunityId: 'Opportunity ID',
  slotName: 'Batch No',
  slotDate: 'Batch Date',
  slotStartTime: 'Start Time',
  cxStatus: 'Cx Status',
};
export function createDynamicColumns(
  vouchers: any[],
): Array<{ header: string; key: string; width: number }> {
  if (vouchers.length === 0) return [];

  const allKeys = new Set<string>();

  vouchers.forEach((voucher) => {
    Object.keys(voucher).forEach((key) => {
      allKeys.add(key);
    });
  });
  const EXCEL_ORDER: string[] = [
    'uniqueReferenceId', // Payment Reference ID
    'paidVoucherId', // Voucher/EOI ID
    'sfdcEnquiryId',
    'sfdcLeadStatus',
    'customerName',
    'email',
    'countryCode',
    'mobile',
    'campaignName',
    'primarySource',
    'cpName',
    'cpType',
    'referrerName',
    'projectName', // Referrer Project name
    'unitNumber', // Referrer Unit Number
    'typologyPreference',
    'voucherCount',
    'formStatus',
    'paymentStatus',
    'financeStatus',
    'createdAt',
    'sourcingRm',
    'closingRm',
    'amountPayable',
    'amountPaid',
    'finalPaidDate',
    'chronology',
    'checkerRemarks',
    'opportunityId',
    'stdEoiId',
    'isPreFillBookingForm',
    'preferredUnit',
    'preEoiId',
    'queueId',
    'sequenceNo',
    'deletionReason',
    'restoreReason',
    'occupation',
    'industry',
    'companyName',
    'designation',
    'annualIncome',
    'companyAddress',
    'dob',
    'residentStatus',
    'customerAddress',
    'pinCode',
    'slotName',
    'slotDate',
    'slotStartTime',
    'cxStatus',
  ];

  const columns = EXCEL_ORDER.filter(
    (key) => fieldMapping[key] && allKeys.has(key),
  ).map((key) => ({
    header: fieldMapping[key],
    key,
    width: getColumnWidth(key),
  }));
  return columns;
}

/**
 * Get appropriate column width based on field type
 * @param fieldKey - The field key
 * @returns Column width
 */
export function getColumnWidth(fieldKey: string): number {
  const widthMap: Record<string, number> = {
    uniqueReferenceId: 22,
    sfdcEnquiryId: 22,
    sfdcLeadStatus: 22,
    paidVoucherId: 22,
    stdEoiId: 22,
    preEoiId: 22,
    isPreFillBookingForm: 22,
    preferredUnit: 22,
    customerName: 22,
    email: 22,
    countryCode: 15,
    mobile: 15,
    dob: 15,
    residentStatus: 15,
    occupation: 20,
    industry: 20,
    companyName: 25,
    designation: 20,
    annualIncome: 18,
    companyAddress: 20,
    campaignName: 22,
    primarySource: 22,
    cpName: 22,
    cpType: 22,
    referrerName: 22,
    projectName: 30,
    unitNumber: 30,
    formStatus: 22,
    paymentStatus: 22,
    financeStatus: 22,
    queueId: 15,
    sequenceNo: 15,
    chronology: 15,
    typologyPreference: 22,
    unitPreference: 22,
    sourcingRm: 22,
    closingRm: 22,
    amountPayable: 22,
    amountPaid: 22,
    voucherCount: 15,
    finalPaidDate: 22,
    createdAt: 22,
    checkerRemarks: 22,
    customerAddress: 60,
    pinCode: 15,
    deletionReason: 25,
    restoreReason: 28,
    slotName: 15,
    slotDate: 15,
    slotStartTime: 15,
    cxStatus: 15,
  };

  return widthMap[fieldKey] || 20; // Default width
}

// ==================== Dashboard Data Filtering ====================

/**
 * Role-based field permissions for dashboard data filtering
 * Based on the permission matrix for RM Dashboard API
 * Focuses on cards and campaigns only
 */

// Define all possible card fields
const ALL_CARD_FIELDS = [
  'totalCompaigns',
  'vouchersCollected',
  'totalAmountPayable',
  'amountCollected',
  'amountRefunded',
  'unitsRefunded',
] as const;

// Define all possible campaign fields
const ALL_CAMPAIGN_FIELDS = [
  'direct',
  'digital',
  'loyalty',
  'campaign',
  'campaignId',
  'purvaChampion',
  'channelpartner',
  'allotedIdCount',
  'pendingRMCount',
  'totalEoiAmount',
  'pendingCRMCount',
  'pendingFINCount',
  'pendingMISCount',
  'cancellationCount',
  'collectedEoiCount',
  'totalEoiAmountCollected',
] as const;

// Cache for "all visible" permission objects to avoid recreation
const allVisiblePermissionsCache = new Map<
  readonly string[],
  Record<string, FieldPermission>
>();

/**
 * Generic helper function to create permissions by excluding specified fields
 * Optimized with caching for empty exclusions (all visible scenario)
 * @param allFields - Array of all possible field names
 * @param excludedFields - Array of field names that should be hidden
 * @returns Permission object with all fields, where excluded fields are not visible
 */
function createPermissionsByExclusionGeneric(
  allFields: readonly string[],
  excludedFields: readonly string[] = [],
): Record<string, FieldPermission> {
  // Early return optimization: if no exclusions, use cached "all visible" permissions
  if (excludedFields.length === 0) {
    // Use allFields as cache key (arrays with same reference will reuse cache)
    // For different field sets, create once and cache
    let cachedPermissions = allVisiblePermissionsCache.get(allFields);
    if (!cachedPermissions) {
      cachedPermissions = {};
      for (const field of allFields) {
        cachedPermissions[field] = { visible: true };
      }
      allVisiblePermissionsCache.set(allFields, cachedPermissions);
    }
    return cachedPermissions;
  }

  // Only create Set and check exclusions if there are excluded fields
  const permissions: Record<string, FieldPermission> = {};
  const excludedSet = new Set(excludedFields);
  for (const field of allFields) {
    permissions[field] = { visible: !excludedSet.has(field) };
  }

  return permissions;
}

/**
 * Helper function to create dashboard permission object by excluding specified fields
 * @param excludedCardFields - Array of card field names that should be hidden
 * @param excludedCampaignFields - Array of campaign field names that should be hidden
 * @returns Permission object with all fields, where excluded fields are not visible
 */
function createDashboardPermissionsByExclusion(
  excludedCardFields: readonly string[] = [],
  excludedCampaignFields: readonly string[] = [],
): {
  cards: Record<string, FieldPermission>;
  campaigns: Record<string, FieldPermission>;
} {
  return {
    cards: createPermissionsByExclusionGeneric(
      ALL_CARD_FIELDS,
      excludedCardFields,
    ),
    campaigns: createPermissionsByExclusionGeneric(
      ALL_CAMPAIGN_FIELDS,
      excludedCampaignFields,
    ),
  };
}

// Define role-specific field exclusions for dashboard
// For now, all fields are visible to all roles (empty exclusions)
// This will be updated later based on business requirements

// RM Dashboard roles: RM, ADMIN, FINANCE_ADMIN, MIS, CRM
const DASHBOARD_RM_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_RM_CAMPAIGN_EXCLUDED: readonly string[] = [];

const DASHBOARD_ADMIN_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_ADMIN_CAMPAIGN_EXCLUDED: readonly string[] = [];

const DASHBOARD_FINANCE_ADMIN_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_FINANCE_ADMIN_CAMPAIGN_EXCLUDED: readonly string[] = [];

const DASHBOARD_MIS_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_MIS_CAMPAIGN_EXCLUDED: readonly string[] = [];

const DASHBOARD_CRM_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_CRM_CAMPAIGN_EXCLUDED: readonly string[] = [];

const DASHBOARD_TL_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_TL_CAMPAIGN_EXCLUDED: readonly string[] = [];

const DASHBOARD_PH_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_PH_CAMPAIGN_EXCLUDED: readonly string[] = [];

const DASHBOARD_RSH_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_RSH_CAMPAIGN_EXCLUDED: readonly string[] = [];

const DASHBOARD_BIS_CARD_EXCLUDED: readonly string[] = [];
const DASHBOARD_BIS_CAMPAIGN_EXCLUDED: readonly string[] = [];

// Generate dashboard permission objects using exclusion-based approach
const dashboardRolePermissions: Record<
  string,
  {
    cards: Record<string, FieldPermission>;
    campaigns: Record<string, FieldPermission>;
  }
> = {
  [RolesEnum.RM]: createDashboardPermissionsByExclusion(
    DASHBOARD_RM_CARD_EXCLUDED,
    DASHBOARD_RM_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.ADMIN]: createDashboardPermissionsByExclusion(
    DASHBOARD_ADMIN_CARD_EXCLUDED,
    DASHBOARD_ADMIN_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.SUPER_ADMIN]: createDashboardPermissionsByExclusion(
    DASHBOARD_ADMIN_CARD_EXCLUDED,
    DASHBOARD_ADMIN_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.FINANCE_ADMIN]: createDashboardPermissionsByExclusion(
    DASHBOARD_FINANCE_ADMIN_CARD_EXCLUDED,
    DASHBOARD_FINANCE_ADMIN_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.MIS]: createDashboardPermissionsByExclusion(
    DASHBOARD_MIS_CARD_EXCLUDED,
    DASHBOARD_MIS_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.CRM]: createDashboardPermissionsByExclusion(
    DASHBOARD_CRM_CARD_EXCLUDED,
    DASHBOARD_CRM_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.SALES_TL]: createDashboardPermissionsByExclusion(
    DASHBOARD_TL_CARD_EXCLUDED,
    DASHBOARD_TL_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.SALES_RSH]: createDashboardPermissionsByExclusion(
    DASHBOARD_RSH_CARD_EXCLUDED,
    DASHBOARD_RSH_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.PROJECT_HEAD]: createDashboardPermissionsByExclusion(
    DASHBOARD_PH_CARD_EXCLUDED,
    DASHBOARD_PH_CAMPAIGN_EXCLUDED,
  ),
  [RolesEnum.BIS]: createDashboardPermissionsByExclusion(
    DASHBOARD_BIS_CARD_EXCLUDED,
    DASHBOARD_BIS_CAMPAIGN_EXCLUDED,
  ),
};

/**
 * Pre-compute visible fields as a Set for faster lookups
 * @param permissions - Permission object mapping field names to FieldPermission
 * @returns Set of visible field names
 */
function getVisibleFields(
  permissions: Record<string, FieldPermission>,
): Set<string> {
  const visibleFields = new Set<string>();
  for (const field in permissions) {
    if (permissions[field]?.visible) {
      visibleFields.add(field);
    }
  }
  return visibleFields;
}

/**
 * Check if all fields are visible (no exclusions)
 * @param permissions - Permission object mapping field names to FieldPermission
 * @returns True if all fields are visible
 */
function areAllFieldsVisible(
  permissions: Record<string, FieldPermission>,
): boolean {
  for (const field in permissions) {
    if (!permissions[field]?.visible) {
      return false;
    }
  }
  return true;
}

/**
 * Generic helper function to filter an object based on permissions
 * Optimized version that uses pre-computed Sets and early returns
 * @param obj - Object to filter
 * @param permissions - Permission object mapping field names to FieldPermission
 * @returns Filtered object
 */
function filterObjectByPermissions(
  obj: any,
  permissions: Record<string, FieldPermission>,
): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  // Early return if all fields are visible (no filtering needed)
  if (areAllFieldsVisible(permissions)) {
    return obj;
  }

  // Pre-compute visible fields for faster lookups
  const visibleFields = getVisibleFields(permissions);

  // If no visible fields, return empty object
  if (visibleFields.size === 0) {
    return {};
  }

  const filtered: any = {};

  // Use Object.keys() iteration which is faster than for...in with hasOwnProperty
  for (const field of Object.keys(obj)) {
    if (visibleFields.has(field)) {
      filtered[field] = obj[field];
    }
  }

  return filtered;
}

/**
 * Filter dashboard data based on user role
 * Optimized version with early returns and minimal object copying
 * @param dashboardData - Dashboard data object
 * @param role - The user's role
 * @returns Filtered dashboard data
 */
export function filterDashboardData(dashboardData: any, role: RolesEnum): any {
  if (!dashboardData || typeof dashboardData !== 'object') {
    return dashboardData;
  }

  // Get role permissions
  const permissions = dashboardRolePermissions[role];
  if (!permissions) {
    // If role not found, return structure with empty cards and campaigns
    return {
      ...dashboardData,
      campaigns: [],
      cards: {},
    };
  }

  // Check if all fields are visible (early return optimization)
  const allCardsVisible = areAllFieldsVisible(permissions.cards);
  const allCampaignsVisible = areAllFieldsVisible(permissions.campaigns);

  // If all fields are visible, return original data without filtering
  if (allCardsVisible && allCampaignsVisible) {
    return dashboardData;
  }

  // Only create new object if filtering is needed
  const filteredData: any = {};

  // Copy top-level fields efficiently
  for (const key of Object.keys(dashboardData)) {
    if (key !== 'cards' && key !== 'campaigns') {
      filteredData[key] = dashboardData[key];
    }
  }

  // Filter cards object (or copy if all visible)
  if (dashboardData.cards) {
    filteredData.cards = allCardsVisible
      ? dashboardData.cards
      : filterObjectByPermissions(dashboardData.cards, permissions.cards);
  }

  // Filter campaigns array (or copy if all visible)
  if (Array.isArray(dashboardData.campaigns)) {
    if (allCampaignsVisible) {
      // All fields visible, no filtering needed
      filteredData.campaigns = dashboardData.campaigns;
    } else {
      // Need to filter each campaign
      filteredData.campaigns = dashboardData.campaigns.map((campaign: any) => {
        return filterObjectByPermissions(campaign, permissions.campaigns);
      });
    }
  }

  return filteredData;
}
