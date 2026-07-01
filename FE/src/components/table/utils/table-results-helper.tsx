import type { TablePaginationCustomProps } from '../table-pagination-custom';

// ----------------------------------------------------------------------

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