import successIcon from "../assets/icons/successCircle.svg";
import pendingIcon from "../assets/icons/pendingCircle.svg";
import rejectedIcon from "../assets/icons/rejectedCircle.svg";

export const COMPARE_VALUE = {
  Spouse: 'Z10',
  Puravankara: 'Puravankara',
  Provident: 'Provident',
  PurvaLand: 'Purva Land',
};
export const PRIMARY_SOURCE = {
  PurvaPrivilege: 'Purva Privilege',
  PrivilegeNRI: 'Purva Privilege-NRI',
  ProvidentPremiere: 'Provident Premier',
  PurvaChampion: 'Purva Champion',
  DigitalMarketing: 'Digital Marketing',
  ChannelPartner: 'Channel Partner',
  ReferralAtVoucherEoi: 'Referral at Voucher/EOI',
};

export const SECONDARY_SOURCE = {
  Loyalty: 'Loyalty',
  Referral: 'Referral',
  referralOthers:'Referral Others'
}

export enum TYPE {
  Risk = 'risk',
  Paid_YTD = 'paid_ytd',
  Payable = 'payable',
  Paid = 'paid',
}

export enum ROLES {
  SuperAdmin = 'Super Admin',
  Admin = 'Super User (BI Team)',
  RM = 'RM(Relationship Manager)',
  FinanceAdmin = 'Support Department Case User',
  SALES_TL = 'Sales TL',
  SALES_RSH = 'Sales RSH',
  SALES_BH = 'Sales BH',
  CRM = 'CRM',
  LOYALTY_TEAM = 'Pre Sales Team',
  PRE_SALES_HEAD = "Pre Sales Admin",
  GRE = 'GRE',
  MIS = 'MIS',
  CHANNEL_SALES = 'Channel Sales',  
  PROJECT_HEAD = 'Project Head',
  BIS = 'BIS',
  CRM_TL = 'CRM TL',
  CRM_HEAD = 'CRM Head',
  FINANCE_USER = 'Finance User',
  FINANCE_HEAD = 'Finance Head',
  LOYALTY = 'Loyalty',
}
export const toaster_messages = {
  success: 'success',
  errorMessage: 'Something went wrong! Please try again',
};
export const BOOKING_FORM_STATUS = {
  // NOT_SENT: 'Form not Sent',
  // SENT: 'Form Sent',
  IN_PROGRESS: 'Form filling in progress',
  NOT_SIGNED: 'Form Filled, not signed',
  PARTIALLY_SIGNED: 'Partially signed',
  FILLING_BY_RM: 'Form filling started by RM',
  SIGNED_DIGITALLY: 'Signed - Digitally',
  SIGNED_OFFLINE: 'Signed offline',
  SIGNED_RM_UPLOAD: 'Signed - RM Uploaded Offline Docs',
  SIGNED_OFFICE_USE: 'Signed - Office Use Updated',
  PRE_BOOKING_UPLOADED: 'Pre-booking Docs Added',
  NEW: 'New',
};

// --->> User Edit Form  <<----

export enum EMPLOYMENT_STATUS {
  Notice_Period = 'Notice Period',
  Resigned = 'Resigned',
  AVAILABLE = 'Available',
}

export const employmentStatusOptions = [
  {
    value: 'Available',
    label: 'Available',
  },
  {
    value: 'Notice Period',
    label: 'Notice Period',
  },
  {
    value: 'Resigned',
    label: 'Resigned',
  },
];

// --->> User Edit Form  <<----

export const PROJECT_TYPE_FLAG = {
  LAUNCH: 'Launch',
  SUSTENANCE: 'Sustenance',
  MIXED: 'Mixed',
};

export const VOUCHER_UNIT_PREFERENCE_OPTIONS = [
  // {
  //   value: "1 BHK",
  //   name: "1 BHK"
  // },
  // {
  //   value: "2 BHK",
  //   name: "2 BHK"
  // },
  {
    value: "3 BHK",
    name: "3 BHK"
  },
  {
    value: "4 BHK",
    name: "4 BHK"
  },
  // {
  //   value: "Plots",
  //   name: "Plots"
  // },
  // {
  //   value: "To be decided",
  //   name: "I will decide later"
  // },
]

export const EOI_UNIT_PREFERENCE_OPTIONS = [
  {
    value: "Town House Plot",
    name: "Town House Plot (Up to 1000 Sq.ft)"
  },
  {
    value: "Villa Plot",
    name: "Villa Plot (1001 Sq.ft. to 1350 Sq.ft.)"
  },
  {
    value: "Bungalow Plot",
    name: "Bungalow Plot (1351 Sq.ft. to 1650 Sq.ft.)"
  },
  {
    value: "Mansion Plot",
    name: "Mansion Plot (1651 Sq.ft. to 2200 Sq.ft.)"
  },
  {
    value: "Estate Plot",
    name: "Estate Plot (Above 2200 Sq.ft.)"
  },
]

// EOI / Voucher Status Enums - Comprehensive Status System
export enum EOIFormStatus {
  CREATED = '1-Form Link Shared',
  IN_PROGRESS = '2-Form fill in progress',
  UNVERIFIED = '3-Form Submitted',
  MIS_VERIFIED = '4-MIS Verified',
  MIS_REQUESTED_CHANGES = '5-MIS-Resubmission requested',
  MIS_UPDATED = '6-Updated as per MIS',
  CRM_VERIFIED = '7-CRM Verified',
  CRM_REQUESTED_CHANGES = '8-CRM-Resubmission requested',
  CRM_UPDATED = '9-Updated as per CRM',
  ACTIVE = '10-Active',
  UPGRADING = '11-Upgrade in progress',
  UPGRADED = '12-Upgraded',
  CONVERTED = '13-Converted',
  CANCELLED_NOT_REALISED = '14-Cancelled – Not realised',
  CANCEL_REQUESTED = '15-Cancellation Requested by RM',
  CANCEL_ACCEPTED = '16-Cancellation Request Accepted',
  CANCEL_APPROVED = '17-Cancellation – In Progress by CRM',
  REFUND_INITIATED = '18-Refund Initiated',
  CANCELLED = '19-Cancellation – Complete & Refunded',
};

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

export enum EOIFinanceStatus {
  UNVERIFIED = 'Pending Reco',
  VERIFIED = 'Realized',
  REJECTED = 'Rejected',
  REFUNDED = 'Refunded',
  REVERSED = 'Not Realized',
}
  export enum deleteRestoreActionEnumStatus  {
  DELETE = 'Deleted',
  RESTORE = 'Restored',
  }

  export enum deleteActionEnumStatus {
    DELETE = 'Deleted',
  }
  export enum FormFilledStatusEnum {
  FORM_SUBMISSION_PENDING = 'Form Submission Pending',
  GRE_FIELDS_PENDING = 'GRE Fields Pending',
  GRE_FIELDS_UPDATED = 'GRE fields Updated',
  RM_FIELDS_PENDING = 'RM Fields Pending',
  RM_FIELDS_UPDATED = 'RM fields Updated',
}
export enum SfdcLeadStatusEnum {
  SITE_VISIT_HAPPENED = 'Site Visit Happened',
  VIDEO_CALL_DONE = 'Video Call Done'
}

export enum SourceChangeStatus {
  REQUESTED = 'Requested',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum SfdcLogStatus {
  SUCCESS = 'success',
  SKIPPED = 'skipped',
  ERROR ='error'
}

export enum UnitBlockingStatus {
  // BLOCKED = 'Blocked',
  PENDING = 'Pending Approval',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  EXPIRED = 'Approval Window Expired',
  // RELEASED = 'Released',
  QUALIFIED = 'Qualified Post Request',
}

export enum SlotStatusEnum {
  LOCKED = 'Locked',
  ACTIVE = 'Active',
  OPEN = 'Open',
  COMPLETED = 'Completed',
  ELAPSED = 'Elapsed',
}

export enum BatchVoucherStatus {
  MAPPED = 'Mapped',
  INVITED = 'Invited',
  ATTENDED = 'Attended',
  AGREEMENT_SIGNED = 'Agreement Signed',
  BOOKED = 'Booked',
}

// Legacy aliases for backward compatibility
export const VoucherFormStatusEnum = EOIFormStatus;
export const PaymentProofStatusEnum = EOIPaymentStatus;
export const FinanceStatusEnum = EOIFinanceStatus;
export const VoucherLeadStatus = EOILeadStatus;
export const deletionStatus = deleteActionEnumStatus;
export type LabelColor = 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

// Status color mapping for UI consistency
export const STATUS_COLORS:{
  FORM_STATUS: Record<EOIFormStatus, LabelColor>;
  PAYMENT_STATUS: Record<EOIPaymentStatus, LabelColor>;
  LEAD_STATUS: Record<EOILeadStatus, LabelColor>;
  FINANCE_STATUS: Record<EOIFinanceStatus, LabelColor>;
  GRE_FORM_STATUS: Record<FormFilledStatusEnum, LabelColor>;
  SFDC_LEAD_STATUS: Record<SfdcLeadStatusEnum, LabelColor>;
  SOURCE_VIEW_STATUS: Record<SourceChangeStatus, LabelColor>;
  SFDC_LOG_STATUS: Record<SfdcLogStatus, LabelColor>;
  /** Batch Manager preview — ID type column (same Label tokens as EOI status). */
  BATCH_ID_TYPE: Record<string, LabelColor>;
  UNIT_BLOCKING_STATUS: Record<UnitBlockingStatus, LabelColor>;
  SLOT_STATUS: Record<SlotStatusEnum, LabelColor>;
  CX_STATUS: Record<BatchVoucherStatus, LabelColor>;
}  = {
  // Form Status Colors
  FORM_STATUS: {
    [EOIFormStatus.CREATED]: 'info',
    [EOIFormStatus.IN_PROGRESS]: 'warning', 
    [EOIFormStatus.UNVERIFIED]: 'warning',
    [EOIFormStatus.MIS_VERIFIED]: 'success',
    [EOIFormStatus.MIS_REQUESTED_CHANGES]: 'warning',
    [EOIFormStatus.MIS_UPDATED]: 'success',
    [EOIFormStatus.CRM_VERIFIED]: 'success',
    [EOIFormStatus.CRM_REQUESTED_CHANGES]: 'warning',
    [EOIFormStatus.CRM_UPDATED]: 'success',
    [EOIFormStatus.CANCEL_REQUESTED]: 'warning',
    [EOIFormStatus.CANCEL_ACCEPTED]: 'warning',
    [EOIFormStatus.CANCEL_APPROVED]: 'info',
    [EOIFormStatus.REFUND_INITIATED]: 'success',
    [EOIFormStatus.CANCELLED]: 'error',
    [EOIFormStatus.UPGRADING]: 'info',
    [EOIFormStatus.UPGRADED]: 'success',
    [EOIFormStatus.ACTIVE]: 'success',
    [EOIFormStatus.CONVERTED]: 'success',
    [EOIFormStatus.CANCELLED_NOT_REALISED]: 'error',
  },
  // Payment Status Colors
  PAYMENT_STATUS: {
    [EOIPaymentStatus.PENDING]: 'warning',
    [EOIPaymentStatus.PARTIALLY_PAID]: 'info',
    [EOIPaymentStatus.PAID]: 'success',
    [EOIPaymentStatus.REFUNDED]: 'error',
  },
  // Lead Status Colors
  LEAD_STATUS: {
    [EOILeadStatus.QUALIFIED]: 'success',
    [EOILeadStatus.NEW]: 'info',
    [EOILeadStatus.CONVERTED]: 'primary',
  },
  // Finance Status Colors
  FINANCE_STATUS: {
     [EOIFinanceStatus.UNVERIFIED]: 'warning',
     [EOIFinanceStatus.VERIFIED]: 'success',
     [EOIFinanceStatus.REJECTED]: 'error',
     [EOIFinanceStatus.REFUNDED]: 'error',
     [EOIFinanceStatus.REVERSED]: 'error', 
},
  GRE_FORM_STATUS: {
    [FormFilledStatusEnum.FORM_SUBMISSION_PENDING]: 'warning',
    [FormFilledStatusEnum.GRE_FIELDS_PENDING]: 'warning',
    [FormFilledStatusEnum.GRE_FIELDS_UPDATED]: 'success',
    [FormFilledStatusEnum.RM_FIELDS_PENDING]: 'warning',
    [FormFilledStatusEnum.RM_FIELDS_UPDATED]: 'success',
  },
  SFDC_LEAD_STATUS: {
    [SfdcLeadStatusEnum.VIDEO_CALL_DONE]: 'info',
    [SfdcLeadStatusEnum.SITE_VISIT_HAPPENED]: 'success',
  },
  SOURCE_VIEW_STATUS: {
    [SourceChangeStatus.REQUESTED]: 'warning',
    [SourceChangeStatus.APPROVED]: 'success',
    [SourceChangeStatus.REJECTED]: 'error',
  },
  SFDC_LOG_STATUS: {
    [SfdcLogStatus.SUCCESS]: 'success',
    [SfdcLogStatus.SKIPPED]: 'error',
    [SfdcLogStatus.ERROR]:'error'
  },
  BATCH_ID_TYPE: {
    Preferential: 'primary',
    Standard: 'info',
    Voucher: 'success',
  },
  UNIT_BLOCKING_STATUS: {
    [UnitBlockingStatus.APPROVED]: 'success',
    [UnitBlockingStatus.PENDING]: 'warning',
    [UnitBlockingStatus.REJECTED]: 'error',
    [UnitBlockingStatus.EXPIRED]: 'default',
    [UnitBlockingStatus.QUALIFIED]: 'info',
    // [UnitBlockingStatus.RELEASED]: 'primary',
  },
  SLOT_STATUS: {
    [SlotStatusEnum.LOCKED]: 'warning',
    [SlotStatusEnum.ACTIVE]: 'success',
    [SlotStatusEnum.OPEN]: 'info',
    [SlotStatusEnum.COMPLETED]: 'success',
    [SlotStatusEnum.ELAPSED]: 'secondary',
  },
  CX_STATUS: {
    [BatchVoucherStatus.BOOKED]: 'success',
    [BatchVoucherStatus.ATTENDED]: 'info',
    [BatchVoucherStatus.INVITED]: 'secondary',
    [BatchVoucherStatus.AGREEMENT_SIGNED]: 'warning',
    [BatchVoucherStatus.MAPPED]: 'default',
  },
}
export const SHOW_REFERRER_OPTIONS = [PRIMARY_SOURCE.PurvaPrivilege, PRIMARY_SOURCE.ProvidentPremiere];
export const SHOW_REFERRAL_AT_EOI_OPTIONS = [PRIMARY_SOURCE.ReferralAtVoucherEoi];

export const REFERRER_RADIO_OPTIONS = {
  BUYING_FOR_SELF: 'buyingForSelf',
  REFERRED_BY_CUSTOMER: 'referredByCustomer',
  REFERRAL_OTHERS: 'referralOthers',
}

// Upcoming Estates
export const isUpcomingEstates = (value?: string): boolean => {
  if (!value) return false;
  return value.trim().toLowerCase() === "upcoming estates" || value.trim().toLowerCase() === "upcoming estate";
};

  // Dynamic route generation based on user role
export  const generateRoleBasedRoute = (userRole: string | null,basePath: string, id?: string) => {
    const rolePanelMap: Record<string, string> = {
      [ROLES.SuperAdmin]: 'super-admin',
      [ROLES.Admin]: 'admin',
      [ROLES.RM]: 'rm-panel',
      [ROLES.FinanceAdmin]: 'finance-admin',
      [ROLES.SALES_TL]: 'sales-tl',
      [ROLES.SALES_RSH]: 'sales-rsh',
      [ROLES.SALES_BH]: 'sales-bh',
      [ROLES.MIS]: 'mis',
      [ROLES.PROJECT_HEAD]: 'project-head',
      [ROLES.CRM]: 'crm',
      [ROLES.GRE]: 'gre',
      [ROLES.BIS]: 'bis',
      [ROLES.CRM_TL]: 'crm-tl',
      [ROLES.CRM_HEAD]: 'crm-head',
      [ROLES.FINANCE_USER]: 'finance-user',
      [ROLES.FINANCE_HEAD]: 'finance-head',
      [ROLES.LOYALTY]: 'loyalty',
    };

    const panelPrefix = rolePanelMap[userRole || ''] || 'rm-panel'; // fallback to rm-panel
    return id ? `/${panelPrefix}/${basePath}/${id}` : `/${panelPrefix}/${basePath}`;
  };

export const eoiPaymentStatusOptions = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Partially Paid', label: 'Partially Paid' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Refunded', label: 'Refunded' },
];

export enum EOIPaymentMode {
  OFFLINE = "Offline",
  GATEWAY = "Gateway",
}

export interface StatusStyles {
  bg: string;
  color: string;
  text: string;
  icon: string;
}

export const getStatusStyles = (status: string): StatusStyles => {
  switch (status) {
    case EOIFinanceStatus.VERIFIED:
      return {
        bg: "rgba(34, 197, 94, 0.08)",
        color: "#118D57",
        text: EOIFinanceStatus.VERIFIED,
        icon: successIcon,
      };

    case EOIFinanceStatus.REJECTED:
      return {
        bg: "#F0D7D2",
        color: "#B71D18",
        text: EOIFinanceStatus.REJECTED,
        icon: rejectedIcon,
      };
    case EOIFinanceStatus.REVERSED :
      return {
        bg: "#F0D7D2",
        color: "#B71D18",
        text: EOIFinanceStatus.REVERSED,
        icon: rejectedIcon,
      };
 
      case EOIFinanceStatus.REFUNDED :
      return {
        bg: "#F0D7D2",
        color: "#B71D18",
        text: EOIFinanceStatus.REFUNDED,
        icon: rejectedIcon,
      };
    default:
      return {
        bg: "rgba(255, 171, 0, 0.08)",
        color: "#B76E00",
        text: EOIFinanceStatus.UNVERIFIED,
        icon: pendingIcon,
      };
  }
};

export const OCCUPATION_GROUPS = {
  NON_SALARIED: ['Retired', 'Freelancer', 'Homemaker'],
  SALARIED: ['Salaried', 'Professional'],
  BUSINESS: ['Business'],
};

export const CX_FIELDS = {
  NON_SALARIED: ['SV_Marital_Status', 'SV_Reason_for_Purchase', 'Current_Residence_Typology', 'Budget'],
  SALARIED: [
    'SV_Desination_of_Customer',
    'SV_Company_Name',
    'SV_Current_Company_Address',
    'SV_Marital_Status',
    'SV_Reason_for_Purchase',
    'Current_Residence_Typology',
    'Budget',
  ],
  BUSINESS: [
    'SV_Company_Name',
    'SV_Current_Company_Address',
    'SV_Marital_Status',
    'SV_Reason_for_Purchase',
    'Current_Residence_Typology',
    'Budget',
  ],
};

export const GRE_RM_FIELDS = [
  'leadOwner',
  'Exit_Time',
  'SV_Head_Count',
  'SV_Gender'
];

export const PAYMENT_STATUS_COLOR_MAP: Record<string, string> = {
  paid: 'success',
  completed: 'success',
  success: 'success',
  pending: 'warning',
  processing: 'warning',
  failed: 'error',
  rejected: 'error',
  declined: 'error',
  refunded: 'secondary',
  cancelled: 'secondary',
};

export const BOOKING_REGION = {
  INDIAN: "Indian",
  NRI: "NRI",
  PIO_OCI: "PIO/OCI",
}

export const GRE_DESIGNATION_OPTIONS = [
  {
    name: 'Board Level',
    value: 'Board Level',
  },
  {
    name: 'C - Level',
    value: 'C - Level',
  },
  {
    name: 'VP/SVP/EVP',
    value: 'VP/SVP/EVP',
  },
  {
    name: 'Senior Director',
    value: 'Senior Director',
  },
  {
    name: 'Director',
    value: 'Director',
  },
  {
    name: 'General Manager',
    value: 'General Manager',
  },
  {
    name: 'Manager',
    value: 'Manager',
  },
  {
    name: 'Junior Executive/Associate',
    value: 'Junior Executive/Associate',
  },
  {
    name: 'Others',
    value: 'Others',
  },
];


export const PROJECT_STATUS_OPTIONS = [
  { label: 'Active | Voucher', value: 'Active | Voucher' },
  { label: 'Inactive | Voucher', value: 'Inactive | Voucher' },
  { label: 'Active | EOI', value: 'Active | EOI' },
  { label: 'Inactive | EOI', value: 'Inactive | EOI' },
  { label: 'Active | Voucher and EOI', value: 'Active | Voucher and EOI' },
  { label: 'Inactive | Voucher and EOI', value: 'Inactive | Voucher and EOI' },
  { label: 'Project Launched', value: 'Project Launched' },
  { label: 'Project on Hold', value: 'Project on Hold' },
  { label: 'Cancelled & Refunded', value: 'Cancelled & Refunded' },
  { label: 'Archived', value: 'Archived' }
];

export const OFFICE_USE = {
  YES: "Yes",
  NO: "No",
  NOT_APPLICABLE: "Not Applicable",
}
export const RESIDING_AS = {
  OWNER: "Owner",
  TENANT: "Tenant",
}
export const OWNER_TYPE = {
  PRIMARY:"primaryOwner",
  SECONDARY: "secondaryOwner",
}

export const PAYMENT_OPTIONS = [
  { name:'Lumpsum', value: 'Lumpsum'},
  { name: "Distinct", value:'Distinct'  },
];
  export  const CAMPAIGN_LIST_STATUS_OPTIONS =  {
  ACTIVE_VOUCHER : 'Active | Voucher',
  INACTIVE_VOUCHER : 'Inactive | Voucher',
  ACTIVE_EOI : 'Active | EOI',
  INACTIVE_EOI : 'Inactive | EOI',
  ACTIVE_VOUCHER_AND_EOI : 'Active | Voucher and EOI',
  INACTIVE_VOUCHER_AND_EOI : 'Inactive | Voucher and EOI',
  PROJECT_LAUNCHED : 'Project Launched',
  PROJECT_ON_HOLD : 'Project on Hold',
  CANCELLED_AND_REFUNDED : 'Cancelled & Refunded',
  ARCHIVED : 'Archived'
}
 
export const applicantCountConstant = {
  numberKeys: {
    1: "Primary",
    2: "nd",
    3: "rd",
    4: "th",
  } as Record<number, string>,
};
 export enum CancellationActionEnum {
  APPROVE = 'Approve',
  REVOKE = 'Revoke',
  CANCEL = 'Cancel',
}

export const BOOKING_AS = {
  INDIVIDUAL: "Individual",
  CORPORATE: "Corporate",
  PARTNERSHIP_FIRM: "Partnership Firm",
};

export const  MULTI_BOOKING_GROUP_STATUS =  {
  NOT_SIGNED : 'Not Signed',
  PARTIALLY_SIGNED : 'Partially Signed',
  SIGNED : "All Signed"
};
export enum EOIViewByOptions {
  UNITS = 'Units',
  PERCENTAGE = 'Percentage',
  EOI_VALUE = 'EOI Value',
  EOI_AMT_COLLECTED = 'EOI Amount Collected',
}

export const EOI_VIEW_BY_OPTIONS = [
  { label: 'Units', value: 'unit' },
  { label: 'Percentage', value: 'percentage' },
  { label: 'EOI Value', value: 'EOI value' },
  { label: 'EOI Amount Collected', value: 'EOI Amount Collected' },
];

export const RESIDENT_STATUS = {
  Nri : "NRI",
  Oci : "PIO/OCI",
  Indian : "Indian"
}


export const DOC_MESSAGE = "Physical Copy to be submitted offline"

export const PAYMENT_MODE = {
  OFFLINE: "Direct",
  GATEWAY: "Payment Gateway",
}

export const FORM_PHASE = {
  VOUCHER: "VOUCHER",
  EOI: "EOI"
};

export const VoucherAmountType = {
  FIXED: 'Fixed',
  BHK_WISE: 'BHK Wise',
} as const;

export const EOI_TYPE = {
  Standard: "Standard",
  Preferential: "Preferential",
};

/** Voucher / Standard / Preferential — unit preference & payable path (matches customer EOI flow) */
export const EOI_PREFERENCE = {
  Voucher: "Voucher",
  Standard: "Standard",
  Preferential: "Preferential",
} as const;

export const OCCUPATION = {
  EMPLOYED_PRIVATE_SECTOR: "Employed - Private Sector",
  EMPLOYED_GOVERNMENT_SECTOR: "Employed - Government Sector",
  ARMED_FORCES: "Armed Forces",
  BUSINESS: "Business",
  RETIRED: "Retired",
  HOMEMAKER: "Homemaker",
};

export const getMUIColorStyles = (colorName: any) => {
  const colorMap = {
    'primary': {
      color: '#1976d2',
      backgroundColor: 'rgba(25, 118, 210, 0.08)'
    },
    'secondary': {
      color: '#dc004e',
      backgroundColor: 'rgba(220, 0, 78, 0.08)'
    },
    'success': {
      color: '#118D57',
      backgroundColor: 'rgba(34, 197, 94, 0.08)'
    },
    'error': {
      color: '#B71D18',
      backgroundColor: 'rgba(183, 29, 24, 0.08)'
    },
    'warning': {
      color: '#B76E00',
      backgroundColor: 'rgba(255, 171, 0, 0.08)'
    },
    'info': {
      color: 'rgba(0, 108, 156, 1)',
      backgroundColor: 'rgba(0, 184, 217, 0.08)'
    },
    'default': {
      color: '#6B7280',
      backgroundColor: 'rgba(107, 114, 128, 0.08)'
    }
  };

  return colorMap[colorName as keyof typeof colorMap] || colorMap.default;
};

export const getFormStatusStyles = (status: EOIFormStatus) => {
  const colorName = STATUS_COLORS.FORM_STATUS[status] || 'default';
  return getMUIColorStyles(colorName);
};

export const EOI_DASHBOARD_TAB_OPTIONS = [
  { value: 'default', label: 'Default view' },
  { value: 'source', label: 'Source wise View' },
];

export const EOI_LEADERBOARD_TAB_OPTIONS =[
  { value: 'channelPartner', label: 'Channel Partner' },
  { value: 'relationshipManager', label: 'Relationship Manager' },
];

export enum BatchStatus {
  ACTIVE = 'Active',
  ARCHIVED = 'Archived',
  DELETED = 'Deleted',
}

export const BATCH_LISTING_TAB_OPTIONS = [
  { value: BatchStatus.ACTIVE, label: 'Active' },
  { value: BatchStatus.ARCHIVED, label: 'Archived' },
];

export const USER_TAB_OPTIONS = [
  { value: 'team-lead', label: 'Team Lead', isLocked: true },
  { value: 'regional-head', label: 'Regional Head', isLocked: true },
];

export const FILTER_STATUS_OPTIONS = [ 'active', 'inactive'];

export const EOI_List_TAB_OPTIONS =[
  { value: 'all', label: 'All' },
  { value: 'sourceView', label: 'Change Request' },
  { value: 'cancellationsView', label: 'Cancellations' },
];

export const CHANGE_REQUEST_RADIO_OPTIONS = {
  SFDC_ENQUIRY_ID: 'sfdcEnquiryId',
  PaymentRefId: 'paymentRefId',
  RECORD_NOT_EXIST: 'recordDoesNotExist',
}

export enum SourceChangeEnum {
  SFDC = 'SFDC',
  PRID = 'PRID',
  NONE = 'NONE',
}

export const SOURCE_CHANGE_REQUEST_OPTIONS = [
  { label: 'SFDC Enquiry ID', value: SourceChangeEnum.SFDC },
  { label: 'Payment Ref ID', value: SourceChangeEnum.PRID },
  { label: 'Record does not exist', value: SourceChangeEnum.NONE },
]

export const INVENTORY_SOURCE_OPTIONS =[
  { value: 'SFDC', label: 'SFDC' },
  { value: 'Database', label: 'Database' },
];

export const BOOKING_STATUS = {
  PENDING: 'Pending',
  PRE_FILLED: 'Pre Filled',
  SIGNED: 'Signed',
}

export const INVENTORY_STATUS = {
  AVAILABLE: 'Available',
  BLOCKED_BY_MANAGEMENT: 'Blocked by Management',
  BLOCKED_BY_RM: 'Blocked by RM',
}

export const INVENTORY_TAB_OPTIONS =[
  { value: 'towerView', label: 'Tower View' },
  { value: 'listView', label: 'List View' },
];
export enum DisplayUnitType {
  UNIT_NUMBER = 'Unit Number',
  TOWER_AND_SBA_SQFT = 'Tower and SBA Sq.Ft',
}

export const DISPLAY_UNIT_TYPE_OPTIONS = [
  { label: 'Only Unit Number ', value: DisplayUnitType.UNIT_NUMBER },
  { label: 'Tower and SBA Sq.Ft', value: DisplayUnitType.TOWER_AND_SBA_SQFT },
]

export const SHOW_AGREEMENT_VALUE_OPTIONS = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
]

export const RESIDENT_STATUS_OPTIONS = [
  { label: 'Indian', value: RESIDENT_STATUS.Indian },
  { label: 'NRI', value: RESIDENT_STATUS.Nri },
  { label: 'PIO/OCI', value: RESIDENT_STATUS.Oci },
]

export enum BatchStage {
  UNIT_ALLOTMENT = 'Unit Allotment',
  LAUNCH = 'Launch',
}

export const STAGE_OPTIONS = [
  { label: 'Unit Allotment', value: BatchStage.UNIT_ALLOTMENT },
  { label: 'Launch', value: BatchStage.LAUNCH },
]

export enum IomStatus {
  IOM_TO_BE_CREATED = 'IOM To Be Created',
  CRM_TL_APPROVAL_PENDING = 'CRM TL Approval Pending',
  CRM_TL_REJECTED = 'CRM TL Rejected',
  CRM_HEAD_APPROVAL_PENDING = 'CRM Head Approval Pending',
  CRM_HEAD_REJECTED = 'CRM Head Rejected',
  FINANCE_MEMBER_VERIFICATION_PENDING = 'Finance Member Verification Pending',
  FINANCE_MEMBER_REJECTED = 'Finance Member Rejected',
  FINANCE_APPROVER_APPROVAL_PENDING = 'Finance Approver Approval Pending',
  FINANCE_APPROVER_REJECTED = 'Finance Approver Rejected',
  POINTS_TO_BE_UPLOADED = 'Points To Be Uploaded',
  POINTS_UPLOADED = 'Points Uploaded',
  INVOICE_REQUESTED_FROM_VENDOR = 'Invoice Requested From Vendor',
  INVOICE_REJECTED_BY_FINANCE = 'Invoice Rejected By Finance',
  INVOICE_SUBMITTED_TO_FINANCE = 'Invoice Submitted To Finance',
  IOM_CLOSED = 'IOM Closed',
  DELETED = 'Deleted',
  DRAFT = 'Draft',
  DEVIATION = 'Deviation',
}

export enum IomAction {
  CANCEL_IOM,
  REJECT_IOM,
}

export enum InvoiceStatus {
  REQUESTED = 'Requested',
  PENDING = 'Pending',
  RAISED = 'Raised'
}

export enum PointsClassification {
  ELIGIBLE = 'Eligible',
  REDEEMABLE = 'Redeemable',
}

export enum PointsAdjustmentType {
  ONE_ONE = '1:1',
  TWO_ZERO = '2:0',
  ZERO_TWO = '0:2',
  OTHER = 'Other',
}

export const POINTS_ADJUSTMENT_OTHER = PointsAdjustmentType.OTHER;

export const POINTS_ADJUSTMENT_OPTIONS = [
  { value: PointsAdjustmentType.ONE_ONE, label: '1:1' },
  { value: PointsAdjustmentType.TWO_ZERO, label: '2:0' },
  { value: PointsAdjustmentType.ZERO_TWO, label: '0:2' },
  { value: PointsAdjustmentType.OTHER, label: 'Other' },
];

export const IOM_EDITABLE_STATUSES = new Set<IomStatus>([
  IomStatus.IOM_TO_BE_CREATED,
  IomStatus.CRM_TL_REJECTED,
  IomStatus.CRM_HEAD_REJECTED,
  IomStatus.FINANCE_MEMBER_REJECTED,
  IomStatus.INVOICE_REJECTED_BY_FINANCE,
  IomStatus.DELETED,
  IomStatus.DRAFT,
]);

export const IOM_CANCELLABLE_STATUSES = new Set<IomStatus>([
  IomStatus.CRM_HEAD_APPROVAL_PENDING,
]);

export const IOM_DELETABLE_STATUSES = new Set<IomStatus>([
  IomStatus.CRM_TL_APPROVAL_PENDING,
]);

export const IOM_SUBMITTABLE_STATUSES_BY_ROLE: Partial<Record<ROLES, Set<IomStatus>>> = {
  [ROLES.CRM]: new Set<IomStatus>([
    IomStatus.IOM_TO_BE_CREATED,
    IomStatus.CRM_TL_REJECTED,
    IomStatus.CRM_HEAD_REJECTED,
    IomStatus.FINANCE_MEMBER_REJECTED,
    IomStatus.FINANCE_APPROVER_REJECTED,
    IomStatus.INVOICE_REJECTED_BY_FINANCE,
    IomStatus.DELETED,
    IomStatus.DRAFT,
  ]),
  [ROLES.CRM_TL]: new Set<IomStatus>([IomStatus.CRM_TL_APPROVAL_PENDING]),
};

export const IOM_REJECTED_STATUSES = new Set<IomStatus>([
  IomStatus.CRM_TL_REJECTED,
  IomStatus.CRM_HEAD_REJECTED,
  IomStatus.FINANCE_MEMBER_REJECTED,
  IomStatus.FINANCE_APPROVER_REJECTED,
  IomStatus.INVOICE_REJECTED_BY_FINANCE,
  IomStatus.DELETED,
]);

export const IOM_APPROVAL_STATUS_BY_ROLE: Partial<Record<ROLES, IomStatus>> = {
  [ROLES.CRM_TL]: IomStatus.CRM_TL_APPROVAL_PENDING,
  [ROLES.CRM_HEAD]: IomStatus.CRM_HEAD_APPROVAL_PENDING,
  [ROLES.FINANCE_USER]: IomStatus.FINANCE_MEMBER_VERIFICATION_PENDING,
  [ROLES.FINANCE_HEAD]: IomStatus.FINANCE_APPROVER_APPROVAL_PENDING,
  [ROLES.FinanceAdmin]: IomStatus.FINANCE_APPROVER_APPROVAL_PENDING,
};
export enum MyTeamStatus {
  AVAILABLE = 'Available',
  UNAVAILABLE = 'Unavailable',
}
