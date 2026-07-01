import type { IBoosterItem } from 'src/types/admin/feature/booster';

import React from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { RouterLink } from 'src/routes/components';

import { joinWithoutDuplicates } from 'src/utils/helper';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IBoosterItem;
  selected: boolean;
  editHref: string;
  columnVisibility?: Record<string, boolean>;
  readOnly?: boolean;
}>;

export function BoosterTableRow({ row, selected, editHref, columnVisibility, readOnly = false }: Props) {
  const quickEditForm = useBoolean();

  const isColumnVisible = (columnId: string) => {
    if (!columnVisibility || typeof columnVisibility !== 'object') {
      return true;
    }
    return columnVisibility[columnId] !== false;
  };

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1} key={row?.id || 'unknown'}>
      {isColumnVisible('name') && (
        <TableCell>
          <Stack sx={{ typography: 'body2', flex: '1 1 auto', alignItems: 'flex-start' }}>
            {readOnly ? (
              <Typography component="span" variant="body2">
                {row?.name || '-'}
              </Typography>
            ) : (
              <Link component={RouterLink} href={editHref} color="inherit" sx={{ cursor: 'pointer' }}>
                {row?.name || '-'}
              </Link>
            )}
          </Stack>
        </TableCell>
      )}

      {isColumnVisible('project') && (
        <TableCell sx={{ whiteSpace: 'wrap' }}>{joinWithoutDuplicates(row?.projects)}</TableCell>
      )}

      {isColumnVisible('city') && (
        <TableCell sx={{ whiteSpace: 'wrap' }}>{joinWithoutDuplicates(row?.city)}</TableCell>
      )}
      
      {isColumnVisible('brand') && (
        <TableCell sx={{ whiteSpace: 'wrap' }}>{joinWithoutDuplicates(row?.brand)}</TableCell>
      )}

      {isColumnVisible('duration') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.duration || '-'}</TableCell>
      )}

      {isColumnVisible('status') && (
        <TableCell>
          <Label
            variant="soft"
            color={
              (row?.status === 'active' && 'success') ||
              (row?.status === 'inactive' && 'warning') ||
              (row?.status === 'banned' && 'error') ||
              'default'
            }
          >
            {row?.status || 'Unknown'}
          </Label>
        </TableCell>
      )}

      {isColumnVisible('actions') && !readOnly && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Edit" placement="top" arrow enterTouchDelay={0}>
              <IconButton
                component={RouterLink}
                color={quickEditForm.value ? 'inherit' : 'default'}
                href={editHref}
              >
                <Iconify icon="solar:pen-bold" sx={{ color: 'black' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      )}
    </TableRow>
  );
}
