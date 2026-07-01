import type { TableRowProps } from '@mui/material/TableRow';

import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

// ----------------------------------------------------------------------

export function TableSkeleton({ ...other }: TableRowProps) {
  return (
    <TableRow {...other}>
      <TableCell colSpan={12}>
        <Stack spacing={3} direction="row" alignItems="center">
          <Skeleton
            sx={{
              borderRadius: 1.5,
              width: 48,
              height: 48,
              flexShrink: 0,
            }}
          />
          <Skeleton sx={{ width: 1, height: 12 }} />
          <Skeleton sx={{ width: 180, height: 12 }} />
          <Skeleton sx={{ width: 160, height: 12 }} />
          <Skeleton sx={{ width: 140, height: 12 }} />
          <Skeleton sx={{ width: 120, height: 12 }} />
        </Stack>
      </TableCell>
    </TableRow>
  );
}


type TableSkeletonProps = TableRowProps & {
  rowCount?: number;
  cellCount?: number;
};

export function CustomTableSkeleton({ rowCount = 0, cellCount = 0, ...other }: TableSkeletonProps) {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <TableRow key={rowIndex} {...other}>
      {Array.from({ length: cellCount }, (__, cellIndex) => (
        <TableCell key={cellIndex}>
          <Skeleton variant="text" />
        </TableCell>
      ))}
    </TableRow>
  ));
}