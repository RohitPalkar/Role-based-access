import type { Theme, SxProps } from '@mui/material/styles';
import type { TablePaginationProps } from '@mui/material/TablePagination';

import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';

// ----------------------------------------------------------------------

export type TablePaginationCustomProps = TablePaginationProps & {
  dense?: boolean;
  sx?: SxProps<Theme>;
  onChangeDense?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showResultsCount?: boolean;
  totalResults?: number;
};

export function TablePaginationCustom({
  sx,
  dense,
  onChangeDense,
  showResultsCount = false,
  totalResults,
  rowsPerPageOptions = [5, 10, 25],
  ...other
}: TablePaginationCustomProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 1 },
        py: { xs: 0.5, sm: 0.25 }, // More padding on mobile
        minHeight: { xs: 36, sm: 28 }, // Taller on mobile
        ...sx,
      }}
    >
      {/* LEFT: Results Found */}
      {showResultsCount && (
        <Box
          sx={{
            fontSize: { xs: '0.8125rem', sm: '0.7rem' }, // 13px for mobile, smaller for desktop
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            lineHeight: 1.2,
          }}
        >
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {totalResults || 0}
          </Box>{' '}
          Results found
        </Box>
      )}

      {/* RIGHT: Pagination Controls */}
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        {...other}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`
        }
        sx={{
          '& .MuiTablePagination-toolbar': {
            minHeight: { xs: '32px', sm: '24px' }, // Taller on mobile
            padding: { xs: '0 4px', sm: '0 2px' }, // More padding on mobile
            gap: { xs: 1, sm: 0.5 },
            flexWrap: 'nowrap',
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
            margin: 0,
            fontSize: { xs: '0.8125rem', sm: '0.7rem' }, // 13px for mobile, smaller for desktop
            lineHeight: 1.2,
          },
          '& .MuiInputBase-root': {
            fontSize: { xs: '0.8125rem', sm: '0.7rem' }, // 13px for mobile, smaller for desktop
            height: { xs: 28, sm: 24 }, // Slightly taller on mobile
            minHeight: { xs: 28, sm: 24 },
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiIconButton-root': {
            padding: '2px', // More compact padding
            width: 24,
            height: 24,
          },
          '& .MuiSelect-select': {
            paddingTop: '2px',
            paddingBottom: '2px',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1,
            minHeight: 'auto',
          },
          '& .MuiSelect-root': {
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiSelect-icon': {
            top: '50%',
            transform: 'translateY(-50%)',
            right: 2,
            width: 14,
            height: 14,
          },
        }}
      />
    </Box>
  );
}
