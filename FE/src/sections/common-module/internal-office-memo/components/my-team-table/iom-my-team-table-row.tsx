import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { IomMyTeamRowItem } from 'src/sections/common-module/internal-office-memo/iom-config';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Stack, Tooltip, IconButton, Typography } from '@mui/material';

import { formatDateIST } from 'src/utils/helper';
import { MyTeamStatus } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

type Props = Readonly<{
  row: IomMyTeamRowItem;
  visibleColumns: ColumnDefinition[];
  roleActions: { id?: string; label?: string }[];
  onEditClick?: (row: IomMyTeamRowItem) => void;
}>;

const getStatusColor = (status?: string) => {
  if (status === MyTeamStatus.AVAILABLE) return 'success';
  if (status === MyTeamStatus.UNAVAILABLE) return 'warning';

  return 'default';
};

const getDisplayValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '-';

  return value;
};

const formatDateTimeCell = (value?: string | null) => {
  if (!value) return '-';

  return formatDateIST(value, { hideTime: false }) || '-';
};

export function IomMyTeamTableRow({ row, visibleColumns, roleActions, onEditClick }: Props) {
  const editAction = roleActions?.find((action) => action?.id === 'edit');

  const renderCell = (col: ColumnDefinition) => {
    if (col.id === 'statusLabel') {
      const value = row.statusLabel;

      return (
        <TableCell key={col.id}>
          <Label variant="soft" color={getStatusColor(value) as 'success' | 'warning' | 'default'}>
            {value || '-'}
          </Label>
        </TableCell>
      );
    }

    if (col.id === 'project') {
      return (
        <TableCell key={col.id}>
          {row.projects?.length ? (
            <Stack spacing={0.25}>
              {row.projects.map((project) => (
                <Typography key={project.id} variant="body2">
                  {project.name}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2">-</Typography>
          )}
        </TableCell>
      );
    }

    if (col.id === 'unavailableFrom' || col.id === 'unavailableTo') {
      const value = col.id === 'unavailableFrom' ? row.unavailableFrom : row.unavailableTo;

      return (
        <TableCell key={col.id}>
          <Typography noWrap variant="body2">
            {formatDateTimeCell(value)}
          </Typography>
        </TableCell>
      );
    }

    if (col.id === 'action') {
      return (
        <TableCell key={col.id}>
          {editAction && (
            <Stack direction="row" alignItems="center">
              <Tooltip title={editAction.label || uiText.internalOfficeMemo.myTeam.actions.edit}>
                <IconButton onClick={() => onEditClick?.(row)}>
                  <Iconify icon="solar:pen-bold" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </TableCell>
      );
    }

    const value = row[col.id as keyof IomMyTeamRowItem];

    return (
      <TableCell key={col.id}>
        <Typography noWrap variant="body2">
          {getDisplayValue(value as string | number)}
        </Typography>
      </TableCell>
    );
  };

  return (
    <TableRow hover tabIndex={-1}>
      {visibleColumns?.map((col) => renderCell(col))}
    </TableRow>
  );
}
