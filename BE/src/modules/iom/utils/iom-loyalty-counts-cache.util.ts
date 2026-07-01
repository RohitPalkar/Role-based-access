import { createHash } from 'crypto';

import {
  IOM_LOYALTY_COUNTS_CACHE_INDEX_PREFIX,
  IOM_LOYALTY_COUNTS_CACHE_PREFIX,
} from '../constants';
import { IomLoyaltyCounts } from '../types/iom-list-item.interface';

const LOYALTY_COUNT_FIELDS = [
  'iomRequestInvoice',
  'pendingSubmission',
  'submittedInvoice',
] as const satisfies ReadonlyArray<keyof IomLoyaltyCounts>;

export function buildLoyaltyCountsCacheKey(projectScope: number[]): string {
  const hash = createHash('sha256')
    .update([...projectScope].sort((a, b) => a - b).join(','))
    .digest('hex');
  return `${IOM_LOYALTY_COUNTS_CACHE_PREFIX}:${hash}`;
}

export function buildProjectIndexKey(projectId: number): string {
  return `${IOM_LOYALTY_COUNTS_CACHE_INDEX_PREFIX}:${projectId}`;
}

export function parseCachedLoyaltyCounts(
  raw: unknown,
): IomLoyaltyCounts | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  for (const field of LOYALTY_COUNT_FIELDS) {
    const value = obj[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }
  }

  return {
    iomRequestInvoice: obj.iomRequestInvoice as number,
    pendingSubmission: obj.pendingSubmission as number,
    submittedInvoice: obj.submittedInvoice as number,
  };
}
