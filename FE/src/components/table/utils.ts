// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

import type { TablePaginationCustomProps } from './table-pagination-custom';

export function rowInPage<T>(data: T[], page: number, rowsPerPage: number) {
  return data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}

// ----------------------------------------------------------------------

export function emptyRows(page: number, rowsPerPage: number, arrayLength: number) {
  return page ? Math.max(0, rowsPerPage - arrayLength) : 0;
}

// ----------------------------------------------------------------------

function descendingComparator<T>(a: T, b: T, orderBy: keyof T): number {
  const aValue = a[orderBy];
  const bValue = b[orderBy];

  if (aValue === null || aValue === undefined) {
    return 1; // Push `null` or `undefined` values to the end
  }
  if (bValue === null || bValue === undefined) {
    return -1;
  }
  if (bValue < aValue) {
    return -1;
  }
  if (bValue > aValue) {
    return 1;
  }
  return 0;
}

// ----------------------------------------------------------------------

export function getComparator<Key extends keyof any>(
  order: 'asc' | 'desc',
  orderBy: Key
): (
  a: {
    [key in Key]: number | string;
  },
  b: {
    [key in Key]: number | string;
  }
) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

/**
 * Helper function to add results count to table pagination
 * Use this to replace FiltersResult components that show "X Results found"
 */
export function withResultsCount(
  paginationProps: Omit<TablePaginationCustomProps, 'showResultsCount' | 'totalResults'>,
  totalResults: number
): TablePaginationCustomProps {
  return {
    ...paginationProps,
    showResultsCount: true,
    totalResults,
  };
}

/**
 * Props for tables that want to show results count in footer
 */
export type TableWithResultsProps = {
  showResultsInFooter?: boolean;
  totalResults?: number;
};

/**
 * Helper to determine if results should be shown in footer vs header
 */
export function shouldShowResultsInFooter(showResultsInFooter?: boolean): boolean {
  return showResultsInFooter ?? true; // Default to footer
}
