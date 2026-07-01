import { RolesEnum } from 'src/enums/roles.enum';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';

/**
 * Sequences from SeedIomStatuses1780669000001 — used for "at or above" bucket rules.
 */
const IOM_STATUS_SEQUENCES: Record<string, number> = {
  [IomStatusCodeEnum.IOM_TO_BE_CREATED]: 10,
  [IomStatusCodeEnum.CRM_TL_APPROVAL_PENDING]: 20,
  [IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING]: 30,
  [IomStatusCodeEnum.CRM_TL_REJECTED]: 35,
  [IomStatusCodeEnum.FINANCE_MEMBER_VERIFICATION_PENDING]: 40,
  [IomStatusCodeEnum.CRM_HEAD_REJECTED]: 45,
  [IomStatusCodeEnum.FINANCE_APPROVER_APPROVAL_PENDING]: 50,
  [IomStatusCodeEnum.FINANCE_MEMBER_REJECTED]: 65,
  [IomStatusCodeEnum.POINTS_TO_BE_UPLOADED]: 70,
  [IomStatusCodeEnum.POINTS_UPLOADED]: 75,
  [IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR]: 80,
  [IomStatusCodeEnum.INVOICE_SUBMITTED]: 85,
  [IomStatusCodeEnum.IOM_CLOSED]: 100,
};

const CRM_HEAD_MIN_SEQUENCE =
  IOM_STATUS_SEQUENCES[IomStatusCodeEnum.CRM_HEAD_APPROVAL_PENDING];
const FINANCE_USER_MIN_SEQUENCE =
  IOM_STATUS_SEQUENCES[IomStatusCodeEnum.FINANCE_MEMBER_VERIFICATION_PENDING];
const FINANCE_HEAD_MIN_SEQUENCE =
  IOM_STATUS_SEQUENCES[IomStatusCodeEnum.FINANCE_APPROVER_APPROVAL_PENDING];

const LOYALTY_STATUSES: IomStatusCodeEnum[] = [
  IomStatusCodeEnum.POINTS_TO_BE_UPLOADED,
  IomStatusCodeEnum.POINTS_UPLOADED,
  IomStatusCodeEnum.INVOICE_SUBMITTED,
  IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR,
  IomStatusCodeEnum.IOM_CLOSED,
];

function statusesAtOrAbove(minSequence: number): IomStatusCodeEnum[] {
  return Object.entries(IOM_STATUS_SEQUENCES)
    .filter(([, sequence]) => sequence >= minSequence)
    .map(([code]) => code as IomStatusCodeEnum);
}

/**
 * Returns allowed IOM status codes for the given role, or `undefined` when
 * the role may see all statuses within their project scope.
 */
export function getAllowedIomStatusesByRole(
  userRole: string,
): IomStatusCodeEnum[] | undefined {
  switch (userRole) {
    case RolesEnum.CRM:
    case RolesEnum.CRM_TL:
    case RolesEnum.ADMIN:
      return undefined;
    case RolesEnum.CRM_HEAD:
      return statusesAtOrAbove(CRM_HEAD_MIN_SEQUENCE);
    case RolesEnum.FINANCE_USER:
      return statusesAtOrAbove(FINANCE_USER_MIN_SEQUENCE);
    case RolesEnum.FINANCE_HEAD:
      return statusesAtOrAbove(FINANCE_HEAD_MIN_SEQUENCE);
    case RolesEnum.LOYALTY:
      return [...LOYALTY_STATUSES];
    default:
      return undefined;
  }
}
