import type { IBrandsItem } from 'src/types/admin/feature/brands';

import { useRef } from 'react';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Box, Tooltip, IconButton } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { formatPercentage } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IBrandsItem;
  selected: boolean;
  onRefresh: () => void;
  columnVisibility?: Record<string, boolean>;

}>;

export function BrandTableRow({ row, selected, onRefresh, columnVisibility = {} }: Props) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const panelPaths = useAdminPanelPaths();

  const handleEdit = () => {
    router.push(panelPaths.brand.edit(row?.id.toString()));
  };

  const show = (id: string) => columnVisibility[id] !== false;

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {show('name') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.name}</TableCell>
      )}
      {show('salaryMultiplier') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.salarymultiplier ? `${row?.salarymultiplier}x` : '-'}
        </TableCell>
      )}
      {show('reraRegularization') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatPercentage(row?.reraRegularization)}
        </TableCell>
      )}

      {show('reraPayable') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatPercentage(row?.reraPayable)}
        </TableCell>
      )}

      {show('rtmRegularization') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatPercentage(row?.rtmRegularization)}
        </TableCell>
      )}

      {show('rtmPayable') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatPercentage(row?.rtmPayable)}
        </TableCell>
      )}
      {show('edit') && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Edit" placement="top" arrow enterTouchDelay={0}>
              <IconButton ref={anchorRef} onClick={handleEdit} color="default">
                <Iconify icon="solar:pen-bold" sx={{ color: 'black' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      )}
    </TableRow>
  );
}
