import type { ReportsUserItem } from 'src/types/admin/feature/reports-user';

import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { useRouter } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';
import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { fetchUserDetails } from 'src/redux/actions/admin/reports-user-actions';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: ReportsUserItem;
  selected: boolean;
  columnVisibility?: Record<string, boolean>;
}>;

export function ReportsUserTableRow({ row, selected, columnVisibility }: Props) {
  const quickEditForm = useBoolean();
  const router = useRouter();
  const panelPaths = useAdminPanelPaths();
  const dispatch = useAppDispatch();

  const isColumnVisible = (columnId: string) => {
    if (!columnVisibility || typeof columnVisibility !== 'object') {
      return true;
    }
    return columnVisibility[columnId] !== false;
  };

  const handleEdit = () => {
    router.push(panelPaths.reports.users.edit(row?.id?.toString()));
    dispatch(fetchUserDetails(row));
  };

  return (
    <TableRow
      hover
      selected={selected}
      aria-checked={selected}
      tabIndex={-1}
      key={row?.id || 'unknown'}
    >
      {isColumnVisible('id') && (
        <TableCell sx={{ whiteSpace: 'nowrap', pl: 2 }}>{row?.empCode || '-'}</TableCell>
      )}

      {(!columnVisibility || columnVisibility.name !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.name || '-'}</TableCell>
      )}

      {(!columnVisibility || columnVisibility.email !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2" color="text.primary">
            {row?.email || '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('incentivePaidYTD') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.incentivePaidYTD ? `₹ ${row?.incentivePaidYTD}` : '-'}
        </TableCell>
      )}

      {isColumnVisible('incentivePayable') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.incentivePayable ? `₹ ${row?.incentivePayable}` : '-'}
        </TableCell>
      )}

      {isColumnVisible('incentivePaid') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.incentivePaid ? `₹ ${row?.incentivePaid}` : '-'}
        </TableCell>
      )}

      {isColumnVisible('bookingAmountYTD') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.bookingAmountYTD ? `₹ ${row?.bookingAmountYTD} Cr` : '-'}
        </TableCell>
      )}

      {isColumnVisible('collectedAmountYTD') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.collectedAmountYTD ? `₹ ${row?.collectedAmountYTD} Cr` : '-'}
        </TableCell>
      )}
      {isColumnVisible('totalBookings') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.totalBookings ?? '-'}</TableCell>
      )}

      {isColumnVisible('qualifiedBookings') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.qualifiedBookings ?? '-'}</TableCell>
      )}

      {isColumnVisible('disqualifiedBookings') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.disqualifiedBookings ?? '-'}</TableCell>
      )}

      {isColumnVisible('cancelledBookings') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.cancelledBookings ?? '-'}</TableCell>
      )}

      {isColumnVisible('regularisedBookings') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.regularisedBookings ?? '-'}</TableCell>
      )}

      {isColumnVisible('unRegularisedBookings') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.unRegularisedBookings ?? '-'}</TableCell>
      )}
      {isColumnVisible('actions') && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="View" placement="top" arrow>
              <IconButton color={quickEditForm.value ? 'inherit' : 'default'} onClick={handleEdit}>
                <Iconify icon="tabler:eye" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      )}
    </TableRow>
  );
}
