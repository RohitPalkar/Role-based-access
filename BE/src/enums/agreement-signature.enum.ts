import { RolesEnum } from './roles.enum';

export enum DocumentStatus {
  IN_PROGRESS = 'Doc. Setup in Progress',
  SENT_FOR_SIGNATURE = 'Sent For Signature',
  CUSTOMER_PARTIALLY_SIGNED = 'Cx: Partially Signed',
  // CUSTOMER_DIGITALLY_SIGNED = 'Cx: Signed',
  CRM_SIGN_PENDING = 'Cx: Signed',
  SIGNED = 'CRM: Signed',
}

export enum DocumentFilterStatuses {
  TOTAL_AGREEMENT_SENT = 'Total Documents Sent',
  CX_SIGN_DUE_FOR_THREE_DAYS = 'Cx: Sign Due For Three Days',
}

export enum AgreementSignatory {
  INTERNAL = 'Internal',
  EXTERNAL = 'External',
}

export enum InternalSignatorySignature {
  SIGNED = 'Signed',
  NOT_SIGNED = 'Pending',
  NA = '-',
}
export const E_SIGNER_MODULE_ACCESS_ROLES = [
  RolesEnum.RM,
  RolesEnum.SALES_TL,
  RolesEnum.PROJECT_HEAD,
  RolesEnum.SALES_RSH,
];
