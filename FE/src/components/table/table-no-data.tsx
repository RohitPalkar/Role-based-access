import type { Theme, SxProps } from '@mui/material/styles';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import emptyIcon from 'src/assets/icons/ic-content.svg';

import { EmptyContent } from '../empty-content';

// ----------------------------------------------------------------------

export type TableNoDataProps = Readonly<{
  notFound: boolean | string;
  sx?: SxProps<Theme>;
  colSpan?: number;
}>;

export function TableNoData({ notFound, sx, colSpan = 12 }: TableNoDataProps) {
  return (
    <TableRow>
      {notFound ? (
        <TableCell colSpan={colSpan}>
          <EmptyContent filled sx={{ py: 10, ...sx }} imgUrl={emptyIcon} />
        </TableCell>
      ) : (
        <TableCell colSpan={colSpan} sx={{ p: 0 }} />
      )}
    </TableRow>
  );
}
