
// eslint-disable-next-line import/no-extraneous-dependencies
import dayjs from 'dayjs';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import InfoIcon from '@mui/icons-material/Info';
import { Box, Tooltip, IconButton, Typography } from '@mui/material';

import { formatPercentage, formatNumberWithCommas } from 'src/utils/helper';

import { Label } from 'src/components/label';

import type { IncentiveDashboardItem } from '../incentive-dashboard-table-view';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IncentiveDashboardItem;
  selected: boolean;
  editHref: string;
  columnVisibility?: Record<string, boolean>;
}>;

export function IncentiveDashTableRow({ row, selected, editHref, columnVisibility = {} }: Props) {
  const isVisible = (columnId: string) => columnVisibility?.[columnId] !== false;
  
  // Safety check for row
  if (!row) {
    return null;
  }

  return (
    <TableRow
      hover
      selected={selected}
      aria-checked={selected}
      tabIndex={-1}
      sx={{ background: row?.flag ? '#fff1e1' : 'inherit' }}
    >
 

      {isVisible('unitStatus') && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center'}}>
            <Label
              variant="soft"
              color={
                (row?.unitStatus === 'Qualified' && 'success') ||
                (row?.unitStatus === 'Regularized' && 'success') ||
                (row?.unitStatus === 'Unregularized' && 'warning') ||
                (row?.unitStatus === 'Disqualified' && 'error') ||
                (row?.unitStatus === 'Cancelled' && 'secondary') ||
                'default'
              }
            >
              {row?.unitStatus || '-'}
            </Label>
            {row?.flag && (
              <Tooltip
                title={row?.message || ''}
                arrow
                color={
                  (row?.unitStatus === 'Qualified' && 'success') ||
                  (row?.unitStatus === 'Regularized' && 'primary') ||
                  (row?.unitStatus === 'Unregularized' && 'warning') ||
                  (row?.unitStatus === 'Disqualified' && 'error') ||
                  (row?.unitStatus === 'Cancelled' && 'secondary') ||
                  'default'
                }
              >
                <IconButton>
                  <InfoIcon sx={{ fontSize: '20px' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      )}

      {isVisible('customerName') && (
        <TableCell sx={{ whiteSpace: 'nowrap',lineHeight:'35px' }}>{row?.customerName || '-'}</TableCell>
      )}

      {isVisible('phaseName') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.unitDetails?.phaseName || '-'}
        </TableCell>
      )}

      {isVisible('propertyNumber') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.unitDetails?.propertyNumber || '-'}
        </TableCell>
      )}


      {isVisible('bookingDate') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.bookingDate ? dayjs(row?.bookingDate).format('DD-MM-YYYY') : '-'}
        </TableCell>
      )}

      {isVisible('agreementReceived') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.agreementReceivedDate ? dayjs(row?.agreementReceivedDate).format('DD-MM-YYYY') : '-'}
        </TableCell>
      )}

      {isVisible('recivedPersentage') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.receivedDate ? dayjs(row?.receivedDate).format('DD-MM-YYYY') : '-'}
        </TableCell>
      )}

      {isVisible('qualifiedDate') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.qualifiedDate ? dayjs(row?.qualifiedDate).format('DD-MM-YYYY') : '-'}
        </TableCell>
      )}

      {isVisible('receivedAmountPercent') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{`${row?.receivedPercent || 0} %`}</TableCell>
      )}

      {isVisible('agreementValue') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          ₹ {formatNumberWithCommas(row?.grossTotalValue) || '-'}
        </TableCell>
      )}

      {isVisible('incentivePercentage') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatPercentage(row?.incentivePercentage)}</TableCell>
      )}

      {isVisible('incentivePayable') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {(row?.incentivePayable?.amount && (
            <Box>
              <Typography variant="body2">
                ₹ {formatNumberWithCommas(row?.incentivePayable.amount)}
              </Typography>
            </Box>
          )) ||
            '-'}
        </TableCell>
      )}

      {isVisible('paymentStatus') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.paymentStatus || '-'}</TableCell>
      )}

      {isVisible('stage') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.stage || '-'}</TableCell>
      )}
    </TableRow>
  );
}
