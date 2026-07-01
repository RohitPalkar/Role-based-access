import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { InvoiceTableRowItem } from 'src/sections/common-module/internal-office-memo/iom-config';

import Link from '@mui/material/Link';
import { Typography } from '@mui/material';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { formatDateIST } from 'src/utils/helper';

import { Label } from 'src/components/label';

const DATE_COLUMNS = new Set(['invoiceRequestedAt']);

const INVOICE_STATUS_COLOR_MAP: Record<string, string> = {
  Closed: 'default',
  Requested: 'warning',
  Pending: 'warning',
  Raised: 'info',
};

const getDisplayValue = (value?: string | number | boolean | null) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return value;
};

const formatCellValue = (colId: string, value?: string | number | boolean | null) => {
  if (DATE_COLUMNS.has(colId)) {
    return formatDateIST(value as string | null, { hideTime: true });
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if ((colId === 'sumOfIomAmount' || colId === 'amountWithGst') && typeof value === 'number') {
    return value.toLocaleString('en-IN');
  }

  return value;
};

type Props = Readonly<{
  row: InvoiceTableRowItem;
  visibleColumns: ColumnDefinition[];
  userRole: string | null;
}>;

export function InvoiceTableRow({ row, visibleColumns, userRole }: Props) {

  const renderCell = (col: ColumnDefinition) => {
    if (col.id === 'invoiceNumber') {
      const {invoiceNumber} = row;

      if (!invoiceNumber) {
        return (
          <TableCell key={col.id}>
            <Typography noWrap variant="body2">
              -
            </Typography>
          </TableCell>
        );
      }

      return (
        <TableCell key={col.id}>
          <Link
            component="button"
            type="button"
            underline="always"
            variant="body2"
            sx={{ textAlign: 'left' }}
          >
            {invoiceNumber}
          </Link>
        </TableCell>
      );
    }

    if (col.id === 'invoiceStatus') {
      const status = row.invoiceStatus;

      return (
        <TableCell key={col.id}>
          {status ? (
            <Label variant="soft" color={(INVOICE_STATUS_COLOR_MAP[status] || 'default') as 'default'}>
              {status}
            </Label>
          ) : (
            <Typography noWrap variant="body2">
              -
            </Typography>
          )}
        </TableCell>
      );
    }

    const value = row[col.id as keyof InvoiceTableRowItem];

    return (
      <TableCell key={col.id}>
        <Typography noWrap variant="body2">
          {getDisplayValue(formatCellValue(col.id, value as string | number | boolean | null))}
        </Typography>
      </TableCell>
    );
  };

  return (
    <TableRow hover tabIndex={-1} sx={{ height: '40px' }}>
      {visibleColumns.map((col) => renderCell(col))}
    </TableRow>
  );
}
