import type { IProjectItem } from 'src/types/admin/feature/project';

import React from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { useRouter } from 'src/routes/hooks';

import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { formatPercentage } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IProjectItem;
  selected: boolean;
  columnVisibility?: Record<string, boolean>;
}>;

export function ProjectTableRow({ row, selected, columnVisibility = {} }: Props) {
  const quickEditForm = useBoolean();
  const router = useRouter();
  const panelPaths = useAdminPanelPaths();

  const handleEdit = () => {
    router.push(panelPaths.project.edit(row?.projectId.toString()));
  };

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {columnVisibility.projectName !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.projectName || ''}</TableCell>
      )}

      {columnVisibility.city !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.city || '-'}</TableCell>
      )}

      {columnVisibility.brand !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.brand || ''}</TableCell>
      )}
      {columnVisibility.reraRegularization !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatPercentage(row?.reraRegularization)}
        </TableCell>
      )}

      {columnVisibility.reraPayable !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatPercentage(row?.reraPayable)}
        </TableCell>
      )}

      {columnVisibility.rtmRegularization !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatPercentage(row?.rtmRegularization)}
        </TableCell>
      )}

      {columnVisibility.rtmPayable !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatPercentage(row?.rtmPayable)}
        </TableCell>
      )}
      {columnVisibility.actions !== false && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Edit" placement="top" arrow enterTouchDelay={0}>
              <IconButton
                color={quickEditForm.value ? 'inherit' : 'default'}
                onClick={() => handleEdit()}
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