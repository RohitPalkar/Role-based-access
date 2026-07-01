import * as fs from 'fs/promises';
import * as path from 'path';

import { format } from 'date-fns';

import { Iom } from '../entities/iom.entity';
import { IomDetailExtras } from '../services/iom-crm.service';
import {
  IomSignatoryBlock,
  IomSignatoryInfo,
} from '../types/iom-signatory.interface';

const IOM_PDF_DATE_FORMAT = 'dd-MM-yyyy';
const PDF_EMPTY = '-';

const withPdfFallback = (value: string): string =>
  value?.trim() ? value.trim() : PDF_EMPTY;

const formatIomPdfDate = (date?: string | Date | null): string => {
  if (!date) return PDF_EMPTY;
  const d = new Date(date);
  if (isNaN(d.getTime())) return PDF_EMPTY;
  return format(d, IOM_PDF_DATE_FORMAT);
};

const formatPdfDateString = (value: string | null): string => {
  if (!value?.trim()) return PDF_EMPTY;
  const d = new Date(value);
  if (isNaN(d.getTime())) return PDF_EMPTY;
  return format(d, IOM_PDF_DATE_FORMAT);
};

export const pickStringField = (
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null => {
  if (!obj) return null;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
};

const fmtNumber = (value: number | null | undefined): string => {
  const num = Number(value);
  if (num == null || !Number.isFinite(num)) return PDF_EMPTY;
  return num.toLocaleString('en-IN');
};

export const resolveCustomerName = (iom: Iom): string => {
  const details = iom.referrerDetails;
  if (!details || typeof details !== 'object') {
    return '';
  }

  for (const key of ['name', 'referrerName', 'fullName']) {
    const value = details[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};
const resolveRefererName = (iom: Iom): string => {
  const details = iom.customerDetails;
  if (!details || typeof details !== 'object') {
    return '';
  }

  for (const key of ['name', 'customerName', 'fullName']) {
    const value = details[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const resolveSignatureUrl = (
  baseUrl: string,
  signature: string | null,
): string => {
  if (!signature) return '';
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const pathPart = signature.startsWith('/') ? signature : `/${signature}`;
  return `${base}${pathPart}`;
};

const mapSignatorySlot = (
  info: IomSignatoryInfo,
  baseUrl: string,
): Record<string, string> => {
  if (info.userId == null) {
    return { name: '', role: '', signatureUrl: '' };
  }
  return {
    name: info.name ?? '',
    role: info.role,
    signatureUrl: resolveSignatureUrl(baseUrl, info.signature),
  };
};

export const computeBrokerageSplit = (
  iom: Iom,
): { referrerAmount: number; refereeAmount: number } => {
  const total = Number(iom.totalBrokerageAmount) || 0;
  const referrerRatio = Number(iom.referrerRatio) || 0;
  const refereeRatio = Number(iom.refereeRatio) || 0;
  const ratioSum = referrerRatio + refereeRatio;
  if (ratioSum <= 0) {
    return { referrerAmount: 0, refereeAmount: 0 };
  }
  const referrerAmount = Math.round((total * referrerRatio) / ratioSum);
  const refereeAmount = Math.round((total * refereeRatio) / ratioSum);
  return { referrerAmount, refereeAmount };
};

export function buildIomDetailsTemplateVars(
  iom: Iom,
  extras: IomDetailExtras,
  signatories: IomSignatoryBlock,
  baseUrl: string,
): Record<string, string> {
  // const customer = (iom.customerDetails ?? {}) as Record<string, unknown>;
  const referrer = (iom.referrerDetails ?? {}) as Record<string, unknown>;
  const { referrerAmount, refereeAmount } = computeBrokerageSplit(iom);

  const preparedBy = mapSignatorySlot(signatories.crm, baseUrl);
  const verifiedBy = mapSignatorySlot(signatories.crmTl, baseUrl);
  const approvedBy = mapSignatorySlot(signatories.crmHead, baseUrl);
  const financeVerifiedBy = mapSignatorySlot(
    signatories.financeVerifier,
    baseUrl,
  );
  const financeApprovedBy = mapSignatorySlot(
    signatories.financeApprover,
    baseUrl,
  );

  const agreementDone = iom.agreementDate
    ? formatIomPdfDate(iom.agreementDate)
    : 'No';

  return {
    iomNo: withPdfFallback(iom.iomNo ?? ''),
    statusLabel: withPdfFallback(iom.status?.label ?? ''),
    iomCreatedAt: formatIomPdfDate(iom.submittedAt),
    createdAt: formatIomPdfDate(iom.createdAt),
    crmCreatedByName: withPdfFallback(iom.creator?.name ?? ''),
    customerName: withPdfFallback(resolveCustomerName(iom)),
    referrerBpCode: withPdfFallback(
      pickStringField(referrer, 'bpCode', 'bp_code', 'referrerBpCode') ?? '',
    ),
    referrerProject: withPdfFallback(extras.referrerProjectName ?? ''),
    referrerLocation: withPdfFallback(extras.referrerProjectLocation ?? ''),
    referrerUnitNo: withPdfFallback(
      pickStringField(
        iom.referrerDetails as Record<string, unknown>,
        'unitNo',
        'unit_no',
      ) ?? '',
    ),
    referrerBookingDate: formatPdfDateString(extras.referrerBookingDate),
    refereeCustomerName: withPdfFallback(resolveRefererName(iom)),
    bpCode: withPdfFallback(iom.bpCode ?? ''),
    refereeProject: withPdfFallback(extras.customerProjectName ?? ''),
    refereeLocation: withPdfFallback(extras.customerProjectLocation ?? ''),
    refereeUnitNo: withPdfFallback(iom.unitNumber ?? ''),
    refereeBookingDate: formatPdfDateString(extras.customerBookingDate),
    basicSalePrice: fmtNumber(iom.salePrice),
    brokeragePercent: fmtNumber(iom.brokeragePercentage),
    brokerageAmount: fmtNumber(iom.totalBrokerageAmount),
    pointsAdjustmentType: withPdfFallback(iom.referralSplitType ?? ''),
    pointsToReferrer: fmtNumber(iom.referrerRatio),
    pointsReferrerAmount: fmtNumber(referrerAmount),
    pointsToReferee: fmtNumber(iom.refereeRatio),
    pointsRefereeAmount: fmtNumber(refereeAmount),
    preparedByName: preparedBy.name,
    preparedByRole: preparedBy.role,
    preparedBySignatureUrl: preparedBy.signatureUrl,
    verifiedByName: verifiedBy.name,
    verifiedByRole: verifiedBy.role,
    verifiedBySignatureUrl: verifiedBy.signatureUrl,
    approvedByName: approvedBy.name,
    approvedByRole: approvedBy.role,
    approvedBySignatureUrl: approvedBy.signatureUrl,
    financeVerifiedByName: financeVerifiedBy.name,
    financeVerifiedByRole: financeVerifiedBy.role,
    financeVerifiedBySignatureUrl: financeVerifiedBy.signatureUrl,
    financeApprovedByName: financeApprovedBy.name,
    financeApprovedByRole: financeApprovedBy.role,
    financeApprovedBySignatureUrl: financeApprovedBy.signatureUrl,
    businessException: iom.referralPointsEditReason?.trim() ?? '',
    sourceInSAP: withPdfFallback(iom.sourceInSalesForce ?? ''),
    sourceInSalesforce: withPdfFallback(iom.sourceInSalesForce ?? ''),
    agreementDone,
    referrerPaid: fmtNumber(iom.referrerPaid),
    refereePaid: fmtNumber(iom.refereePaid),
    brand: withPdfFallback(extras.brand ? `${baseUrl}${extras.brand}` : ''),
  };
}

export function buildReferralEditReasonTemplateVars(
  iom: Iom,
): Record<string, string> {
  return {
    iomNo: withPdfFallback(iom.iomNo ?? ''),
    editReason: withPdfFallback(iom.referralPointsEditReason?.trim() ?? ''),
    editedAt: formatIomPdfDate(iom.referralPointsEditedAt),
    editedByName: withPdfFallback(iom.referralPointsEditor?.name ?? ''),
  };
}

export function substituteTemplateVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? '',
  );
}

export async function loadTemplate(fileName: string): Promise<string> {
  const baseDir = path.join(process.cwd(), 'src/templates/iom');
  const htmlPath = path.join(baseDir, fileName);
  return fs.readFile(htmlPath, 'utf-8');
}
