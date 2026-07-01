import { paths } from 'src/routes/paths';

import { ROLES } from './constant';

/** Roles that can access profile settings and upload a signature. */
const PROFILE_SETTINGS_ROLE_LABELS: Partial<Record<ROLES, string>> = {
  [ROLES.RM]: 'RM',
  [ROLES.CRM]: 'CRM',
  [ROLES.CRM_TL]: 'CRM TL',
  [ROLES.CRM_HEAD]: 'CRM Head',
  [ROLES.FINANCE_USER]: 'Finance User',
  [ROLES.FINANCE_HEAD]: 'Finance Head',
  [ROLES.LOYALTY]: 'Loyalty',
  [ROLES.FinanceAdmin]: 'Finance Admin',
};

/** Longer prefixes first so `/crm-tl` is not matched by `/crm`. */
const PROFILE_SETTINGS_BY_PREFIX: ReadonlyArray<readonly [string, string]> = [
  ['/crm-tl', paths.crmTl.profile.settings],
  ['/crm-head', paths.crmHead.profile.settings],
  ['/finance-user', paths.financeUser.profile.settings],
  ['/finance-head', paths.financeHead.profile.settings],
  ['/finance-admin', paths.financeAdmin.profile.settings],
  ['/loyalty', paths.loyalty.profile.settings],
  ['/rm-panel', paths.profile.settings],
  ['/crm', paths.crm.profile.settings],
];

export function getProfileSettingsPath(pathname: string): string | undefined {
  return PROFILE_SETTINGS_BY_PREFIX.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

function getRoleDisplayShortName(role: string): string {
  const knownLabel = PROFILE_SETTINGS_ROLE_LABELS[role as ROLES];
  if (knownLabel) {
    return knownLabel;
  }

  const parenIndex = role.indexOf('(');
  if (parenIndex > 0) {
    return role.slice(0, parenIndex).trim();
  }

  return role.trim();
}

/** Section heading for the signature upload block on profile settings, e.g. "CRM's Signature". */
export function getRoleSignatureSectionTitle(role?: string | null): string {
  const displayRole = role ? getRoleDisplayShortName(role) : 'User';
  return `${displayRole}'s Signature`;
}
