import { BadRequestException } from '@nestjs/common';

import { RolesEnum } from 'src/enums/roles.enum';

export interface IomExportColumn {
  header: string;
  key: string;
  width?: number;
}

export const IOM_EXPORT_BASE_COLUMN_KEYS = [
  'salesOrderId',
  'projectName',
  'unitNo',
  'customerName',
  'saleValue',
  'saleValueCollectedPercentage',
  'statusLabel',
  'iomSubmittedAt',
  'iomNo',
  'thresholdPaymentReceivedAt',
  'totalBrokerageAmount',
  'referralSplitType',
  'referralPointsEdited',
  'referralClassification',
  'pointsUpdatedAt',
  'invoiceReqNumber',
  'invoiceStatus',
  'ageing',
  'invoiceNumber',
  'invoiceDate',
  'iomCreatedAt',
] as const;

const IOM_EXPORT_ROLE_COLUMN_KEYS: Partial<
  Record<RolesEnum, readonly string[]>
> = {
  [RolesEnum.CRM_TL]: ['crmCreatedByName'],
  [RolesEnum.CRM_HEAD]: ['crmCreatedByName', 'crmVerifiedByName'],
  [RolesEnum.FINANCE_USER]: [
    'crmCreatedByName',
    'crmVerifiedByName',
    'crmApprovedByName',
  ],
  [RolesEnum.FINANCE_HEAD]: [
    'crmCreatedByName',
    'crmVerifiedByName',
    'crmApprovedByName',
    'financeVerifiedByName',
  ],
  [RolesEnum.LOYALTY]: [
    'crmCreatedByName',
    'crmVerifiedByName',
    'crmApprovedByName',
    'financeVerifiedByName',
    'financeApprovedByName',
  ],
};

export const IOM_EXPORT_COLUMNS: IomExportColumn[] = [
  { header: 'ID', key: 'id', width: 10 },
  { header: 'Project Name', key: 'projectName', width: 20 },
  { header: 'Unit No.', key: 'unitNo', width: 12 },
  { header: 'Customer Name', key: 'customerName', width: 20 },
  { header: 'Sale Value', key: 'saleValue', width: 15 },
  {
    header: '% of SV Collected',
    key: 'saleValueCollectedPercentage',
    width: 18,
  },
  {
    header: 'Sale Value Amount Collected',
    key: 'saleValueAmountCollected',
    width: 20,
  },
  { header: 'IOM Date', key: 'iomSubmittedAt', width: 18 },
  { header: 'IOM No.', key: 'iomNo', width: 15 },
  { header: 'Sales Order ID', key: 'salesOrderId', width: 18 },
  { header: '15% Date', key: 'thresholdPaymentReceivedAt', width: 22 },
  { header: 'Referral Pts ', key: 'totalBrokerageAmount', width: 15 },
  { header: 'Points Adjustment', key: 'referralSplitType', width: 16 },
  { header: 'Referral Points Edited', key: 'referralPointsEdited', width: 12 },
  { header: 'Points Classification', key: 'referralClassification', width: 18 },
  { header: 'Points Updated', key: 'pointsUpdatedAt', width: 18 },

  { header: 'Invoice Req No.', key: 'invoiceReqNumber', width: 16 },
  { header: 'Invoice Status', key: 'invoiceStatus', width: 16 },
  { header: 'Ageing (Days)', key: 'ageing', width: 14 },
  { header: 'Invoice No.', key: 'invoiceNumber', width: 16 },
  { header: 'Invoice Date', key: 'invoiceDate', width: 16 },

  { header: 'Status', key: 'statusLabel', width: 22 },
  { header: 'Created By', key: 'crmCreatedByName', width: 18 },
  { header: 'Verified By', key: 'crmVerifiedByName', width: 18 },
  { header: 'Approved By', key: 'crmApprovedByName', width: 18 },
  { header: 'Finance Verifier', key: 'financeVerifiedByName', width: 18 },
  { header: 'Finance Approver', key: 'financeApprovedByName', width: 18 },

  { header: 'Booking ID', key: 'bookingId', width: 12 },
  { header: 'Project ID', key: 'projectId', width: 12 },
  { header: 'Brokerage %', key: 'brokeragePercentage', width: 12 },
  { header: 'Referrer Points', key: 'referrerPoints', width: 15 },
  { header: 'Referee Points', key: 'refereePoints', width: 15 },
  { header: 'Status Code', key: 'statusCode', width: 22 },
  { header: 'Created At', key: 'createdAt', width: 18 },
  { header: 'CRM Verified By ID', key: 'crmVerifiedBy', width: 14 },
  { header: 'Points Allotted By', key: 'pointsAllottedByName', width: 18 },
  {
    header: 'Referral Points Adjustment',
    key: 'referralPointsAdjustment',
    width: 14,
  },
  { header: 'Referral Split Ratio', key: 'referralSplitRatio', width: 16 },
  {
    header: 'Loyalty Point Classification',
    key: 'loyaltyPointClassification',
    width: 22,
  },
  {
    header: 'Points Edited',
    key: 'referralPointsEditedAt',
    width: 22,
  },

  { header: 'Invoice Requested At', key: 'invoiceRequestedAt', width: 18 },
  { header: 'Invoice Created By', key: 'invoiceCreatedBy', width: 18 },
  { header: 'Invoice Updated By', key: 'invoiceUpdatedBy', width: 18 },
  { header: 'Invoice Created At', key: 'invoiceCreatedAt', width: 18 },
  { header: 'Invoice Updated At', key: 'invoiceUpdatedAt', width: 18 },
];

const COLUMN_BY_KEY = new Map(
  IOM_EXPORT_COLUMNS.map((column) => [column.key, column]),
);

export function getRoleAllowedExportColumnKeys(role?: string): string[] {
  const base = [...IOM_EXPORT_BASE_COLUMN_KEYS];

  if (!role) {
    return base;
  }

  const roleEnum = Object.values(RolesEnum).find((value) => value === role);
  const additions = roleEnum
    ? IOM_EXPORT_ROLE_COLUMN_KEYS[roleEnum]
    : undefined;

  if (!additions?.length) {
    return base;
  }

  return [...base, ...additions];
}

export function resolveExportColumns(
  fields?: string[],
  role?: string,
): IomExportColumn[] {
  const allowedKeys = getRoleAllowedExportColumnKeys(role);
  const allowedSet = new Set(allowedKeys);

  if (!fields?.length) {
    // Empty intersection after role gate yields headers-only workbook.
    return allowedKeys
      .map((key) => COLUMN_BY_KEY.get(key))
      .filter((column): column is IomExportColumn => column != null);
  }

  const knownKeys = new Set(IOM_EXPORT_COLUMNS.map((column) => column.key));
  const unknown = fields.filter((field) => !knownKeys.has(field));

  if (unknown.length) {
    throw new BadRequestException(
      `Unknown export fields: ${unknown.join(', ')}. Valid fields: ${[...knownKeys].join(', ')}`,
    );
  }

  return fields
    .filter((field) => allowedSet.has(field))
    .map((field) => COLUMN_BY_KEY.get(field)!)
    .filter(Boolean);
}
