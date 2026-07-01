import { TableRow, TableCell, Typography } from '@mui/material';

import { formatNumberWithCommas } from 'src/utils/helper';

// ----------------------------------------------------------------------

type Props = Readonly<{
  columnVisibility?: Record<string, boolean>;
  totals?: {
    grossTotalValueSum?: number;
    incentiveAmountSum?: number;
  };
}>;

export function BookingTableTotalRow({ columnVisibility, totals }: Props) {
  const isColumnVisible = (columnId: string) => {
    if (!columnVisibility || typeof columnVisibility !== 'object') {
      return true;
    }
    return columnVisibility[columnId] !== false;
  };

  return (
    <TableRow
      sx={{
        backgroundColor: (theme) => theme.palette.grey[50],
        '& .MuiTableCell-root': {
          borderTop: (theme) => `2px solid ${theme.palette.divider}`,
          fontWeight: 'bold',
        },
      }}
    >
      {/* RM Name */}
      {isColumnVisible('rmName') && (
        <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            TOTAL
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('unitStatus') && <TableCell />}
      {isColumnVisible('customerName') && <TableCell />}
      {isColumnVisible('projectName') && <TableCell />}
      {isColumnVisible('propertyNo') && <TableCell />}
      {isColumnVisible('bookingDate') && <TableCell />}
      {isColumnVisible('sapBookingDate') && <TableCell />}
      {isColumnVisible('agreementReceivedDate') && <TableCell />}
      {isColumnVisible('receivedDate') && <TableCell />}
      {isColumnVisible('qualificationDate') && <TableCell />}

      {/* Incentive Payable (moved before Paid Date) */}
      {isColumnVisible('incentiveAmount') && (
        <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {totals?.incentiveAmountSum ? `₹ ${formatNumberWithCommas(totals.incentiveAmountSum)}` : '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('paidDate') && <TableCell />}
      {isColumnVisible('receivedPercentage') && <TableCell />}

      {/* Agreement Value */}
      {isColumnVisible('grossTotalValue') && (
        <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '150px' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {totals?.grossTotalValueSum ? `₹ ${formatNumberWithCommas(totals.grossTotalValueSum)}` : '-'}
          </Typography>
        </TableCell>
      )}

      {isColumnVisible('incentivePercentage') && <TableCell />}
      {isColumnVisible('paymentStatus') && <TableCell />}
      {isColumnVisible('cancellationDate') && <TableCell />}

      {/* Stage and Sale Type moved after cancellationDate */}
      {isColumnVisible('stage') && <TableCell />}
      {isColumnVisible('saleType') && <TableCell />}

      {isColumnVisible('ineligibilityReason') && <TableCell />}
      {isColumnVisible('actions') && <TableCell />}
    </TableRow>
  );
}
