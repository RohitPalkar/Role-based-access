// e-signer-field-permissions.ts

import { RolesEnum } from 'src/enums/roles.enum';

export interface FieldPermission {
  visible: boolean;
}

/**
 * All available fields in agreement listing response
 */
const ALL_AGREEMENT_FIELDS = [
  'id',
  'projectName',
  'unitNo',
  'enquiryReferenceNumber',
  'applicantName',
  'numberOfApplicants',
  'documentStatus',
  'sentDate',
  'signedAt',
  'internalSignatory',
  'internalSignatorySignature',
  'rmName',
  'signedPdf',
  'internalSignatoryRedirection',
  'documents',
  'documentType',
  'documentName',
  'opportunityId',
  'inviteesData',
] as const;
/**
 * Helper to generate permissions using excluded fields
 */
function createPermissionsByExclusion(
  excludedFields: readonly string[],
): Record<string, FieldPermission> {
  const permissions: Record<string, FieldPermission> = {};
  const excludedSet = new Set(excludedFields);
  for (const field of ALL_AGREEMENT_FIELDS) {
    permissions[field] = {
      visible: !excludedSet.has(field),
    };
  }

  return permissions;
}

/**
 *RM / TL / PH / RSH hidden fields
 */
const OPERATIONAL_EXCLUDED = [
  'internalSignatory',
  'internalSignatorySignature',
  'rmName',
] as const;

/**
 * Permission Objects
 */
const crmPermissions = createPermissionsByExclusion([]);
const operationalPermissions =
  createPermissionsByExclusion(OPERATIONAL_EXCLUDED);

/**
 * Role Mapping
 */
const agreementRolePermissions: Record<
  string,
  Record<string, FieldPermission>
> = {
  [RolesEnum.CRM]: crmPermissions,
  [RolesEnum.RM]: operationalPermissions,
  [RolesEnum.SALES_TL]: operationalPermissions,
  [RolesEnum.SALES_RSH]: operationalPermissions,
  [RolesEnum.PROJECT_HEAD]: operationalPermissions,
};

/**
 * Filter Agreement Listing Based On Role
 */
export function filterAgreementList(agreements: any[], role: RolesEnum): any[] {
  if (!agreements?.length) return [];
  const permissions = agreementRolePermissions[role];
  if (!permissions) {
    return [];
  }

  // Precompute visible fields
  const visibleFields = new Set<string>();
  for (const field in permissions) {
    if (permissions[field]?.visible) {
      visibleFields.add(field);
    }
  }
  return agreements.map((agreement) => {
    const filteredAgreement: any = {};
    for (const field in agreement) {
      if (agreement.hasOwnProperty(field) && visibleFields.has(field)) {
        filteredAgreement[field] = agreement[field];
      }
    }
    return filteredAgreement;
  });
}
