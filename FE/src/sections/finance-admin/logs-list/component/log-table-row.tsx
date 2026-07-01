import type { LogItems } from 'src/types/admin/feature/logs';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import InfoIcon from '@mui/icons-material/Info';
import { Stack , Tooltip, Typography, IconButton } from '@mui/material';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: LogItems;
  selected: boolean;
  columnVisibility?: Record<string, boolean>;
}>;

export function LogTableRow({ row, selected, columnVisibility = {} }: Props) {
  // Early return if row is null or undefined
  if (!row) {
    return null;
  }

  const isColumnVisible = (columnId: string) => {
    if (!columnVisibility || typeof columnVisibility !== 'object') {
      return true;
    }
    return columnVisibility[columnId] !== false;
  };

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {isColumnVisible('empId') && (
        <TableCell sx={{ wordBreak: 'break-word', maxWidth: 0 }}>
         <Typography variant="body2" color="text.primary" sx={{lineHeight:'36px'}}>
          {row?.empId || '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('name') && (
        <TableCell sx={{ wordBreak: 'break-word', maxWidth: 0 }}>
          {row?.name || '-'}
        </TableCell>
      )}

      {isColumnVisible('email') && (
        <TableCell sx={{ wordBreak: 'break-word', maxWidth: 0 }}>
          {row?.email || '-'}
        </TableCell>
      )}

      {isColumnVisible('fileName') && (
        <TableCell sx={{ wordBreak: 'break-word', maxWidth: 0 }}>
          {row?.fileName || '-'}
        </TableCell>
      )}

      {isColumnVisible('createdAt') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.createdAt || '-'}
        </TableCell>
      )}

      {isColumnVisible('status') && (
        <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Label variant="soft" color={row?.status === 'Successful' ? 'success' : 'error'}>
              {row?.status !== 'Successful' ? 'Unsuccessful' : row?.status || '-'}
            </Label>
            {row?.status !== 'Successful' && (
              <Tooltip title={row?.status || 'Error'} arrow enterTouchDelay={0}>
                <IconButton size="small">
                  <InfoIcon sx={{ fontSize: '18px' }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      )}
    </TableRow>
  );
}
