import { BadRequestException } from '@nestjs/common';
import { CreateSiteVisitFormDto } from 'src/modules/site_visit_crud/dto/create-site-visit.dto';
import { FormFilledStatusEnum } from 'src/enums/site-visit-form.enums';

// master Dropdown
export const MASTER_DROPDOWNS = {
  residential_status: ['indian', 'nri'],
  number_of_homes_owned: ['1st home', '2nd home', '3rd home'],
  current_residence: [
    'rented',
    'owned',
    'company provided',
    'living with parents',
    'living with children',
  ],
  current_residence_type: ['1bhk', '2bhk', '3bhk', '4bhk', '5bhk'],
  purchase_reason: ['self-use', 'investment', 'for relatives/friends'],
  purchase_duration: ['< 2 weeks', '1 month', '2 months', '> 2 months'],
  marital_status: ['married', 'single'],
  finance_source: [
    'own funds',
    'home loan',
    'sell existing property',
    'sale of existing property',
    'others',
  ],
  project_source: [
    'digital medium',
    'authorised channel partner',
    'existing customer',
    'referred by family/friend',
    'direct walk-in',
    'hoarding',
    'referred by employee of puravankara group',
  ],
  form_status: ['completed', 'pending', 'rejected'],
  gender: ['male', 'female', 'not listed'],
};

// Normalize & lowercase sets
const toLowerSet = (arr: string[] = []) =>
  new Set(arr.map((v) => v.toLowerCase().trim()));

const DROPDOWN_SETS = Object.fromEntries(
  Object.entries(MASTER_DROPDOWNS).map(([key, arr]) => [key, toLowerSet(arr)]),
);

// Utility for generic validation
const ensureIn = (
  label: string,
  value: string | undefined | null,
  set: Set<string>,
) => {
  if (!value) return;
  if (!set.has(value.toLowerCase().trim())) {
    throw new BadRequestException(
      `Please select a valid value for "${label}".`,
    );
  }
};

// Conditional rules for primarySource
const PRIMARY_SOURCE_RULES: Record<
  string,
  { requireAll: (keyof Partial<CreateSiteVisitFormDto>)[]; message: string }
> = {
  'authorised channel partner': {
    requireAll: ['channelPartner'],
    message: 'Please provide a channel partner / real estate agent.',
  },
  'existing customer': {
    requireAll: ['exProjectName', 'unitNumber'],
    message:
      'Please provide previous project name and unit number (Existing customer).',
  },
  'referred by family/friend': {
    requireAll: ['referredBy'],
    message: 'Please provide who referred you (friend/family).',
  },
};

// Main validator
export function validateDropdowns(dto: Partial<CreateSiteVisitFormDto>) {
  const {
    residentialStatus,
    ownedHouseCount,
    purchaseDuration,
    financeSource,
    primarySource,
  } = dto;

  ensureIn(
    'Residential status',
    residentialStatus,
    DROPDOWN_SETS.residential_status,
  );
  ensureIn(
    'Number of homes owned',
    ownedHouseCount,
    DROPDOWN_SETS.number_of_homes_owned,
  );
  ensureIn(
    'Purchase duration',
    purchaseDuration,
    DROPDOWN_SETS.purchase_duration,
  );
  ensureIn('Finance source', financeSource, DROPDOWN_SETS.finance_source);
  if (dto.isWelcomeCodeUsed === 0)
    ensureIn('Project source', primarySource, DROPDOWN_SETS.project_source);

  if (primarySource) {
    const key = primarySource.toLowerCase().trim();
    const rule = PRIMARY_SOURCE_RULES[key];
    if (rule) {
      const missing = rule.requireAll.filter((field) => !dto[field]);
      if (missing.length > 0) {
        throw new BadRequestException(rule.message);
      }
    }
  }
}

export const OCCUPATION_GROUPS = {
  NON_SALARIED: ['Retired', 'Freelancer', 'Homemaker'],
  SALARIED: ['Salaried', 'Professional'],
  BUSINESS: ['Business'],
};

export const CX_FIELDS = {
  NON_SALARIED: [
    'SV_Marital_Status',
    'SV_Reason_for_Purchase',
    'Current_Residence_Typology',
    'Budget',
  ],
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
  'SV_Gender',
];

export function getCXFieldsToCheck(rowData: Record<string, any>) {
  const occupation = rowData?.Sv_Occupation_Employment;

  if (OCCUPATION_GROUPS.NON_SALARIED.includes(occupation)) {
    return CX_FIELDS.NON_SALARIED.map((key) => rowData?.[key]);
  }

  if (OCCUPATION_GROUPS.SALARIED.includes(occupation)) {
    return CX_FIELDS.SALARIED.map((key) => rowData?.[key]);
  }

  if (OCCUPATION_GROUPS.BUSINESS.includes(occupation)) {
    return CX_FIELDS.BUSINESS.map((key) => rowData?.[key]);
  }

  return [];
}

export function getGREFieldsToCheck(rowData: Record<string, any>) {
  return GRE_RM_FIELDS.map((key) => rowData?.[key]);
}

/**
 * Determines the form filled status based on GRE and RM field completion counts.
 * @param rmCounts - String in format "filled/total" for RM fields (e.g., "0/4", "3/4", "4/4")
 * @param greCounts - String in format "filled/total" for GRE fields (e.g., "0/6", "5/6", "6/6")
 * @returns The form status enum value based on completion criteria
 */
export function determineFormFilledStatus(
  rmCounts: string,
  greCounts: string,
): FormFilledStatusEnum {
  // Parse counts from strings like "0/4" or "6/6"
  const parseCounts = (countStr: string): { filled: number; total: number } => {
    const [filled, total] = countStr.split('/').map(Number);
    return { filled: filled || 0, total: total || 0 };
  };

  const rm = parseCounts(rmCounts);
  const gre = parseCounts(greCounts);

  // If both GRE and RM are 0/0 → Form Submission Pending
  const pendingStatus = resolvePendingStatus(gre, rm);
  if (pendingStatus) {
    return pendingStatus;
  }

  // If GRE is not completed (1-5/6) → GRE Fields Pending
  if (gre.filled > 0 && gre.filled < gre.total) {
    return FormFilledStatusEnum.GRE_FIELDS_PENDING;
  }

  // If GRE is completed (6/6) and RM is 0 → GRE fields Updated
  if (gre.filled === gre.total && gre.total > 0 && rm.filled === 0) {
    return FormFilledStatusEnum.GRE_FIELDS_UPDATED;
  }

  // If GRE is completed (6/6) and RM is completed (4/4) → RM fields Updated
  if (
    gre.filled === gre.total &&
    gre.total > 0 &&
    rm.filled === rm.total &&
    rm.total > 0
  ) {
    return FormFilledStatusEnum.RM_FIELDS_UPDATED;
  }

  // Default fallback (should not reach here in normal flow)
  return FormFilledStatusEnum.FORM_SUBMISSION_PENDING;
}

function resolvePendingStatus(
  gre: { filled: number; total: number },
  rm: { filled: number; total: number },
): FormFilledStatusEnum | null {
  // Both GRE and RM are 0/0 → Form Submission Pending
  if (
    gre.filled === 0 &&
    gre.total === 0 &&
    rm.filled === 0 &&
    rm.total === 0
  ) {
    return FormFilledStatusEnum.FORM_SUBMISSION_PENDING;
  }

  // GRE completed and RM incomplete → RM Fields Pending
  if (
    gre.filled === gre.total &&
    gre.total > 0 &&
    rm.filled > 0 &&
    rm.filled < rm.total
  ) {
    return FormFilledStatusEnum.RM_FIELDS_PENDING;
  }

  return null;
}
