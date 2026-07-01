import type { ReactNode } from 'react';

/**
 * Coerces unknown row field values to a safe React child for table cells.
 * Nullish values and plain objects (e.g. nested API metadata, `Record`s) render as the placeholder.
 * Booleans stringify because React omits boolean children.
 */
export function formatTableCellValue(
  value: unknown,
  emptyPlaceholder = '-'
): ReactNode {
  if (value === null || value === undefined) {
    return emptyPlaceholder;
  }
  if (typeof value === 'object') {
    return emptyPlaceholder;
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  return value as ReactNode;
}
