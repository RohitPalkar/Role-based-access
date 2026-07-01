import type { EmployeeList } from 'src/types/finance-admin/employee-list';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Box, Link, Stack, Tooltip, IconButton, Typography } from '@mui/material';

import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { formatIndianCurrency } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = Readonly<{
  row: EmployeeList;
  selected: boolean;
  editHref: string;
  columnVisibility?: Record<string, boolean>;
}>;

export function EmployeeListTableRow({ row, selected, editHref, columnVisibility = {} }: Props) {
  const quickEditForm = useBoolean();

  // Early return if row is null or undefined
  if (!row) {
    return null;
  }

  return (
    <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
      {/* Employee ID */}
      {columnVisibility.empId !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Link component={RouterLink} href={editHref} color="inherit" sx={{ cursor: 'pointer', textDecoration: 'none' }}>
            {row?.userId}
          </Link>
        </TableCell>
      )}

     {( columnVisibility.name !== false) && (
         <TableCell sx={{ whiteSpace: 'nowrap' }}>
             {row?.name || '-'}
         </TableCell>
       )}
 
       {( columnVisibility.email !== false) && (
         <TableCell sx={{ whiteSpace: 'nowrap' }}>
           <Typography variant="body2" color="text.primary">
             {row?.email || '-'}
           </Typography>
         </TableCell>
       )}
      {/* Role */}
      {columnVisibility.role !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.roleName}</TableCell>
      )}

      {/* Employment Status */}
      {columnVisibility.employeeStatus !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {row?.employeeStatus ? (
              <>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: row?.employeeStatus === 'Available' ? 'success.dark' : 'error.dark',
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

      {/* Salary */}
      {columnVisibility.salary !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.salary ? `₹ ${formatIndianCurrency(Number(row?.salary))}` : '-'}
        </TableCell>
      )}

      {/* Accruals */}
      {columnVisibility.accruals !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {row?.accruals ? `₹ ${formatIndianCurrency(Number(row?.accruals))}` : '-'}
        </TableCell>
      )}

      {/* Updated At */}
      {columnVisibility.updatedAt !== false && (
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row?.updatedAt}</TableCell>
      )}

      {/* Action */}
      {columnVisibility.actions !== false && (
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
