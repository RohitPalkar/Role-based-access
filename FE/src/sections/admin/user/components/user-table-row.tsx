import type { IUserItem } from 'src/types/admin/feature/user';

import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { Typography } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { EMPLOYMENT_STATUS } from 'src/utils/constant';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: IUserItem;
  selected: boolean;
  editHref: string;
  columnVisibility?: Record<string, boolean>;
  /** When true, name is plain text and edit control is hidden (e.g. BIS read-only user list). */
  disableEditLink?: boolean;
}>;

export function UserTableRow({
  row,
  selected,
  editHref,
  columnVisibility,
  disableEditLink = false,
}: Props) {
  const quickEditForm = useBoolean();
  const router = useRouter();

  const handleEdit = () => {
    if (editHref) router.push(editHref);
  };

  // Early return if row is null/undefined
  if (!row) {
    return null;
  }

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {(!columnVisibility || columnVisibility.id !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.EmpId || '-'}</TableCell>
      )}

      {(!columnVisibility || columnVisibility.name !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {disableEditLink ? (
            <Typography variant="body2" color="text.primary">
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

      {(!columnVisibility || columnVisibility.email !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2" color="text.primary">
            {row?.email || '-'}
          </Typography>
        </TableCell>
      )}

      {(!columnVisibility || columnVisibility.brand !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.brand || '-'}</TableCell>
      )}

      {(!columnVisibility || columnVisibility.group !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.group?.name || '-'}</TableCell>
      )}

      {(!columnVisibility || columnVisibility.role !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.role || '-'}</TableCell>
      )}

      {(!columnVisibility || columnVisibility.status !== false) && (
        <TableCell>
          <Label variant="soft" color={row?.status === 'active' ? 'success' : 'warning'}>
            {row?.status === 'active' ? 'Active' : 'Inactive'}
          </Label>
        </TableCell>
      )}

      {(!columnVisibility || columnVisibility.employeeStatus !== false) && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {row?.employeeStatus ? (
              <>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor:
                      row?.employeeStatus === EMPLOYMENT_STATUS.AVAILABLE
                        ? 'success.dark'
                        : 'error.dark',
                  }}
                />
                <Box component="span">{row?.employeeStatus}</Box>
              </>
            ) : (
              '-'
            )}
          </Stack>
        </TableCell>
      )}

      {!disableEditLink && (!columnVisibility || columnVisibility.Action !== false) && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={`${row?.status === 'active' ? 'Edit' : ' User is Inactive'}`} placement="top" arrow enterTouchDelay={0}>
              <span>
                <IconButton
                  disabled={row?.status !== 'active'}
                  color={quickEditForm.value ? 'inherit' : 'default'}
                  onClick={handleEdit}
                >
                  <Iconify icon="solar:pen-bold" sx={{ color: row?.status !== 'active' ? 'disabled.text' : 'black' }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </TableCell>
      )}
    </TableRow>
  );
}
