import type { Theme, SxProps } from '@mui/material/styles';

// ----------------------------------------------------------------------

/**
 * Common table container styles for consistent layout
 */
export const tableContainerStyles: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: { xs: 'calc(100vh - 100px)', md: 'calc(100vh - 70px)' }
};

export const tableContainerStylesPopup: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: { xs: 'calc(100vh - 100px)', md: 'calc(100vh - 200px)' }
};

export const tableContainerStylesSmall: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: { xs: 'calc(100vh - 400px)', md: 'calc(100vh - 320px)' }
};

/**
 * Common table styles with responsive design
 */
export const getTableStyles = (minWidth?: number): SxProps<Theme> => ({
  minWidth: minWidth || 1200,
  tableLayout: 'fixed',
  width: '100%',
  '& .MuiTableCell-root': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    px: 1.25
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    py: 0.25
  }
});

/**
 * Scrollable table content area styles
 */
export const scrollableTableContentStyles: SxProps<Theme> = {
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0, // Important for flex child to shrink
  position: 'relative'
};

/**
 * Table scrollbar styles
 */
export const tableScrollbarStyles: SxProps<Theme> = {
  height: '100%',
  '& .simplebar-content': {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  }
};

/**
 * Table head styles with consistent background
 */
export const tableHeadStyles: SxProps<Theme> = {
  whiteSpace: 'nowrap',
  backgroundColor: 'background.paper'
};

/**
 * Fixed header section styles
 */
export const fixedHeaderSectionStyles: SxProps<Theme> = {
  flexShrink: 0
};

/**
 * Fixed footer pagination styles
 */
export const fixedFooterPaginationStyles: SxProps<Theme> = {
  flexShrink: 0,
  borderTop: (theme) => `1px dashed ${theme.palette.divider}`,
  backgroundColor: 'background.paper',
  zIndex: 1,
};

/**
 * Sticky breadcrumbs styles
 */
export const stickyBreadcrumbsStyles: SxProps<Theme> = {
  mb: { xs: 0.5 },
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: 'background.default',
  py: 0.25
};

/**
 * Table tabs styles for filters
 */
export const tableTabsStyles: SxProps<Theme> = {
  px: { xs: 0.75, md: 1.5 },
  boxShadow: (theme) =>
    `inset 0 -2px 0 0 ${theme.palette.grey[500]}33`, // 33 is hex for 20% opacity
  '& .MuiTabs-indicator': {
    backgroundColor: 'primary.main',
    height: '2px',
  },
  '& .MuiTab-root': {
    fontWeight: 500,
    color: 'text.secondary',
    minWidth: { xs: 'auto', md: 160 },
    fontSize: { xs: '0.875rem', md: '1rem' },
    '&.Mui-selected': {
      color: 'primary.main',
    },
  },
};

/**
 * Calculate dynamic minimum width based on visible columns
 */
export const calculateTableMinWidth = (
  columns: Array<{ width?: number }>,
  defaultColumnWidth = 150
): number => {
  if (!columns || columns.length === 0) {
    return 1200; // Default minimum width
  }
  return Math.max(
    1200,
    columns.reduce((acc, col) => acc + (col.width || defaultColumnWidth), 0)
  );
};

/**
 * Common table configuration object
 */
export const commonTableConfig = {
  stickyHeader: true,
  size: 'medium' as const,
  defaultRowsPerPage: 10,
  rowsPerPageOptions: [5, 10, 25, 50],
};

/**
 * Table cell width configurations for common column types
 */
export const commonColumnWidths = {
  id: 150,
  name: 200,
  email: 250,
  brand: 150,
  group: 120,
  role: 200,
  status: 100,
  employeeStatus: 180,
  action: 80,
  checkbox: 60,
};

/**
 * Utility function to create consistent column definitions
 */
export const createColumnDefinition = (
  id: string,
  label: string,
  options: {
    width?: number;
    visible?: boolean;
    disableToggle?: boolean;
    align?: 'left' | 'center' | 'right';
  } = {}
) => ({
  id,
  label,
  width: options.width || commonColumnWidths[id as keyof typeof commonColumnWidths] || 150,
  visible: options.visible ?? true,
  disableToggle: options.disableToggle ?? false,
  align: options.align || 'left',
});