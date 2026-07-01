import type { IIncentiveStructureItem } from 'src/types/admin/feature/incentive-structure';

import React from 'react'
import { useBoolean } from 'minimal-shared/hooks';

import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { Stack, MenuItem, MenuList } from '@mui/material';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { joinWithoutDuplicates } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import Edit from '../../../../../public/assets/icons/pen-shape.svg';
import Copy from '../../../../../public/assets/icons/copy-link.svg';


// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IIncentiveStructureItem;
  selected: boolean;
  editHref: string;
  columnVisibility?: Record<string, boolean>;
  /** When true, name is plain text and row actions are hidden (view-only roles). */
  readOnly?: boolean;
}>;

export function IncentiveStructureTableRow({
  row,
  selected,
  editHref,
  columnVisibility = {},
  readOnly = false,
}: Props) {

  const confirm = useBoolean();
  const popover = usePopover();
  const router = useRouter();
  const panelPaths = useAdminPanelPaths();
  // Early return if row is null or undefined
  if (!row?.id) {
    console.warn('IncentiveStructureTableRow: Invalid row data', row);
    return null;
  }

  const isColumnVisible = (columnId: string) => {
    if (!columnVisibility || typeof columnVisibility !== 'object') {
      return true;
    }
    return columnVisibility[columnId] !== false;
  };

  // Safely get status from row data
  const getStatus = () => {
    if (row?.status) return row?.status;
    if (typeof row?.active === 'boolean') return row?.active ? 'Active' : 'Inactive';
    return 'Unknown';
  };

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {isColumnVisible('name') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {readOnly ? (
            <Typography component="span" variant="body2">
              {row?.name || '-'}
            </Typography>
          ) : (
            <Link
              component={RouterLink}
              href={editHref}
              color="inherit"
              sx={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              {row?.name || '-'}
            </Link>
          )}
        </TableCell>
      )}

      {isColumnVisible('duration') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.duration || '-'}</TableCell>
      )}

      {isColumnVisible('brand') && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {(() => {
            try {
              if (!row?.brandName) return '-';

              if (Array.isArray(row?.brandName)) {
                return joinWithoutDuplicates(row?.brandName);
              }

              if (typeof row?.brandName === 'object' && row?.brandName?.name) {
                return row?.brandName.name;
              }

              if (typeof row?.brandName === 'string') {
                return row?.brandName;
              }

              return '-';
            } catch (error) {
              console.error('Error processing brandName:', error, row?.brandName);
              return '-';
            }
          })()}
        </TableCell>
      )}

      {isColumnVisible('status') && (
        <TableCell>
          <Label
            variant="soft"
            color={getStatus().toLowerCase() === 'active' ? 'success' : 'warning'}
          >
            {getStatus()}
          </Label>
        </TableCell>
      )}

      {isColumnVisible('actions') && !readOnly && (
        <TableCell>
          <Stack direction="row" alignItems="center">
            <Tooltip title="Action">
              <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      )}

      {!readOnly && (
        <CustomPopover
          open={popover.open}
          anchorEl={popover.anchorEl}
          onClose={popover.onClose}
          slotProps={{ arrow: { placement: 'right-top' } }}
        >
          <MenuList>
            <MenuItem
              onClick={() => {
                confirm.onTrue();
                popover.onClose();
                router.push(panelPaths.incentiveStructure.edit(String(row?.id || '')));
              }}
            >
              <img src={Edit} style={{ height: '20px', width: '20px' }} alt="edit" />
              {uiText.common.edit}
            </MenuItem>

            <MenuItem
              onClick={() => {
                confirm.onTrue();
                popover.onClose();
                router.push(`${panelPaths.incentiveStructure.create}?copyId=${row.id}`);
              }}
            >
              <img src={Copy} style={{ height: '20px', width: '20px' }} alt="edit" />
              {uiText.common.copy}
            </MenuItem>
          </MenuList>
        </CustomPopover>
      )}
    </TableRow>
  );
}
