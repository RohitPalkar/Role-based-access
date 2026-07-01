import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { ILeaderBoardSummaryItem } from 'src/types/admin/feature/leader-board-rmSummary';

import { Typography } from '@mui/material';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';



// ----------------------------------------------------------------------

type Props = Readonly<{
  row: ILeaderBoardSummaryItem;
  selected: boolean;
  onSelectRow: () => void;
  visibleColumns: ColumnDefinition[];
  columnVisibility: Record<string, boolean> | undefined;
}>;

export function LeaderBoardRMSummaryTableRow({ row, selected, onSelectRow, visibleColumns, columnVisibility }: Props) {
  
  const isColumnVisible = (columnId: string) => {
    if (!columnVisibility || typeof columnVisibility !== 'object') {
      return true;
    }
    return columnVisibility[columnId] !== false;
  };

  // Early return if row is null/undefined
  if (!row) {
    return null;
  }

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1} key={row?.id || 'unknown'}>
      {isColumnVisible('srNo') && (
        <TableCell sx={{ whiteSpace: 'nowrap', py: 2, px: 2}}>
          <Typography variant="body2" color="text.primary" sx={{lineHeight:'36px'}} >
            {row?.srNo || '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('rmName') && (
        <TableCell sx={{ whiteSpace: 'nowrap', py: 2, px: 2 }}>
          <Typography variant="body2" color="text.primary" sx={{lineHeight:'36px'}} >
            {row?.rmName || '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('totalBookings') && (
        <TableCell sx={{ whiteSpace: 'nowrap', py: 1.5, px: 2 }}>
          <Typography variant="body2" color="text.primary">
            {row?.totalBookings || '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('totalAgreementValue') && (
        <TableCell sx={{ whiteSpace: 'nowrap', py: 1.5, px: 2 }}>
          <Typography variant="body2" color="text.primary">
            {row?.totalAgreementValue ? `₹ ${Number(row?.totalAgreementValue).toLocaleString('en-IN')}` : '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('totalIncentiveAmount') && (
        <TableCell sx={{ whiteSpace: 'nowrap', py: 1.5, px: 2 }}>
          <Typography variant="body2" color="text.primary">
            {row?.totalIncentiveAmount ? `₹ ${Number(row?.totalIncentiveAmount).toLocaleString('en-IN')}` : '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('percentageReceived') && (
        <TableCell sx={{ whiteSpace: 'nowrap', py: 1.5, px: 2 }}>
          <Typography variant="body2" color="text.primary">
            {row?.percentageReceived ? `${row?.percentageReceived}%` : '-'}
          </Typography>
        </TableCell>
      )}
    </TableRow>
  );
}
