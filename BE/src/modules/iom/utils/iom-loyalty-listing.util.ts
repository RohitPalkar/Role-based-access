import { SelectQueryBuilder } from 'typeorm';

import { Iom } from '../entities/iom.entity';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';

export type LoyaltyListType =
  | 'iomRequestInvoice'
  | 'pendingSubmission'
  | 'submittedInvoice';

export const LOYALTY_LIST_TYPES: LoyaltyListType[] = [
  'iomRequestInvoice',
  'pendingSubmission',
  'submittedInvoice',
];

export function isLoyaltyListType(value: string): value is LoyaltyListType {
  return (LOYALTY_LIST_TYPES as string[]).includes(value);
}

export function applyLoyaltyListTypeFilter(
  qb: SelectQueryBuilder<Iom>,
  listType: LoyaltyListType,
): void {
  switch (listType) {
    case 'iomRequestInvoice':
      qb.andWhere('i.invoiceId IS NULL');
      qb.andWhere('(inv.id IS NULL OR inv.status IS NULL)');
      break;
    case 'pendingSubmission':
      qb.andWhere('status.code = :pendingStatus', {
        pendingStatus: IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR,
      });
      break;
    case 'submittedInvoice':
      qb.andWhere('status.code = :submittedStatus', {
        submittedStatus: IomStatusCodeEnum.INVOICE_SUBMITTED,
      });
      break;
  }
}

export function buildLoyaltyCountsSelect(): Record<LoyaltyListType, string> {
  const pending = IomStatusCodeEnum.INVOICE_REQUESTED_FROM_VENDOR;
  const submitted = IomStatusCodeEnum.INVOICE_SUBMITTED;

  return {
    iomRequestInvoice: `SUM(CASE WHEN i.invoiceId IS NULL AND (inv.id IS NULL OR inv.status IS NULL) THEN 1 ELSE 0 END)`,
    pendingSubmission: `SUM(CASE WHEN status.code = '${pending}' THEN 1 ELSE 0 END)`,
    submittedInvoice: `SUM(CASE WHEN status.code = '${submitted}' THEN 1 ELSE 0 END)`,
  };
}
