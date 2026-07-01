import type { IBookingItem } from 'src/types/admin/feature/user-bookings';

import dayjs from 'dayjs';
import { useBoolean } from 'minimal-shared/hooks';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import { Stack, Typography } from '@mui/material';

import { formatPercentage, formatNumberWithCommas } from 'src/utils/helper';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { isCheckable } from 'src/components/date-range-format/utils';

import { unitStatuses } from './reports-common';
import { UserQuickEditForm } from './bookings-edit-dialogue';
// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IBookingItem;
  index?: number;
  reset?: any;
  columnVisibility?: Record<string, boolean>;
  table?: any;
  currentFilters?: any;
}>;

export function BookingTableRow({
  row,
  index,
  reset,
  columnVisibility,
  table,
  currentFilters
}: Props) {
  const quickEdit = useBoolean();

  const isColumnVisible = (columnId: string) => {
    if (!columnVisibility || typeof columnVisibility !== 'object') {
      return true;
    }
    return columnVisibility[columnId] !== false;
  };

  dayjs.extend(customParseFormat);

  /**
   * Converts dates like "DDth MM YYYY" to "DD-MM-YYYY"
   * @param rawDateString string in human-readable format with suffixes
   * @returns string in DD-MM-YYYY format or '-' if invalid
   */
  function formatToDDMMYYYY(rawDateString: string): string {
    if (!rawDateString) return '\u00A0\u00A0-\u00A0\u00A0';

    const cleaned = rawDateString.replace(/(\d{1,10})(st|nd|rd|th)/, '$1');
    const parsed = dayjs(cleaned, 'D MMM YYYY');

    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : '\u00A0\u00A0-\u00A0\u00A0';
  }

  return (
    <>
      <TableRow hover tabIndex={-1} key={row?.id || 'unknown'}>
       {isColumnVisible('rmName') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
            {row?.rmName || '\u00A0\u00A0-\u00A0\u00A0'}
          </TableCell>
        )}

        {isColumnVisible('unitStatus') && (
          <TableCell>
            <Label
              variant="soft"
              color={
                (row?.unitStatus === unitStatuses.regularized && 'primary') ||
                (row?.unitStatus === unitStatuses.unregularized && 'warning') ||
                (row?.unitStatus === unitStatuses.qualified && 'success') ||
                (row?.unitStatus === unitStatuses.disqualified && 'error') ||
                (row?.unitStatus === unitStatuses.cancelled && 'secondary') ||
                'default'
              }
            >
              {row?.unitStatus || '-'}
            </Label>
          </TableCell>
        )}

        {isColumnVisible('customerName') && (
          <TableCell sx={{ whiteSpace: 'wrap', minWidth: '150px' }}>
            {row?.customerName || '\u00A0\u00A0-\u00A0\u00A0'}
          </TableCell>
        )}

        {isColumnVisible('projectName') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
            {row?.projectName || '\u00A0\u00A0-\u00A0\u00A0'}
            
          </TableCell>
        )}

     {isColumnVisible('propertyNo') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
            <Typography variant="body2" color="text.secondary">
              {row?.propertyNo || '\u00A0\u00A0-\u00A0\u00A0'}
            </Typography>
          </TableCell>
        )}
        {isColumnVisible('bookingDate') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {formatToDDMMYYYY(row?.bookingDate || '-')}
          </TableCell>
        )}
          {isColumnVisible('sapBookingDate') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {formatToDDMMYYYY(row?.sapBookingDate || '-')}
          </TableCell>
        )}

        {isColumnVisible('agreementReceivedDate') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {formatToDDMMYYYY(row?.agreementReceivedDate || '-')}
          </TableCell>
        )}

        {isColumnVisible('receivedDate') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {formatToDDMMYYYY(row?.receivedDate || '-')}
          </TableCell>
        )}

        {isColumnVisible('qualificationDate') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {formatToDDMMYYYY(row?.qualificationDate || '-')}
          </TableCell>
        )}
        {isColumnVisible('incentiveAmount') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
            {row?.incentiveAmount ? `₹ ${formatNumberWithCommas(row?.incentiveAmount)}` : '-'}
          </TableCell>
        )}
        {isColumnVisible('paidDate') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {formatToDDMMYYYY(row?.paidDate || '-')}
          </TableCell>
        )}

        {isColumnVisible('receivedPercentage') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '100px' }}>
            {formatPercentage(row?.receivedPercentage)}
          </TableCell>
        )}

        {isColumnVisible('grossTotalValue') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
            {row?.grossTotalValue ? `₹ ${formatNumberWithCommas(row?.grossTotalValue)}` : '-'}
          </TableCell>
        )}

        {isColumnVisible('incentivePercentage') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '100px' }}>
            {formatPercentage(row?.incentivePercentage)}
          </TableCell>
        )}





        {isColumnVisible('paymentStatus') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {row?.paymentStatus || '\u00A0\u00A0-\u00A0\u00A0'}
          </TableCell>
        )}
      {isColumnVisible('cancellationDate') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {formatToDDMMYYYY(row?.cancellationDate || '-')}
          </TableCell>
        )}
                {isColumnVisible('stage') && (
          <TableCell sx={{ whiteSpace: 'wrap', minWidth: '100px' }}>
            {row?.stage || '-'}
          </TableCell>
        )}

        {isColumnVisible('saleType') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
            {row?.saleType || '-'}
          </TableCell>
        )}
      {isColumnVisible('ineligibilityReason') && (
          <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '120px' }}>
            {row?.ineligibilityReason || '\u00A0\u00A0-\u00A0\u00A0'}
          </TableCell>
        )}
        {isColumnVisible('actions') && (
          <TableCell>
            <Stack direction="row" alignItems="center">
              <Tooltip title="Update payment status" placement="top" arrow enterTouchDelay={0}>
                <IconButton
                  disabled={
                    !isCheckable({
                      paymentStatus: row?.paymentStatus,
                      unitStatus: row?.unitStatus,
                    })
                  }
                  color={quickEdit.value ? 'inherit' : 'default'}
                  onClick={quickEdit.onTrue}
                >
                  <Iconify icon="solar:pen-bold" sx={{ color: !isCheckable({
                      paymentStatus: row?.paymentStatus,
                      unitStatus: row?.unitStatus,
                    }) ? 'disabled.text' : 'black' }}/>
                </IconButton>
              </Tooltip>
            </Stack>
          </TableCell>
          
        )}
        
      </TableRow>
      {row && (
        <UserQuickEditForm
          currentUser={row}
          open={quickEdit.value}
          onClose={quickEdit.onFalse}
          editIds={[row?.id]}
          reset={reset}
          table={table}
          currentFilters={currentFilters}
        />
      )}
    </>
  );
}